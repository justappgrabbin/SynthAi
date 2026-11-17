import * as K from "./klein_ato.js";
import { makeRelationalMemory } from "./relational-memory.mjs";
const M = makeRelationalMemory(K),
  $ = (id) => document.getElementById(id),
  show = (x) => {
    $("relout").textContent = JSON.stringify(x, null, 2);
  };
for (const id of ["relfeaturea", "relfeatureb"])
  for (const v of M.features) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    $(id).append(o);
  }
$("relfeaturea").value = "negated";
$("relfeatureb").value = "derived";
$("reladd").onclick = () => {
  try {
    const src = $("semanticprogram").value;
    if (!src.trim()) throw Error("Enter a MESSY program in the existing semantic panel");
    const run = window.MESSY.run(src);
    show({ added: M.addRun(run), graph: M.graph() });
  } catch (e) {
    show({ error: e.message });
  }
};
$("relgraph").onclick = () => show(M.graph());
$("relproject").onclick = () => {
  try {
    const p = M.project($("relfeaturea").value, $("relfeatureb").value);
    show({ ...p, examples: p.examples.slice(0, 30) });
  } catch (e) {
    show({ error: e.message });
  }
};
$("reltrain").onclick = () => {
  try {
    const r = M.train($("relfeaturea").value, $("relfeatureb").value, {
      epochs: Number($("relepochs").value),
    });
    if (r.training?.status === "trained")
      localStorage.setItem(
        "independent-relational-neural-v1",
        JSON.stringify({
          memory: M.checkpoint(),
          checkpoint: r.training.checkpoint,
          features: r.features,
        }),
      );
    show({ ...r, examples: r.examples.slice(0, 15) });
  } catch (e) {
    show({ error: e.message });
  }
};
$("relsave").onclick = () => {
  try {
    localStorage.setItem("independent-relational-memory-v1", JSON.stringify(M.checkpoint()));
    show({ saved: true, ...M.graph() });
  } catch (e) {
    show({ error: e.message });
  }
};
$("relrestore").onclick = () => {
  try {
    const s = localStorage.getItem("independent-relational-memory-v1");
    if (!s) throw Error("No saved relational memory");
    show(M.restore(JSON.parse(s)));
  } catch (e) {
    show({ error: e.message });
  }
};
