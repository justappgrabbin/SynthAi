/* Evidence-limited automatic repair of imported standalone functions. No host code execution. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function complete(files, targetId, cases, options = {}) {
    const report = root.ImportedRepair.extract(files),
      target = report.functions.find((x) => x.id === targetId);
    if (!target) throw Error("Target function not found in imported JavaScript");
    if (
      !Array.isArray(cases) ||
      cases.length < 4 ||
      cases.length > 100 ||
      cases.some(
        (c) =>
          !c ||
          !Array.isArray(c.args) ||
          c.args.length !== target.params.length ||
          !Object.hasOwn(c, "expected"),
      )
    )
      throw Error("Provide 4–100 matching test cases including expected results");
    const baseline = root.ImportedRepair.verify(target, cases),
      donors = report.functions.filter(
        (x) =>
          x.id !== target.id &&
          x.params.length === target.params.length &&
          x.status !== "unsupported-signature",
      );
    const ledger = {
      schema: "independent-auto-completion/v1",
      target: target.id,
      original: target.source,
      issues: report.issues,
      baseline: baseline.status,
      donorsExamined: donors.length,
      attempts: [],
      addressStatus: "unresolved",
      limitations: "Supplied tests only. Does not establish intent or whole-project correctness.",
    };
    if (baseline.status === "verified-on-supplied-examples")
      return { status: "already-verified", ledger, artifact: null };
    // Try all compatible imported donors. Ambiguous passing donors are never silently chosen.
    const donorResult = root.ImportedRepair.repair(target, cases, donors);
    ledger.attempts.push({
      kind: "imported-donors",
      status: donorResult.status,
      candidates: donorResult.candidates,
    });
    if (donorResult.status === "repaired-on-supplied-examples")
      return {
        status: "verified-donor-repair",
        ledger,
        artifact: {
          ...donorResult.artifact,
          completionMethod: "imported-donor",
          ledger: clone(ledger),
        },
      };
    if (donorResult.status === "ambiguous-repair")
      return { status: "ambiguous-repair", ledger, artifact: null };
    // Synthesize a restricted integer function only when the source contract supports it.
    if (
      target.params.length < 1 ||
      target.params.length > 4 ||
      !cases.every((c) => c.args.every(Number.isSafeInteger) && Number.isSafeInteger(c.expected))
    )
      return { status: "unsupported-for-synthesis", ledger, artifact: null };
    const budget = Math.max(1, Math.min(10000, Number(options.budget) || 1500));
    const result = root.Scientist.discover([], cases, target.params, budget);
    ledger.attempts.push({
      kind: "bounded-synthesis",
      status: result.status,
      tested: result.tested || 0,
      holdoutFailures: result.holdoutFailures || 0,
    });
    if (result.status !== "example-verified")
      return {
        status:
          result.status === "budget-exhausted" ? "budget-exhausted" : "no-verified-completion",
        ledger,
        artifact: null,
      };
    const evidence = root.LocalExecution.verify(result.source, "main", cases);
    if (!evidence.every((x) => x.pass))
      return { status: "verification-failed", ledger, artifact: null };
    const artifact = {
      schema: "independent-auto-completion-artifact/v1",
      id: "completion:" + target.id,
      entry: "main",
      source: result.source,
      originalSource: target.source,
      origin: { target: target.id, method: "bounded-synthesis" },
      cases: clone(cases),
      evidence: clone(evidence),
      ledger: clone(ledger),
      status: "verified-on-supplied-examples",
      addressStatus: "unresolved",
    };
    return { status: "verified-generated-repair", ledger, artifact };
  }
  function replay(artifact) {
    if (
      !artifact ||
      !["independent-auto-completion-artifact/v1", "independent-ingested-repair/v1"].includes(
        artifact.schema,
      )
    )
      throw Error("Unknown completion artifact");
    const evidence = root.LocalExecution.verify(artifact.source, artifact.entry, artifact.cases);
    return {
      status:
        evidence.length && evidence.every((x) => x.pass)
          ? "verified-on-supplied-examples"
          : "rejected",
      evidence,
    };
  }
  const api = { complete, replay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AutoCompletion = api;
})(globalThis);
