// @ts-check
// Local oxlint JS plugin for repo-specific rules.
// Registered in .oxlintrc.json under `jsPlugins`.
//
// Types come from `@oxlint/plugins`: `defineRule` types the visitor nodes, so
// this file is type-checked and linted like the rest of the repo.
import { definePlugin, defineRule } from "@oxlint/plugins";

/** @import { ESTree } from "@oxlint/plugins" */

// Receivers that are treated as a Drizzle database/transaction handle.
const DB_NAMES = new Set(["db", "tx", "trx", "database"]);

/**
 * Name of the object `.execute()` is called on: `db.execute()` -> "db",
 * `c.var.db.execute()` -> "db", `this.db.execute()` -> "db".
 *
 * @param {ESTree.Expression | ESTree.Super} node
 * @returns {string | undefined}
 */
function receiverName(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed) {
    return node.property.name;
  }
  return undefined;
}

const noDbExecute = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Ban raw SQL via db.execute()" },
    messages: {
      banned:
        "{{name}}.execute() is banned. Use Drizzle query builder (db.select(), db.insert(), etc.). Add an oxlint-disable comment with justification if necessary.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        if (callee.property.name !== "execute") return;
        const name = receiverName(callee.object);
        if (name === undefined || !DB_NAMES.has(name)) return;
        context.report({ node, messageId: "banned", data: { name } });
      },
    };
  },
});

/**
 * @param {string} source
 * @param {string} pkg
 */
function matchesPackage(source, pkg) {
  return source === pkg || source.startsWith(`${pkg}/`);
}

/**
 * Read a string-array option, ignoring anything malformed.
 *
 * @param {unknown} options
 * @param {string} key
 * @returns {string[]}
 */
function stringList(options, key) {
  if (typeof options !== "object" || options === null) return [];
  const value = /** @type {Record<string, unknown>} */ (options)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string");
}

// Package boundaries. Options: [{ forbidden: string[], typeOnly: string[] }]
// - forbidden: packages that must not be imported at all
// - typeOnly:  packages that may only be imported with `import type`
//
// `import { type X }` does not count as type-only: under
// `verbatimModuleSyntax` it still emits a runtime import of the module.
const workspaceImports = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Enforce workspace package boundaries" },
    messages: {
      forbidden:
        "'{{source}}' must not be imported from this package (workspace boundary).",
      typeOnly:
        "'{{source}}' may only be imported with a top-level `import type` here — a value import would pull it into this package's runtime.",
    },
    schema: [
      {
        type: "object",
        properties: {
          forbidden: { type: "array", items: { type: "string" } },
          typeOnly: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const forbidden = stringList(context.options[0], "forbidden");
    const typeOnly = stringList(context.options[0], "typeOnly");

    /**
     * @param {ESTree.Node} node
     * @param {ESTree.Expression | null} sourceNode
     * @param {boolean} isTypeOnly
     */
    function check(node, sourceNode, isTypeOnly) {
      if (sourceNode?.type !== "Literal") return;
      const source = sourceNode.value;
      if (typeof source !== "string") return;
      if (forbidden.some((pkg) => matchesPackage(source, pkg))) {
        context.report({ node, messageId: "forbidden", data: { source } });
      } else if (
        !isTypeOnly &&
        typeOnly.some((pkg) => matchesPackage(source, pkg))
      ) {
        context.report({ node, messageId: "typeOnly", data: { source } });
      }
    }

    return {
      ImportDeclaration(node) {
        check(node, node.source, node.importKind === "type");
      },
      ExportNamedDeclaration(node) {
        check(node, node.source, node.exportKind === "type");
      },
      ExportAllDeclaration(node) {
        check(node, node.source, node.exportKind === "type");
      },
      ImportExpression(node) {
        check(node, node.source, false);
      },
    };
  },
});

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const REQUIRED_COLUMNS = ["id", "createdAt", "updatedAt"];

/**
 * A column is written as a call chain: `timestamp("created_at").notNull()`.
 * Walk to the innermost call — the column builder — to read its name argument.
 *
 * @param {ESTree.Expression} node
 * @returns {ESTree.CallExpression | undefined}
 */
function columnBuilderCall(node) {
  let current = node;
  let builder;
  while (current.type === "CallExpression") {
    builder = current;
    const { callee } = current;
    if (callee.type !== "MemberExpression") break;
    current = callee.object;
  }
  return builder;
}

