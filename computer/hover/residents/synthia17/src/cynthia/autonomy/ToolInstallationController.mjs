import { Automaton } from '../../../vendor/ato-core/src/automaton.mjs';

const clone = value => structuredClone(value);

export class ToolInstallationController {
  constructor({ mesh, sandbox, governor, ledger, coatAuthority } = {}) {
    if (!mesh || !sandbox || !governor || !ledger || !coatAuthority) throw new TypeError('TOOL_INSTALLATION_DEPENDENCIES_REQUIRED');
    this.mesh=mesh;this.sandbox=sandbox;this.governor=governor;this.ledger=ledger;this.coatAuthority=coatAuthority;
    this.proposals=new Map();
  }

  async propose({ code, contract, manifest, identity, confidence, resonance, risk='medium' } = {}) {
    const artifact=this.sandbox.stage({code,contracts:[contract],language:'javascript'});
    const coat=await this.coatAuthority.wrap({content:code,manifest:{...clone(manifest),contract:clone(contract)},identity});
    const proposal=this.governor.submit({id:`install:${artifact.id}`,kind:'tool-installation',artifactId:artifact.id,coatHash:coat.coatHash,confidence,resonance,risk,touchesProtectedSettings:false});
    this.proposals.set(proposal.id,{artifact,contract:clone(contract),manifest:clone(manifest),coat});
    return Object.freeze({proposal,artifact,coat});
  }

  async test(proposalId, context={}) {
    const staged=this.proposals.get(proposalId);if(!staged)throw new Error('INSTALL_PROPOSAL_NOT_FOUND');
    const result=await this.sandbox.run(staged.artifact.id,context);
    const passed=result?.status==='passed'||result?.passed===true;
    staged.test=Object.freeze({passed,result:clone(result)});
    return staged.test;
  }

  async install(proposalId, decision, { implementation } = {}) {
    const staged=this.proposals.get(proposalId);if(!staged)throw new Error('INSTALL_PROPOSAL_NOT_FOUND');
    const closed=typeof decision==='string'?this.governor.decide(proposalId,decision):decision;
    if(!['approved','governor-approved'].includes(closed?.status))return Object.freeze({status:'not-installed',decision:closed});
    if(!staged.test?.passed)throw new Error('PASSING_SANDBOX_EVIDENCE_REQUIRED');
    if(typeof implementation!=='function')throw new Error('ISOLATED_IMPLEMENTATION_BRIDGE_REQUIRED');
    const verified=await this.coatAuthority.verify(staged.coat,staged.artifact.code);
    if(!verified.valid)throw new Error('INVALID_ARTIFACT_COAT');
    const specification={...staged.manifest,implementation,metadata:{...(staged.manifest.metadata??{}),coatHash:staged.coat.coatHash,confidence:closed.confidence,resonance:closed.resonance}};
    const automaton=new Automaton(specification);
    await this.ledger.apply({id:`mesh-install:${automaton.id}`,apply:async()=>{this.mesh.add(automaton);return{toolId:automaton.id};},revert:async()=>{this.mesh.automatons.delete(automaton.id);for(const [id,edge] of this.mesh.edges)if(edge.fromId===automaton.id||edge.toId===automaton.id)this.mesh.edges.delete(id);return{toolId:automaton.id};}});
    return Object.freeze({status:'installed',toolId:automaton.id,coatHash:staged.coat.coatHash,decision:closed.status});
  }
}
