/* Import existing JavaScript functions, isolate supported code, verify and repair with supplied donor implementations. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function extract(files) {
    if (!Array.isArray(files)) throw Error("Files must be an array");
    const functions = [],
      issues = [];
    for (const file of files) {
      if (
        !file ||
        typeof file.path !== "string" ||
        typeof file.text !== "string" ||
        !/\.(?:js|mjs|cjs)$/i.test(file.path)
      )
        continue;
      let ast;
      try {
        ast = root.acorn.parse(file.text, {
          ecmaVersion: "latest",
          sourceType: "module",
          locations: true,
        });
      } catch (e) {
        issues.push({ path: file.path, type: "parse-error", message: e.message });
        continue;
      }
      for (const original of ast.body) {
        const node = original.type === "ExportNamedDeclaration" ? original.declaration : original;
        if (node?.type !== "FunctionDeclaration" || !node.id) continue;
        const name = node.id.name,
          source = file.text.slice(node.start, node.end),
          id = file.path + "#" + name;
        const params = node.params.map((x) => (x.type === "Identifier" ? x.name : null));
        const unsupported = params.includes(null) || node.async || node.generator;
        functions.push({
          id,
          path: file.path,
          name,
          source,
          params,
          language: "javascript",
          status: unsupported ? "unsupported-signature" : "extracted-unverified",
          origin: "ingested-source",
          line: node.loc?.start.line ?? null,
        });
      }
    }
    return { functions, issues };
  }
  function checkCases(cases, arity) {
    if (
      !Array.isArray(cases) ||
      cases.length < 1 ||
      cases.length > 100 ||
      cases.some(
        (c) =>
          !c ||
          !Array.isArray(c.args) ||
          c.args.length !== arity ||
          !Object.prototype.hasOwnProperty.call(c, "expected"),
      )
    )
      throw Error("Cases must contain matching args and expected values (1–100)");
  }
  function verify(fn, cases) {
    if (!fn || fn.status === "unsupported-signature") throw Error("Unsupported imported function");
    checkCases(cases, fn.params.length);
    const evidence = root.LocalExecution.verify(fn.source, fn.name, cases);
    return {
      status: evidence.every((x) => x.pass)
        ? "verified-on-supplied-examples"
        : "failing-or-unsupported",
      evidence,
      source: fn.source,
      origin: fn.id,
    };
  }
  function repair(target, cases, donors) {
    checkCases(cases, target.params.length);
    const original = verify(target, cases);
    if (original.status === "verified-on-supplied-examples")
      return { status: "already-verified", original, candidates: [], artifact: null };
    const candidates = [];
    for (const donor of donors || []) {
      if (
        !donor ||
        donor.id === target.id ||
        donor.status === "unsupported-signature" ||
        donor.params?.length !== target.params.length
      )
        continue;
      // Only a standalone function declaration is eligible; AST-guided rename, never textual global substitution.
      let ast;
      try {
        ast = root.acorn.parse(donor.source, { ecmaVersion: "latest" });
        if (
          ast.body.length !== 1 ||
          ast.body[0].type !== "FunctionDeclaration" ||
          ast.body[0].id.name !== donor.name
        )
          continue;
      } catch (e) {
        continue;
      }
      const n = ast.body[0].id,
        source = donor.source.slice(0, n.start) + "main" + donor.source.slice(n.end);
      const evidence = root.LocalExecution.verify(source, "main", cases),
        passed = evidence.filter((e) => e.pass).length;
      candidates.push({ donorId: donor.id, source, passed, total: cases.length, evidence });
    }
    const passing = candidates.filter((x) => x.passed === cases.length);
    if (passing.length !== 1)
      return {
        status: passing.length ? "ambiguous-repair" : "no-verified-repair",
        original,
        candidates: candidates.map((x) => ({
          donorId: x.donorId,
          passed: x.passed,
          total: x.total,
        })),
        artifact: null,
      };
    const winner = passing[0];
    return {
      status: "repaired-on-supplied-examples",
      original,
      candidates: candidates.map((x) => ({ donorId: x.donorId, passed: x.passed, total: x.total })),
      artifact: {
        schema: "independent-ingested-repair/v1",
        id: "repair:" + target.id,
        source: winner.source,
        entry: "main",
        inputs: clone(target.params),
        cases: clone(cases),
        evidence: clone(winner.evidence),
        origin: { target: target.id, donor: winner.donorId },
        status: "verified-on-supplied-examples",
        addressStatus: "unresolved",
        limitations:
          "Only supplied examples; no inferred project-level correctness; original files unchanged.",
      },
    };
  }
  function replay(artifact) {
    if (artifact?.schema !== "independent-ingested-repair/v1")
      throw Error("Invalid repair artifact");
    const evidence = root.LocalExecution.verify(artifact.source, artifact.entry, artifact.cases);
    return {
      status:
        evidence.length > 0 && evidence.every((e) => e.pass)
          ? "verified-on-supplied-examples"
          : "rejected",
      evidence,
    };
  }
  const api = { extract, verify, repair, replay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ImportedRepair = api;
})(globalThis);
