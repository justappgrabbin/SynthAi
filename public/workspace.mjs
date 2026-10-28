import {STORAGE_KEY,newBoard,validateBoard,updateGoal,progress,extractTextZip,pickEntry,makeSafePreview,safePath} from '/workspace-core.mjs';
import {BrowserArchiveConnector} from '/computer-runtime/services/browser-archive-connector.mjs';
import {LocalStoragePersistence} from '/computer-runtime/core/kernel.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sources=[
['Paper-Mobile-Termux-Build (1).zip','Termux Android WebView build kit'],
['DaRk-LLM-main.zip','Offline desktop inference studio'],
['Model-Weaver.zip','Model-building workbench'],
['Synthia-Computer-r22.4-source.zip','Original Computer source'],
['USB-Uncensored-LLM-main.zip','Portable LLM launcher, upstream deprecated'],
['transformer-builder-master.zip','Pre-alpha transformer library'],
['Neural Architecture Generator with 64 Primitive Functions.zip','Integrated Tool Factory source']
];
$('#sources').innerHTML=sources.map(([title,description])=>'<div class="source"><strong>'+safe(title)+'</strong><small>'+safe(description)+'</small></div>').join('');
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 $$('[data-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});
 $$('.tabview').forEach(x=>x.classList.toggle('active',x.id===b.dataset.tab));
}));
let board;
try{board=validateBoard(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'))}catch{board=newBoard()}
function persistBoard(){
 board.updatedAt=new Date().toISOString();
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(board))}catch(e){$('#goalMessage').textContent='Storage error: '+e.message+'; export a backup'}
}
function showGoals(){
 const {done,total,percent}=progress(board);
 $('#statGoals').textContent=done+' / '+total;$('#statProgress').textContent=percent+'%';$('#progressBar').style.width=percent+'%';
 $('#goalList').innerHTML=board.goals.map(g=>'<div class="goal '+g.status+'"><div class="goal-title"><span class="number">'+safe(g.id)+'</span><div><strong>'+safe(g.title)+'</strong><small>'+safe(g.category)+'</small></div></div><div class="goalactions"><select data-s="'+safe(g.id)+'" aria-label="Status for '+safe(g.id)+'">'+[['todo','Not started'],['doing','In progress'],['done','Verified complete']].map(([v,label])=>'<option value="'+v+'"'+(v===g.status?' selected':'')+'>'+label+'</option>').join('')+'</select><input data-e="'+safe(g.id)+'" aria-label="Evidence for '+safe(g.id)+'" placeholder="Verification note or evidence URL" maxlength="2000" value="'+safe(g.evidence)+'"><button class="button muted" data-save="'+safe(g.id)+'">Save</button></div></div>').join('');
 $$('[data-save]').forEach(btn=>btn.addEventListener('click',()=>{
  const id=btn.dataset.save;try{board=updateGoal(board,id,$('[data-s="'+id+'"]').value,$('[data-e="'+id+'"]').value);persistBoard();showGoals();$('#goalMessage').textContent='Saved '+id;}
  catch(e){$('#goalMessage').textContent=e.message;}
 }));
}
persistBoard();showGoals();
$('#addGoalForm').addEventListener('submit',e=>{
 e.preventDefault();const title=$('#newGoalTitle').value.trim();if(!title)return;
 const num=Math.max(9,...board.goals.map(g=>Number(g.id.slice(1))||0))+1;
 board.goals.push({id:'G'+String(num).padStart(2,'0'),title,status:'todo',evidence:'',category:'Additional'});
 persistBoard();showGoals();$('#newGoalTitle').value='';
});
$('#exportBoard').addEventListener('click',()=>{
 const href=URL.createObjectURL(new Blob([JSON.stringify(board,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=href;a.download='synthai-plan-001-goals.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
});
$('#importBoard').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>1000000)throw Error('Backup too large');board=validateBoard(JSON.parse(await file.text()));persistBoard();showGoals();$('#goalMessage').textContent='Backup imported';}
 catch(error){$('#goalMessage').textContent=error.message;}
 e.target.value='';
});
let database=null,projects=[],active=null,selectedSource=null,connector=null;
const integrationPending=new Map();
try{connector=await new BrowserArchiveConnector({persistence:new LocalStoragePersistence(),namespace:'synthai-computer-web'}).boot();
 $('#integrationState').textContent='Computer connector ready · original AutoLing/DISEMINER/Tool Factory mounted';
}catch(error){$('#integrationState').textContent='Computer connector unavailable: '+error.message;}
async function ensureIntegrated(project){
 if(!project||!connector) return null;
 if(integrationPending.has(project.id))return integrationPending.get(project.id);
 const pending=(async()=>{
  try{
   const receipt=await connector.install({name:project.name,files:project.files,indexedDbId:project.id});
   project.integration={id:receipt.id,mountId:receipt.mount.mountId,projectId:receipt.projectId,status:receipt.status};
   if(database)await store('readwrite',s=>s.put(project));
   if(active?.id===project.id)$('#integrationState').textContent='Mounted in Computer: '+project.name+' · '+receipt.fileCount+' source files · '+receipt.roles.join(', ')+' · model execution not yet verified';
   return receipt;
  }catch(error){if(active?.id===project.id)$('#integrationState').textContent='Computer mount failed: '+error.message;return null;}
 })();integrationPending.set(project.id,pending);
 try{return await pending}finally{integrationPending.delete(project.id)}
}

