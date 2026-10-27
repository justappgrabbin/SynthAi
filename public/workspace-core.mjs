// SYNTH AI Workspace — dependency-free browser core. No uploads leave this browser.
// ZIP imports are text-only; donor archives remain immutable.
export const STORAGE_KEY = 'synthai.workspace.plan001.v1';
export const GOALS = Object.freeze([
  { id:'G01', title:'Identify the canonical SYNTH AI Computer', status:'done', evidence:'https://github.com/justappgrabbin/SynthAi', category:'Foundation' },
  { id:'G02', title:'Inventory the seven supplied source archives', status:'done', evidence:'Drive metadata and archive manifests reviewed 2026-10-27', category:'Foundation' },
  { id:'G03', title:'Upload a project or ZIP on a phone', status:'todo', evidence:'', category:'Workspace' },
  { id:'G04', title:'Render a real uploaded HTML app in the isolated preview', status:'todo', evidence:'', category:'Workspace' },
  { id:'G05', title:'Verify goals survive refresh and export/import', status:'todo', evidence:'', category:'Workspace' },
  { id:'G06', title:'Publish and test the website on a real HTTPS URL', status:'done', evidence:'Vercel deployment dpl_GyMFGBvCXrYJV1ZwtvS7sFnPbfpa READY; preview workspace and donor assets HTTP 200', category:'Deployment' },
  { id:'G07', title:'Connect and verify the read-only ChatGPT MCP bridge', status:'todo', evidence:'', category:'ChatGPT' },
  { id:'G08', title:'Approve and version Plan 001: language model', status:'todo', evidence:'', category:'Language Model' },
  { id:'G09', title:'Demonstrate grounded generative language with evaluation', status:'todo', evidence:'', category:'Language Model' },
  { id:'G10', title:'Mount actual source in Computer and execute canonical Klein engines', status:'done', evidence:'GitHub Actions 40526327177 passed archive source mount, tool execution, checksums and restart checks', category:'Integration' },
  { id:'G11', title:'Execute original Generative Address Klein and Morph chat routes', status:'done', evidence:'GitHub Actions 40526327177 checked out original Generative Address repository; both distinct chat routes passed', category:'Integration' },
  { id:'G12', title:'Train and run an original transformer with verified checkpoint and new prompts', status:'todo', evidence:'', category:'Language Model' }
]);

const types = /\.(?:html?|css|mjs|js|json|md|txt|svg|ts|tsx|jsx|yaml|yml|xml|csv|py|toml|sh)$/i;
const MAX_ARCHIVE = 200 * 1024 * 1024;
const MAX_ENTRIES = 10000;
const MAX_FILE = 3 * 1024 * 1024;
const MAX_TOTAL = 30 * 1024 * 1024;

