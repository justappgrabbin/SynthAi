export class ChannelResolver {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Resolve channels from current runtime state.
     * A channel emerges when:
     * 1. Two states have compatible gate-line pairs
     * 2. An arc connects them
     * 3. Coherence and tension rules are satisfied
     */
    async resolve(state) {
        const activations = [];
        for (const arc of state.arcs.values()) {
            if (arc.status !== 'RESOLVED')
                continue;
            const source = state.activeNodes.get(arc.sourceStateId);
            const target = arc.targetStateId ? state.activeNodes.get(arc.targetStateId) : undefined;
            if (!source || !target)
                continue;
            // Find canonical channel for this gate pair
            const channelDef = this.registry.findByGates(source.address.gateLine.gate, target.address.gateLine.gate);
            if (!channelDef)
                continue;
            // Check activation rules
            let ruleScore = 0;
            for (const rule of channelDef.activationRules) {
                if (rule.condition(source, target, arc)) {
                    ruleScore += rule.weight;
                }
            }
            if (ruleScore > 0) {
                const coherence = (source.coherence + target.coherence) / 2 * ruleScore;
                const tension = Math.abs(source.phase - target.phase) / (2 * Math.PI);
                if (coherence > 0.3) { // Minimum coherence threshold
                    const activation = {
                        activationId: `activation_${channelDef.channelId}_${arc.arcId}`,
                        definitionId: channelDef.channelId,
                        sourceStateId: source.stateId,
                        targetStateId: target.stateId,
                        arcId: arc.arcId,
                        coherence,
                        tension,
                        expressionStrength: coherence * (1 - tension),
                        requiredCapabilities: channelDef.requiredCapabilities,
                        deterministicSeed: Number(state.seed.sessionSeed) + state.seed.eventCounter
                    };
                    activations.push(activation);
                    state.channelActivations.set(activation.activationId, activation);
                }
            }
        }
        return activations;
    }
}
export default ChannelResolver;
