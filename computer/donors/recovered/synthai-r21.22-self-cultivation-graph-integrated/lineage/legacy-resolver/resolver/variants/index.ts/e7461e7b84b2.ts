// Core types for the Morph Neural Net v3
// Brutally honest, index-aware, integrity-correct

// ============ GNN NODE SYSTEM ============
export type GNNNodeType =
  | "functionality"
  | "pattern"
  | "dependency"
  | "insight"
  | "reusable_component"
  | "source_chunk"
  | "file_blueprint"
  | "morph_runtime"
  | "improvement"

export interface SourceChunkPayload {
  index: number      // EXPLICIT chunk index - never sort by ID
  chunk: string      // the actual content
  start: number      // start position in original
  end: number        // end position in original
}

export interface GNNNode {
  id: string
  nodeType: GNNNodeType
  content: string    // For source_chunk: JSON.stringify(SourceChunkPayload)
  sourceArtifact: string
  weight: number
  usageCount: number
  connections: string[]
  createdAt: string
  lastUsedAt?: string
}

// ============ ARTIFACT SYSTEM ============
export interface ArtifactMetadata {
  fileType: string
  size: number
  uploadedAt: string
  status: "uploaded" | "analyzed" | "understood" | "remembered" | "regenerated"
  tags?: string[]
}

export interface ArtifactUnderstanding {
  intent: string
  functionality: string[]
  dependencies: string[]
  patterns: string[]
  complexity: number
  keyInsights: string[]
  reusableComponents: string[]
}

export interface ArtifactRegeneration {
  generatedCode: string
  architecture: string
  confidence: number
  improvements: string[]
  gnnNodes: string[]
  generatedAt: string
  mode: RegenerationMode
  missing: string[]
}

export interface Artifact {
  id: string
  originalName: string
  originalContent: string
  understanding?: ArtifactUnderstanding
  regeneration?: ArtifactRegeneration
  metadata: ArtifactMetadata
}

// ============ MIR SYSTEM ============
export type MIRFileType = "tsx" | "ts" | "js" | "jsx" | "py" | "json" | "css" | "md" | "unknown"

export interface MIRProp {
  name: string
  type: string
  required: boolean
  default?: any
  description?: string
}

export interface MIRVisualNode {
  element: string
  children?: MIRVisualNode[]
  text?: string
  props?: Record<string, string>
  condition?: string
  loop?: string
}

export interface MIRDataFlow {
  from: string
  to: string
  type: "prop" | "state" | "event" | "api"
  transform?: string
}

export interface MIRApiEndpoint {
  method: string
  path: string
  params?: string[]
  returns?: string
}

export interface MIRContract {
  fileType: MIRFileType
  exports: string[]
  imports: string[]
  dependencies: string[]
  props?: MIRProp[]
  behavior: string[]
  visualStructure?: MIRVisualNode[]
  dataFlow?: MIRDataFlow[]
  stateShape?: Record<string, string>
  apiSurface?: MIRApiEndpoint[]
}

export interface MIRBlueprint {
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  hasJsx: boolean
  fileRole: string
  chunkCount: number
  totalLength: number
}

export interface MIRRuntime {
  sourceType: MIRFileType
  confidence: number
  contract: MIRContract
  blueprint: MIRBlueprint
  runtimeEquivalent: string
  missing: string[]
  renderer?: string
  specName: string
  integrity: number
  isIdentical: boolean  // BRUTAL: true ONLY when byte-identical
}

export interface MIRArtifact {
  id: string
  originalName: string
  mir: MIRRuntime
  canReconstructOriginal: boolean
}

export type RegenerationMode = "exact" | "equivalent" | "morph_runtime" | "improved"

// ============ OPERATIONS ============
export interface MorphOperation {
  id: string
  type: "analyze" | "remember" | "regenerate" | "recall" | "improvise"
  artifactId: string
  status: "pending" | "complete" | "error"
  message: string
  result?: string
  startedAt: string
  completedAt?: string
}

// ============ REGENERATION RESULT ============
// BRUTALLY HONEST - no lying with good posture
export interface RegenerationResult {
  code: string
  confidence: number
  modeUsed: RegenerationMode
  missing: string[]
  integrity: number      // reconstructed.length / original.length
  isExact: boolean       // TRUE ONLY when byte-identical to original
  isIdentical: boolean   // alias for clarity
  chunkCount: number
  reconstructedLength: number
  originalLength: number
}
