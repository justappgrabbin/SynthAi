(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let available = [],
    latest = null;
  const out = $("importrepairout");
  function refresh() {
    const imported = records.filter((r) => r.archive === "Imported");
    const report = ImportedRepair.extract(imported);
    available = report.functions;
    for (const id of ["repairtarget", "repairdonor"]) {
      $(id).replaceChildren();
      for (const f of available) {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.id + " (" + f.status + ")";
        $(id).appendChild(opt);
      }
    }
    out.textContent = JSON.stringify(
      {
        importedFiles: imported.length,
        extractedFunctions: available.length,
        issues: report.issues,
      },
      null,
      2,
    );
  }
  $("repairrefresh").onclick = () => {
    try {
      refresh();
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("repairverify").onclick = () => {
    try {
      const fn = available.find((f) => f.id === $("repairtarget").value),
        cases = JSON.parse($("repaircases").value);
      if (!fn) throw Error("Select an imported function");
      out.textContent = JSON.stringify(ImportedRepair.verify(fn, cases), null, 2);
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("repairrun").onclick = () => {
    try {
      const fn = available.find((f) => f.id === $("repairtarget").value),
        donor = available.find((f) => f.id === $("repairdonor").value),
        cases = JSON.parse($("repaircases").value);
      if (!fn || !donor) throw Error("Select target and donor");
      latest = ImportedRepair.repair(fn, cases, [donor]);
      out.textContent = JSON.stringify(latest, null, 2);
    } catch (e) {
      latest = null;
      out.textContent = e.message;
    }
  };
  $("repairsave").onclick = () => {
    try {
      if (
        !latest?.artifact ||
        ImportedRepair.replay(latest.artifact).status !== "verified-on-supplied-examples"
      )
        throw Error("No verified repair to save");
      const key = "independent-ingested-repairs-v1",
        list = JSON.parse(localStorage.getItem(key) || "[]");
      list.push(latest.artifact);
      localStorage.setItem(key, JSON.stringify(list));
      const filename = "repaired-" + Date.now() + ".js";
      records.push({
        id: "Imported/" + filename,
        archive: "Imported",
        path: filename,
        size: new Blob([latest.artifact.source]).size,
        text: latest.artifact.source,
      });
      save();
      refresh();
      out.textContent = "Saved verified revision " + filename + "; original unchanged.";
    } catch (e) {
      out.textContent = e.message;
    }
  };
  try {
    refresh();
  } catch (e) {
    out.textContent = e.message;
  }
})();
