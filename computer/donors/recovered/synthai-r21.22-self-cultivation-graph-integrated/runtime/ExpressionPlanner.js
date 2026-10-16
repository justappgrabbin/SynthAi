export class ExpressionPlanner {
    /**
     * Plan expression graph from runtime state.
     * Converts channel activations and tool results into a coherent graph.
     */
    async plan(state) {
        const graph = state.expressionGraph;
        // Add nodes for each channel activation
        for (const activation of state.channelActivations.values()) {
            const existingNode = graph.nodes.find(n => n.sourceChannelIds.includes(activation.activationId));
            if (!existingNode) {
                const node = {
                    expressionNodeId: `node_${activation.activationId}`,
                    sourceChannelIds: [activation.activationId],
                    sourceStateIds: [activation.sourceStateId, activation.targetStateId],
                    sourceToolIds: [],
                    capabilities: activation.requiredCapabilities,
                    inputs: [],
                    outputs: [],
                    configuration: {
                        coherence: activation.coherence,
                        tension: activation.tension,
                        expressionStrength: activation.expressionStrength
                    }
                };
                graph.nodes.push(node);
                // Add provenance
                graph.provenance.push({
                    recordId: `prov_${node.expressionNodeId}`,
                    timestamp: Date.now(),
                    sourceType: 'CHANNEL',
                    sourceId: activation.activationId,
                    description: `Channel ${activation.definitionId} activated between ${activation.sourceStateId} and ${activation.targetStateId}`,
                    resultingNodeIds: [node.expressionNodeId]
                });
            }
        }
        // Connect nodes that share states
        for (let i = 0; i < graph.nodes.length; i++) {
            for (let j = i + 1; j < graph.nodes.length; j++) {
                const nodeA = graph.nodes[i];
                const nodeB = graph.nodes[j];
                // Check if nodes share any source states
                const sharedStates = nodeA.sourceStateIds.filter(id => nodeB.sourceStateIds.includes(id));
                if (sharedStates.length > 0) {
                    const edge = {
                        edgeId: `edge_${nodeA.expressionNodeId}_${nodeB.expressionNodeId}`,
                        fromNodeId: nodeA.expressionNodeId,
                        toNodeId: nodeB.expressionNodeId,
                        portMapping: {},
                        weight: sharedStates.length / Math.max(nodeA.sourceStateIds.length, nodeB.sourceStateIds.length),
                        channelActivationId: undefined
                    };
                    graph.edges.push(edge);
                }
            }
        }
        return graph;
    }
}
export default ExpressionPlanner;
