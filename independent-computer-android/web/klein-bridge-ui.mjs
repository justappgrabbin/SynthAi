import * as K from "./klein_ato.js";
import { makeBridge } from "./klein-bridge.mjs";
const B = makeBridge(K),
  $ = (id) => document.getElementById(id);
let net = B.create(11);
const output = (x) => {
  $("kleinbridgeout").textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
};
$("kleinanalog").onclick = () => {
  try {
    output({
      result: B.analogize(
        $("kleina").value.trim(),
        $("kleinb").value.trim(),
        $("kleinc").value.trim(),
      ),
      method: "Existing Klein ATO strong equivalence",
      source: "klein_ato.js",
    });
  } catch (e) {
    output(e.message);
  }
};
$("kleintrain").onclick = () => {
  try {
    const t = B.train(net, [1, 0, 0, 1], Number($("kleinepoch").value));
    output({ training: t, weights: B.snapshot(net), source: "Existing Klein ATONet" });
    localStorage.setItem("independent-klein-neural-v1", JSON.stringify(B.snapshot(net)));
  } catch (e) {
    output(e.message);
  }
};
$("kleinload").onclick = () => {
  try {
    const s = localStorage.getItem("independent-klein-neural-v1");
    if (!s) throw Error("No saved weights");
    net = B.restore(JSON.parse(s));
    output({ restored: true, accuracy: B.score(net, [1, 0, 0, 1]) });
  } catch (e) {
    output(e.message);
  }
};
$("kleinexport").onclick = () => {
  const blob = new Blob(
      [JSON.stringify({ origin: "klein_ato.js", checkpoint: B.snapshot(net) }, null, 2)],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "klein-neural-checkpoint.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};
