/* Verified component reuse: explicit wiring, provenance, and independent replay. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function validate(a) {
    if (
      !a ||
      a.schema !== "independent-generated-component/v1" ||
      a.status !== "verified-on-supplied-examples" ||
      typeof a.source !== "string" ||
      !Array.isArray(a.inputs) ||
      !Array.isArray(a.cases)
    )
      throw Error("Invalid saved component");
    const r = root.MeshBuilder.replay(a);
    if (r.status !== "verified-on-supplied-examples") throw Error("Saved component replay failed");
    return a;
  }
  function compose(components, contract) {
    if (!Array.isArray(components) || components.length !== 2)
      throw Error("Exactly two components required");
    const [first, second] = components.map(validate);
    if (
      !contract ||
      !Array.isArray(contract.inputs) ||
      !Array.isArray(contract.cases) ||
      contract.cases.length < 4 ||
      !Array.isArray(contract.firstArgs) ||
      !Array.isArray(contract.secondArgs)
    )
      throw Error("Explicit connection contract and four test cases required");
    if (
      contract.inputs.length < 1 ||
      contract.inputs.length > 4 ||
      new Set(contract.inputs).size !== contract.inputs.length ||
      contract.inputs.some((x) => !/^[$A-Za-z_][$\w]*$/.test(x))
    )
      throw Error("Invalid input names");
    if (
      contract.firstArgs.length !== first.inputs.length ||
      contract.secondArgs.length !== second.inputs.length
    )
      throw Error("Connection arity mismatch");
    const allowed = new Set(contract.inputs),
      check = (v, output) => {
        if (v === "$previous" && output) return;
        if (typeof v === "string" && allowed.has(v)) return;
        throw Error("Unresolved connection " + String(v));
      };
    contract.firstArgs.forEach((x) => check(x, false));
    contract.secondArgs.forEach((x) => check(x, true));
    if (!contract.secondArgs.includes("$previous"))
      throw Error("No directional connection to prior output");
    if (
      contract.cases.some(
        (c) =>
          !Array.isArray(c.args) ||
          c.args.length !== contract.inputs.length ||
          !c.args.every(Number.isSafeInteger) ||
          !Number.isSafeInteger(c.expected),
      )
    )
      throw Error("Invalid test case");
    const rename = (source, to) => {
      const ast = root.acorn.parse(source, { ecmaVersion: "latest" });
      const f = ast.body.find((n) => n.type === "FunctionDeclaration" && n.id.name === "main");
      if (!f || ast.body.length !== 1) throw Error("Component must be a single main function");
      return source.slice(0, f.id.start) + to + source.slice(f.id.end);
    };
    const source =
      rename(first.source, "componentA") +
      "\n" +
      rename(second.source, "componentB") +
      "\nfunction main(" +
      contract.inputs.join(",") +
      "){let previous=componentA(" +
      contract.firstArgs.join(",") +
      ");return componentB(" +
      contract.secondArgs.map((x) => (x === "$previous" ? "previous" : x)).join(",") +
      ");}";
    const evidence = root.LocalExecution.verify(source, "main", contract.cases),
      ok = evidence.length === contract.cases.length && evidence.every((e) => e.pass);
    return {
      status: ok ? "verified-on-supplied-examples" : "rejected",
      evidence,
      artifact: ok
        ? {
            schema: "independent-composed-component/v1",
            id: "composed-" + Date.now(),
            language: "javascript",
            entry: "main",
            source,
            inputs: clone(contract.inputs),
            cases: clone(contract.cases),
            evidence: clone(evidence),
            dependencies: [
              { id: first.id, source: first.source },
              { id: second.id, source: second.source },
            ],
            connection: {
              firstArgs: clone(contract.firstArgs),
              secondArgs: clone(contract.secondArgs),
            },
            status: "verified-on-supplied-examples",
            addressStatus: "unresolved",
            limitations:
              "Explicit connections; tested examples only; no inferred semantic equivalence.",
          }
        : null,
    };
  }
  function replay(a) {
    if (
      !a ||
      a.schema !== "independent-composed-component/v1" ||
      !Array.isArray(a.dependencies) ||
      a.dependencies.length !== 2 ||
      !Array.isArray(a.cases)
    )
      throw Error("Invalid composition");
    const e = root.LocalExecution.verify(a.source, "main", a.cases);
    return {
      status:
        e.length === a.cases.length && e.every((x) => x.pass)
          ? "verified-on-supplied-examples"
          : "rejected",
      evidence: e,
    };
  }
  const api = { compose, replay, validate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ComponentReuse = api;
})(globalThis);
