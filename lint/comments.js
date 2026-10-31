const MAX_LENGTH = 80;
const DIRECTIVE =
  /^(?:eslint|oxlint|prettier|biome)\b|@ts-(?:ignore|nocheck|expect-error)\b|^(?:istanbul|c8|v8) ignore\b/u;

// One short line above a block or function; directives and prose are reported
const shortComments = {
  meta: {
    type: "suggestion",
    docs: { description: "Allow only short single-line comments that name the block or function below them." },
    messages: {
      directive: "Lint, type and coverage directives are not allowed. Fix the code instead.",
      long: "Keep a comment to one line of at most {{max}} characters. Longer explanations belong in docs/.",
      trailing: "Put the comment on its own line above the code it describes.",
    },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;
    return {
      Program() {
        let previousLine = -1;
        for (const comment of sourceCode.getAllComments()) {
          const text = comment.value.trim();
          const { start, end } = comment.loc;
          const lineStart = sourceCode.text.lastIndexOf("\n", comment.range[0] - 1) + 1;
          const before = sourceCode.text.slice(lineStart, comment.range[0]).trim();
          if (DIRECTIVE.test(text)) {
            context.report({ loc: comment.loc, messageId: "directive" });
          } else if (start.line !== end.line || start.line === previousLine + 1 || text.length > MAX_LENGTH) {
            context.report({ loc: comment.loc, messageId: "long", data: { max: String(MAX_LENGTH) } });
          } else if (before !== "" && before !== "{") {
            context.report({ loc: comment.loc, messageId: "trailing" });
          }
          previousLine = end.line;
        }
      },
    };
  },
};

// Line numbers of offsets in a source text
const lineFinder = (text) => {
  const starts = [0];
  for (let index = text.indexOf("\n"); index !== -1; index = text.indexOf("\n", index + 1)) starts.push(index + 1);
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (starts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low + 1;
  };
};

// Whether a node is a function stored in a variable
const isFunction = (node) => node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";

// The statement that holds a declaration, including its export
const statementOf = (node) =>
  node.parent?.type === "ExportNamedDeclaration" || node.parent?.type === "ExportDefaultDeclaration"
    ? node.parent
    : node;

// Every function, component and hook has a comment on the line above it
const requireComments = {
  meta: {
    type: "suggestion",
    docs: { description: "Require a one-line comment above every function, component and hook." },
    messages: { missing: "Add a one-line comment above {{name}} that says what it does." },
    schema: [],
  },
  create(context) {
    const { sourceCode } = context;
    const lineOf = lineFinder(sourceCode.text);
    const commented = new Set(sourceCode.getAllComments().map((comment) => lineOf(comment.range[1])));
    // Reports a statement without a comment right above it
    const check = (statement, name) => {
      if (commented.has(lineOf(statement.range[0]) - 1)) return;
      context.report({ node: statement, messageId: "missing", data: { name } });
    };
    return {
      FunctionDeclaration(node) {
        check(statementOf(node), node.id?.name ?? "this function");
      },
      VariableDeclarator(node) {
        const declaration = node.parent;
        if (!isFunction(node.init) || node.id.type !== "Identifier" || declaration.declarations.length !== 1) return;
        check(statementOf(declaration), node.id.name);
      },
    };
  },
};

export default {
  meta: { name: "local" },
  rules: { "short-comments": shortComments, "require-comments": requireComments },
};
