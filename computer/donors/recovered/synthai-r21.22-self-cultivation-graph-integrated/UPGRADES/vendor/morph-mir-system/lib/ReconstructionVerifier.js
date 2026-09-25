/**
 * Scores reconstructed JavaScript against an inferred semantic contract.
 */
class ReconstructionVerifier {
  evaluate(candidate, sourceAnalysis, relationshipContext = {}) {
    const code = String(candidate.code || "");
    const expectedSymbols = sourceAnalysis.symbols
      .filter((symbol) => symbol.exported)
      .map((symbol) => symbol.name);
    const expectedBehaviors = sourceAnalysis.behaviors || [];
    const outgoing = relationshipContext.outgoing || [];

    const apiCoverage = this.coverage(
      expectedSymbols,
      expectedSymbols.filter((name) => new RegExp(`\\b${this.escape(name)}\\b`).test(code))
    );
    const behaviorCoverage = this.coverage(
      expectedBehaviors,
      expectedBehaviors.filter((behavior) => this.behaviorPresent(code, behavior))
    );
    const relationshipCoverage = this.coverage(
      outgoing.filter((edge) => edge.resolved),
      outgoing.filter((edge) => edge.resolved && this.relationshipPresent(code, edge))
    );
    const dependencyPurity = this.dependencyPurity(code);
    const syntax = this.syntaxScore(code);
    const placeholderPenalty = /\bTODO\b|NotImplemented|throw new Error\(["']Unresolved/i.test(code) ? 0.35 : 0;
    const intentCoverage = this.intentCoverage(code, sourceAnalysis.purpose);

    const score = this.clamp(
      apiCoverage * 0.24 +
      behaviorCoverage * 0.22 +
      relationshipCoverage * 0.14 +
      dependencyPurity * 0.14 +
      syntax * 0.16 +
      intentCoverage * 0.10 -
      placeholderPenalty
    );

    return {
      score,
      metrics: {
        apiCoverage,
        behaviorCoverage,
        relationshipCoverage,
        dependencyPurity,
        syntax,
        intentCoverage,
        placeholderPenalty
      },
      missing: {
        symbols: expectedSymbols.filter((name) => !new RegExp(`\\b${this.escape(name)}\\b`).test(code)),
        behaviors: expectedBehaviors.filter((behavior) => !this.behaviorPresent(code, behavior)),
        relationships: outgoing
          .filter((edge) => edge.resolved && !this.relationshipPresent(code, edge))
          .map((edge) => edge.to)
      }
    };
  }

  behaviorPresent(code, behavior) {
    const patterns = {
      "asynchronous-work": /\basync\b|\bawait\b/,
      "network-io": /\bfetch\s*\(|XMLHttpRequest|WebSocket/,
      "file-io": /FileReader|FileSystem|readFile|writeFile|runtime\.(?:read|write)/,
      "json-transform": /\bJSON\.(?:parse|stringify)\b/,
      "collection-state": /\b(?:Map|Set)\s*\(|\{\s*\}|\[\s*\]/,
      "event-flow": /addEventListener|dispatchEvent|emit\s*\(|subscribe\s*\(/,
      "concurrent-work": /Promise\.all|Worker\s*\(|queueMicrotask/,
      "persistence": /localStorage|indexedDB|runtime\.storage|database/,
      "graph-processing": /\b(?:nodes|edges|graph|adjacency)\b/i,
      "stochastic-search": /Math\.random|crypto\.getRandomValues|sample|probability/i,
      "rendering": /document\.createElement|innerHTML|render|template/i,
      "language-processing": /parse|token|grammar|AST|syntax/i,
      "validation": /validate|verify|assert|check/i,
      "memory": /Map\s*\(|memory|cache|remember|recall/i,
      "conditional-logic": /\bif\s*\(|\bswitch\s*\(|\?[^:]+:/,
      "returns-value": /\breturn\s+[^;\n]+/,
      "arithmetic-transform": /[A-Za-z0-9_.)\]]\s*[+\-*/%]\s*[A-Za-z0-9_(\[]/,
      "generator": /\bfunction\s*\*|\byield\b/
    };
    return patterns[behavior]?.test(code) ?? true;
  }

  relationshipPresent(code, edge) {
    if (edge.symbols?.some((symbol) => symbol !== "*" && code.includes(symbol))) return true;
    const targetStem = String(edge.to || edge.source || "")
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "");
    return targetStem ? code.includes(targetStem) : false;
  }

  dependencyPurity(code) {
    if (/\b(?:from|import)\s+["']?(?:requests|numpy|pandas|flask|fastapi|django|torch|tensorflow)["']?/i.test(code)) {
      return 0;
    }
    if (/\brequire\s*\(\s*["'][^."']/i.test(code)) return 0.25;
    return 1;
  }

  syntaxScore(code) {
    try {
      const body = code
        .replace(/^\s*import[\s\S]*?;\s*$/gm, "")
        .replace(/\bexport\s+default\s+/g, "")
        .replace(/\bexport\s+/g, "");
      Function(body);
      return 1;
    } catch {
      return 0;
    }
  }

  intentCoverage(code, purpose) {
    const words = String(purpose || "")
      .toLowerCase()
      .match(/[a-z][a-z0-9_-]{3,}/g) || [];
    const meaningful = [...new Set(words)].slice(0, 20);
    if (!meaningful.length) return 1;
    const lower = code.toLowerCase();
    const hits = meaningful.filter((word) => lower.includes(word)).length;
    return hits / meaningful.length;
  }

  coverage(expected, found) {
    if (!expected.length) return 1;
    return found.length / expected.length;
  }

  clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  escape(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export { ReconstructionVerifier };
