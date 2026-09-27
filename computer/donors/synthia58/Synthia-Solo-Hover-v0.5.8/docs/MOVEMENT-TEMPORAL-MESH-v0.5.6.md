# Movement Transport + Temporal Experiential Mesh v0.5.6

## Movement

Representations:

`binary → decimal → hex`

and the inverse:

`hex → decimal → binary`

For a transported value, numeric identity is invariant. Example:

`01000001₂ → 65₁₀ → 41₁₆`

Movement records each adjacent conversion as a step and keeps append-only transport history. Gate transport uses the existing Gate topology and carries its numeric identity through the same representation path.

## Historical state landing

A historical target is identified by its date/time/place coordinate and the full calculated 13-field address:

`Planetary → Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc → Zodiac → House`

On first visit, the temporal runtime stores:

- the calculated target state and address;
- the agent's current landed state/address;
- accumulated personal state identifiers;
- accumulated relationship identifiers;
- exact-coordinate mesh trace identifiers available at that visit;
- caller-supplied visit context.

The resulting historical state receives a stable historical-state ID. A later visit by the same agent to the same coordinate returns that stored state.

## Temporal superposition

A superposition contains a current component and one or more historical components. The components remain distinct. The perceptual field exposes the component Color, Tone, Base, and Gate positions together for downstream perception/morphing without replacing any component state.

## Experiential mesh

Each landed historical state emits a structural trace containing:

- agent ID;
- temporal coordinate key;
- historical state ID;
- target state ID;
- full structural address;
- perceptual projection;
- structural neural vector when present.

The mesh can return:

- exact traces for the same temporal coordinate;
- structural matches by shared address fields;
- distributions of shared Dimension, Gate, Line, Color, Tone, Base, Arc, Zodiac, and House positions.

Mesh traces are transferable with `temporal-mesh-export` and `temporal-mesh-ingest`.

## Persistence

`semantic-genome:temporal-experience` persists landings, mesh traces, temporal events, and superpositions. Restoring the runtime restores the same historical landing IDs and recall behavior.
