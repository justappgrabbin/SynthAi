# Klein System Recovery Notes

These notes treat Sheldon Klein's systems as implementation sources for a
compact, local neural-symbolic language-contact engine. They distinguish what
the archived papers explicitly describe from the design choices made for this
application.

## Verified principles from the source systems

### AUTOLING

- AUTOLING was conceived as an online program that conducts analytic
  interaction with a live informant.
- Its discovery procedures are heuristic: they form useful, testable
  hypotheses without claiming guaranteed success.
- Its stated aim is to formalize the working methods of a field linguist.
- Klein rejects exhaustive distributional processing as both combinatorially
  impractical and insufficient when text is the only input.
- Interaction with an informant supplies the evidence needed to test and
  refine a proposed grammar.

Application consequence: the guide should ask targeted **Who, What, Where,
When, Why** questions that discriminate among live hypotheses. It should not
fall back to the generic prompt "can you say more?"

### DISEMINER

- DISEMINER learns distribution classes for lexical items from processed text.
- Relations are stored as a dependency structure in matrix form.
- Stem types are stored once; their relations across the text point to that
  single entry.
- Stored relations include direct dependencies and possible transitive paths.
- The paper treats dependency analysis as a compact way to examine
  distributional potential beyond linear adjacency.
- Its semantic working assumption is relational: vocabulary and dependency
  relations included in one text can be connected to those in another.

Application consequence: retain a small shared graph of primitives,
expressions, sources, and observed relations. Learning should normally add or
reweight an edge rather than duplicate whole passages.

### Control of Style with a Generative Grammar

- A small set of rewrite rules constructs phrase and dependency structures.
- Local dependencies are accumulated as parsing rules are applied.
- Dependency trees can be stored as compact indexed lists.
- Closely related rules can be used for both analysis and generation.
- Generated language is constrained through vocabulary and dependency
  relations observed in a source text.

Application consequence: grammar control and style control should be
declarative rule data. The same rule inventory should support recognition and
generation, with a selected perspective controlling which valid realization is
preferred.

### Klein's later meta-linguistic description

Klein describes a shared representation with:

- objects and relations as the basic semantic units;
- relational structures nested inside objects;
- logical operators represented as relations;
- Boolean feature vectors attached to all units;
- bidirectional feature inheritance;
- semantic/syntactic production rules stored as data;
- the same rules usable for generation and recognition;
- multiple grammars coexisting in one system.

Application consequence: AUTOLING, DISEMINER, language contact, grammar
learning, semantic inference, and style control should be services over one
semantic state, not isolated model-shaped products.

## Biverse reconstruction

The phone-scale engine is organized around four compact stores:

1. **Primitive registry** — canonical dimensions, gates, lines, colors, tones,
   bases, astronomical positions, expressions, and source identities.
2. **Relation graph** — typed, weighted links with source provenance and
   emergence lineage.
3. **Hypothesis ledger** — competing interpretations and the evidence that
   changes their proportions.
4. **Grammar bank** — declarative recognition/generation rules and selectable
   style profiles.

The five dimensional questions are heuristic probes:

| Question | Dimension | Base | Microcosmic expression |
|---|---|---:|---|
| Who | Space | 5 | Personality / “I Think” / “I Communicate” |
| What | Evolution | 2 | Mind / “I Remember” |
| Where | Movement | 1 | Individuality / “I Define” / “I Create” |
| When | Being | 3 | Body / “I Am” |
| Why | Design | 4 | Ego / “I Design” |

They locate the proportions currently expressed. They are not an exclusion
checklist and do not enumerate everything that is absent.

## Learning cycle

1. Observe the user's wording, chart facts, chosen source, and moment.
2. Activate only supported positive features in the shared state.
3. Propagate support through typed relations and source-specific
   correspondences.
4. Maintain several hypotheses while clarity is incomplete.
5. Ask the highest-value Who/What/Where/When/Why question.
6. Reweight relations from the answer and preserve its provenance.
7. Once a clarity condition is met, resolve that interpretation
   deterministically.
8. Generate a response through the selected grammar and perspective profile.
9. Store genuinely new configurations as emergences whose lineage points back
   to existing primitives.

This implements the working law: **pre-clarity probabilistic,
post-clarity deterministic**.

## Guardrails for faithful implementation

- Never use absence as the default evidence.
- Keep conflicting source correspondences as contextual assertions.
- Preserve the observation that caused every learned edge or weight change.
- Do not silently turn metaphysical claims into scientific facts; store the
  claim, source, interpretation, and observed test separately.
- Prefer sparse tables, bitsets, indexed relations, and deterministic rules so
  the core can operate locally without a required backend.
- Treat a neural component as a pattern and weighting layer over the shared
  symbolic state, not as the owner of truth or memory.

## Primary sources reviewed

- Sheldon Klein et al., *The AUTOLING System*, UWCS Technical Report 43 (1968).
- Sheldon Klein, Stephen L. Lieman, and Gary E. Lindstrom, *DISEMINER: A
  Distributional-Semantics Inference Maker* (1968).
- Sheldon Klein, *Control of Style with a Generative Grammar* (1965).
- Sheldon Klein and M. A. Kuppin, *An Interactive, Heuristic Program for
  Learning Transformational Grammars* (1970).
- Sheldon Klein, *Computer Simulation of Language Contact Models* (1974).
- Sheldon Klein, *Automatic Inference of Semantic Structure Rules in
  Generative Semantic Grammars*.

