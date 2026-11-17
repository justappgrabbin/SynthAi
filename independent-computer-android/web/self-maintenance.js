/* Non-destructive, evidence-gated maintenance of the computer's source registry.
   Does not claim browser permission to rewrite its installed HTML/JS bundle. */
(function (root) {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const js = /\.(?:mjs|cjs|js)$/i;
  function checkSyntax(source) {
    try {
      if (root.acorn) {
        root.acorn.parse(source, {
          ecmaVersion: "latest",
          sourceType: "module",
          allowHashBang: true,
        });
        return { ok: true, engine: "acorn" };
      }
      return { ok: null, engine: "unavailable" };
    } catch (e) {
      return { ok: false, error: e.message, engine: "acorn" };
    }
  }
  function inspect(files) {
    const active = files.filter((f) => typeof f.text === "string" && js.test(f.path));
    const graph = root.ProjectIntake.connections(active);
    const syntax = active.map((f) => ({ path: f.path, ...checkSyntax(f.text) }));
    return {
      schema: "independent-self-maintenance/v1",
      files: active.length,
      syntax,
      dependencies: graph,
      issues: [
        ...syntax
          .filter((x) => x.ok === false)
          .map((x) => ({ kind: "syntax", path: x.path, error: x.error })),
        ...graph.unresolved.map((x) => ({ kind: x.kind, path: x.from, specifier: x.specifier })),
      ],
      limits:
        "Static dependency analysis and JavaScript syntax checks; runtime behavior requires separate execution tests.",
    };
  }
  function resolve(path, spec) {
    const parts = path.split("/").slice(0, -1);
    for (const s of spec.split("/")) {
      if (s === "..") parts.pop();
      else if (s !== ".") parts.push(s);
    }
    return parts.join("/");
  }
  function propose(files) {
    const report = inspect(files),
      paths = new Set(files.map((f) => f.path)),
      proposals = [];
    for (const issue of report.issues) {
      if (issue.kind !== "unresolved-local") continue;
      const f = files.find((x) => x.path === issue.path);
      if (!f || !js.test(f.path)) continue;
      const requested = resolve(f.path, issue.specifier);
      const basename = requested
        .split("/")
        .pop()
        .replace(/\.(?:js|mjs|cjs)$/, "");
      const candidates = [...paths].filter(
        (p) =>
          p !== f.path &&
          js.test(p) &&
          p
            .split("/")
            .pop()
            .replace(/\.(?:js|mjs|cjs)$/, "") === basename,
      );
      if (candidates.length !== 1) continue;
      const target = candidates[0],
        base = f.path.split("/").slice(0, -1),
        parts = target.split("/");
      while (base.length && parts.length && base[0] === parts[0]) {
        base.shift();
        parts.shift();
      }
      const spec = "../".repeat(base.length) + parts.join("/");
      const replacement = spec.startsWith(".") ? spec : "./" + spec;
      if (replacement === issue.specifier) continue;
      const escaped = issue.specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("([\\x27\\x22])" + escaped + "\\1", "g");
      let count = 0;
      const changed = f.text.replace(re, (match, q) => {
        count++;
        return q + replacement + q;
      });
      if (count !== 1) continue;
      const after = files.map((x) => (x === f ? { ...f, text: changed } : x)),
        check = inspect(after);
      const beforeCount = report.dependencies.unresolved.length,
        afterCount = check.dependencies.unresolved.length;
      if (check.syntax.find((x) => x.path === f.path)?.ok === false || afterCount >= beforeCount)
        continue;
      proposals.push({
        kind: "dependency-link-repair",
        path: f.path,
        from: issue.specifier,
        to: replacement,
        original: f.text,
        revised: changed,
        sourceId: f.id || null,
        evidence: {
          unresolvedBefore: beforeCount,
          unresolvedAfter: afterCount,
          syntax: check.syntax.find((x) => x.path === f.path)?.ok ?? null,
        },
        status: "staged",
      });
    }
    return { report, proposals };
  }
  function apply(files, proposal) {
    if (!proposal || proposal.status !== "staged" || proposal.kind !== "dependency-link-repair")
      throw Error("Unsupported repair proposal");
    const original = files.find((f) => f.path === proposal.path);
    if (!original || original.text !== proposal.original)
      throw Error("Source changed since repair proposal; refusing overwrite");
    const revised = files.map((f) => (f === original ? { ...f, text: proposal.revised } : f));
    const before = inspect(files),
      after = inspect(revised);
    if (
      after.dependencies.unresolved.length >= before.dependencies.unresolved.length ||
      after.syntax.some(
        (x) => x.ok === false && !before.syntax.some((y) => y.path === x.path && y.ok === false),
      )
    )
      throw Error("Repair failed dependency or syntax regression gate");
    return {
      status: "verified-static-repair",
      files: revised,
      record: {
        schema: "independent-maintenance-commit/v1",
        path: proposal.path,
        original: proposal.original,
        revised: proposal.revised,
        reason: proposal.kind,
        evidence: proposal.evidence,
        verified: "static-only",
        timestamp: new Date().toISOString(),
      },
    };
  }
  function rollback(files, commit) {
    if (!commit || commit.schema !== "independent-maintenance-commit/v1")
      throw Error("Invalid maintenance commit");
    const target = files.find((f) => f.path === commit.path);
    if (!target || target.text !== commit.revised)
      throw Error("Current revision differs; refusing unsafe rollback");
    return files.map((f) => (f === target ? { ...f, text: commit.original } : f));
  }
  const api = { inspect, propose, apply, rollback };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.SelfMaintenance = api;
})(globalThis);
