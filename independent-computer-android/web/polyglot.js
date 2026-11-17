(function (root) {
  // Conservative Python expression/function adapter. No host execution.
  function translate(source) {
    let out = [],
      current = false;
    for (const [i, raw] of source.split(/\r?\n/).entries()) {
      if (!raw.trim() || raw.trim().startsWith("#")) continue;
      let m = raw.match(/^def ([A-Za-z_]\w*)\(([A-Za-z_\w, ]*)\):\s*$/);
      if (m) {
        if (current) out.push("}");
        out.push(`function ${m[1]}(${m[2]}) {`);
        current = true;
        continue;
      }
      m = raw.match(/^ {4}return (.+)$/);
      if (!current || !m) throw Error("Unsupported Python at line " + (i + 1));
      let ex = m[1];
      if (
        !/^[\w\s()+*%<>=!&|^,\-]+$/.test(ex) ||
        /\b(?:and|or|not|is|in|None)\b/.test(ex) ||
        /\d\s*[eE]|\b0\d/.test(ex) ||
        /[<>!=]=|[<>]|\*\*|%/.test(ex)
      )
        throw Error("Unsupported Python expression at line " + (i + 1));
      ex = ex.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false");
      out.push("return " + ex + ";");
    }
    if (current) out.push("}");
    else throw Error("No supported Python function");
    return out.join("\n");
  }
  function verify(source, entry, cases) {
    try {
      if (
        cases.some(
          (c) =>
            !c.args.every(
              (x) => typeof x === "boolean" || (Number.isSafeInteger(x) && Math.abs(x) <= 32767),
            ),
        )
      )
        throw Error("Only small integer or Boolean inputs supported");
      let code = translate(source);
      let results = root.LocalExecution.verify(code, entry, cases);
      return {
        status: "translated",
        code,
        results,
        scope:
          "Restricted Python functions; JS number/bitwise semantics, not general Python equivalence",
      };
    } catch (e) {
      return { status: "blocked", error: e.message, results: [] };
    }
  }
  root.Polyglot = { translate, verify };
})(globalThis);
