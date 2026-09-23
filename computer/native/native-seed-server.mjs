import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { NativeSeedRuntime } from './NativeSeedRuntime.mjs';
import { JsonFilePersistence } from '../runtime/json-file-persistence.mjs';

class NativePhoneHostProxy {
  constructor(){ this.applications=[]; this.documents=[]; this.contacts=[]; this.settings=[]; }
  async listApplications(){ return structuredClone(this.applications); }
  async listDocuments(){ return structuredClone(this.documents); }
  async listContacts(){ return structuredClone(this.contacts); }
  async listSettings(){ return structuredClone(this.settings); }
  async launchApplication(packageName,context={}){
    return { acknowledged:true, nativeLaunch:true, packageName:String(packageName), context:structuredClone(context) };
  }
  replace(payload={}){
    if(Array.isArray(payload.applications)) this.applications=structuredClone(payload.applications);
    if(Array.isArray(payload.documents)) this.documents=structuredClone(payload.documents);
    if(Array.isArray(payload.contacts)) this.contacts=structuredClone(payload.contacts);
    if(Array.isArray(payload.settings)) this.settings=structuredClone(payload.settings);
  }
}

const PORT = Number(process.env.SYNTHAI_NATIVE_PORT ?? 17757);
const HOST = process.env.SYNTHAI_NATIVE_HOST ?? '127.0.0.1';
const statePath = process.env.SYNTHAI_NATIVE_STATE
  ?? path.join(os.homedir(), '.synthai', 'native-seed-state.json');

const runtime = new NativeSeedRuntime({
  persistence:new JsonFilePersistence(statePath),
  namespace:'synthai-native-seed',
});
await runtime.boot();

const phoneHost = new NativePhoneHostProxy();
await runtime.bindPhoneHost(phoneHost);

async function mountOptionalResidents(){
  const results={};
  if(process.env.SYNTHIA57_BASE){
    try { results.synthia57=await runtime.mountSynthia57({base:process.env.SYNTHIA57_BASE}); }
    catch(error){ results.synthia57={error:String(error?.message??error)}; }
  }
  if(process.env.CONSCIOUSNESS_REALM_MODULE){
    try { results.realm=await runtime.mountConsciousnessRealm({moduleSpecifier:process.env.CONSCIOUSNESS_REALM_MODULE}); }
    catch(error){ results.realm={error:String(error?.message??error)}; }
  }
  if(process.env.TRIFORM_MODULE){
    try { results.triform=await runtime.mountTriform({moduleSpecifier:process.env.TRIFORM_MODULE}); }
    catch(error){ results.triform={error:String(error?.message??error)}; }
  }
  return results;
}
const optionalMounts=await mountOptionalResidents();

function json(res,status,data){
  const body=JSON.stringify(data);
  res.writeHead(status,{'content-type':'application/json','content-length':Buffer.byteLength(body)});
  res.end(body);
}

async function readJson(req){
  const chunks=[];
  for await(const chunk of req) chunks.push(chunk);
  if(!chunks.length) return {};
  const text=Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

async function route(req,res){
  try{
    const url=new URL(req.url,'http://127.0.0.1');
    if(req.method==='GET' && url.pathname==='/health'){
      return json(res,200,{ok:true,service:'synthai-native-seed',port:PORT,statePath,optionalMounts});
    }
    if(req.method==='GET' && url.pathname==='/snapshot'){
      return json(res,200,runtime.snapshot());
    }

    const body=req.method==='POST' ? await readJson(req) : {};

    if(req.method==='POST' && url.pathname==='/phone/sync'){
      phoneHost.replace(body);
      return json(res,200,await runtime.phoneRequest('sync',{}));
    }
    if(req.method==='POST' && url.pathname==='/phone/app-launch'){
      return json(res,200,await runtime.phoneRequest('app.launch',{
        packageName:body.packageName,
        residentId:body.residentId??'synthia',
        context:body.context??{},
      }));
    }
    if(req.method==='POST' && url.pathname==='/phone/route'){
      return json(res,200,await runtime.phoneRequest('route.enter',body));
    }
    if(req.method==='POST' && url.pathname==='/phone/notification'){
      return json(res,200,await runtime.phoneRequest('notification.observe',{
        residentId:body.residentId??'synthia',
        notification:body.notification??body,
      }));
    }
    if(req.method==='POST' && url.pathname==='/sleep'){
      return json(res,200,await runtime.sleep());
    }
    if(req.method==='POST' && url.pathname==='/wake'){
      return json(res,200,await runtime.wake({
        replay: async event => ({eventId:event.id??null,status:'replayed-on-wake'})
      }));
    }
    if(req.method==='POST' && url.pathname==='/mesh/request'){
      const result=await runtime.meshKernel.request(String(body.target),{
        operation:body.operation,
        payload:body.payload??{},
        address:body.address??null,
        evidence:body.evidence??null,
      },{sourceId:body.sourceId??'phone:native'});
      return json(res,200,result);
    }
    if(req.method==='POST' && url.pathname==='/indiverse/create'){
      return json(res,200,await runtime.createIndiVerse(String(body.ownerId),body.options??{}));
    }
    if(req.method==='POST' && url.pathname==='/indiverse/grammar'){
      return json(res,200,await runtime.indiverse.updateGrammar(String(body.worldId),body.patch??{}));
    }
    return json(res,404,{ok:false,error:'NOT_FOUND',path:url.pathname});
  }catch(error){
    return json(res,500,{ok:false,error:String(error?.message??error),stack:process.env.NODE_ENV==='development'?String(error?.stack??''):undefined});
  }
}

const server=http.createServer((req,res)=>{ void route(req,res); });
server.listen(PORT,HOST,()=>{
  console.log('SynthAI Native Seed listening on http://'+HOST+':'+PORT);
  console.log('Persistent state: '+statePath);
});

async function shutdown(signal){
  try { await runtime.sleep(); } catch {}
  server.close(()=>process.exit(0));
  setTimeout(()=>process.exit(1),3000).unref();
  console.log('SynthAI Native Seed received '+signal+'; checkpointing.');
}
process.on('SIGINT',()=>void shutdown('SIGINT'));
process.on('SIGTERM',()=>void shutdown('SIGTERM'));
