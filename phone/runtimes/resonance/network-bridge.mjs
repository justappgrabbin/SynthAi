import fs from 'node:fs';
import { masterProfileData } from '../../computer/public/master-profile-adapter.mjs';
import { ConsciousnessEngine } from './ConsciousnessEngine.mjs';
import { OpportunityEvaluator } from '../opportunity-consent/src/opportunity-evaluator.js';
import { OutreachGuard } from '../opportunity-consent/src/outreach-guard.js';
import { RelationshipAuthority } from '../opportunity-consent/src/relationship-authority.js';
import { ConsentManager } from '../opportunity-consent/src/consent-manager.js';
import { OpportunityLedger } from '../opportunity-consent/src/opportunity-ledger.js';
import { InvitationBroker } from '../opportunity-consent/src/invitation-broker.js';

const input=JSON.parse(fs.readFileSync(0,'utf8'));
const engine=new ConsciousnessEngine();
const fieldSources=[
 ['Mind','tropical','Sun'], ['Heart','draconic','Sun'], ['Body','sidereal','Sun'],
 ['Spirit','tropical','Moon'], ['Shadow','tropical','Pluto'], ['Light','tropical','Jupiter'],
 ['Void','draconic','North Node'], ['Form','sidereal','Saturn'], ['Flow','tropical','Neptune']
];
// Match the supplied Computer's source assignments exactly.
function restoreLedger(entries=[]){
 const ledger=new OpportunityLedger();ledger.entries=entries;
 for(const entry of entries){const list=ledger.byId.get(entry.opportunityId)||[];list.push(entry);ledger.byId.set(entry.opportunityId,list);}
 if(!ledger.verify())throw Error('Opportunity history failed its integrity check');
 return ledger;
}
function profile(master,mean=false){
 const data=masterProfileData(master),astro={...data.astrology};
 if(mean)astro.draconic=astro.draconicMean;
 const fields=Object.fromEntries(fieldSources.map(([name,chart,planet])=>[name,engine.calculateField({name,chart,planet,method:astro[chart].system},astro,data.humanDesign)]));
 return {fields,humanDesign:{activeGates:data.humanDesign.activeGates},model_version:'supplied-nine-field-v1'};
}
let output;
if(input.op==='profile') {
 output={true_node:profile(input.master),mean_node:profile(input.master,true)};
} else if(input.op==='compare') {
 output={matches:input.candidates.map(candidate=>({id:candidate.id,
  true_node:engine.calculateResonance(input.viewer.true_node,candidate.profile.true_node),
  mean_node:engine.calculateResonance(input.viewer.mean_node,candidate.profile.mean_node)}))};
} else if(input.op==='opportunity') {
 const opportunity=new OpportunityEvaluator().evaluate(input.value);
 opportunity.opportunityId=input.opportunity_id;
 const ledger=restoreLedger(input.history);
 output={opportunity,guard:new OutreachGuard({ledger,channelPolicy:(_source,context)=>context===true}).check(opportunity),
  authority:new RelationshipAuthority().resolve({actor:input.actor,subject:input.subject,relationshipType:'participant_opportunity',requestedAction:'invite'})};
 if(input.record_invitation && output.guard.permitted)ledger.record(input.opportunity_id,'invitation.sent',{channel:'in_app',senderId:input.actor.id,recipientId:input.subject.id});
 output.ledger=ledger.entries;
} else if(input.op==='respond') {
 const ledger=restoreLedger(input.history);
 const manager=new ConsentManager({secret:input.secret,ledger});
 if(input.response==='revoked'){
  if(!input.consent?.record)throw Error('No collaboration consent to revoke');
  if(String(input.actor_id)===input.consent.record.subjectId){
   manager.records.set(input.consent.record.consentId,input.consent.record);
   manager.revoke(input.consent.record.consentId);
   output={consent:{...input.consent,record:manager.records.get(input.consent.record.consentId)},ledger:ledger.entries};
  } else {
   ledger.record(input.opportunity_id,'collaboration.withdrawn',{subjectId:input.actor_id});
   output={consent:input.consent,ledger:ledger.entries};
  }
 } else {
  new InvitationBroker({ledger}).respond(input.opportunity_id,input.response);
  let consent=null;
  if(input.response==='accepted'){
   const granted=manager.grant({opportunityId:input.opportunity_id,subjectId:String(input.subject_id),kind:'collaboration',scope:['single_invitation','in_app_connection']});
   consent={...granted,verification:manager.verify(granted.token,{kind:'collaboration',requiredScopes:['in_app_connection']})};
  }
  output={consent,ledger:ledger.entries};
 }
} else throw Error('Unknown resonance operation');
process.stdout.write(JSON.stringify(output));
