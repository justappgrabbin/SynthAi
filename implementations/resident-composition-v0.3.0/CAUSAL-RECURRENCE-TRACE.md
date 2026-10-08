# Supplied causal recurrence: source and algebra trace

This checkpoint preserves the new causal graph, symbolic vocabulary and recurrent-system specification as requirements. It audits supplied examples against those requirements. It neither renames the vocabulary nor substitutes a new operator construction.

## Intended structure

Four source fields: Being / I Am, Evolution / I Remember, Movement / I Define, Design / I Design. Space is emergent expression. The supplied symbolic roles are state vector x(t), master operator O(t), saturation sigma, resonance R(t), singularity dot, collapse circle, mirror equals, transformation vector arrow, and continuity/current hyphen. These symbols must become executable registered operators with source-backed semantics; descriptive text is not their implementation.

The causal dependency material includes planetary/time/place and Zodiac/House context, DMS, Gate/Line, Color/Tone/Base, Axis, Dimension, Center, recurrent operator, retained memory, Space, and faithful narrative expression. External vocabulary files and encapsulated operators are compatible with the recovered modular source. They do not establish missing derivation functions merely by declaring them lawful.

The recurrence requested is:

x(t+1) = sigma(O(t)x(t) + R(t))
O(t+1) = f(x(t+1))
O = C + E + D + CE + DE + CD + CDE
R = alpha(CE x) + beta(DE x) + gamma(CD x)

The nine state components, the meanings of C/E/D, embeddings and composition order need explicit correspondence. This recurrence is a computational model; names such as quantum or consciousness do not establish a physical measurement.

## Supplied example: verified algebra findings

C, E, D are each expanded into separate diagonal blocks in a 9×9 matrix. Their row/column supports are disjoint. Consequently CE=DE=CD=CDE=0 for every possible choice of their 3×3 entries, and R=0 for every x. This follows directly from matrix multiplication, not from a particular random initialization.

`experiments/triadic-block-audit.mjs` reproduces the construction using nonzero entries and verifies all products and R vanish. Repair requires the intended cross-plane maps/embedding; no guessed off-diagonal weights have been introduced.

Sigmoid bounds each component but does not normalize a probability vector and does not by itself prove convergence or system stability. Five iterations are not a stability proof. The example uses random initialization, fixed feedback weights and damping, and updates all three planes toward the same reshaped x; none are yet natal/address-derived operations.

## Supplied integrated oracle: requirement gaps

- CTB derivation explicitly returns mock 4/4/4. This cannot stand in for the Law of Emanation.
- Global Color and Tone phase multipliers do not change individual squared-amplitude probabilities. Relative phases can matter in joint interference, but the shown random collapse does not establish that behavior.
- `observe()` chooses a dimension but does not call `collapse_to_dimension`; history holds mutable field references.
- User query is stored but does not select or otherwise determine the observation operation.
- Interference uses only conscious Sun/Earth, not all stated fields, and chooses output prose randomly. The placement keys denote planetary anchors, not the four source dimensions.
- `is_harmonious` is passed directly by the caller. No Doctor Parser gate is wired before the prior/memory update.
- The separate CausalDynamicalSystem is not integrated into QuantumOracle's cycle.
- Example coordinates lack complete Zodiac/House/filter context and include fractional degree plus minutes; they must not bypass the strict integer DMSA contract or be called verified chart calculations.
- Hardcoded increments/decrements and deepening rates do not supply the requested stability derivation.
- A normalized complex array is implementable mathematical state, not evidence of a physical quantum system.

## Recovered implementations (originals preserved)

`components/process-physics/optional/selfhosted/synthia-server/tools/lco/synthia-complete-system/causal-dynamical-system.py` contains SemanticProbabilityField and other oracle components plus LawfulDeepeningSystem and CausalDynamicalSystem. It uses C=Center, E=Expression, D=Dimension, whereas the pasted class uses C=Mind, E=Heart, D=Body. It builds a directly weighted 9×9 operator with cross-plane entries rather than the supplied disjoint-block construction. Its arbitrary coefficients and gate-modulo initialization require review before any JavaScript port.

The recovered memory stores a 64-gate Dirichlet vector, while the pasted oracle uses four dimensional counts. Neither should be silently substituted for the other.

`components/process-physics/optional/selfhosted/synthia-server/tools/lco/messy-modern/SelfModificationController.py` contains DoctorParser and InflectionArchitecture. DoctorParser validates modification proposals, not the specified `validate_coherence` collapse gate. Some invariant branches return placeholder false. InflectionArchitecture records modifications but its rollback truncates lineage, contrary to landed-history permanence. Reuse its intent and provenance structure only after repairing that behavior; rollback must create a descendant branch.

These files are recovered source evidence, not new Python dependencies for Pure Synthia.

## Dependency variants retained

The successive causal diagrams put Center before Dimension in one ordering and derive Center from Dimension in another. A recurrent model can contain feedback across time, but the specification also demands unidirectional dependencies. Representing x(t)→O(t+1) with time-indexed events can preserve causal order; it does not resolve the within-step Center/Dimension derivation by itself. Recover the exact evaluation order before implementing it.

The material alternates between 13 filters, 13 planetary placements, and 13 fields; these are different quantities and must have separate schema terms. Counts labeled 11 primary node types do not uniquely specify an enumeration when grouped nodes are split. Do not derive a runtime schema from the count alone.

## Implementation boundary

No production deployment, quantum oracle installation or natal calculation is claimed here. The published experiment tests the supplied algebra. Next work is source recovery of the operator meanings/cross-plane mapping, typed time-indexed state/lineage, and a real validation-before-memory-update contract. Vocabulary data may be externalized with provenance without turning unverified defaults into laws.
