(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    out = $("projectout");
  let latest = null;
  const files = () =>
    records.filter((r) => r.archive === "Imported" && /\.(js|mjs|cjs)$/i.test(r.path));
  $("projectinspect").onclick = () => {
    try {
      out.textContent = JSON.stringify(ProjectCompletion.inspect(files()), null, 2);
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("projectbuild").onclick = async () => {
    try {
      latest = null;
      const spec = JSON.parse($("projectcontracts").value);
      out.textContent = "Inspecting project and verifying candidate implementations…";
      await new Promise((resolve) => setTimeout(resolve, 0));
      latest = ProjectCompletion.complete(files(), spec.contracts, {
        budget: spec.budget,
        integrationCases: spec.integrationCases,
      });
      out.textContent = JSON.stringify(
        {
          status: latest.status,
          ledger: latest.ledger,
          generated: latest.artifact?.generated,
          evidence: latest.artifact?.evidence,
        },
        null,
        2,
      );
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("projectsave").onclick = () => {
    try {
      if (
        !latest?.artifact ||
        ProjectCompletion.replay(latest.artifact).status !==
          "verified-on-supplied-integration-tests"
      )
        throw Error("No passing project completion to save");
      const a = latest.artifact,
        name = "completed-project-" + Date.now() + ".js";
      records.push({
        id: "Imported/" + name,
        archive: "Imported",
        path: name,
        size: new Blob([a.source]).size,
        text: a.source,
      });
      const key = "independent-project-completions-v1",
        saved = JSON.parse(localStorage.getItem(key) || "[]");
      saved.push(a);
      localStorage.setItem(key, JSON.stringify(saved));
      save();
      out.textContent = "Saved new combined project revision " + name + "; originals unchanged.";
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("projectexport").onclick = () => {
    try {
      if (!latest?.artifact) throw Error("No verified artifact");
      const b = new Blob([JSON.stringify(latest.artifact, null, 2)], { type: "application/json" }),
        url = URL.createObjectURL(b),
        a = document.createElement("a");
      a.href = url;
      a.download = "project-completion-evidence.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      out.textContent = e.message;
    }
  };
})();
