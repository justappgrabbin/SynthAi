const clone=x=>x==null?x:structuredClone(x);
const clamp=(v,min=-1,max=1)=>Math.max(min,Math.min(max,Number(v)||0));

/**
 * Relational feedback field. It does not declare truth or choose goals.
 * It records observed interaction outcomes and derives bounded relationship weights.
 */
export class ResonanceNetwork{
  constructor({memory=null,learningRate=.15,clock=()=>Date.now()}={}){this.memory=memory;this.learningRate=Math.max(.01,Math.min(.5,learningRate));this.clock=clock;this.nodes=new Map();this.edges=new Map();this.events=[];}
  addNode(id,meta={}){id=String(id);const n={id,meta:clone(meta),at:this.clock()};this.nodes.set(id,n);return clone(n);}
  #edgeId(a,b){return [String(a),String(b)].sort().join('<->');}
  connect(a,b,{weight=0,evidence=[]}={}){if(!this.nodes.has(String(a)))this.addNode(a);if(!this.nodes.has(String(b)))this.addNode(b);const id=this.#edgeId(a,b);const e={id,a:String(a),b:String(b),weight:clamp(weight),observations:0,evidence:[...evidence],updatedAt:this.clock()};this.edges.set(id,e);return clone(e);}
  observe({a,b,outcome=0,type='interaction',evidence=null,verified=true}={}){
    const id=this.#edgeId(a,b);if(!this.edges.has(id))this.connect(a,b);const e=this.edges.get(id);const target=clamp(outcome);if(verified){e.weight=clamp((1-this.learningRate)*e.weight+this.learningRate*target);e.observations++;}const event={id:`resonance:${this.clock()}:${this.events.length+1}`,at:this.clock(),edgeId:id,type:String(type),outcome:target,verified:Boolean(verified),evidence:clone(evidence),weightAfter:e.weight};e.evidence.push(event.id);e.updatedAt=this.clock();this.events.push(event);this.memory?.remember?.('resonance-events',event);return {event:clone(event),edge:clone(e)};
  }
  score(ids=[]){const set=new Set(ids.map(String));const relevant=[...this.edges.values()].filter(e=>set.has(e.a)&&set.has(e.b));if(!relevant.length)return {score:0,observations:0,edges:[]};const totalObs=relevant.reduce((n,e)=>n+e.observations,0);const weighted=relevant.reduce((n,e)=>n+e.weight*Math.max(1,e.observations),0);const denom=relevant.reduce((n,e)=>n+Math.max(1,e.observations),0);return {score:weighted/(denom||1),observations:totalObs,edges:relevant.map(clone)};}
  snapshot(){return {nodes:[...this.nodes.values()].map(clone),edges:[...this.edges.values()].map(clone),events:this.events.slice(-128).map(clone)};}
}
export default ResonanceNetwork;
