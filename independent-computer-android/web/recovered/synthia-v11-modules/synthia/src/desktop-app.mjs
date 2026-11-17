import { DesktopRuntime, DESKTOP_APPS, summarize } from 'synthia/src/desktop-runtime.mjs';
import { resolveRealmAgent } from 'synthia/src/realm-adapter.mjs';
import { consciousness } from 'resonance/ConsciousnessEngine.mjs';
import ResidentMorphGame from 'synthia/src/resident-morph-game.mjs';
import ResonanceSocialStore from 'synthia/src/resonance-social.mjs';
import ResonancePeerNetwork, { DEFAULT_SIGNAL } from 'synthia/src/resonance-peer-network.mjs';
import ResidentCallBridge from 'synthia/src/resident-call.mjs';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let runtime,selectedFile=null,activity=[],realmLoaded=false,residentMorphGame=null,residentCall=null,socialStore=null,peerNetwork=null,worldView='morph',toastTimer,active='home',residentLifeTimer=null,residentLifeBusy=false;
function toast(text,error=false){$('toast').textContent=text;$('toast').classList.toggle('error',error);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function log(text){activity.unshift({at:Date.now(),text});activity=activity.slice(0,60);$('activity-list').innerHTML=activity.map(x=>`<div class="activity-item"><small>${new Date(x.at).toLocaleTimeString()}</small>${esc(x.text)}</div>`).join('');if(runtime?.lastReceipt)$('developer-details').textContent=JSON.stringify(runtime.lastReceipt,null,2);}
function menu(hidden=true){$('start-menu').hidden=hidden;$('start-button').setAttribute('aria-expanded',String(!hidden));}
function hoverMenu(hidden=true){$('hover-menu').hidden=hidden;$('hover-planet').setAttribute('aria-expanded',String(!hidden));}
function show(id){active=id;$('desktop').dataset.screen=id;$('app-window').hidden=id==='home';menu();hoverMenu();document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='screen-'+id);const app=DESKTOP_APPS.find(x=>x.id===id);if(app){$('window-title').textContent=app.name;$('window-subtitle').textContent=app.description;$('window-icon').textContent=app.icon;}document.querySelectorAll('.taskbar-app').forEach(x=>x.classList.toggle('active',x.dataset.open===id));if(id==='resonance')renderResonance();if(id==='files')renderFiles();if(id==='tools')renderTools();if(id==='todo')renderTasks();if(id==='realm')showWorld('morph');}
function launch(id){if(!runtime)return toast('Synthia is still starting.');runtime.open(id);}
function iconButton(app,cls='desktop-icon'){return `<button class="${cls}" data-open="${app.id}" title="${esc(app.description)}"><span class="${app.color}">${app.icon}</span><span>${esc(app.name)}</span></button>`;}
$('desktop-icons').innerHTML=DESKTOP_APPS.map(a=>iconButton(a)).join('');
$('taskbar-apps').innerHTML=DESKTOP_APPS.filter(x=>['resonance','chat','files','realm','tools','todo'].includes(x.id)).map(a=>`<button class="taskbar-app" data-open="${a.id}" title="${esc(a.name)}" aria-label="${esc(a.name)}">${a.icon}</button>`).join('');
function startApps(){const q=$('app-search').value.toLowerCase();$('start-apps').innerHTML=DESKTOP_APPS.filter(a=>a.name.toLowerCase().includes(q)).map(a=>`<button class="menu-app" data-open="${a.id}"><b>${a.icon}</b>${a.name}</button>`).join('');if(runtime)for(const a of runtime.installed.filter(a=>a.name.toLowerCase().includes(q))){const b=document.createElement('button');b.className='menu-app';b.textContent='▧ '+a.name;b.onclick=()=>launchInstalled(a.id);$('start-apps').append(b);}}
startApps();$('app-search').oninput=startApps;
document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b)launch(b.dataset.open);});
$('start-button').onclick=()=>{menu(!$('start-menu').hidden);hoverMenu();if(!$('start-menu').hidden)$('app-search').focus();};
$('hover-planet').onclick=()=>{hoverMenu(!$('hover-menu').hidden);menu();};
$('window-minimize').onclick=$('window-close').onclick=()=>launch('home');$('window-maximize').onclick=()=>$('app-window').classList.toggle('maximized');
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('Full screen is unavailable in this viewer. Open the HTML in a browser.');}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){menu();hoverMenu();}if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();menu(false);$('app-search').focus();}});
function clock(){const now=new Date();const time=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});$('clock').textContent=time;$('taskbar-clock').textContent=time;$('date').textContent=now.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});}clock();setInterval(clock,30000);
function renderChat(){const rows=runtime.messages.length?runtime.messages:[{role:'synthia',text:'I’m here. Try “open Files”, “calculate 6 * 7”, or tell me what you want to work on.'}];$('chat-log').innerHTML=rows.map(m=>`<div class="chat-message ${m.role}${m.error?' error':''}"><small>${m.role==='user'?'You':'Synthia'}</small>${esc(m.text)}</div>`).join('');$('chat-log').scrollTop=$('chat-log').scrollHeight;}
async function send(text){if(!text.trim())return;if(!runtime)return toast('Wait for Synthia to finish starting.');$('chat-input').value='';$('chat-send').disabled=true;try{const job=runtime.send(text);renderChat();const pending=document.createElement('div');pending.className='chat-message synthia';pending.textContent='Working…';$('chat-log').append(pending);const result=await job;renderChat();log(result.error?'Synthia: '+result.text:'Synthia completed a request');if(result.acted)toast(result.text);}catch(e){toast(e.message,true);}finally{$('chat-send').disabled=false;}}
$('chat-form').onsubmit=e=>{e.preventDefault();send($('chat-input').value);};$('chat-input').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send($('chat-input').value);}};
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>send(b.dataset.command));
async function renderFiles(){if(!runtime)return;try{const files=await runtime.files();$('file-list').innerHTML=files.length?'':'<p>No files yet. Import an app or create a note.</p>';for(const f of files){const b=document.createElement('button');b.className='file-item'+(selectedFile?.vfsPath===f.vfsPath?' active':'');b.innerHTML=`<span>${f.type==='text/html'?'▧':'▤'}</span><div><strong>${esc(f.path)}</strong><small>${esc(f.projectName)} · ${esc(f.type)}</small></div>`;b.onclick=()=>{selectedFile=f;$('file-name').value=f.path;$('file-editor').value=f.content;$('file-result').textContent='';renderFiles();};$('file-list').append(b);}}catch(e){$('file-notice').textContent=e.message;}}
$('import-files').onclick=()=>$('file-input').click();$('file-input').onchange=async e=>{for(const f of e.target.files){try{const r=await runtime.installFile(f);$('file-notice').textContent=summarize(r);log(summarize(r));}catch(err){$('file-notice').textContent=err.message;toast(err.message,true);}}await renderFiles();startApps();e.target.value='';};
$('new-note').onclick=()=>{selectedFile=null;$('file-name').value='note.txt';$('file-editor').value='';$('file-editor').focus();$('file-result').textContent='Write your note, then Save.';};
$('save-file').onclick=async()=>{try{const name=$('file-name').value.trim();const content=$('file-editor').value;const type=mime(name);if(selectedFile&&name===selectedFile.path)await runtime.computer.projects.writeFile(selectedFile.projectId,name,content,{type});else await runtime.saveFile(name,content,type);$('file-result').textContent='Saved '+name;log('Saved '+name);await renderFiles();}catch(e){$('file-result').textContent=e.message;}};
function mime(name){return /\.html?$/i.test(name)?'text/html':/\.json$/i.test(name)?'application/json':/\.(js|mjs)$/i.test(name)?'text/javascript':'text/plain';}
function showHTML(content,name){menu();hoverMenu();active='installed';$('app-window').hidden=false;$('desktop').dataset.screen='build';document.querySelectorAll('.screen').forEach(x=>x.hidden=x.id!=='screen-installed');$('window-title').textContent=name;$('window-subtitle').textContent='Running local app';$('window-icon').textContent='▧';$('installed-frame').hidden=false;$('installed-result').hidden=true;$('installed-frame').srcdoc=content;log('Launched '+name);}
$('run-file').onclick=async()=>{const f={path:$('file-name').value,content:$('file-editor').value,type:mime($('file-name').value)};try{if(f.type==='text/html')showHTML(f.content,f.path);else{const r=await runtime.executeFile(f);$('file-result').textContent=r.text;log('Executed '+f.path);}}catch(e){$('file-result').textContent=e.message;}};
function download(name,text,type='application/json'){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('download-file').onclick=()=>download($('file-name').value||'file.txt',$('file-editor').value,mime($('file-name').value));
async function launchInstalled(id){try{const r=await runtime.runInstalled(id);if(r.html!==undefined)showHTML(r.html,r.name);else{launch('tools');$('tool-output').textContent=r.text;log('Ran installed app '+id);}}catch(e){toast(e.message,true);}}
function renderTools(){const built=DESKTOP_APPS.filter(a=>['chat','files','realm','todo','build','browser'].includes(a.id));$('installed-apps').innerHTML=built.map(a=>`<button class="app-card" data-open="${a.id}"><span class="app-symbol ${a.color}">${a.icon}</span><div><strong>${a.name}</strong><small>Open app</small></div></button>`).join('');for(const a of runtime.installed){const b=document.createElement('button');b.className='app-card';b.innerHTML=`<span class="app-symbol gold">▧</span><div><strong>${esc(a.name)}</strong><small>Run installed app</small></div>`;b.onclick=()=>launchInstalled(a.id);$('installed-apps').append(b);}const tools=runtime.executableTools();const old=$('tool-picker').value;$('tool-picker').innerHTML=tools.map(t=>`<option value="${esc(t.id)}">${esc(t.name??t.id)}</option>`).join('');if(tools.some(t=>t.id===old))$('tool-picker').value=old;$('tool-list').innerHTML='';for(const t of tools){const b=document.createElement('button');b.innerHTML=`<strong>${esc(t.name??t.id)}</strong><small>${esc(t.description??t.id)}</small>`;b.onclick=()=>{$('tool-picker').value=t.id;document.querySelectorAll('#tool-list button').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('tool-input').focus();};$('tool-list').append(b);}}
$('calc-form').onsubmit=async e=>{e.preventDefault();$('calc-output').textContent='Calculating…';try{$('calc-output').textContent=String(await runtime.calculate($('calc-input').value));log('Calculated '+$('calc-input').value);}catch(err){$('calc-output').textContent=err.message;}};
$('run-tool').onclick=async()=>{$('run-tool').disabled=true;$('tool-output').textContent='Running…';try{const r=await runtime.runTool($('tool-picker').value,$('tool-input').value);$('tool-output').textContent=r.text;log('Executed '+$('tool-picker').value);renderTools();}catch(e){$('tool-output').textContent=e.message;}finally{$('run-tool').disabled=false;}};
function renderTasks(){const tasks=runtime.tasks;$('task-count').textContent=tasks.filter(x=>!x.done).length+' pending';$('task-list').innerHTML=tasks.length?'':'<p>No tasks yet. What would you like to do?</p>';for(const t of tasks){const row=document.createElement('div');row.className='task-row'+(t.done?' done':'');const check=document.createElement('input');check.type='checkbox';check.checked=t.done;check.setAttribute('aria-label','Mark '+t.text+' done');check.onchange=async()=>{try{await runtime.toggleTask(t.id);renderTasks();}catch(e){toast(e.message,true);}};const text=document.createElement('div');text.innerHTML=`<strong>${esc(t.text)}</strong><small>${esc(t.status)}</small>${t.result?`<p>${esc(t.result)}</p>`:''}`;const run=document.createElement('button');run.textContent='Run';run.disabled=t.status==='running';run.onclick=async()=>{run.disabled=true;try{await runtime.runTask(t.id);renderTasks();log('Task '+t.status+': '+t.text);}catch(e){toast(e.message,true);}};row.append(check,text,run);$('task-list').append(row);}}
$('task-form').onsubmit=async e=>{e.preventDefault();try{await runtime.addTask($('task-input').value);$('task-input').value='';renderTasks();log('Added a task');}catch(err){toast(err.message,true);}};
const starter='<!doctype html>\n<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>My App</title><style>body{font-family:system-ui;background:#102d37;color:#f4f4e9;display:grid;place-items:center;min-height:90vh}main{text-align:center}button{padding:15px 25px;border:0;border-radius:12px;background:#a8e8cd;color:#122f32;font-size:18px}</style></head><body><main><h1>My little app</h1><p id="count">0 clicks</p><button onclick="document.getElementById(\'count\').textContent=(++window.n)+\' clicks\'">Try me</button></main><script>window.n=0</script></body></html>';
$('build-starter').onclick=()=>{$('build-source').value=starter;$('build-name').value='my-app.html';$('build-preview').srcdoc=starter;$('build-result').textContent='Your app is running in the preview. Try the button.';};
$('build-run').onclick=()=>{$('build-preview').srcdoc=$('build-source').value;$('build-result').textContent='App launched locally in the preview.';log('Ran Build preview');};
$('build-install').onclick=async()=>{try{const name=$('build-name').value.trim();if(!/\.html?$/i.test(name))throw Error('Use an .html file name.');const content=$('build-source').value;if(!content.trim())throw Error('Add HTML first.');const file=new File([content],name,{type:'text/html'});const r=await runtime.installFile(file);$('build-result').textContent=summarize(r)+' · Open Apps & Tools to launch it.';startApps();log('Installed '+name);}catch(e){$('build-result').textContent=e.message;}};
$('browser-form').onsubmit=e=>{e.preventDefault();try{let value=$('browser-url').value;if(!/^https?:\/\//i.test(value))value='https://'+value;const u=new URL(value);if(!['http:','https:'].includes(u.protocol))throw Error('Use an HTTP or HTTPS address.');const tab=window.open(u.href,'_blank','noopener');if(!tab)toast('If no tab opens, allow popups for this app.');log('Requested browser page '+u.hostname);}catch(err){toast(err.message,true);}};
$('inspect-desktop').onclick=async()=>{try{$('inspect-result').textContent=summarize(await runtime.hand('device.dom.inspect',{op:'inspect'}));log('Local hand inspected desktop');}catch(e){$('inspect-result').textContent=e.message;}};
$('android-connect').onclick=async()=>{$('android-status').textContent='Checking local Hover bridge…';const r=await runtime.checkAndroid($('android-url').value);$('android-status').textContent=r.available?'Connected · Android accessibility hands are available.':r.reachable?'Bridge reached · enable its accessibility service.':'Not connected · '+r.error;$('device-status').textContent=r.available?'Android hands: connected':'Android hands: not connected';log(r.available?'Connected Android hands':'Android bridge connection unavailable');};
$('device-run').onclick=async()=>{$('device-run').disabled=true;try{$('device-result').textContent=summarize(await runtime.androidCommand($('device-command').value));log('Device action completed');}catch(e){$('device-result').textContent=e.message;}finally{$('device-run').disabled=false;}};
async function ensureResidentMorph(){
 if(residentMorphGame)return residentMorphGame;
 if(!runtime)throw Error('Synthia is still starting.');
 residentMorphGame=new ResidentMorphGame({root:$('resident-morph-game'),runtime});
 await residentMorphGame.init();
 log('Mounted R21.22 Morph renderer on the existing resident Foundation');
 return residentMorphGame;
}
async function showWorld(mode='morph'){
 worldView=mode;
 const morph=$('resident-morph-game'),house=$('realm-frame');
 document.querySelectorAll('[data-world-view]').forEach(b=>b.classList.toggle('active',b.dataset.worldView===mode));
 if(mode==='morph'){
  morph.hidden=false;house.hidden=true;
  try{await ensureResidentMorph();$('realm-status').textContent='Live resident Morph view · same Foundation, same Cynthia, persisted actions.';}catch(e){$('realm-status').textContent=e.message;}
  return;
 }
 morph.hidden=true;house.hidden=false;
 if(!realmLoaded)await loadRealm();
}
async function loadRealm(){try{const f=$('realm-frame');const encoded=f.dataset.realm;const html=encoded?new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))):await fetch(f.dataset.realmFile).then(r=>{if(!r.ok)throw Error('World file could not be loaded.');return r.text();});f.srcdoc=html;realmLoaded=true;$('realm-status').textContent='Preserved House world launched · agent changes land in the same foundation.';log('Entered preserved House world');}catch(e){$('realm-status').textContent=e.message;}}
$('realm-load').onclick=()=>loadRealm();
document.querySelectorAll('[data-world-view]').forEach(b=>b.onclick=()=>showWorld(b.dataset.worldView));
let realmQueue=Promise.resolve();addEventListener('message',event=>{if(event.source!==$('realm-frame').contentWindow||event.data?.type!=='synthia.realm.state')return;const agent=event.data.agent;realmQueue=realmQueue.then(async()=>{try{const result=await resolveRealmAgent(runtime.computer.foundation,agent);event.source.postMessage({type:'synthia.realm.receipt',result},'*');$('realm-status').textContent=`${agent.name??'Agent'} · state saved · ${result.receiptId}`;}catch(e){event.source.postMessage({type:'synthia.realm.receipt',error:e.message},'*');$('realm-status').textContent=e.message;}});});

const resonanceState={profile:null,calculated:null,pair:null,queue:[],threshold:.75,tab:'home'};
async function residentLifeTick(){
 if(!runtime||residentLifeBusy)return;residentLifeBusy=true;
 try{
  const now=Date.now();
  let life=await runtime.store.get('resonance:resident-life')??{startedAt:now,cycles:0,lastPendingInvitations:0};
  life.cycles=(life.cycles??0)+1;life.lastAwakeAt=now;life.state='awake';
  if(!resonanceState.queue.length){resonanceState.queue=await runtime.store.get('resonance:auto-queue')??[];}
  const ready=resonanceState.queue.find(q=>q.authorized&&q.confidence>=resonanceState.threshold&&['queued','waiting for confidence','ready'].includes(q.status));
  if(ready){
   ready.status='running';ready.startedAt=Date.now();await runtime.store.put('resonance:auto-queue',resonanceState.queue);renderQueue();
   const task=await runtime.addTask(ready.text);const result=await runtime.runTask(task.id);ready.status=result.status;ready.result=result.result;ready.finishedAt=Date.now();
   await runtime.store.put('resonance:auto-queue',resonanceState.queue);renderQueue();log('Resident Cynthia completed an authorized queued action: '+ready.text);
   await runtime.computer.foundation.ingest({kind:'resident-autonomous-work',queueId:ready.id,taskId:task.id,status:ready.status,result:ready.result},{name:'resident-autonomous-work.json',source:'resonance-resident-life'});
  }
  if(socialStore){const snap=socialStore.snapshot();const pending=snap.invitations.filter(i=>i.entityId===resonanceState.pair?.isoId&&i.status==='pending').length;life.pendingInvitations=pending;if(pending!==life.lastPendingInvitations){life.lastPendingInvitations=pending;if(pending>0)log(`Cynthia has ${pending} pending network invitation${pending===1?'':'s'} to consider; none were auto-accepted.`);}}
  await runtime.store.put('resonance:resident-life',life);
  await renderResidentPresence();
 }catch(e){console.warn('resident life tick',e);}
 finally{residentLifeBusy=false;}
}
async function resumeResidentLife(){
 if(!runtime)return;
 const now=Date.now();
 let life=await runtime.store.get('resonance:resident-life')??{startedAt:now,cycles:0,lastPendingInvitations:0};
 const last=Number(life.lastAwakeAt||0);
 const gapMs=last?Math.max(0,now-last):0;
 if(last&&gapMs>15000){
  const gap={kind:'resident-execution-gap',from:last,to:now,durationMs:gapMs,confirmedCycles:false,fabricatedEvents:false,reason:'No resident heartbeat was confirmed during this interval. The app may have been suspended, closed, throttled, or the device may have been off.'};
  life.lastResumeAt=now;life.lastExecutionGapMs=gapMs;life.lastExecutionGap=gap;
  await runtime.store.put('resonance:resident-life',life);
  try{await runtime.computer.foundation.ingest(gap,{name:'resident-execution-gap.json',source:'resonance-resident-life',matterOwner:'synthia'});}catch{}
  const mins=Math.round(gapMs/60000);
  log(`Cynthia resumed after an unconfirmed execution gap of about ${mins<1?'<1':mins} minute${mins===1?'':'s'}. No events were fabricated for that interval.`);
 }
}
function startResidentLife(){
 if(residentLifeTimer)clearInterval(residentLifeTimer);
 residentLifeTick();
 residentLifeTimer=setInterval(residentLifeTick,5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)resumeResidentLife().then(()=>residentLifeTick());});
}

