import { ScientificSynthiaAssembly } from '../src/index.mjs';

// Explicit test fixture, not an inferred life reading or a mapping of Boolean features to gates.
const address = { planetary:'Sun', dimension:'Movement', gate:1, line:1, color:1, tone:1, base:1, degree:0, minute:0, second:0, arc:0, zodiac:1, house:1 };
const experience = {
  id:'authored-crossing', inheritAddress:true, initial:'bank', states:[
    {id:'bank',inheritAddress:true,label:'At the river bank',description:'An authored interaction: choose a transition and see its consequence.',actions:[{id:'cross',inheritAddress:true,label:'Cross the bridge',to:'far-bank'}]},
    {id:'far-bank',inheritAddress:true,label:'Across the river',description:'Your identity continues here. The return path is still available.',actions:[{id:'return',inheritAddress:true,label:'Return to the bank',to:'bank'}]}
  ]
};

export async function generateAuthoredExample() {
  const system = new ScientificSynthiaAssembly({ autoStart:false, executionMode:'resident', artifactGeneration:{
    async verify(record) {
      const file = record.proposal.files.find(file=>file.path.endsWith('.mjs'));
      // This demonstration executes its own authored source. This is not an isolation boundary for arbitrary code.
      const module = await import(`data:text/javascript,${encodeURIComponent(file.source)}`);
      const session = module.createExperience(record.context.identityId);
      const arrived = session.act('cross');
      const returned = session.act('return');
      const pass = arrived.state.id === 'far-bank' && returned.state.id === 'bank' && arrived.identityId === returned.identityId;
      return { pass, evidence:{arrived:arrived.state.id,returned:returned.state.id,identityId:returned.identityId,history:returned.history} };
    }
  }});
  try {
    return await system.generateArtifact({purpose:'make an authored crossing interaction executable',kind:'game',source:{address,experience}});
  } finally { await system.close(); }
}
