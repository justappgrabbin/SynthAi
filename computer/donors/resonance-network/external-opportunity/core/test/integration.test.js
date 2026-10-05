import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EventBus,OpportunityLedger,RelationshipAuthority,OpportunityEvaluator,OutreachGuard,ConsentManager,
  InvitationBroker,ExternalCapabilityResolver,SelfDeploymentManager,ExternalOutcomeTracker,ValueAttributionEngine,
  ExternalOpportunityOrchestrator,wiringAudit
} from '../src/index.js';

function system(){
  const ledger=new OpportunityLedger(); const bus=new EventBus(); const consent=new ConsentManager({ledger,secret:'test-secret'});
  const guard=new OutreachGuard({ledger,channelPolicy:()=>true});
  const invitations=new InvitationBroker({ledger,guard,transports:{email:{send:async()=>({ok:true,ref:'msg-1'})}}});
  const capabilities=new ExternalCapabilityResolver({
    local:{resolve:async()=>({satisfied:false})}, organism:{resolve:async()=>({satisfied:false})}, network:{resolve:async()=>({satisfied:false})},
    mcp:{resolve:async()=>({satisfied:false,candidates:[]})}, human:{resolve:async()=>({candidates:[{id:'p1'}]})}
  });
  const deployment=new SelfDeploymentManager({consent,ledger,allowedPackages:['synthia-lite'],provisioner:{deploy:async p=>({ok:true,runtimeId:`runtime-${p.deviceOwnerId}`})}});
  const science=[]; const success=[];
  const s=new ExternalOpportunityOrchestrator({capabilities,evaluator:new OpportunityEvaluator(),authority:new RelationshipAuthority(),guard,invitations,ledger,consent,deployment,
    outcomes:new ExternalOutcomeTracker({ledger,eventBus:bus}),valueAttribution:new ValueAttributionEngine(),eventBus:bus,
    scienceAdapter:{recordExperiment:async x=>science.push(x)},successAdapter:{observe:async x=>success.push(x)}});
  return {s,ledger,science,success};
}

const input={
  need:{owner:'participant',description:'Need a specialist',requiredCapabilities:['analysis'],urgency:.8},
  candidate:{type:'person',id:'p1',availableCapabilities:['analysis'],source:'public-directory',publicOrAuthorizedContext:'public professional profile'},
  networkOffer:['paid work'], evidence:[{relevance:.9,confidence:.9}]
};

test('full consent-gated opportunity flow', async()=>{
  const {s,ledger,science,success}=system();
  const gap=await s.find(input.need); assert.equal(gap.layer,'human');
  const opp=s.createOpportunity(input); assert.equal(opp.eligible,true);
  assert.equal(s.authorityFor({subject:{id:'p1'},relationshipType:'participant_opportunity',requestedAction:'outreach'}).authorityHolder,'p1');
  const first=await s.invite(opp,{channel:'email',message:'Mutual opportunity'}); assert.equal(first.sent,true);
  const second=await s.invite(opp,{channel:'email',message:'Again'}); assert.equal(second.sent,false); // exactly one invitation
  const collab=s.acceptCollaboration(opp,'p1'); assert.equal(s.consent.verify(collab.token,{kind:'collaboration'}).valid,true);
  await assert.rejects(()=>s.deployment.deploy({opportunityId:opp.opportunityId,deviceOwnerId:'p1',packageId:'synthia-lite',requiredScopes:['local_runtime']},collab.token),/Installation blocked/);
  const install=s.approveInstall(opp.opportunityId,'p1',['local_runtime']);
  const deployed=await s.deployment.deploy({opportunityId:opp.opportunityId,deviceOwnerId:'p1',packageId:'synthia-lite',requiredScopes:['local_runtime']},install.token); assert.equal(deployed.ok,true);
  await s.recordOutcome(opp,{accepted:true,collaborationOccurred:true,economicValue:1000,perceivedBenefitA:.8,perceivedBenefitB:.9});
  assert.equal(science.length,1); assert.equal(success.length,1); assert.equal(ledger.verify(),true);
  assert.ok(Object.values(wiringAudit(s)).every(Boolean));
});

test('decline is terminal for automated outreach', async()=>{
  const {s}=system(); const opp=s.createOpportunity(input); await s.invite(opp,{channel:'email',message:'One'}); s.decline(opp.opportunityId);
  const attempt=await s.invite(opp,{channel:'email',message:'Nope'}); assert.equal(attempt.sent,false); assert.equal(attempt.decision.previousDecline,true);
});

test('economic share requires attributable success + prior agreement',()=>{
  const {s}=system();
  const noAgreement=s.valueAttribution.evaluate({economicValue:10000,facilitationEvidence:[1],agreement:{successShareAccepted:false,shareRate:.05}}); assert.equal(noAgreement.shareValue,0);
  const yes=s.valueAttribution.evaluate({economicValue:10000,facilitationEvidence:[1],agreement:{successShareAccepted:true,shareRate:.05}}); assert.equal(yes.shareValue,500);
});
