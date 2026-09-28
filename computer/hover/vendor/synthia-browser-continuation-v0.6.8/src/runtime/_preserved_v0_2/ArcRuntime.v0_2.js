class ArcRuntime {
  /**
   * Advance all open arcs.
   * Arcs carry messages between states.
   */
  async advance(state) {
    for (const arc of state.arcs.values()) {
      if (arc.status !== "OPEN" && arc.status !== "ADVANCING") continue;
      arc.status = "ADVANCING";
      if (arc.targetStateId && arc.path.includes(arc.targetStateId)) {
        arc.status = "RESOLVED";
        arc.resolvedAt = Date.now();
        const message = {
          messageId: `msg_${arc.arcId}`,
          sessionId: arc.arcId.split("_")[1] || "unknown",
          sourceStateId: arc.sourceStateId,
          targetStateId: arc.targetStateId,
          intent: "arc_traversal_complete",
          payload: { arcId: arc.arcId, path: arc.path },
          planet: 1,
          dimension: 1,
          side: "FOUR_SIDE",
          trace: [...arc.accumulatedMessages.map((m) => m.messageId)],
          ttl: 10
        };
        state.messageBus.push(message);
      }
      if (Date.now() - arc.openedAt > 6e4) {
        arc.status = "EXPIRED";
      }
    }
    for (const [arcId, arc] of state.arcs) {
      if (arc.status === "EXPIRED" || arc.status === "RESOLVED") {
        state.arcs.delete(arcId);
      }
    }
  }
}
var stdin_default = ArcRuntime;
export {
  ArcRuntime,
  stdin_default as default
};
