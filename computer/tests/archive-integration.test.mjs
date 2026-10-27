import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MemoryPersistence} from '../core/kernel.mjs';
import {BrowserArchiveConnector} from '../services/browser-archive-connector.mjs';

test('original donor source is installed into the actual Computer VFS and executed with real source engines',async()=>{
 const p=new MemoryPersistence();
 const input=await readFile(new URL('../engines/unified-execution-spine/src/pure-synthia/automata/tools/tool-14-autoling.js',import.meta.url),'utf8');
 const bridge=await new BrowserArchiveConnector({persistence:p,namespace:'archive-integration-tests'}).boot();
 const files=[
   {path:'README.md',text:'The purpose of this original code is to analyze words and grammar.'},
   {path:'src/tool-14-autoling.js',text:input}
 ];
 const install=await bridge.install({name:'canonical-pure-synthia-language-donor',files,indexedDbId:'real-donor-source'});
 assert.equal(install.status,'source-mounted');
 assert.equal(install.fileCount,2);
 assert.ok(install.mount.mountId);
 assert.equal(bridge.projects.get(install.projectId).id,install.projectId);
 assert.equal(bridge.shellManager.listMounted().length,1);
 assert.ok(bridge.apps.has(install.appId));
 assert.equal(bridge.tools.get(install.toolId).executable,false);
 const stored=JSON.parse(bridge.projects.readFile(install.projectId,'SOURCE_MANIFEST.json').content);
 assert.equal(stored.sha256,install.sha256);
 assert.equal(stored.files.length,2);
 assert.ok(!JSON.stringify(stored).includes('runPipeline(input)')); // no original code duplication in Computer manifest
 const analysis=await bridge.analyzeFile(install.id,{path:'README.md',text:files[0].text,engine:'autoling'});
 assert.equal(analysis.executed,true);
 assert.equal(analysis.sourceSha256,install.files[0].sha256);
 assert.equal(analysis.toolEvidence.autoling,'executed');
 assert.equal(bridge.synthia.status().llm,false);
 await assert.rejects(bridge.analyzeFile(install.id,{path:'README.md',text:'CHANGED',engine:'autoling'}),/checksum mismatch/i);
 const tool=await bridge.runGeneratedTool({purpose:'match code and text',dimension:'Design',level:3,gate:14,input:['alpha beta','alpha gamma']});
 assert.equal(tool.engine,'existing-pure-synthia-tool-factory');
 assert.ok(tool.output.match>0&&tool.output.match<1);
 assert.ok(bridge.tools.has(tool.toolId));
 const again=await bridge.install({name:'canonical-pure-synthia-language-donor',files,indexedDbId:'real-donor-source'});
 assert.equal(again.reused,true);
 const restored=await new BrowserArchiveConnector({persistence:p,namespace:'archive-integration-tests'}).boot();
 assert.equal(restored.list().length,1);
 assert.equal(restored.shellManager.listMounted().length,1);
 assert.equal(restored.projects.readFile(install.projectId,'SOURCE_MANIFEST.json').content,bridge.projects.readFile(install.projectId,'SOURCE_MANIFEST.json').content);
 const reread=await restored.analyzeFile(install.id,{path:'README.md',text:files[0].text,engine:'diseminer'});
 assert.equal(reread.executed,true);
});

test('source connector cannot execute unverified app ZIPs, overwrite originals or admit path traversal',async()=>{
 const bridge=await new BrowserArchiveConnector().boot();
 await assert.rejects(bridge.install({name:'unsafe.zip',files:[{path:'../../secret.txt',text:'x'}]}),/Invalid project source path/);
 await assert.rejects(bridge.install({name:'duplicate.zip',files:[{path:'a.js',text:'1'}, {path:'a.js',text:'2'}]}),/Duplicate source path/);
 assert.equal(bridge.list().length,0);
});
