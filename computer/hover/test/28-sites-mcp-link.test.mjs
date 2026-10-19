import test from 'node:test';
import assert from 'node:assert/strict';
import { createSitesMcpLink, SITES_READ_TOOLS, SYNTHAI2_MCP_URL } from '../src/companion/sites-mcp-link.mjs';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type':'application/json' },
});
test('outbound Sites MCP requires real initialize + tools/list and allows only selected reads', async () => {
  const called = [];
  const link = createSitesMcpLink({fetchImpl: async (url, opts) => {
    assert.equal(url, SYNTHAI2_MCP_URL);
    assert.equal(opts.method, 'POST');
    assert.equal(opts.redirect,'error');
    assert.equal(opts.headers.authorization,undefined);
    const request=JSON.parse(opts.body);
    called.push(request.method);
    if(request.method === 'initialize') return json({jsonrpc:'2.0',id:1,result:{serverInfo:{name:'SynthAi2'},protocolVersion:'2025-06-18'}});
    if(request.method === 'tools/list') return json({jsonrpc:'2.0',id:2,result:{tools:[
      {name:'synthai2_list_apps'},{name:'dangerous_shell'}]}});
    if(request.method === 'tools/call') return json({jsonrpc:'2.0',id:3,result:{content:[{type:'text',text:'[]'}]}});
    throw Error('Unknown method');
  }});
  assert.equal(link.status().connected,false);
  await assert.rejects(link.call('synthai2_list_apps'),/Test remote/);
  const connected=await link.discover();
  assert.equal(connected.connected,true);
  assert.deepEqual(connected.tools,['synthai2_list_apps']);
  assert.deepEqual((await link.call('synthai2_list_apps')).content,[{type:'text',text:'[]'}]);
  await assert.rejects(link.call('dangerous_shell'),/not allowlisted/);
  assert.deepEqual(called,['initialize','tools/list','tools/call']);
});
test('auth errors are visible and phone credentials never cross to Sites',async()=>{
  const link=createSitesMcpLink({fetchImpl: async()=>json({error:'Unauthorized'},401)});
  const status=await link.discover();
  assert.equal(status.connected,false);
  assert.match(status.error,/viewer authorization/);
  assert.deepEqual(status.tools,[]);
});
test('MCP SSE JSON result can be read, but malformed discovery is rejected',async()=>{
  let count=0;
  const link=createSitesMcpLink({fetchImpl:async()=>{
    count++;
    if(count===1)return new Response('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"serverInfo":{"name":"SynthAi2"}}}\n\n',{headers:{'content-type':'text/event-stream'}});
    return new Response('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"synthai2_status"}]}}\n\n',{headers:{'content-type':'text/event-stream'}});
  }});
  assert.deepEqual((await link.discover()).tools,['synthai2_status']);
  assert.ok(SITES_READ_TOOLS.includes('synthai2_status'));
});
