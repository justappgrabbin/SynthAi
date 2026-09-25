// @ts-ignore - preserved ESM vendors
import { IntegratedToolFactory, ATONativeBridge } from '../../vendor/integrated-tool-factory/src/integrated-tool-factory.mjs';
// @ts-ignore - preserved ESM vendor
import { Automaton } from '../../vendor/ato-core/src/index.mjs';
const DIMENSION_NAMES = {
    1: 'Movement', 2: 'Evolution', 3: 'Being', 4: 'Design', 5: 'Space'
};
let nodeSequence = 0;
function executionSuccess(toolId, output, context) {
    const expressionNodeId = `generated_${toolId}_${context.sessionId}_${++nodeSequence}`;
    const node = {
        expressionNodeId,
        sourceChannelIds: [...context.expression.capabilities],
        sourceStateIds: [
            context.inputValues.sourceState?.stateId,
            context.inputValues.targetState?.stateId
        ].filter(Boolean),
        sourceToolIds: [toolId],
        capabilities: [...context.expression.capabilities],
        inputs: [],
        outputs: [],
        configuration: { output, generated: true }
    };
    const provenance = {
        recordId: `prov_generated_${toolId}_${context.sessionId}_${nodeSequence}`,
        timestamp: Date.now(),
        sourceType: 'TOOL',
        sourceId: toolId,
        description: `Generated, mounted, and executed ${toolId}`,
        resultingNodeIds: [expressionNodeId]
    };
    return { success: true, outputValues: { output }, expressionNodes: [node], provenance: [provenance] };
}
function executionFailure(error) {
    return {
        success: false,
        outputValues: { error: error instanceof Error ? error.message : String(error) },
        expressionNodes: [],
        provenance: []
    };
}
/**
 * Runtime bridge from an unsatisfied channel capability to the existing
 * Integrated Tool Factory + native ATO mesh.
 *
 * It does not invent arbitrary code. It asks the preserved 8-level factory for
 * the best bounded runtime, materializes that tool as a native ATO Automaton,
 * mounts it into the live ATO mesh, and returns a GraphRuntime adapter.
 */
export class FactoryToolGenerator {
    factory;
    bridge;
    adapters = new Map();
    capabilityToTool = new Map();
    onExecuted = null;
    constructor({ mesh, factory = new IntegratedToolFactory() }) {
        this.factory = factory;
        this.bridge = new ATONativeBridge({ Automaton, mesh, factory: this.factory });
    }
    async ensureTool(expression, context) {
        const capabilities = [...new Set(expression.capabilities)].sort();
        if (capabilities.length === 0)
            return null;
        const capabilityKey = capabilities.join('+');
        const existingId = this.capabilityToTool.get(capabilityKey);
        if (existingId)
            return this.adapters.get(existingId) || null;
        const sourceState = context.inputValues.sourceState;
        const targetState = context.inputValues.targetState;
        const runtimeDimension = Number(sourceState?.address?.dimension ??
            targetState?.address?.dimension ??
            context.inputValues.intentRecord?.dimension ??
            5);
        const dimension = DIMENSION_NAMES[runtimeDimension] || 'Space';
        const sourceGate = Number(sourceState?.address?.gateLine?.gate || 0);
        const targetGate = Number(targetState?.address?.gateLine?.gate || 0);
        // Channel capabilities are connection/event work, so level 6 is the
        // factory's existing Channel Connector runtime. Gate data remains sourced
        // from the actual activation when available instead of being fabricated.
        const request = { purpose:`connect channel capability ${capabilityKey}`, input:capabilityKey, dimension, level:6, structure:context.inputValues?.structure || null, address:context.inputValues?.canonicalAddress || sourceState?.address || targetState?.address || null };
        if (sourceGate >= 1 && sourceGate <= 64)
            request.gate = sourceGate;
        if (targetGate >= 1 && targetGate <= 64)
            request.targetGate = targetGate;
        const mounted = this.bridge.generateAndMount(request);
        return this.#adapterFromMounted(mounted, capabilities, request);
    }
    #adapterFromMounted(mounted, capabilities, request) {
        if (!mounted?.automaton || !mounted?.tool)
            return null;
        const capabilityKey = capabilities.join('+');
        const native = mounted.automaton;
        const factoryTool = mounted.tool;
        const toolId = native.id;
        const bridge = this.bridge;
        const regenerativeTrace = { version: 1, capabilities: [...capabilities], request: structuredClone(request) };
        const thisGenerator = this;
        const adapter = {
            toolId,
            name: factoryTool.name || toolId,
            provides: capabilities,
            requires: [],
            accepts(candidate) {
                return candidate.capabilities.every(cap => capabilities.includes(cap));
            },
            async execute(toolContext) {
                try {
                    const input = {
                        intent: toolContext.inputValues.intent,
                        capability: capabilityKey,
                        parameters: toolContext.expression.parameters,
                        sourceState: toolContext.inputValues.sourceState,
                        targetState: toolContext.inputValues.targetState
                    };
                    const run = await bridge.run(toolId, input);
                    const output = run?.outputs?.[toolId] ?? run;
                    try {
                        if (typeof thisGenerator.onExecuted === 'function')
                            thisGenerator.onExecuted({ toolId, capabilities: [...capabilities], capabilityKey, request, output });
                    } catch {}
                    return executionSuccess(toolId, output, toolContext);
                }
                catch (error) {
                    return executionFailure(error);
                }
            },
            regenerativeTrace,
            materialize() {
                return {
                    files: [{
                            path: `tools/${toolId}.mjs`,
                            content: factoryTool.exportModule(),
                            type: 'javascript'
                        }],
                    manifest: factoryTool.manifest(),
                    metadata: { generated: true, capabilityKey, request, plan: factoryTool.plan }
                };
            }
        };
        this.adapters.set(toolId, adapter);
        this.capabilityToTool.set(capabilityKey, toolId);
        return adapter;
    }
    async restoreTool(trace) {
        if (!trace?.request || !Array.isArray(trace?.capabilities) || trace.capabilities.length === 0)
            return null;
        const capabilities = [...new Set(trace.capabilities.map(String))].sort();
        const capabilityKey = capabilities.join('+');
        const existingId = this.capabilityToTool.get(capabilityKey);
        if (existingId)
            return this.adapters.get(existingId) || null;
        const mounted = this.bridge.generateAndMount(structuredClone(trace.request));
        return this.#adapterFromMounted(mounted, capabilities, structuredClone(trace.request));
    }
    regenerativeTraces() {
        return [...this.adapters.values()].map(adapter => structuredClone(adapter.regenerativeTrace)).filter(Boolean);
    }
    async rejectTool(tool, reason) {
        const capabilityEntries = [...this.capabilityToTool.entries()].filter(([, id]) => id === tool.toolId);
        for (const [capabilityKey] of capabilityEntries)
            this.capabilityToTool.delete(capabilityKey);
        this.adapters.delete(tool.toolId);
        this.bridge.dissolve(tool.toolId, reason);
    }
    snapshot() {
        return {
            factory: this.factory.snapshot(),
            bridge: this.bridge.snapshot(),
            capabilityBindings: Object.fromEntries(this.capabilityToTool)
        };
    }
}
export default FactoryToolGenerator;
