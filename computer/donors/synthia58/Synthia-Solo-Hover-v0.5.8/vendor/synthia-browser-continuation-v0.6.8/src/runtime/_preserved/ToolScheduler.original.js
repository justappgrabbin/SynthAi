class ToolScheduler {
  toolRegistry;
  constructor(toolRegistry) {
    this.toolRegistry = toolRegistry;
  }
  /**
   * Schedule and execute tools for channel expressions.
   */
  async schedule(state) {
    for (const activation of state.channelActivations.values()) {
      const expression = {
        channelActivationId: activation.activationId,
        inputPorts: [],
        outputPorts: [],
        capabilities: activation.requiredCapabilities,
        parameters: {
          coherence: activation.coherence,
          tension: activation.tension,
          expressionStrength: activation.expressionStrength
        },
        constraints: []
      };
      const tools = this.toolRegistry.findToolsForExpression(expression);
      for (const tool of tools) {
        const context = {
          sessionId: state.session.sessionId,
          expression,
          inputValues: {},
          runtimeState: state
        };
        const result = await this.toolRegistry.executeTool(tool.toolId, context);
        if (result.success) {
          for (const node of result.expressionNodes) {
            state.expressionGraph.nodes.push(node);
          }
          for (const prov of result.provenance) {
            state.expressionGraph.provenance.push(prov);
          }
        }
      }
    }
  }
}
var stdin_default = ToolScheduler;
export {
  ToolScheduler,
  stdin_default as default
};
