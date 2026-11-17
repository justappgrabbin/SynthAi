(function (r) {
  // New integration mechanism: compile explicit component contracts into a bounded executable graph.
  function run(parts, graph, inputs) {
    const results = {},
      trace = [],
      pending = new Map();
    try {
      for (const n of graph) {
        if (typeof n.id !== "string" || pending.has(n.id) || Object.hasOwn(inputs, n.id))
          throw Error("Duplicate or invalid node");
        pending.set(n.id, n);
      }
      while (pending.size) {
        let progress = false;
        for (const [id, n] of pending) {
          if (!Array.isArray(n.args)) throw Error("Arguments required: " + id);
          if (
            !n.args.every(
              (a) =>
                Object.hasOwn(a, "literal") ||
                Object.hasOwn(inputs, a.ref) ||
                Object.hasOwn(results, a.ref),
            )
          )
            continue;
          const p = parts.find((p) => p.id === n.part);
          if (!p) throw Error("Missing component " + n.part);
          const args = n.args.map((a) =>
            Object.hasOwn(a, "literal")
              ? a.literal
              : Object.hasOwn(results, a.ref)
                ? results[a.ref]
                : inputs[a.ref],
          );
          let out;
          if (p.language === "python") {
            if (
              !args.every(
                (x) => typeof x === "boolean" || (Number.isSafeInteger(x) && Math.abs(x) <= 32767),
              )
            )
              throw Error("Python input outside supported range");
            const code = r.Polyglot.translate(p.source);
            out = r.LocalExecution.execute(code, args, p.entry);
          } else if (p.language === "javascript")
            out = r.LocalExecution.execute(p.source, args, p.entry);
          else throw Error("Unsupported language " + p.language);
          trace.push({ node: id, part: p.id, language: p.language, args, ...out });
          if (out.status !== "executed") throw Error(out.error);
          Object.defineProperty(results, id, { value: out.value, enumerable: true });
          pending.delete(id);
          progress = true;
        }
        if (!progress)
          throw Error("Unresolved dependency or cycle: " + [...pending.keys()].join(", "));
      }
      return { status: "executed", results, trace };
    } catch (e) {
      return { status: "blocked", error: e.message, results, trace };
    }
  }
  function verify(parts, graph, cases) {
    return cases.map((c) => {
      const out = run(parts, graph, c.inputs);
      return {
        ...out,
        expected: c.expected,
        pass:
          out.status === "executed" &&
          Object.entries(c.expected).every(
            ([k, v]) => Object.hasOwn(out.results, k) && Object.is(out.results[k], v),
          ),
      };
    });
  }
  const sample = {
    parts: [
      { id: "xor", language: "python", entry: "mix", source: "def mix(a, b):\n    return a ^ b" },
      {
        id: "mask",
        language: "javascript",
        entry: "mask",
        source: "function mask(a,b){return a & b;}",
      },
    ],
    graph: [
      { id: "masked", part: "mask", args: [{ ref: "mixed" }, { literal: 3 }] },
      { id: "mixed", part: "xor", args: [{ ref: "a" }, { ref: "b" }] },
    ],
    cases: [
      { inputs: { a: 5, b: 2 }, expected: { mixed: 7, masked: 3 } },
      { inputs: { a: 4, b: 4 }, expected: { masked: 0 } },
    ],
  };
  r.Assembly = { run, verify, sample };
})(globalThis);
