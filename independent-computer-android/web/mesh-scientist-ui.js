(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const mesh = new Automata.Mesh({ quantum: 8, notify: render });
  const kinds = {
    scientist: (d) => MeshScientist.step(d),
    report: (d, m) => ({
      done: true,
      result: {
        experiment: m.jobs.get("scientist").result,
        provenance: "bounded local examples; no canonical address inferred",
      },
    }),
  };
  function render() {
    const s = mesh.snapshot();
    $("scientistmeshout").textContent = JSON.stringify(
      {
        active: mesh.active,
        jobs: s.jobs.map((j) => ({
          id: j.id,
          status: j.status,
          ticks: j.ticks,
          tested: j.data.tested,
          result: j.result,
          error: j.error,
        })),
        events: s.events.slice(-5),
      },
      null,
      2,
    );
  }
  function prepare() {
    const spec = JSON.parse($("scientistspec").value || "null");
    mesh.pause();
    mesh.jobs.clear();
    mesh.events = [];
    mesh.sequence = 0;
    mesh.add({
      id: "scientist",
      kind: "scientist",
      data: MeshScientist.state(spec, { budget: 3000 }),
      step: kinds.scientist,
    });
    mesh.add({
      id: "report",
      kind: "report",
      depends: ["scientist"],
      data: {},
      step: kinds.report,
    });
    render();
  }
  $("scientistmeshprepare").onclick = () => {
    try {
      prepare();
    } catch (e) {
      $("scientistmeshout").textContent = e.message;
    }
  };
  $("scientistmeshrun").onclick = () => {
    try {
      if (!mesh.jobs.size) prepare();
      mesh.start();
    } catch (e) {
      $("scientistmeshout").textContent = e.message;
    }
  };
  $("scientistmeshpause").onclick = () => mesh.pause();
  $("scientistmeshsave").onclick = () => {
    try {
      localStorage.setItem("independent-scientist-v1", JSON.stringify(mesh.snapshot()));
      render();
    } catch (e) {
      $("scientistmeshout").textContent = e.message;
    }
  };
  $("scientistmeshrestore").onclick = () => {
    try {
      mesh.pause();
      mesh.restore(JSON.parse(localStorage.getItem("independent-scientist-v1")), (k) => kinds[k]);
      render();
    } catch (e) {
      $("scientistmeshout").textContent = e.message;
    }
  };
  render();
})();
