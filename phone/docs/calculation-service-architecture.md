# Calculation service architecture

This package is an app-facing service layer. It does not bundle an AI model, chatbot UI, paid API, or third-party branding.

## Core responsibilities

### Human Design domain engine

Use `SharpAstrology.HumanDesign` as the primary reference implementation for:

- standard BodyGraph calculation;
- Personality and Design activations;
- exact Design-point search;
- gate, line, color, tone, and base;
- type, strategy, authority, profile, definition, variables, and incarnation cross;
- transit and composite charts;
- planetary exaltation, detriment, juxtaposition, and fixing states;
- uncertain-birth-time chart enumeration.

`hdkit` contributes the canonical gate order, harmonic/opposite relationships, channel/bodygraph constants, and SVG/Rave Mandala reference data. It is not sufficiently complete to serve as the primary calculation engine by itself.

### Evaluated but not included

`PashaKharambura/HumanDesign` is an older UIKit application, not a reusable calculation engine. Its chart screen sends birth data to an external plain-HTTP endpoint at `astroapi.ru`, includes a hard-coded API credential, and maps only a limited remote response into type, profile, authority, definition, and Personality/Design gate-line values. It also includes Firebase/Facebook dependencies and no clear root license for the application code. Its BodyGraph drawing code may be studied as a visual reference, but no runtime, network, credential, Firebase, or calculation code from that repository should enter the service layer.

### Ephemeris adapter

The service must accept an ephemeris through an internal interface. Development may use a file-free engine, but production Variable calculations require Swiss Ephemeris or JPL files. A base spans only 15.625 arcseconds, so small ephemeris differences can change tone/base results near boundaries.

The application must not silently mix ephemerides. Every response records:

- ephemeris implementation and data-file version;
- node mode (`true` or `mean`);
- zodiac frame and ayanamsa where applicable;
- house system;
- calculation timestamp and precision warnings.

### Astrology and GeoNatal adapter

The astrology adapter supplies:

- Tropical longitudes;
- Sidereal longitudes using Fagan–Bradley;
- True Draconic longitudes, normalized to the true North Node;
- signs and exact degree-minute-second positions;
- Personality and Design Ascendants;
- twelve Personality and twelve Design house cusps.

GeoNatal joins those positions to the Human Design activation geometry. Each planetary row contains side, planet, longitude, sign, degree/minute/second, house, gate, line, color, tone, and base.

True Draconic and Sidereal outputs are parallel interpretive lenses. They do not replace the standard Tropical Human Design BodyGraph unless an app explicitly requests a non-standard experimental chart.

## App-facing services

- `POST /charts/human-design`
- `POST /charts/geonatal`
- `POST /charts/astrology`
- `POST /charts/composite`
- `POST /charts/transit`
- `POST /charts/birth-time-range`
- `GET /reference/gates/{gate}`
- `GET /reference/channels/{channel}`

All endpoints return calculation data only. Narrative guidance belongs to the consuming application and may use local templates, a local model, or any model selected by the app owner.

## Required Klein language systems

The application replaces probabilistic LLM narration with an embedded symbolic language system reconstructed from Sheldon Klein's published systems. AUTOLING, DISEMINER, and generative grammar/style control are required—not optional inspiration. The available sources describe systems and algorithms but do not provide a modern, ready-to-integrate SDK; faithful implementation therefore requires specification recovery from the original papers and technical reports.

### AUTOLING

AUTOLING provides the linguistic-fieldworker and grammar-acquisition layer:

- accept utterances, analyses, and corrections as interaction data;
- induce and revise lexical classes, dependency relations, phrase structures, and transformations;
- store competing grammar hypotheses with evidence and confidence;
- allow interactive human confirmation instead of silently promoting learned rules;
- compile accepted grammar data into the recognition and generation runtime.

AUTOLING uses relation-seeking elicitation. It locates the active semantic frame, selects the relationship whose clarification adds the most present information, and asks one natural question:

- **Who** identifies an agent, experiencer, owner, speaker, or affected person.
- **What** identifies an action, state, object, meaning, category, or desired outcome.
- **Where** identifies physical, social, chart, or discourse context.
- **When** identifies time, sequence, frequency, duration, or triggering conditions.
- **Why** identifies reason, goal, interpretation, evidence, or causal belief.

