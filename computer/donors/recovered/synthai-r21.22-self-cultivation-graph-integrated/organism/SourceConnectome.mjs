const CODE_EXT=/\.(?:[cm]?[jt]sx?|json|css|scss|html?)$/i;
const clone=x=>x==null?x:structuredClone(x);
const normalize=p=>String(p||'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/{2,}/g,'/');
const dirname=p=>{const n=normalize(p);const i=n.lastIndexOf('/');return i<0?'':n.slice(0,i)};
const join=(a,b)=>normalize(`${a?`${a}/`:''}${b}`).split('/').reduce((s,x)=>{if(!x||x==='.')return s;if(x==='..')s.pop();else s.push(x);return s},[]).join('/');
const ext=p=>{const m=String(p).match(/(\.[^./]+)$/);return m?.[1]||''};
const importSpecs=code=>{const out=[];for(const re of [/import\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gm,/export\s+[^'";]+?\s+from\s+['"]([^'"]+)['"]/gm,/require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,/import\s*\(\s*['"]([^'"]+)['"]\s*\)/gm]){let m;while((m=re.exec(String(code||''))))out.push(m[1])}return [...new Set(out)]};

export class SourceConnectome{
  constructor(files=[]){this.nodes=new Map();this.externals=new Set();this.cycles=[];this.ingest(files);}
  ingest(files=[]){for(const f of files){const filename=normalize(f.filename||f.name);if(!filename||!CODE_EXT.test(filename))continue;const content=String(f.content??f.text??'');this.nodes.set(filename,{filename,content,imports:importSpecs(content),dependencies:[],dependents:[],missing:[]});}this.#resolve();return this;}
  #resolve(){this.externals.clear();for(const n of this.nodes.values()){n.dependencies=[];n.dependents=[];n.missing=[];}for(const n of this.nodes.values())for(const spec of n.imports){if(!spec.startsWith('.')){this.externals.add(spec);continue;}const r=this.resolveRelative(n.filename,spec);if(r){n.dependencies.push({spec,target:r});this.nodes.get(r)?.dependents.push(n.filename);}else n.missing.push({spec,from:n.filename});}this.cycles=this.#detectCycles();}
  resolveRelative(from,spec){const base=join(dirname(from),spec);const candidates=ext(base)?[base]:[base,`${base}.mjs`,`${base}.js`,`${base}.cjs`,`${base}.ts`,`${base}.tsx`,`${base}.jsx`,`${base}.json`,`${base}/index.mjs`,`${base}/index.js`,`${base}/index.ts`,`${base}/index.tsx`];return candidates.find(x=>this.nodes.has(x))||null;}
  #detectCycles(){const seen=new Set(),stack=[],active=new Set(),found=new Map();const visit=id=>{if(active.has(id)){const i=stack.indexOf(id);const c=[...stack.slice(i),id];const key=[...new Set(c)].sort().join('|');if(!found.has(key))found.set(key,c);return;}if(seen.has(id))return;seen.add(id);active.add(id);stack.push(id);for(const d of this.nodes.get(id)?.dependencies||[])visit(d.target);stack.pop();active.delete(id);};for(const id of this.nodes.keys())visit(id);return [...found.values()];}
  activationOrder(){const degree=new Map([...this.nodes].map(([id,n])=>[id,n.dependencies.length]));const q=[...degree].filter(([,d])=>d===0).map(([id])=>id),out=[];while(q.length){const id=q.shift();out.push(id);for(const dep of this.nodes.get(id)?.dependents||[]){degree.set(dep,degree.get(dep)-1);if(degree.get(dep)===0)q.push(dep);}}for(const id of this.nodes.keys())if(!out.includes(id))out.push(id);return out;}
  snapshot(){return {files:this.nodes.size,externals:[...this.externals],cycles:this.cycles.map(clone),activationOrder:this.activationOrder(),nodes:[...this.nodes.values()].map(n=>({filename:n.filename,imports:[...n.imports],dependencies:n.dependencies.map(clone),dependents:[...n.dependents],missing:n.missing.map(clone)}))};}
}
export {importSpecs as extractSourceImports,normalize as normalizeSourcePath};
export default SourceConnectome;
