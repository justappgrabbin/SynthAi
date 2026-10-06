import fs from 'node:fs';
let buffer='';
function send(msg){ const body=JSON.stringify(msg); process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`); }
function toolList(){ return [
  {name:'find_opportunities',description:'Find organizations outside the Resonance Network that have a need matching offered capabilities.',inputSchema:{type:'object',properties:{need:{type:'object'}},required:['need']},annotations:{readOnlyHint:true}},
  {name:'receive_opportunity_invitation',description:'Receive one opportunity invitation from the Resonance Network.',inputSchema:{type:'object',properties:{opportunityId:{type:'string'},message:{type:'string'},candidateId:{type:'string'}},required:['opportunityId','message']},metadata:{requiresApproval:true}},
  {name:'offer_synthia_install',description:'Offer a consented Synthia install/onboarding flow to the device owner.',inputSchema:{type:'object',properties:{opportunityId:{type:'string'},deviceOwnerId:{type:'string'},packageId:{type:'string'},consentId:{type:'string'}},required:['opportunityId','deviceOwnerId','packageId','consentId']},metadata:{requiresApproval:true}}
]; }
function handle(m){
 if(m.method==='notifications/initialized') return;
 if(m.method==='initialize') return send({jsonrpc:'2.0',id:m.id,result:{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'Mock Hotel MCP',version:'1.0'}}});
 if(m.method==='tools/list') return send({jsonrpc:'2.0',id:m.id,result:{tools:toolList()}});
 if(m.method==='tools/call'){
   const {name,arguments:a={}}=m.params||{};
   if(name==='find_opportunities') return send({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:JSON.stringify({candidates:[{id:'hotel-aurora',name:'Aurora Hotel',type:'business',availableCapabilities:a.need?.requiredCapabilities||[],need:'Guest personalization trial',publicOrAuthorizedContext:'Hotel-authorized MCP opportunity catalog'}]})}]}});
   if(name==='receive_opportunity_invitation'){ if(process.env.MOCK_INVITE_TOKEN_FILE && a.responseToken) fs.writeFileSync(process.env.MOCK_INVITE_TOKEN_FILE,a.responseToken); return send({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:JSON.stringify({received:true,opportunityId:a.opportunityId})}]}}); }
   if(name==='offer_synthia_install') return send({jsonrpc:'2.0',id:m.id,result:{content:[{type:'text',text:JSON.stringify({installOfferCreated:true,requiresDeviceOwnerAction:true,packageId:a.packageId})}]}});
   return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'tool not found'}});
 }
}
process.stdin.on('data',chunk=>{ buffer+=chunk.toString('utf8'); while(buffer.length){ const h=buffer.indexOf('\r\n\r\n'); if(h<0)return; const len=Number(buffer.slice(0,h).match(/content-length:\s*(\d+)/i)?.[1]); if(!Number.isFinite(len))return; const start=h+4;if(buffer.length<start+len)return;const body=buffer.slice(start,start+len);buffer=buffer.slice(start+len);try{handle(JSON.parse(body));}catch{}} });
