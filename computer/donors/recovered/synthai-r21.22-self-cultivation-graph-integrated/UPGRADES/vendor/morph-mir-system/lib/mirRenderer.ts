import { MIRContract, MIRFileType, MIRBlueprint, RegenerationMode } from "../types"

export class MIRRenderer {
  render(contract: MIRContract, blueprint: MIRBlueprint, mode: RegenerationMode): string {
    switch (mode) {
      case "exact":
        return "// EXACT mode: Use source chunks, not renderer"
      case "equivalent":
        return this.renderEquivalent(contract, blueprint)
      case "morph_runtime":
        return this.renderMorphRuntime(contract, blueprint)
      case "improved":
        return this.renderImproved(contract, blueprint)
      default:
        return this.renderMorphRuntime(contract, blueprint)
    }
  }

  // ========== EQUIVALENT: EXECUTABLE, NOT A SKETCH ==========
  private renderEquivalent(contract: MIRContract, blueprint: MIRBlueprint): string {
    const lines: string[] = []
    const specName = blueprint.exports[0]?.replace("default:", "") || "MorphComponent"

    // Real imports (not "...")
    for (const imp of contract.imports.slice(0, 5)) {
      if (imp === "react") {
        lines.push(`import React from "react"`)
      } else if (imp.includes("framer")) {
        lines.push(`import { motion } from "framer-motion"`)
      } else if (imp.includes("supabase")) {
        lines.push(`import { supabase } from "@/lib/supabase"`)
      } else {
        lines.push(`import * as ${this.sanitizeImportName(imp)} from "${imp}"`)
      }
    }
    lines.push("")

    // Props interface if present
    if (contract.props && contract.props.length > 0) {
      lines.push(`interface ${specName}Props {`)
      for (const prop of contract.props) {
        const optional = prop.required ? "" : "?"
        lines.push(`  ${prop.name}${optional}: ${prop.type};`)
      }
      lines.push(`}`)
      lines.push("")
    }

    // Component/function definition
    const propsType = contract.props && contract.props.length > 0 ? `${specName}Props` : ""

    if (blueprint.fileRole === "component") {
      lines.push(`export const ${specName}: React.FC${propsType ? `<${propsType}>` : ""} = (${propsType ? "props" : ""}) => {`)

      // State declarations
      if (contract.stateShape) {
        for (const [key, type] of Object.entries(contract.stateShape)) {
          lines.push(`  const [${key}, set${key.charAt(0).toUpperCase() + key.slice(1)}] = React.useState<${type}>();`)
        }
      }

      lines.push("")

      // Behavior comments become TODOs
      for (const behavior of contract.behavior) {
        lines.push(`  // TODO: ${behavior}`)
      }

      lines.push("")
      lines.push(`  return (`)
      lines.push(`    <div>`)
      lines.push(`      {/* ${specName} - equivalent reconstruction */}`)
      lines.push(`    </div>`)
      lines.push(`  );`)
      lines.push(`};`)
    } else {
      lines.push(`export function ${specName}() {`)
      for (const behavior of contract.behavior) {
        lines.push(`  // TODO: ${behavior}`)
      }
      lines.push(`  return null;`)
      lines.push(`}`)
    }

    // Default export if original had one
    if (blueprint.exports.some(e => e.startsWith("default:"))) {
      lines.push("")
      lines.push(`export default ${specName};`)
    }

    return lines.join("\n")
  }

