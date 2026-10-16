import { ToolRegistry } from './ToolRegistry';
import { RuntimeState, ChannelExpression, ToolExecutionContext, ExpressionNode, ProvenanceRecord } from './foundations';

export class ToolScheduler {
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Schedule and execute tools for channel expressions.
   */
  async schedule(state: RuntimeState): Promise<void> {
    for (const activation of state.channelActivations.values()) {
      // Create channel expression
      const expression: ChannelExpression = {
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

      // Find matching tools
      const tools = this.toolRegistry.findToolsForExpression(expression);

      for (const tool of tools) {
        const sourceState = state.activeNodes.get(activation.sourceStateId);
        const targetState = state.activeNodes.get(activation.targetStateId);
        const context: ToolExecutionContext = {
          sessionId: state.session.sessionId,
          expression,
          inputValues: {
            intent: state.session.intent.description,
            intentRecord: state.session.intent,
            activation,
            sourceState,
            targetState,
            messages: [...state.messageBus]
          },
          runtimeState: state
        };

        const result = await this.toolRegistry.executeTool(tool.toolId, context);

        if (result.success) {
          // Add tool result nodes to expression graph
          for (const node of result.expressionNodes) {
            state.expressionGraph.nodes.push(node);
          }

          // Add provenance
          for (const prov of result.provenance) {
            state.expressionGraph.provenance.push(prov);
          }
        }
      }
    }
  }
}

export default ToolScheduler;