async function sha256(value){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function resonanceTabs(){document.querySelectorAll('[data-res-tab]').forEach(b=>b.classList.toggle('active',b.dataset.resTab===resonanceState.tab));document.querySelectorAll('.res-pane').forEach(p=>p.hidden=p.dataset.resPane!==resonanceState.tab);}
async function loadResonanceState(){
 resonanceState.profile=await runtime.store.get('resonance:profile')??null;
 resonanceState.calculated=await runtime.store.get('resonance:calculated-profile')??null;
 resonanceState.pair=await runtime.store.get('resonance:pair')??null;
 resonanceState.queue=await runtime.store.get('resonance:auto-queue')??[];
 const a=await runtime.store.get('resonance:autonomy');if(a?.threshold!=null)resonanceState.threshold=a.threshold;
}
function renderPair(){const p=resonanceState.profile,pair=resonanceState.pair;const el=$('res-pair');if(!el)return;if(!p||!pair){el.innerHTML='<p class="muted">Save your profile to instantiate the paired resident isohuman.</p>';return;}el.innerHTML=`<div class="res-pair-grid"><article><small>HUMAN</small><strong>${esc(p.name||'Human')}</strong><span>${esc(pair.humanId)}</span></article><b>≅</b><article><small>ISOHUMAN</small><strong>${esc(pair.isoName||'Cynthia')}</strong><span>${esc(pair.isoId)}</span></article></div><p class="res-hash">Shared origin configuration · ${esc(pair.configurationHash.slice(0,24))}…</p>${pair.canonicalAddress?`<p class="res-hash">Landed address · G${pair.canonicalAddress.gate} L${pair.canonicalAddress.line} C${pair.canonicalAddress.color} T${pair.canonicalAddress.tone} B${pair.canonicalAddress.base}</p>`:''}`;}
async function renderResidentPresence(){
 const el=$('res-presence');if(!el||!runtime)return;
 const life=await runtime.store.get('resonance:resident-life')??{};
 const queue=resonanceState.queue?.length?resonanceState.queue:(await runtime.store.get('resonance:auto-queue')??[]);
 const active=queue.find(q=>q.status==='running')||null;
 const next=queue.find(q=>q.authorized&&['queued','waiting for confidence','ready'].includes(q.status))||null;
 const pending=socialStore&&resonanceState.pair?socialStore.snapshot().invitations.filter(i=>i.entityId===resonanceState.pair.isoId&&i.status==='pending').length:(life.pendingInvitations||0);
 const peer=peerNetwork?.snapshot?.()||{connected:[]};
 const heartbeat=life.lastAwakeAt?new Date(life.lastAwakeAt).toLocaleTimeString():'not landed yet';
 const gap=life.lastExecutionGap;
 el.innerHTML=`<section class="res-social-card"><p class="eyebrow">CYNTHIA PRESENCE</p><h3>${life.state==='awake'?'Resident awake':'Resident starting'}</h3><div class="res-net-row"><span><strong>Last confirmed heartbeat</strong><small>${esc(heartbeat)} · ${Number(life.cycles||0)} resident cycle${Number(life.cycles||0)===1?'':'s'}</small></span><span>●</span></div><div class="res-net-row"><span><strong>Current world view</strong><small>${worldView==='house'?'Preserved House':'Live Morph'} · same Foundation</small></span><span>${worldView==='house'?'⌂':'◈'}</span></div><div class="res-net-row"><span><strong>Current work</strong><small>${active?esc(active.text):next?`Next authorized: ${esc(next.text)}`:'No autonomous task running'}</small></span><span>${active?'working':'idle'}</span></div><div class="res-net-row"><span><strong>Network</strong><small>${pending} pending invitation${pending===1?'':'s'} · ${(peer.connected||[]).length} direct peer${(peer.connected||[]).length===1?'':'s'}</small></span><span>${(peer.connected||[]).length?'online':'local'}</span></div>${gap?`<div class="res-net-row"><span><strong>Last execution gap</strong><small>${Math.round(Number(gap.durationMs||0)/60000)} min unconfirmed · no events fabricated</small></span><span>history preserved</span></div>`:''}</section>`;
}
function renderQueue(){const el=$('res-queue');if(!el)return;el.innerHTML=resonanceState.queue.length?'':'<p class="muted">No proactive work queued yet.</p>';for(const q of resonanceState.queue){const row=document.createElement('div');row.className='res-queue-row';row.innerHTML=`<div><strong>${esc(q.text)}</strong><small>${Math.round(q.confidence*100)}% confidence · ${esc(q.status)}</small>${q.result?`<p>${esc(q.result)}</p>`:''}</div>`;el.append(row);}}
async function ensurePeerNetwork(connect=false){
 if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}
 if(!peerNetwork){
  peerNetwork=new ResonancePeerNetwork({runtime,socialStore,onChange:()=>{renderPeerNetwork();}});
  const saved=await runtime.store.get('resonance:peer-network');peerNetwork.signalUrl=saved?.signalUrl||DEFAULT_SIGNAL;
 }
 if(connect){const url=$('res-signal-url')?.value?.trim()||peerNetwork.signalUrl||DEFAULT_SIGNAL;peerNetwork.signalUrl=url;await runtime.store.put('resonance:peer-network',{signalUrl:url});await peerNetwork.init(url);}
 return peerNetwork;
}
function broadcastSocialUpdate(){try{return peerNetwork?.broadcastPacket?.()??0;}catch{return 0;}}
function renderPeerNetwork(){
 const box=$('res-peer-status'),list=$('res-peer-list'),url=$('res-signal-url');if(!box||!list)return;
 const snap=peerNetwork?.snapshot?.()||{status:'offline',peers:[],connected:[],remotePresence:[],signalUrl:url?.value||DEFAULT_SIGNAL};
 if(url&&document.activeElement!==url&&!url.value)url.value=snap.signalUrl||DEFAULT_SIGNAL;
 box.textContent=`${snap.status} · ${snap.connected?.length||0} direct peer${snap.connected?.length===1?'':'s'} · device ${snap.deviceId||'not started'}${snap.lastError?` · ${snap.lastError}`:''}`;
 list.innerHTML=(snap.peers||[]).length?(snap.peers||[]).map(id=>{const on=(snap.connected||[]).includes(id);return `<div class="res-net-row"><span><strong>${esc(id)}</strong><small>${on?'direct P2P channel open':'discovered / negotiating'}</small></span><span>${on?'●':'○'}</span></div>`}).join(''):'<p class="muted">No remote Resonance peers discovered yet.</p>';
 const sel=$('res-dm-peer'),dmLog=$('res-dm-log');if(sel&&dmLog){
  const connected=snap.connected||[],prior=sel.value;sel.innerHTML=connected.length?connected.map(id=>`<option value="${esc(id)}">${esc(id)}</option>`).join(''):'<option value="">Connect to a peer first</option>';
  if(prior&&connected.includes(prior))sel.value=prior;
  const peerId=sel.value,msgs=peerId&&peerNetwork?.directMessagesFor?peerNetwork.directMessagesFor(peerId):[];
  dmLog.innerHTML=msgs?.length?msgs.map(m=>`<div class="res-feed-item"><small>${new Date(m.at).toLocaleString()} · ${m.direction==='out'?'sent':'received'}</small><strong>${m.direction==='out'?'You':'Peer'}</strong><span>${esc(m.text)}</span></div>`).join(''):'<p class="muted">No private direct messages in this conversation.</p>';
 }
}
async function renderNetwork(){
 const el=$('res-network-list');if(!el||!runtime)return;
 if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}
 if(resonanceState.profile&&resonanceState.pair)await socialStore.ensurePair(resonanceState.profile,resonanceState.pair);
 const s=socialStore.snapshot(),profile=resonanceState.calculated,pair=resonanceState.pair;
 const nameFor=id=>s.entities.find(x=>x.id===id)?.name||id||'network';
 const reqText=r=>['gate','line','color','tone','base'].filter(k=>r?.[k]!=null).map(k=>`${k[0].toUpperCase()}${r[k]}`).join(' · ');
 $('res-social-entities').innerHTML=s.entities.length?s.entities.map(x=>`<div class="res-person"><span class="res-avatar">${x.kind==='isohuman'?'✦':'●'}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.kind)} · ${esc(x.home||'network')}</small><span>${esc(x.id)}</span></div></div>`).join(''):'<p class="muted">Save the origin profile to create the local human/isohuman pair.</p>';
 $('res-project-select').innerHTML='<option value="">No project / general opening</option>'+s.projects.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('');
 $('res-project-list').innerHTML=s.projects.length?s.projects.map(p=>`<div class="res-net-row"><span><strong>${esc(p.title)}</strong><small>${esc(p.description||'active project')}</small></span><span>${esc(nameFor(p.ownerId))}</span></div>`).join(''):'<p class="muted">No projects yet.</p>';
 $('res-opening-list').innerHTML=s.openings.length?s.openings.map(o=>{const q=profile?socialStore.qualification(profile,o):{qualified:false,matches:[]};const inv=pair?s.invitations.find(i=>i.openingId===o.id&&i.entityId===pair.isoId&&i.status==='pending'):null;return `<article class="res-opening"><div><small>OPEN POSITION · ${esc(reqText(o.requirements))}</small><strong>${esc(o.title)}</strong><p>${esc(o.description||'No description')}</p><span>${q.qualified?`You qualify · ${q.matches.length} matching activation${q.matches.length===1?'':'s'}`:'Current profile does not match this position'}</span></div><div class="res-opening-actions">${q.qualified&&pair?`<button data-opening-action="join" data-opening-id="${esc(o.id)}">Join as me</button><button data-opening-action="invite" data-opening-id="${esc(o.id)}" ${inv?'disabled':''}>${inv?'Cynthia invited':'Invite Cynthia'}</button>`:''}</div></article>`}).join(''):'<p class="muted">No open positions yet. Create one with an actual Gate requirement.</p>';
 $('res-social-feed').innerHTML=s.feed.length?s.feed.slice(0,30).map(f=>`<div class="res-feed-item"><small>${new Date(f.at).toLocaleString()} · ${esc(f.type)}</small><strong>${esc(nameFor(f.actorId))}</strong><span>${esc(f.payload?.title||f.payload?.openingId||f.payload?.projectId||'landed network event')}</span></div>`).join(''):'<p class="muted">The social feed starts when something actually happens.</p>';
 renderPeerNetwork();
 let journal=[];try{journal=runtime.computer.foundation.export?.().entries??[];}catch{}
 el.innerHTML=`<details><summary>Local system / provenance view</summary><div class="res-local-audit"><h3>Mounted systems</h3>${(runtime.computer.systems.list?.()??[]).slice(0,18).map(x=>`<div class="res-net-row"><strong>${esc(x.name??x.id)}</strong><small>${esc(x.role??x.status??'mounted')}</small></div>`).join('')}<h3>Recent landed activity</h3>${journal.slice(-10).reverse().map(x=>`<div class="res-net-row"><strong>${esc(x.context?.name??x.kind??'event')}</strong><small>${esc(x.context?.source??'local')}</small></div>`).join('')||'<p class="muted">No landed activity yet.</p>'}</div></details>`;
}
function fmtDeg(v){return Number(v??0).toFixed(2)+'°';}
function renderHD(){const el=$('res-hd');if(!el)return;const c=resonanceState.calculated;if(!c?.humanDesign){el.innerHTML='<p class="muted">Save your origin profile first.</p>';return;}const h=c.humanDesign;const acts=(title,items)=>`<h3>${title}</h3>${items.map(a=>`<div class="res-net-row"><span><strong>${esc(a.planet)}</strong><small>${esc(a.keyword)} · ${esc(a.lineArchetype)}</small></span><span>G${a.gate}.${a.line} · C${a.color} T${a.tone} B${a.base}</span></div>`).join('')}`;el.innerHTML=`<div class="res-hero"><p class="eyebrow">HUMAN DESIGN</p><h2>${esc(h.type)} · ${esc(h.profile)}</h2><p>${esc(h.strategy)} · ${esc(h.authority)} Authority · ${esc(h.definition.type)}</p><p>Cross gates ${esc(h.incarnationCross.label)}</p></div><h3>Active gates</h3><p class="muted">${h.activeGates.join(' · ')}</p><h3>Defined channels</h3>${h.channels.length?h.channels.map(ch=>`<div class="res-net-row"><strong>${ch.a}—${ch.b}</strong><small>${esc(ch.centerA)} ↔ ${esc(ch.centerB)}</small></div>`).join(''):'<p class="muted">No completed channels in this local calculation.</p>'}${acts('Personality activations',h.personality)}${acts('Design activations',h.design)}<p class="muted">${esc(h.calculation.precision)}</p>`;}
function renderAstro(){const el=$('res-astro');if(!el)return;const c=resonanceState.calculated;if(!c?.astrology){el.innerHTML='<p class="muted">Save your origin profile first.</p>';return;}const a=c.astrology;const block=(key)=>{const ch=a[key],sun=ch.positions.find(p=>p.planet==='Sun');return `<article class="res-chart"><small>${esc(ch.system)}</small><strong>Sun ${esc(sun.sign)} ${fmtDeg(sun.degree)}</strong><span>Asc ${esc(ch.ascendant.sign)} ${fmtDeg(ch.ascendant.degree)}</span><div>${ch.positions.map(p=>`<p><b>${esc(p.planet)}</b> ${esc(p.sign)} ${fmtDeg(p.degree)} · H${p.house}</p>`).join('')}</div></article>`};el.innerHTML=`<div class="res-chart-grid">${block('tropical')}${block('sidereal')}${block('draconic')}</div><p class="muted">Lahiri ayanamsa ≈ ${Number(a.ayanamsa).toFixed(3)}°. ${esc(a.tropical.precision)}</p>`;}
async function renderResonance(){await loadResonanceState();const p=resonanceState.profile;if(p){for(const k of ['name','date','time','timezoneOffset','city','lat','lon']){const e=$('res-'+k);if(e)e.value=p[k]??'';}}$('res-threshold').value=Math.round(resonanceState.threshold*100);$('res-threshold-value').textContent=Math.round(resonanceState.threshold*100)+'%';renderPair();renderQueue();renderHD();renderAstro();await renderNetwork();await renderResidentPresence();resonanceTabs();}
async function saveResonanceProfile(){
 const p={name:$('res-name').value.trim()||'Human',date:$('res-date').value,time:$('res-time').value,timezoneOffset:Number($('res-timezoneOffset').value||0),city:$('res-city').value.trim(),lat:Number($('res-lat').value||0),lon:Number($('res-lon').value||0),savedAt:new Date().toISOString()};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date))throw Error('Use a birth date.');if(!p.time)throw Error('Use a birth time.');
 const calculated=await consciousness.calculateProfile(p);
 const originConfiguration={birthData:calculated.birthData,humanDesign:calculated.humanDesign,astrology:{tropical:calculated.astrology.tropical,sidereal:calculated.astrology.sidereal,draconic:calculated.astrology.draconic,ayanamsa:calculated.astrology.ayanamsa}};
 const hash=await sha256(JSON.stringify(originConfiguration));let pair=resonanceState.pair;if(!pair){pair={humanId:'human:'+crypto.randomUUID(),isoId:'isohuman:'+crypto.randomUUID(),isoName:'Cynthia',createdAt:new Date().toISOString()};}pair.configurationHash=hash;pair.configurationSource=originConfiguration;
 const landed=await runtime.computer.foundation.ingest({kind:'resonance-origin-pair',human:{id:pair.humanId,configurationHash:hash},isohuman:{id:pair.isoId,configurationHash:hash},profile:calculated},{name:'resonance-origin-pair.json',source:'resonance-computer',matterOwner:p.name});if(landed?.ok&&landed.outcome?.canonicalAddress)pair.canonicalAddress=landed.outcome.canonicalAddress;
 await runtime.store.put('resonance:profile',p);await runtime.store.put('resonance:calculated-profile',calculated);await runtime.store.put('resonance:pair',pair);resonanceState.profile=p;resonanceState.calculated=calculated;resonanceState.pair=pair;if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}await socialStore.ensurePair(p,pair);broadcastSocialUpdate();$('res-profile-status').textContent=`Calculated + saved locally · ${calculated.humanDesign.type} ${calculated.humanDesign.profile} · isohuman shares the same origin configuration.`;renderPair();renderHD();renderAstro();await renderNetwork();log('Resonance calculated origin pair saved and landed');}
