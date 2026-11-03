export class OutreachGuard {
  constructor({ledger, channelPolicy=()=>true}){ this.ledger=ledger; this.channelPolicy=channelPolicy; }
  check(opportunity){
    const h=this.ledger.history(opportunity.opportunityId);
    const previousContact=h.some(e=>e.type==='invitation.sent');
    const previousDecline=h.some(e=>['invitation.declined','invitation.expired'].includes(e.type));
    const mutualValueEstablished=Boolean(opportunity.eligible && opportunity.reciprocalValue?.whatNetworkCanOffer?.length && opportunity.reciprocalValue?.whatCandidateCanOffer?.length);
    const authorizedChannel=this.channelPolicy(opportunity.candidate?.source, opportunity.candidate?.publicOrAuthorizedContext);
    const explainable=Boolean(opportunity.evidence?.length && opportunity.need?.description);
    const permitted=!previousContact && !previousDecline && mutualValueEstablished && authorizedChannel && explainable;
    const reason=permitted?'permitted': previousDecline?'previous decline/expiry':previousContact?'single-invitation rule already consumed':!mutualValueEstablished?'mutual value not established':!authorizedChannel?'channel not authorized':'match is not explainable';
    return {permitted,reason,previousContact,previousDecline,mutualValueEstablished,authorizedChannel,explainable};
  }
}