// Table conventions from packages/database/CLAUDE.md:
// - every table has id, createdAt and updatedAt
// - database column names are snake_case
// - one table per file
const tableConventions = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Enforce Drizzle table conventions" },
    messages: {
      missingColumn:
        'Table is missing the standard column `{{column}}`. Every table needs: id: uuid().primaryKey().defaultRandom(), createdAt: timestamp("created_at").defaultNow().notNull(), updatedAt: timestamp("updated_at").defaultNow().notNull().',
      columnName:
        "Database column name '{{name}}' is not snake_case. Use `{{key}}: {{builder}}(\"{{suggestion}}\")` — camelCase in TypeScript, snake_case in the database.",
      oneTablePerFile:
        "Only one table per file. Move this table to its own file in packages/database/src/schema/ and export it from schema/index.ts.",
    },
    schema: [],
  },
  create(context) {
    let tables = 0;
    return {
      CallExpression(node) {
        if (node.callee.type !== "Identifier") return;
        if (node.callee.name !== "pgTable") return;

        tables += 1;
        if (tables > 1) context.report({ node, messageId: "oneTablePerFile" });

        const columns = node.arguments[1];
        if (columns?.type !== "ObjectExpression") return;

        const keys = new Set();
        for (const property of columns.properties) {
          if (property.type !== "Property" || property.computed) continue;
          if (property.key.type !== "Identifier") continue;
          const key = property.key.name;
          keys.add(key);

          const builder = columnBuilderCall(property.value);
          if (builder?.callee.type !== "Identifier") continue;
          const nameArg = builder.arguments[0];
          const explicit =
            nameArg?.type === "Literal" && typeof nameArg.value === "string"
              ? nameArg.value
              : undefined;
          // With no explicit name, Drizzle uses the TypeScript key as-is.
          const name = explicit ?? key;
          if (SNAKE_CASE.test(name)) continue;
          context.report({
            node: property,
            messageId: "columnName",
            data: {
              name,
              key,
              builder: builder.callee.name,
              suggestion: key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
            },
          });
        }

        for (const column of REQUIRED_COLUMNS) {
          if (keys.has(column)) continue;
          context.report({
            node: columns,
            messageId: "missingColumn",
            data: { column },
          });
        }
      },
    };
  },
});

const BODY_METHODS = new Set(["post", "put", "patch"]);

// Routes that accept a body must validate it at the boundary, so handlers
// only ever see typed input.
const requireRouteValidation = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Require zValidator on routes that accept a body" },
    messages: {
      missing:
        '.{{method}}() route has no validation. Add `zValidator("json", schema)` before the handler and read the body with `c.req.valid("json")` — see packages/server/src/routes/echo.ts.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== "MemberExpression" || callee.computed) return;
        const method = callee.property.name;
        if (!BODY_METHODS.has(method)) return;

        // Route registrations start with a path string: `.post("/", ...)`.
        const [path, ...handlers] = node.arguments;
        if (path?.type !== "Literal" || typeof path.value !== "string") return;
        if (handlers.length === 0) return;

        const validated = handlers.some(
          (arg) =>
            arg.type === "CallExpression" &&
            arg.callee.type === "Identifier" &&
            arg.callee.name === "zValidator",
        );
        if (!validated) {
          context.report({
            node: callee.property,
            messageId: "missing",
            data: { method },
          });
        }
      },
    };
  },
});

// Raw HTML elements that have a design-system component. Options:
// [{ elements: { button: "Button", input: "Input" } }]
// (`react/forbid-elements` cannot do this here: it resolves <Button> through
// the jsx-a11y component map and would flag the component itself.)
const noRawElements = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Use design-system components over raw elements" },
    messages: {
      raw: "Use <{{component}}> from @/components/ui/{{file}} instead of a raw <{{element}}>. If it is not installed yet, run `bunx shadcn@latest add {{file}}` in packages/app.",
    },
    schema: [
      {
        type: "object",
        properties: {
          elements: {
            type: "object",
            additionalProperties: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    /** @type {Map<string, string>} */
    const elements = new Map();
    const [options] = context.options;
    if (typeof options === "object" && options !== null) {
      const configured = /** @type {Record<string, unknown>} */ (options)[
        "elements"
      ];
      if (typeof configured === "object" && configured !== null) {
        for (const [element, component] of Object.entries(configured)) {
          if (typeof component === "string") elements.set(element, component);
        }
      }
    }

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        const element = node.name.name;
        const component = elements.get(element);
        if (component === undefined) return;
        context.report({
          node: node.name,
          messageId: "raw",
          data: { element, component, file: component.toLowerCase() },
        });
      },
    };
  },
});

export default definePlugin({
  meta: { name: "repo" },
  rules: {
    "no-db-execute": noDbExecute,
    "workspace-imports": workspaceImports,
    "table-conventions": tableConventions,
    "require-route-validation": requireRouteValidation,
    "no-raw-elements": noRawElements,
  },
});
