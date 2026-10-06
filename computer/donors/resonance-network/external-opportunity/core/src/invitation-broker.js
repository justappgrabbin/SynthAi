import { now } from './utils.js';

export class InvitationBroker {
  constructor({ledger, guard, transports={}}){ this.ledger=ledger; this.guard=guard; this.transports=transports; }
  async send(opportunity,{channel,message}){
    const decision=this.guard.check(opportunity); if(!decision.permitted) return {sent:false,decision};
    const transport=this.transports[channel]; if(!transport?.send) return {sent:false,decision:{...decision,permitted:false,reason:'transport unavailable'}};
    const result=await transport.send({candidate:opportunity.candidate,message,opportunityId:opportunity.opportunityId});
    if(result?.ok){ this.ledger.record(opportunity.opportunityId,'invitation.sent',{channel,sentAt:now(),deliveryRef:result.ref||null}); return {sent:true,decision,delivery:result}; }
    return {sent:false,decision,delivery:result};
  }
  respond(opportunityId,response){
    if(!['accepted','declined','expired'].includes(response)) throw new Error('Invalid invitation response');
    this.ledger.record(opportunityId,`invitation.${response}`,{}); return response;
  }
}