function openDatabase(){return new Promise((yes,no)=>{
 if(!window.indexedDB)return no(Error('IndexedDB not available'));
 const r=indexedDB.open('synthai-workspace-artifacts-v1',1);
 r.onupgradeneeded=()=>r.result.createObjectStore('projects',{keyPath:'id'});
 r.onsuccess=()=>yes(r.result);r.onerror=()=>no(r.error);
})}
function store(mode,work){return new Promise((yes,no)=>{
 const tx=database.transaction('projects',mode),req=work(tx.objectStore('projects'));
 tx.oncomplete=()=>yes(req.result);tx.onerror=()=>no(tx.error);
})}
function renderProjects(){
 $('#statProject').textContent=active?.name||'None';
 $('#projectList').innerHTML=projects.length?projects.map(p=>'<button class="project '+(active?.id===p.id?'selected':'')+'" data-p="'+safe(p.id)+'"><strong>'+safe(p.name)+'</strong><small>'+p.files.length+' text files'+(p.skipped?' · '+p.skipped+' skipped':'')+'</small></button>').join(''):'<span class="subtle">No imported projects yet</span>';
 $$('[data-p]').forEach(b=>b.addEventListener('click',()=>setActive(projects.find(p=>p.id===b.dataset.p))));
}
function showFile(f){
 selectedSource=f;
 if(/\.html?$/i.test(f.path)){try{$('#appPreview').srcdoc=makeSafePreview(active.files,f);$('#previewState').textContent='Sandbox preview';$('#previewNote').textContent='Previewing '+f.path+' in an isolated origin, not a production build.'}catch(e){$('#previewNote').textContent=e.message;}}
 else{$('#appPreview').srcdoc='';$('#previewState').textContent='Source only';const pre=document.createElement('pre');pre.className='codeview';pre.textContent=f.text.slice(0,18000);$('#previewNote').replaceChildren(document.createTextNode('Source file '+f.path+' (not executed)'),pre);}
}
function renderTree(){
 $('#fileTree').innerHTML=active?active.files.slice(0,500).map(f=>'<button class="file" data-f="'+safe(f.path)+'">'+safe(f.path)+' <small>'+Math.round(f.size/1024)+'KB</small></button>').join(''):'<span class="subtle">Select a project</span>';
 $$('[data-f]').forEach(b=>b.addEventListener('click',()=>{const f=active.files.find(f=>f.path===b.dataset.f);if(f)showFile(f)}));
}
function setActive(p){
 active=p||null;selectedSource=null;renderProjects();renderTree();
 if(!active){$('#appPreview').srcdoc='';$('#previewState').textContent='No app';return;}
 const f=pickEntry(active.files);
 if(f)showFile(f);else{$('#appPreview').srcdoc='';$('#previewState').textContent='Sources only';$('#previewNote').textContent='No runnable HTML entry. Source apps such as React or APKs require their toolchain to build.';}
 if(connector)void ensureIntegrated(active);
}
try{database=await openDatabase();projects=await store('readonly',s=>s.getAll());projects.sort((a,b)=>b.addedAt-a.addedAt);$('#storageState').textContent='Saved on this device';setActive(projects[0])}
catch(e){$('#storageState').textContent='Session-only';$('#importStatus').textContent='Persistent storage unavailable: '+e.message;renderProjects()}
$('#fileInput').addEventListener('change',e=>{$('#importStatus').textContent=(e.target.files?.length||0)+' files selected'});
$('#importFiles').addEventListener('click',async()=>{
 const incoming=[...$('#fileInput').files];if(!incoming.length){$('#importStatus').textContent='Choose files first';return;}
 $('#importFiles').disabled=true;
 try{for(const f of incoming){
  let files,skipped=0,entries=1;
  if(/\.zip$/i.test(f.name)){const unpacked=await extractTextZip(await f.arrayBuffer());files=unpacked.files;skipped=unpacked.skipped.length;entries=unpacked.entryCount}
  else{const path=safePath(f.name);if(!path||f.size>3e6)throw Error('Unsupported file size or path');files=[{path,text:await f.text(),size:f.size}]}
  if(!files.length){$('#importStatus').textContent=f.name+': no text files in '+entries+' entries';continue;}
  const record={id:'import-'+crypto.randomUUID(),name:f.name,files,skipped,entries,addedAt:Date.now()};
  if(database)await store('readwrite',s=>s.put(record));
  projects.unshift(record);setActive(record);
  $('#importStatus').textContent='Imported '+f.name+': '+files.length+' readable text files, '+skipped+' skipped; source untouched.';
 }}catch(e){$('#importStatus').textContent='Import stopped: '+e.message}
 $('#fileInput').value='';$('#importFiles').disabled=false;
});
$('#clearSelection').addEventListener('click',()=>{setActive(null);$('#importStatus').textContent='View cleared; local files are preserved'});
$('#openAppUrl').addEventListener('click',()=>{
 try{const url=new URL($('#appUrl').value.trim());if(url.protocol!=='https:')throw Error('HTTPS required');window.open(url.href,'_blank','noopener,noreferrer');$('#previewNote').textContent='Opened live app in new tab. Embedded display may be blocked by the app host.'}
 catch(e){$('#previewNote').textContent='Invalid URL: '+e.message}
});
$('#installSource').addEventListener('click',async()=>{if(!active){$('#integrationState').textContent='Choose a source archive first';return;}await ensureIntegrated(active);});
$('#analyzeSource').addEventListener('click',async()=>{
 if(!connector||!active||!selectedSource){$('#integrationResult').textContent='Select an imported file and connect the Computer first.';return;}
 const receipt=await ensureIntegrated(active);if(!receipt)return;
 $('#analyzeSource').disabled=true;$('#integrationResult').textContent='Analyzing the source with Synthia...';
 try{
  const result=await connector.analyzeFile(receipt.id,{path:selectedSource.path,text:selectedSource.text,engine:'autoling'});
  $('#integrationResult').textContent=JSON.stringify({engine:'original AutoLing',archiveId:receipt.id,path:selectedSource.path,readingId:result.readingId,sourceSha256:result.sourceSha256,output:result.output},null,2).slice(0,16000);
 }catch(error){$('#integrationResult').textContent='Analysis failed: '+error.message}
 $('#analyzeSource').disabled=false;
});
$('#tryTool').addEventListener('click',async()=>{
 if(!connector||!active){$('#integrationResult').textContent='Connect an archive first';return;}
 const receipt=await ensureIntegrated(active);if(!receipt)return;
 try{
  const result=await connector.runGeneratedTool({purpose:'analyze integrated source',dimension:'Design',level:4,gate:14,
    input:{archive:active.name,path:selectedSource?.path||'SOURCE_MANIFEST.json',sample:selectedSource?.text.slice(0,400)||''}});
  $('#integrationResult').textContent=JSON.stringify(result,null,2);
 }catch(error){$('#integrationResult').textContent='Tool execution failed: '+error.message}
});


