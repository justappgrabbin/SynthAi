# Specification Addendum PN-1
## From Recursive Calculus to a Cultivation Network (Personal / Relational / Network Scale)

### v0.1 — extends `pure-synthia-research-proposal.md` and `STATE_SPACE_SPEC.md`
### All hypotheses remain labeled per the base proposal's Appendix B. Nothing in this addendum asserts new truth.

---

## PN.1 Scope & Relation to the Base Proposal

The base proposal defined Pure Synthia as a recursive generative state calculus with an
experimental ladder from sub-letter features through multi-automata meshes (§5, §21, H.2).
`STATE_SPACE_SPEC.md` fixed the implemented machinery for $L_0$–$L_8$: canonical
addressing, five dimensional perspectives, the operator set $O$, named transitions, the
shared `AutomataMesh`, and the complexity ledger.

This addendum specifies the **next experimental territory**: what the calculus claims, and
what it must prove, when its operands become *persons, relationships, and networks*.
Formally, it extends two sections of the base proposal:

- **§10 (Multi-Scale, Multi-Organism Meshes).** The mesh set
  $M(x) = \{M_{local}, M_{personal}, M_{value}, M_{scale}, M_{group}\}$ and its
  qualified-packet rule receive operational semantics at person and network scales
  (§PN.5, §PN.7, §PN.8).
- **§14 (Cross-Scale Invariance).** The decisive experiment $R_{s_1} \cong R_{s_2}$ is
  restated with operands from $\{\text{person}, \text{relationship}, \text{group},
  \text{network}\}$, and a relational generativity experiment is registered (H7', §PN.10).

**Scope discipline.** Every element below is labeled either **mechanism** (implemented or
implementable in `pure-synthia-automata`, carrying no truth claim) or **hypothesis** (an
empirical claim registered with null, metric, threshold, and falsification condition). As
in the base proposal, the architecture may *represent* a claim without *asserting* it; per
Appendix I.11, no module may contain logic equivalent to `candidateMapping.isTrue = true`.
This addendum introduces no new established facts — only machinery, named mechanisms, and
three registered hypotheses (H4b, H7', H8').

The scale ladder of `STATE_SPACE_SPEC.md` §1 is extended:

$$
L_7\ \text{automata} \to L_8\ \text{multi-automata mesh} \to L_9\ \text{person}
\to L_{10}\ \text{relationship} \to L_{11}\ \text{group} \to L_{12}\ \text{network}
$$

Success at $L_8$ does not imply success at $L_9$–$L_{12}$. Per H.2, each level must
independently establish representation, operator behavior, deterministic reconstruction,
held-out generalization, and provenance completeness before cross-scale claims are
evaluated at that level.

---

## PN.2 The Network-as-Intelligence Shift

**Mechanism (architectural stance).** In conventional software architecture, capability is
localized and additive, $\text{App} = \sum_i \text{Tool}_i$: a system grows primarily by
adding functions, models, APIs, or modules. The proposed architecture permits a second
source of capability:

$$\text{Capability} = F(\text{States}, \text{Automata}, \text{Relations}, \text{Context}, \text{History}, \text{Operators})$$

Under this formulation, some capabilities may reside neither in automaton $A$ nor automaton
$B$ but in the structured relationship between them:

$$C_{AB} = F(A, B, R_{AB}, C, H)$$

where $R_{AB}$ is the relation instance, $C$ context, and $H$ the interaction history of the
pair. This is the computational content of describing tools as *channels, crossings, and
edge functions* rather than as a tool menu: the connection is itself a computational
object with state, evidence, and provenance.

$$\boxed{\text{Cynthia is not one automaton. Cynthia is the behavior of the network.}}$$

This is an architectural definition, not an empirical result. It reframes *where the
system looks* for capability; whether relational capability actually appears is the
registered hypothesis H7' (§PN.10), with explicit ablation and control conditions.

The shift also restates the research question of §14 with stronger operands:

$$\text{primitive} \to \text{composite} \to \text{automaton} \to \text{person} \to \text{relationship} \to \text{group} \to \text{network}$$

The question is no longer only whether a primitive grammar reconstructs words or
sentences, but whether relational operations discovered at smaller scales remain useful
when the operands themselves become increasingly complex stateful systems. Per §PN.6, a
positive answer at one scale is evidence to be carried, not truth to be assumed, at the
next.

**Interface consequence (mechanism).** The system may expose conventional direct-request
interfaces ("make this", "analyze this"). Underneath, the deeper routing is
$\text{person} + \text{state} + \text{context} + \text{automata} + \text{relations} \to
\text{processing pathway} \to \text{result} \to \text{experience returned to the network}$.
The final step is mandatory: interaction results are absorbed into the experiential state
of the participating automata (`absorbExperience` in `src/engine/learning.js` and
`src/engine/synthia.js`), cultivating continuity rather than treating every interaction
as the first.

---

## PN.3 The 64-Gate Automata Substrate

**Mechanism.** Human Design's 64-gate structure is used as a *candidate finite automata
substrate*, not as a static label set. Each Gate is implemented as a stateful
computational unit:

$$G_i = (S_i, M_i, R_i, H_i, O_i)$$

with $S_i$ current state, $M_i$ local memory, $R_i$ relationships, $H_i$ experiential
history, and $O_i$ the operators through which the automaton participates in
transformations. The 64 gates supply a finite candidate vocabulary:

$$\mathcal{G} = \{G_1, G_2, \dots, G_{64}\}$$

**Finite vocabulary, no finite behavioral ceiling.** Recursion over $\mathcal{G}$ — the
compositional operators of `STATE_SPACE_SPEC.md` §4, continuous activation
$\alpha \in [0,1]$, emergent channels (§PN.5) — means the substrate's finiteness imposes
no finite bound on reachable behavior. This is §3's move (finite $P$, finite $O$,
unbounded generated structures) applied at automaton scale. Whether the *specific*
64-element vocabulary earns its keep is separate from whether a finite substrate *can*
generate unbounded behavior.

