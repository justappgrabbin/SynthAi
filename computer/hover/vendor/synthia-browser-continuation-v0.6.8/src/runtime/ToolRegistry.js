class ToolRegistry {
  tools = /* @__PURE__ */ new Map();
  capabilityRegistry;
  health = /* @__PURE__ */ new Map();
  constructor(capabilityRegistry) {
    this.capabilityRegistry = capabilityRegistry;
  }
  registerTool(tool) {
    const previous = this.tools.get(tool.toolId);
    if (previous) {
      for (const cap of previous.provides) this.capabilityRegistry.unregister(cap);
      if (previous !== tool) this.health.delete(tool.toolId);
    }
    this.tools.set(tool.toolId, tool);
    for (const cap of tool.provides) this.capabilityRegistry.register(cap);
    if (!this.health.has(tool.toolId)) this.health.set(tool.toolId, { successes: 0, failures: 0 });
  }
  unregisterTool(toolId) {
    const tool = this.tools.get(toolId);
    if (!tool) return void 0;
    this.tools.delete(toolId);
    for (const cap of tool.provides) this.capabilityRegistry.unregister(cap);
    return tool;
  }
  hasTool(toolId) {
    return this.tools.has(toolId);
  }
  getTool(toolId) {
    return this.tools.get(toolId);
  }
  getAllTools() {
    return Array.from(this.tools.values());
  }
  recordOutcome(toolId, success) {
    const h = this.health.get(toolId) || { successes: 0, failures: 0 };
    if (success) h.successes++;
    else h.failures++;
    this.health.set(toolId, h);
  }
  getToolHealth(toolId) {
    const h = this.health.get(toolId) || { successes: 0, failures: 0 };
    const score = (h.successes + 1) / (h.successes + h.failures + 2);
    return {
      successes: h.successes,
      failures: h.failures,
      score,
      quarantined: h.failures >= 2 && h.successes === 0
    };
  }
  getHealthSnapshot() {
    return Object.fromEntries([...this.health.keys()].map((id) => [id, this.getToolHealth(id)]));
  }
  findToolsForExpression(expression) {
    const matching = [];
    for (const tool of this.tools.values()) {
      if (!tool.accepts(expression)) continue;
      const hasAllCapabilities = expression.capabilities.every((cap) => tool.provides.includes(cap));
      if (hasAllCapabilities) matching.push(tool);
    }
    if (matching.length <= 1) return matching;
    const healthy = matching.filter((tool) => !this.getToolHealth(tool.toolId).quarantined);
    const candidates = healthy.length ? healthy : matching;
    return candidates.sort((a, b) => this.getToolHealth(b.toolId).score - this.getToolHealth(a.toolId).score);
  }
  async executeTool(toolId, context) {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { success: false, outputValues: {}, expressionNodes: [], provenance: [] };
    }
    return tool.execute(context);
  }
}
var stdin_default = ToolRegistry;
export {
  ToolRegistry,
  stdin_default as default
};
