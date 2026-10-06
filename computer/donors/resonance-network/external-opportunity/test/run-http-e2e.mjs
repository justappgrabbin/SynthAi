import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.dirname(here);
const servicePort=18914, mcpPort=18913;const state=fs.mkdtempSync(path.join(os.tmpdir(),'rn-http-opp-e2e-'));const tokenFile=path.join(state,'invite-token.txt');
const mock=spawn(process.execPath,[path.join(here,'mock-http-mcp-server.mjs')],{env:{...process.env,MOCK_MCP_PORT:String(mcpPort),MOCK_INVITE_TOKEN_FILE:tokenFile},stdio:['ignore','pipe','inherit']});
const cfg={servers:[{id:'hotel-remote',name:'Remote Hotel MCP',transport:'http',url:`http://127.0.0.1:${mcpPort}/mcp`,discoveryTools:['find_opportunities'],invitationTool:'hotel-remote::receive_opportunity_invitation',installationTool:'hotel-remote::offer_synthia_install'}]};
const waitUrl=async(url)=>{for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok||r.status===405)return;}catch{}await new Promise(r=>setTimeout(r,40));}throw new Error(`not ready: ${url}`)};
try{
 await waitUrl(`http://127.0.0.1:${mcpPort}/mcp`);
 const svc=spawn(process.execPath,[path.join(root,'service.mjs')],{env:{...process.env,SYNTHIA_OPPORTUNITY_PORT:String(servicePort),SYNTHIA_OPPORTUNITY_STATE_DIR:state,SYNTHIA_MCP_SERVERS_JSON:JSON.stringify(cfg),SYNTHIA_CONSENT_SECRET:'http-e2e-secret'},stdio:['ignore','pipe','inherit']});
 const base=`http://127.0.0.1:${servicePort}`; await waitUrl(base+'/health');
 const post=async(p,b)=>{const r=await fetch(base+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)});const j=await r.json();if(!r.ok)throw new Error(`${p}: ${r.status} ${JSON.stringify(j)}`);return j;};
 try{
  const discovered=await post('/discover',{need:{owner:'rn-user',description:'Need a hotel willing to trial guest-personalization software',requiredCapabilities:['guest_personalization'],urgency:.8},networkOffer:['free trial','implementation support'],evidence:[{confidence:.9,relevance:.9}]});
  assert.equal(discovered.layer,'mcp'); assert.equal(discovered.opportunities.length,1); const opp=discovered.opportunities[0]; assert.equal(opp.candidate.networkMember,false); assert.equal(opp.eligible,true);
  const inv=await post('/invite',{opportunityId:opp.opportunityId,message:'Would you like to try this product?'}); assert.equal(inv.sent,true);
  for(let i=0;i<60&&!fs.existsSync(tokenFile);i++)await new Promise(r=>setTimeout(r,25)); const responseToken=fs.readFileSync(tokenFile,'utf8');
  const accepted=await post('/respond',{opportunityId:opp.opportunityId,response:'accepted',subjectId:'hotel-aurora',responseToken});
  const install=await post('/install/approve',{opportunityId:opp.opportunityId,subjectId:'hotel-aurora',scope:['local_runtime'],collaborationConsentToken:accepted.collaborationConsent.token});
  const deployed=await post('/install/deploy',{opportunityId:opp.opportunityId,deviceOwnerId:'hotel-aurora',packageId:'synthia-lite',installationConsentToken:install.token}); assert.equal(deployed.ok,true);
  const outcome=await post('/outcome',{opportunityId:opp.opportunityId,outcome:{accepted:true,collaborationOccurred:true,perceivedBenefitA:.8,perceivedBenefitB:.9}}); assert.equal(outcome.outcome.collaborationOccurred,true);
  const health=await (await fetch(base+'/health')).json(); assert.equal(health.ledgerVerified,true); assert.equal(health.connections[0].connected,true);
  console.log(JSON.stringify({ok:true,transport:'streamable-http',layer:discovered.layer,candidate:opp.candidate.name,networkMember:opp.candidate.networkMember,invite:inv.sent,install:deployed.ok,ledgerVerified:health.ledgerVerified},null,2));
 } finally {svc.kill('SIGTERM');}
} finally {mock.kill('SIGTERM');}
