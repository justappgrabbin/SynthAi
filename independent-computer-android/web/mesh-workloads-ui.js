(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const mesh = new Automata.Mesh({ quantum: 8, notify: render });
  const sampleCode = [0x13, 0x05, 0x70, 0x00, 0x13, 0x05, 0x55, 0x00, 0x73, 0, 0x10, 0];
  const kinds = {
    rv32: (d) => MeshWorkloads.rvStep(d, 64),
    selection: (d) => MeshWorkloads.selectionStep(d),
    summary: (d, m) => ({
      done: true,
      result: {
        rv32: m.jobs.get("rv32")?.result,
        selection: m.jobs.get("selection")?.result?.status,
      },
    }),
  };
  function render() {
    const s = mesh.snapshot();
    $("workloadout").textContent = JSON.stringify(
      {
        active: mesh.active,
        jobs: s.jobs.map((j) => ({
          id: j.id,
          status: j.status,
          ticks: j.ticks,
          progress: j.data.steps ?? j.data.index ?? null,
          result: j.result,
          error: j.error,
        })),
        events: s.events.slice(-8),
      },
      null,
      2,
    );
  }
  function prepare() {
    mesh.pause();
    mesh.jobs.clear();
    mesh.events = [];
    mesh.sequence = 0;
    mesh.add({
      id: "rv32",
      kind: "rv32",
      data: MeshWorkloads.rvState(new Uint8Array(sampleCode)),
      step: kinds.rv32,
    });
    mesh.add({
      id: "selection",
      kind: "selection",
      data: MeshWorkloads.selectionState(VariantSelection.sample),
      step: kinds.selection,
    });
    mesh.add({
      id: "summary",
      kind: "summary",
      depends: ["rv32", "selection"],
      data: {},
      step: kinds.summary,
    });
    render();
  }
  $("workloadprepare").onclick = () => {
    try {
      prepare();
    } catch (e) {
      $("workloadout").textContent = e.message;
    }
  };
  $("workloadrun").onclick = () => {
    try {
      if (!mesh.jobs.size) prepare();
      mesh.start();
    } catch (e) {
      $("workloadout").textContent = e.message;
    }
  };
  $("workloadpause").onclick = () => mesh.pause();
  $("workloadsave").onclick = () => {
    try {
      localStorage.setItem("independent-workloads-v1", JSON.stringify(mesh.snapshot()));
      render();
    } catch (e) {
      $("workloadout").textContent = e.message;
    }
  };
  $("workloadrestore").onclick = () => {
    try {
      mesh.pause();
      mesh.restore(JSON.parse(localStorage.getItem("independent-workloads-v1")), (k) => kinds[k]);
      render();
    } catch (e) {
      $("workloadout").textContent = e.message;
    }
  };
  render();
})();
