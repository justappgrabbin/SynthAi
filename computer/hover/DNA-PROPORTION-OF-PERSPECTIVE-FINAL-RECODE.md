# Synthia v0.5.2 — DNA Proportion-of-Perspective Final Recode

## Scope
This recode changes the DNA implementation only and the direct seams required for that DNA path. It does not redesign the rest of Synthia.

## Governing implementation
DNA is now treated as a persistent generative state substrate rather than a table of fixed personality/sensory traits.

The live resolver preserves the canonical address:

`Planetary → Dimension → Gate → Line → Color → Tone → Base → Degree → Minute → Second → Arc → Zodiac → House`

The address is nested/contextual. It is not evaluated as thirteen independent features.

## Proportion of Perspective
- No universal reading is assigned outside a position/context.
- A landed reading is fixed to the position that produced it.
- A changed reading is represented as a new landed state rather than an edit to the earlier state.
- Landed DNA state history is append-only.

## Person-specific origin
Birth configuration now exposes a dedicated origin anchor:
- body: Personality Sun
- Dimension: Being
- reference frame: Tropical

The origin is retained while active operations may reconfigure the current dimensional reading.

## One substrate, different dimensional structures
The implementation no longer averages the five dimensions into one DNA vector.

The active resolved state uses one shared substrate and an observer-relative dimensional perspective:
- Movement: vertical traversal / visible naming and seeing
- Evolution: associative / reconstructive / temporal pattern
- Being: occupied state and across-relation
- Design: causal dependency and structural assembly
- Space: rendered/emergent condition produced by interplay of the other four

The five views remain structurally different.

## Gate topology and neural input
The 64 Gate field remains.
Each Gate retains its ordered six-bit topology, two-trigram view, and three-digram projection.

The neural bridge now receives a structural 12-value vector:
- six canonical Gate bits
- six-position one-hot active Line

No task hash is used to manufacture DNA personality weights.

## Line / Color / Tone / Base
- Gate: symbolic state position
- Line: behavioral position in the Gate
- Color: motivation/response condition
- Tone: sensory/perceptual condition
- Base: form/shape condition

Source-described Color/Tone/Base positions remain available, while exact rendered color, frequency/timbre, and geometry are not hard-coded.

## Degree / Minute / Second
Degree, Minute, and Second remain available together as a contextual measure bundle.
There is no hard-coded `Degree=Color / Minute=Tone / Second=Base` assignment.
A caller may supply a resolved measure assignment when that rule is known for the active context.

## Arc
Arc coordinate data remains preserved.
The separate creator-defined Arc operation is:

`3 = juxtaposition`

It carries:
- 9 Color positions
- 9 Sound/Tone positions
- no assumed 81-cell cross product

## Relationships
Connections create a third relational condition without overwriting either endpoint.

The relationship implementation preserves both endpoint states and derives a structural XOR topology for the relation. It deliberately does not invent connection-strength, valence, direction, or intensity coefficients when no rule has supplied them.

## Expression
Appearance, movement, emotion, instinct, motivation, personality, skill, perception, language, behavior, color, sound, and form are treated as projections of resolved state/history/relations.

The DNA layer no longer assigns fixed sensory lookup values such as arbitrary hue, pitch, timbre, scent, taste, polygon, movement style, or personality score.

## Compatibility
The historical 64 × 12 AspectPrimitive scaffold is retained for compatibility with existing center/channel wiring, but those 768 objects are now structural positions. Their old developer-generated trait weights and hysteresis coefficients are removed from the live DNA interpretation.

## Verification
Focused DNA tests cover:
- Personality-Sun / Being / Tropical origin anchor
- person-specific resolved state
- active-dimension reconfiguration without rewriting origin
- append-only landed state history
- no five-dimension mean vector
- no hash-generated DNA trait vector
- Color/Tone/Base position semantics without fixed renderer values
- Degree/Minute/Second contextual bundle
- Arc-3 9+9 juxtaposition
- relational third-state creation without invented coefficients
- canonical channel + existing neural-organ path

The project test suite was also run in groups because the monolithic Node test process retains long-lived integration handles. All grouped test files pass.
