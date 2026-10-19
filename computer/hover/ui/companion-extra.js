// SYNTHAI CONTINUITY phone-first services; no decorative-only actions.
const E=id=>document.getElementById(id);
const KEY='synthia-companion-key';
let selectedRepo=null;
let sourceSha=null;
let lastItems=[];
let currentCategory='all';
let selectedOnly=false;
const getKey=()=>sessionStorage.getItem(KEY)||'';
const show=(message,error=false)=>{const box=E('banner');if(box){box.textContent=String(message);box.className='banner '+(error?'error':'success');}};
async function request(path,{method='GET',body=null,raw=false,asBlob=false}={}) {
  const key=getKey();
  if(!/^[a-f0-9]{64}$/.test(key))throw Error('Unlock SYNTHAI CONTINUITY with the access key first');
  const headers={'x-synthia-access-key':key};
  if(body!==null&&!raw)headers['content-type']='application/json';
  const res=await fetch(path,{method,headers,body:body==null?undefined:raw?body:JSON.stringify(body)});
  if(!res.ok){
    const details=await res.json().catch(()=>({}));
    throw Error(details.error||'Request failed, HTTP '+res.status);
  }
  return asBlob?res.blob():res.json();
}
async function call(path,opts) {try{return await request(path,opts);}catch(err){show(err.message,true);throw err;}}
function bind(id,event,fn) {const el=E(id);if(!el)throw Error('Missing UI control #'+id);el.addEventListener(event,fn);}
function el(tag,className,content) {
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(content!==undefined)node.textContent=String(content);
  return node;
}
function makeButton(name,onclick,{secondary=false}={}) {
  const node=el('button',secondary?'secondary':'',name);
  node.type='button';
  node.addEventListener('click',async()=>{node.disabled=true;try{await onclick();}catch(err){show(err.message,true);}finally{node.disabled=false;}});
  return node;
}
function setStatus(id,text) {const node=E(id);if(node)node.textContent=text;}
function option(select,value,label) {
  const node=document.createElement('option');node.value=value;node.textContent=label;
  select.appendChild(node);
}
function page(name) {
  document.querySelectorAll('.page').forEach(node=>node.classList.toggle('visible',node.id==='page-'+name));
  document.querySelectorAll('[data-page]').forEach(node=>node.classList.toggle('active',node.dataset.page===name));
}
document.querySelectorAll('[data-go-page]').forEach(button=>button.addEventListener('click',()=>page(button.dataset.goPage)));
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{
  if(button.dataset.page==='library')loadLibrary().catch(err=>show(err.message,true));
  if(button.dataset.page==='services') {loadWatched().catch(err=>show(err.message,true));loadTasks().catch(()=>{});}
}));
bind('open-prism-from-library','click',()=>page('prism'));
bind('upload-form','submit',async event=>{
  event.preventDefault();
  const files=[...E('upload-files').files],project=E('upload-project').value||null;
  if(!files.length)return show('Choose real files using the Android picker.',true);
  const send=event.currentTarget.querySelector('button[type=submit]');
  send.disabled=true;
  try {
    for(const [i,file] of files.entries()) {
      if(file.size>200*1024*1024)throw Error(file.name+' exceeds 200 MB');
      setStatus('upload-progress','Addressing '+(i+1)+'/'+files.length+': '+file.name);
      const start=await request('/api/companion/library/start',{method:'POST',body:{
        name:file.name,size:file.size,mime:file.type||'application/octet-stream',
        project,originalSource:'android-document-picker'
      }});
      let offset=0;
      while(offset<file.size) {
        const chunk=file.slice(offset,offset+start.chunkSize);
        const next=await request('/api/companion/library/chunk?uploadId='+encodeURIComponent(start.uploadId),
          {method:'POST',raw:true,body:chunk});
        offset=next.offset;
        setStatus('upload-progress',file.name+': '+Math.round(offset/file.size*100)+'%');
      }
      const saved=await request('/api/companion/library/complete',{method:'POST',body:{uploadId:start.uploadId}});
      setStatus('upload-progress','Saved '+file.name+' · '+saved.artifact.address);
    }
    E('upload-files').value='';
    show('Imported originals with content addresses and receipts.');
    await loadLibrary();
  }catch(err){show('Upload not finished: '+err.message,true);}
  finally{send.disabled=false;}
});
function artifactRows(items) {
  const root=E('artifact-items');root.replaceChildren();
  const display=selectedOnly?items.filter(x=>x.starred):items;
  if(!display.length)return root.appendChild(el('p','muted','No matching addressed files. Choose files above.'));
  for(const item of display) {
    const card=el('div','app-item');
    card.appendChild(el('strong','',item.name+' · '+item.kind));
    card.appendChild(el('small','',item.address+' · '+(item.project||'Unassigned')));
    card.appendChild(el('small','',item.purpose||'Purpose not recorded'));
    card.appendChild(el('small','',item.includeInBuild?'Selected for build · '+item.verification:'Not in a build'));
    const buttons=el('div','actions');
    buttons.appendChild(makeButton(item.starred?'★ Starred':'☆ Star',async()=>{
      await request('/api/companion/library/update',{method:'POST',body:{address:item.address,starred:!item.starred}});await loadLibrary();
    }));
    buttons.appendChild(makeButton('Classify / build',async()=>{
      const project=prompt('What app does this file belong to? (GitHub owner/repo)',item.project||'');
      if(project===null)return;
      const purpose=prompt('What is this exact file for?',item.purpose||'');
      if(purpose===null)return;
      const includeInBuild=confirm('Flag this exact original for a future build? This does not compile or run it.');
      await request('/api/companion/library/update',{method:'POST',body:{
        address:item.address,project:project.trim()||null,purpose,includeInBuild
      }});await loadLibrary();
    },{secondary:true}));
    if(item.kind==='web'&&/\.html?$/i.test(item.name)&&item.size<=1024*1024) {
      buttons.appendChild(makeButton('▶ Run isolated HTML',async()=>{
        const req=await fetch('/api/companion/library/preview?address='+encodeURIComponent(item.address),
          {headers:{'x-synthia-access-key':getKey()}});
        if(!req.ok)throw Error((await req.json().catch(()=>({}))).error||'Preview denied');
        const html=await req.text();
        const old=card.querySelector('iframe');if(old)old.remove();
        const frame=el('iframe');frame.setAttribute('sandbox','allow-scripts');
        frame.style.cssText='width:100%;height:350px;border:1px solid #50496b;border-radius:12px';
        frame.srcdoc=html;card.appendChild(frame);
      }));
    }
    buttons.appendChild(makeButton('↓ Original',async()=>{
      await download('/api/companion/library/download?address='+encodeURIComponent(item.address),item.name);
    },{secondary:true}));
    card.appendChild(buttons);root.appendChild(card);
  }
}
async function download(path,name) {
  const blob=await request(path,{asBlob:true});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function loadLibrary() {
  const response=await request('/api/companion/library');
  lastItems=response.items||[];
  artifactRows(lastItems);
  const select=E('review-artifact'),prev=select.value;
  select.replaceChildren();option(select,'','Choose imported transcript…');
  for(const f of lastItems.filter(x=>['document','data','source'].includes(x.kind)&&x.size<=2000000))option(select,f.address,f.name);
  select.value=prev;
}
bind('library-refresh','click',()=>loadLibrary().catch(err=>show(err.message,true)));
bind('library-starred','click',()=>{selectedOnly=!selectedOnly;E('library-starred').textContent=selectedOnly?'Show all':'Show starred';artifactRows(lastItems);});
function renderReview(review) {
  setStatus('review-summary',review.messageCount+' messages examined · '+review.findings.length+
    ' grounded observations · '+review.solutions.length+' solution candidates. Not proof of completion.');
  const box=E('review-results');box.replaceChildren();
  for(const item of review.solutions) {
    const card=el('div','app-item');
    card.appendChild(el('strong','',item.title));
    card.appendChild(el('small','',item.proposedApproach));
    const evidence=(item.evidence||[]).slice(0,3).map(x=>x.quote+' [source '+x.sourceId+']').join('\n');
    card.appendChild(el('small','',evidence));
    card.appendChild(makeButton('Turn into proposed task',async()=>{
      await request('/api/companion/tasks/new',{method:'POST',body:{title:item.title,
        description:item.proposedApproach+'\nEvidence: '+evidence,
        repository:selectedRepo,source:'conversation'}});
      show('Proposed task saved for review, not executed.');await loadTasks();
    }));
    box.appendChild(card);
  }
}
bind('review-form','submit',async event=>{
  event.preventDefault();
  try {
    const content=E('review-text').value.trim();if(!content)return show('Paste an actual transcript first.',true);
    const result=await call('/api/companion/learn/text',{method:'POST',body:{content,name:'pasted-conversation'}});
    renderReview(result.review);
  }catch {}
});
bind('review-from-library','click',async()=>{
  try{const address=E('review-artifact').value;if(!address)throw Error('Choose an imported transcript first');
    renderReview((await call('/api/companion/learn/artifact',{method:'POST',body:{address}})).review);}
  catch(e){show(e.message,true);}
});
bind('review-status','click',async()=>{
  try{const out=await call('/api/companion/learn/status');setStatus('review-summary',JSON.stringify(out.learning));}
  catch{}
});
let cachedRepos=[],watched=[];
async function loadWatched() {
  const response=await request('/api/companion/repos/watched');
  watched=response.watched||[];
  const select=E('upload-project'),prev=select.value;
  select.replaceChildren();option(select,'','Unassigned inbox — decide later');
  for(const entry of watched)option(select,entry.repository,entry.repository);
  select.value=prev;
  setStatus('repo-service-status',watched.length+' selected projects');
}
function repoCards() {
  const box=E('repo-browser');box.replaceChildren();
  const contexts=window.__projectContexts||{};
  const filtered=cachedRepos.filter(r=>currentCategory==='all'||
    (contexts[r.full_name]?.category||'unclassified')===currentCategory);
  if(!filtered.length)return box.appendChild(el('p','muted','No repositories in this category yet. Categories only appear as you classify real apps.'));
  for(const repo of filtered) {
    const wrapper=el('div','app-item');
    const c=contexts[repo.full_name];
    wrapper.appendChild(el('strong','',repo.full_name));
    wrapper.appendChild(el('small','',((c?.category)||'Unclassified')+
      ' · '+(c?.progress?.percent??'?')+'% verified goals · '+(repo.private?'Private':'Public')));
    wrapper.appendChild(el('small','',c?.purpose||repo.description||'Purpose not recorded'));
    const row=el('div','actions');
    if(!watched.some(e=>e.repository===repo.full_name)) {
      row.appendChild(makeButton('＋ Track',async()=>{
        await request('/api/companion/repos/select',{method:'POST',body:{repository:repo.full_name,enabled:true}});
        await loadWatched();await loadBrowse();
      }));
    } else {
      row.appendChild(makeButton('Open goals & builds',async()=>{
        selectedRepo=repo.full_name;await inspectRepo();
      }));
    }
    wrapper.appendChild(row);box.appendChild(wrapper);
  }
}
async function loadBrowse() {
  await loadWatched();
  const context=await request('/api/companion/repos/watched');
  window.__projectContexts=context.contexts||{};
  const pageNo=Number(E('repo-page').value||1);
  const response=await request('/api/companion/repos?page='+pageNo);
  cachedRepos=response.repositories||[];
  repoCards();
  setStatus('repo-service-status',cachedRepos.length+' GitHub repositories loaded · '+watched.length+' tracked');
}
bind('repo-list','click',()=>loadBrowse().catch(e=>show(e.message,true)));
bind('repo-page','change',()=>loadBrowse().catch(e=>show(e.message,true)));
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{
  currentCategory=b.dataset.category;document.querySelectorAll('[data-category]').forEach(x=>x.classList.toggle('active',x===b));
  repoCards();
}));
bind('repo-refresh','click',async()=>{
  try{const out=await call('/api/companion/repos/refresh',{method:'POST',body:{}});
  show('Inspected '+out.checked+' sources. New changes: '+out.changes+'.');await loadWatched();}
  catch{}
});
function setAnchor(id,href) {
  const link=E(id);
  if(/^https:\/\/\S+$/.test(href||'')) {link.href=href;link.hidden=false;}
  else link.hidden=true;
}
function progress(project) {
  setStatus('context-progress',project?.progress?.percent==null?'Progress unassessed':
    project.progress.percent+'% verified ('+project.progress.completed+'/'+project.progress.total+' goals)');
  setStatus('context-goal-status',project?.progress?.note||'Define explicit milestones with test evidence.');
}
const fields=[['purpose','context-purpose'],['whatExists','context-exists'],['whatWorks','context-works'],
  ['whatIsMissing','context-missing'],['nextTask','context-next'],['notes','context-notes'],
  ['releaseCriteria','context-release'],['androidPackageName','context-android-package']];
