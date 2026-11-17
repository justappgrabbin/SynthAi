(function (r) {
  // Structural evidence graph; donor inspiration: semantic spacetime event journals and execution spine.
  function investigate(files) {
    const nodes = [],
      edges = [],
      reports = [],
      ids = new Set();
    function node(id, kind, extra = {}) {
      if (!ids.has(id)) {
        ids.add(id);
        nodes.push({ id, kind, ...extra });
      }
    }
    function edge(source, target, kind, line) {
      edges.push({
        sequence: edges.length,
        source,
        target,
        kind,
        line,
        observer: "static-parser",
        scope: "source-analysis",
        scale: "component",
        verified: "syntactic evidence",
      });
    }
    for (const f of files) {
      node(f.id, "artifact");
      const a = r.ComputerAnalysis.analyze(f, files);
      reports.push(a);
      for (const d of a.dependencies) {
        if (d.status === "resolved") {
          for (const t of d.targets) {
            node(t, "artifact");
            edge(f.id, t, "imports", d.line);
          }
        } else {
          const t = f.id + "::dependency:" + d.specifier;
          node(t, "dependency", { status: d.status });
          edge(f.id, t, "requires", d.line);
        }
      }
      if (a.status !== "parsed") continue;
      let ast;
      try {
        ast = r.acorn.parse(f.text, {
          ecmaVersion: "latest",
          sourceType: "module",
          locations: true,
        });
      } catch {
        ast = r.acorn.parse(f.text, {
          ecmaVersion: "latest",
          sourceType: "script",
          locations: true,
        });
      }
      const declared = new Map();
      for (const n of ast.body) {
        const d = n.type === "ExportNamedDeclaration" ? n.declaration : n;
        if (d?.type === "FunctionDeclaration" && d.id) {
          const id = f.id + "::" + d.id.name;
          declared.set(d.id.name, id);
          node(id, "function", { name: d.id.name, arity: d.params.length, line: d.loc.start.line });
          edge(f.id, id, "defines", d.loc.start.line);
        }
      }
      function visit(n, owner) {
        if (!n || typeof n !== "object") return;
        if (n.type === "FunctionDeclaration" && declared.has(n.id?.name))
          owner = declared.get(n.id.name);
        if (
          n.type === "CallExpression" &&
          n.callee.type === "Identifier" &&
          declared.has(n.callee.name)
        ) {
          // lexical names are candidates, not runtime proof (shadowing possible)
          edge(owner, declared.get(n.callee.name), "possible-call", n.loc.start.line);
        }
        for (const [k, v] of Object.entries(n)) {
          if (k === "loc") continue;
          if (Array.isArray(v)) v.forEach((x) => visit(x, owner));
          else if (v && typeof v === "object") visit(v, owner);
        }
      }
      visit(ast, f.id);
    }
    return {
      nodes,
      edges,
      reports,
      unresolved: edges.filter((e) => e.kind === "requires"),
      placement: {
        status: "unresolved",
        reason: "Semantic register explicitly lacks canonical computational placement rules",
      },
    };
  }
  function impact(g, id) {
    const seen = new Set([id]),
      queue = [id];
    while (queue.length) {
      const t = queue.shift();
      for (const e of g.edges)
        if (e.target === t && !seen.has(e.source)) {
          seen.add(e.source);
          queue.push(e.source);
        }
    }
    return [...seen].filter((x) => x !== id);
  }
  const sample = [
    {
      id: "demo/a.js",
      archive: "demo",
      path: "a.js",
      text: 'import {mix} from "./b.js"; export function main(x){return mix(x,2)}',
    },
    {
      id: "demo/b.js",
      archive: "demo",
      path: "b.js",
      text: "export function mix(a,b){return a ^ b}",
    },
  ];
  r.Comprehension = { investigate, impact, sample };
})(globalThis);
