const $ = (id) => document.getElementById(id);
let records = SOURCE_RECORDS.slice(),
  selected = null,
  stop = null,
  findings = [];
const save = () => {
  try {
    localStorage.setItem(
      "separate-computer",
      JSON.stringify({
        added: records.filter((r) => r.archive === "Imported"),
        placements: records.filter((r) => r.address).map((r) => [r.id, r.address]),
        findings,
      }),
    );
  } catch (e) {
    log("Storage failed: " + e.message);
  }
};
function log(s) {
  $("out").textContent = typeof s === "string" ? s : JSON.stringify(s, null, 2);
}
function inspect(r) {
  const s = r.text || "";
  return {
    path: r.path,
    source: r.archive,
    bytes: r.size,
    sha256: r.sha || "not calculated",
    structure: [...s.matchAll(/(?:\b(?:class|function|def|interface)\s+)([\w$]+)/g)]
      .map((m) => m[1])
      .slice(0, 100),
    dependencies: [
      ...new Set(
        [
          ...s.matchAll(
            /(?:from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]|^\s*(?:from|import)\s+([\w.]+))/gm,
          ),
        ].map((m) => m[1] || m[2] || m[3]),
      ),
    ],
    purpose: s
      .split("\n")
      .filter((x) => /^\s*(# |\/\/| \* )/.test(x))
      .slice(0, 12),
    execution: "Not verified for this file",
    address: r.address || "Unplaced: requires evidence-based dimension and wheel position",
  };
}
function refresh() {
  let q = $("search").value.toLowerCase();
  let matches = records.filter((r) => (r.id + " " + r.text).toLowerCase().includes(q));
  $("count").textContent = matches.length + " / " + records.length + " files";
  $("files").replaceChildren(
    ...matches.slice(0, 250).map((r) => {
      let o = document.createElement("option");
      o.value = r.id;
      o.textContent = r.path + " · " + r.archive;
      return o;
    }),
  );
}
$("search").oninput = refresh;
$("files").onchange = () => {
  selected = records.find((r) => r.id === $("files").value);
  $("editor").value = selected.text;
  log(inspect(selected));
};
$("import").onchange = async (e) => {
  for (const f of e.target.files) {
    const text = await f.text();
    records.push({
      id: "Imported/" + f.name + "/" + Date.now(),
      archive: "Imported",
      path: f.name,
      size: f.size,
      text,
    });
  }
  save();
  refresh();
};
$("store").onclick = () => {
  let name = $("filename").value.trim();
  if (!name) return log("Enter a filename");
  records.push({
    id: "Imported/" + name + "/" + Date.now(),
    archive: "Imported",
    path: name,
    size: new Blob([$("editor").value]).size,
    text: $("editor").value,
  });
  save();
  refresh();
  log("Saved as new revision");
};
function subdivide(x, counts) {
  return counts.map((n) => {
    let v = x * n;
    let i = Math.floor(v);
    x = v - i;
    return i + 1;
  });
}
$("place").onclick = () => {
  if (!selected) return log("Select a file");
  let raw = $("position").value,
    x = Number(raw),
    dimension = $("dimension").value;
  if (!raw || !Number.isFinite(x) || x < 0 || x >= 1 || !dimension || !$("reason").value.trim())
    return log("Supply dimension, fractional wheel position [0,1), and evidence");
  selected.address = {
    dimension,
    wheelSlot: subdivide(x, [64, 6, 6, 6, 5]),
    arc: subdivide(x, [360, 60, 60]),
    position: x,
    evidence: $("reason").value,
    gateId: "Unresolved: validated wheel order required",
  };
  save();
  log(inspect(selected));
};
$("research").onclick = () => {
  let q = $("topic").value.trim().toLowerCase();
  if (!q) return log("Enter a research query");
  let hits = records
    .flatMap((r) =>
      r.text
        .split("\n")
        .flatMap((line, i) =>
          line.toLowerCase().includes(q)
            ? [{ source: r.id, line: i + 1, evidence: line.slice(0, 400) }]
            : [],
        ),
    )
    .slice(0, 60);
  findings.push({ query: q, hits });
  save();
  log({ query: q, hits, scope: "Local literal evidence search; no semantic synthesis claimed" });
};
$("run").onclick = () => {
  try {
    let k = new KleinComputer().boot($("editor").value || SAMPLE).run();
    log({ stop: k.result.stopReason, report: k.write() });
  } catch (e) {
    log(e.message);
  }
};
$("sample").onclick = () => {
  $("editor").value = SAMPLE;
};
$("tests").onclick = () => {
  let tests = [];
  function t(n, f) {
    try {
      tests.push({ test: n, pass: !!f() });
    } catch (e) {
      tests.push({ test: n, pass: false, error: e.message });
    }
  }
  t("Boolean XNOR", () => BV.of("101").xnor("001").equals("011"));
  t("Address subdivision start", () => subdivide(0, [64, 6, 6, 6, 5]).join() === "1,1,1,1,1");
  t(
    "Address subdivision end",
    () => subdivide(0.999999999, [64, 6, 6, 6, 5]).join() === "64,6,6,6,5",
  );
  t("MESSY and AutoNovel", () => new KleinComputer().boot(SAMPLE).run().write().length > 0);
  t("Vector frame changes", () => sequenceFrames(["000", "111"]).some((v) => v.equals("111")));
  log(tests);
};
function download(name, data, type) {
  let a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("report").onclick = () =>
  download(
    "findings.json",
    JSON.stringify(
      {
        findings,
        placements: records.filter((r) => r.address).map((r) => ({ id: r.id, address: r.address })),
      },
      null,
      2,
    ),
    "application/json",
  );
function vectors() {
  return $("vectors")
    .value.trim()
    .split(/\s+/)
    .map((x) => BV.of(x));
}
$("picture").onclick = () => {
  try {
    download("vector.svg", renderIconSVG(vectors()[0]), "image/svg+xml");
  } catch (e) {
    log(e.message);
  }
};
$("play").onclick = () => {
  try {
    if (stop) stop();
    stop = animateOnCanvas($("canvas"), vectors());
  } catch (e) {
    log(e.message);
  }
};
$("stop").onclick = () => {
  if (stop) stop();
};
$("video").onclick = () => {
  try {
    if (!window.MediaRecorder || !$("canvas").captureStream)
      throw Error("Video recording unsupported on this browser");
    let frames = sequenceFrames(vectors());
    if (stop) stop();
    stop = animateOnCanvas($("canvas"), vectors());
    let stream = $("canvas").captureStream(15),
      rec = new MediaRecorder(stream),
      chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = () => {
      stop();
      stream.getTracks().forEach((t) => t.stop());
      download(
        "vector-video." + (rec.mimeType.includes("mp4") ? "mp4" : "webm"),
        new Blob(chunks, { type: rec.mimeType }),
        rec.mimeType,
      );
    };
    rec.start();
    setTimeout(() => rec.stop(), Math.max(1000, frames.length * 80));
  } catch (e) {
    log(e.message);
  }
};
try {
  let s = JSON.parse(localStorage.getItem("separate-computer") || "null");
  if (s) {
    records.push(...s.added);
    findings = s.findings;
    for (let [id, a] of s.placements) {
      let r = records.find((r) => r.id === id);
      if (r) r.address = a;
    }
  }
} catch (e) {
  log(e.message);
}
refresh();
const graph = ComputerAnalysis.topology(HD_SOURCE);
$("deep").onclick = () => {
  if (!selected) return log("Select a source first");
  let r = ComputerAnalysis.analyze({ ...selected, text: $("editor").value }, records);
  findings.push({ type: "structural analysis", ...r });
  save();
  log(r);
};
$("scan").onclick = async () => {
  let snapshot = records.slice(),
    results = [];
  for (let i = 0; i < snapshot.length; i++) {
    let r = snapshot[i];
    if (/\.(js|mjs|cjs)$/i.test(r.path)) {
      let a = ComputerAnalysis.analyze(r, snapshot);
      results.push({
        source: a.source,
        status: a.status,
        structure: a.structure.length,
        calls: a.calls.length,
        dependencies: a.dependencies,
        error: a.error,
      });
    }
    if (i % 20 === 0) {
      $("out").textContent = `Analyzed ${i + 1}/${snapshot.length} records`;
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  findings.push({ type: "project dependency scan", results });
  save();
  log({
    total: snapshot.length,
    js: results.length,
    parsed: results.filter((r) => r.status === "parsed").length,
    results,
  });
};
$("gateprobe").onclick = () => {
  let n = Number($("gate").value);
  if (!Number.isInteger(n) || n < 1 || n > 64) return log("Enter gate 1–64");
  log({
    gate: n,
    neighbors: graph.neighbors(n),
    channels: graph.edges.filter((e) => e.a === n || e.b === n),
    source: HD_SOURCE.source,
    placement: "Topology lookup only; software placement is not inferred",
  });
};
$("jsrun").onclick = () => {
  try {
    let source = $("editor").value,
      entry = $("entry").value.trim(),
      cases = JSON.parse($("cases").value);
    if (
      !Array.isArray(cases) ||
      !cases.length ||
      cases.some((c) => !Array.isArray(c.args) || !Object.hasOwn(c, "expected"))
    )
      throw Error("Provide test cases with args and expected");
    let results = LocalExecution.verify(source, entry, cases);
    let report = {
      type: "bounded JS execution",
      source: selected?.id || "editor",
      entry,
      code: source,
      results,
      passed: results.filter((x) => x.pass).length,
      total: results.length,
    };
    findings.push(report);
    save();
    log(report);
  } catch (e) {
    log(e.message);
  }
};
$("jssample").onclick = () => {
  $("editor").value = "function main(a,b){ return (a ^ b) ^ 7; }";
  $("entry").value = "main";
  $("cases").value = '[{"args":[5,1],"expected":3},{"args":[7,7],"expected":7}]';
};
$("pyrun").onclick = () => {
  try {
    let cases = JSON.parse($("cases").value);
    if (
      !Array.isArray(cases) ||
      !cases.length ||
      cases.some((c) => !Array.isArray(c.args) || !Object.hasOwn(c, "expected"))
    )
      throw Error("Provide test cases");
    let report = {
      type: "Python adapter verification",
      source: selected?.id || "editor",
      original: $("editor").value,
      ...Polyglot.verify($("editor").value, $("entry").value, cases),
    };
    findings.push(report);
    save();
    log(report);
  } catch (e) {
    log(e.message);
  }
};
$("pysample").onclick = () => {
  $("editor").value = "def main(a, b):\n    return a ^ b";
  $("entry").value = "main";
  $("cases").value = '[{"args":[5,1],"expected":4}]';
};

$("assemblysample").onclick = () => {
  $("assemblyspec").value = JSON.stringify(Assembly.sample, null, 2);
};
$("assemblyrun").onclick = () => {
  try {
    let spec = JSON.parse($("assemblyspec").value);
    let results = Assembly.verify(spec.parts, spec.graph, spec.cases);
    let report = {
      type: "cross-language assembly",
      verified: results.length > 0 && results.every((x) => x.pass),
      spec,
      results,
    };
    findings.push(report);
    save();
    log(report);
  } catch (e) {
    log(e.message);
  }
};
$("scientistsample").onclick = () => {
  $("scientistspec").value = JSON.stringify(Scientist.sample, null, 2);
};
$("scientistrun").onclick = async () => {
  try {
    const spec = JSON.parse($("scientistspec").value);
    log("Testing bounded candidate programs…");
    await new Promise((r) => setTimeout(r, 0));
    const result = Scientist.discover(spec.parts, spec.cases, spec.names);
    findings.push({ type: "scientist experiment", spec, result });
    if (result.status === "example-verified") {
      $("editor").value = result.source;
      $("entry").value = "main";
      $("filename").value = "discovered-" + Date.now() + ".js";
      $("cases").value = JSON.stringify(spec.cases);
      records.push({
        id: "Imported/" + $("filename").value,
        archive: "Imported",
        path: $("filename").value,
        size: new Blob([result.source]).size,
        text: result.source,
      });
      refresh();
    }
    save();
    log(result);
  } catch (e) {
    log(e.message);
  }
};
$("graphsample").onclick = () => {
  $("graphinput").value = JSON.stringify(Comprehension.sample, null, 2);
};
$("graphrun").onclick = () => {
  try {
    const raw = $("graphinput").value.trim();
    const files = raw
      ? JSON.parse(raw)
      : records.filter((x) => /\.(js|mjs|cjs)$/.test(x.path)).slice(0, 100);
    const g = Comprehension.investigate(files);
    const report = {
      type: "structural evidence graph",
      ...g,
      impact: g.nodes
        .filter((n) => n.kind === "artifact")
        .map((n) => ({ id: n.id, affected: Comprehension.impact(g, n.id) })),
    };
    findings.push(report);
    save();
    log(report);
  } catch (e) {
    log(e.message);
  }
};
let verifiedConstruction = null;
$("constructsample").onclick = () => {
  $("constructspec").value = JSON.stringify(Construction.sample, null, 2);
};
$("constructrun").onclick = () => {
  verifiedConstruction = null;
  try {
    const result = Construction.construct(JSON.parse($("constructspec").value));
    if (result.status === "verified-on-cases") verifiedConstruction = result.artifact;
    findings.push({ type: "connection-driven construction", result });
    save();
    $("constructout").textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    $("constructout").textContent = e.message;
  }
};
$("constructexport").onclick = () => {
  if (!verifiedConstruction)
    return ($("constructout").textContent = "No verified assembly in current session");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(verifiedConstruction, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "verified-assembly.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let selectedVariant = null;
$("variantsample").onclick = () => {
  $("variantspec").value = JSON.stringify(VariantSelection.sample, null, 2);
};
$("variantrun").onclick = () => {
  selectedVariant = null;
  try {
    const result = VariantSelection.select(JSON.parse($("variantspec").value));
    selectedVariant = result.selected;
    findings.push({ type: "comparative variant investigation", result });
    save();
    $("variantout").textContent = JSON.stringify(result, null, 2);
  } catch (e) {
    $("variantout").textContent = e.message;
  }
};
$("variantexport").onclick = () => {
  if (!selectedVariant) return ($("variantout").textContent = "No uniquely verified selection");
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(selectedVariant, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "selected-assembly.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