export function safePath(raw) {
  const path = String(raw).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!path || path.includes('\0') || /^(?:[a-z]:|\/)/i.test(path) ||
    path.split('/').some(segment => segment === '..' || segment === '.' || !segment)) return null;
  return path;
}
export function newBoard() {
  return { schema:'synthai-goals-v1', plan:'PLAN-001', updatedAt:new Date().toISOString(),
    goals:GOALS.map(g=>({...g})), notes:[] };
}
export function validateBoard(data) {
  if (!data || data.schema !== 'synthai-goals-v1' || !Array.isArray(data.goals) || data.goals.length > 500)
    throw new Error('Invalid goal board backup');
  const seen = new Set();
  const goals = data.goals.map(g=>{
    if (!g || !/^[A-Za-z0-9_-]{1,30}$/.test(g.id || '') || seen.has(g.id) ||
        !['todo','doing','done'].includes(g.status) || typeof g.title !== 'string' ||
        g.title.length > 240 || typeof g.evidence !== 'string' || g.evidence.length > 2000 ||
        (g.status === 'done' && !g.evidence.trim())) throw new Error('Invalid goal entry');
    seen.add(g.id);
    return {id:g.id,title:g.title,status:g.status,evidence:g.evidence,category:String(g.category||'Other').slice(0,64)};
  });
  return {schema:'synthai-goals-v1',plan:'PLAN-001',updatedAt:new Date().toISOString(),
    goals,notes:Array.isArray(data.notes)?data.notes.slice(-100).filter(n=>typeof n==='string').map(n=>n.slice(0,1000)):[]};
}
export function updateGoal(board, id, status, evidence='') {
  const draft = validateBoard(board);
  if (!['todo','doing','done'].includes(status)) throw new Error('Unknown status');
  const goal = draft.goals.find(g=>g.id===id);
  if (!goal) throw new Error('Unknown goal');
  if (status==='done' && !String(evidence || goal.evidence).trim()) throw new Error('Add a verification note before checking off this goal');
  goal.status = status;
  goal.evidence = String(evidence || goal.evidence).trim().slice(0,2000);
  draft.updatedAt = new Date().toISOString();
  return draft;
}
export function progress(board) {
  const n=board.goals.length;const d=board.goals.filter(g=>g.status==='done').length;
  return {done:d,total:n,percent:n?Math.round(d/n*100):0};
}
export function zipDirectory(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_ARCHIVE) throw new Error('ZIP exceeds 200 MB or is not an ArrayBuffer');
  const v=new DataView(buffer), bytes=new Uint8Array(buffer), length=v.byteLength;
  let end=-1;
  for(let i=length-22;i>=Math.max(0,length-65557);i--){
    if(v.getUint32(i,true)===0x06054b50){end=i;break;}
  }
  if(end<0) throw new Error('Not a ZIP archive with a readable central directory');
  const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true);
  if(count===0xffff || start===0xffffffff || count>MAX_ENTRIES) throw new Error('ZIP64 or excessive archive entries are unsupported');
  if(start>length) throw new Error('Invalid ZIP directory offset');
  let pos=start;
  const out=[];
  const decoder=new TextDecoder('utf-8',{fatal:false});
  for(let i=0;i<count;i++){
    if(pos+46>length || v.getUint32(pos,true)!==0x02014b50) throw new Error('Damaged ZIP directory');
    const flags=v.getUint16(pos+8,true), method=v.getUint16(pos+10,true);
    const compressedSize=v.getUint32(pos+20,true), size=v.getUint32(pos+24,true);
    const nameLen=v.getUint16(pos+28,true), extra=v.getUint16(pos+30,true), comment=v.getUint16(pos+32,true);
    const local=v.getUint32(pos+42,true), stop=pos+46+nameLen+extra+comment;
    if(stop>length) throw new Error('Damaged ZIP entry');
    const original=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
    const path=safePath(original);
    if(path && !original.endsWith('/')) out.push({path,size,compressedSize,flags,method,local});
    pos=stop;
  }
  return out;
}
export async function extractTextZip(buffer,{maxFiles=350}={}) {
  const files = [], skipped=[], seen=new Set();
  const view=new DataView(buffer), bytes=new Uint8Array(buffer);
  let total=0;
  const entries=zipDirectory(buffer);
  for(const item of entries){
    if(!types.test(item.path) || item.size>MAX_FILE || total+item.size>MAX_TOTAL ||
      files.length>=maxFiles || (item.flags&1)!==0 || ![0,8].includes(item.method) || seen.has(item.path)){
      skipped.push(item.path);continue;
    }
    const off=item.local;
    if(off+30>bytes.length || view.getUint32(off,true)!==0x04034b50) {skipped.push(item.path);continue;}
    const from=off+30+view.getUint16(off+26,true)+view.getUint16(off+28,true);
    if(from+item.compressedSize>bytes.length){skipped.push(item.path);continue;}
    let raw;
    if(item.method===0){raw=bytes.slice(from,from+item.compressedSize);}
    else{
      if(typeof DecompressionStream==='undefined') throw new Error('This browser cannot unpack deflated ZIP files');
      const stream=new Blob([bytes.slice(from,from+item.compressedSize)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const reader=stream.getReader(),chunks=[];
      let consumed=0;
      try {
        while(true){
          const {value,done}=await reader.read();if(done)break;
          consumed+=value.length;
          if(consumed>MAX_FILE){await reader.cancel();throw new Error('ZIP entry exceeds safe extraction limit');}
          chunks.push(value);
        }
      }catch(error){skipped.push(item.path);continue;}
      raw=new Uint8Array(consumed);let n=0;for(const chunk of chunks){raw.set(chunk,n);n+=chunk.length;}
    }
    if(raw.byteLength!==item.size){skipped.push(item.path);continue;}
    files.push({path:item.path,text:new TextDecoder('utf-8').decode(raw),size:item.size});
    total+=item.size;seen.add(item.path);
  }
  return {files,skipped,entryCount:entries.length};
}
export function pickEntry(files) {
  if(!files.length)return null;
  const html=files.filter(f=>/\.html?$/i.test(f.path));
  if(!html.length)return null;
  return html.find(f=>/\/(?:index|app)\.html?$/i.test('/'+f.path)) || html[0];
}
export function makeSafePreview(files, entry) {
  if(!entry || !/\.html?$/i.test(entry.path)) throw new Error('Select an HTML file for preview');
  const byPath=new Map(files.map(f=>[f.path,f.text]));
  const prefix=entry.path.includes('/')?entry.path.slice(0,entry.path.lastIndexOf('/')+1):'';
  const resolve=link=>{
    const clean=String(link).split(/[?#]/)[0].replace(/^\.\//,'');
    const path=safePath(prefix+clean);
    return path && byPath.has(path)?byPath.get(path):null;
  };
  let html=entry.text;
  html=html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi,(full,a,b)=>{
    const source=(a+' '+b).match(/href=["']([^"']+)["']/i)?.[1];
    const css=source?resolve(source):null;
    return css===null?'': '<style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>';
  });
  html=html.replace(/<script\b([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi,(full,a,url,b)=>{
    const js=resolve(url);
    if(js===null)return '';
    return '<script'+(a+' '+b).replace(/\s+integrity=["'][^"']*["']/ig,'')+'>'+js.replace(/<\/script/gi,'<\\/script')+'</script>';
  });
  const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' blob:; style-src \'unsafe-inline\'; img-src data: blob:; font-src data: blob:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">';
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head([^>]*)>/i,'<head$1>'+policy);
  if (/<html(?:\s[^>]*)?>/i.test(html)) return html.replace(/<html([^>]*)>/i,'<html$1><head>'+policy+'</head>');
  return '<head>'+policy+'</head>'+html;
}
