/** Sovereign source-mutation/staging process. It writes only to its staging root.
 * Node filesystem dependencies are loaded only when a filesystem residence invokes stage().
 */
export class SourceMutationProcess{
 constructor({stagingRoot,sourceRoot=null}={}){if(!stagingRoot)throw new Error('stagingRoot required');this.stagingRoot=String(stagingRoot);this.sourceRoot=sourceRoot?String(sourceRoot):null;this.history=[];}
 applyText(current='',intent={}){const payload=String(intent.payload??'');switch(intent.operation){case'replace':return payload;case'append':return current+(current?'\n':'')+payload;case'prepend':return payload+(current?'\n':'')+current;case'delete':return current.replace(payload,'');case'insert':{const m=payload.match(/^INSERT_AFTER\((.+?)\):\n/);if(!m)return current+(current?'\n':'')+payload;const code=payload.slice(m[0].length);if(!current.includes(m[1]))throw new Error('insert anchor not found');return current.replace(m[1],m[1]+'\n'+code);}default:throw new Error(`unsupported mutation operation: ${intent.operation}`)}}
 async stage(intent={}){
  if(typeof process==='undefined'||!process?.versions?.node)throw new Error('source mutation requires a Node/local filesystem residence');
  const [fsMod,pathMod,cryptoMod]=await Promise.all([import('node:fs/promises'),import('node:path'),import('node:crypto')]);const fs=fsMod.default||fsMod,path=pathMod.default||pathMod,crypto=cryptoMod.default||cryptoMod;
  const stagingRoot=path.resolve(this.stagingRoot),sourceRoot=this.sourceRoot?path.resolve(this.sourceRoot):null;const target=String(intent.target||'').replace(/^\.\//,'');if(!target||target.includes('..')||path.isAbsolute(target))throw new Error('safe relative target required');const out=path.resolve(stagingRoot,target);if(!out.startsWith(stagingRoot+path.sep))throw new Error('target escapes staging root');let current='';try{current=await fs.readFile(out,'utf8')}catch{if(sourceRoot){const src=path.resolve(sourceRoot,target);if(src.startsWith(sourceRoot+path.sep)){try{current=await fs.readFile(src,'utf8')}catch{}}}}const modified=this.applyText(current,intent);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,modified,'utf8');const rec={id:`mutation:${Date.now()}:${this.history.length+1}`,at:Date.now(),target,operation:intent.operation,reason:String(intent.reason||''),hash:crypto.createHash('sha256').update(modified).digest('hex'),bytes:Buffer.byteLength(modified)};this.history.push(rec);return {...rec,path:out};
 }
 snapshot(){return {stagingRoot:this.stagingRoot,sourceRoot:this.sourceRoot,history:[...this.history]};}
}
export default SourceMutationProcess;
