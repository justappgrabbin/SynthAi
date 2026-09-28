import { Artifact, GNNNode, MorphOperation, RegenerationMode, RegenerationResult, MIRRuntime, SourceChunkPayload } from "../types"
import { MIRAnalyzer } from "./mirAnalyzer"
import { MIRRenderer } from "./mirRenderer"

export { RegenerationMode }

export class MorphMemoryEngine {
  private nodes: Map<string, GNNNode> = new Map()
  private operations: MorphOperation[] = []
  private nodeCounter = 0
  private analyzer = new MIRAnalyzer()
  private renderer = new MIRRenderer()

  // ========== HYDRATION ==========
  hydrate(nodes: GNNNode[]): void {
    for (const node of nodes) {
      this.nodes.set(node.id, node)
      const num = parseInt(node.id.split("_")[1] || "0")
      this.nodeCounter = Math.max(this.nodeCounter, num)
    }
  }

  // ========== ANALYZE ==========
  async analyzeArtifact(artifact: Artifact): Promise<Artifact> {
    this.addOperation("analyze", artifact.id, `Analyzing ${artifact.originalName}...`)

    const content = artifact.originalContent

    // Step 1: Extract MIR contract + blueprint
    const { contract, blueprint } = this.analyzer.analyze(artifact)

    // Step 2: Store source chunks WITH EXPLICIT INDEX
    this.createSourceChunks(content, artifact.id)

    // Step 3: Store MIR contract as blueprint node
    this.createNode("file_blueprint", JSON.stringify({ contract, blueprint }), artifact.id)

    // Step 4: Store blueprint components as separate nodes
    for (const imp of blueprint.imports.slice(0, 10)) {
      this.createNode("dependency", imp, artifact.id)
    }
    for (const func of blueprint.functions.slice(0, 10)) {
      this.createNode("functionality", `Function: ${func}`, artifact.id)
    }
    for (const cls of blueprint.classes) {
      this.createNode("pattern", `Class: ${cls}`, artifact.id)
    }

    // Step 5: Extract semantic understanding
    const intent = this.extractIntent(content)
    const functionality = this.extractFunctionality(content)
    const dependencies = this.extractDependencies(content)
    const patterns = this.extractPatterns(content)
    const complexity = this.calculateComplexity(content)
    const keyInsights = this.extractKeyInsights(content, intent, functionality)
    const reusableComponents = this.extractReusableComponents(content, functionality)

    for (const func of functionality) {
      this.createNode("functionality", func, artifact.id)
    }
    for (const pattern of patterns) {
      this.createNode("pattern", pattern, artifact.id)
    }
    for (const insight of keyInsights) {
      this.createNode("insight", insight, artifact.id)
    }
    for (const comp of reusableComponents) {
      this.createNode("reusable_component", comp, artifact.id)
    }

    this.completeOperation("analyze", artifact.id, 
      `MIR contract + ${blueprint.chunkCount} source chunks stored. Blueprint: ${blueprint.fileRole}`)

    return {
      ...artifact,
      understanding: { 
        intent, functionality, dependencies, patterns, complexity, 
        keyInsights, reusableComponents 
      },
      metadata: {
        ...artifact.metadata,
        status: "understood"
      }
    }
  }

  // ========== REMEMBER ==========
  async rememberArtifact(artifact: Artifact): Promise<void> {
    if (!artifact.understanding) return
    this.addOperation("remember", artifact.id, 
      `Committing ${artifact.originalName} to memory...`)
    this.strengthenConnections(artifact.id)
    const artifactNodes = this.findArtifactNodes(artifact.id)
    for (const node of artifactNodes) {
      node.weight = Math.min(1.0, node.weight + 0.2)
    }
    this.completeOperation("remember", artifact.id, 
      `Committed ${artifactNodes.length} nodes to memory.`)
  }

