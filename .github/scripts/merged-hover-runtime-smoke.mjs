import assert from 'node:assert/strict';
import { startSynthiaFrontScreen } from '/opt/synthia58/src/ui/server.mjs';
const started = await startSynthiaFrontScreen({ port: 0, persistenceDir: '/tmp/merged-hover-acceptance' });
try {
  const request = async (route, body) => {
    const response = await fetch(started.url + route, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data;
  };
  const { places } = await request('/api/places?q=Los%20Angeles');
  assert.equal(places[0].timeZone, 'America/Los_Angeles');
  const configured = await request('/api/identity/configure', { personId:'front-screen',agentId:'synthia', birthDate:'2000-07-01', birthTime:'12:34', place:places[0] });
  assert.equal(configured.identity.configured,true);
  assert.equal(configured.identity.timePrecision,'minute');
  const chat=await request('/api/chat',{message:'Show me the connected field.'});
  assert.ok(chat.pipelineTrace.some(stage=>stage.stage==='autoling'));
  assert.ok(chat.pipelineTrace.some(stage=>stage.stage==='diseminer'));
  assert.ok(chat.pipelineTrace.some(stage=>stage.stage==='klein-analogy'));
  for (const route of ['/','/deploy/index.html','/deploy/interfaces/morph-system.html','/deploy/interfaces/stellar-nexus-v5.html']) {
    const response=await fetch(started.url+route);assert.equal(response.status,200,route);assert.ok((await response.text()).includes('<html'),route);
  }
  console.log('PASS: ARM64 embedded runtime configures minute birth time, resolves place offline, executes Klein chat, serves all merged screens');
} finally { started.solo.stopTasks(); await new Promise(resolve=>started.server.close(resolve)); }
