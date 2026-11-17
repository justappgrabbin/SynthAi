/* Discovery -> independent verification -> reusable source artifact, cooperative and checkpointable. */
(function (root) {
  "use strict";
  const copy = (x) => JSON.parse(JSON.stringify(x));
  function prepare(spec, { budget = 4000 } = {}) {
    const s = root.MeshScientist.state(spec, { budget });
    return { stage: "discover", scientist: s, artifact: null, verification: null, history: [] };
  }
  function step(d) {
    if (d.stage === "done")
      return {
        done: true,
        result: { artifact: d.artifact, verification: d.verification, history: d.history },
      };
    if (d.stage === "discover") {
      const r = root.MeshScientist.step(d.scientist);
      if (!r.done) return { done: false, progress: "discovery " + d.scientist.tested };
      d.history.push({ stage: "discover", result: copy(r.result) });
      if (r.result.status !== "example-verified") {
        d.stage = "done";
        return {
          done: true,
          result: { status: r.result.status, history: d.history, artifact: null },
        };
      }
      d.stage = "verify";
      return { done: false, progress: "candidate generated" };
    }
    if (d.stage === "verify") {
      const s = d.scientist.spec,
        source = d.scientist.result.source;
      const evidence = root.LocalExecution.verify(source, "main", s.cases);
      const ok = evidence.length === s.cases.length && evidence.every((x) => x.pass);
      d.verification = evidence;
      d.history.push({
        stage: "verify",
        passed: evidence.filter((x) => x.pass).length,
        total: evidence.length,
      });
      if (ok) {
        d.artifact = {
          schema: "independent-generated-component/v1",
          id: "generated-" + d.scientist.tested,
          language: "javascript",
          entry: "main",
          source,
          inputs: copy(s.names),
          cases: copy(s.cases),
          evidence: copy(evidence),
          status: "verified-on-supplied-examples",
          addressStatus: "unresolved",
          limitations:
            "Examples are not proof of general correctness; source executes in bounded interpreter.",
        };
      }
      d.stage = "done";
      return {
        done: true,
        result: {
          status: ok ? "verified-on-supplied-examples" : "rejected",
          artifact: d.artifact,
          verification: d.verification,
          history: d.history,
        },
      };
    }
    throw Error("Unknown builder stage");
  }
  function replay(artifact) {
    if (
      !artifact ||
      artifact.schema !== "independent-generated-component/v1" ||
      artifact.status !== "verified-on-supplied-examples" ||
      typeof artifact.source !== "string" ||
      !Array.isArray(artifact.cases)
    )
      throw Error("Invalid component");
    const evidence = root.LocalExecution.verify(artifact.source, artifact.entry, artifact.cases);
    return {
      status:
        evidence.length === artifact.cases.length && evidence.every((x) => x.pass)
          ? "verified-on-supplied-examples"
          : "rejected",
      evidence,
    };
  }
  const api = { prepare, step, replay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MeshBuilder = api;
})(globalThis);
