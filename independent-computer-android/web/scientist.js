(function (r) {
  // Recursive formation by bounded enumeration, evaluated against independent examples.
  const ops = ["+", "-", "*", "&", "|", "^"];
  function discover(parts, cases, names, budget = 4000) {
    if (
      !Array.isArray(names) ||
      names.length < 1 ||
      names.length > 4 ||
      new Set(names).size !== names.length ||
      names.some((n) => !/^[_a-zA-Z]\w*$/.test(n))
    )
      throw Error("Provide 1–4 distinct input names");
    if (
      !Array.isArray(cases) ||
      cases.length < 4 ||
      cases.some(
        (c) =>
          !Array.isArray(c.args) ||
          c.args.length !== names.length ||
          !c.args.every(Number.isSafeInteger) ||
          !Number.isSafeInteger(c.expected),
      )
    )
      throw Error("Provide at least four integer examples");
    if (!Array.isArray(parts) || parts.length > 20) throw Error("At most 20 components");
    const train = cases.slice(0, -2),
      hold = cases.slice(-2),
      library = [],
      rejected = [];
    for (const p of parts) {
      try {
        let code =
          p.language === "python"
            ? r.Polyglot.translate(p.source)
            : p.language === "javascript"
              ? p.source
              : null;
        if (!code) throw Error("Unsupported language");
        const ast = r.acorn.parse(code, { ecmaVersion: "latest" });
        const f = ast.body.find((n) => n.type === "FunctionDeclaration" && n.id.name === p.entry);
        if (!f || f.params.length !== 2) throw Error("Only binary components");
        const renamed = code.replace(
          new RegExp("\\b" + p.entry + "\\b", "g"),
          "donor" + library.length,
        );
        const probe = r.LocalExecution.execute(renamed, [2, 3], "donor" + library.length);
        if (probe.status !== "executed" || !Number.isSafeInteger(probe.value))
          throw Error(probe.error || "Non-integer output");
        library.push({ name: "donor" + library.length, code: renamed, id: p.id });
      } catch (e) {
        rejected.push({ id: p.id, error: e.message });
      }
    }
    const prefix = library.map((p) => p.code).join("\n");
    let atoms = names.concat(["0", "1", "2", "3"]),
      seen = new Set(),
      tested = 0,
      holdoutFailures = 0;
    function check(expr) {
      if (seen.has(expr) || tested >= budget) return null;
      seen.add(expr);
      tested++;
      const source = prefix + "\nfunction main(" + names.join(",") + "){return " + expr + ";}";
      if (!r.LocalExecution.verify(source, "main", train).every((c) => c.pass)) return null;
      const verification = r.LocalExecution.verify(source, "main", hold);
      if (!verification.every((c) => c.pass)) {
        holdoutFailures++;
        return null;
      }
      return {
        status: "example-verified",
        source,
        expression: expr,
        tested,
        holdoutFailures,
        rejected,
        training: r.LocalExecution.verify(source, "main", train),
        holdout: verification,
        usedDonors: library.filter((p) => expr.includes(p.name + "(")).map((p) => p.id),
        placement: {
          status: "unresolved",
          reason: "No canonical semantic placement rule verified",
        },
      };
    }
    for (const a of atoms) {
      let x = check(a);
      if (x) return x;
    }
    function combine(a, b) {
      return ops
        .map((o) => "(" + a + o + b + ")")
        .concat(library.map((p) => p.name + "(" + a + "," + b + ")"));
    }
    let layer = [];
    for (const a of atoms)
      for (const b of atoms)
        for (const e of combine(a, b)) {
          let x = check(e);
          if (x) return x;
          layer.push(e);
        }
    for (const a of layer)
      for (const b of atoms) {
        for (const e of [...combine(a, b), ...combine(b, a)]) {
          let x = check(e);
          if (x) return x;
          if (tested >= budget)
            return { status: "budget-exhausted", tested, holdoutFailures, rejected };
        }
      }
    return { status: "no-match", tested, holdoutFailures, rejected };
  }
  const sample = {
    names: ["a", "b"],
    parts: [
      {
        id: "python-mix",
        language: "python",
        entry: "mix",
        source: "def mix(a, b):\n    return a ^ b",
      },
    ],
    cases: [
      { args: [5, 2], expected: 14 },
      { args: [3, 1], expected: 4 },
      { args: [0, 7], expected: 14 },
      { args: [8, 2], expected: 20 },
      { args: [7, 7], expected: 0 },
      { args: [9, 4], expected: 26 },
    ],
  };
  r.Scientist = { discover, sample };
})(globalThis);