**Hypothesis discipline (H4 extension → H4b).** The fact that Human Design supplies the
blueprint does not establish that the blueprint is computationally privileged. The
implementation represents it first and then forces it to compete against controls, in
exactly the spirit of H3 (address utility, B.3) and H4 (dimensional correspondence, B.4):

$$\text{Performance}(\mathcal{G}_{HD}) > \text{Performance}(\mathcal{G}_{\text{shuffled}})$$
$$\text{Performance}(\mathcal{G}_{HD}) > \text{Performance}(\mathcal{G}_{\text{arbitrary}})$$

where $\mathcal{G}_{\text{shuffled}}$ preserves the 64-unit substrate but permutes gate
identities/structure, and $\mathcal{G}_{\text{arbitrary}}$ substitutes an unrelated
64-element substrate of comparable size. This is registered as **H4b** (§PN.10): the
source system is implemented seriously enough to be tested, and is refused the status of
being true by construction.

---

## PN.4 Five Dimensions as Projections / Perspectives

**Mechanism.** Movement, Evolution, Being, Design, and Space are *not* five independent
engines and not five copies of one topology. They are five projections over a shared
underlying state:

$$X \to \{X^{(\text{Movement})}, X^{(\text{Evolution})}, X^{(\text{Being})}, X^{(\text{Design})}, X^{(\text{Space})}\}$$

This inherits the base proposal's §7 claim as an empirical one:

$$\text{Representation}(X \mid D_i) \neq \text{Representation}(X \mid D_j)$$

— the object is invariant; its relational expression is not. Perspective change is a
named transition in the implemented lexicon: **PERSPECTIVE** (`◇`), operator `o_project`
(`STATE_SPACE_SPEC.md` §4, §7), $X^{(D_j)} = T_{i \to j}(X^{(D_i)})$.

