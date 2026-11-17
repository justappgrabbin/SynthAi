(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const mesh = new Automata.Mesh({ quantum: 10, notify: () => render() });
  let report = [];
  const kinds = {
    inventory: () => (d) => {
      const limit = Math.min(records.length, d.limit || 100);
      const end = Math.min(limit, d.offset + 8);
      for (let i = d.offset; i < end; i++) {
        const r = records[i];
        d.items.push({ id: r.id, path: r.path, bytes: r.size, source: r.archive });
      }
      d.offset = end;
      return {
        done: end >= limit,
        result: end >= limit ? { files: d.items.length, items: d.items } : null,
        progress: `${end}/${limit}`,
      };
    },
    dependencies: () => (d) => {
      const limit = Math.min(records.length, d.limit || 100);
      const end = Math.min(limit, d.offset + 3);
      for (let i = d.offset; i < end; i++) {
        const r = records[i];
        if (/\.(js|mjs|cjs)$/i.test(r.path)) {
          const x = ComputerAnalysis.analyze(r, records);
          d.items.push({
            id: r.id,
            status: x.status,
            dependencies: x.dependencies,
            error: x.error,
          });
        }
      }
      d.offset = end;
      return {
        done: end >= limit,
        result: end >= limit ? { analyzed: d.items.length, items: d.items } : null,
        progress: `${end}/${limit}`,
      };
    },
    findings: () => (d) => {
      const source = mesh.jobs.get("dependencies");
      if (!source || source.status !== "done") throw Error("Dependency analysis unavailable");
      d.items = source.result.items.filter(
        (x) => x.error || x.dependencies?.some((y) => y.status === "missing"),
      );
      return { done: true, result: { issues: d.items.length, items: d.items } };
    },
  };
  function add() {
    mesh.pause();
    mesh.jobs.clear();
    mesh.events = [];
    mesh.sequence = 0;
    const limit = Number($("meshlimit").value);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw Error("Enter 1–1000 files");
    mesh.add({
      id: "inventory",
      kind: "inventory",
      data: { offset: 0, limit, items: [] },
      step: kinds.inventory(),
    });
    mesh.add({
      id: "dependencies",
      kind: "dependencies",
      depends: ["inventory"],
      data: { offset: 0, limit, items: [] },
      step: kinds.dependencies(),
    });
    mesh.add({
      id: "findings",
      kind: "findings",
      depends: ["dependencies"],
      data: { items: [] },
      step: kinds.findings(),
    });
    render();
  }
  function render() {
    const snapshot = mesh.snapshot();
    $("meshout").textContent = JSON.stringify(
      {
        active: mesh.active,
        jobs: snapshot.jobs.map((x) => ({
          id: x.id,
          status: x.status,
          ticks: x.ticks,
          progress: x.data.offset ?? null,
          error: x.error,
          summary: x.result
            ? {
                items: x.result.items?.length,
                files: x.result.files,
                analyzed: x.result.analyzed,
                issues: x.result.issues,
              }
            : null,
        })),
        events: snapshot.events.slice(-12),
      },
      null,
      2,
    );
  }
  $("meshload").onclick = () => {
    try {
      add();
    } catch (e) {
      $("meshout").textContent = e.message;
    }
  };
  $("meshstart").onclick = () => {
    if (!mesh.jobs.size) add();
    mesh.start();
  };
  $("meshpause").onclick = () => mesh.pause();
  $("meshcheckpoint").onclick = () => {
    try {
      localStorage.setItem("independent-automata-v1", JSON.stringify(mesh.snapshot()));
      $("meshout").textContent = "Checkpoint saved to localStorage";
    } catch (e) {
      $("meshout").textContent = "Checkpoint failure: " + e.message;
    }
  };
  $("meshrestore").onclick = () => {
    try {
      const s = JSON.parse(localStorage.getItem("independent-automata-v1"));
      mesh.pause();
      mesh.restore(s, (k) => kinds[k]?.());
      render();
    } catch (e) {
      $("meshout").textContent = "Restore failure: " + e.message;
    }
  };
  $("meshexport").onclick = () => {
    const result = mesh.snapshot();
    download("automata-investigation.json", JSON.stringify(result, null, 2), "application/json");
  };
  render();
})();
