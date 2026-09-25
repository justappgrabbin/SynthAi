import PathwaysCycle from '../resonance/PathwaysCycle.mjs';
import ResonanceNetwork from '../resonance/ResonanceNetwork.mjs';
import SemanticWorld from '../world/SemanticWorld.mjs';
import MovementStateKnowledge from '../movement/MovementStateKnowledge.mjs';
import PersistenceTriad from '../organism/PersistenceTriad.mjs';
const clone=x=>x==null?x:structuredClone(x);

/** Orchestrates the derived multi-scale loop without making itself Synthia's identity. */
export class ResonantAutopoieticRuntime{
  constructor({unit=null,memory=null,clock=()=>Date.now()}={}){this.unit=unit;this.memory=memory;this.clock=clock;this.pathways=new PathwaysCycle({memory,clock});this.resonance=new ResonanceNetwork({memory,clock});this.world=new SemanticWorld({memory,clock});this.movementKnowledge=new MovementStateKnowledge({memory});this.persistence=new PersistenceTriad({memory});this.cycles=[];}
  async run(goal,{context={},execute=false,buildOptions={}}={}){
    const pathway=this.pathways.begin({goal,subject:'synthia',context});
    const record=async(type,data,verified=true)=>{this.pathways.record(pathway.id,{type,source:'resonant-autopoietic-runtime',data,verified});return this.pathways.advance(pathway.id);};

    const inspection=await this.unit?.inspectComposition?.();
    await record('need-or-opportunity-observed',{goal,inspection});

    const plan=this.unit?.planSelfBuild?.(goal,buildOptions)||null;
    await record('capability-and-fit-assessed',{plan});

    const placement={parts:plan?.parts?.map(p=>({id:p.id,address:p.address,dependencies:p.dependencies}))||[]};
    await record('address-and-dependencies-resolved',placement);

    let execution={status:'not-executed'};
    if(execute){execution=await this.unit?.selfBuild?.(goal,{...buildOptions,execute:true})||execution;}
    await record('real-execution-result',execution,execute ? execution?.status?.startsWith?.('verified')||execution?.build?.status==='verified' : true);

    const consequence={accepted:execution?.status==='verified-staged'||execution?.build?.status==='verified',executionStatus:execution?.status||execution?.build?.status||'not-executed'};
    this.resonance.addNode('synthia');this.resonance.addNode(`goal:${goal}`);const res=this.resonance.observe({a:'synthia',b:`goal:${goal}`,outcome:consequence.accepted?1:execute?-1:0,type:'build-consequence',evidence:consequence,verified:execute});
    this.persistence.learned({goal,consequence,resonance:res.edge.weight,at:this.clock()});
    await record('consequence-reviewed',{consequence,resonance:res.edge});

    const sustain=consequence.accepted?'retain-staged-until-explicit-adoption':execute?'repair-or-replace':'await-activation';
    await record('retain-replace-retire-or-replicate-decision',{decision:sustain});
    const final=this.pathways.current(pathway.id);const event={id:`resonant-cycle:${this.clock()}:${this.cycles.length+1}`,goal:String(goal),pathway:final,inspection,plan,execution,consequence,sustain};this.cycles.push(event);this.persistence.episodic(event);return clone(event);
  }
  snapshot(){return {pathways:this.pathways.snapshot(),resonance:this.resonance.snapshot(),world:this.world.snapshot(),movementKnowledge:this.movementKnowledge.snapshot(),persistence:this.persistence.snapshot(),cycles:this.cycles.slice(-32).map(clone)};}
}
export default ResonantAutopoieticRuntime;
