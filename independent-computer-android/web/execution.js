(function (root) {
  // Deliberately bounded interpreter: no host access, eval, workers or network.
  function execute(source, args = [], entry = "main", limit = 10000) {
    let steps = 0;
    const tick = () => {
      if (++steps > limit) throw Error("Instruction budget exceeded");
    };
    const ast = root.acorn.parse(source, { ecmaVersion: "latest", sourceType: "module" }),
      funcs = new Map();
    for (let n of ast.body) {
      if (n.type === "ExportNamedDeclaration") n = n.declaration;
      if (
        n?.type !== "FunctionDeclaration" ||
        n.async ||
        n.generator ||
        n.params.some((p) => p.type !== "Identifier")
      )
        throw Error("Only synchronous named function declarations supported");
      funcs.set(n.id.name, n);
    }
    function call(name, a, depth) {
      tick();
      if (depth > 64) throw Error("Call depth exceeded");
      let f = funcs.get(name);
      if (!f) throw Error("Unknown function " + name);
      let env = new Map(f.params.map((p, i) => [p.name, a[i]]));
      return stmt(f.body, env, depth)?.value;
    }
    function expr(n, e, d) {
      tick();
      switch (n.type) {
        case "Literal":
          if (!["number", "string", "boolean"].includes(typeof n.value) && n.value !== null)
            throw Error("Unsupported literal");
          return n.value;
        case "Identifier":
          if (!e.has(n.name)) throw Error("Unknown variable " + n.name);
          return e.get(n.name);
        case "ConditionalExpression":
          return expr(n.test, e, d) ? expr(n.consequent, e, d) : expr(n.alternate, e, d);
        case "CallExpression":
          if (n.callee.type !== "Identifier") throw Error("Only local function calls supported");
          return call(
            n.callee.name,
            n.arguments.map((x) => expr(x, e, d)),
            d + 1,
          );
        case "UnaryExpression": {
          let v = expr(n.argument, e, d);
          if (n.operator === "!") return !v;
          if (n.operator === "-") return -v;
          break;
        }
        case "BinaryExpression": {
          let a = expr(n.left, e, d),
            b = expr(n.right, e, d);
          switch (n.operator) {
            case "+":
              return a + b;
            case "-":
              return a - b;
            case "*":
              return a * b;
            case "/":
              return a / b;
            case "%":
              return a % b;
            case "===":
              return a === b;
            case "!==":
              return a !== b;
            case "<":
              return a < b;
            case ">":
              return a > b;
            case "<=":
              return a <= b;
            case ">=":
              return a >= b;
            case "&":
              return a & b;
            case "|":
              return a | b;
            case "^":
              return a ^ b;
          }
          break;
        }
        case "LogicalExpression": {
          let a = expr(n.left, e, d);
          if (n.operator === "&&") return a && expr(n.right, e, d);
          if (n.operator === "||") return a || expr(n.right, e, d);
          break;
        }
      }
      throw Error("Unsupported expression " + n.type);
    }
    function stmt(n, e, d) {
      tick();
      switch (n.type) {
        case "BlockStatement":
          for (let s of n.body) {
            let r = stmt(s, e, d);
            if (r) return r;
          }
          return;
        case "ReturnStatement":
          return { value: n.argument ? expr(n.argument, e, d) : undefined };
        case "VariableDeclaration":
          for (let v of n.declarations) {
            if (v.id.type !== "Identifier" || !v.init) throw Error("Unsupported declaration");
            e.set(v.id.name, expr(v.init, e, d));
          }
          return;
        case "IfStatement":
          if (expr(n.test, e, d)) return stmt(n.consequent, e, d);
          if (n.alternate) return stmt(n.alternate, e, d);
          return;
        default:
          throw Error("Unsupported statement " + n.type);
      }
    }
    try {
      return { status: "executed", value: call(entry, args, 0), steps };
    } catch (e) {
      return { status: "blocked", error: e.message, steps };
    }
  }
  function verify(source, entry, cases) {
    return cases.map((c) => {
      try {
        let r = execute(source, c.args, entry);
        return { ...c, ...r, pass: r.status === "executed" && Object.is(r.value, c.expected) };
      } catch (e) {
        return { ...c, pass: false, error: e.message };
      }
    });
  }
  root.LocalExecution = { execute, verify };
})(globalThis);
