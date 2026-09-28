const DEFAULT_STYLE={width:180,height:84,x:32,y:32};

export class AppCanvasAutomaton {
  constructor({storageKey='paper-app-studio:canvas:v1'}={}) {
    this.storageKey=storageKey;
    this.nodes=[];
    this.listeners=new Set();
    this.load();
  }
  emit(){for(const fn of this.listeners)fn(this.snapshot());this.persist();}
  onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  snapshot(){return this.nodes.map(n=>typeof structuredClone==='function'?structuredClone(n):JSON.parse(JSON.stringify(n)));}
  load(){if(typeof localStorage==='undefined')return;try{this.nodes=JSON.parse(localStorage.getItem(this.storageKey)||'[]')||[];}catch{this.nodes=[];}}
  persist(){if(typeof localStorage==='undefined')return;try{localStorage.setItem(this.storageKey,JSON.stringify(this.nodes));}catch{}}
  add(type,payload={},style={}){
    const id=`node:${Date.now().toString(36)}:${Math.random().toString(36).slice(2,7)}`;
    const node={id,type,payload:{...payload},style:{...DEFAULT_STYLE,...style},bindings:[]};
    this.nodes.push(node);this.emit();return node;
  }
  remove(id){this.nodes=this.nodes.filter(n=>n.id!==id);this.emit();}
  get(id){return this.nodes.find(n=>n.id===id)||null;}
  move(id,x,y){const n=this.get(id);if(!n)return;n.style.x=Math.max(0,Math.round(x));n.style.y=Math.max(0,Math.round(y));this.emit();}
  resize(id,width,height){const n=this.get(id);if(!n)return;n.style.width=Math.max(60,Math.round(width));n.style.height=Math.max(36,Math.round(height));this.emit();}
  updatePayload(id,patch){const n=this.get(id);if(!n)return;n.payload={...n.payload,...patch};this.emit();}
  bind(nodeId,functionId,event='click'){const n=this.get(nodeId);if(!n)return null;n.bindings=n.bindings.filter(b=>!(b.functionId===functionId&&b.event===event));const b={functionId,event};n.bindings.push(b);this.emit();return b;}
  unbind(nodeId,functionId,event='click'){const n=this.get(nodeId);if(!n)return;n.bindings=n.bindings.filter(b=>!(b.functionId===functionId&&b.event===event));this.emit();}
  clear(){this.nodes=[];this.emit();}

  exportHTML(functionLookup=()=>null,{title='Paper App'}={}) {
    const nativeFunctions=new Map();
    for(const node of this.nodes) for(const binding of node.bindings||[]) {
      const fn=functionLookup(binding.functionId);
      if(fn?.executable && fn?.source) nativeFunctions.set(fn.id,fn);
    }
    const fnNames=new Map(); let seq=0;
    for(const fn of nativeFunctions.values()) fnNames.set(fn.id,`paperFn${++seq}`);
    const fnSource=[...nativeFunctions.values()].map(fn=>{
      let src=String(fn.source).trim();
      const safe=fnNames.get(fn.id);
      if(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+/.test(src)) src=src.replace(/^\s*(?:export\s+)?(?:default\s+)?((?:async\s+)?function)\s+[A-Za-z_$][\w$]*/,`$1 ${safe}`);
      else if(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/.test(src)) src=src.replace(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,`const ${safe} =`);
      else return `/* ${fn.name}: source requires manual adaptation before export */`;
      return src;
    }).join('\n\n');

    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const nodes=this.nodes.filter(n=>n.type!=='function').map(n=>{
      const st=`left:${n.style.x}px;top:${n.style.y}px;width:${n.style.width}px;height:${n.style.height}px;`;
      let tag='div', body=esc(n.payload.text||n.payload.label||n.type), attrs='';
      if(n.type==='button')tag='button';
      if(n.type==='input'){tag='input';body='';attrs=` placeholder="${esc(n.payload.placeholder||'Type here')}"`;}
      if(n.type==='image'){tag='img';body='';attrs=` src="${esc(n.payload.src||'')}" alt="${esc(n.payload.alt||'')}"`;}
      const bindings=(n.bindings||[]).map(b=>{
        const fn=fnNames.get(b.functionId); if(!fn)return '';
        const evt=b.event==='change'?'onchange':b.event==='input'?'oninput':b.event==='load'?'data-onload':'onclick';
        return evt==='data-onload'?` data-onload="${fn}"`:` ${evt}="${fn}(event)"`;
      }).join('');
      return `<${tag} class="paper-node paper-${esc(n.type)}" style="${st}"${attrs}${bindings}>${body}</${tag}>`;
    }).join('\n');

    return `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>html,body{margin:0;min-height:100%;font-family:system-ui,sans-serif;background:#f5f2e9;color:#171713}.paper-stage{position:relative;min-height:100vh;overflow:auto}.paper-node{position:absolute;box-sizing:border-box;border:1px solid #bbb7aa;border-radius:14px;background:#fff;padding:12px;box-shadow:0 6px 18px #0001}.paper-button{cursor:pointer;background:#171713;color:#fff;font-weight:700}.paper-input{font:inherit}.paper-image{object-fit:cover;padding:0}</style></head><body><main class="paper-stage">${nodes}</main><script>${fnSource}\nfor(const el of document.querySelectorAll('[data-onload]')){const fn=globalThis[el.dataset.onload];if(typeof fn==='function')fn.call(el,{type:'load',target:el});}</script></body></html>`;
  }
}

export default AppCanvasAutomaton;
