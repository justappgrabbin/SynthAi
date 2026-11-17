import { SynthiaSwarmBody } from 'synthia/vendor/swarm-body/src/synthia/swarm/swarmBody.mjs';
export function mountSwarm(sources,store){
 const swarm=new SynthiaSwarmBody({store,checkpointKey:'computer:swarm-root',identity:{id:'synthia',name:'Synthia',source:'Pure-Synthia-Swarm-Body-v0.3.0-PHYSIOLOGY'}});
 for(const system of ['synthesis','grammar','organism','body','qualities','morph'])swarm.registerExternal({id:`source:${system}`,group:'foundation-organs',capabilities:[`source.${system}`],execute:input=>sources.execute({...input,system})});
 sources.swarm=swarm;return swarm;
}