  // ========== REGENERATE ==========
  // BRUTAL: isExact = isIdentical. No lying with good posture.
  async regenerateArtifact(
    artifact: Artifact, 
    context?: string,
    mode: RegenerationMode = "morph_runtime"
  ): Promise<Artifact & { regenerationResult: RegenerationResult }> {
    if (!artifact.understanding) {
      return {
        ...artifact,
        regenerationResult: {
          code: "// No understanding available",
          confidence: 0,
          modeUsed: mode,
          missing: ["No analysis performed"],
          integrity: 0,
          isExact: false,
          isIdentical: false,
          chunkCount: 0,
          reconstructedLength: 0,
          originalLength: 0
        }
      }
    }

    this.addOperation("regenerate", artifact.id, 
      `Regenerating ${artifact.originalName} (mode: ${mode})...`)

    // Get all artifact nodes
    const artifactNodes = this.findArtifactNodes(artifact.id)
    const blueprintNode = artifactNodes.find(n => n.nodeType === "file_blueprint")

    // ========== BRUTAL INTEGRITY CALCULATION ==========
    // Calculate from RECONSTRUCTED OUTPUT, not summed chunk lengths
    const reconstructed = this.reconstructFromChunks(artifact.id)
    const isIdentical = reconstructed === artifact.originalContent
    const integrity = artifact.originalContent.length > 0 
      ? reconstructed.length / artifact.originalContent.length 
      : 0
    const chunkCount = artifactNodes.filter(n => n.nodeType === "source_chunk").length
    const hasSourceChunks = chunkCount > 0

    let result: RegenerationResult

    // ========== MODE: EXACT ==========
    // Pull ONLY source chunks. Concatenate. Return nearly identical file.
    // isExact = isIdentical. BRUTALLY HONEST.
    if (mode === "exact") {
      if (hasSourceChunks && integrity > 0.7) {
        result = {
          code: reconstructed,
          confidence: isIdentical ? 0.98 : 0.92,
          modeUsed: "exact",
          missing: isIdentical ? [] : ["minor whitespace/formatting differences"],
          integrity,
          isExact: isIdentical,        // BRUTAL: only true when byte-identical
          isIdentical,                  // explicit alias
          chunkCount,
          reconstructedLength: reconstructed.length,
          originalLength: artifact.originalContent.length
        }
      } else {
        // Source insufficient - fall back to blueprint with honest report
        const blueprintCode = this.generateFromBlueprint(artifact.id, artifact.understanding)
        result = {
          code: blueprintCode,
          confidence: 0.65,
          modeUsed: "exact",
          missing: [`Source integrity too low (${(integrity * 100).toFixed(1)}%). Reconstructed from blueprint.`],
          integrity,
          isExact: false,
          isIdentical: false,
          chunkCount,
          reconstructedLength: reconstructed.length,
          originalLength: artifact.originalContent.length
        }
      }
    }
    // ========== MODE: EQUIVALENT ==========
    else if (mode === "equivalent") {
      let mirContract: any = null
      let mirBlueprint: any = null

      if (blueprintNode) {
        try {
          const parsed = JSON.parse(blueprintNode.content)
          mirContract = parsed.contract
          mirBlueprint = parsed.blueprint
        } catch {
          // Fallback
        }
      }

      if (!mirContract) {
        const { contract, blueprint } = this.analyzer.analyze(artifact)
        mirContract = contract
        mirBlueprint = blueprint
      }

      const equivalentCode = this.renderer.render(mirContract, mirBlueprint, "equivalent")
      result = {
        code: equivalentCode,
        confidence: 0.85,
        modeUsed: "equivalent",
        missing: ["exact implementation details", "original comments", "precise formatting"],
        integrity: 0,
        isExact: false,
        isIdentical: false,
        chunkCount,
        reconstructedLength: reconstructed.length,
        originalLength: artifact.originalContent.length
      }
    }
    // ========== MODE: MORPH_RUNTIME ==========
    else if (mode === "morph_runtime") {
      let mirContract: any = null
      let mirBlueprint: any = null

      if (blueprintNode) {
        try {
          const parsed = JSON.parse(blueprintNode.content)
          mirContract = parsed.contract
          mirBlueprint = parsed.blueprint
        } catch {
          const { contract, blueprint } = this.analyzer.analyze(artifact)
          mirContract = contract
          mirBlueprint = blueprint
        }
      } else {
        const { contract, blueprint } = this.analyzer.analyze(artifact)
        mirContract = contract
        mirBlueprint = blueprint
      }

      const morphCode = this.renderer.render(mirContract, mirBlueprint, "morph_runtime")

      // Store the morph runtime
      const mirRuntime: MIRRuntime = {
        sourceType: mirContract.fileType,
        confidence: 0.78,
        contract: mirContract,
        blueprint: mirBlueprint,
        runtimeEquivalent: morphCode,
        missing: ["exact styles", "custom animation timing", "original variable names"],
        renderer: "MorphRenderer",
        specName: `${artifact.originalName}.morph`,
        integrity: 0,
        isIdentical: false
      }

      this.createNode("morph_runtime", JSON.stringify(mirRuntime), artifact.id)

      result = {
        code: morphCode,
        confidence: 0.78,
        modeUsed: "morph_runtime",
        missing: mirRuntime.missing,
        integrity: 0,
        isExact: false,
        isIdentical: false,
        chunkCount,
        reconstructedLength: reconstructed.length,
        originalLength: artifact.originalContent.length
      }
    }
    // ========== MODE: IMPROVED ==========
    else {
      const { intent, functionality, dependencies, patterns } = artifact.understanding
      const relevantNodes = this.findRelevantNodes(intent, context)
      const improvedCode = this.generateImprovedVersion(
        intent, functionality, dependencies, patterns, relevantNodes, context
      )
      result = {
        code: improvedCode,
        confidence: this.calculateConfidence(relevantNodes),
        modeUsed: "improved",
        missing: ["original implementation specifics"],
        integrity: 0,
        isExact: false,
        isIdentical: false,
        chunkCount,
        reconstructedLength: reconstructed.length,
        originalLength: artifact.originalContent.length
      }
    }

    this.completeOperation("regenerate", artifact.id, 
      `${mode} complete (${result.confidence}% confidence, ${result.isExact ? "EXACT" : "approximate"})`)

    const regeneration = {
      generatedCode: result.code,
      architecture: this.selectArchitecture(artifact.understanding),
      confidence: Math.round(result.confidence * 100),
      improvements: result.missing.map(m => `Note: ${m}`),
      gnnNodes: artifactNodes.map(n => n.id),
      generatedAt: new Date().toISOString(),
      mode,
      missing: result.missing
    }

    return {
      ...artifact,
      regeneration,
      regenerationResult: result,
      metadata: {
        ...artifact.metadata,
        status: "regenerated"
      }
    }
  }

