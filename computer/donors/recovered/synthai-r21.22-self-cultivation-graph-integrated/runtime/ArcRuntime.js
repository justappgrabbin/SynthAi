export class ArcRuntime {
    /**
     * Advance all open arcs.
     *
     * v0.3 correction: RESOLVED arcs are intentionally retained until the
     * ChannelResolver has consumed them. The previous implementation deleted
     * them in the same method that marked them RESOLVED, so channel resolution
     * could never observe the completed traversal.
     */
    async advance(state) {
        for (const arc of state.arcs.values()) {
            if (arc.status !== 'OPEN' && arc.status !== 'ADVANCING')
                continue;
            arc.status = 'ADVANCING';
            if (arc.targetStateId && arc.path.includes(arc.targetStateId)) {
                arc.status = 'RESOLVED';
                arc.resolvedAt = Date.now();
                const message = {
                    messageId: `msg_${arc.arcId}`,
                    sessionId: state.session.sessionId,
                    sourceStateId: arc.sourceStateId,
                    targetStateId: arc.targetStateId,
                    intent: 'arc_traversal_complete',
                    payload: { arcId: arc.arcId, path: arc.path },
                    planet: state.session.intent.planet || 1,
                    dimension: state.session.intent.dimension || 1,
                    side: state.session.intent.side,
                    trace: [...arc.accumulatedMessages.map(m => m.messageId)],
                    ttl: 10
                };
                if (!state.messageBus.some(existing => existing.messageId === message.messageId)) {
                    state.messageBus.push(message);
                }
            }
            if (Date.now() - arc.openedAt > 60000) {
                arc.status = 'EXPIRED';
            }
        }
        for (const [arcId, arc] of state.arcs) {
            if (arc.status === 'EXPIRED')
                state.arcs.delete(arcId);
        }
    }
    /** Remove resolved arcs only after channel resolution/scheduling has seen them. */
    consumeResolved(state, arcIds) {
        const ids = arcIds ? new Set(arcIds) : null;
        let removed = 0;
        for (const [arcId, arc] of state.arcs) {
            if (arc.status !== 'RESOLVED')
                continue;
            if (ids && !ids.has(arcId))
                continue;
            state.arcs.delete(arcId);
            removed++;
        }
        return removed;
    }
}
export default ArcRuntime;