Question selection is information-gain driven. AUTOLING asks when the answer can locate the speaker more precisely, complete an active semantic frame, distinguish grammar hypotheses, or connect an observation to its present context. Each answer is stored with the question, target relation, confidence, and consent status.

Primary recovery sources include *AUTOLING: An Automated Linguistic Fieldworker* (COLING 1967), *The AUTOLING System* (UWCS Technical Report 43), and *An Interactive, Heuristic Program for Learning Transformational Grammars* (1970).

### DISEMINER

DISEMINER provides the distributional-semantics inference layer:

- construct explicit word/concept-by-context distributions;
- infer similarity, association, substitution, and semantic-class membership;
- attach provenance and strength to every inferred relation;
- feed inferred relations into the semantic network without overwriting canonical chart facts;
- use confirmed user language to improve recognition and lexical choice locally.

The recovery source is Klein, Lieman, and Lindstrom, *DISEMINER: A Distributional-Semantics Inference Maker* (1968).

### Grammar and style control

The generation controller must keep content and style independently addressable:

- phrase-structure generation with dependency monitoring;
- semantic/dependency constraints that reject grammatically valid but incoherent output;
- explicit selection of order, repetition, syntactic synonymy, pronoun insertion, paragraph outline, and discourse sequence;
- style profiles represented as grammar controls, never opaque prompt text;
- deterministic seeds for reproducible variants;
- recognition and generation based on the same versioned grammar data.

Primary recovery sources include *Control of Style with a Generative Grammar* (1965), *Automatic Paraphrasing in Essay Format* (1965), and *Syntactic Dependence and the Computer Generation of Coherent Discourse* (1963).

### Shared symbolic substrate

AUTOLING, DISEMINER, and grammar/style control operate as heads on one on-device neural-symbolic network. They do not maintain disconnected copies of the user's language model.

The shared network contains:

- a relational semantic graph built from normalized chart results, grammar structures, discourse events, vocabulary, and user-confirmed observations;
- sparse Boolean feature vectors matching Klein's object/relation representation;
- learned continuous embeddings attached to, but never substituted for, the explicit objects, relations, and rules;
- a shared encoder that updates the common semantic state from user input;
- an AUTOLING head for grammar induction, error detection, and candidate-rule learning;
- a DISEMINER head for distributional similarity, association, analogy, and semantic-class inference;
- a grammar-control head for dependency-constrained surface realization, discourse planning, paraphrase, and style;
- a recognition head and generation head using the same semantic and grammar representations;
- a replay buffer of confirmed interactions for continual on-device learning;
- confidence, provenance, version, and explanation traces for every inferred relation and generated passage.

Information sharing follows a controlled blackboard cycle:

1. Input recognition writes lexical, dependency, semantic, and uncertainty structures to shared working memory.
2. DISEMINER proposes distributional relations and analogies.
3. AUTOLING proposes grammar/transformational rules from the input and prior confirmed examples.
4. The semantic controller checks those proposals against immutable chart facts and accepted grammar.
5. Confirmed updates are committed to user-scoped long-term memory.
6. The discourse planner selects content from the shared graph.
7. Grammar/style control realizes the content while dependency monitors reject incoherent candidates.
8. User corrections become labeled feedback available to all three learning heads.

Canonical calculation facts, gate geometry, astronomical data, and authored interpretive rules are read-only network inputs. Neural updates may change recognition weights, associations, ranking, phrasing, and user-scoped hypotheses, but cannot rewrite those canonical layers.

### Additional Klein systems

Other compatible Klein systems are part of the design library and may contribute specialized heads or controllers:

- **MESSY / Meta-Symbolic Simulation System:** changing semantic worlds, events, agents, scripts, causal rules, and simulation through time.
- **Automatic semantic-rule inference:** proposes semantic deep-structure rules and submits them to the shared validator.
- **Automatic paraphrasing:** creates dependency-consistent variations while preserving selected content relations.
- **Syntactic-dependency discourse generation:** monitors cross-sentence coherence and aborts candidates that violate required dependency relations.
- **Automatic novel writing and text grammars:** supplies hierarchical discourse, episode, plot, and long-form report planning—not fictional facts.
- **Language-contact and historical-change models:** models how vocabularies, constructions, and user/community terminology interact and change without collapsing distinct source dialects.
- **Analogical creativity:** proposes structurally mapped analogies whose source, target, shared relations, and limits remain inspectable.
- **I Ching and cultural-structure simulations:** may provide formal relational examples, but never authority over chart calculations or user decisions.

