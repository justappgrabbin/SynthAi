(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id),
    key = "independent-computer-learning-v1";
  let state = null;
  const show = (x) => {
    $("learnout").textContent = JSON.stringify(x, null, 2);
  };
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      show({ warning: "Could not persist", error: e.message });
    }
  }
  function load() {
    try {
      state = JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      state = null;
    }
    if (state) {
      $("learnsource").value = state.source;
      $("learncases").value = JSON.stringify(state.cases, null, 2);
      show({
        revision: state.revision,
        history: state.history.length,
        candidates: state.candidates.length,
      });
    }
  }
  $("learncreate").onclick = () => {
    try {
      state = root.ComputerLearning.make(
        $("learnname").value,
        $("learnsource").value,
        $("learnentry").value,
        JSON.parse($("learncases").value),
      );
      save();
      show({
        created: state.name,
        baseline: root.ComputerLearning.assess(state.source, state.entry, state.cases),
      });
    } catch (e) {
      show({ error: e.message });
    }
  };
  $("learnpropose").onclick = () => {
    try {
      if (!state) throw Error("Create or restore a baseline first");
      const result = root.ComputerLearning.propose(
        state,
        $("learncandidate").value,
        JSON.parse($("learnextra").value || "[]"),
      );
      state = result.state;
      save();
      show(result.record);
    } catch (e) {
      show({ error: e.message });
    }
  };
  $("learnpromote").onclick = () => {
    try {
      if (!state) throw Error("No baseline");
      const eligible = state.candidates.filter((c) => c.status === "eligible");
      if (!eligible.length) throw Error("No eligible candidate");
      state = root.ComputerLearning.promote(state, eligible[eligible.length - 1].id, true);
      $("learnsource").value = state.source;
      save();
      show({
        promoted: true,
        revision: state.revision,
        baseline: root.ComputerLearning.assess(state.source, state.entry, state.cases),
      });
    } catch (e) {
      show({ error: e.message });
    }
  };
  $("learnfeedback").onclick = () => {
    try {
      if (!state) throw Error("No baseline");
      const r = root.ComputerLearning.addFeedback(state, JSON.parse($("learnextra").value));
      state = r.state;
      save();
      show({ feedback: r.evaluation, revision: state.revision });
    } catch (e) {
      show({ error: e.message });
    }
  };
  $("learnrollback").onclick = () => {
    try {
      state = root.ComputerLearning.rollback(state);
      $("learnsource").value = state.source;
      save();
      show({ restored: state.revision });
    } catch (e) {
      show({ error: e.message });
    }
  };
  $("learnexport").onclick = () => {
    if (!state) return show({ error: "No baseline" });
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "learning-evidence.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  load();
})(globalThis);
