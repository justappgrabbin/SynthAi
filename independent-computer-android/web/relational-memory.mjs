/* Reuses the existing MESSY event extractor and Klein ATONet. No invented ontology. */
import { makeSemanticLearner } from "./semantic-neural.mjs";
export function makeRelationalMemory(K) {
  const learner = makeSemanticLearner(K),
    runs = [];
  const selectors = {
    negated: (e) => Number(!!e.negated),
    derived: (e) => Number(e.source !== 0),
    hasObject: (e) => Number(e.object !== null && e.object !== ""),
    positive: (e) => Number(e.value > 0),
  };
  function addRun(run, id) {
    const events = Array.isArray(run) ? run : learner.extract(run);
    if (!events.length) throw Error("Run contains no valid semantic events");
    const key = String(id ?? `run-${runs.length + 1}`);
    if (runs.some((x) => x.id === key)) throw Error("Duplicate run id");
    runs.push({ id: key, events: structuredClone(events) });
    return { id: key, events: events.length, total: runs.reduce((s, x) => s + x.events.length, 0) };
  }
  function graph() {
    const nodes = new Map(),
      edges = new Map();
    for (const run of runs)
      for (const e of run.events) {
        const s = String(e.subject),
          o = e.object == null ? null : String(e.object);
        for (const name of [s, o].filter((x) => x !== null)) {
          if (!nodes.has(name)) nodes.set(name, { name, occurrences: 0 });
          nodes.get(name).occurrences++;
        }
        const key = JSON.stringify([s, e.relation, o]);
        if (!edges.has(key))
          edges.set(key, {
            subject: s,
            relation: e.relation,
            object: o,
            observations: 0,
            positive: 0,
            negative: 0,
            runs: [],
          });
        const edge = edges.get(key);
        edge.observations++;
        if (e.active) edge.positive++;
        else edge.negative++;
        if (!edge.runs.includes(run.id)) edge.runs.push(run.id);
      }
    return { nodes: [...nodes.values()], edges: [...edges.values()], runs: runs.length };
  }
  function project(a = "negated", b = "derived", label = "active") {
    if (!(a in selectors) || !(b in selectors) || a === b)
      throw Error("Choose two distinct supported features");
    if (!["active", "positive"].includes(label)) throw Error("Unsupported label");
    const buckets = [[], [], [], []],
      examples = [];
    for (const run of runs)
      for (const e of run.events) {
        const x = [selectors[a](e), selectors[b](e)],
          y = label === "active" ? e.active : Number(e.value > 0);
        if (y !== 0 && y !== 1) throw Error("Invalid label");
        buckets[x[0] * 2 + x[1]].push(y);
        examples.push({
          run: run.id,
          features: x,
          label: y,
          subject: e.subject,
          relation: e.relation,
          object: e.object,
        });
      }
    const counts = buckets.map((x) => x.length),
      conflicts = buckets.map((x) => x.length > 0 && x.some((y) => y !== x[0]));
    const truth = buckets.map((x) => (x.length ? x[0] : null));
    return {
      features: [a, b],
      label,
      counts,
      conflicts,
      truth,
      examples,
      status: counts.some((x) => !x)
        ? "insufficient-evidence"
        : conflicts.some(Boolean)
          ? "conflicting-evidence"
          : "ready",
    };
  }
  function train(a, b, opts = {}) {
    const p = project(a, b);
    if (p.status !== "ready")
      return { ...p, reason: "No weights updated: evidence incomplete or contradictory" };
    const result = learner.train(
      p.examples.map((x) => ({ negated: !!x.features[0], source: x.features[1], active: x.label })),
      opts,
    );
    return {
      ...p,
      training: result,
      provenance: { runIds: runs.map((r) => r.id), featureNames: p.features },
    };
  }
  function checkpoint() {
    return { version: 1, runs: structuredClone(runs) };
  }
  function restore(snapshot) {
    if (snapshot?.version !== 1 || !Array.isArray(snapshot.runs))
      throw Error("Invalid memory checkpoint");
    const validated = [];
    for (const r of snapshot.runs) {
      if (
        typeof r.id !== "string" ||
        !Array.isArray(r.events) ||
        !r.events.length ||
        r.events.some(
          (e) =>
            typeof e.subject !== "string" ||
            typeof e.relation !== "string" ||
            !Number.isFinite(e.value) ||
            ![0, 1].includes(e.active),
        )
      )
        throw Error("Invalid stored events");
      if (validated.some((x) => x.id === r.id)) throw Error("Duplicate run id");
      validated.push(structuredClone(r));
    }
    runs.splice(0, runs.length, ...validated);
    return { runs: runs.length };
  }
  return { addRun, graph, project, train, checkpoint, restore, features: Object.keys(selectors) };
}