**Round-trip test (mechanism of evaluation; hypothesis H8').** The proposal's §8 test is
adopted verbatim at personal/network scales. For a perspective transformation to count as
structure-preserving rather than lossy re-rendering:

$$T_{j \to i} \circ T_{i \to j} \stackrel{?}{=} \text{id}$$

The implemented involutions `o_reverse`, `o_inverse`, `o_converse` (Fu Xi variations;
`STATE_SPACE_SPEC.md` §4) are the first mathematically guaranteed round-trip cases and
serve as positive controls for the test harness itself. The dimensional $T_{i \to j}$ must
*earn* round-trip status empirically on held-out states; failure to recover $X$ within the
pre-specified equivalence criterion falsifies the claimed projection pair, not the state.

At world scale the same mechanism becomes five ways of experiencing one world (§PN.9):
$\text{World}(X, D_i) \neq \text{World}(X, D_j)$ with $X$ invariant. The round-trip
requirement is unchanged by the change of rendering medium.

---

## PN.5 Channels, Crossings, and Emergent Capability

**Mechanism (implemented).** The self-cultivation layering — local state, shared state,
persistent connections, temporary crossings, emergent channels, recursive growth — is made
mechanical in `src/mesh/channels.js` (`EmergentChannels`), the **reference semantics** for
this section. When a qualified packet crosses from automaton $A$ to automaton $B$, the
connection is recorded as a **crossing**. The promotion rule is:

$$\text{Crossing}(A,B):\ \text{uses}(A,B) \geq \theta_{ch} \Rightarrow \text{promote} \to \text{Channel}(A,B)$$

with the implemented threshold $\theta_{ch} = 3$
(`CHANNEL_PROMOTION_THRESHOLD = 3`). The lifecycle:

$$\text{temporary crossing} \xrightarrow{\text{repeated useful interaction}} \text{persistent channel} \xrightarrow{\text{registration}} \text{routable capability}$$

A promoted channel is itself a capability object — in the reference implementation, a
sequential composition `{tools: [A, B], compose: 'sequential'}` with identity
`channel:A~B`, use count, and promotion provenance (`createdSeq`, `promotedSeq` from an
internal monotone counter; no wall-clock, preserving deterministic replay per
Appendix D.1). Functionality has been produced *by the relationship*; neither member
automaton contains it independently.

**Properties carried over from the base calculus:**

1. **Evidence, not assertion.** A crossing's use count and packet keys are observational
   evidence; promotion is a deterministic function of that evidence, and decay follows the
   activation regime of §11 ($\alpha$ weakening → dormancy without deleting topology).
2. **Non-additivity.** Per §4, $C_{AB}$ is not assumed to decompose as $C_A + C_B$; the
   channel's behavior is measured, not inferred from its members.
3. **Inspectability.** Every channel carries derivation provenance — which packets
   crossed, in what order, under which contexts. A channel whose provenance cannot be
   reconstructed is not presented as an emergent capability (§15, H.13: $DI = 1$).

**Hypothesis boundary.** That repeated crossing *should* produce useful capability is the
testable content of H7' (§PN.10), not a consequence of the promotion mechanism. The
mechanism guarantees that *if* relational capability exists, it is recorded, promoted, and
inspectable — not that it exists.

---

## PN.6 Recursive Persistence Across Scales

**Mechanism.** The whole/part duality of §5 is preserved at every new scale introduced by
this addendum, $X_n = \text{whole}(X_{n-1})$, $X_n = \text{part}(X_{n+1})$. A completed
structure at one level becomes an available state or operand at the next, without the
lower levels disappearing:

$$\text{primitive} \to \text{Gate automaton} \to \text{channel} \to \text{person} \to \text{relationship} \to \text{group} \to \text{world} \to \text{network}$$

Constituents remain recoverable through the derivational hierarchy, $p \subset A \subset
P \subset R \subset G \subset N$. The larger object contains its constituents'
contribution and provenance while acquiring properties that exist only at the larger
scale (Appendix C.3: a composite becomes an operand for subsequent operations *without
losing its internal derivation*).

**Evidence persistence with a hard boundary.** Experimental knowledge follows the same
rule as state: an observation at a smaller scale is not discarded when the system operates
at a larger one; the chain $\text{Observation} \to \text{Evidence} \to \text{Hypothesis}
\to \text{Test} \to \text{Supported/Rejected}$ becomes part of the persistent evidence
history available to subsequent scales ($r = (\text{support}, \text{confidence},
\text{error}, \text{provenance})$, §16). An operator supported between primitives becomes
a *candidate* between automata, then between persons, relationships, groups, networks:

$$R_{\text{primitive}} \to R_{\text{automaton}} \to R_{\text{person}} \to R_{\text{group}} \to R_{\text{network}}$$

Its prior evidence travels with it. Its truth does not:

$$\boxed{\text{Persistence of evidence} \neq \text{automatic generalization of truth}}$$

Every new scale creates a new experimental claim (H.6 cross-scale holdout). Cynthia
remembers what was established below while independently testing whether it survives
above. This addendum adopts the following architectural invariant:

$$\boxed{\textbf{Nothing earns cross-scale status merely by being representable at multiple scales.}}$$

Cross-scale status is earned when state, provenance, derivation, and experimental evidence
persist upward *and* claimed invariants survive independent testing at the new scale.

**Progressive regression (mechanism).** Growth proceeds upward while explanation regresses
downward: $p \to A \to P \to R \to G \to N$ (growth), $N \to G \to R \to P \to A \to p$
(explanation). A network-level event must be inspectable through eight regression
questions:

1. What happened?
2. Which group relationship produced it?
3. Which people/automata participated?
4. Which channels were active?
5. Which states changed?
6. Which operators acted?
7. Which primitive structures ultimately contributed?
8. What evidence established those structures?

Complexity remains explainable downward even as capability grows upward. This is the
operational form of derivation integrity (H.13) at network scale.

**Qualified packets (mechanism).** Persistence across scales does not mean copying
everything everywhere. Higher scales receive qualified packets containing what the
receiving scale requires:

$$\text{Packet}(X, s_i \to s_j) = (\text{id}, \text{state}, \text{relation}, \text{evidence}, \text{provenance})$$

while detailed local history remains where it originated (proposal §10; implemented as
`src/mesh/packet.js`). A group can know that a member contributes capability $C$ without
receiving every private experience that produced $C$:

$$\boxed{\text{local individuality} + \text{shared structure} + \text{global learning}}$$

---

## PN.7 Personalization as Topology

**Mechanism.** Ordinary AI personalization approximates $\text{Model} + \text{user
profile} + \text{conversation history}$ — a shared engine with per-user annotations. The
proposed architecture instead gives each user a developing computational topology:

$$N_u(t) = (A_u,\ S_u(t),\ E_u(t),\ R_u(t),\ H_u(t))$$

where $A_u$ is the user's automaton set, $S_u$ active states, $E_u$ edges, $R_u$
relationships, $H_u$ interaction histories — all developing through use. Two users differ
not merely in prompt content but in active structure:

$$N_A(t) \neq N_B(t) \qquad \text{while} \qquad N_A, N_B \subseteq N_{\text{shared}}$$

The personal companion is, under this definition, an interface into a computational
environment whose topology grew through that person's experience — not a shared model that
remembers facts about them.

**Shared knowledge ≠ shared identity (principle).**

$$\boxed{\text{Shared knowledge} \neq \text{shared identity}}$$

The network can learn collectively without requiring local automata to converge onto the
same state. What propagates between $N_u$ and $N_{\text{shared}}$ is qualified structural
knowledge (§PN.6 packets, §PN.8); what stays local is the experiential history that
produced or received it. A shared network requires not identical participants but
propagated structure carrying enough evidence and provenance for independent local
validation.

**Hypothesis boundary.** That topology-level personalization beats profile-level
personalization is an empirical claim, evaluated with H3's control discipline: a
flat-profile control over the same engine, held-out tasks, and an ablatable
personalization layer per Appendix E ($S^{-N_u}$).

---

## PN.8 P2P Qualified-Knowledge Propagation

**Mechanism.** If useful structure can be discovered locally, the network can propagate
qualified structural knowledge without propagating the private experiential state that
produced it. Peer-to-peer propagation is therefore not merely an infrastructure choice; it
is the distribution form of the packet discipline:

$$N_i \xrightarrow{\text{discovery}} R^* \xrightarrow{\text{evidence} + \text{provenance}} N_{\text{shared}} \xrightarrow{\text{validation}} N_j$$

Concretely:

1. **Discovery at $N_i$.** A relational structure $R^*$ (e.g., a promoted channel)
   accumulates local evidence $r = (\text{support}, \text{confidence}, \text{error},
   \text{provenance})$ per §16.
2. **Qualification.** $R^*$ is packaged as a §PN.6 packet — never a memory copy (§10).
3. **Publication to the shared mesh.** The packet enters $N_{\text{shared}}$ with evidence
   state at most *hypothesized* for any receiver; "supported at $N_i$" does not transfer
   as "supported at $N_j$" (§PN.6 boxed principle).
4. **Independent validation at $N_j$.** Node $j$ tests $R^*$ against its own state and
   context, under the same metrics and controls as a locally discovered candidate.
   Receipt is an experiment, not an install.

**Hypothesis boundary.** That qualified-packet propagation preserves usefulness across
nodes — i.e., that $R^*$ survives independent validation at $N_j$ at rates above the
random-packet control — is an empirical claim evaluated under the H7' transfer condition
(§PN.10) and the discovery/validation/test separation of H.4. A propagated structure that
only works at its origin node is evidence *against* cross-node generativity, and is
recorded as such.

---

## PN.9 The Cultivation World Projection

**Mechanism (projection, not product).** The self-cultivation network may be expressed as
a persistent interactive world. The world is not a conventional game layered on top of the
system; it is another projection of the same underlying state space, in exactly the sense
of §PN.4:

$$\boxed{\text{Network State} \leftrightarrow \text{Playable World State}}$$

$$S_{\text{person}} \leftrightarrow S_{\text{automata}} \leftrightarrow S_{\text{world}}$$

Knowledge may become accessible territory; persistent relationships may appear as paths,
bridges, or channels; automata may manifest as characters, companions, organisms,
structures, or environmental forces; collaborative projects may become shared spaces;
newly discovered relationships may open previously unavailable routes. The visual
environment stays synchronized with the computational environment because both are
projections of one persistent state.

**The growth loop replaces XP.** A conventional game uses $\text{action} \to \text{XP}
\to \text{level}$. The cultivation world instead uses:

$$\text{experience} \to \text{state transition} \to \text{relationship change} \to \text{new possibility}$$

A world change is the interface representation of an actual topology change: when
$A + B + R_{AB} \to C_{AB}$ (a channel promotes per §PN.5), the world may gain a bridge,
ability, workshop, route, or collaborative space — because the underlying relationship
exists in the computational state, not because a level check fired. Logic of the form
`if level === 10: unlockBridge()` is not permitted; world affordances must be derivable
from mesh state or they are decoration excluded from experimental claims.

**Quests as experiments.** A quest is a developmental objective with the structure of an
experiment:

$$Q = (S_{\text{current}},\ S_{\text{target}},\ C,\ \mathcal{A})$$

— current network state, target state, context, available automata/relationships. Cynthia
constructs candidate pathways; the player's action produces evidence; evidence updates
state; the changed state changes the world:

$$\text{life} \to \text{Cynthia} \to \text{quest} \to \text{action} \to \text{evidence} \to \text{state update} \to \text{changed world}$$

The direction reverses: structure discovered through simulation or play becomes a
*hypothesis* for the person to test outside the game — $\text{Life} \rightleftarrows
\text{Simulation}$ — under the same evidence-status discipline as any candidate rule (§16).

**Multiplayer as network intersection.** Two players' worlds do not merge as "Player 1
joined Player 2." Their networks temporarily intersect:

$$N_A \cap N_B \to N_{AB}$$

The intersection can expose capabilities unavailable to either network separately —
temporary crossings, persistent channels, collaborative quests, shared structures. If the
relationship disappears, some functionality may disappear with it; if repeated interaction
stabilizes it, the crossing promotes per §PN.5. This is the operational definition of
*resonance* at network scale, and it is testable: $C_{N_{AB}}$ vs. $C_{N_A}$, $C_{N_B}$
are measured independently before any emergent claim is registered (H7').

**Gates' many expressions.** The computational object remains $G_i$ while its expression
depends on context, $E(G_i \mid C)$ — a character in one context, an environmental
mechanic in another, part of a puzzle elsewhere, an invisible state influencing another
automaton. State is fundamental; expression depends on relationship and context (§4). The
five dimensions similarly become five ways of experiencing *one* world:

$$\text{World}(X, D_{\text{Movement}}) \neq \text{World}(X, D_{\text{Being}}) \neq \text{World}(X, D_{\text{Space}})$$

with $X$ invariant, subject to the round-trip tests of §PN.4.

**Creator tools inside the world.** The IDE, projects, research experiments, and group
collaboration become places and objects within the world rather than disconnected
applications; a finished artifact is simultaneously an exported real object and an object
within the world. Cynthia is the calculus; the automata are the living computational
units; Resonance is the social/network scale; the Cultivation World is the embodied
interface; creator tools let development become real artifacts — all over one underlying
state system. This closes the cultivation loop:

$$\boxed{\text{Cultivate} \to \text{Discover} \to \text{Create} \to \text{Share} \to \text{Collaborate} \to \text{Experience} \to \text{Cultivate}}$$

**The network itself is the cultivation environment.** The world projection must also obey
recursive persistence (§PN.6): a bridge in the world corresponds to a derivable chain

$$\text{Bridge} \to \text{Channel} \to \text{Interactions} \to \text{Automata} \to \text{States} \to \text{Primitives}$$

and if the underlying relationship weakens or disappears, the world expresses that
transformation. The full recursive frame applies inside a Gate automaton, a personal
network, between two people, inside a group, inside the world, and across the network:

$$\boxed{\text{Experience} \to \text{State} \to \text{Relation} \to \text{Emergent Capability} \to \text{Action} \to \text{New Experience} \to \cdots}$$

**Hypothesis boundary.** That an embodied world projection improves developmental
outcomes, learning transfer, or engagement relative to a non-embodied interface over the
identical mesh is an empirical question, evaluated with the world layer ablatable
($S^{-\text{world}}$, Appendix E). The projection is mechanism; its claimed benefits are
not assumed.

---

## PN.10 Hypothesis Registry Additions

Format mirrors Appendix B of the base proposal. Each hypothesis records:

$$H_i = (\text{claim},\ \text{null},\ \text{metric},\ \text{test},\ \text{threshold},\ \text{evidence},\ \text{status})$$

with evidence states
$\text{unobserved} \to \text{observed} \to \text{inferred} \to \text{hypothesized} \to \text{tested} \to \{\text{supported}, \text{rejected}, \text{inconclusive}\}$.

### PN.10.1 H7' — Relational Capability (formerly "the decisive experiment")

**Claim.** A relation between automata can produce a capability that neither automaton
possesses individually, and that was not directly implemented as a dedicated tool. For task
$Q$ and automata $A, B$:

$$A(Q) = 0 \quad \wedge \quad B(Q) = 0 \quad \wedge \quad F(A, B, R, C, H)(Q) = 1$$

with $R$ established through interaction (e.g., a promoted channel, §PN.5) rather than
hard-coded as a hidden implementation of $Q$.

**Null.** Joint performance is fully explained by the sum of individual capabilities plus
generic composition: $F(A, B, R, C, H)(Q)$ is matched by $F(A, B, \varnothing)(Q)$ (no
relation), by $F(A, B, R_{\text{shuffled}})(Q)$ (structure-preserving but permuted
relation), or by a flat-lookup baseline that memorizes $Q$.

**Metric.** Relational lift
$\Delta_R = \text{Perf}\big(F(A,B,R,C,H)(Q)\big) - \max\big(\text{Perf}(A(Q)), \text{Perf}(B(Q)), \text{Perf}(F(A,B,\varnothing)(Q))\big)$,
plus derivation integrity $DI = 1$ for every successful joint run (H.13), plus special-case
burden $SCB$ for the relation itself (H.8).

**Test.** Three pre-registered conditions:
1. **Ablation:** $F(A, B, \varnothing) \to ?$ — removing $R$ must destroy the capability
   reproducibly ($\Delta\text{Performance} > 0$, Appendix E).
2. **Control:** $F(A, B, R_{\text{shuffled}}) \to ?$ — a permuted relation over the same
   automata must not reproduce the capability.
3. **Transfer:** $F(C, D, R) \to Q'$ — the same relational operator applied to different
   operands must produce analogous useful functionality on a held-out task pair.

**Threshold.** Pre-registered before running: $\Delta_R$ positive and statistically
reproducible across seeds on the held-out split, with conditions (1)–(3) all satisfied;
the transfer condition (3) is required for any *cross-scale generativity* claim — success
on (1)–(2) alone supports relational capability at one scale only.

**Falsification.** H7' is weakened if ablation does not degrade performance ($R$ was
decorative), if the shuffled control matches the candidate ($R$'s structure carries no
information), if $R$ is found to encode $Q$ beforehand (violating §15's emergence bar), or
if no relational operator transfers to held-out operand pairs (the result was storage, not
generation).

### PN.10.2 H8' — Perspective Round-Trip Preservation

**Claim.** Dimensional perspective transformations preserve recoverable structure:

$$T_{j \to i} \circ T_{i \to j} \approx \text{id}$$

within a pre-specified equivalence criterion, for states at scales $L_7$–$L_{12}$ and for
world projections $\text{World}(X, D_i)$.

**Null.** Perspective transformation is lossy re-rendering: round-trip reconstruction
error for the candidate $T_{i \to j}$ is not better than for a random invertible
re-parameterization control.

**Metric.** Reconstruction accuracy
$\text{Rec}(X) = \text{Similarity}\big(X,\ T_{j \to i}(T_{i \to j}(X))\big)$ per H.8, with
exact equality where the domain is symbolic; plus an invariant-preservation score counting
which pre-registered properties survive the round trip.

**Test.** Round trips over held-out states at each scale, using the implemented
involutions `o_reverse`/`o_inverse`/`o_converse` as positive controls (the harness must
score them perfectly) and random projections as negative controls.

**Threshold.** Candidate round-trip error below a pre-registered bound and strictly below
the negative control on held-out states; positive controls must pass at exact equality.

**Falsification.** H8' is weakened if round-trip recovery fails systematically for
specific dimension pairs, if recovery succeeds only on discovery-split states, or if
"recovery" is achieved by storing $X$ alongside the projection (a provenance audit of
$\Delta$ checks this).

### PN.10.3 H4b — Blueprint-vs-Controls (extension of H4)

**Claim.** The Human-Design–derived 64-gate substrate $\mathcal{G}_{HD}$ produces
measurable performance advantages over comparable alternative substrates on tasks at
automaton scale and above.

$$\text{Performance}(\mathcal{G}_{HD}) > \text{Performance}(\mathcal{G}_{\text{shuffled}}),\qquad \text{Performance}(\mathcal{G}_{HD}) > \text{Performance}(\mathcal{G}_{\text{arbitrary}})$$

**Null.** The blueprint carries no privileged structural information: any 64-element
substrate of comparable size and connectivity performs equivalently once the machinery
(intake, mesh, channels, operators) is held fixed.

**Metric.** $\Delta_{\mathcal{G}} = M(\mathcal{G}_{HD}) - M(\mathcal{G}_{\text{control}})$
over pre-registered metrics $M$ (generation accuracy, novel composition rate, compression
gain, channel-promotion utility), per H.10/H.11.

**Test.** Fixed engine; only the substrate assignment varies. Controls:
$\mathcal{G}_{\text{shuffled}}$ (same 64 units, permuted gate/line structure),
$\mathcal{G}_{\text{arbitrary}}$ (unrelated 64-element vocabulary), and a reduced
substrate. Discovery/validation/test separation per H.4; advantages must reproduce on
held-out observations.

**Threshold.** $\Delta_{\mathcal{G}} > 0$ reproducibly across seeds and splits against
*all* controls; an advantage over exactly one control is registered as inconclusive.

**Falsification.** H4b is rejected if shuffled or arbitrary substrates match
$\mathcal{G}_{HD}$ on held-out tasks — a negative result that identifies the blueprint as
representable-but-not-privileged and is treated as informative per §19.

---

## PN.11 Open Questions (Preserved, Not Resolved)

The following remain **live research questions**. Nothing in this addendum or in the
implemented machinery resolves them, and no mechanism below should be read as implicitly
answering them:

1. **Orb / Delta / axon.** The treatment of orb (tolerance margins around precise address
   positions), the Delta construct, and axon-like channel anatomy in the source material
   has no settled computational interpretation. Candidate formalizations (orb as an
   activation-tolerance band in §11's $\sigma$; axon as the channel substrate of §PN.5;
   Delta as a difference operator) are unregistered speculations until individually
   hypothesized with nulls and metrics.
2. **DMS assignment.** The degree/minute/second precision constants of
   `STATE_SPACE_SPEC.md` §2 (gate = 20250 arc-sec, line = 3375 arc-sec, etc.) fix the
   *arithmetic* of the address wheel, but the assignment of empirical referents to DMS
   positions is an open calibration problem under H3/H6, not a settled mapping.
3. **Space discrepancy.** The fifth dimension, Space, is inconsistent across source
   descriptions (qualitative expression, Base/Tone/Color behavior, perspective vs.
   container role). Which formalization of $D_{\text{Space}}$ is operative is undecided;
   all Space-related projections (§PN.4, §PN.9) are provisional pending a registered
   resolution experiment.

Each open question inherits the protocol of Appendix H: no resolution is accepted without
a registered hypothesis, a null, pre-registered metrics, and held-out evaluation. The
architecture can *host* these questions without prejudging them.

---

## Status

*Status: specification addendum, sections PN.1–PN.11. This document extends the base
proposal's §10 (meshes) and §14 (cross-scale invariance) to the personal, relational, and
network scales, and extends `STATE_SPACE_SPEC.md`'s ladder to $L_9$–$L_{12}$.*

**Mechanism (implemented or specified-with-reference-semantics in
`pure-synthia-automata`):** intake and the tool-call grammar (`src/engine/intake.js`,
`src/grammar/`); the shared `AutomataMesh` with five graph projections
(`src/mesh/mesh.js`); qualified state packets (`src/mesh/packet.js`); crossing/channel
promotion at $\theta_{ch} = 3$ (`src/mesh/channels.js`); evidence triples
(`src/engine/triples.js`); the learning loop with `absorbExperience`
(`src/engine/learning.js`, `src/engine/synthia.js`); named transitions, activation,
complexity ledger, and derivation/replay per `STATE_SPACE_SPEC.md` §7, §12.

**Hypothesis (registered, not established):** H4b blueprint-vs-controls; H7' relational
capability at automaton/person/network scales; H8' perspective round-trip; the dimensional
correspondence itself (H4) and all Gate/Line/Color/Tone/Base assignments (H3); the claim
that personalization-as-topology outperforms profile-based controls; the claim that
qualified-packet P2P propagation preserves usefulness across nodes; and every
Cultivation-World benefit claim. All remain subject to the falsification criteria of §19
and the controls of Appendices E and H. No claim in this addendum is true by construction.
