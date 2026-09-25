/**
 * Produces multiple native-JavaScript hypotheses from inferred source behavior.
 * It never executes the source language.
 */
class SemanticRebuilder {
  buildCandidates(artifact, sourceAnalysis, relationshipContext = {}) {
    const language = sourceAnalysis.language;
    const candidates = [];

    if (language === "python") {
      candidates.push(this.buildPythonStructuralCandidate(artifact, sourceAnalysis, relationshipContext));
      candidates.push(this.buildPythonLiteralCandidate(artifact, sourceAnalysis, relationshipContext));
      candidates.push(this.buildContractCandidate(artifact, sourceAnalysis, relationshipContext));
    } else if (language === "typescript") {
      candidates.push(this.buildTypeScriptErasureCandidate(artifact, sourceAnalysis));
      candidates.push(this.buildContractCandidate(artifact, sourceAnalysis, relationshipContext));
    } else if (language === "javascript") {
      candidates.push({
        id: "native-source",
        strategy: "native-source",
        code: String(artifact.originalContent || ""),
        notes: ["Source is already JavaScript."]
      });
      candidates.push(this.buildContractCandidate(artifact, sourceAnalysis, relationshipContext));
    } else {
      candidates.push(this.buildContractCandidate(artifact, sourceAnalysis, relationshipContext));
    }

    return candidates.map((candidate, index) => ({
      ...candidate,
      id: `${candidate.id}-${index + 1}`
    }));
  }

  buildPythonStructuralCandidate(artifact, analysis, relationships) {
    const lines = this.header(artifact, analysis, "structural");
    const localImports = this.renderLocalImports(relationships.outgoing || []);
    if (localImports.length) lines.push(...localImports, "");

    const content = String(artifact.originalContent || "");
    const topLevel = analysis.symbols.filter((symbol) => symbol.exported);
    for (const symbol of topLevel) {
      if (symbol.kind === "class") {
        lines.push(...this.rebuildPythonClass(content, symbol.name));
      } else {
        lines.push(...this.rebuildPythonFunction(content, symbol));
      }
      lines.push("");
    }

    if (!topLevel.length) {
      lines.push(`export const modulePurpose = ${JSON.stringify(analysis.purpose)};`);
      lines.push(`export function initialize() { return { purpose: modulePurpose }; }`);
    }

    return {
      id: "python-structural",
      strategy: "python-structural",
      code: lines.join("\n").trim() + "\n",
      notes: ["Rebuilt from Python symbols, bodies, and project relationships."]
    };
  }

  buildPythonLiteralCandidate(artifact, analysis, relationships) {
    const lines = this.header(artifact, analysis, "literal-behavior");
    const localImports = this.renderLocalImports(relationships.outgoing || []);
    if (localImports.length) lines.push(...localImports, "");

    const translated = this.translatePythonBlock(String(artifact.originalContent || ""));
    lines.push(translated || `export const modulePurpose = ${JSON.stringify(analysis.purpose)};`);

    return {
      id: "python-literal",
      strategy: "python-literal",
      code: lines.join("\n").trim() + "\n",
      notes: ["Heuristic statement-level reconstruction; scored lower when syntax or behavior diverges."]
    };
  }

  buildContractCandidate(artifact, analysis, relationships) {
    const lines = this.header(artifact, analysis, "contract-first");
    const localImports = this.renderLocalImports(relationships.outgoing || []);
    if (localImports.length) lines.push(...localImports, "");

    lines.push(`export const moduleContract = ${JSON.stringify({
      purpose: analysis.purpose,
      behaviors: analysis.behaviors,
      sourceLanguage: analysis.language
    }, null, 2)};`, "");

    for (const symbol of analysis.symbols.filter((item) => item.exported)) {
      if (symbol.kind === "class") {
        lines.push(`export class ${symbol.name} {`);
        lines.push(`  constructor(state = {}) { this.state = { ...state }; }`);
        lines.push(`  describe() { return moduleContract; }`);
        lines.push(`}`, "");
      } else {
        const params = (symbol.params || []).join(", ");
        lines.push(`${symbol.async ? "export async function" : "export function"} ${symbol.name}(${params}) {`);
        lines.push(`  return { purpose: moduleContract.purpose, behavior: moduleContract.behaviors };`);
        lines.push(`}`, "");
      }
    }

    return {
      id: "contract-first",
      strategy: "contract-first",
      code: lines.join("\n").trim() + "\n",
      notes: ["Executable API-preserving fallback generated from the inferred contract."]
    };
  }

