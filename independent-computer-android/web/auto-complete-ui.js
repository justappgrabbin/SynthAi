(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let latest = null,
    functions = [];
  const out = $("autoout");
  function refresh() {
    const files = records.filter((x) => x.archive === "Imported");
    const extracted = ImportedRepair.extract(files);
    functions = extracted.functions;
    const select = $("autotarget");
    select.replaceChildren();
    for (const fn of functions) {
      const option = document.createElement("option");
      option.value = fn.id;
      option.textContent = fn.id;
      select.append(option);
    }
    out.textContent = JSON.stringify(
      { importedFiles: files.length, functions: functions.length, issues: extracted.issues },
      null,
      2,
    );
  }
  $("autorefresh").onclick = () => {
    try {
      refresh();
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("autorun").onclick = async () => {
    latest = null;
    try {
      const target = $("autotarget").value,
        cases = JSON.parse($("autocases").value),
        budget = Number($("autobudget").value);
      out.textContent = "Investigating compatible donors and bounded synthesis…";
      await new Promise((resolve) => setTimeout(resolve, 0));
      latest = AutoCompletion.complete(
        records.filter((x) => x.archive === "Imported"),
        target,
        cases,
        { budget },
      );
      out.textContent = JSON.stringify(latest, null, 2);
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("autosave").onclick = () => {
    try {
      if (
        !latest?.artifact ||
        AutoCompletion.replay(latest.artifact).status !== "verified-on-supplied-examples"
      )
        throw Error("No verified completion to save");
      const artifact = latest.artifact,
        name = "completed-" + Date.now() + ".js";
      records.push({
        id: "Imported/" + name,
        archive: "Imported",
        path: name,
        size: new Blob([artifact.source]).size,
        text: artifact.source,
      });
      const key = "independent-auto-completions-v1",
        saved = JSON.parse(localStorage.getItem(key) || "[]");
      saved.push(artifact);
      localStorage.setItem(key, JSON.stringify(saved));
      save();
      refresh();
      out.textContent = "Saved new revision " + name + " with provenance; original preserved.";
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
