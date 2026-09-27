import { fnv1a, extensionOf, structuralAddress, dimensionForPrimitive } from './primitive-file-automaton.js';

function balancedSlice(source, braceIndex) {
  let depth=0, quote=null, escape=false, lineComment=false, blockComment=false;
  for(let i=braceIndex;i<source.length;i++) {
    const c=source[i], n=source[i+1];
    if(lineComment){ if(c==='\n') lineComment=false; continue; }
    if(blockComment){ if(c==='*'&&n==='/'){blockComment=false;i++;} continue; }
    if(quote){ if(escape){escape=false;continue;} if(c==='\\'){escape=true;continue;} if(c===quote)quote=null; continue; }
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{') depth++;
    else if(c==='}') {depth--; if(depth===0) return i+1;}
  }
  return source.length;
}

function paramsOf(raw='') {
  return raw.split(',').map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/[:=].*$/,'').replace(/[{}\[\]\.\.\.]/g,'').trim()).filter(Boolean);
}

function detectEffects(source='') {
  const effects=[];
  const add=(id,label)=>{if(!effects.some(x=>x.id===id))effects.push({id,label});};
  if(/\b(document|window)\b|querySelector|getElementById|createElement|classList/.test(source)) add('dom','changes or reads the page');
  if(/addEventListener|onclick|onchange|onsubmit|oninput/.test(source)) add('events','handles user or browser events');
  if(/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(source)) add('network','uses network I/O');
  if(/localStorage|sessionStorage|indexedDB/.test(source)) add('storage','reads or writes persistent browser state');
  if(/setTimeout|setInterval|requestAnimationFrame/.test(source)) add('time','uses timers or animation frames');
  if(/\bconsole\./.test(source)) add('console','writes diagnostic output');
  if(/\breturn\b/.test(source)) add('return','returns a value');
  if(/\bawait\b|\bPromise\b/.test(source)) add('async','performs asynchronous work');
  if(/\.push\(|\.splice\(|\.set\(|\[[^\]]+\]\s*=/.test(source)) add('mutation','mutates a collection or state');
  return effects;
}

function calledNames(source='') {
  const skip=new Set(['if','for','while','switch','catch','function','return','typeof','new','console','Math','JSON','Object','Array','String','Number','Boolean','Date','Promise']);
  return [...new Set([...source.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]).filter(n=>!skip.has(n)))];
}

export function explainFunction(fn) {
  const bits=[];
  bits.push(`${fn.name} takes ${fn.params.length ? fn.params.join(', ') : 'no named inputs'}.`);
  if(fn.effects.length) bits.push(`It ${fn.effects.map(e=>e.label).join(', ')}.`);
  else bits.push('No obvious external side effects were detected.');
  if(fn.calls.length) bits.push(`It calls ${fn.calls.slice(0,6).join(', ')}${fn.calls.length>6?' and more':''}.`);
  bits.push(`Static complexity score: ${fn.complexity}.`);
  return bits.join(' ');
}

function complexityOf(source='') {
  const branches=(source.match(/\b(if|else|switch|case|for|while|catch|&&|\|\||\?)/g)||[]).length;
  const calls=(source.match(/\b[A-Za-z_$][\w$]*\s*\(/g)||[]).length;
  return Math.max(1,1+branches+Math.floor(calls/3));
}

function buildRecord({name,params,source,start,end,artifact,language,kind='function'}) {
  const effects=detectEffects(source), calls=calledNames(source);
  const encoder=new TextEncoder();
  const byteStart=artifact.textLike?encoder.encode((artifact.text||'').slice(0,start)).length:start;
  const byteEnd=artifact.textLike?byteStart+encoder.encode(source).length:end;
  const record={
    id:`fn:${fnv1a(new TextEncoder().encode(`${artifact.hash}:${byteStart}:${byteEnd}:${name}`))}`,
    name:name||'anonymous', params, source, charStart:start, charEnd:end, start:byteStart, end:byteEnd, language, kind, effects, calls,
    complexity:complexityOf(source),
    sourceArtifactId:artifact.id,
    sourceFile:artifact.name,
    executable:['js','mjs','cjs','javascript'].includes(language) && ['function','arrow','arrow-single'].includes(kind),
  };
  record.dimension=dimensionForPrimitive({kind:'function',text:effects.map(e=>e.id).join(' ')});
  record.address=structuralAddress({start:byteStart,end:byteEnd,totalBytes:Math.max(1,artifact.size),kind:'function',dimension:record.dimension});
  record.explanation=explainFunction(record);
  return record;
}

function jsFunctions(artifact) {
  const s=artifact.text||'', out=[], seen=new Set(), language=extensionOf(artifact.name)||'js';
  const patterns=[
    {rx:/\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g, kind:'function'},
    {rx:/\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{/g, kind:'arrow'},
    {rx:/\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?([A-Za-z_$][\w$]*)\s*=>\s*\{/g, kind:'arrow-single'},
  ];
  for(const p of patterns) {
    p.rx.lastIndex=0; let m;
    while((m=p.rx.exec(s))) {
      const brace=s.indexOf('{',m.index); if(brace<0) continue;
      const end=balancedSlice(s,brace); const key=`${m.index}:${end}`; if(seen.has(key))continue; seen.add(key);
      out.push(buildRecord({name:m[1],params:paramsOf(m[2]||''),source:s.slice(m.index,end),start:m.index,end,artifact,language,kind:p.kind}));
    }
  }
  // Class methods as reusable behaviors.
  const classRx=/\bclass\s+([A-Za-z_$][\w$]*)[^\{]*\{/g; let cm;
  while((cm=classRx.exec(s))) {
    const classEnd=balancedSlice(s,s.indexOf('{',cm.index));
    const body=s.slice(s.indexOf('{',cm.index)+1,classEnd-1); const base=s.indexOf('{',cm.index)+1;
    const methodRx=/(?:^|\n)\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g; let mm;
    while((mm=methodRx.exec(body))) {
      if(mm[1]==='constructor') continue;
      const absStart=base+mm.index+(mm[0].search(/\S/)); const brace=s.indexOf('{',absStart); const end=balancedSlice(s,brace);
      const name=`${cm[1]}.${mm[1]}`; const key=`${absStart}:${end}`; if(seen.has(key))continue;seen.add(key);
      out.push(buildRecord({name,params:paramsOf(mm[2]),source:s.slice(absStart,end),start:absStart,end,artifact,language,kind:'method'}));
    }
  }
  return out.sort((a,b)=>a.start-b.start);
}

function pythonFunctions(artifact) {
  const s=artifact.text||'', lines=s.split('\n'), offsets=[]; let pos=0; for(const l of lines){offsets.push(pos);pos+=l.length+1;}
  const out=[];
  for(let i=0;i<lines.length;i++) {
    const m=lines[i].match(/^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*:/); if(!m)continue;
    const indent=m[1].length; let j=i+1; while(j<lines.length){ if(lines[j].trim() && (lines[j].match(/^\s*/)?.[0].length||0)<=indent) break; j++; }
    const start=offsets[i], end=j<lines.length?offsets[j]:s.length;
    out.push(buildRecord({name:m[2],params:paramsOf(m[3]),source:s.slice(start,end),start,end,artifact,language:'py',kind:'function'}));
  }
  return out;
}

function genericFunctions(artifact) {
  const s=artifact.text||'', ext=extensionOf(artifact.name), out=[];
  const rx=/\b(?:func|fn|def|function)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/g; let m;
  while((m=rx.exec(s))) {
    const lineEnd=s.indexOf('\n',m.index); const end=lineEnd<0?s.length:lineEnd;
    out.push(buildRecord({name:m[1],params:paramsOf(m[2]),source:s.slice(m.index,end),start:m.index,end,artifact,language:ext||'text',kind:'signature'}));
  }
  return out;
}

export function extractFunctions(artifact) {
  if(!artifact?.textLike) return [];
  const ext=extensionOf(artifact.name);
  if(['js','mjs','cjs','ts','tsx','jsx'].includes(ext)) return jsFunctions(artifact);
  if(['py','pyw'].includes(ext)) return pythonFunctions(artifact);
  return genericFunctions(artifact);
}

export class FunctionLibrary {
  constructor({storageKey='paper-app-studio:functions:v1'}={}) {
    this.storageKey=storageKey;
    this.items=new Map();
    this.load();
  }
  load() {
    if(typeof localStorage==='undefined') return;
    try { for(const item of JSON.parse(localStorage.getItem(this.storageKey)||'[]')) this.items.set(item.id,item); } catch {}
  }
  persist() {
    if(typeof localStorage==='undefined') return;
    try { localStorage.setItem(this.storageKey,JSON.stringify([...this.items.values()])); } catch {}
  }
  add(item) { this.items.set(item.id,{...item,savedAt:Date.now()}); this.persist(); return this.items.get(item.id); }
  addMany(items=[]) { for(const item of items) this.items.set(item.id,{...item,savedAt:item.savedAt||Date.now()}); this.persist(); return items; }
  remove(id) { const ok=this.items.delete(id); this.persist(); return ok; }
  clear(){this.items.clear();this.persist();}
  list(){return [...this.items.values()].sort((a,b)=>(a.name||'').localeCompare(b.name||''));}
  get(id){return this.items.get(id)||null;}
}

export default FunctionLibrary;
