import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import handler,{handleRpc,executeTool} from '../plugins/workspace-mcp-handler.mjs';

test('MCP announces only read-only public inspection capabilities',async()=>{
 const result=await handleRpc({jsonrpc:'2.0',id:1,method:'initialize',params:{}});
 assert.equal(result.result.serverInfo.name,'synthai-workspace-readonly');
 const listed=await handleRpc({jsonrpc:'2.0',id:2,method:'tools/list',params:{}});
 assert.deepEqual(listed.result.tools.map(t=>t.name),['inspect_workspace','list_build_goals','check_website_http']);
 const goals=await executeTool('list_build_goals');
 assert.equal(goals.goals.length,9);
 assert.equal(goals.goals[0].status,'done');
 const wrong=await handleRpc({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'delete_project'}});
 assert.equal(wrong.error.code,-32602);
});
test('HTTP MCP rejects anonymous calls, accepts valid bearer and returns readable plan',async()=>{
 const old=process.env.SYNTHAI_MCP_TOKEN;
 process.env.SYNTHAI_MCP_TOKEN='synthai-unit-secret-12345678901234567890';
 const server=createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/mcp';
 try{
   const request={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'inspect_workspace',arguments:{}}})};
   const deny=await fetch(url,request);assert.equal(deny.status,401);
   const yes=await fetch(url,{...request,headers:{...request.headers,authorization:'Bearer '+process.env.SYNTHAI_MCP_TOKEN}});
   assert.equal(yes.status,200);
   const result=await yes.json();
   assert.match(result.result.content[0].text,/PLAN-001/);
   const deniedOrigin=await fetch(url,{...request,headers:{...request.headers,authorization:'Bearer '+process.env.SYNTHAI_MCP_TOKEN,origin:'https://untrusted.example'}});
   assert.equal(deniedOrigin.status,403);
 }finally{
   await new Promise(resolve=>server.close(resolve));
   if(old===undefined)delete process.env.SYNTHAI_MCP_TOKEN;else process.env.SYNTHAI_MCP_TOKEN=old;
 }
});