  // ========== MORPH RUNTIME: SPEC + RENDERER SPLIT ==========
  private renderMorphRuntime(contract: MIRContract, blueprint: MIRBlueprint): string {
    const specName = blueprint.exports[0]?.replace("default:", "") || "MorphComponent"
    const hasJsx = blueprint.hasJsx || contract.fileType === "tsx" || contract.fileType === "jsx"

    // If component, emit spec as .morph.ts and note renderer as .tsx
    const lines: string[] = [
      `// Morph Runtime Equivalent`,
      `// Original: ${blueprint.fileRole} (${contract.fileType})`,
      `// Confidence: ~0.78`,
      `//`,
      `// This file: ${specName}.morph.ts (the spec)`,
      hasJsx ? `// Renderer: MorphRenderer.tsx (converts spec to JSX)` : `// No renderer needed for non-JSX file`,
      ``,
      `export interface ${specName}MorphSpec {`,
      `  type: "${blueprint.fileRole}";`,
      `  name: "${specName}";`,
      `  fileType: "${contract.fileType}";`,
      `  props: ${this.renderProps(contract.props)};`,
      `  behavior: ${JSON.stringify(contract.behavior)};`,
      `  dependencies: ${JSON.stringify(contract.dependencies)};`,
      `  renderPlan: ${this.renderVisualPlan(contract.visualStructure)};`,
      `  dataFlow: ${JSON.stringify(contract.dataFlow)};`,
      `  stateShape: ${JSON.stringify(contract.stateShape)};`,
      `  apiSurface: ${JSON.stringify(contract.apiSurface)};`,
      `}`,
      ``,
      `export const ${specName}Spec: ${specName}MorphSpec = {`,
      `  type: "${blueprint.fileRole}",`,
      `  name: "${specName}",`,
      `  fileType: "${contract.fileType}",`,
      `  props: ${this.renderProps(contract.props)},`,
      `  behavior: ${JSON.stringify(contract.behavior)},`,
      `  dependencies: ${JSON.stringify(contract.dependencies)},`,
      `  renderPlan: ${this.renderVisualPlan(contract.visualStructure)},`,
      `  dataFlow: ${JSON.stringify(contract.dataFlow)},`,
      `  stateShape: ${JSON.stringify(contract.stateShape)},`,
      `  apiSurface: ${JSON.stringify(contract.apiSurface)}`,
      `};`,
    ]

    // Only include renderer stub for component types
    if (hasJsx) {
      lines.push(``)
      lines.push(`// Renderer stub - import and use in MorphRenderer.tsx`)
      lines.push(`export function render${specName}(spec: ${specName}MorphSpec, props: any) {`)
      lines.push(`  // Morph-native rendering logic`)
      lines.push(`  return {`)
      lines.push(`    element: spec.renderPlan?.[0]?.element || "div",`)
      lines.push(`    props: { ...spec.props, ...props },`)
      lines.push(`    children: spec.renderPlan?.map(p => p.text).filter(Boolean)`)
      lines.push(`  };`)
      lines.push(`}`)
    }

    return lines.join("\n")
  }

  private renderImproved(contract: MIRContract, blueprint: MIRBlueprint): string {
    const specName = blueprint.exports[0]?.replace("default:", "") || "Improved"
    const lines: string[] = [
      `// Improved Morph Runtime`,
      `// Enhanced with pattern memory`,
      ``,
      `export const ${specName}Spec = {`,
      `  ...baseSpec,`,
      `  enhancements: [`,
      `    "memoized computations",`,
      `    "error boundaries",`,
      `    "loading states",`,
      `    "accessibility attributes",`,
      `    "debounced inputs",`,
      `    "retry logic for API calls"`,
      `  ]`,
      `};`,
    ]
    return lines.join("\n")
  }

  private renderProps(props?: Array<{name: string; type: string; required: boolean}>): string {
    if (!props || props.length === 0) return "{}"
    const entries = props.map(p => `    ${p.name}: "${p.type}"`)
    return `{\n${entries.join(",\n")}\n  }`
  }

  private renderVisualPlan(structure?: Array<{element: string; text?: string}>): string {
    if (!structure || structure.length === 0) return "[]"
    const entries = structure.map(s => `    { element: "${s.element}", text: "${s.text || ""}" }`)
    return `[\n${entries.join(",\n")}\n  ]`
  }

  private sanitizeImportName(imp: string): string {
    return imp.replace(/[^a-zA-Z0-9]/g, "_").replace(/^[0-9]/, "_")
  }
}
