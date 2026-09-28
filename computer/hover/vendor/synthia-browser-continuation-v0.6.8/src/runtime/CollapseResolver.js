class CollapseResolver {
  /**
   * Resolve collapse events from active states.
   * A collapse occurs when state activation exceeds threshold.
   */
  async resolve(state) {
    const events = [];
    const threshold = 0.8;
    for (const activeState of state.activeNodes.values()) {
      if (activeState.activation > threshold && activeState.regime === "CHANGING") {
        const event = this.createCollapseEvent(activeState, state.seed);
        events.push(event);
        state.collapseEvents.set(event.eventId, event);
        activeState.collapseEventIds.push(event.eventId);
        activeState.regime = "RESOLVING";
      }
    }
    return events;
  }
  createCollapseEvent(state, seed) {
    const eventId = `collapse_${state.stateId}_${Date.now()}`;
    const degree = Math.floor(state.phase / (2 * Math.PI) * 360) % 360;
    const minute = state.address.gateLine.line * 10;
    const second = state.address.color * 10;
    return {
      eventId,
      degree,
      minute,
      second,
      sourceStateIds: [state.stateId],
      collapsedGateLine: state.address.gateLine,
      color: state.address.color,
      tone: state.address.tone,
      base: state.address.base,
      magnitude: state.activation,
      timestamp: Date.now(),
      deterministicSeed: Number(seed.sessionSeed) + seed.eventCounter
    };
  }
}
var stdin_default = CollapseResolver;
export {
  CollapseResolver,
  stdin_default as default
};
