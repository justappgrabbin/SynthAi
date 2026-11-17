import * as K from "./klein_ato.js";
import { makeSemanticLearner } from "./semantic-neural.mjs";
const L = makeSemanticLearner(K),
  $ = (id) => document.getElementById(id);
let latest = null;
const show = (x) => {
  $("semanticneuralout").textContent = JSON.stringify(x, null, 2);
};
$("semanticinspect").onclick = () => {
  try {
    const src = $("semanticprogram").value;
    if (!src.trim()) throw Error("Enter a MESSY program");
    const result = window.MESSY.run(src);
    const events = L.extract(result);
    latest = { events, run: result };
    show({
      stopReason: result.stopReason,
      events: events.length,
      preview: events.slice(0, 12),
      projection: L.dataset(events),
      warnings: result.warnings,
    });
  } catch (e) {
    show({ error: e.message });
  }
};
$("semantictrain").onclick = () => {
  try {
    if (!latest) throw Error("Inspect a MESSY program first");
    const r = L.train(latest.events, { epochs: Number($("semanticepochs").value) });
    if (r.status === "trained")
      localStorage.setItem(
        "independent-messy-neural-v1",
        JSON.stringify({ checkpoint: r.checkpoint, counts: r.counts, truth: r.truth }),
      );
    show(r);
  } catch (e) {
    show({ error: e.message });
  }
};
$("semanticrestore").onclick = () => {
  try {
    const raw = localStorage.getItem("independent-messy-neural-v1");
    if (!raw) throw Error("No semantic neural checkpoint saved");
    const x = JSON.parse(raw),
      n = L.restore(x.checkpoint);
    show({
      restored: true,
      truth: x.truth,
      counts: x.counts,
      predictions: [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ].map((f) => n.forward(f)[1]),
    });
  } catch (e) {
    show({ error: e.message });
  }
};
