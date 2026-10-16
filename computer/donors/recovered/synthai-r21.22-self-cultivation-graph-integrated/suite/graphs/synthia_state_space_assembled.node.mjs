// synthia_state_space_assembled.mjs
import fs from "node:fs";

export const GRAPH_DIMENSIONS = Object.freeze({
  Knowledge: { index: 1, semanticLayer: "Movement", role: "knowledge" },
  Causal: { index: 2, semanticLayer: "Evolution", role: "causal" },
  Phase: { index: 3, semanticLayer: "Being", role: "state" },
  Temporal: { index: 4, semanticLayer: "Design", role: "temporal" },
  Dependency: { index: 5, semanticLayer: "Space", role: "dependency" },
});

export const COLOR = Object.freeze({1:"fear",2:"hope",3:"desire",4:"need",5:"guilt",6:"innocence"});
export const TONE = Object.freeze({1:"smell",2:"taste",3:"touch",4:"sound",5:"light",6:"feeling"});
export const BASE = Object.freeze({1:"life",2:"the other",3:"mutation",4:"form",5:"space"});
export const LINE_ROLE = Object.freeze({1:"investigator",2:"hermit",3:"martyr",4:"opportunist",5:"heretic",6:"role model"});
export const ADDRESS_CARDINALITY = 64 * 6 * 6 * 6 * 5;

const TRIGRAMS = new Map([
  ["000","kun"],["100","zhen"],["010","kan"],["110","dui"],
  ["001","gen"],["101","li"],["011","xun"],["111","qian"],
]);
const MW = ["qian","gen","kan","zhen","kun","dui","li","xun"];

function assert(ok, message){ if(!ok) throw new Error(message); }
function norm(v){ return String(v ?? "").trim().replace(/\s+/g," ").toLowerCase(); }
function uniq(xs){ return [...new Set(xs.filter(Boolean))]; }
function decimal(bits){ return bits.reduce((n,b,i)=>n|(b<<i),0); }
function parseBits(raw, gate){
  const s=String(raw??"").replace(/[^01]/g,"");
  assert(s.length===6,`Gate ${gate}: invalid binary`);
  return [...s].map(Number);
}
function tri(bits){ const n=TRIGRAMS.get(bits.join("")); assert(n,`Invalid trigram ${bits}`); return n; }

export function packAddress({gate,line,color,tone,base}){
  assert(gate>=1&&gate<=64&&line>=1&&line<=6&&color>=1&&color<=6&&tone>=1&&tone<=6&&base>=1&&base<=5,"Invalid address");
  return (((((gate-1)*6+(line-1))*6+(color-1))*6+(tone-1))*5)+(base-1);
}
export function unpackAddress(index){
  assert(Number.isInteger(index)&&index>=0&&index<ADDRESS_CARDINALITY,"Invalid address index");
  let n=index; const base=n%5+1; n=Math.floor(n/5);
  const tone=n%6+1; n=Math.floor(n/6);
  const color=n%6+1; n=Math.floor(n/6);
  const line=n%6+1; n=Math.floor(n/6);
  return {gate:n+1,line,color,tone,base};
}

class Graph {
  constructor(name, semanticLayer){ this.name=name; this.semanticLayer=semanticLayer; this.nodes=new Map(); this.edges=new Map(); }
  node(x){ if(!this.nodes.has(x.id)) this.nodes.set(x.id,Object.freeze({...x,dimension:this.semanticLayer})); return this.nodes.get(x.id); }
  edge(x){
    assert(this.nodes.has(x.from),`${this.name}: missing ${x.from}`);
    assert(this.nodes.has(x.to),`${this.name}: missing ${x.to}`);
    const id=x.id??`${x.from}->${x.to}:${x.type}`;
    if(!this.edges.has(id)) this.edges.set(id,Object.freeze({id,status:"structural",provenance:[],metadata:{},...x}));
    return this.edges.get(id);
  }
}

