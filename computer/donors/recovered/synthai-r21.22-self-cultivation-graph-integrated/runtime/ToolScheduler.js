export class ToolScheduler {
    toolRegistry;
    missingToolGenerator = null;
    executedActivationTools = new Set();
    constructor(toolRegistry) {
        this.toolRegistry = toolRegistry;
    }
    setMissingToolGenerator(generator) {
        this.missingToolGenerator = generator;
        return this;
    }
    /**
     * Schedule and execute tools for channel expressions.
     *
     * v0.5 adds bounded correction: if every installed implementation for a
     * capability fails, the runtime may grow exactly one replacement/fallback
     * organ and try it once. There is no unbounded self-repair loop.
     */
    async schedule(state) {
        const report = {
            activationsSeen: 0,
            executions: 0,
            generatedTools: [],
            correctionTools: [],
            unsatisfiedCapabilities: [],
            records: []
        };
        for (const activation of state.channelActivations.values()) {
            report.activationsSeen++;
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
            const sourceState = state.activeNodes.get(activation.sourceStateId);
            const targetState = state.activeNodes.get(activation.targetStateId);
            const context = {
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
            let anySuccess = false;
            for (const tool of tools) {
                const generated = report.generatedTools.includes(tool.toolId);
                const result = await this.executeOne(tool, activation, expression, context, state, report, generated, false);
                anySuccess ||= result.success;
                if (!result.success && generated) {
                    // Failed generated organs do not keep advertising a capability they
                    // cannot execute. Reject/dissolve them before a correction attempt.
                    this.toolRegistry.unregisterTool(tool.toolId);
                    await this.missingToolGenerator?.rejectTool?.(tool, String(result.outputValues?.error || 'execution failed'));
                }
            }
            // Bounded correction path: an installed tool may exist yet be broken.
            // Previously that blocked autonomous generation forever because the
            // capability looked "satisfied" on paper. Grow one fallback and try once.
            if (!anySuccess && this.missingToolGenerator) {
                const correction = await this.missingToolGenerator.ensureTool(expression, context);
                if (correction) {
                    this.toolRegistry.registerTool(correction);
                    if (!report.generatedTools.includes(correction.toolId))
                        report.generatedTools.push(correction.toolId);
                    report.correctionTools.push(correction.toolId);
                    const retry = await this.executeOne(correction, activation, expression, context, state, report, true, true);
                    anySuccess = retry.success;
                    if (!retry.success) {
                        this.toolRegistry.unregisterTool(correction.toolId);
                        await this.missingToolGenerator.rejectTool?.(correction, String(retry.outputValues?.error || 'correction execution failed'));
                    }
                }
            }
            if (!anySuccess)
                report.unsatisfiedCapabilities.push(...expression.capabilities);
        }
        report.generatedTools = [...new Set(report.generatedTools)];
        report.correctionTools = [...new Set(report.correctionTools)];
        report.unsatisfiedCapabilities = [...new Set(report.unsatisfiedCapabilities)];
        return report;
    }
    async executeOne(tool, activation, expression, context, state, report, generated, correctionAttempt) {
        const executionKey = `${context.sessionId}::${activation.definitionId}::${activation.sourceStateId}::${activation.targetStateId}::${tool.toolId}`;
        if (this.executedActivationTools.has(executionKey) && !correctionAttempt) {
            return { success: true, outputValues: { skipped: 'already-executed' }, expressionNodes: [], provenance: [] };
        }
        const result = await this.toolRegistry.executeTool(tool.toolId, context);
        this.toolRegistry.recordOutcome(tool.toolId, result.success);
        report.executions++;
        report.records.push({
            activationId: activation.activationId,
            definitionId: activation.definitionId,
            toolId: tool.toolId,
            generated,
            correctionAttempt,
            success: result.success,
            capabilities: [...expression.capabilities],
            sourceStateId: activation.sourceStateId,
            targetStateId: activation.targetStateId,
            result
        });
        if (result.success) {
            this.executedActivationTools.add(executionKey);
            for (const node of result.expressionNodes)
                state.expressionGraph.nodes.push(node);
            for (const prov of result.provenance)
                state.expressionGraph.provenance.push(prov);
        }
        return result;
    }
}
export default ToolScheduler;
