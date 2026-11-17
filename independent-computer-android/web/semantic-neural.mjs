/* MESSY event evidence -> existing Klein ATONet. Explicit binary projection,
   no inferred ontological address and no claim of general semantic understanding. */
import { makeBridge } from "./klein-bridge.mjs";
export function makeSemanticLearner(K) {
  const B = makeBridge(K);
  function extract(result) {
    if (!result || !Array.isArray(result.machine?.out)) throw Error("MESSY run result required");
    const events = [];
    for (const block of result.machine.out)
      for (const e of block.entries || []) {
        if (!e || typeof e.s !== "string" || typeof e.r !== "string" || !Number.isFinite(e.val))
          continue;
        events.push({
          time: block.time,
          subject: e.s,
          relation: e.r,
          object: e.o || null,
          source: e.src,
          negated: !!e.neg,
          value: e.val,
          active: Number(e.val > 0),
        });
      }
    return events;
  }
  // Explicit, inspectable projection: negative statement and primary/derived entry.
  const features = (e) => [Number(e.negated), Number(e.source !== 0)];
  function dataset(events) {
    if (!Array.isArray(events) || events.length === 0) throw Error("No semantic events");
    const cells = [[], [], [], []];
    for (const e of events) {
      const f = features(e),
        y = e.active;
      if (y !== 0 && y !== 1) throw Error("Invalid event label");
      cells[f[0] * 2 + f[1]].push(y);
    }
    const truth = cells.map((c) =>
      c.length ? Number(c.reduce((a, b) => a + b, 0) * 2 >= c.length) : null,
    );
    return {
      truth,
      counts: cells.map((c) => c.length),
      conflicts: cells.map((c) => c.length > 0 && c.some((v) => v !== c[0])),
      events: events.length,
    };
  }
  function train(events, opts = {}) {
    const d = dataset(events);
    if (d.truth.some((x) => x === null))
      return {
        status: "insufficient-evidence",
        ...d,
        reason: "All four binary feature combinations require observations; no weights updated",
      };
    if (d.conflicts.some(Boolean))
      return {
        status: "conflicting-evidence",
        ...d,
        reason:
          "Same features predict different labels; projection must be refined; no weights updated",
      };
    const net = B.create(opts.seed ?? 11),
      before = B.score(net, d.truth);
    const training = B.train(net, d.truth, opts.epochs ?? 2000, opts.lr ?? 0.5);
    return {
      status: "trained",
      ...d,
      before,
      after: training.after,
      checkpoint: B.snapshot(net),
      provenance: "MESSY events -> explicit 2-bit projection -> existing Klein ATONet",
      limitations:
        "Four aggregated Boolean states; not full semantic understanding or online continuous training",
    };
  }
  return { extract, features, dataset, train, restore: B.restore };
}