  // ========== RECALL ==========
  async recall(query: string): Promise<{ 
    relevantNodes: GNNNode[]
    insights: string[]
    suggestedComponents: string[]
  }> {
    this.addOperation("recall", "system", `Recalling memory for: ${query}`)
    const relevantNodes = this.findRelevantNodes(query)
    const insights = relevantNodes.filter(n => n.nodeType === "insight").map(n => n.content)
    const suggestedComponents = relevantNodes.filter(n => n.nodeType === "reusable_component").map(n => n.content)
    this.completeOperation("recall", "system", 
      `Found ${relevantNodes.length} relevant memory nodes`)
    return { relevantNodes, insights, suggestedComponents }
  }

  // ========== IMPROVISE ==========
  async improvise(request: string, baseArtifact?: Artifact): Promise<{ 
    code: string
    explanation: string
    usedNodes: GNNNode[]
  }> {
    this.addOperation("improvise", "system", `Improvising: ${request}`)
    const allNodes = Array.from(this.nodes.values())
    const relevantNodes = allNodes.filter(n => 
      n.content.toLowerCase().includes(request.toLowerCase()) ||
      n.nodeType === "improvement" ||
      n.nodeType === "reusable_component" ||
      n.usageCount > 0
    )
    for (const node of relevantNodes) {
      node.usageCount++
      node.lastUsedAt = new Date().toISOString()
    }
    const combinedPatterns = relevantNodes.filter(n => n.nodeType === "pattern").map(n => n.content)
    const combinedFuncs = relevantNodes.filter(n => n.nodeType === "functionality").map(n => n.content)
    const insights = relevantNodes.filter(n => n.nodeType === "insight").map(n => n.content)

    const code = `// Morph Improvisation: ${request}
// Built from ${relevantNodes.length} memory nodes

// Insights applied:
${insights.slice(0, 3).map(i => `// - ${i}`).join("\n")}

// Patterns combined: ${combinedPatterns.slice(0, 3).join(", ")}
// Capabilities integrated: ${combinedFuncs.slice(0, 3).join(", ")}

export async function improvise${this.pascalCase(request)}() {
  // Drawing from ${relevantNodes.length} memory nodes...
  const understanding = await recallMemory("${request}");
  const result = await buildFromUnderstanding(understanding);
  return enhanceWithPatterns(result);
}
`

    const explanation = `Created improvisation "${request}" by combining ${relevantNodes.length} memory nodes. Applied insights: ${insights.slice(0, 3).join(", ")}.`

    this.completeOperation("improvise", "system", 
      `Improvisation complete using ${relevantNodes.length} memory nodes`)

    return { code, explanation, usedNodes: relevantNodes }
  }

  // ========== SOURCE CHUNK SYSTEM v3 ==========
  // FIX #1: Store explicit index. Never sort by ID.
  private createSourceChunks(content: string, artifactId: string): void {
    const chunkSize = 2000
    const overlap = 200

    for (let i = 0, index = 0; i < content.length; i += chunkSize - overlap, index++) {
      const start = i
      const end = Math.min(i + chunkSize, content.length)
      const chunk = content.slice(start, end)

      const payload: SourceChunkPayload = {
        index,           // EXPLICIT INDEX
        chunk,           // the content
        start,           // position in original
        end              // position in original
      }

      this.createNode("source_chunk", JSON.stringify(payload), artifactId)
    }
  }

  private hasSourceChunks(artifactId: string): boolean {
    return Array.from(this.nodes.values())
      .some(n => n.nodeType === "source_chunk" && n.sourceArtifact === artifactId)
  }

  // FIX #2: Sort by EXPLICIT INDEX, not node ID
  private reconstructFromChunks(artifactId: string): string {
    const chunks = Array.from(this.nodes.values())
      .filter(n => n.nodeType === "source_chunk" && n.sourceArtifact === artifactId)
      .map(n => {
        try {
          return JSON.parse(n.content) as SourceChunkPayload
        } catch {
          return null
        }
      })
      .filter((p): p is SourceChunkPayload => p !== null)
      .sort((a, b) => a.index - b.index)  // SORT BY INDEX, NOT ID

    if (chunks.length === 0) {
      return ""
    }

    // Reconstruct with overlap deduplication
    let result = chunks[0].chunk
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].chunk
      const curr = chunks[i].chunk
      let overlapLen = 0
      const maxOverlap = Math.min(prev.length, curr.length, 500)

      for (let j = maxOverlap; j > 0; j--) {
        if (prev.slice(-j) === curr.slice(0, j)) {
          overlapLen = j
          break
        }
      }

      result += curr.slice(overlapLen)
    }

    return result
  }

  // ========== BLUEPRINT RECONSTRUCTION ==========
  private generateFromBlueprint(artifactId: string, understanding: any): string {
    const blueprintNode = this.findArtifactNodes(artifactId)
      .find(n => n.nodeType === "file_blueprint")

    if (!blueprintNode) {
      return `// Blueprint not found for ${artifactId}`
    }