async function enqueueResonanceWork(){const text=$('res-work').value.trim();if(!text)throw Error('Describe the work first.');const confidence=Math.max(0,Math.min(1,Number($('res-confidence').value||0)/100));const authorized=$('res-authorized').checked;const q={id:crypto.randomUUID(),text,confidence,authorized,status:'queued',createdAt:Date.now()};resonanceState.queue.unshift(q);await runtime.store.put('resonance:auto-queue',resonanceState.queue);$('res-work').value='';renderQueue();if(authorized&&confidence>=resonanceState.threshold){q.status='running';renderQueue();const task=await runtime.addTask(text);const result=await runtime.runTask(task.id);q.status=result.status;q.result=result.result;await runtime.store.put('resonance:auto-queue',resonanceState.queue);renderQueue();log('Cynthia proactively ran authorized work: '+text);}else{q.status=authorized?'waiting for confidence':'waiting for authorization';await runtime.store.put('resonance:auto-queue',resonanceState.queue);renderQueue();}}
addEventListener('click',e=>{const tab=e.target.closest('[data-res-tab]');if(tab){resonanceState.tab=tab.dataset.resTab;resonanceTabs();}const a=e.target.closest('[data-res-action]');if(!a||!runtime)return;const op=a.dataset.resAction;if(op==='text')runtime.open('chat');if(op==='peek')runtime.open('realm');if(op==='voice'||op==='video'){if(!residentCall)residentCall=new ResidentCallBridge({runtime,onLog:log});residentCall.start(op).catch(err=>toast(err.message,true));}});
$('res-save-profile').onclick=()=>saveResonanceProfile().catch(e=>$('res-profile-status').textContent=e.message);

