export class ToolRegistry {
    tools = new Map();
    capabilityRegistry;
    health = new Map();
    constructor(capabilityRegistry) {
        this.capabilityRegistry = capabilityRegistry;
    }
    registerTool(tool) {
        // Progressive substitution: replacing the active implementation under the
        // same id first releases the old capability references, then installs the
        // equal-or-better implementation. A true replacement gets a fresh health
        // record; a retained tool object keeps the evidence it earned.
        const previous = this.tools.get(tool.toolId);
        if (previous) {
            for (const cap of previous.provides)
                this.capabilityRegistry.unregister(cap);
            if (previous !== tool)
                this.health.delete(tool.toolId);
        }
        this.tools.set(tool.toolId, tool);
        for (const cap of tool.provides)
            this.capabilityRegistry.register(cap);
        if (!this.health.has(tool.toolId))
            this.health.set(tool.toolId, { successes: 0, failures: 0 });
    }
    unregisterTool(toolId) {
        const tool = this.tools.get(toolId);
        if (!tool)
            return undefined;
        this.tools.delete(toolId);
        for (const cap of tool.provides)
            this.capabilityRegistry.unregister(cap);
        // Keep health evidence even after removal/dissolution for diagnostics.
        return tool;
    }
    hasTool(toolId) { return this.tools.has(toolId); }
    getTool(toolId) { return this.tools.get(toolId); }
    getAllTools() { return Array.from(this.tools.values()); }
    recordOutcome(toolId, success) {
        const h = this.health.get(toolId) || { successes: 0, failures: 0 };
        if (success)
            h.successes++;
        else
            h.failures++;
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
        return Object.fromEntries([...this.health.keys()].map(id => [id, this.getToolHealth(id)]));
    }
    findToolsForExpression(expression) {
        const matching = [];
        for (const tool of this.tools.values()) {
            if (!tool.accepts(expression))
                continue;
            const hasAllCapabilities = expression.capabilities.every(cap => tool.provides.includes(cap));
            if (hasAllCapabilities)
                matching.push(tool);
        }
        if (matching.length <= 1)
            return matching;
        // Repeatedly failed tools are not destroyed. If a healthy implementation
        // of the same capability exists, the failed path becomes inactive and the
        // stronger path takes over. If it is the only implementation, keep trying
        // it so the capability is not silently amputated.
        const healthy = matching.filter(tool => !this.getToolHealth(tool.toolId).quarantined);
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
export default ToolRegistry;
