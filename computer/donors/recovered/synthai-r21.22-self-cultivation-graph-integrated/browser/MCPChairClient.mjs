export class MCPChairClient{
 constructor(base=''){this.base=base;}
 async call(method,params={}){const token=localStorage.getItem('synthia.mcp.token')||'';const r=await fetch(`${this.base}/mcp`,{method:'POST',headers:{'content-type':'application/json','authorization':token?`Bearer ${token}`:''},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})});const j=await r.json();if(j.error)throw new Error(j.error.message||'MCP error');return j.result;}
 async session(){const r=await fetch(`${this.base}/mcp/session`);if(!r.ok)throw new Error('MCP session unavailable');return r.json();}
}
export default MCPChairClient;
