/**
 * SYNTH AI Workspace read-only MCP gateway, stateless Streamable HTTP.
 * No access to browser-local IndexedDB, uploads, Foundry, tokens, or user files.
 * Required production variable: SYNTHAI_MCP_TOKEN (set in hosting secrets).
 */
import { GOALS } from '../../public/workspace-core.mjs';
import { timingSafeEqual } from 'node:crypto';

const protocol='2025-06-18';
const tools=[
 {name:'inspect_workspace',description:'Read the public SYNTH AI workspace release identity, source reference and deployed website URL. Does not view private browser files.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'list_build_goals',description:'Read the versioned initial plan goals and status. Device-local checkbox edits are not synced to this bridge.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'check_website_http',description:'Check actual HTTP availability of the configured workspace HTTPS URL. This is not a screenshot or end-to-end UI test.',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
function appUrl(){
 const value=process.env.SYNTHAI_WORKSPACE_URL||'';
 if(!value)return null;
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password)throw new Error('Configured workspace URL must use HTTPS without credentials');
 return u.href.replace(/\/+$/,'');
}
function overview(){
 return {project:'SYNTH AI',plan:'PLAN-001',revision:'2026-10-27',
  canonical_repo:'https://github.com/justappgrabbin/SynthAi',
  code_branch:'integration/workspace-plan-001-20261027',
  versioned_plan:'computer/docs/PLAN_001_WORKSPACE_LANGUAGE_MODEL.md',
  website:appUrl(),source_files:'browser-local; NOT exposed to MCP',
  live_browser_testing:'not provided by this tool; requires real browser verification'};
}
export async function executeTool(name){
 if(name==='inspect_workspace')return overview();
 if(name==='list_build_goals')return {source:'versioned initial goals, not browser-local progress',goals:GOALS.map(g=>({id:g.id,title:g.title,status:g.status,evidence:g.evidence}))};
 if(name==='check_website_http'){
   const root=appUrl();if(!root)return {verified:false,error:'SYNTHAI_WORKSPACE_URL is not set'};
   const target=root+'/workspace.html';
   try{
     const response=await fetch(target,{method:'GET',redirect:'error',signal:AbortSignal.timeout(7000),headers:{'Accept':'text/html'}});
     const type=response.headers.get('content-type')||'';
     return {url:target,http_status:response.status,content_type:type,http_available:response.ok&&type.includes('text/html'),ui_tested:false};
   }catch(err){return {url:target,http_available:false,ui_tested:false,error:err.message};}
 }
 throw new Error('Unknown tool');
}
export async function handleRpc(body){
 if(!body||body.jsonrpc!=='2.0'||typeof body.method!=='string')return {jsonrpc:'2.0',id:body?.id??null,error:{code:-32600,message:'Invalid Request'}};
 if(body.method.startsWith('notifications/'))return null;
 const base={jsonrpc:'2.0',id:body.id??null};
 if(body.method==='initialize')return {...base,result:{protocolVersion:protocol,capabilities:{tools:{listChanged:false}},serverInfo:{name:'synthai-workspace-readonly',version:'0.1.0'}}};
 if(body.method==='ping')return {...base,result:{}};
 if(body.method==='tools/list')return {...base,result:{tools}};
 if(body.method==='tools/call'){
   const name=body.params?.name;
   if(!tools.some(x=>x.name===name))return {...base,error:{code:-32602,message:'Unknown tool'}};
   if(body.params?.arguments && (typeof body.params.arguments!=='object'||Object.keys(body.params.arguments).length))return {...base,error:{code:-32602,message:'No arguments accepted'}};
   try{const data=await executeTool(name);return {...base,result:{content:[{type:'text',text:JSON.stringify(data)}],isError:false}};}
   catch(err){return {...base,result:{content:[{type:'text',text:'Tool failed: '+err.message}],isError:true}};}
 }
 return {...base,error:{code:-32601,message:'Method not found'}};
}
const plain=(res,code,value)=>{res.statusCode=code;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(value));};
function tokenMatches(req){
 const token=process.env.SYNTHAI_MCP_TOKEN;
 if(!token || token.length<24)return false;
 const header=req.headers.authorization||'';
 if(!header.startsWith('Bearer '))return false;
 const received=Buffer.from(header.slice(7)),expected=Buffer.from(token);
 return expected.length===received.length&&timingSafeEqual(received,expected);
}
export default async function handleHttp(req,res){
 if(req.url==='/healthz'){return plain(res,200,{service:'synthai-workspace-mcp',ready:!!process.env.SYNTHAI_MCP_TOKEN&&process.env.SYNTHAI_MCP_TOKEN.length>=24});}
 if(!req.url?.startsWith('/mcp')&&!req.url?.startsWith('/api/mcp'))return plain(res,404,{error:'not_found'});
 const origin=req.headers.origin;
 const allowed=(process.env.SYNTHAI_MCP_ALLOWED_ORIGINS||'https://chatgpt.com,https://chat.openai.com').split(',').map(s=>s.trim());
 if(origin&&!allowed.includes(origin))return plain(res,403,{error:'origin_not_permitted'});
 if(!process.env.SYNTHAI_MCP_TOKEN||process.env.SYNTHAI_MCP_TOKEN.length<24)return plain(res,503,{error:'bridge_not_configured'});
 if(!tokenMatches(req))return plain(res,401,{error:'unauthorized'});
 if(req.method!=='POST')return plain(res,405,{error:'method_not_allowed'});
 let raw='';
 try{
   for await(const chunk of req){raw+=chunk;if(raw.length>65536)return plain(res,413,{error:'request_too_large'});}
   const input=JSON.parse(raw);
   if(Array.isArray(input))return plain(res,400,{error:'batch_not_supported'});
   const response=await handleRpc(input);
   if(response===null){res.statusCode=202;return res.end();}
   return plain(res,200,response);
 }catch(err){return plain(res,400,{jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
}
