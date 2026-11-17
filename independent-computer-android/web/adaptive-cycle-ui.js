(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    out = $("adaptiveout");
  let result = null;
  const scope = () =>
    records
      .filter((r) => r.archive === "Imported" && /\.(?:js|mjs|cjs)$/i.test(r.path))
      .map((r) => ({ ...r }));
  $("adaptiverun").onclick = () => {
    try {
      result = AdaptiveCycle.cycle(scope());
      out.textContent = JSON.stringify(
        {
          repairs: result.commits.map((c) => ({
            path: c.path,
            reason: c.reason,
            evidence: c.evidence,
          })),
          remaining: result.final.issues,
          stopped: result.stopped,
          steps: result.observations.length,
          notice:
            "Changes are staged. No source has been overwritten; syntax and dependency checks are static, not application tests.",
        },
        null,
        2,
      );
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("adaptivecommit").onclick = () => {
    try {
      if (!result || !result.commits.length) throw Error("No staged repairs");
      const baseline = scope();
      for (const c of result.commits) {
        const original = baseline.find((f) => f.path === c.path);
        if (!original || original.text !== c.original)
          throw Error("Project changed; run inspection again before committing: " + c.path);
      }
      for (const c of result.commits) {
        const target = records.find((f) => f.archive === "Imported" && f.path === c.path);
        target.text = c.revised;
        target.size = new Blob([target.text]).size;
      }
      save();
      refresh();
      const key = "independent-adaptive-ledger-v1";
      const ledger = JSON.parse(localStorage.getItem(key) || "[]");
      ledger.push(...result.commits);
      localStorage.setItem(key, JSON.stringify(ledger));
      out.textContent = JSON.stringify(
        {
          committed: result.commits.length,
          rollbackEvidenceStored: true,
          verification: "static-only",
          note: "To run application tests, use the existing project completion/execution workbenches.",
        },
        null,
        2,
      );
      result = null;
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("adaptivezip").onclick = async () => {
    try {
      const imported = records.filter((r) => r.archive === "Imported");
      if (!imported.length) throw Error("Import a project first");
      const files = [];
      for (const f of imported) {
        if (typeof f.text !== "string") continue;
        files.push({
          path: ProjectIntake.normalize(f.path),
          bytes: new TextEncoder().encode(f.text),
        });
      }
      if (!files.length) throw Error("No text source records");
      const blob = ProjectIntake.zip(files),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "revised-source-project.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      out.textContent =
        "Exported " +
        files.length +
        " current source records. Binary assets are not included in this export; use original project export to preserve those.";
    } catch (e) {
      out.textContent = e.message;
    }
  };
})();
