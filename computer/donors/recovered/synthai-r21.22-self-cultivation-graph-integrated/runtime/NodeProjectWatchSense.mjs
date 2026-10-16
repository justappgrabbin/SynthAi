const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16)};
/** Node/Termux filesystem sense. Optional: never loaded by the browser runtime. */
export class NodeProjectWatchSense{
  constructor({root,extensions=['.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.css','.html'],intervalMs=2000,onChange=()=>{}}={}){if(!root)throw new Error('watch root required');this.root=root;this.extensions=new Set(extensions);this.intervalMs=Math.max(500,Number(intervalMs)||2000);this.onChange=onChange;this.state=new Map();this.timer=null;}
  async scan(){const fs=await import('node:fs/promises');const path=await import('node:path');const out=[];const walk=async dir=>{for(const e of await fs.readdir(dir,{withFileTypes:true})){if(['node_modules','.git','dist','build'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(this.extensions.has(path.extname(e.name).toLowerCase())){const content=await fs.readFile(p,'utf8');out.push({path:p,fingerprint:hash(content),size:content.length});}}};await walk(this.root);return out;}
  async poll(){const rows=await this.scan(),next=new Map(rows.map(x=>[x.path,x]));const added=[],modified=[],removed=[];for(const [p,r] of next){if(!this.state.has(p))added.push(r);else if(this.state.get(p).fingerprint!==r.fingerprint)modified.push(r);}for(const [p,r] of this.state)if(!next.has(p))removed.push(r);this.state=next;if(added.length||modified.length||removed.length)await this.onChange({at:Date.now(),added,modified,removed});return {added,modified,removed};}
  async start(){if(this.timer)return this;this.state=new Map((await this.scan()).map(x=>[x.path,x]));this.timer=setInterval(()=>this.poll().catch(()=>{}),this.intervalMs);this.timer.unref?.();return this;}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;return this;}
}
export default NodeProjectWatchSense;
