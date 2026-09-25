const clone=x=>structuredClone(x);
export const EXTERNAL_CONCEPTS=Object.freeze([
  {id:'conway-automaton',source:'https://github.com/Conway-Research/automaton',concepts:['endogenous-heartbeat','audited-self-modification','versioned-lineage'],implementedBy:['organism/LivingLoop.mjs','organism/AutonomousRecursiveOrganism.mjs','runtime/SelfEditCoordinator.mjs','runtime/VersionLineageRegistry.js']},
  {id:'generative-episodic-memory',source:'https://pubmed.ncbi.nlm.nih.gov/35896150/',concepts:['sparse-episodic-trace','semantic-completion-without-fact-promotion'],implementedBy:['organism/GenerativeEpisodicMemory.mjs','organism/SubjectiveContinuity.mjs']},
  {id:'self-compile-android',source:'https://github.com/Tribler/self-compile-Android',concepts:['source-carrying-embodiment','local-rebuild-contract','verified-replacement'],implementedBy:['runtime/AndroidSelfCompileCapability.mjs','bootstrap/phone.mjs']},
  {id:'tribler',source:'https://github.com/Tribler/tribler',concepts:['decentralized-peer-exchange','partial-local-knowledge','resilient-gossip'],implementedBy:['organism/ReconciliationMesh.mjs','organism/IdentityBoundary.mjs']},
  {id:'dollynator',source:'https://github.com/Tribler/Dollynator',concepts:['autonomous-lineage','recursive-offspring-with-local-identity'],implementedBy:['core/SynthiaUnit.mjs','organism/RecursiveAutomataField.mjs']},
  {id:'cfrt',source:'https://github.com/Tribler/cfrt',concepts:['conflict-free-reconciliation','independently-owned-state'],implementedBy:['organism/ReconciliationMesh.mjs']},
  {id:'bnf',source:'https://github.com/Tribler/bnf',concepts:['lawful-generative-grammar','recursive-structure-production'],implementedBy:['organism/LawfulGrammarConstructor.mjs','organism/SelfConstructionEngine.mjs']}
]);
export class ExternalConceptRegistry{snapshot(){return clone(EXTERNAL_CONCEPTS)};}
export default ExternalConceptRegistry;
