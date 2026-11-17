(function (root) {
  function analyze(record, records) {
    const result = {
      source: record.id,
      language: "unknown",
      structure: [],
      dependencies: [],
      calls: [],
      exports: [],
      purposeEvidence: [],
      status: "not executed",
    };
    let s = record.text || "";
    result.purposeEvidence = s
      .split("\n")
      .map((text, i) => ({ line: i + 1, text }))
      .filter((x) => /^\s*(\/\/|# |\/\*|\*)/.test(x.text))
      .slice(0, 12);
    if (!/\.(?:js|mjs|cjs)$/i.test(record.path)) {
      result.language = "non-JavaScript";
      result.status = "requires language-specific adapter";
      return result;
    }
    result.language = "JavaScript";
    let ast;
    try {
      ast = root.acorn.parse(s, { ecmaVersion: "latest", sourceType: "module", locations: true });
    } catch (e) {
      try {
        ast = root.acorn.parse(s, { ecmaVersion: "latest", sourceType: "script", locations: true });
      } catch (e2) {
        result.status = "parse failed";
        result.error = e2.message;
        return result;
      }
    }
    result.status = "parsed";
    function resolve(spec) {
      if (!spec.startsWith(".")) return { specifier: spec, status: "external or builtin" };
      let parts = record.path.split("/");
      parts.pop();
      for (let p of spec.split("/")) {
        if (p === "..") parts.pop();
        else if (p !== ".") parts.push(p);
      }
      let path = parts.join("/"),
        matches = records.filter(
          (r) =>
            r.archive === record.archive &&
            [path, path + ".js", path + ".mjs", path + ".cjs", path + "/index.js"].includes(r.path),
        );
      return {
        specifier: spec,
        status: matches.length === 1 ? "resolved" : matches.length ? "ambiguous" : "missing",
        targets: matches.map((r) => r.id),
      };
    }
    function walk(n) {
      if (!n || typeof n !== "object") return;
      if (n.type) {
        let line = n.loc?.start.line;
        if (/FunctionDeclaration|ClassDeclaration|VariableDeclarator/.test(n.type))
          result.structure.push({
            kind: n.type,
            name: n.id?.name || "(pattern or anonymous)",
            line,
          });
        if (n.type === "ImportDeclaration" || (n.type.startsWith("Export") && n.source))
          result.dependencies.push({ ...resolve(n.source.value), line });
        if (n.type.startsWith("Export"))
          result.exports.push({ kind: n.type, name: n.declaration?.id?.name || null, line });
        if (n.type === "CallExpression") {
          let name = n.callee.name || n.callee.property?.name || "(dynamic)";
          result.calls.push({ name, line });
          if (name === "require" && typeof n.arguments[0]?.value === "string")
            result.dependencies.push({ ...resolve(n.arguments[0].value), line });
        }
        if (n.type === "ImportExpression" && typeof n.source.value === "string")
          result.dependencies.push({ ...resolve(n.source.value), line });
      }
      for (let [k, v] of Object.entries(n)) {
        if (k === "loc") continue;
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === "object") walk(v);
      }
    }
    walk(ast);
    return result;
  }
  function topology(data) {
    let edges = Object.entries(data.groups).flatMap(([group, pairs]) =>
      pairs.map(([a, b]) => ({ a, b, group })),
    );
    return {
      edges,
      neighbors: (g) =>
        edges
          .filter((e) => e.a === g || e.b === g)
          .map((e) => (e.a === g ? e.b : e.a))
          .sort((a, b) => a - b),
      pair: (a, b) =>
        edges.find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a)) || null,
    };
  }
  root.ComputerAnalysis = { analyze, topology };
})(globalThis);
