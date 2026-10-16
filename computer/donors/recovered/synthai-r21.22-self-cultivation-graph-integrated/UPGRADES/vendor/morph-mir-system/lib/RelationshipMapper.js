/**
 * Builds a language-neutral graph of file purpose, symbols, dependencies,
 * calls, and cross-file relationships for semantic reconstruction.
 */
class RelationshipMapper {
  analyzeArtifact(artifact) {
    const name = String(artifact.originalName || artifact.name || "artifact");
    const content = String(artifact.originalContent ?? artifact.content ?? "");
    const language = this.detectLanguage(name);
    const imports = language === "python"
      ? this.extractPythonImports(content)
      : this.extractJavaScriptImports(content);
    const exports = language === "python"
      ? this.extractPythonSymbols(content).filter((symbol) => symbol.exported)
      : this.extractJavaScriptExports(content);
    const symbols = language === "python"
      ? this.extractPythonSymbols(content)
      : this.extractJavaScriptSymbols(content);
    const calls = this.extractCalls(content, language);
    const behaviors = this.extractBehaviors(content, language);
    const purpose = this.inferPurpose(name, content, symbols, behaviors);

    return {
      id: artifact.id || name,
      name,
      language,
      imports,
      exports,
      symbols,
      calls,
      behaviors,
      purpose
    };
  }

  mapProject(artifacts) {
    const nodes = artifacts.map((artifact) => this.analyzeArtifact(artifact));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const edges = [];

    for (const node of nodes) {
      for (const dependency of node.imports) {
        const target = this.resolveDependency(node, dependency, nodes);
        edges.push({
          from: node.id,
          to: target?.id || dependency.source,
          kind: target ? "imports-local" : "imports-external",
          symbols: dependency.symbols,
          source: dependency.source,
          resolved: Boolean(target)
        });
      }

      for (const other of nodes) {
        if (other.id === node.id) continue;
        const referenced = other.symbols
          .filter((symbol) => node.calls.includes(symbol.name))
          .map((symbol) => symbol.name);
        if (referenced.length > 0) {
          edges.push({
            from: node.id,
            to: other.id,
            kind: "calls-symbol",
            symbols: [...new Set(referenced)],
            resolved: true
          });
        }
      }
    }

    const neighborhoods = {};
    for (const node of nodes) {
      neighborhoods[node.id] = {
        incoming: edges.filter((edge) => edge.to === node.id),
        outgoing: edges.filter((edge) => edge.from === node.id),
        collaborators: [...new Set(
          edges
            .filter((edge) => edge.from === node.id || edge.to === node.id)
            .flatMap((edge) => [edge.from, edge.to])
            .filter((id) => id !== node.id && byId.has(id))
        )]
      };
    }

    return { nodes, edges, neighborhoods };
  }

  detectLanguage(name) {
    const extension = name.split(".").pop()?.toLowerCase();
    if (extension === "py") return "python";
    if (["js", "mjs", "cjs", "jsx"].includes(extension)) return "javascript";
    if (["ts", "mts", "cts", "tsx"].includes(extension)) return "typescript";
    if (extension === "json") return "json";
    return "text";
  }

  extractPythonImports(content) {
    const imports = [];
    for (const line of content.split(/\r?\n/)) {
      const fromMatch = line.match(/^\s*from\s+([A-Za-z0-9_./]+)\s+import\s+(.+?)\s*$/);
      if (fromMatch) {
        imports.push({
          source: fromMatch[1],
          symbols: fromMatch[2]
            .replace(/[()]/g, "")
            .split(",")
            .map((value) => value.trim().split(/\s+as\s+/)[0])
            .filter(Boolean)
        });
        continue;
      }

      const importMatch = line.match(/^\s*import\s+(.+?)\s*$/);
      if (importMatch) {
        for (const item of importMatch[1].split(",")) {
          const source = item.trim().split(/\s+as\s+/)[0];
          if (source) imports.push({ source, symbols: ["*"] });
        }
      }
    }
    return imports;
  }

