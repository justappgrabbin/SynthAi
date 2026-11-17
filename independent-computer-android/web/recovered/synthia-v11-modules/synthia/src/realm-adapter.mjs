// Connect the preserved House simulation to the foundation; its physics and skin
// renderer remain the donor implementation. Each state change receives a receipt.
export async function resolveRealmAgent(foundation,agent){
 const landed=await foundation.ingest({kind:'house-agent-state',agent},{name:'house-agent-state.json',source:'house-reskin',matterOwner:agent.name});
 if(!landed.ok)throw Error(landed.outcome.error??'Agent state failed execution');
 const activation={agentId:String(agent.id),stateId:landed.id,address:landed.outcome.canonicalAddress,resolvedState:{address:landed.outcome.canonicalAddress,stateId:landed.id,sourceAgent:agent}};
 const morph=await foundation.ingest({realizer:'source-system',system:'morph',op:'prepare',activation,context:{agentState:agent.state,position:agent.position}},{name:'canonical-agent-morph.json',source:'house-reskin',canonicalAddress:activation.address,matterOwner:agent.name});
 if(!morph.ok)throw Error(morph.outcome.error??'Canonical morph failed');
 return {agentId:agent.id,receiptId:landed.id,address:activation.address,qualities:landed.glyph,morphPacket:morph.record.execution.result.returnValue};
}
