# External patterns used in r21.12

No external repository source code is vendored into Synthia by this pass. These projects are engineering references; Synthia implements dependency-free local equivalents or capability contracts so her identity and architecture stay her own.

- Conway Research Automaton — continuous lifecycle, heartbeat, audited self-modification, lineage/replication concepts: https://github.com/Conway-Research/automaton
- Fayyaz et al., 2022, *A Model of Semantic Completion in Generative Episodic Memory* — sparse episodic trace + semantic completion principle: https://pubmed.ncbi.nlm.nih.gov/35896150/
- Tribler self-compile-Android — proof that a phone app can carry source and rebuild/package/install a changed embodiment locally: https://github.com/Tribler/self-compile-Android
- Tribler — decentralized peer-to-peer discovery/communication and resilience reference: https://github.com/Tribler/tribler
- Dollynator — autonomous lifecycle, lineage and replication reference: https://github.com/Tribler/Dollynator
- CFRT/BloomCRDT — conflict-free replicated state and spatial reconciliation reference: https://github.com/Tribler/cfrt
- BNF — explicit grammar tree / lawful generative structure reference: https://github.com/Tribler/bnf

Operational mapping in this package:
- heartbeat/audit/lineage -> existing LivingLoop + VersionLineageRegistry + morph lineage
- generative episodic memory -> organism/GenerativeEpisodicMemory.mjs
- local self-build -> runtime/AndroidSelfCompileCapability.mjs + existing bootstrap/self-install path
- decentralized reconciliation/gossip/CRDT -> organism/ReconciliationMesh.mjs
- recursive autonomous lineage -> existing morphs + organism/RecursiveAutomataField.mjs
- lawful grammar generation -> organism/LawfulGrammarConstructor.mjs + organism/SelfConstructionEngine.mjs

- upload-as-organism-event -> organism/UploadMorphCoordinator.mjs
- local-human/global-hexagram membrane -> organism/IdentityBoundary.mjs
- audited self-edit proposal contract -> runtime/SelfEditCoordinator.mjs + existing local MCP Chair verifier/rollback
- live concept registry -> runtime/ExternalConceptRegistry.mjs
