# ABC / PSO / GA morph execution

The local game now executes Artificial Bee Colony (ABC), Particle Swarm
Optimization (PSO), and a Genetic Algorithm (GA) in one bounded morph search.
This implements the user's specified change mechanism. Visual neural models
remain potential renderers; they do not replace this search.

`runtime/morph-search.mjs` implements employed/onlooker/scout bees, particle
velocity with personal/global bests, and elitist tournament/crossover/mutation.
Each round executes all three. The best valid candidate survives every round.
Candidates contain numeric render controls, not personal photos, identity,
source addresses, executable code, or the once-chosen host theme.

The active Consciousness Realm renderer consumes the winning candidates:

- Motion changes search wing cadence, body height, and articulation. Movement,
  Evolution, Being, Design, and observer Space contribute explicit motion,
  continuity, pose, articulation, and envelope objectives simultaneously.
- World creation/entry searches the angular offsets and radii of up to eight
  addressed structures, balancing source-derived preferred placement with
  observer-space overlap costs. It changes actual mesh positions.
- Animation interpolates winning controls with frame-time-aware smoothing.
  The search runs on action/layout changes rather than on every display frame.
- The rendered-world receipt records algorithm counts, fitness, and evaluations.

These are authored optimization objectives for currently implemented geometry;
they are not a claim that chart traits have measured physical fitness. The
swarm's source macro/micro traits and identity addresses remain intact. Optimizer
working populations are not replacements for the ontologically addressed swarm.
Default budgets are 12 candidates and six rounds, bounded locally without a
server or an LLM. Search improves fitness but does not guarantee a global optimum.

Remaining work: arbitrary user-request parsing and asset synthesis, photoreal
identity-preserving embodiment, full object/contact-aware morph objectives,
source-trait-driven task allocation, learned model integration, synchronized
interaction physics, and native iOS execution. The current architecture/body
primitives remain limited; adding optimizers alone does not remove that limit.

Validation: tests cover objective improvement, best retention, all three real
algorithms, bounded candidates, action changes, overlapping world structures,
source preservation, and invalid/nonfinite inputs. The full computer suite has
100 passing tests. Realm build and phone-sized renderer integration are checked
separately.