let activeRepo=null,activeSource=null;
async function inspectRepo() {
  if(!selectedRepo)return;
  const data=await request('/api/companion/repos/inspect?repository='+encodeURIComponent(selectedRepo));
  activeRepo=data;
  E('repo-detail').hidden=false;
  E('repo-name').textContent=selectedRepo;
  setStatus('repo-selected-label',selectedRepo+' · '+(data.context?.purpose||'Purpose not yet recorded'));
  setAnchor('repo-open',data.repository.html_url);
  setStatus('repo-description',data.repository.description||'');
  setStatus('repo-branch','Source branch: '+data.watched.branch+' · HEAD '+data.watched.head);
  setAnchor('repo-preview',data.repository.homepage);
  E('repo-preview').textContent='Open published site (external)';
  for(const [key,id] of fields)E(id).value=data.context?.[key]||'';
  E('context-category').value=data.context?.category||'unclassified';
  E('context-decision').value=data.context?.decision||'active';
  E('context-milestones').value=(data.context?.milestones||[]).map(x=>[x.name,x.status,x.evidence||''].join(' | ')).join('\n');
  progress(data.context);
  await installedRun(data.context);
  function records(boxId,items,render) {
    const box=E(boxId);box.replaceChildren();
    if(!items.length)box.append(el('p','muted','None available for this repository yet.'));
    for(const item of items)box.append(render(item));
  }
  records('repo-commits',data.commits||[],c=>{
    const block=el('div','app-item');
    block.appendChild(el('strong','',c.message.split('\n')[0]));
    block.appendChild(el('small','',c.sha.slice(0,10)+' · '+(c.date||'date unavailable')));
    if(c.html_url){const a=el('a','', 'See source commit');a.href=c.html_url;a.target='_blank';a.rel='noopener';block.append(a);}
    return block;
  });
  records('repo-runs',data.runs||[],r=>{
    const block=el('div','app-item');
    block.appendChild(el('strong','',r.name+' · '+r.status+' / '+(r.conclusion||'in progress')));
    block.appendChild(el('small','',r.branch+' · '+(r.created_at||'date unavailable')));
    if(r.html_url){const a=el('a','','Open real GitHub run');a.href=r.html_url;a.target='_blank';a.rel='noopener';block.append(a);}
    return block;
  });
  records('repo-artifacts',data.artifacts||[],a=>{
    const block=el('div','app-item');
    block.appendChild(el('strong','',a.name));
    block.appendChild(el('small','',Math.round(a.size_in_bytes/1024)+' KB · '+a.created_at));
    block.append(makeButton('↓ Download actual build ZIP',async()=>{
      await download('/api/companion/repos/download?repository='+encodeURIComponent(selectedRepo)+'&artifact='+a.id,a.name+'.zip');
    }));
    return block;
  });
  const choose=E('repo-workflow');choose.replaceChildren();
  for(const w of data.workflows||[])option(choose,String(w.id),w.name+' · '+w.path);
  if(!(data.workflows||[]).length)option(choose,'','No active GitHub Actions workflow');
  E('new-task-project').value=selectedRepo;
}
async function installedRun(context) {
  const box=E('repo-execute');box.replaceChildren();
  box.append(el('strong','','Executable preview'));
  const packageName=context?.androidPackageName;
  if(!packageName)return box.append(el('small','','No Android package ID assigned. Downloads are not proof an app is installed.'));
  try {
    const installed=await request('/api/companion/apps');
    const found=installed.apps.find(x=>x.packageName===packageName);
    if(!found)return box.append(el('small','','Not installed on this phone: '+packageName+'. Download/install a real APK first.'));
    box.append(el('small','','Verified installed: '+(found.label||packageName)));
    box.append(makeButton('▶ Run installed app',async()=>{
      if(!confirm('Open '+packageName+' in Android now?'))return;
      const result=await request('/api/companion/apps/launch',{method:'POST',body:{packageName}});
      show(result.launched?'Android launch accepted; use the app normally.':'Launch not confirmed');
    }));
  }catch(e){box.append(el('small','','Cannot verify installed app: '+e.message));}
}
bind('repo-recheck','click',()=>inspectRepo().catch(e=>show(e.message,true)));
bind('repo-unwatch','click',async()=>{
  if(!selectedRepo||!confirm('Stop tracking '+selectedRepo+'? Existing records remain intact.'))return;
  try{await request('/api/companion/repos/select',{method:'POST',body:{repository:selectedRepo,enabled:false}});
  E('repo-detail').hidden=true;selectedRepo=null;await loadBrowse();}catch(e){show(e.message,true);}
});
bind('project-context-form','submit',async event=>{
  event.preventDefault();if(!selectedRepo)return;
  try {
    const data={repository:selectedRepo,category:E('context-category').value,decision:E('context-decision').value};
    for(const [key,id] of fields)data[key]=E(id).value;
    data.milestones=E('context-milestones').value.split(/\r?\n/).filter(x=>x.trim()).map(line=>{
      const [name,status,evidence]=line.split('|');return {name:name.trim(),status:(status||'todo').trim(),evidence:(evidence||'').trim()};
    });
    const result=await request('/api/companion/repos/context',{method:'POST',body:data});
    progress(result.context);setStatus('context-receipt','Saved purpose, goals and category · continuity entry #'+result.context.receipt.seq);
    show('Project context saved. Previous revisions remain in the ledger.');
  }catch(e){show(e.message,true);}
});
bind('repo-build-form','submit',async event=>{
  event.preventDefault();if(!selectedRepo)return;
  if(!confirm('Run the selected existing GitHub workflow for '+selectedRepo+'?'))return;
  try {
    const out=await request('/api/companion/repos/dispatch',{method:'POST',body:{
      repository:selectedRepo,workflow:Number(E('repo-workflow').value)
    }});
    show('GitHub accepted workflow dispatch. Refresh to inspect actual results.');
  }catch(e){show(e.message,true);}
});
bind('edit-source-open','click',async()=>{
  if(!selectedRepo)return show('Select a repository first.',true);
  try {
    const path=E('edit-source-path').value.trim();
    const result=await request('/api/companion/repos/source?repository='+encodeURIComponent(selectedRepo)+
      '&path='+encodeURIComponent(path));
    activeSource=result.source;
    E('edit-source-text').value=result.source.content;
    setStatus('edit-source-sha','Original '+result.source.sha+' · '+result.source.branch);
    show('Loaded exact source. Any saved edit goes onto a new branch.');
  }catch(e){show(e.message,true);}
});
bind('edit-source-save','click',async()=>{
  if(!selectedRepo||!activeSource)return show('Open a real file first.',true);
  const content=E('edit-source-text').value;
  if(content===activeSource.content)return show('No source changes to save.');
  if(!confirm('Commit a revision of '+activeSource.path+' on a NEW GitHub branch? Nothing is merged or installed.'))return;
  try {
    const result=await request('/api/companion/repos/edit',{method:'POST',body:{
      repository:selectedRepo,path:activeSource.path,expectedSha:activeSource.sha,
      content,message:'Continuity: edit '+activeSource.path
    }});
    const link=E('edit-source-status');link.replaceChildren();
    link.append('New branch: '+result.branch+' · ');
    const a=el('a','','Review changes on GitHub');a.href=result.compareUrl;a.target='_blank';a.rel='noopener';link.append(a);
    show('Committed actual source revision; working default branch preserved.');
    activeSource=null;
  }catch(e){show(e.message,true);}
});
async function loadPhoneReport(force=false) {
  const output=await request(force?'/api/companion/phone/sweep':'/api/companion/phone/inventory',
    force?{method:'POST',body:{}}:{});
  const asArray=x=>Array.isArray(x)?x:[];
  setStatus('phone-sweep-status',output.checkedAt?
    'Last device scan: '+new Date(output.checkedAt).toLocaleString()+' · '+output.count+' visible launchable apps':
    output.note||'No device scan yet');
  const target=E('phone-sweep-changes');target.replaceChildren();
  if(output.baseline)return target.append(el('p','muted','Initial inventory saved. Future scans can compare new apps and version changes.'));
  for(const [name,list] of [['Installed',asArray(output.added)],['Updated',asArray(output.updated)],['Removed',asArray(output.removed)]]) {
    for(const app of list)target.append(el('p','muted',name+': '+(app.label||app.packageName)+
      (app.toVersion?' → '+app.toVersion:'')));
  }
}
bind('phone-sweep','click',()=>loadPhoneReport(true).catch(err=>show(err.message,true)));
function taskRows(data) {
  const box=E('task-list');box.replaceChildren();
  const auto=data.automation||{};
  E('task-auto').checked=auto.enabled!==false;
  setStatus('task-automation-status',(auto.lastSweep?'Last sweep '+auto.lastSweep+'. ':'No completed sweep recorded. ')+auto.policy);
  if(!(data.tasks||[]).length)box.append(el('p','muted','No tasks yet. Use the goal audit or add your own.'));
  for(const t of data.tasks||[]) {
    const block=el('div','app-item');
    block.append(el('strong','',t.title+' · '+t.status));
    block.append(el('small','',(t.repository||'Shared system')+' · '+t.source+' · '+t.type));
    block.append(el('small','',t.description||''));
    if(t.result)block.append(el('small','',JSON.stringify(t.result).slice(0,700)));
    if(!['done','canceled'].includes(t.status)) {
      const controls=el('div','actions');
      controls.append(makeButton('Mark blocked',()=>changeTask(t.id,'blocked')));
      controls.append(makeButton('Mark done with evidence',async()=>{
        const evidence=prompt('Exact build, test or verification receipt (required):');
        if(!evidence?.trim())return;await changeTask(t.id,'done',evidence);
      },{secondary:true}));
      if(['audit','repo-refresh'].includes(t.type))
        controls.append(makeButton('Queue read-only check',()=>changeTask(t.id,'queued')));
      block.append(controls);
    }
    box.append(block);
  }
}
async function changeTask(id,status,evidence='') {
  await request('/api/companion/tasks/status',{method:'POST',body:{id,status,evidence}});
  await loadTasks();
}
async function loadTasks() {
  taskRows(await request('/api/companion/tasks'));
}
bind('task-refresh','click',()=>loadTasks().catch(err=>show(err.message,true)));
bind('task-audit','click',async()=>{
  try{const result=await call('/api/companion/tasks/audit',{method:'POST',body:{}});
    show('Audited goals: '+result.observed+' gaps; '+result.newTasks+' new proposed tasks.');await loadTasks();}
  catch{}
});
bind('task-sweep','click',async()=>{
  try{const result=await call('/api/companion/tasks/sweep',{method:'POST',body:{force:true}});
    show(result.ran?'Safe sweep recorded '+result.created+' new tasks.':result.reason);await loadTasks();}
  catch{}
});
bind('task-gates','click',async()=>{
  try{await call('/api/companion/tasks/gate-backlog',{method:'POST',body:{}});show('Future Gate study recorded, without invented mappings.');await loadTasks();}
  catch{}
});
bind('task-auto','change',async event=>{
  try {
    const response=await request('/api/companion/tasks/auto',{method:'POST',body:{enabled:event.target.checked}});
    setStatus('task-automation-status',response.automation.policy);
    show('Read-only automatic checks '+(event.target.checked?'enabled':'disabled'));
  }catch(e){show(e.message,true);event.target.checked=!event.target.checked;}
});
bind('new-task-form','submit',async event=>{
  event.preventDefault();
  try{const title=E('new-task-title').value.trim();if(!title)return;
    await request('/api/companion/tasks/new',{method:'POST',body:{
      title,description:E('new-task-description').value,repository:E('new-task-project').value||null,source:'human',type:'manual'
    }});
    E('new-task-title').value='';E('new-task-description').value='';
    show('Task added to durable backlog.');await loadTasks();
  }catch(e){show(e.message,true);}
});
window.addEventListener('load',()=>{
  // The normal Continuity screen remains usable even with no GitHub connection.
  if(getKey()){loadLibrary().catch(()=>{});loadWatched().catch(()=>{});}
});