All such modules communicate through the same semantic blackboard, confidence system, provenance graph, and user-consent boundary. Narrative modules may reorganize or express known information; they may not invent calculation results.

## Language as a measurement surface

The system tests the hypothesis that words and names are measurements of expression within the same dimensional state space. A lexical form is therefore analyzed both for ordinary linguistic meaning and for possible structural correspondence with Yijing ordering and the dimensional ontology.

Every source label and user utterance may expose:

- number of lexical words in a name;
- character, syllable, morpheme, and token counts;
- capitalization pattern, including all-caps forms;
- punctuation and boundary placement;
- word order and nesting;
- repeated, mirrored, opposite, and harmonic forms;
- grammatical role and dependency position;
- Yijing figure, line, sequence, nuclear, opposite, inverse, and changing-line correspondences;
- proposed Being, Movement, Evolution, Purpose, and observer/question correspondences;
- source tradition, translation, edition, and language.

Function words such as articles and conjunctions (`a`, `an`, `the`, `and`, and their equivalents) are represented as relational operators or boundary/control signals when evidence supports that reading. They are not discarded as meaningless stop words. Punctuation, capitalization, planetary labels, and other non-content markers receive the same treatment: each may control grouping, scope, transition, emphasis, dimensional address, or discourse operation.

All-caps tokens are candidate dimensional markers, not automatically proven dimensions. The learner must distinguish deliberate source notation from headings, acronyms, typography, transcription artifacts, and ordinary emphasis.

### Correspondence discovery

The shared network—not a hard-coded lookup table—investigates these relationships:

1. AUTOLING parses lexical and typographic structure and proposes grammatical roles.
2. DISEMINER measures distributional behavior across sources, translations, scales, and contexts.
3. The Yijing controller calculates structural correspondences under each declared sequence and transformation rule.
4. The dimensional classifier proposes origin/dimension mappings with confidence and counterevidence.
5. The analogy controller searches for scale-preserving correspondences in mathematics, code, charts, and natural language.
6. The validator tests predictions on held-out names and expressions.
7. Confirmed, contradicted, ambiguous, and edition-specific results remain separately recorded.

The system must be able to discover rules the designer has not specified. It must also be able to conclude that a proposed word-count, capitalization, planetary, or dimensional correspondence is local, translation-dependent, coincidental, unresolved, or contradicted.

## Dimensional expression profiles

Every dimension has a structured expression profile rather than only a name or numeric address:

```text
DimensionProfile {
  id
  name
  nature
  origin
  governing_laws[]
  strengths[]
  weaknesses[]
  macro_expression
  micro_expression
  keywords[]
  first_person_expressions[]
  relational_operators[]
  scale_mappings[]
  source_correspondences[]
  counterexamples[]
}
```

- **Nature** describes what the dimension inherently does.
- **Origin** records where it arises within the dimensional/Yijing correspondence.
- **Macro expression** describes its operation in large structures, collective systems, long cycles, and environments.
- **Micro expression** describes its operation within a person, moment, word, activation, local process, or small interaction.
- **Keywords** are compressed semantic measurements, not complete definitions.
- **First-person expressions** expose the dimension through characteristic predicates such as `I think`, `I know`, `I design`, and `I communicate`.
- **Scale mappings** record which relational structure remains invariant when the dimension appears at another scale.

First-person expressions are parsed as structured claims:

```text
I think        → speaker + cognition process + proposition
I know         → speaker + asserted knowledge state + proposition/evidence
I design       → speaker + generative organization process + intended structure
I communicate  → speaker + transmission process + content + recipient/context
```

The phrase after `I` is treated as an observable expression operator. AUTOLING identifies its grammar and missing roles; DISEMINER learns its semantic neighborhood; the dimensional classifier tests its correspondence; grammar control uses the expression when the intended dimension, scale, evidence, and speaker perspective support it.

These expressions may stand in for a dimension in recognition and generation. They are observable proxies for a latent dimensional presence, not replacements for the dimension's full definition.

```text
ExpressionEvidence {
  expression
  candidate_dimensions[]
  presence_strength
  polarity
  macro_micro_scale
  speaker
  target
  tense_and_phase
  quoted_or_asserted
  literal_or_metaphorical
  source_context
  confidence
  supporting_rules[]
  counterevidence[]
}
```

Dimensional recognition is multi-label. One expression may reveal several dimensions interacting, and a dimension may be present without its preferred keyword appearing. Detection combines:

