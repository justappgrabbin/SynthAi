const clone=x=>x==null?x:structuredClone(x);
const connectedComponents=(gates,relations)=>{const set=new Set(gates),adj=new Map(gates.map(g=>[g,new Set()]));for(const r of relations){const [a,b]=r.participants||[];if(set.has(a)&&set.has(b)){adj.get(a).add(b);adj.get(b).add(a)}}const seen=new Set(),out=[];for(const g of gates){if(seen.has(g))continue;const q=[g],c=[];seen.add(g);while(q.length){const x=q.shift();c.push(x);for(const y of adj.get(x)||[])if(!seen.has(y)){seen.add(y);q.push(y)}}out.push(c.sort((a,b)=>a-b));}return out;};
/** Multiple recursive levels, each allowed its own representation while preserving lineage. */
export class RecursiveAutomataField{
  constructor({unit}={}){this.unit=unit;this.last=null;}
  resolve(field=this.unit.processField.snapshot()){
    if(!field)return null;const gates=field.gates||[],active=field.organism?.activeLoci||[];const comps=connectedComponents(active,field.relations||[]);
    const loci=active.map(g=>({id:`gate:${g}`,level:'locus',kind:'automaton',gate:g,children:[],expression:'local-state',state:gates[g-1]||null}));
    const weaves=comps.map((members,i)=>({id:`weave:${i}:${members.join('-')}`,level:'weave',kind:'recursive-automaton',children:members.map(g=>`gate:${g}`),expression:members.length===1?'solitary':'relational-pattern',members}));
    const dimensions=Object.entries(field.dimensions||{}).map(([d,x])=>({id:`dimension:${d}`,level:'dimension',kind:'recursive-automaton',children:(x.strongest||[]).map(g=>`gate:${g}`),expression:`${x.question}/${d}`,state:x}));
    const organism={id:'organism:Synthia',level:'organism',kind:'recursive-automaton',children:[...weaves.map(x=>x.id),...dimensions.map(x=>x.id)],expression:'coherent-Synthia',identity:'Synthia'};
    this.last={type:'recursive-scale-field',at:Date.now(),levels:{locus:loci,weave:weaves,dimension:dimensions,organism:[organism]},focus:{gate:field.activeGate,dimension:field.organism?.inquiryDimension||null},rule:'same recursive organizational grammar may appear differently at each scale; parent does not erase child'};return clone(this.last);
  }
  snapshot(){return clone(this.last);}
}
export default RecursiveAutomataField;