// Local Computer model lab. All actions are same-origin only. The hosted static
// page has no server-side access to private browser imports or model weights.
async function computerJson(path,payload){
 const response=await fetch(path,{
  ...(payload===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify(payload)}),
  redirect:'error',cache:'no-store'
 });
 const type=response.headers.get('content-type')||'';
 if(!type.includes('application/json'))throw Error('Open this panel from the local Computer URL; hosted static preview has no model server');
 const value=await response.json();
 if(!response.ok)throw Error(value.error||'Computer endpoint returned '+response.status);
 return value;
}
$('#checkModels').addEventListener('click',async()=>{
 $('#modelEngineState').textContent='Checking';
 try{
  const [models,address]=await Promise.all([
    computerJson('/api/models/status'),computerJson('/api/generative-address/status')
  ]);
  $('#modelEngineState').textContent='Computer connected';
  $('#modelOutput').textContent=JSON.stringify({
    trident:models.trident,modelmaker:models.modelmaker,
    generativeAddress:{connected:address.connected,provider:address.provider,error:address.error??null}
  },null,2);
 }catch(error){
   $('#modelEngineState').textContent='Local Computer unavailable';
   $('#modelOutput').textContent=error.message;
 }
});
$('#tridentCheckpointFile').addEventListener('change',event=>{
 const selected=event.target.files?.[0];
 $('#checkpointInstallStatus').textContent=selected?
   selected.name+' · '+(selected.size/1048576).toFixed(1)+' MiB':'No checkpoint selected.';
});
$('#installTridentWeights').addEventListener('click',async()=>{
 const file=$('#tridentCheckpointFile').files?.[0];
 if(!file){$('#checkpointInstallStatus').textContent='Choose the trained .pt file first';return;}
 if(file.size<100000||file.size>20*1024*1024 || !/\\.p(?:t|th)$/i.test(file.name)){
   $('#checkpointInstallStatus').textContent='Choose genuine .pt/.pth weights between 100 KB and 20 MB';
   return;
 }
 const button=$('#installTridentWeights');button.disabled=true;
 $('#checkpointInstallStatus').textContent='Verifying original TRIDENT model and all heads...';
 try{
   const bytes=new Uint8Array(await file.arrayBuffer());
   const chunks=[];
   for(let i=0;i<bytes.length;i+=8192)
     chunks.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
   const base64=btoa(chunks.join(''));
   const result=await computerJson('/api/models/import-checkpoint',{base64});
   if(!result?.verified||!result?.active)throw Error('Computer did not verify the model');
   $('#checkpointInstallStatus').textContent='Verified '+result.trainableParameters+
     ' parameters across '+result.verifiedHeads.join(', ')+'. Checkpoint SHA-256: '+result.sha256;
   $('#modelEngineState').textContent='TRIDENT weights verified';
 }catch(error){
   $('#checkpointInstallStatus').textContent='Import not activated: '+error.message;
 }
 button.disabled=false;
});
$('#admitSource').addEventListener('click',async()=>{
 if(!selectedSource){$('#admitStatus').textContent='Choose a text file from the Files panel first';return;}
 if(selectedSource.size>700000){$('#admitStatus').textContent='Select a source under 700 KB for the first local model-training run';return;}
 $('#admitSource').disabled=true;
 try{
   const bytes=new TextEncoder().encode(selectedSource.text);
   let binary='';
   for(let offset=0;offset<bytes.length;offset+=16000)
     binary+=String.fromCharCode(...bytes.subarray(offset,offset+16000));
   const name=selectedSource.path.split('/').at(-1);
   const result=await computerJson('/api/ingest',{name,base64:btoa(binary)});
   const first=result.items?.[0];
   if(!first?.addressKey||!first.path)throw Error('Computer did not return a verified source address');
   $('#trainingSourcePath').value=first.path;
   $('#admitStatus').textContent='Computer admitted '+first.path+' · digest '+first.digest+' · '+first.addressKey;
 }catch(error){$('#admitStatus').textContent='Admission failed: '+error.message}
 $('#admitSource').disabled=false;
});
$('#trainModel').addEventListener('click',async()=>{
 const sourcePath=$('#trainingSourcePath').value.trim();
 if(!sourcePath){$('#modelOutput').textContent='Import a training source into local Computer first';return;}
 $('#trainModel').disabled=true;
 $('#modelOutput').textContent='Training requested from the original local Model Maker...';
 try{
  const response=await computerJson('/api/models/train',{
    sourcePath,name:$('#trainModelName').value.trim(),epochs:1
  });
  $('#modelOutput').textContent=JSON.stringify(response,null,2);
 }catch(error){$('#modelOutput').textContent='Original Model Maker training failed: '+error.message}
 $('#trainModel').disabled=false;
});
$('#runModel').addEventListener('click',async()=>{
 const mode=$('#modelMode').value, text=$('#modelPrompt').value.trim();
 if(!text){$('#modelOutput').textContent='Enter a prompt';return;}
 $('#runModel').disabled=true;
 $('#modelOutput').textContent='Calling the selected original engine...';
 try{
  const result=['trident','modelmaker'].includes(mode)?
    await computerJson('/api/models/generate',{text,backend:mode,maxNewTokens:16}):
    await computerJson('/api/chat/forms',{text,mode});
  $('#modelOutput').textContent=JSON.stringify(result,null,2).slice(0,22000);
 }catch(error){$('#modelOutput').textContent='No verified response: '+error.message}
 $('#runModel').disabled=false;
});


