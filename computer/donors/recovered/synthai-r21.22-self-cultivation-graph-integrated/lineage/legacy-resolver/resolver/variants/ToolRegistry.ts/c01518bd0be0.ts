import { CapabilityRegistry } from './CapabilityRegistry';
import { KleinToolAdapter, ChannelExpression, ToolExecutionContext, ToolExecutionResult } from './foundations';

export class ToolRegistry {
  private tools: Map<string, KleinToolAdapter> = new Map();
  private capabilityRegistry: CapabilityRegistry;

  constructor(capabilityRegistry: CapabilityRegistry) {
    this.capabilityRegistry = capabilityRegistry;
  }

  registerTool(tool: KleinToolAdapter): void {
    // Progressive substitution: replacing the active implementation under the
    // same id first releases the old capability references, then installs the
    // equal-or-better implementation.
    const previous = this.tools.get(tool.toolId);
    if (previous) {
      for (const cap of previous.provides) this.capabilityRegistry.unregister(cap);
    }

    this.tools.set(tool.toolId, tool);
    for (const cap of tool.provides) this.capabilityRegistry.register(cap);
  }

  unregisterTool(toolId: string): KleinToolAdapter | undefined {
    const tool = this.tools.get(toolId);
    if (!tool) return undefined;
    this.tools.delete(toolId);
    for (const cap of tool.provides) this.capabilityRegistry.unregister(cap);
    return tool;
  }

  hasTool(toolId: string): boolean { return this.tools.has(toolId); }
  getTool(toolId: string): KleinToolAdapter | undefined { return this.tools.get(toolId); }
  getAllTools(): KleinToolAdapter[] { return Array.from(this.tools.values()); }

  findToolsForExpression(expression: ChannelExpression): KleinToolAdapter[] {
    const matching: KleinToolAdapter[] = [];
    for (const tool of this.tools.values()) {
      if (!tool.accepts(expression)) continue;
      const hasAllCapabilities = expression.capabilities.every(cap => tool.provides.includes(cap));
      if (hasAllCapabilities) matching.push(tool);
    }
    return matching;
  }

  async executeTool(toolId: string, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { success: false, outputValues: {}, expressionNodes: [], provenance: [] };
    }
    return tool.execute(context);
  }
}

export default ToolRegistry;
