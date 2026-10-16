// Morph Neural Net v3 - MIR Architecture
// Source-dominant, brutally honest file regeneration engine

export type { RegenerationMode } from "./types"
export type { 
  GNNNode, 
  GNNNodeType,
  SourceChunkPayload,
  Artifact, 
  ArtifactMetadata,
  ArtifactUnderstanding,
  ArtifactRegeneration,
  MorphOperation,
  RegenerationResult,
  MIRContract,
  MIRBlueprint,
  MIRRuntime,
  MIRArtifact,
  MIRFileType,
  MIRProp,
  MIRVisualNode,
  MIRDataFlow,
  MIRApiEndpoint
} from "./types"

export { MIRAnalyzer } from "./lib/mirAnalyzer"
export { MIRRenderer } from "./lib/mirRenderer"
export { MorphMemoryEngine } from "./lib/morphMemoryEngine"
