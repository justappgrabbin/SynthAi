import http from 'node:http';
import fs from 'node:fs';
const port=Number(process.env.MOCK_MCP_PORT||18913);
const tools=[
  {name:'find_opportunities',description:'Find external business opportunities for a capability need.',inputSchema:{type:'object',properties:{need:{type:'object'}},required:['need']},annotations:{readOnlyHint:true}},
  {name:'receive_opportunity_invitation',description:'Receive a single consent-gated opportunity invitation.',inputSchema:{type:'object',properties:{opportunityId:{type:'string'},message:{type:'string'},candidateId:{type:'string'},responseToken:{type:'string'},callbackUrl:{type:['string','null']}},required:['opportunityId','message','responseToken']},metadata:{requiresApproval:true}},
  {name:'offer_synthia_install',description:'Create a user-approved Synthia install/onboarding offer.',inputSchema:{type:'object',properties:{opportunityId:{type:'string'},deviceOwnerId:{type:'string'},packageId:{type:'string'},consentId:{type:'string'}},required:['opportunityId','deviceOwnerId','packageId','consentId']},metadata:{requiresApproval:true}}
];
const server=http.createServer(async(req,res)=>{
 if(req.method!=='POST'){res.writeHead(405);return res.end();}
 const chunks=[];for await(const c of req)chunks.push(c);const m=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 let result;
 if(m.method==='initialize') result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'Remote Hotel MCP',version:'1.0'}};
 else if(m.method==='notifications/initialized'){res.writeHead(202);return res.end();}
 else if(m.method==='tools/list') result={tools};
 else if(m.method==='tools/call'){
   const {name,arguments:a={}}=m.params||{};
   if(name==='find_opportunities') result={content:[{type:'text',text:JSON.stringify({candidates:[{id:'hotel-aurora',name:'Aurora Hotel',type:'business',availableCapabilities:a.need?.requiredCapabilities||[],publicOrAuthorizedContext:'Remote hotel MCP opportunity catalog'}]})}]};
   else if(name==='receive_opportunity_invitation'){if(process.env.MOCK_INVITE_TOKEN_FILE)fs.writeFileSync(process.env.MOCK_INVITE_TOKEN_FILE,a.responseToken);result={content:[{type:'text',text:JSON.stringify({received:true,opportunityId:a.opportunityId})}]};}
   else if(name==='offer_synthia_install') result={content:[{type:'text',text:JSON.stringify({installOfferCreated:true,requiresDeviceOwnerAction:true,packageId:a.packageId})}]};
   else return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'tool not found'}});
 } else return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'method not found'}});
 send({jsonrpc:'2.0',id:m.id,result});
 function send(body){const data=JSON.stringify(body);res.writeHead(200,{'content-type':'application/json','mcp-session-id':'mock-session'});res.end(data);}
});
server.listen(port,'127.0.0.1',()=>console.log(`[mock-http-mcp] ${port}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));
