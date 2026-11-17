(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    key = "independent-generated-components-v1",
    out = $("reuseout");
  let result = null;
  function stored() {
    const v = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(v)) throw Error("Invalid component library");
    return v;
  }
  function refresh() {
    const v = stored();
    for (const id of ["reusefirst", "reusesecond"]) {
      $(id).replaceChildren();
      v.forEach((a, i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = (a.id || "component") + " — " + (a.inputs || []).join(",");
        $(id).appendChild(o);
      });
    }
    out.textContent =
      "Available verified components: " +
      v.length +
      "\nSave at least two using the Cooperative builder.";
  }
  $("reuserefresh").onclick = () => {
    try {
      refresh();
    } catch (e) {
      out.textContent = e.message;
    }
  };
  $("reusesample").onclick = () => {
    $("reusecontract").value = JSON.stringify(
      {
        inputs: ["a", "b"],
        firstArgs: ["a", "b"],
        secondArgs: ["$previous", "b"],
        cases: [
          { args: [1, 2], expected: 5 },
          { args: [3, 4], expected: 11 },
          { args: [5, 6], expected: 17 },
          { args: [7, 8], expected: 23 },
        ],
      },
      null,
      2,
    );
  };
  $("reuserun").onclick = () => {
    try {
      const v = stored();
      result = ComponentReuse.compose(
        [v[Number($("reusefirst").value)], v[Number($("reusesecond").value)]],
        JSON.parse($("reusecontract").value),
      );
      out.textContent = JSON.stringify(
        {
          status: result.status,
          evidence: result.evidence,
          source: result.artifact?.source,
          dependencies: result.artifact?.dependencies.map((d) => d.id),
        },
        null,
        2,
      );
    } catch (e) {
      result = null;
      out.textContent = e.message;
    }
  };
  $("reusesave").onclick = () => {
    try {
      if (
        !result?.artifact ||
        ComponentReuse.replay(result.artifact).status !== "verified-on-supplied-examples"
      )
        throw Error("No verified composition");
      const v = JSON.parse(localStorage.getItem("independent-composed-components-v1") || "[]");
      v.push(result.artifact);
      localStorage.setItem("independent-composed-components-v1", JSON.stringify(v));
      out.textContent = "Saved composition with provenance: " + result.artifact.id;
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