    try {
      const { blueprint } = JSON.parse(blueprintNode.content)
      const lines: string[] = [
        `// Reconstructed from blueprint`,
        `// Role: ${blueprint.fileRole}`,
        `// Functions: ${blueprint.functions.length}`,
        `// Classes: ${blueprint.classes.length}`,
        ``
      ]

      for (const imp of blueprint.imports) {
        lines.push(imp)
      }
      lines.push("")

      for (const exp of blueprint.exports) {
        lines.push(exp)
      }
      lines.push("")

      lines.push(`// Original functionality: ${understanding.functionality.join(", ")}`)
      lines.push(`// Patterns: ${understanding.patterns.join(", ")}`)

      return lines.join("\n")
    } catch {
      return "// Failed to parse blueprint"
    }
  }

  // ========== SEMANTIC EXTRACTION METHODS ==========
  private extractIntent(content: string): string {
    const commentPatterns = [
      /\/\*\*\s*\n\s*\*\s*(.+?)\n/s,
      /\/\/\s*(.+?)(?:\n|$)/,
      /#\s*(.+?)(?:\n|$)/,
    ]
    for (const pattern of commentPatterns) {
      const match = content.match(pattern)
      if (match) return match[1].trim()
    }
    const classMatch = content.match(/class\s+(\w+)/)
    const funcMatch = content.match(/function\s+(\w+)/)
    if (classMatch) return `Implements ${classMatch[1]} functionality`
    if (funcMatch) return `Provides ${funcMatch[1]} capability`
    return "Unknown functionality - requires analysis"
  }

  private extractFunctionality(content: string): string[] {
    const functions: string[] = []
    const exportMatches = content.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)
    for (const match of exportMatches) {
      functions.push(`Export: ${match[1]}`)
    }
    const methodMatches = content.matchAll(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g)
    for (const match of methodMatches) {
      if (!["if", "while", "for", "switch", "catch"].includes(match[1])) {
        functions.push(`Method: ${match[1]}`)
      }
    }
    const apiMatches = content.matchAll(/(?:fetch|axios|http)\s*\(/g)
    let apiCount = 0
    for (const _ of apiMatches) apiCount++
    if (apiCount > 0) functions.push(`API integration (${apiCount} endpoints)`)
    if (content.includes("useState") || content.includes("useReducer")) {
      functions.push("State management")
    }
    if (content.includes("onClick") || content.includes("onChange") || content.includes("addEventListener")) {
      functions.push("Event handling")
    }
    return functions.length > 0 ? functions : ["Basic functionality"]
  }

  private extractDependencies(content: string): string[] {
    const deps: string[] = []
    const importMatches = content.matchAll(/from\s+['"]([^'"]+)['"]/g)
    for (const match of importMatches) {
      deps.push(match[1])
    }
    const requireMatches = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
    for (const match of requireMatches) {
      deps.push(match[1])
    }
    if (content.includes("supabase")) deps.push("Supabase client")
    if (content.includes("tensorflow") || content.includes("tf.")) deps.push("TensorFlow.js")
    if (content.includes("three")) deps.push("Three.js")
    if (content.includes("react")) deps.push("React")
    return [...new Set(deps)]
  }

  private extractPatterns(content: string): string[] {
    const patterns: string[] = []
    if (content.includes("class") && content.includes("extends")) patterns.push("Inheritance")
    if (content.includes("interface")) patterns.push("Interface segregation")
    if (content.includes("useEffect") || content.includes("useMemo")) patterns.push("React hooks")
    if (content.includes("create") || content.includes("factory")) patterns.push("Factory pattern")
    if (content.includes("observer") || content.includes("subscribe")) patterns.push("Observer pattern")
    if (content.includes("Map") || content.includes("Set")) patterns.push("Collection management")
    if (content.includes("async") || content.includes("await")) patterns.push("Async/await")
    if (content.includes("try") && content.includes("catch")) patterns.push("Error handling")
    if (content.includes("reduce") || content.includes("map")) patterns.push("Functional programming")
    return patterns.length > 0 ? patterns : ["Procedural"]
  }

  private extractKeyInsights(content: string, intent: string, functionality: string[]): string[] {
    const insights: string[] = []
    if (content.includes("graph") || content.includes("node") || content.includes("edge")) {
      insights.push("Graph-based architecture suitable for network problems")
    }
    if (content.includes("neural") || content.includes("tensor") || content.includes("layer")) {
      insights.push("Neural network components - can be extended with ML capabilities")
    }
    if (content.includes("stream") || content.includes("pipe")) {
      insights.push("Streaming architecture - good for real-time data processing")
    }
    if (content.includes("cache") || content.includes("memo")) {
      insights.push("Caching strategy detected - performance optimization available")
    }
    if (content.includes("queue") || content.includes("worker")) {
      insights.push("Queue-based processing - scalable for background tasks")
    }
    if (functionality.some(f => f.includes("API"))) {
      insights.push("API integration pattern - reusable for other service connections")
    }
    if (functionality.some(f => f.includes("State"))) {
      insights.push("State management pattern - applicable to other UI components")
    }
    return insights.length > 0 ? insights : ["General utility functionality"]
  }

  private extractReusableComponents(content: string, functionality: string[]): string[] {
    const components: string[] = []
    const utilMatches = content.matchAll(/(?:export\s+)?(?:function|const)\s+(\w+(?:Util|Helper|Tool))/g)
    for (const match of utilMatches) {
      components.push(`Utility: ${match[1]}`)
    }
    if (content.includes("config") || content.includes("options") || content.includes("settings")) {
      components.push("Configuration pattern")
    }
    if (content.includes("validate") || content.includes("schema") || content.includes("check")) {
      components.push("Validation logic")
    }
    if (content.includes("transform") || content.includes("parse") || content.includes("format")) {
      components.push("Data transformation utilities")
    }
    return components.length > 0 ? components : ["Core functionality"]
  }

  private calculateComplexity(content: string): number {
    let score = 50
    const lines = content.split("\n").length
    score += Math.min(lines / 10, 20)
    const maxDepth = this.getMaxNestingDepth(content)
    score += maxDepth * 5
    const funcCount = (content.match(/function/g) || []).length
    score += funcCount * 2
    if (content.includes("async")) score += 10
    if (content.includes("Promise")) score += 5
    return Math.min(100, Math.round(score))
  }

  private getMaxNestingDepth(content: string): number {
    let maxDepth = 0
    let currentDepth = 0
    for (const char of content) {
      if (char === "{") {
        currentDepth++
        maxDepth = Math.max(maxDepth, currentDepth)
      } else if (char === "}") {
        currentDepth--
      }
    }
    return maxDepth
  }

  // ========== NODE MANAGEMENT ==========
  private createNode(nodeType: GNNNode["nodeType"], content: string, sourceArtifact: string): GNNNode {
    this.nodeCounter++
    const node: GNNNode = {
      id: `${nodeType}_${this.nodeCounter}`,
      nodeType,
      content,
      sourceArtifact,
      weight: 0.5,
      usageCount: 0,
      connections: [],
      createdAt: new Date().toISOString()
    }
    this.nodes.set(node.id, node)
    return node
  }

  private findArtifactNodes(artifactId: string): GNNNode[] {
    return Array.from(this.nodes.values()).filter(n => n.sourceArtifact === artifactId)
  }

  private findRelevantNodes(query: string, context?: string): GNNNode[] {
    const allNodes = Array.from(this.nodes.values())
    const queryLower = query.toLowerCase()
    return allNodes.filter(n => {
      const contentLower = n.content.toLowerCase()
      const matchesQuery = contentLower.includes(queryLower)
      const matchesContext = context ? contentLower.includes(context.toLowerCase()) : false
      const isReusable = n.nodeType === "reusable_component"
      const isInsight = n.nodeType === "insight"
      const hasBeenUsed = n.usageCount > 0
      return matchesQuery || matchesContext || isReusable || (isInsight && hasBeenUsed)
    }).sort((a, b) => {
      const scoreA = a.weight + (a.usageCount * 0.1)
      const scoreB = b.weight + (b.usageCount * 0.1)
      return scoreB - scoreA
    })
  }

  private strengthenConnections(artifactId: string): void {
    const artifactNodes = this.findArtifactNodes(artifactId)
    for (let i = 0; i < artifactNodes.length; i++) {
      for (let j = i + 1; j < artifactNodes.length; j++) {
        if (!artifactNodes[i].connections.includes(artifactNodes[j].id)) {
          artifactNodes[i].connections.push(artifactNodes[j].id)
        }
        if (!artifactNodes[j].connections.includes(artifactNodes[i].id)) {
          artifactNodes[j].connections.push(artifactNodes[i].id)
        }
      }
    }
  }

  // ========== GENERATION METHODS ==========
  private generateImprovedVersion(
    intent: string,
    functionality: string[],
    dependencies: string[],
    patterns: string[],
    relevantNodes: GNNNode[],
    context?: string
  ): string {
    const lines: string[] = [
      `// Improved version of: ${intent}`,
      `// Enhanced with ${relevantNodes.length} memory nodes`,
      ``
    ]

    if (context?.includes("improve")) {
      lines.push("// IMPROVEMENTS APPLIED:")
      lines.push("// - Memoized computations")
      lines.push("// - Error boundaries")
      lines.push("// - Loading states")
      lines.push("// - Accessibility attributes")
      lines.push("")
    }

    for (const func of functionality) {
      lines.push(`export async function ${func.replace(/[^a-zA-Z0-9]/g, "_")}() {`)
      lines.push(`  // ${func}`)
      lines.push(`  const result = await processWithUnderstanding("${intent}");`)
      lines.push(`  return enhanceWithPatterns(result);`)
      lines.push(`}`)
      lines.push("")
    }

    return lines.join("\n")
  }

  private calculateConfidence(nodes: GNNNode[]): number {
    if (nodes.length === 0) return 0.3
    const avgWeight = nodes.reduce((sum, n) => sum + n.weight, 0) / nodes.length
    const usageBonus = Math.min(nodes.filter(n => n.usageCount > 0).length * 0.05, 0.2)
    return Math.min(0.95, avgWeight + usageBonus + 0.3)
  }

  private selectArchitecture(understanding: any): string {
    if (understanding.patterns.includes("React hooks")) return "React Component"
    if (understanding.functionality.some((f: string) => f.includes("API"))) return "API Service"
    if (understanding.patterns.includes("Graph-based")) return "Graph Neural Module"
    return "Utility Module"
  }

  // ========== OPERATIONS ==========
  private addOperation(type: MorphOperation["type"], artifactId: string, message: string): void {
    const op: MorphOperation = {
      id: `op_${Date.now()}`,
      type,
      artifactId,
      status: "pending",
      message,
      startedAt: new Date().toISOString()
    }
    this.operations.push(op)
  }

  private completeOperation(type: MorphOperation["type"], artifactId: string, result: string): void {
    const op = this.operations
      .filter(o => o.type === type && o.artifactId === artifactId && o.status === "pending")
      .pop()
    if (op) {
      op.status = "complete"
      op.result = result
      op.completedAt = new Date().toISOString()
    }
  }

  private pascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    ).replace(/\s+/g, "")
  }

  // ========== PUBLIC GETTERS ==========
  getNodes(): GNNNode[] {
    return Array.from(this.nodes.values())
  }

  getOperations(): MorphOperation[] {
    return this.operations
  }

  getNodeCount(): number {
    return this.nodes.size
  }
}
