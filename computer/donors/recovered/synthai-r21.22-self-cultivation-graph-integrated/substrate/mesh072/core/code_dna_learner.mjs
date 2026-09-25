// Pure-JS code-DNA parser and persistent-learning organ.
// Adapted from the ANN software-generation donor without its DB/S3/LLM dependencies.
const FIVE=['Movement','Evolution','Being','Design','Space'];
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const gateFor=s=>(hash(s)%64)+1;
const fieldsFor=(primary,weight=2)=>Object.fromEntries(FIVE.map(k=>[k,k===primary?weight:1]));
const languageOf=filename=>String(filename).split('.').pop()?.toLowerCase()||'text';

function findBlockEnd(content,start){let depth=0,started=false,quote=null,escape=false;for(let i=start;i<content.length;i++){const ch=content[i];if(quote){if(escape){escape=false;continue}if(ch==='\\'){escape=true;continue}if(ch===quote)quote=null;continue}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue}if(ch==='{'){depth++;started=true}else if(ch==='}'&&started){depth--;if(depth===0)return i+1}}return content.length}
function signature(code){const m=code.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|function|class)\s+([\w$]+)\s*(?:\(([^)]*)\))?/);if(m)return `${m[1]}(${m[2]||''})`;const t=code.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);return t?.[1]||code.split('\n')[0].trim().slice(0,120)}
export function extractDependencies(code=''){const out=new Set();for(const re of [/import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm,/require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,/import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm]){let m;while((m=re.exec(code)))out.add(m[1])}return [...out]}

export function parseCodeFile(content='',filename='unknown.js'){
  const ext=languageOf(filename),pieces=[];
  const add=(name,pieceType,start)=>{const end=findBlockEnd(content,start),code=content.slice(start,end).trim();if(!code)return;pieces.push({name,pieceType,language:ext,code,signature:signature(code),dependencies:extractDependencies(code),tags:[pieceType,ext]})};
  const patterns=[
    {re:/export\s+(?:default\s+)?(?:async\s+)?function\s+([\w$]+)\s*\(/gm,type:'function'},
    {re:/export\s+(?:default\s+)?const\s+([\w$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>/gm,type:'function'},
    {re:/export\s+(?:default\s+)?class\s+([A-Z][\w$]*)/gm,type:'class'},
    {re:/export\s+(?:interface|type)\s+([A-Z][\w$]*)\s*[={]/gm,type:'schema'},
  ];
  for(const p of patterns){let m;while((m=p.re.exec(content)))add(m[1],/^use[A-Z]/.test(m[1])?'hook':(/[.]tsx?$/.test(filename)&&/^[A-Z]/.test(m[1])?'component':p.type),m.index)}
  if(/css|scss/.test(ext)){let m;const re=/\.([a-zA-Z0-9_-]+)\s*{[^}]+}/gm;while((m=re.exec(content)))pieces.push({name:m[1],pieceType:'style',language:ext,code:m[0].trim(),signature:`.${m[1]}`,dependencies:[],tags:['style',ext]})}
  return dedupePieces(pieces);
}
const dedupePieces=pieces=>[...new Map(pieces.map(p=>[`${p.name}|${p.pieceType}|${p.signature}`,p])).values()];
export function parseMultipleFiles(files=[]){return files.map(f=>({filename:f.filename,pieces:parseCodeFile(String(f.content||''),f.filename)})).filter(x=>x.pieces.length)}
export function detectCodeGaps(files=[]){const names=new Set(files.map(f=>String(f.filename).replace(/^.*\//,'')));const gaps=[];for(const f of files){for(const dep of extractDependencies(String(f.content||''))){if(!dep.startsWith('.'))continue;const base=dep.split('/').pop();if(![...names].some(n=>n===base||n.startsWith(base+'.')))gaps.push({file:f.filename,type:'missing-relative-dependency',dependency:dep})}for(const m of String(f.content||'').matchAll(/\b(?:TODO|FIXME|NOT_IMPLEMENTED)\b[^\n]*/g))gaps.push({file:f.filename,type:'explicit-incomplete-marker',detail:m[0]})}return gaps}

export class CodeDNALearner{
  constructor(mesh){this.mesh=mesh;this.learned=new Map()}
  ingestFiles(files=[],context={}){
    const parsed=parseMultipleFiles(files),nodes=[],allPieces=parsed.flatMap(x=>x.pieces.map(p=>({...p,filename:x.filename})));
    for(const piece of allPieces){const key=`${piece.filename}:${piece.signature}:${hash(piece.code)}`;if(this.learned.has(key))continue;const dimension=piece.pieceType==='schema'?'Evolution':piece.pieceType==='style'?'Being':piece.pieceType==='component'?'Space':'Design';const gate=gateFor(key);const id=`code-dna:${hash(key).toString(16)}`;if(!this.mesh.node(id)){this.mesh.addKnowledge({id,dimension,gate,text:piece.code,scale:'code-dna',source:{type:'code-ingest',filename:piece.filename},attributes:{epistemicStatus:'recorded',pieceType:piece.pieceType,language:piece.language,name:piece.name,signature:piece.signature,dependencies:piece.dependencies,tags:piece.tags,context},provenance:[`file:${piece.filename}`],fields:fieldsFor(dimension,2),residency:'warm'})}this.learned.set(key,id);nodes.push(id)}
    const signatureGroups=new Map();for(const piece of allPieces){const shape=`${piece.pieceType}:${piece.dependencies.slice().sort().join(',')}`;if(!signatureGroups.has(shape))signatureGroups.set(shape,[]);signatureGroups.get(shape).push(piece)}
    const recipes=[];for(const [shape,members] of signatureGroups){if(members.length<2)continue;const id=`recipe:${hash(shape).toString(16)}`;if(!this.mesh.node(id)){this.mesh.addState({id,kind:'code-recipe',scale:'semantic',text:`Reusable ${shape} pattern`,fields:fieldsFor('Design',2),address:{gate:gateFor(shape),dimension:'Design',canonicalAddressStatus:'learned-derived'},source:{type:'code-dna-learner'},residency:'warm',provenance:members.map(m=>`file:${m.filename}`),attributes:{epistemicStatus:'derived',shape,members:members.map(m=>({filename:m.filename,name:m.name,signature:m.signature}))}})}recipes.push(id)}
    const gaps=detectCodeGaps(files);for(const gap of gaps){const id=`code-gap:${hash(JSON.stringify(gap)).toString(16)}`;if(!this.mesh.node(id))this.mesh.addState({id,kind:'code-gap',scale:'diagnostic',text:`${gap.type}: ${gap.file}`,fields:fieldsFor('Design',2),address:{gate:gateFor(JSON.stringify(gap)),dimension:'Design',canonicalAddressStatus:'diagnostic-derived'},source:{type:'code-dna-learner'},residency:'hot',provenance:[`file:${gap.file}`],attributes:{epistemicStatus:'derived',...gap}})}
    return {files:parsed.length,pieces:allPieces.length,nodes,recipes,gaps};
  }
}
export default CodeDNALearner;