  buildTypeScriptErasureCandidate(artifact) {
    let code = String(artifact.originalContent || "");
    code = code
      .replace(/^\s*(?:export\s+)?interface\s+\w+(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?^\s*\}\s*;?\s*$/gm, "")
      .replace(/^\s*(?:export\s+)?type\s+\w+\s*=\s*[\s\S]*?;\s*$/gm, "")
      .replace(/\s+as\s+(?:const|[A-Za-z_$][\w$<>, .|[\]{}?]*)/g, "")
      .replace(/([A-Za-z_$][\w$]*)\??\s*:\s*[A-Za-z_$][\w$<>, .|[\]{}?]*(?=\s*[,)=;])/g, "$1")
      .replace(/\)\s*:\s*[A-Za-z_$][\w$<>, .|[\]{}?]*(?=\s*\{|\s*=>)/g, ")");

    return {
      id: "typescript-erasure",
      strategy: "typescript-erasure",
      code,
      notes: ["Type syntax removed without changing runtime statements."]
    };
  }

  rebuildPythonFunction(content, symbol) {
    const block = this.extractPythonDefinitionBlock(content, symbol.name, "def");
    if (!block.length) {
      return [
        `${symbol.async ? "export async function" : "export function"} ${symbol.name}(${(symbol.params || []).join(", ")}) {`,
        `  return undefined;`,
        `}`
      ];
    }

    const signature = block[0].match(/^\s*(async\s+)?def\s+\w+\s*\(([^)]*)\)/);
    const params = this.pythonParamsToJavaScript(signature?.[2] || "");
    const body = this.translatePythonLines(block.slice(1));
    return [
      `${signature?.[1] ? "export async function" : "export function"} ${symbol.name}(${params}) {`,
      ...(body.length ? body.map((line) => `  ${line}`) : ["  return undefined;"]),
      `}`
    ];
  }

  rebuildPythonClass(content, className) {
    const block = this.extractPythonDefinitionBlock(content, className, "class");
    const lines = [`export class ${className} {`];
    if (!block.length) return [...lines, `  constructor() {}`, `}`];

    const body = block.slice(1);
    let index = 0;
    let methodCount = 0;

    while (index < body.length) {
      const line = body[index];
      const method = line.match(/^(\s*)(async\s+def|def)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?:\s*$/);
      if (!method) {
        index += 1;
        continue;
      }

      const methodIndent = this.indentOf(line);
      const methodBlock = [line];
      index += 1;
      while (index < body.length) {
        const next = body[index];
        if (next.trim() && this.indentOf(next) <= methodIndent) break;
        methodBlock.push(next);
        index += 1;
      }

      const methodName = method[3] === "__init__" ? "constructor" : method[3];
      const params = this.pythonParamsToJavaScript(method[4], true);
      const translated = this.translatePythonLines(methodBlock.slice(1), methodIndent + 4);
      lines.push(`  ${method[2].startsWith("async") ? "async " : ""}${methodName}(${params}) {`);
      lines.push(...(translated.length ? translated.map((item) => `    ${item}`) : ["    return undefined;"]));
      lines.push(`  }`);
      methodCount += 1;
    }

    if (!methodCount) lines.push(`  constructor() {}`);
    lines.push(`}`);
    return lines;
  }

  extractPythonDefinitionBlock(content, name, kind) {
    const lines = content.split(/\r?\n/);
    const pattern = kind === "class"
      ? new RegExp(`^(\\s*)class\\s+${this.escape(name)}\\b`)
      : new RegExp(`^(\\s*)(?:async\\s+)?def\\s+${this.escape(name)}\\b`);
    const start = lines.findIndex((line) => pattern.test(line));
    if (start < 0) return [];

    const baseIndent = this.indentOf(lines[start]);
    const block = [lines[start]];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() && this.indentOf(line) <= baseIndent) break;
      block.push(line);
    }
    return block;
  }

  translatePythonBlock(content) {
    const lines = content.split(/\r?\n/);
    const output = [];
    const stack = [];

    for (const original of lines) {
      if (!original.trim()) continue;
      if (/^\s*(?:from|import)\s+/.test(original)) continue;
      if (/^\s*(?:@|#)/.test(original)) continue;
      if (/^\s*(?:["']{3})/.test(original)) continue;

      const indent = this.indentOf(original);
      while (stack.length && indent < stack[stack.length - 1]) {
        output.push(`${"  ".repeat(stack.length - 1)}}`);
        stack.pop();
      }

      const translated = this.translatePythonStatement(original.trim(), { topLevel: indent === 0 });
      if (!translated) continue;

      const level = stack.length;
      if (translated.opensBlock) {
        output.push(`${"  ".repeat(level)}${translated.code} {`);
        stack.push(indent + 4);
      } else {
        output.push(`${"  ".repeat(level)}${translated.code}`);
      }
    }

    while (stack.length) {
      output.push(`${"  ".repeat(stack.length - 1)}}`);
      stack.pop();
    }
    return output.join("\n");
  }

  translatePythonLines(lines, baseline = null) {
    const nonBlank = lines.filter((line) => line.trim());
    if (!nonBlank.length) return [];
    const base = baseline ?? Math.min(...nonBlank.map((line) => this.indentOf(line)));
    const output = [];
    const stack = [];

    for (const original of lines) {
      if (!original.trim()) continue;
      const rawIndent = this.indentOf(original);
      const indent = Math.max(0, rawIndent - base);
      while (stack.length && indent < stack[stack.length - 1]) {
        output.push(`${"  ".repeat(stack.length - 1)}}`);
        stack.pop();
      }

      const translated = this.translatePythonStatement(original.trim(), { topLevel: false });
      if (!translated) continue;
      const prefix = "  ".repeat(stack.length);
      if (translated.opensBlock) {
        output.push(`${prefix}${translated.code} {`);
        stack.push(indent + 4);
      } else {
        output.push(`${prefix}${translated.code}`);
      }
    }

    while (stack.length) {
      output.push(`${"  ".repeat(stack.length - 1)}}`);
      stack.pop();
    }
    return output;
  }

  translatePythonStatement(line, { topLevel }) {
    const def = line.match(/^(async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*(?:->\s*[^:]+)?:$/);
    if (def) {
      const prefix = topLevel ? "export " : "";
      return {
        code: `${prefix}${def[1] ? "async " : ""}function ${def[2]}(${this.pythonParamsToJavaScript(def[3])})`,
        opensBlock: true
      };
    }

    const classMatch = line.match(/^class\s+([A-Za-z_]\w*)(?:\([^)]*\))?:$/);
    if (classMatch) return { code: `${topLevel ? "export " : ""}class ${classMatch[1]}`, opensBlock: true };

    const ifMatch = line.match(/^if\s+(.+):$/);
    if (ifMatch) return { code: `if (${this.translateExpression(ifMatch[1])})`, opensBlock: true };
    const elifMatch = line.match(/^elif\s+(.+):$/);
    if (elifMatch) return { code: `else if (${this.translateExpression(elifMatch[1])})`, opensBlock: true };
    if (line === "else:") return { code: "else", opensBlock: true };

    const forMatch = line.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/);
    if (forMatch) return {
      code: `for (const ${forMatch[1]} of ${this.translateExpression(forMatch[2])})`,
      opensBlock: true
    };

    const whileMatch = line.match(/^while\s+(.+):$/);
    if (whileMatch) return { code: `while (${this.translateExpression(whileMatch[1])})`, opensBlock: true };
    if (line === "try:") return { code: "try", opensBlock: true };

    const exceptMatch = line.match(/^except(?:\s+([A-Za-z_]\w*))?(?:\s+as\s+([A-Za-z_]\w*))?:$/);
    if (exceptMatch) return { code: `catch (${exceptMatch[2] || "error"})`, opensBlock: true };
    if (line === "finally:") return { code: "finally", opensBlock: true };

    if (/^return(?:\s+|$)/.test(line)) {
      const expression = line.replace(/^return\s*/, "");
      return { code: expression ? `return ${this.translateExpression(expression)};` : "return;" };
    }

    if (/^raise\s+/.test(line)) {
      return { code: `throw ${this.translateExpression(line.replace(/^raise\s+/, ""))};` };
    }

    if (line === "pass") return { code: "return undefined;" };
    if (/^(break|continue)$/.test(line)) return { code: `${line};` };

    const assignment = line.match(/^([A-Za-z_][\w.]*)\s*([+\-*/]?=)\s*(.+)$/);
    if (assignment) {
      const left = assignment[1].replace(/^self\./, "this.");
      const declaration = !left.includes(".") && assignment[2] === "=" ? "let " : "";
      return { code: `${declaration}${left} ${assignment[2]} ${this.translateExpression(assignment[3])};` };
    }

    return { code: `${this.translateExpression(line)};` };
  }

  translateExpression(expression) {
    return String(expression)
      .replace(/\bNone\b/g, "null")
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bself\./g, "this.")
      .replace(/\blen\(([^()]+)\)/g, "$1.length")
      .replace(/\bstr\(([^()]+)\)/g, "String($1)")
      .replace(/\bint\(([^()]+)\)/g, "Number.parseInt($1, 10)")
      .replace(/\bfloat\(([^()]+)\)/g, "Number($1)")
      .replace(/\blist\(([^()]+)\)/g, "Array.from($1)")
      .replace(/\bdict\(\)/g, "{}")
      .replace(/\bset\(\)/g, "new Set()")
      .replace(/\bis\s+not\b/g, "!==")
      .replace(/\bis\b/g, "===")
      .replace(/\band\b/g, "&&")
      .replace(/\bor\b/g, "||")
      .replace(/\bnot\s+/g, "!")
      .replace(/\bprint\(/g, "console.log(");
  }

  pythonParamsToJavaScript(value, classMethod = false) {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !(classMethod && /^(self|cls)(?:\s*:.*)?$/.test(part)))
      .map((part) => part.replace(/^\*{1,2}/, "...").split(":")[0].trim())
      .map((part) => part.replace(/\s*=\s*None$/, " = null"))
      .join(", ");
  }

  renderLocalImports(edges) {
    const lines = [];
    for (const edge of edges.filter((item) => item.kind === "imports-local" && item.resolved)) {
      const target = String(edge.to).split("/").pop().replace(/\.[^.]+$/, "");
      const path = `./${target}.js`;
      const symbols = (edge.symbols || []).filter((symbol) => symbol && symbol !== "*");
      if (symbols.length) lines.push(`import { ${[...new Set(symbols)].join(", ")} } from ${JSON.stringify(path)};`);
      else lines.push(`import * as ${this.safeIdentifier(target)} from ${JSON.stringify(path)};`);
    }
    return [...new Set(lines)];
  }

  header(artifact, analysis, strategy) {
    return [
      "/**",
      ` * Rebuilt by Synthia from ${artifact.originalName}.`,
      ` * Purpose: ${analysis.purpose}`,
      ` * Strategy: ${strategy}.`,
      " */"
    ];
  }

  indentOf(line) {
    const match = String(line).match(/^[\t ]*/);
    return (match?.[0] || "").replace(/\t/g, "    ").length;
  }

  safeIdentifier(value) {
    return String(value).replace(/[^A-Za-z0-9_$]/g, "_").replace(/^(\d)/, "_$1");
  }

  escape(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

export { SemanticRebuilder };
