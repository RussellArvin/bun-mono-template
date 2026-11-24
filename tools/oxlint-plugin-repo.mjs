// Local oxlint JS plugin for repo-specific rules.
// Registered in .oxlintrc.json under `jsPlugins`.

// Receivers that are treated as a Drizzle database/transaction handle.
const DB_NAMES = new Set(["db", "tx", "trx", "database"]);

// Name of the object `.execute()` is called on: `db.execute()` -> "db",
// `c.var.db.execute()` -> "db", `this.db.execute()` -> "db".
function receiverName(node) {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed) {
    return node.property.name;
  }
  return undefined;
}

const noDbExecute = {
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
};

function matchesPackage(source, pkg) {
  return source === pkg || source.startsWith(`${pkg}/`);
}

// Package boundaries. Options: [{ forbidden: string[], typeOnly: string[] }]
// - forbidden: packages that must not be imported at all
// - typeOnly:  packages that may only be imported with `import type`
//
// `import { type X }` does not count as type-only: under
// `verbatimModuleSyntax` it still emits a runtime import of the module.
const workspaceImports = {
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
    const { forbidden = [], typeOnly = [] } = context.options[0] ?? {};

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
};

export default {
  meta: { name: "repo" },
  rules: {
    "no-db-execute": noDbExecute,
    "workspace-imports": workspaceImports,
  },
};