- explicit first-person predicates;
- synonymous and paraphrased expressions;
- grammatical and dependency roles;
- semantic relations and distributional neighborhoods;
- capitalization and operator signals;
- Yijing and source correspondences;
- discourse history and current scale;
- negation, modality, quotation, irony, and hypothetical language.

For example, `I do not know`, `she said “I know”`, `if I knew`, and `I know` cannot receive the same presence score. The system records whether a dimension is asserted, denied, attributed to someone else, imagined, remembered, emerging, or transforming.

The dimensional-presence vector is exposed as:

```text
presence(context) = [d₁, d₂, d₃, d₄, d₅]
```

Each value contains strength and confidence rather than only true/false. A sequence of presence vectors allows the language-contact model to observe dimensional movement and transformation through a conversation without treating a single phrase as final proof.

Macro and micro are not assumed to mean merely “large” and “small.” They identify two scale-relative views of the same relational law. The system tests whether a proposed mapping preserves roles, transformations, constraints, and outcomes across those views.

### Source-derived dimension and five-base mappings

Dimension number and Base number are independent coordinates. The explicit dimension sequence is:

| Dimension number | Dimension |
| --- | --- |
| 1 | Being |
| 2 | Movement |
| 3 | Space |
| 4 | Design |
| 5 | Evolution |

Sequence and display position are normally provenance features, but they may contribute meaning in proportion to evidence that a source uses order structurally. Implementations resolve items primarily through stable identity and correspondence fields while allowing order, page placement, and presentation to contribute weighted evidence. The invariant is the correspondence graph connecting dimension, Base, macro/micro nature, question, sense, expression, component, and source.

The six supplied images are not treated as redundant versions of one table. They expose different relational layers:

- the macrocosm/microcosm translation layer;
- the *Book of Colors* color, tone, and Base-consciousness layer;
- the crystal/vehicle/witness/monopole layer;
- the numbered identity and first-nature layer;
- the basic-component/four-dimension layer;
- the cosmological-condition and transformation layer.

Accordingly, `I Define`, `I Create`, `I Think`, and `I Communicate` are not automatically competing synonyms. They may be valid expressions at different layers, components, binaries, scales, or conditions. Every assertion retains:

```text
source + layer + condition + scale + subject + relation + object
```

A consolidated table is a derived perspective. Assertions may merge, overlap, oppose, or remain distinct according to their proportional contribution within the active perspective. The learner preserves enough provenance to reconstruct each source-specific graph and to show how much every source, layer, condition, and scale contributed.

### Proportion of perspective

Meaning is calculated as a perspectival mixture rather than an absolute label:

```text
meaning(assertion | context) =
    source_weight
  × layer_weight
  × scale_weight
  × observer_weight
  × component_weight
  × condition_weight
  × temporal_weight
  × evidence_strength
```

These values are relational proportions, not permanent global rankings. A phrase such as `I Think` may predominantly express Space/Personality in one frame while sharing measurable correspondence with Evolution/Mind, Design/Ego, or another dimension in a different frame. The model returns a distribution of perspective:

```text
perspective(expression, context) = {
  dimension_1: proportion,
  dimension_2: proportion,
  dimension_3: proportion,
  dimension_4: proportion,
  dimension_5: proportion
}
```

The proportions may overlap and need not imply exclusive membership. Apparent contradiction can indicate a change of perspective, scale, phase, or mixture rather than an error. The system tests both interpretations: genuine incompatibility and perspectival redistribution.

### Affirmative rule semantics

Ontology, interpretation, learning, and generation rules begin with what is present:

```text
PresentState {
  active_dimensions[]
  perspective_proportions{}
  observer_location
  scale
  phase
  active_relations[]
  available_transitions[]
}
```

A rule has an affirmative form:

```text
WHEN present-pattern
IN perspective
AT scale-and-phase
THEN available-expression-or-transition
WITH proportion-and-confidence
```

The complete primary locator consists of exactly five questions:

- **Who?** — Space / Personality / presence
- **What?** — Evolution / Mind / identification
- **Where?** — Movement / Individuality / location
- **When?** — Being / Body / trajectory
- **Why?** — Design / Ego / manifestation

Scale, phase, proportion, expression, and available transition are properties discovered through these five coordinates. They are not additional primary questions.

