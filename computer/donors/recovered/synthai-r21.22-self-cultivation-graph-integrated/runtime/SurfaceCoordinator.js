export class SurfaceCoordinator {
    /**
     * Coordinate between FOUR_SIDE and FIVE_SIDE surfaces.
     * Detects ternary emergence from correspondence.
     */
    async coordinate(state) {
        const fourSide = state.surfaces.get('FOUR_SIDE');
        const fiveSide = state.surfaces.get('FIVE_SIDE');
        if (!fourSide || !fiveSide)
            return [];
        const emergences = [];
        // Check for correspondence between surfaces
        const fourStates = Array.from(fourSide.activeStates.values());
        const fiveStates = Array.from(fiveSide.activeStates.values());
        for (const fourState of fourStates) {
            for (const fiveState of fiveStates) {
                // Check if same gate-line on both sides
                if (fourState.address.gateLine.gate === fiveState.address.gateLine.gate &&
                    fourState.address.gateLine.line === fiveState.address.gateLine.line) {
                    const correspondence = fourState.coherence * fiveState.coherence;
                    if (correspondence > 0.5) {
                        const emergence = {
                            emergenceId: `emergence_${fourState.stateId}_${fiveState.stateId}`,
                            fourSideStateIds: [fourState.stateId],
                            fiveSideStateIds: [fiveState.stateId],
                            correspondence,
                            resultingStateIds: [],
                            channels: [],
                            openedAt: Date.now()
                        };
                        emergences.push(emergence);
                    }
                }
            }
        }
        state.ternaryEmergences.push(...emergences);
        return emergences;
    }
}
export default SurfaceCoordinator;
