// Local oxlint JS plugin for repo-specific rules.
// Registered in .oxlintrc.json under `jsPlugins`.

const noDbExecute = {
  meta: {
    type: "problem",
    docs: { description: "Ban raw SQL via db.execute()" },
    messages: {
      banned:
        "db.execute() is banned. Use Drizzle query builder (db.select(), db.insert(), etc.). Add an oxlint-disable comment with justification if necessary.",
    },
    schema: [],
  },
  create(context) {
    return {
      "CallExpression[callee.property.name='execute']"(node) {
        context.report({ node, messageId: "banned" });
      },
    };
  },
};

export default {
  meta: { name: "repo" },
  rules: { "no-db-execute": noDbExecute },
};
