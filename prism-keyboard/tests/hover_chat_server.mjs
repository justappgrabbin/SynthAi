import '/workspace/prism-keys/runtime/prism-chat-bridge.mjs';
import {startSynthiaFrontScreen} from '/workspace/synthia-hover-source/computer/donors/synthia58/Synthia-Solo-Hover-v0.5.8/src/ui/server.mjs';
import {mkdtemp} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
const app=await startSynthiaFrontScreen({port:18974,persistenceDir:await mkdtemp(join(tmpdir(),'prism-real-hover-'))});
// Fixture only: this isolated server is never copied into the APK's user data.
const response=await fetch(app.url+'/api/identity/configure',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({personId:'front-screen',agentId:'synthia',birthDate:'2000-01-01',birthTime:'12:34:56',place:{label:'New York, NY',latitude:40.7128,longitude:-74.006,timeZone:'America/New_York'}})});
if(!response.ok)throw new Error(await response.text());console.log('Actual Hover 0.5.8 chat test server ready');
process.on('SIGTERM',()=>app.server.close(()=>process.exit(0)));
