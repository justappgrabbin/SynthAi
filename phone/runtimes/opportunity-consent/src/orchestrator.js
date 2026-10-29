export class ExternalOpportunityOrchestrator {
  constructor({capabilities,evaluator,authority,guard,invitations,ledger,consent,deployment,outcomes,valueAttribution,eventBus,scienceAdapter,successAdapter}){
    Object.assign(this,{capabilities,evaluator,authority,guard,invitations,ledger,consent,deployment,outcomes,valueAttribution,eventBus,scienceAdapter,successAdapter});
  }
  async find(need){ return this.capabilities.resolve(need); }
  createOpportunity(input){ const o=this.evaluator.evaluate(input); this.ledger.record(o.opportunityId,'opportunity.created',{need:o.need,candidate:o.candidate,reciprocalValue:o.reciprocalValue,confidence:o.confidence,eligible:o.eligible}); return o; }
  authorityFor(context){ return this.authority.resolve(context); }
  async invite(opportunity,delivery){ return this.invitations.send(opportunity,delivery); }
  acceptCollaboration(opportunity,subjectId,scope=['collaboration']){ this.invitations.respond(opportunity.opportunityId,'accepted'); this.ledger.record(opportunity.opportunityId,'collaboration.started',{subjectId}); return this.consent.grant({opportunityId:opportunity.opportunityId,subjectId,kind:'collaboration',scope}); }
  decline(opportunityId){ return this.invitations.respond(opportunityId,'declined'); }
  expire(opportunityId){ return this.invitations.respond(opportunityId,'expired'); }
  approveInstall(opportunityId,subjectId,scope=['local_runtime']){ this.ledger.record(opportunityId,'installation.offered',{subjectId}); return this.consent.grant({opportunityId,subjectId,kind:'installation',scope}); }
  async recordOutcome(opportunity,payload){
    const outcome=await this.outcomes.observe(opportunity.opportunityId,payload);
    const predicted=opportunity.reciprocalValue.predictedMutualBenefit;
    await this.scienceAdapter?.recordExperiment?.({opportunityId:opportunity.opportunityId,predicted,actual:outcome});
    await this.successAdapter?.observe?.({opportunityId:opportunity.opportunityId,outcome});
    return outcome;
  }
}
