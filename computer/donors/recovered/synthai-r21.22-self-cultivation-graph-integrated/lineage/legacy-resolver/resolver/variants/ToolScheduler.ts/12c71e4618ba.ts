import { ToolRegistry } from './ToolRegistry';
import {
  RuntimeState, ChannelExpression, ToolExecutionContext, KleinToolAdapter
} from './foundations';

export interface MissingToolGenerator {
  ensureTool(expression: ChannelExpression, context: ToolExecutionContext): Promise<KleinToolAdapter | null>;
  rejectTool?(tool: KleinToolAdapter, reason: string): Promise<void> | void;
}

export interface ToolScheduleReport {
  activationsSeen: number;
  executions: number;
  generatedTools: string[];
  unsatisfiedCapabilities: string[];
}

export class ToolScheduler {
  private toolRegistry: ToolRegistry;
  private missingToolGenerator: MissingToolGenerator | null = null;
  private executedActivationTools: Set<string> = new Set();

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  setMissingToolGenerator(generator: MissingToolGenerator | null): this {
    this.missingToolGenerator = generator;
    return this;
  }

  /**
   * Schedule and execute tools for channel expressions.
   *
   * v0.3 closes the missing-capability loop: if no installed tool can satisfy
   * an expression, an optional generator may create one. The generated tool is
   * registered through the same ToolRegistry and then executed immediately.
   */
  async schedule(state: RuntimeState): Promise<ToolScheduleReport> {
    const report: ToolScheduleReport = {
      activationsSeen: 0,
      executions: 0,
      generatedTools: [],
      unsatisfiedCapabilities: []
    };

    for (const activation of state.channelActivations.values()) {
      report.activationsSeen++;

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

      let tools = this.toolRegistry.findToolsForExpression(expression);

      if (tools.length === 0 && this.missingToolGenerator) {
        const generated = await this.missingToolGenerator.ensureTool(expression, context);
        if (generated) {
          this.toolRegistry.registerTool(generated);
          report.generatedTools.push(generated.toolId);
          tools = this.toolRegistry.findToolsForExpression(expression);
        }
      }

      if (tools.length === 0) {
        report.unsatisfiedCapabilities.push(...expression.capabilities);
        continue;
      }

      for (const tool of tools) {
        // A channel activation is an event. Do not execute the same tool twice
        // for the same activation if the session takes additional settle steps.
        const executionKey = `${activation.activationId}::${tool.toolId}`;
        if (this.executedActivationTools.has(executionKey)) continue;

        const result = await this.toolRegistry.executeTool(tool.toolId, context);
        report.executions++;

        if (result.success) {
          this.executedActivationTools.add(executionKey);
          for (const node of result.expressionNodes) state.expressionGraph.nodes.push(node);
          for (const prov of result.provenance) state.expressionGraph.provenance.push(prov);
        } else if (report.generatedTools.includes(tool.toolId)) {
          // Generated tools earn retention by executing successfully. A failed
          // generated organ is dissolved from both registries instead of being
          // silently remembered as a capability it cannot provide.
          this.toolRegistry.unregisterTool(tool.toolId);
          await this.missingToolGenerator?.rejectTool?.(tool, String(result.outputValues?.error || 'execution failed'));
          report.unsatisfiedCapabilities.push(...expression.capabilities);
        }
      }
    }

    report.unsatisfiedCapabilities = [...new Set(report.unsatisfiedCapabilities)];
    return report;
  }
}

export default ToolScheduler;
