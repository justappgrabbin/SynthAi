// ============================================================================
// Tool Registry — Local tool definitions
// ============================================================================
import { MCPToolDescriptor } from "../models";

export class ToolRegistry {
  private tools = new Map<string, MCPToolDescriptor>();

  register(tool: MCPToolDescriptor): void {
    this.tools.set(tool.id, tool);
  }

  get(id: string): MCPToolDescriptor | undefined {
    return this.tools.get(id);
  }

  getAll(): MCPToolDescriptor[] {
    return Array.from(this.tools.values());
  }

  getByCapability(capability: string): MCPToolDescriptor[] {
    return this.getAll().filter((t) => t.capabilities.includes(capability));
  }
}
