(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    mesh = new Automata.Mesh({ quantum: 8, notify: render }),
    key = "independent-builder-checkpoint-v1",
    artifactKey = "independent-generated-components-v1";
  const kinds = { builder: (d) => MeshBuilder.step(d) };
  function render() {
    const s = mesh.snapshot();
    $("builderout").textContent = JSON.stringify(
      {
        active: mesh.active,
        jobs: s.jobs.map((j) => ({
          id: j.id,
          status: j.status,
          stage: j.data.stage,
          tested: j.data.scientist?.tested,
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
    const spec = JSON.parse($("scientistspec").value);
    mesh.pause();
    mesh.jobs.clear();
    mesh.events = [];
    mesh.sequence = 0;
    mesh.add({
      id: "builder",
      kind: "builder",
      data: MeshBuilder.prepare(spec, { budget: 4000 }),
      step: kinds.builder,
    });
    render();
  }
  $("builderprepare").onclick = () => {
    try {
      prepare();
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  $("builderrun").onclick = () => {
    try {
      if (!mesh.jobs.size) prepare();
      mesh.start();
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  $("builderpause").onclick = () => mesh.pause();
  $("buildersave").onclick = () => {
    try {
      localStorage.setItem(key, JSON.stringify(mesh.snapshot()));
      render();
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  $("builderrestore").onclick = () => {
    try {
      mesh.pause();
      mesh.restore(JSON.parse(localStorage.getItem(key)), (k) => kinds[k]);
      render();
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  $("builderpromote").onclick = () => {
    try {
      const j = mesh.jobs.get("builder");
      if (j?.status !== "done" || !j.result?.artifact)
        throw Error("No independently verified generated component");
      const a = j.result.artifact;
      if (MeshBuilder.replay(a).status !== "verified-on-supplied-examples")
        throw Error("Replay failed");
      const all = JSON.parse(localStorage.getItem(artifactKey) || "[]");
      all.push(a);
      localStorage.setItem(artifactKey, JSON.stringify(all));
      $("builderout").textContent =
        "Saved verified generated component " +
        a.id +
        "\n" +
        a.source +
        "\nTotal saved: " +
        all.length;
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  $("builderexport").onclick = () => {
    try {
      const a = mesh.jobs.get("builder")?.result?.artifact;
      if (!a) throw Error("No verified component");
      const blob = new Blob([JSON.stringify(a, null, 2)], { type: "application/json" }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = a.id + ".json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      $("builderout").textContent = e.message;
    }
  };
  render();
})();
