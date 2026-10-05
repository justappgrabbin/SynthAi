# Supplied morph, automaton and memory sources

This inventory distinguishes working modules, integration boundaries and
unfinished implementations. A package name containing “morph”, “GAN” or
“VQ-VAE” does not establish that it generates images.

| Supplied file | What was inspected | Current use / boundary |
| --- | --- | --- |
| [Dream Habitat v0.4](https://drive.google.com/file/d/1iMkai1ewVPe3CdWww25nwLZ7RqSsyxi_/view) | Canonical runtime, five-substrate grammar, world/address/embodiment modules | Habitat and world verifications pass. Preserved grammar kernel now validates the local world request across all five projections. |
| [Morph Reskin v0.1](https://drive.google.com/file/d/1-YYq1j6u4k0vMuuF1_NL4P0bunv3IpC2/view) | Landmark/skeletal surface interpolation and sprite runtime | Supplied surface engine is in `donors/phone-morph`. It morphs known endpoints; it does not synthesize arbitrary photorealistic endpoints. |
| [Canonical Morph Integration v0.5.7](https://drive.google.com/file/d/1p_TF-_6NYXO3UtcbM_Z49_Dx3zWkCAFb/view) | Address/state/relationship/temporal/perception packet and surface adapter | All 65 supplied `src` files exist in Hover; 63 match byte-for-byte. The two differences are later code and must be reviewed rather than overwritten blindly. |
| [Persistent Morphing Player, runtime-wired](https://drive.google.com/file/d/1uNYGqKrT9dzXYkOvYpcK0RPucLVpKA8k/view) | Stable player identity, extracted facial anchors, species-dependent SVG renderer, generative client | Useful identity/rendering implementation. Photorealistic output requires a configured generation provider; without one it writes a prompt package and throws. Not yet mounted in Venom. |
| [Resonance Morph Runtime Build](https://drive.google.com/file/d/17wq1E4yuBI5ZK_2vcXnFdQkPFYpQw0Bb/view) | VFS intake, AST contracts, heuristic classification and mutation proposals | Relevant to the deferred ingestion work. Source explicitly distinguishes mutation proposals from backend execution. |
| [Addressed Picture Memory](https://drive.google.com/file/d/1932803_e4eUPIRTgBhPqkRPcZmonT3-i/view) | Immutable addressed-state snapshots, ambiguity-preserving recall, atomic Linux persistence | Supplied test passes 8/8 checks. Stores a picture of a state configuration; does not transform a photograph. Admission requires complete registered addresses; raw unknown chart fields must not be fabricated to admit them. |
| [Predictive Memory v0.1](https://drive.google.com/file/d/12z2RvTQmQfoSldvWasPCtRGNGyoFmrsz/view) | Small locally trainable VQ-VAE, semantic completion, prediction/outcome calibration and learned relation weights | Verification passes. This is coordinate/episodic memory, not an image generator. Its nine categorical layers and six-base schema require a reviewed adapter for the current five-base/full-address system. Not yet used for phone memory inference. |
| [Cynthia Phase 1 Memory](https://drive.google.com/file/d/1ySDyhVfzZE4MjABkYxevVMk0RnFDJWib/view) | Conversation provenance, inheritance, source-pattern proposals | Proposed changes are staged separately; this is memory/build tooling, not pixel synthesis. |
| [Kimi Morph Memory Agent](https://drive.google.com/file/d/1q7PuCYM9wi9FoAO392Jp7s_wi1w1lHsU/view) | File-observation messages, intent and persisted configuration | Message/state agent; no identity-conditioned visual generation weights. |
| [DNA/RNA/Protein patch v0.5.3](https://drive.google.com/file/d/1tYkyCCtfDnABh8rFWMXIog7torSZWbuo/view) | Biological translation modules | All seven supplied source files exist in Hover, with later differences in five. Older patch must not replace later runtime wholesale. |
| [Relational Algebra patch v0.5.5](https://drive.google.com/file/d/1CDtHzFKuEL2-2VORXpFhH7h4q2kkbaOo/view) | Relationship modules | All seven supplied source files exist in Hover, with later differences in four. |
| [ATO MCP, fixed](https://drive.google.com/file/d/1PICVzJDAQJ8XHZVQU66g64bssk95ao4J/view) | ATO automaton/mesh execution, inspection and Klein transitions | Real execution/inspection bridge; not picture generation. A supplied MCP interface is not required to replace Cynthia's local core. |
| [Executable Architecture Trace](https://drive.google.com/file/d/1jfFOlPEwUITyE2va-43bfwRitPh7M2a2/view) | Trace, codon tests and nested tool-factory/ATO/state-space packages | Factory explicitly uses eight bounded structural runtimes; it does not claim arbitrary algorithm synthesis. Nested archive names were inspected for additional generation/model sources. |
| [CharacterEngine](https://drive.google.com/file/d/18dAXH9ai5vJ8g6YAITJfKU_omrNM2hjd/view) | Unity C# traits, needs, emotions, relationships and activity selection | Source describes an unfinished life-simulation prototype. Useful behavioral components; not a picture morph generator. |
| [agent.zip](https://drive.google.com/file/d/1rPgANG6duBFhMwJmXnS9WniLM6inFuYo/view) | FreeSO .NET interface and Astronomia | Simulation/API and astronomical components; no inspected picture-generation model. |
| [AgentVerse](https://drive.google.com/file/d/1oILNSXrfrwG0UUgq5TcAseaolte2emLp/view) | Python simulation/task framework and providers | Explicitly LLM-based. It is not being substituted for the contact automaton. |
| [humanagent](https://drive.google.com/file/d/1cgu81_cIX6iW4wKRbWXjp2qakC4LqCnD/view) | .NET simulation components, Human Design GameGAN and codon scenes | Python GameGAN calls missing training/dynamics implementations; no working visual generation model established. |
| [Let's try to make an agent](https://drive.google.com/file/d/1GA8-VoCrKbnrbzzlO_Sv2gyxiYQjV7r7/view) | SynthDevBot notebook, code assembly and feature scaffolding | Development assistant/source assembly, not a standalone phone visual-generation engine. |

## Modelmaker

The supplied [Hugging Face Space](https://huggingface.co/spaces/stellarproximology/Modelmaker)
and [Modelmaker-repair](https://github.com/justappgrabbin/Stellarproximology-lab/tree/main/Modelmaker-repair)
were inspected. The Space source generates a text-model trainer; the repair is
a PyTorch GPT-2 text trainer. They do not currently expose a phone image-morph
trainer or a trainer for the supplied episodic-memory organ. No claim is made
that they were repaired, deployed, or trained by this phone-runtime revision.

## Five-field correction

Swarm units no longer cycle through one dimension at a time. Movement, Evolution,
Being and Design retain simultaneous macro/micro source descriptions and operator
qualities. Space is represented as the observer, as directed by the user. Weighted
feedback/harmonic relationships and the complete 64-hexagram structural vocabulary
are retained, without inventing missing personal chart coordinates. These operator
values are the supplied symbolic runtime rules; task-specific competence learning
and scheduling are not established merely by attaching those values to a particle.
