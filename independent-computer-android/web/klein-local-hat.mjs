/* Adapter over the COMPLETE existing Klein ATO and SemanticComputer.
 * These six bits record tool evidence, not canonical gate/trigram assignments.
 * This does not substitute a made-up numeric operator for SPEC-2.
 */
export class KleinLocalHat {
  constructor(K,workspace){this.K=K;this.workspace=workspace;this.cpu=new K.SemanticComputer();}
  bind(tools){for(const [name,execute]of Object.entries(tools))this.cpu.register(name,(_cpu,args)=>execute(args));}
  execute(name,args){return this.cpu.step('CALL',name,args);}
  vector(events){
    const witnessed=new Set(events.filter(e=>e.ok).map(e=>e.cmd));
    return ['inspect','read_file','acquire','construct','execute','verify'].map(name=>Number(witnessed.has(name)||(name==='verify'&&events.some(e=>e.ok&&e.cmd==='finish'&&e.result.evidence?.length)))).join('');
  }
  async context(run){
    const observed=this.vector(run.events),history=await this.workspace.history();
    const prior=history.filter(r=>r.status==='finished'&&r.id!==run.id).at(-1);
    if(!prior)return {mechanism:'Original Klein ATO/tool bus',evidenceOrder:['inspected','read','acquired','constructed','executed','verified'],observed,analogy:null,reason:'No successful prior trajectory has been witnessed yet.'};
    const before='000000',after=this.vector(prior.events),proposal=this.cpu.step('SOLVE',before,after,observed).toString();
    return {mechanism:'Original Klein ATO three-input analogy A:B::C:?',a:before,b:after,c:observed,proposal,priorRun:prior.id,advisory:true,
      limitation:'Analogy over recorded tool evidence is not semantic proof and never bypasses execution or verification.'};
  }
  async observe(event){event.klein={instruction:'CALL',tool:event.cmd,recorded:true};}
}