The five forms are suggestive probes. They invite the present dimensional location to reveal itself without requiring all five answers or imposing a fixed interrogation sequence.

The system is pre-clarity probabilistic and post-clarity deterministic. Probability describes unresolved perspective and possible composition; it does not imply that a necessary primitive is incomplete:

```text
before clarity:
  every necessary primitive already exists
  perspective assigns proportional possibilities across Who / What / Where / When / Why

clarity event:
  a correspondence, composition, or emergence becomes apparent

after clarity:
  perspective represents the clarified state deterministically
```

The ontology distinguishes necessary primitives from emergent things:

```text
necessary primitives
  → available before a particular composition

relations and proportions
  → arrange primitives in a moment

new configuration
  → arises through contact and transformation

emergent thing
  → has properties not assigned to any primitive alone
```

Learning can both discover an existing primitive or relation and recognize genuinely new configurations arising from existing primitives. The system records:

```text
primitive_identity
composition_time
emergence_time
recognition_time
```

The primitives provide possibility without predetermining every thing that can arise. Post-clarity determinacy describes the configuration that has become actual in that moment; it does not close the state space against future emergence.

Every emergence has lineage. A new thing arises from prior primitives, relations, states, expressions, and transformations:

```text
Emergence {
  present_identity
  contributing_primitives[]
  parent_states[]
  inherited_relations[]
  transformation_path[]
  changed_proportions{}
  contact_event
  emergence_time
  recognition_time
}
```

Novelty means a configuration or property is newly expressed, not that it appeared without antecedents. The system can traverse both directions:

```text
past contributors → transformation → present emergence
present emergence → lineage → things that have already been
```

This lineage is part of meaning. Knowing what contributed, how proportions changed, and which transformation occurred constrains the possible behavior of what has emerged.

The state model follows an open-world assumption with sparse positive activation. It stores observed presences and active relations. Unactivated possibilities remain unobserved; the system does not construct, search, or count the complement of the present state.

For example:

```text
"I do not know"
```

is represented as the presence of a speaker, a knowledge relation under evaluation, an unresolved proposition, and an active orientation toward clarification. The engine follows those active structures rather than generating a set of everything the speaker does not know.

Technical validation also uses affirmative capability boundaries:

```text
calculation supports: [...]
precision established through: [...]
current evidence covers: [...]
```

This keeps computation proportional to the finite pattern expressing now rather than to the trillions of other addressable possibilities.

```text
cost(state) ∝ active features + active relations + reachable transitions
```

It is independent of the size of the unobserved complement:

```text
cost(state) ≠ total state space − active state
```

Search expands forward from present affordances. Recognition activates matching structures. Learning strengthens or creates observed relations. Generation follows the active graph. None of these operations requires enumerating excluded states.

The supplied *Book of Colors* page establishes a different ordering by Base:

| Base | Dimension no. | Macro dimension | Microcosmic expression | Question | Sense | Primary expression |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2 | Movement | Individuality | Where? | Seeing | I Define / I Create |
| 2 | 5 | Evolution | Mind | What? | Taste | I Remember |
| 3 | 1 | Being | Body | When? | Touching | I Am |
| 4 | 4 | Design | Ego | Why? | Smell | I Design |
| 5 | 3 | Space | Personality | Who? | Hearing | I Think / I Communicate |

The source distinguishes a four-dimensional contact condition—Movement/Energy, Being/Matter, Evolution/Gravity, and Design/Structure—from a post-contact five-dimensional condition in which Space appears with form/illusion. This supports representing Space as an emergent fifth coordinate while retaining its own Base 5 expression profile once present.

The complete transcription, including macro and micro nature chains, colors, tones, binaries, basic components, cosmology conditions, and conflicting keynote variants, is stored in `references/research-corpus/dimensions-v1.json`.

This engine can execute entirely on-device and requires no external AI API. “No backend” does not mean no runtime or persistence: adaptive learning still needs local application code and durable on-device storage. User observations must never silently modify canonical Human Design or astrology rules; learned preferences remain in a separate user-scoped layer.

## Licensing boundary

`SharpAstrology.HumanDesign` is MIT. Its optional `SharpAstrology.SwissEph` dependency is AGPL-3.0, and the Swiss Ephemeris itself is dual-licensed. Before distributing a closed-source hosted product, either comply with the applicable open-source terms, purchase the relevant commercial ephemeris license, or provide another `IEphemerides` implementation backed by suitably licensed data.