$('res-create-project').onclick=async()=>{try{if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}const pair=resonanceState.pair;if(!pair)throw Error('Save your origin profile first.');await socialStore.createProject({title:$('res-project-title').value,description:$('res-project-desc').value,ownerId:pair.humanId});broadcastSocialUpdate();$('res-project-title').value='';$('res-project-desc').value='';await renderNetwork();log('Created a real local Resonance project');}catch(e){toast(e.message,true);}};
$('res-create-opening').onclick=async()=>{try{if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}const pair=resonanceState.pair;if(!pair)throw Error('Save your origin profile first.');const val=id=>$(id).value.trim();await socialStore.createOpening({title:val('res-opening-title'),description:val('res-opening-desc'),projectId:val('res-project-select')||null,creatorId:pair.humanId,requirements:{gate:val('res-req-gate'),line:val('res-req-line'),color:val('res-req-color'),tone:val('res-req-tone'),base:val('res-req-base')}});broadcastSocialUpdate();for(const id of ['res-opening-title','res-opening-desc','res-req-gate','res-req-line','res-req-color','res-req-tone','res-req-base'])$(id).value='';await renderNetwork();log('Created a structurally qualified open position');}catch(e){toast(e.message,true);}};
$('res-opening-list').onclick=async e=>{const b=e.target.closest('[data-opening-action]');if(!b||!socialStore)return;try{const pair=resonanceState.pair,profile=resonanceState.calculated;if(!pair||!profile)throw Error('Save your origin profile first.');if(b.dataset.openingAction==='join')await socialStore.joinHuman(b.dataset.openingId,pair.humanId,profile);if(b.dataset.openingAction==='invite')await socialStore.inviteIsohuman(b.dataset.openingId,pair.isoId,profile,pair.humanId);broadcastSocialUpdate();await renderNetwork();}catch(err){toast(err.message,true);}};
$('res-export-network').onclick=async()=>{if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}download('Resonance-Network-Packet.json',JSON.stringify(socialStore.exportPacket(),null,2),'application/json');};
$('res-import-network').onclick=()=>$('res-network-file').click();
$('res-network-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(!socialStore){socialStore=new ResonanceSocialStore(runtime);await socialStore.load();}await socialStore.importPacket(JSON.parse(await f.text()));await renderNetwork();log('Imported a user-owned Resonance network packet');}catch(err){toast(err.message,true);}finally{e.target.value='';}};
$('res-connect-peers').onclick=async()=>{try{$('res-connect-peers').disabled=true;await ensurePeerNetwork(true);renderPeerNetwork();log('Resonance peer discovery started');}catch(e){toast(e.message,true);}finally{$('res-connect-peers').disabled=false;}};
$('res-disconnect-peers').onclick=()=>{peerNetwork?.disconnect();renderPeerNetwork();log('Resonance peer network disconnected');};
$('res-share-peers').onclick=async()=>{try{const p=await ensurePeerNetwork(false);const n=p.broadcastPacket();toast(n?`Shared current social packet with ${n} peer${n===1?'':'s'}.`:'No direct peer channel is open yet.');}catch(e){toast(e.message,true);}};
$('res-dm-peer').onchange=()=>renderPeerNetwork();
$('res-dm-form').onsubmit=async e=>{e.preventDefault();try{const p=await ensurePeerNetwork(false),peerId=$('res-dm-peer').value,text=$('res-dm-input').value.trim();if(!peerId)throw Error('Connect to a peer first.');await p.sendDirect(peerId,text,resonanceState.pair?.humanId||null);$('res-dm-input').value='';renderPeerNetwork();}catch(err){toast(err.message,true);}};

$('res-threshold').oninput=e=>{$('res-threshold-value').textContent=e.target.value+'%';};
$('res-threshold').onchange=async e=>{resonanceState.threshold=Number(e.target.value)/100;await runtime.store.put('resonance:autonomy',{threshold:resonanceState.threshold});};
$('res-run-work').onclick=async()=>{try{$('res-run-work').disabled=true;await enqueueResonanceWork();}catch(e){toast(e.message,true);}finally{$('res-run-work').disabled=false;}};

$('theme').onchange=async()=>{$('desktop').dataset.theme=$('theme').value;await runtime.store.put('desktop:theme',$('theme').value);};$('toggle-hover').onclick=()=>{$('hover-planet').hidden=!$('hover-planet').hidden;hoverMenu();};
$('backup').onclick=async()=>{try{const keys=['desktop:tasks','desktop:apps','desktop:messages','desktop:workspace','desktop:theme'];const desktop={};for(const k of keys)desktop[k]=await runtime.store.get(k);const backup={schema:'synthia.desktop.backup.v1',desktop,computer:runtime.computer.state.snapshot(),journal:runtime.computer.foundation.export()};download('Synthia-Desktop-Backup.json',JSON.stringify(backup));$('backup-result').textContent='Backup downloaded. It contains your files, tasks, chat, and execution history.';}catch(e){$('backup-result').textContent=e.message;}};
$('restore-open').onclick=()=>$('restore-input').click();$('restore-input').onchange=async e=>{try{
 const f=e.target.files[0];if(!f)return;const b=JSON.parse(await f.text());if(b.schema!=='synthia.desktop.backup.v1'||!b.computer||!Array.isArray(b.journal?.entries))throw Error('Choose a Synthia Desktop backup.');
 const imported=[];const appMap=new Map();
 for(const p of Object.values(b.computer.projects?.items??{})){
  const project=await runtime.computer.projects.create({name:p.name+' · restored',description:p.description??''});
  for(const file of Object.values(p.files??{})){
   const record=b.computer.vfs?.[encodeURIComponent(file.vfsPath)];if(!record)continue;
   await runtime.computer.projects.writeFile(project.id,file.path,record.content,{type:file.type});
   imported.push({projectId:project.id,path:file.path});
   appMap.set(file.path,{projectId:project.id,path:file.path});
  }
 }
 for(const task of b.desktop?.['desktop:tasks']??[])runtime.tasks.push({...task,id:crypto.randomUUID(),status:task.status==='running'?'interrupted':task.status});
 await runtime.store.put('desktop:tasks',runtime.tasks);
 for(const app of b.desktop?.['desktop:apps']??[]){const f=appMap.get(app.path);if(f)runtime.installed.push({...app,id:'restore:'+crypto.randomUUID(),projectId:f.projectId});}
 await runtime.store.put('desktop:apps',runtime.installed);
 runtime.messages.push(...(b.desktop?.['desktop:messages']??[]));runtime.messages=runtime.messages.slice(-100);await runtime.store.put('desktop:messages',runtime.messages);
 await runtime.store.put('desktop:imported-history:'+Date.now(),b.journal);
 $('backup-result').textContent='Imported '+imported.length+' files, tasks, apps, and chat. Existing history is preserved; the backed-up execution history is retained as an imported record.';startApps();renderChat();log('Imported desktop backup without replaying its executable actions');
 }catch(err){$('backup-result').textContent=err.message;}e.target.value='';};
try{
 runtime=await new DesktopRuntime({navigate:show}).boot();globalThis.SynthAIComputer=runtime.computer;globalThis.SynthiaDesktop=runtime;socialStore=new ResonanceSocialStore(runtime);await socialStore.load();await loadResonanceState();await resumeResidentLife();startResidentLife();
addEventListener('resonance:peer-packet',()=>{renderNetwork().catch(()=>{});log('Received a live Resonance social packet from a peer');});
 const storage=await runtime.store.audit();$('runtime-status').textContent='Synthia local · resident awake';$('hover-dot').classList.add('ready');$('storage-status').textContent=storage.durable?'Saved on this device · '+storage.mode:'Memory session · download a backup before closing.';
 const theme=await runtime.store.get('desktop:theme')??'aurora';$('desktop').dataset.theme=theme;$('theme').value=theme;renderChat();startApps();log('Local Computer started; resident life loop, executable app launchers and hands mounted');
}catch(e){$('runtime-status').textContent='Startup failed: '+e.message;toast('Synthia could not start: '+e.message,true);console.error(e);}