  extractJavaScriptImports(content) {
    const imports = [];
    const staticImports = content.matchAll(
      /import\s+(?:(.*?)\s+from\s+)?["']([^"']+)["']/g
    );
    for (const match of staticImports) {
      imports.push({
        source: match[2],
        symbols: this.parseJavaScriptImportClause(match[1] || "")
      });
    }

    const requires = content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g);
    for (const match of requires) {
      imports.push({ source: match[1], symbols: ["*"] });
    }
    return imports;
  }

  parseJavaScriptImportClause(clause) {
    const clean = clause.trim();
    if (!clean) return [];
    if (clean.startsWith("{")) {
      return clean
        .replace(/[{}]/g, "")
        .split(",")
        .map((item) => item.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
    }
    if (clean.startsWith("*")) return ["*"];
    return [clean.split(",")[0].trim()].filter(Boolean);
  }

  extractPythonSymbols(content) {
    const symbols = [];
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/^(\s*)(async\s+def|def|class)\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?/);
      if (!match) continue;

      const indent = match[1].replace(/\t/g, "    ").length;
      const kind = match[2].includes("def") ? "function" : "class";
      const name = match[3];
      symbols.push({
        name,
        kind,
        async: match[2].startsWith("async"),
        params: kind === "function" ? this.parsePythonParams(match[4] || "") : [],
        exported: indent === 0 && !name.startsWith("_"),
        line: index + 1,
        indent
      });
    }
    return symbols;
  }

  parsePythonParams(value) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/^\*{1,2}/, "").split("=")[0].split(":")[0].trim())
      .filter((name) => name && name !== "self" && name !== "cls");
  }

  extractJavaScriptSymbols(content) {
    const symbols = [];
    const pattern = /\b(?:export\s+)?(?:default\s+)?(async\s+)?(function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
    for (const match of content.matchAll(pattern)) {
      symbols.push({
        name: match[3],
        kind: match[2] === "class" ? "class" : match[2] === "function" ? "function" : "binding",
        async: Boolean(match[1]),
        exported: /export/.test(match[0])
      });
    }
    return symbols;
  }

  extractJavaScriptExports(content) {
    return this.extractJavaScriptSymbols(content).filter((symbol) => symbol.exported);
  }

  extractCalls(content, language) {
    const calls = new Set();
    const pattern = language === "python"
      ? /\b([A-Za-z_]\w*)\s*\(/g
      : /\b([A-Za-z_$][\w$]*)\s*\(/g;
    const ignored = new Set([
      "if", "for", "while", "switch", "catch", "function", "return",
      "def", "class", "with", "print", "len"
    ]);
    for (const match of content.matchAll(pattern)) {
      if (!ignored.has(match[1])) calls.add(match[1]);
    }
    return [...calls];
  }

  extractBehaviors(content, language) {
    const behaviors = new Set();
    const tests = [
      [/async\s+|await\s+/, "asynchronous-work"],
      [/\b(fetch|axios|requests\.|httpx\.|urllib)\b/, "network-io"],
      [/\b(open\s*\(|readFile|writeFile|fs\.|pathlib|os\.)/, "file-io"],
      [/\b(json\.|JSON\.)/, "json-transform"],
      [/\b(Map|Set|dict|defaultdict|Counter)\b/, "collection-state"],
      [/\b(subscribe|observer|emit|dispatch|event)\b/i, "event-flow"],
      [/\b(queue|worker|thread|process|multiprocessing)\b/i, "concurrent-work"],
      [/\b(sql|sqlite|database|supabase|postgres|mongo)\b/i, "persistence"],
      [/\b(graph|node|edge|networkx)\b/i, "graph-processing"],
      [/\b(random|monte.?carlo|sample|probability)\b/i, "stochastic-search"],
      [/\b(render|jsx|tsx|component|html|canvas)\b/i, "rendering"],
      [/\b(parse|tokenize|lexer|grammar|ast)\b/i, "language-processing"],
      [/\b(validate|verify|assert|check)\b/i, "validation"],
      [/\b(memory|cache|remember|recall)\b/i, "memory"],
      [/\bif\s+|\belse\s*:|\belif\s+|\bswitch\s*\(|\?[^:]+:/, "conditional-logic"],
      [/\breturn\s+[^\n]+/, "returns-value"],
      [/[A-Za-z0-9_.)\]]\s*[+\-*/%]\s*[A-Za-z0-9_(\[]/, "arithmetic-transform"]
    ];
    for (const [pattern, behavior] of tests) {
      if (pattern.test(content)) behaviors.add(behavior);
    }
    if (language === "python" && /\byield\b/.test(content)) behaviors.add("generator");
    return [...behaviors];
  }

  inferPurpose(name, content, symbols, behaviors) {
    const doc = this.extractLeadingDocumentation(content);
    if (doc) return doc;

    const stem = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const exported = symbols.filter((symbol) => symbol.exported).map((symbol) => symbol.name);
    const behaviorText = behaviors.length ? ` It provides ${behaviors.join(", ")} behavior.` : "";
    const symbolText = exported.length ? ` Primary public symbols: ${exported.join(", ")}.` : "";
    return `${stem} module.${symbolText}${behaviorText}`.trim();
  }

  extractLeadingDocumentation(content) {
    const pythonDoc = content.match(/^\s*(?:[rubfRUBF]*)?(["']{3})([\s\S]*?)\1/);
    if (pythonDoc) return this.compactDocumentation(pythonDoc[2]);

    const jsDoc = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
    if (jsDoc) return this.compactDocumentation(jsDoc[1].replace(/^\s*\*\s?/gm, ""));

    const commentLines = content
      .split(/\r?\n/)
      .slice(0, 8)
      .filter((line) => /^\s*(?:\/\/|#)/.test(line))
      .map((line) => line.replace(/^\s*(?:\/\/|#)\s?/, "").trim())
      .filter(Boolean);
    return commentLines.length ? this.compactDocumentation(commentLines.join(" ")) : "";
  }

  compactDocumentation(value) {
    return value.replace(/\s+/g, " ").trim().slice(0, 500);
  }

  resolveDependency(node, dependency, nodes) {
    const source = dependency.source.replace(/\\/g, "/");
    const base = source.split("/").pop().replace(/\.(?:js|mjs|cjs|ts|tsx|jsx|py)$/, "");
    const normalized = base.replace(/-/g, "_").toLowerCase();
    return nodes.find((candidate) => {
      const candidateBase = candidate.name
        .split("/")
        .pop()
        .replace(/\.(?:js|mjs|cjs|ts|tsx|jsx|py)$/, "")
        .replace(/-/g, "_")
        .toLowerCase();
      return candidateBase === normalized;
    });
  }
}

export { RelationshipMapper };
