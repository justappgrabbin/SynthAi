/* Evidence-gated improvement: imported/generated source candidates, immutable baselines, regression and holdout gates. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function validateCases(cases) {
    if (!Array.isArray(cases) || !cases.length || cases.length > 500)
      throw Error("Supply 1–500 test cases");
    for (const c of cases)
      if (!c || !Array.isArray(c.args) || !Object.prototype.hasOwnProperty.call(c, "expected"))
        throw Error("Cases require args and expected");
    return clone(cases);
  }
  function make(name, source, entry = "main", cases = []) {
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof source !== "string" ||
      !source.trim() ||
      typeof entry !== "string" ||
      !/^[$A-Za-z_][$\w]*$/.test(entry)
    )
      throw Error("Invalid component");
    return {
      name,
      source,
      entry,
      cases: validateCases(cases),
      revision: 0,
      history: [],
      candidates: [],
      addressStatus: "unresolved",
    };
  }
  function assess(source, entry, cases) {
    const evidence = root.LocalExecution.verify(source, entry, cases);
    return {
      passed: evidence.filter((x) => x.pass).length,
      total: evidence.length,
      evidence,
      ok: evidence.length === cases.length && evidence.every((x) => x.pass),
    };
  }
  function propose(state, source, extraCases = [], label = "candidate") {
    const s = clone(state);
    if (typeof source !== "string" || !source.trim()) throw Error("Candidate source required");
    const added = extraCases.length ? validateCases(extraCases) : [];
    const tests = validateCases([...s.cases, ...added]);
    const previous = assess(s.source, s.entry, tests),
      candidate = assess(source, s.entry, tests);
    const regression = tests.filter(
      (t, i) => previous.evidence[i].pass && !candidate.evidence[i].pass,
    ).length;
    const acceptable = candidate.ok && regression === 0;
    const record = {
      id: s.candidates.length + 1,
      label,
      status: acceptable ? "eligible" : "rejected",
      reason: acceptable
        ? "All supplied cases pass; no regression"
        : "Failed supplied cases or regression",
      previous: { passed: previous.passed, total: previous.total },
      candidate: { passed: candidate.passed, total: candidate.total },
      regressions: regression,
      addedCases: added.length,
      evidence: candidate.evidence,
      source,
    };
    s.candidates.push(record);
    return { state: s, record };
  }
  function promote(state, id, approval = false) {
    if (!approval) throw Error("Explicit promotion approval required");
    const s = clone(state),
      r = s.candidates.find((x) => x.id === id);
    if (!r || r.status !== "eligible") throw Error("Candidate is not eligible");
    const verification = assess(r.source, s.entry, s.cases);
    if (!verification.ok) throw Error("Regression replay failed");
    s.history.push({
      revision: s.revision,
      source: s.source,
      cases: clone(s.cases),
      candidateId: id,
    });
    s.source = r.source;
    s.revision++;
    r.status = "promoted";
    return s;
  }
  function addFeedback(state, newCases) {
    const s = clone(state);
    s.cases = validateCases([...s.cases, ...validateCases(newCases)]);
    const evaluation = assess(s.source, s.entry, s.cases);
    return { state: s, evaluation };
  }
  function rollback(state) {
    const s = clone(state),
      old = s.history.pop();
    if (!old) throw Error("No previous revision");
    s.source = old.source;
    s.cases = old.cases;
    s.revision = old.revision;
    return s;
  }
  const api = { make, assess, propose, promote, addFeedback, rollback };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ComputerLearning = api;
})(globalThis);
