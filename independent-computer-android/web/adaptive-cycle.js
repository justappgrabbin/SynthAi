/* Transactional, source-backed project adaptation: no speculative generation. */
(function (root) {
  "use strict";
  function cycle(files, { maxRepairs = 100 } = {}) {
    const working = files.map((f) => ({ ...f })),
      commits = [],
      observations = [];
    let stopped = "no-supported-repair";
    for (let i = 0; i < maxRepairs; i++) {
      const scan = root.SelfMaintenance.propose(working);
      observations.push({
        step: i,
        issues: scan.report.issues,
        proposals: scan.proposals.map((p) => ({ path: p.path, from: p.from, to: p.to })),
      });
      if (!scan.proposals.length) {
        stopped = scan.report.issues.length ? "unresolved-issues" : "no-issues";
        break;
      }
      const candidates = scan.proposals.filter((p) => p.evidence.syntax === true);
      if (!candidates.length) {
        stopped = "syntax-verification-unavailable";
        break;
      }
      let applied = false;
      for (const p of candidates) {
        try {
          const r = root.SelfMaintenance.apply(working, p);
          const old = working.find((f) => f.path === p.path);
          old.text = r.files.find((f) => f.path === p.path).text;
          commits.push(r.record);
          applied = true;
          break;
        } catch (e) {
          observations.push({ rejected: p.path, reason: e.message });
        }
      }
      if (!applied) {
        stopped = "no-verified-proposal";
        break;
      }
      if (i === maxRepairs - 1) stopped = "budget-exhausted";
    }
    return {
      schema: "independent-adaptive-cycle/v1",
      files: working,
      commits,
      observations,
      stopped,
      final: root.SelfMaintenance.inspect(working),
    };
  }
  function revision(files, originals) {
    const byPath = new Map(files.map((f) => [f.path, f]));
    return originals.map((f) => {
      const r = byPath.get(f.path);
      return r && typeof r.text === "string" && r.text !== f.text
        ? { path: f.path, bytes: new TextEncoder().encode(r.text) }
        : { path: f.path, bytes: f.bytes };
    });
  }
  const api = { cycle, revision };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AdaptiveCycle = api;
})(globalThis);