// Synthia proactive agent: original Computer event bus + Klein tools +
// actual TRIDENT inference, not a separate placeholder application.
async function showProactive(){
 const state=$('#proactiveState'),output=$('#proactiveFeed'),proposals=$('#proactiveProposals');
 try{
  const data=await computerJson('/api/proactive/status');
  state.textContent=data.status.active?'Local watcher active':'Watcher not active';
  output.textContent=JSON.stringify({
   watcher:data.status.watches,
   originalModelGatewayConnected:data.status.modelConnected,
   autoBuildAddsOnly:data.status.automaticNewFiles,
   deleteAllowed:false,
   gitRequiresApproval:true,
   latestSourceReports:data.reports.slice(-8),
   recentBuilds:data.builds.slice(-6),
   latestEvents:data.events.slice(-6)
  },null,2);
  proposals.replaceChildren();
  const pending=data.proposals.filter(x=>x.status==='pending');
  if(!pending.length){proposals.textContent='No pending proposals';return}
  for(const task of pending){
   const el=document.createElement('div');el.className='goal';
   const reason=document.createElement('p');reason.textContent=task.action+': '+task.reason;
   const meta=document.createElement('small');
   meta.textContent=task.requiresApproval?'Explicit approval required':'Feedback requested';
   el.append(reason,meta);
   for(const [decision,label] of [['accept',task.requiresApproval?'Approve':'Useful'],['reject','Reject']]){
    const button=document.createElement('button');button.type='button';
    button.className='button muted';button.textContent=label;
    button.addEventListener('click',async()=>{
     let confirmation=null;
     if(decision==='accept'&&task.requiresApproval){
      const phrase=task.action==='publish-project'?'PUBLISH '+task.projectId:'BUILD '+task.id;
      confirmation=window.prompt('This is a major change. Enter EXACTLY '+phrase+' to authorize:');
      if(confirmation!==phrase){$('#proactiveResult').textContent='Approval cancelled; nothing executed.';return;}
     }
     button.disabled=true;
     try{
      const result=await computerJson('/api/proactive/decide',{proposalId:task.id,decision,confirmation});
      $('#proactiveResult').textContent=JSON.stringify(result,null,2).slice(0,14000);
      await showProactive();
     }catch(error){$('#proactiveResult').textContent=error.message}
     finally{button.disabled=false}
    });
    el.append(button);
   }
   proposals.append(el);
  }
 }catch(error){state.textContent='Local Computer required';output.textContent=error.message;proposals.replaceChildren();}
}
$('#refreshProactive').addEventListener('click',showProactive);
$('#draftProactive').addEventListener('click',async()=>{
 const goal=$('#proactiveGoal').value.trim();
 if(!goal){$('#proactiveResult').textContent='Describe the functionality you want Synthia to build.';return;}
 const button=$('#draftProactive');button.disabled=true;
 $('#proactiveResult').textContent='Requesting actual original TRIDENT Code-head inference...';
 try{
  const result=await computerJson('/api/proactive/draft',{goal,name:'Synthia '+goal.slice(0,50),backend:'trident'});
  $('#proactiveResult').textContent=JSON.stringify(result,null,2).slice(0,16000);
  await showProactive();
 }catch(error){$('#proactiveResult').textContent='TRIDENT build not verified: '+error.message}
 finally{button.disabled=false}
});
$$('[data-tab="proactive-agent"]').forEach(button=>button.addEventListener('click',showProactive));
