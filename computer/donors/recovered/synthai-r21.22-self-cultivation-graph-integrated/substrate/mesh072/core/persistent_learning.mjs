import { CodeDNALearner } from './code_dna_learner.mjs';
import { KleinAutoLingLearner } from './klein_autoling_learner.mjs';
export class PersistentLearningOrgan{
  constructor(mesh){this.mesh=mesh;this.code=new CodeDNALearner(mesh);this.autoling=new KleinAutoLingLearner(mesh)}
  beforeIntent(intent,context={}){return this.autoling.observe(intent,{success:null,context})}
  afterIntent(intent,result,context={}){const ok=!['failed','error','needs-context'].includes(String(result?.status||'').toLowerCase());return this.autoling.observe(intent,{success:ok,context,outcome:result?.status||'completed'})}
  ingestCode(files,context={}){return this.code.ingestFiles(files,context)}
  snapshot(){const learned=[...this.mesh.nodes.values()].filter(n=>['learned-grammar','code-recipe','code-gap','grammar-recycle'].includes(n.kind)||(n.kind==='knowledge'&&n.scale==='code-dna'));return {learnedNodes:learned.length,grammarRules:learned.filter(n=>n.kind==='learned-grammar').length,codePieces:learned.filter(n=>n.kind==='knowledge'&&n.scale==='code-dna').length,recipes:learned.filter(n=>n.kind==='code-recipe').length,gaps:learned.filter(n=>n.kind==='code-gap').length}}
}
export default PersistentLearningOrgan;
