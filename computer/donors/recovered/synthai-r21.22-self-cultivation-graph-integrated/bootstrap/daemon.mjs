import { installLocalStorageShim } from './node-local-storage-shim.mjs';
const STATE_PATH=process.env.SYNTHIA_STATE_PATH||new URL('../data/synthia-state.json',import.meta.url).pathname;
installLocalStorageShim(STATE_PATH);
import http from 'node:http';
import SynthiaUnit from '../core/SynthiaUnit.mjs';
const PORT=Number(process.env.SYNTHIA_PORT||4570),HOST=process.env.SYNTHIA_HOST||'127.0.0.1';
const RESIDENCE_KEY=process.env.SYNTHIA_RESIDENCE_KEY||'synthia.residence.v1';
const loadResidence=()=>{try{const saved=JSON.parse(globalThis.localStorage.getItem(RESIDENCE_KEY)||'null')||{};return {...saved,approved:true,address:saved.address??null,provenance:Array.isArray(saved.provenance)?saved.provenance:[]}}catch{return {approved:true,address:null,provenance:[]}}};
const saveResidence=r=>globalThis.localStorage.setItem(RESIDENCE_KEY,JSON.stringify(r));
const unit=new SynthiaUnit({residence:loadResidence(),mode:process.env.SYNTHIA_MODE||'complement',memoryKey:process.env.SYNTHIA_MEMORY_KEY||'synthia.memory.v080',autoStart:true});
globalThis.Synthia=unit;
const send=(res,code,body)=>{const json=JSON.stringify(body,(_,v)=>v instanceof Blob?`[Blob ${v.type} ${v.size}]`:v);res.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(json)};
async function readBody(req){let raw='';for await(const chunk of req)raw+=chunk;return raw?JSON.parse(raw):{};}
const routes={
 'GET /status':async()=>({code:200,body:unit.snapshot()}),'GET /life':async()=>({code:200,body:unit.lifeSnapshot()}),'GET /success':async()=>({code:200,body:unit.successSnapshot()}),
 'POST /approve-residence':async req=>{const body=await readBody(req);const residence=unit.approveResidence({address:body.address||null,evidence:body.evidence||{source:'local-device-owner-approval'}});saveResidence(residence);return {code:200,body:{ok:true,residence}};},
 'POST /resolve-residence-address':async req=>{const body=await readBody(req);if(!body.address)return {code:400,body:{error:'address is required'}};const residence=unit.resolveResidenceAddress(body.address,{evidence:body.evidence||null});saveResidence(residence);return {code:200,body:{ok:true,residence}};},
 'POST /ask':async req=>{const {intent,options}=await readBody(req);if(!intent)return {code:400,body:{error:'intent is required'}};return {code:200,body:await unit.ask(intent,options||{})};},
 'POST /autonomous-cycle':async req=>{return {code:200,body:await unit.autonomousCycle(await readBody(req).catch(()=>({})))};},
 'POST /pulse':async()=>{return {code:200,body:await unit.pulse()};},
 'POST /success-indicator':async req=>{const {id,name,direction,weight}=await readBody(req);if(!id)return {code:400,body:{error:'id is required'}};return {code:200,body:unit.defineSuccessIndicator({id,name,direction,weight})};},
 'POST /record-success':async req=>{const {indicatorId,value,evidence,source,context}=await readBody(req);if(!indicatorId||value===undefined||!evidence)return {code:400,body:{error:'indicatorId, value, and evidence are required'}};return {code:200,body:unit.recordUserSuccess(indicatorId,value,{evidence,source,context})};}
};
const server=http.createServer(async(req,res)=>{if(req.method==='OPTIONS')return send(res,204,{});const key=`${req.method} ${req.url.split('?')[0]}`,handler=routes[key];if(!handler)return send(res,404,{error:`no route ${key}`});try{const {code,body}=await handler(req);send(res,code,body)}catch(error){send(res,error.code||500,{error:String(error?.message||error)})}});
server.listen(PORT,HOST,()=>{console.log(`[synthia-daemon] pid ${process.pid} listening on http://${HOST}:${PORT}`);console.log(`[synthia-daemon] state file: ${STATE_PATH}`);console.log('[synthia-daemon] residence: active local runtime')});
function shutdown(signal){console.log(`[synthia-daemon] received ${signal}, stopping life loop and closing`);unit.stopLife();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();}process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
