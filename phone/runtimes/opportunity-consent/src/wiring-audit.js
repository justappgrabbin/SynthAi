export function wiringAudit(system){
  return {
    externalCapabilityResolver: typeof system.capabilities?.resolve === 'function',
    opportunityEvaluator: typeof system.evaluator?.evaluate === 'function',
    relationshipAuthority: typeof system.authority?.resolve === 'function',
    outreachGuard: typeof system.guard?.check === 'function',
    opportunityLedger: typeof system.ledger?.record === 'function',
    invitationBroker: typeof system.invitations?.send === 'function',
    installConsent: typeof system.consent?.grant === 'function' && typeof system.consent?.verify === 'function',
    selfDeployment: typeof system.deployment?.deploy === 'function',
    externalOutcomeTracking: typeof system.outcomes?.observe === 'function',
    valueAttribution: typeof system.valueAttribution?.evaluate === 'function'
  };
}
