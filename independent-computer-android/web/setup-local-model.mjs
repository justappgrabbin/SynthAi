// Download original quantized weights and runtime once; subsequent inference is local.
import {prebuiltAppConfig} from './vendor/webllm.mjs';
import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const id=process.argv[2]||'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
const record=prebuiltAppConfig.model_list.find(m=>m.model_id===id);
if(!record)throw Error('Unknown WebLLM model: '+id);
const directory=resolve('models',id);await mkdir(directory,{recursive:true});
const dataDirectory=join(directory,'resolve','main');await mkdir(dataDirectory,{recursive:true});
const base=record.model.replace(/\/$/,'')+'/resolve/main/';
const receipts=[];
async function download(name,url){
  if(!/^[\w.-]+$/.test(name))throw Error('Unsafe model filename');
  console.log('Downloading',name);
  const response=await fetch(url);if(!response.ok)throw Error(url+': HTTP '+response.status);
  const bytes=new Uint8Array(await response.arrayBuffer());
  const destination=name==='model.wasm'?directory:dataDirectory;
  await writeFile(join(destination,name+'.partial'),bytes);await rename(join(destination,name+'.partial'),join(destination,name));
  receipts.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:url});
  return bytes;
}
const config=JSON.parse(new TextDecoder().decode(await download('mlc-chat-config.json',base+'mlc-chat-config.json')));
const manifest=JSON.parse(new TextDecoder().decode(await download('ndarray-cache.json',base+'ndarray-cache.json')));
const filenames=new Set([...(config.tokenizer_files||[]),...manifest.records.map(r=>r.dataPath)]);
for(const name of filenames)await download(name,base+name);
await download('model.wasm',record.model_lib);
await writeFile(join(directory,'download-receipt.json'),JSON.stringify({model:id,files:receipts},null,2));
let local=[];try{local=JSON.parse(await readFile('models/local-config.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
local=local.filter(r=>r.model_id!==id);
local.push({...record,model:'/models/'+id+'/',model_lib:'/models/'+id+'/model.wasm'});
await writeFile('models/local-config.json',JSON.stringify(local,null,2));
console.log('Model installed locally:',id,'files:',receipts.length);
