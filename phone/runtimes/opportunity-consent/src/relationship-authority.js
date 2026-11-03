export class RelationshipAuthority {
  resolve({actor, subject, relationshipType, requestedAction}){
    const type=relationshipType||'collaboration';
    if(requestedAction==='install') return {authorityHolder:subject?.deviceOwnerId||subject?.id, requiredConsent:['installation'], allowedScopes:['local_runtime','network_identity','requested_mcp_endpoints','requested_storage'], prohibitedScopes:['silent_install','security_bypass']};
    if(type==='participant_opportunity') return {authorityHolder:subject?.id, requiredConsent:['outreach','collaboration'], allowedScopes:['single_invitation'], prohibitedScopes:['repeat_outreach','channel_hopping']};
    if(type==='external_machine') return {authorityHolder:actor?.id||'synthia', requiredConsent:['endpoint_authorization'], allowedScopes:['task_exchange'], prohibitedScopes:['credential_escalation']};
    return {authorityHolder:subject?.id||actor?.id, requiredConsent:['collaboration'], allowedScopes:['single_invitation'], prohibitedScopes:['repeat_outreach']};
  }
}
