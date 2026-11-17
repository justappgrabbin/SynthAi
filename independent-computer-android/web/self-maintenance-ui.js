(function () {
  "use strict";
  const out = document.getElementById("selfout");
  let staged = [],
    history = [];
  const scope = () =>
    records.filter((r) => r.archive === "Imported" && /\.(?:js|mjs|cjs)$/i.test(r.path));
  const show = (x) => (out.textContent = JSON.stringify(x, null, 2));
  document.getElementById("selfscan").onclick = () => {
    const r = SelfMaintenance.propose(scope());
    staged = r.proposals;
    show({
      issues: r.report.issues,
      proposals: staged.map(({ original, revised, ...p }) => p),
      note: "Source registry checked. Installed application bundle is read-only in browser.",
    });
  };
  document.getElementById("selfapply").onclick = () => {
    try {
      if (!staged.length) throw Error("No uniquely resolvable dependency repair staged");
      const current = scope();
      const result = SelfMaintenance.apply(current, staged[0]);
      const commit = result.record;
      const old = records.find((r) => r.archive === "Imported" && r.path === commit.path);
      if (!old || old.text !== commit.original) throw Error("Source changed before commit");
      old.text = commit.revised;
      old.size = new Blob([old.text]).size;
      history.push(commit);
      save();
      refresh();
      staged = [];
      show({
        status: result.status,
        commit: { path: commit.path, evidence: commit.evidence, verified: commit.verified },
        rollbackAvailable: true,
      });
    } catch (e) {
      show({ error: e.message });
    }
  };
  document.getElementById("selfrollback").onclick = () => {
    try {
      const commit = history.at(-1);
      if (!commit) throw Error("No maintenance commit in this session");
      const old = records.find((r) => r.archive === "Imported" && r.path === commit.path);
      const restored = SelfMaintenance.rollback([{ ...old }], commit)[0];
      old.text = restored.text;
      old.size = new Blob([old.text]).size;
      history.pop();
      save();
      refresh();
      show({ status: "rolled-back", path: commit.path });
    } catch (e) {
      show({ error: e.message });
    }
  };
  document.getElementById("selfexport").onclick = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schema: "independent-maintenance-ledger/v1",
            history,
            staged: staged.map(({ original, revised, ...p }) => p),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "computer-maintenance-ledger.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
})();
