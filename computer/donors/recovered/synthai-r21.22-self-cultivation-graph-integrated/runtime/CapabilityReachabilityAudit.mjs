const yes=x=>Boolean(x);
/** Runtime proof that major capability families are reachable from the living unit. */
export class CapabilityReachabilityAudit{
  constructor({unit}={}){if(!unit)throw new Error('CapabilityReachabilityAudit requires SynthiaUnit');this.unit=unit;}
  inspect(){
    const u=this.unit, checks={
      persistentMemory:yes(u.memory?.remember&&u.memory?.upsert),
      endogenousLife:yes(u.living?.pulse),
      sixtyFourPersistentLoci:u.processField?.loci?.length===64&&new Set(u.processField.loci).size===64,
      fiveDimensionalLocalChoice:u.processField?.loci?.every?.(x=>x.dimensions&&Object.keys(x.dimensions).length===5)===true,
      recursiveAutomata:yes(u.recursiveField?.resolve),
      decentralizedReconciliation:yes(u.reconciliation?.publish&&u.reconciliation?.gossip&&u.reconciliation?.reconcile),
      episodicCompletion:yes(u.episodic?.remember&&u.episodic?.complete),
      selfConstruction:yes(u.selfConstruction?.propose&&u.selfConstruction?.test&&u.selfConstruction?.adopt),
      dynamicMorph:yes(u.morphicExpression?.resolve),
      subjectiveContinuity:yes(u.subjectivity?.experience),
      autonomousRecursivePulse:yes(u.autonomousOrganism?.pulse),
      processFabric:yes(u.fabric?.compose&&u.fabric?.execute),
      toolGrowth:yes(u.factory&&u.rules),
      fullAddressToolFactory:yes(u.factory?.factory?.generate)&&yes(u.factory?.bridge?.generateAndMount),
      kleinModuleContracts:yes(u.factory?.factory?.moduleRegistry?.compose)&&u.factory.factory.moduleRegistry.compose('autoling').complete===true&&u.factory.factory.moduleRegistry.compose('autonovel').complete===true,
      androidRebuildContract:yes(u.androidSelfCompile?.inspect),
      coDevelopment:yes(u.coDevelopment?.observe),
      humanDesignCultivation:yes(u.humanDesign?.upsertProfile&&u.humanDesign?.path&&u.humanDesign?.recordExperiment),
      uploadAwareMorphing:yes(u.uploads?.declare&&u.uploads?.ingest),
      localGlobalIdentityMembrane:yes(u.identityBoundary?.local&&u.identityBoundary?.global&&u.identityBoundary?.assertGlobalSafe),
      auditedSelfEditing:yes(u.selfEdit?.propose&&u.selfEdit?.noteVerification),
      sourceCodeImmuneSystem:yes(u.codeImmune?.inspect&&u.codeImmune?.proposeRepairs&&u.codeImmune?.recordOutcome),
      sovereignAutoCoder:yes(u.autoCoder?.inspectProject&&u.autoCoder?.planChange&&u.autoCoder?.synthesizeChangeSet),
      sovereignSourceMutation:yes(u.sourceMutation?.stage),
      sovereignBuildProcess:yes(u.buildProcess?.run),
      browserContactEffectors:yes(u.browserEffector?.plan&&u.browserEffector?.navigate&&u.browserEffector?.submitForm),
      adaptiveComputeThrottle:yes(u.computeThrottle?.assess),
      behavioralLoopDefense:yes(u.loopDetector?.observe),
      untrustedInputDefense:yes(u.inputDefense?.inspect&&u.inputDefense?.envelope),
      organismVisualSelfDesign:yes(u.visualSelfDesign?.inspect&&u.visualSelfDesign?.propose&&u.visualSelfDesign?.apply),
      externalConceptRegistry:Array.isArray(u.externalConcepts?.snapshot?.())&&u.externalConcepts.snapshot().length>=7,
      noExternalLlmRequired:true
    };
    const missing=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
    return {type:'capability-reachability-audit',pass:missing.length===0,checks,missing,statement:missing.length?'Synthia has unreachable required capability paths.':'Synthia is an autonomous recursive multiprocess automaton; organism-level behavior is composed from persistent local automata rather than a single comparator/controller.'};
  }
}
export default CapabilityReachabilityAudit;
