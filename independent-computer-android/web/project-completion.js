/* Evidence-bounded multi-file project completion. Original files remain untouched. */
(function (root) {
  "use strict";
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  function inspect(files) {
    if (!Array.isArray(files)) throw Error("Expected files array");
    const definitions = new Map(),
      calls = new Map(),
      issues = [],
      source = [];
    for (const f of files) {
      if (
        !f ||
        typeof f.path !== "string" ||
        typeof f.text !== "string" ||
        !/\.(js|mjs|cjs)$/i.test(f.path)
      )
        continue;
      let ast;
      try {
        ast = root.acorn.parse(f.text, { ecmaVersion: "latest", sourceType: "module" });
      } catch (e) {
        issues.push({ path: f.path, type: "parse-error", message: e.message });
        continue;
      }
      for (const outer of ast.body) {
        const n = outer.type === "ExportNamedDeclaration" ? outer.declaration : outer;
        if (
          n?.type === "ImportDeclaration" ||
          n?.type === "ExportAllDeclaration" ||
          (outer.type === "ExportNamedDeclaration" && outer.source)
        ) {
          issues.push({
            path: f.path,
            type: "external-module-dependency",
            message: "External module linking not supported",
          });
          continue;
        }
        if (n?.type !== "FunctionDeclaration") {
          if (n?.type !== "EmptyStatement")
            issues.push({
              path: f.path,
              type: "unsupported-top-level",
              node: n?.type || outer.type,
            });
          continue;
        }
        if (n.async || n.generator || n.params.some((p) => p.type !== "Identifier")) {
          issues.push({ path: f.path, type: "unsupported-function", name: n.id?.name });
          continue;
        }
        if (definitions.has(n.id.name)) {
          issues.push({ path: f.path, type: "duplicate-function", name: n.id.name });
          continue;
        }
        const body = f.text.slice(n.start, n.end);
        definitions.set(n.id.name, {
          path: f.path,
          source: body,
          params: n.params.map((p) => p.name),
        });
        source.push(body);
        function walk(x) {
          if (!x || typeof x !== "object") return;
          if (Array.isArray(x)) {
            for (const v of x) walk(v);
            return;
          }
          if (x.type === "CallExpression" && x.callee?.type === "Identifier") {
            if (!calls.has(x.callee.name)) calls.set(x.callee.name, []);
            calls
              .get(x.callee.name)
              .push({ from: n.id.name, path: f.path, arity: x.arguments.length });
          }
          for (const [k, v] of Object.entries(x))
            if (k !== "loc" && k !== "start" && k !== "end") walk(v);
        }
        walk(n.body);
      }
    }
    const missing = [...calls]
      .filter(([name]) => !definitions.has(name))
      .map(([name, uses]) => ({ name, uses }));
    return {
      definitions: [...definitions].map(([name, d]) => ({ name, ...d })),
      missing,
      issues,
      source: source.join("\n\n"),
    };
  }
  function complete(files, contracts, options = {}) {
    const graph = inspect(files);
    const ledger = {
      schema: "project-completion-evidence/v1",
      originalFiles: files.map((f) => f.path),
      missing: graph.missing,
      issues: graph.issues,
      attempts: [],
      addressStatus: "unresolved",
    };
    if (graph.issues.length)
      return { status: "unsupported-project-structure", ledger, artifact: null };
    if (!Array.isArray(contracts) || !contracts.length)
      return { status: "contracts-required", ledger, artifact: null };
    const missingNames = new Set(graph.missing.map((x) => x.name));
    const generated = [];
    for (const contract of contracts) {
      if (!contract || !missingNames.has(contract.name))
        return { status: "contract-target-not-missing", ledger, artifact: null };
      if (generated.some((g) => g.name === contract.name))
        return { status: "duplicate-contract", ledger, artifact: null };
      const uses = graph.missing.find((x) => x.name === contract.name).uses;
      if (
        !Array.isArray(contract.params) ||
        !contract.params.every((p) => /^[a-zA-Z_$][\w$]*$/.test(p)) ||
        uses.some((u) => u.arity !== contract.params.length)
      )
        return { status: "arity-mismatch", ledger, artifact: null };
      const cases = contract.cases;
      if (
        !Array.isArray(cases) ||
        cases.length < 4 ||
        cases.length > 100 ||
        cases.some(
          (c) =>
            !Array.isArray(c.args) ||
            c.args.length !== contract.params.length ||
            !own(c, "expected") ||
            !c.args.every(Number.isSafeInteger) ||
            !Number.isSafeInteger(c.expected),
        )
      )
        return { status: "invalid-test-contract", ledger, artifact: null };
      const result = root.Scientist.discover(
        [],
        cases,
        contract.params,
        Math.max(1, Math.min(10000, Number(options.budget) || 1500)),
      );
      ledger.attempts.push({ name: contract.name, status: result.status, tested: result.tested });
      if (result.status !== "example-verified")
        return { status: "unresolved-function", ledger, artifact: null };
      const source = result.source.replace(
        /\bfunction\s+main\s*\(/,
        "function " + contract.name + "(",
      );
      generated.push({ name: contract.name, source, cases });
    }
    if (generated.length !== graph.missing.length)
      return { status: "missing-contracts", ledger, artifact: null };
    const revised = graph.source + "\n\n" + generated.map((x) => x.source).join("\n\n");
    let ast;
    try {
      ast = root.acorn.parse(revised, { ecmaVersion: "latest" });
    } catch (e) {
      return { status: "invalid-assembly", ledger, artifact: null };
    }
    const evidence = [];
    for (const g of generated) {
      const rows = root.LocalExecution.verify(revised, g.name, g.cases);
      evidence.push({ name: g.name, rows });
      if (!rows.every((x) => x.pass))
        return { status: "integration-verification-failed", ledger, artifact: null };
    }
    const integration = options.integrationCases || [];
    if (!Array.isArray(integration) || !integration.length)
      return { status: "integration-tests-required", ledger, artifact: null };
    for (const test of integration) {
      if (
        !graph.definitions.some((d) => d.name === test.entry) ||
        !Array.isArray(test.cases) ||
        !test.cases.length
      )
        return { status: "invalid-integration-contract", ledger, artifact: null };
      const rows = root.LocalExecution.verify(revised, test.entry, test.cases);
      evidence.push({ name: test.entry, rows });
      if (!rows.every((x) => x.pass))
        return { status: "integration-verification-failed", ledger, artifact: null };
    }
    const artifact = {
      schema: "independent-project-completion/v1",
      source: revised,
      originalFiles: files.map((f) => ({ path: f.path, text: f.text })),
      generated: generated.map(({ name, source }) => ({ name, source })),
      contracts: JSON.parse(JSON.stringify(contracts)),
      integrationCases: JSON.parse(JSON.stringify(integration)),
      evidence,
      limitations:
        "Only supported standalone JS declarations, supplied tests, and a combined bundle. Original source files unchanged.",
      addressStatus: "unresolved",
    };
    return { status: "verified-on-supplied-integration-tests", ledger, artifact };
  }
  function replay(a) {
    if (a?.schema !== "independent-project-completion/v1") throw Error("Unknown project artifact");
    const checks = [
      ...a.contracts.map((c) => ({ entry: c.name, cases: c.cases })),
      ...a.integrationCases,
    ];
    const evidence = checks.map((c) => ({
      name: c.entry,
      rows: root.LocalExecution.verify(a.source, c.entry, c.cases),
    }));
    return {
      status: evidence.every((e) => e.rows.length && e.rows.every((r) => r.pass))
        ? "verified-on-supplied-integration-tests"
        : "rejected",
      evidence,
    };
  }
  const api = { inspect, complete, replay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ProjectCompletion = api;
})(globalThis);
