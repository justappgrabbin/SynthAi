const clone=x=>x==null?x:structuredClone(x);
/**
 * Dependency-free local reconciliation mesh: independently owned registers,
 * Lamport clocks, pairwise gossip, and deterministic merge. Conceptually
 * informed by CRDT/CFRT and Tribler gossip; no source code is copied.
 */
export class ReconciliationMesh{
  constructor({memory}={}){this.memory=memory;this.nodes=new Map();this.clock=0;this.log=[];this.#load();}
  #load(){try{const s=this.memory?.get?.('reconciliation-mesh','state')?.value;if(s){this.clock=Number(s.clock||0);for(const n of s.nodes||[])this.nodes.set(n.id,n);this.log=s.log||[]}}catch{}}
  publish(owner,key,value,{at=Date.now()}={}){const id=String(owner);let n=this.nodes.get(id)||{id,clock:0,registers:{}};this.clock=Math.max(this.clock,n.clock)+1;n={...n,clock:this.clock,registers:{...n.registers,[key]:{value:clone(value),clock:this.clock,owner:id,at}}};this.nodes.set(id,n);this.#record({type:'publish',owner:id,key,clock:this.clock});this.#persist();return clone(n.registers[key]);}
  gossip(a,b){const A=this.nodes.get(String(a)),B=this.nodes.get(String(b));if(!A||!B)return null;const ma=this.#merge(A,B),mb=this.#merge(B,A);this.nodes.set(A.id,ma);this.nodes.set(B.id,mb);this.clock=Math.max(this.clock,ma.clock,mb.clock);this.#record({type:'gossip',participants:[A.id,B.id],clock:this.clock});this.#persist();return {a:clone(ma),b:clone(mb)};}
  reconcile(ids=[...this.nodes.keys()]){const arr=[...new Set(ids.map(String))].map(id=>this.nodes.get(id)).filter(Boolean);for(let i=0;i<arr.length;i++)for(let j=i+1;j<arr.length;j++)this.gossip(arr[i].id,arr[j].id);return this.shared(ids);}
  shared(ids=[...this.nodes.keys()]){const out={};for(const id of ids){const n=this.nodes.get(String(id));if(!n)continue;for(const [k,r] of Object.entries(n.registers||{})){const p=out[k];if(!p||r.clock>p.clock||(r.clock===p.clock&&String(r.owner)<String(p.owner)))out[k]=clone(r);}}return out;}
  inspect(id){return clone(this.nodes.get(String(id))||null)}
  snapshot(){return {clock:this.clock,nodeCount:this.nodes.size,nodes:[...this.nodes.values()].map(clone),log:this.log.slice(-64).map(clone)};}
  #merge(local,remote){const registers={...local.registers};for(const [k,r] of Object.entries(remote.registers||{})){const p=registers[k];if(!p||r.clock>p.clock||(r.clock===p.clock&&String(r.owner)<String(p.owner)))registers[k]=clone(r);}return {...local,clock:Math.max(local.clock||0,remote.clock||0),registers};}
  #record(e){this.log.push({...e,at:Date.now()});if(this.log.length>128)this.log.shift();}
  #persist(){this.memory?.upsert?.('reconciliation-mesh','state',{clock:this.clock,nodes:[...this.nodes.values()],log:this.log.slice(-128)});}
}
export default ReconciliationMesh;
