import {createServer} from 'node:http';
import handler from './workspace-mcp-handler.mjs';
const host=process.env.HOST || '127.0.0.1';
const port=Number(process.env.PORT || 8787);
createServer(handler).listen(port,host,()=>console.log('SYNTH AI MCP listening on '+host+':'+port));
