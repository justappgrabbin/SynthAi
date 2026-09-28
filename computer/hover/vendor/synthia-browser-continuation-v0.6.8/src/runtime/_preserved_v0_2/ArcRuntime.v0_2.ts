import { RuntimeState, ArcTraversal, RuntimeMessage } from './foundations';

export class ArcRuntime {
  /**
   * Advance all open arcs.
   * Arcs carry messages between states.
   */
  async advance(state: RuntimeState): Promise<void> {
    for (const arc of state.arcs.values()) {
      if (arc.status !== 'OPEN' && arc.status !== 'ADVANCING') continue;

      // Advance arc along path
      arc.status = 'ADVANCING';

      // Check if arc has reached target
      if (arc.targetStateId && arc.path.includes(arc.targetStateId)) {
        arc.status = 'RESOLVED';
        arc.resolvedAt = Date.now();

        // Create message from accumulated trace
        const message: RuntimeMessage = {
          messageId: `msg_${arc.arcId}`,
          sessionId: arc.arcId.split('_')[1] || 'unknown',
          sourceStateId: arc.sourceStateId,
          targetStateId: arc.targetStateId,
          intent: 'arc_traversal_complete',
          payload: { arcId: arc.arcId, path: arc.path },
          planet: 1,
          dimension: 1,
          side: 'FOUR_SIDE',
          trace: [...arc.accumulatedMessages.map(m => m.messageId)],
          ttl: 10
        };

        state.messageBus.push(message);
      }

      // Check if arc has expired
      if (Date.now() - arc.openedAt > 60000) {  // 60 second timeout
        arc.status = 'EXPIRED';
      }
    }

    // Remove expired arcs
    for (const [arcId, arc] of state.arcs) {
      if (arc.status === 'EXPIRED' || arc.status === 'RESOLVED') {
        state.arcs.delete(arcId);
      }
    }
  }
}

export default ArcRuntime;
