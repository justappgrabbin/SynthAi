import {openBrowserComputer} from './foundation-browser.mjs';
import {Workspace,IndexedWorkspaceStorage} from './workspace.mjs';
import {KleinLocalHat} from './klein-local-hat.mjs';
import * as Klein from './klein_ato.js';
import {LocalAgent,WebLLMModel} from './local-agent.mjs';
const $=id=>document.getElementById(id),computer=openBrowserComputer(),workspace=new Workspace(new IndexedWorkspaceStorage());
const hat=new KleinLocalHat(Klein,workspace);
let agent=null,lastResult=null;
function display(id,value){$(id).textContent=typeof value==='string'?value:JSON.stringify(value,null,2);}
async function handle(action){try{await action();}catch(error){display('result',{error:error.message});}}
function download(name,content,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function refresh(){
  const files=await workspace.files();$('files').replaceChildren(...Object.keys(files).map(path=>new Option(path,path)));
  display('history',(await workspace.history()).map(r=>({goal:r.goal,status:r.status,steps:r.events?.length,capabilities:r.events?.filter(e=>e.ok&&['acquire','construct'].includes(e.cmd)).map(e=>e.result.name)})));
  const capabilities=await computer.store.list();$('capabilities').replaceChildren(...capabilities.map(c=>new Option(c.name,c.name)));
}
function output(result){lastResult=result;display('result',result);if(typeof result?.html==='string')$('preview').srcdoc=result.html;}
async function importFiles(list){for(const file of list){const path=file.webkitRelativePath||file.name,bytes=await file.arrayBuffer();await workspace.writeAsset(path,bytes,file.type);if(/\.(?:m?js|cjs|json|md|txt|html|css|py|ts|tsx|jsx)$/i.test(path)){try{await workspace.write(path,new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch(error){if(error instanceof TypeError)display('inspection','Preserved binary bytes; file is not valid UTF-8: '+path);else throw error;}}}await refresh();display('inspection','Imported complete files. Earlier source versions are retained.');}
$('upload').onchange=e=>handle(()=>importFiles(e.target.files));$('folder').onchange=e=>handle(()=>importFiles(e.target.files));
$('files').onchange=()=>handle(async()=>{const files=await workspace.files();$('filename').value=$('files').value;$('source').value=files[$('files').value];});
$('save').onclick=()=>handle(async()=>{await workspace.write($('filename').value,$('source').value);await refresh();display('inspection','Source version saved.');});
$('inspect').onclick=()=>handle(async()=>{const path=$('files').value,files=await workspace.files();display('inspection',await computer.inspect({[path]:files[path]}));});
$('refresh').onclick=()=>handle(refresh);
$('acquire').onclick=()=>handle(async()=>{const spec=JSON.parse($('spec').value);output(await computer.construct({...spec,files:await workspace.files()}));await refresh();});
$('verify').onclick=()=>handle(async()=>output(await computer.reverify($('capabilities').value)));
$('execute').onclick=()=>handle(async()=>output(await computer.run($('capabilities').value,JSON.parse($('args').value))));
$('backup').onclick=()=>handle(async()=>download('independent-computer-backup.json',JSON.stringify({schema:'independent-backup/v1',computer:await computer.store.export(),workspace:await workspace.state()})));
$('restore').onchange=e=>handle(async()=>{const backup=JSON.parse(await e.target.files[0].text());if(backup.schema!=='independent-backup/v1')throw Error('Invalid backup');await computer.store.restore(backup.computer);for(const [path,source]of Object.entries(backup.workspace.files))await workspace.write(path,source);for(const [path,asset] of Object.entries(backup.workspace.assets||{}))await workspace.writeAsset(path,new Uint8Array(asset.bytes),asset.type);for(const run of backup.workspace.runs)await workspace.saveRun(run);await refresh();output({restored:true});});
$('download').onclick=()=>download('result.json',JSON.stringify(lastResult,null,2));
$('boot').onclick=()=>handle(async()=>{
  $('boot').disabled=true;
  try{
    if(!navigator.gpu)throw Error('WebGPU is unavailable. Use a WebGPU-capable browser/device; no remote fallback is used.');
    const {CreateMLCEngine,prebuiltAppConfig}=await import('./vendor/webllm.mjs');
    let config=prebuiltAppConfig;
    const local=await fetch('./models/local-config.json');
    if(local.ok)config={...prebuiltAppConfig,model_list:(await local.json()).map(r=>({...r,model:new URL(r.model,location.href).href,model_lib:new URL(r.model_lib,location.href).href}))};
    if(!config.model_list.some(r=>r.model_id===$('model').value))throw Error('This optional model is not installed locally. The included Qwen models are ready to load.');
    const engine=await CreateMLCEngine($('model').value,{appConfig:config,initProgressCallback:p=>display('status',p.text)}, {context_window_size:8192});
    agent=new LocalAgent({computer,workspace,hat,model:new WebLLMModel(engine),onEvent:async event=>{ $('agentlog').textContent+='\n'+JSON.stringify(event,null,2);if(event.cmd==='execute'&&event.ok)output(event.result);await refresh();}});
    for(const name of ['inventory','inspect','read_file','write_file','acquire','construct','execute','verify','finish'])hat.bind({[name]:args=>agent.tool(name,args)});
    display('status','Local model + original Klein ATO ready');$('run').disabled=false;
  }catch(error){display('status','Model not available: '+error.message);$('boot').disabled=false;throw error;}
});
$('run').onclick=()=>handle(async()=>{
  if(!agent)throw Error('Start the local model first');
  const goal=$('goal').value.trim();if(!goal)throw Error('Enter a task');
  $('run').disabled=true;$('stop').disabled=false;display('agentlog','Working locally…');
  try{const run=await agent.run(goal,{limit:Number($('budget').value)});display('status','Task '+run.status);}
  finally{$('run').disabled=false;$('stop').disabled=true;await refresh();}
});
$('stop').onclick=()=>agent?.stop();
const SpeechRecognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
if(!SpeechRecognition){$('talk').disabled=true;display('speechstatus','Dictation unavailable in this browser. Type your request above.');}
else $('talk').onclick=()=>{const recognition=new SpeechRecognition();if('processLocally' in recognition)recognition.processLocally=true;recognition.continuous=false;recognition.interimResults=false;recognition.onresult=e=>{$('goal').value+=' '+e.results[0][0].transcript;display('speechstatus','Request transcribed. Review it, then choose Work on this.');};recognition.onerror=e=>display('speechstatus','Dictation: '+e.error);recognition.start();display('speechstatus','Listening. Browser speech recognition may use its own network service.');};
$('proof').onclick=()=>handle(async()=>{
  display('result','Running complete-source acquisition, persistence, and second-generation construction…');
  const source=await(await fetch('./project-intake.js')).text();
  await computer.acquire({name:'project-intake',description:'Original full project-intake module, tested CRC32 mechanism.',files:{'project-intake.js':source},entry:'project-intake.js',exportName:'default.crc32',cases:[{args:[[49,50,51,52,53,54,55,56,57]],expected:3421780262}],holdouts:[{args:[[]],expected:0}]});
  await computer.construct({name:'workspace-archive',description:'Archive files with the acquired complete ZIP writer.',files:{'archive.mjs':`import intake from '@cap/project-intake'; export async function main(files){return Array.from(new Uint8Array(await intake.zip(files).arrayBuffer()));}`},entry:'archive.mjs',cases:[{args:[[]],expected:[80,75,5,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]});
  const restarted=openBrowserComputer();
  await restarted.construct({name:'project-package',description:'Reuse the persisted constructed ZIP capability in a subsequent construction.',files:{'package.mjs':`import {main as archive} from '@cap/workspace-archive';export async function main(files){const bytes=await archive(files);return {bytes:bytes.length,signature:bytes.slice(0,4)};}`},entry:'package.mjs',cases:[{args:[[]],expected:{bytes:22,signature:[80,75,5,6]}}]});
  const backup=await restarted.exportWorkspace('workspace-archive');
  const result=await restarted.run('project-package',[[{path:'hello.txt',text:'hello'}]]);
  output({acquiredCompleteSourceBytes:source.length,selfExportBytes:backup.length,secondGeneration:result,persistence:'IndexedDB, fresh Computer instance'});await refresh();
});
try{if(!Object.keys(await workspace.files()).length){for(const path of ['project-intake.js','klein_ato.js','foundation.mjs','local-agent.mjs','workspace.mjs','klein-local-hat.mjs','tool-contracts.mjs','reference/architecture.txt','reference/engineering-memory.txt','reference/small-model-notes.txt','reference/trident-design.txt']){const response=await fetch('./'+path);if(!response.ok){if(path.startsWith('reference/'))continue;throw Error('Could not load own source: '+path);}await workspace.write(path,await response.text());}}await refresh();}catch(error){display('result','Persistent storage unavailable: '+error.message);}