function buildGateTable(hatcher){
  assert(Array.isArray(hatcher?.hexagrams)&&hatcher.hexagrams.length===64,"Hatcher dataset must contain 64 hexagrams");
  return hatcher.hexagrams.map(x=>{
    const gate=Number(x.hexagram), binary=parseBits(x.binary,gate);
    return {gate,binary,decimal:decimal(binary),trigrams:{lower:tri(binary.slice(0,3)),upper:tri(binary.slice(3,6))},hatcher:x};
  }).sort((a,b)=>a.gate-b.gate);
}
function byBinary(table){ return new Map(table.map(g=>[g.binary.join(""),g.gate])); }
function fuxi(table){ return [...table].sort((a,b)=>a.decimal-b.decimal); }
function kingwen(table){ return [...table].sort((a,b)=>a.gate-b.gate); }
function mawangdui(table){
  const rank=x=>MW.indexOf(x);
  return [...table].sort((a,b)=>rank(a.trigrams.upper)-rank(b.trigrams.upper)||rank(a.trigrams.lower)-rank(b.trigrams.lower));
}
function refs(value){ return uniq((String(value??"").match(/\b(?:[1-9]|[1-5][0-9]|6[0-4])\b/g)||[]).map(Number)); }
function terms(text){
  return uniq(String(text??"").replace(/[()[\]{}:;"“”‘’]/g," ").split(/[,;|/]+|\s{2,}/).map(norm).filter(x=>x.length>1));
}

export class SynthiaStateSpace {
  constructor({gateLexicon,hatcher,gnostic}){
    assert(Array.isArray(gateLexicon)&&gateLexicon.length===64,"gate_lexicon must contain 64 gates");
    assert(Array.isArray(gnostic?.hexagrams)&&gnostic.hexagrams.length===64,"Gnostic dataset must contain 64 hexagrams");
    this.gateLexicon=gateLexicon; this.hatcher=hatcher; this.gnostic=gnostic;
    this.table=buildGateTable(hatcher); this.binaryIndex=byBinary(this.table);
    this.lex=new Map(gateLexicon.map(x=>[Number(x.g),x]));
    this.gnosticByGate=new Map(gnostic.hexagrams.map(x=>[Number(x.hexagram),x]));
    this.graphs={
      Knowledge:new Graph("Knowledge","Movement"),
      Causal:new Graph("Causal","Evolution"),
      Phase:new Graph("Phase","Being"),
      Temporal:new Graph("Temporal","Design"),
      Dependency:new Graph("Dependency","Space"),
    };
    this.activation=new Float64Array(ADDRESS_CARDINALITY);
    this.visits=new Uint32Array(ADDRESS_CARDINALITY);
    this.lastEvent=null; this.eventCounter=0;
    this._buildGateNodes(); this._buildKnowledge(); this._buildPhase(); this._buildTemporal(); this._buildSourceRelations();
  }
  gateId(layer,gate){ return `${layer}:gate:${gate}`; }
  _buildGateNodes(){
    for(const spec of Object.values(GRAPH_DIMENSIONS)){
      const graph=this.graphs[Object.keys(GRAPH_DIMENSIONS).find(k=>GRAPH_DIMENSIONS[k]===spec)];
      for(const g of this.table) graph.node({id:this.gateId(spec.semanticLayer,g.gate),kind:"gate",gate:g.gate,binary:[...g.binary],trigrams:{...g.trigrams},decimal:g.decimal});
    }
  }
  _word(gate,source,key,text,relation){
    const t=String(text??"").trim(); if(!t) return;
    const id=`knowledge:${source}:g${gate}:${key}:${norm(t).replace(/[^a-z0-9]+/g,"_")}`;
    this.graphs.Knowledge.node({id,kind:"knowledge",gate,text:t,source,key});
    this.graphs.Knowledge.edge({from:id,to:this.gateId("Movement",gate),type:relation,provenance:[source]});
  }
  _buildKnowledge(){
    for(let gate=1;gate<=64;gate++){
      const l=this.lex.get(gate); assert(l,`Missing lexicon gate ${gate}`);
      this._word(gate,"gate_lexicon","name",l.name,"names");
      this._word(gate,"gate_lexicon","rave",l.rave,"aliases");
      this._word(gate,"gate_lexicon","ruler",l.ruler,"context");
      this._word(gate,"gate_lexicon","primary_base",l.primary_base,"classifies");
      for(const w of l.kw??[]) this._word(gate,"gate_lexicon","keyword",w,"describes");
      for(let line=1;line<=6;line++){
        const x=l.lines?.[String(line)]; assert(x,`Gate ${gate}: missing line ${line}`);
        this._word(gate,"gate_lexicon",`line${line}:name`,x.name,"line-role");
        this._word(gate,"gate_lexicon",`line${line}:kw`,x.kw,"line-expression");
      }
      const h=this.table[gate-1].hatcher;
      this._word(gate,"hatcher","name",h.name,"aliases");
      this._word(gate,"hatcher","pinyin",h.pinyin,"names");
      for(const w of terms(h.key_words)) this._word(gate,"hatcher","key_words",w,"describes");
      for(const w of terms(h.glossary)) this._word(gate,"hatcher","glossary",w,"glosses");
      const g=this.gnosticByGate.get(gate); assert(g,`Missing Gnostic gate ${gate}`);
      this._word(gate,"gnostic","running_name",g.running_name,"aliases");
      for(const w of g.other_titles??[]) this._word(gate,"gnostic","other_title",w,"aliases");
    }
  }
  _buildPhase(){
    const G=this.graphs.Phase;
    for(const g of this.table){
      const from=this.gateId("Being",g.gate);
      for(let line=1;line<=6;line++){
        const bits=[...g.binary]; bits[line-1]^=1;
        const to=this.binaryIndex.get(bits.join("")); assert(to,`No moving-line target for gate ${g.gate}`);
        G.edge({from,to:this.gateId("Being",to),type:"moving-line",metadata:{line},provenance:["state_space.py:x'=x XOR m"]});
      }
      const inverse=this.binaryIndex.get(g.binary.map(b=>b^1).join(""));
      const reverse=this.binaryIndex.get([...g.binary].reverse().join(""));
      const nuclear=this.binaryIndex.get([g.binary[1],g.binary[2],g.binary[3],g.binary[2],g.binary[3],g.binary[4]].join(""));
      for(const [type,to] of Object.entries({inverse,reverse,nuclear})) G.edge({from,to:this.gateId("Being",to),type,provenance:["gate_relations/orbit"]});
    }
  }
  _sequence(name,seq){
    for(let i=0;i<seq.length-1;i++) this.graphs.Temporal.edge({from:this.gateId("Design",seq[i].gate),to:this.gateId("Design",seq[i+1].gate),type:`sequence:${name}`,metadata:{index:i},provenance:[`sequence:${name}`]});
  }
  _buildTemporal(){ this._sequence("kingwen",kingwen(this.table)); this._sequence("fuxi",fuxi(this.table)); this._sequence("mawangdui",mawangdui(this.table)); }
  _buildSourceRelations(){
    for(const g of this.table){
      for(const [key,rel] of Object.entries(g.hatcher.dimensions??{})){
        for(const target of refs(rel?.value)) this.graphs.Knowledge.edge({from:this.gateId("Movement",g.gate),to:this.gateId("Movement",target),type:`source-relation:${rel?.pinyin_term??key}`,provenance:["hatcher"],metadata:{sourceKey:key}});
      }
    }
  }
  recordEvent({type="event",gate=null,text="",metadata={},provenance=[]}={}){
    const id=`event:${++this.eventCounter}:${Date.now()}`;
    this.graphs.Temporal.node({id,kind:"event",gate,timestamp:Date.now(),text,metadata});
    if(this.lastEvent) this.graphs.Temporal.edge({from:this.lastEvent,to:id,type:"before",status:"observed",provenance});
    this.lastEvent=id; return id;
  }
  recordCausalEdge(causeGate,effectGate,{provenance=[],confidence=null,metadata={}}={}){
    return this.graphs.Causal.edge({from:this.gateId("Evolution",causeGate),to:this.gateId("Evolution",effectGate),type:"causes",status:"observed",provenance,metadata:{...metadata,confidence}});
  }
  recordDependency(requiredGate,dependentGate,{type="depends-on",provenance=[],metadata={}}={}){
    return this.graphs.Dependency.edge({from:this.gateId("Space",dependentGate),to:this.gateId("Space",requiredGate),type,status:"observed",provenance,metadata});
  }
  activate(address,amount=1){
    const i=packAddress(address); this.activation[i]+=amount; this.visits[i]++;
    this.recordEvent({type:"activation",gate:address.gate,text:`activate ${i}`,metadata:{address:{...address},amount},provenance:["runtime"]});
    return this.address(address);
  }
  address(address){
    const i=packAddress(address), gate=this.table[address.gate-1], lex=this.lex.get(address.gate);
    return {index:i,id:`A${i.toString(36)}`,...address,activation:this.activation[i],visits:this.visits[i],
      modifiers:{line:lex.lines[String(address.line)],color:COLOR[address.color],tone:TONE[address.tone],base:BASE[address.base]},
      gate:{...gate,lexicon:lex,gnostic:this.gnosticByGate.get(address.gate)}};
  }
  transition(address,movingLines){
    const lines=uniq([...movingLines].map(Number)).sort((a,b)=>a-b); assert(lines.length&&lines.every(x=>x>=1&&x<=6),"movingLines must be 1..6");
    const bits=[...this.table[address.gate-1].binary]; for(const line of lines) bits[line-1]^=1;
    const gate=this.binaryIndex.get(bits.join("")); assert(gate,"Transition target missing");
    const target={...address,gate}; const event=this.recordEvent({type:"phase-transition",gate,text:`Gate ${address.gate} -> Gate ${gate}`,metadata:{from:address,to:target,movingLines:lines},provenance:["state_space.py","linguistic_layer.py"]});
    this.recordDependency(address.gate,gate,{type:"observed-transition",provenance:[event]});
    return {from:this.address(address),to:this.activate(target,1),movingLines:lines,kind:this.transitionKind(lines),eventId:event};
  }
  transitionKind(lines){
    const s=new Set(lines), eq=xs=>xs.length===s.size&&xs.every(x=>s.has(x));
    if(eq([1,2,3,4,5,6])) return "total-inversion";
    if([...s].every(x=>x<=3)) return "inner-shift";
    if([...s].every(x=>x>=4)) return "outer-shift";
    if(eq([1,6])||eq([2,5])||eq([3,4])) return "mirror-shift";
    return "mixed-shift";
  }
  wordsAtGate(gate){
    const target=this.gateId("Movement",gate);
    return [...this.graphs.Knowledge.edges.values()].filter(e=>e.to===target).map(e=>this.graphs.Knowledge.nodes.get(e.from)).filter(Boolean);
  }
  recognize(text,{line=1,color=1,tone=1,base=1}={}){
    const q=new Set(norm(text).replace(/[^\p{L}\p{N}'-]+/gu," ").split(/\s+/).filter(Boolean));
    let best={score:-1,address:null};
    for(let gate=1;gate<=64;gate++){
      let score=0;
      for(const x of this.wordsAtGate(gate)){ const w=norm(x.text); if(q.has(w)) score+=3; else if([...q].some(t=>w.includes(t)||t.includes(w))) score++; }
      if(score>best.score) best={score,address:{gate,line,color,tone,base}};
    }
    return best;
  }
  coverage(){
    return {
      addressCardinality:ADDRESS_CARDINALITY,
      gateTable:this.table.length,
      gateLexicon:this.gateLexicon.length,
      lineSlots:this.gateLexicon.reduce((n,g)=>n+Object.keys(g.lines??{}).length,0),
      expectedLineSlots:384,
      hatcherHexagrams:this.hatcher.hexagrams.length,
      gnosticHexagrams:this.gnostic.hexagrams.length,
      modifiers:{colors:6,tones:6,bases:5,lineRoles:6},
      graphs:Object.fromEntries(Object.entries(this.graphs).map(([k,g])=>[k,{nodes:g.nodes.size,edges:g.edges.size}])),
      unresolved:[
        "Movement/reverse sequence remains unconfirmed in the uploaded state_space_core.mjs.",
        "Space/complement sequence remains unconfirmed in the uploaded state_space_core.mjs.",
        "Causal edges are intentionally not fabricated; add observed or sourced causes through recordCausalEdge().",
        "Dependency edges grow from observed transitions or explicit dependency registration.",
      ],
    };
  }
  exportMesh(){
    const nodes=[],edges=[];
    for(const [graphName,g] of Object.entries(this.graphs)){ for(const n of g.nodes.values()) nodes.push({...n,graph:graphName}); for(const e of g.edges.values()) edges.push({...e,graph:graphName}); }
    return {version:1,schema:"synthia-state-space-assembled",createdAt:new Date().toISOString(),addressCardinality:ADDRESS_CARDINALITY,graphDimensions:GRAPH_DIMENSIONS,nodes,edges,coverage:this.coverage()};
  }
}

export function assembleStateSpace({gateLexicon,hatcher,gnostic}){ return new SynthiaStateSpace({gateLexicon,hatcher,gnostic}); }
export function assembleStateSpaceFromFiles({gateLexiconPath="./gate_lexicon.json",hatcherPath="./yijing_hatcher_dataset.json",gnosticPath="./gnostic_book_of_changes_dataset.json"}={}){
  const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
  return assembleStateSpace({gateLexicon:read(gateLexiconPath),hatcher:read(hatcherPath),gnostic:read(gnosticPath)});
}

export function selfTestAddressCodec(){
  const seen=new Set();
  for(let gate=1;gate<=64;gate++) for(let line=1;line<=6;line++) for(let color=1;color<=6;color++) for(let tone=1;tone<=6;tone++) for(let base=1;base<=5;base++){
    const a={gate,line,color,tone,base},i=packAddress(a),b=unpackAddress(i);
    assert(!seen.has(i),`Address collision ${i}`); seen.add(i);
    assert(JSON.stringify(a)===JSON.stringify(b),`Round-trip failed ${JSON.stringify(a)}`);
  }
  assert(seen.size===ADDRESS_CARDINALITY,`Expected ${ADDRESS_CARDINALITY}, got ${seen.size}`);
  return {ok:true,addresses:seen.size};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [, , lexPath, hatcherPath, gnosticPath, outPath] = process.argv;
  if(!lexPath||!hatcherPath||!gnosticPath){ console.log(JSON.stringify(selfTestAddressCodec(),null,2)); process.exit(0); }
  const engine=assembleStateSpaceFromFiles({gateLexiconPath:lexPath,hatcherPath,gnosticPath});
  console.log(JSON.stringify(engine.coverage(),null,2));
  if(outPath){ fs.writeFileSync(outPath,JSON.stringify(engine.exportMesh(),null,2)); console.log(`Mesh written to ${outPath}`); }
}
