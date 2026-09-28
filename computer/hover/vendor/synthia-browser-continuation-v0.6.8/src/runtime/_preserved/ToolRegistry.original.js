class ToolRegistry {
  tools = /* @__PURE__ */ new Map();
  capabilityRegistry;
  constructor(capabilityRegistry) {
    this.capabilityRegistry = capabilityRegistry;
  }
  registerTool(tool) {
    this.tools.set(tool.toolId, tool);
    for (const cap of tool.provides) {
      this.capabilityRegistry.register(cap);
    }
  }
  findToolsForExpression(expression) {
    const matching = [];
    for (const tool of this.tools.values()) {
      if (tool.accepts(expression)) {
        const hasAllCapabilities = expression.capabilities.every(
          (cap) => tool.provides.includes(cap)
        );
        if (hasAllCapabilities) {
          matching.push(tool);
        }
      }
    }
    return matching;
  }
  async executeTool(toolId, context) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return {
        success: false,
        outputValues: {},
        expressionNodes: [],
        provenance: []
      };
    }
    return tool.execute(context);
  }
}
var stdin_default = ToolRegistry;
export {
  ToolRegistry,
  stdin_default as default
};
