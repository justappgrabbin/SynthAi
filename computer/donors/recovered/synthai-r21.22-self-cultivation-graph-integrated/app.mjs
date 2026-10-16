import SynthiaUnit from './core/SynthiaUnit.mjs';
import KnowledgeVault from './browser/KnowledgeVault.mjs';
import ValidatedLearningStore from './browser/ValidatedLearningStore.mjs';
import LearningMesh from './browser/LearningMesh.mjs';
import MCPChairClient from './browser/MCPChairClient.mjs';
import LivingWorldView from './browser/LivingWorldView.mjs';
import OrganismExpression from './browser/OrganismExpression.mjs';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const unit=new SynthiaUnit({residence:{approved:true,address:null,addressComplete:false,provenance:[{type:'local-test-runtime',at:Date.now()}]},mode:localStorage.getItem('synthia.mode')||'complement'});
const vault=new KnowledgeVault(), validated=new ValidatedLearningStore(), mesh=new LearningMesh({unit}), chair=new MCPChairClient();
const livingWorld=new LivingWorldView({root:document.querySelector('#livingWorld'),unit});
const organismExpression=new OrganismExpression({unit,root:document,worldView:livingWorld});
globalThis.SynthiaExpression=organismExpression;
globalThis.Synthia=unit;globalThis.SynthiaCultivation=unit.cultivationProgram;globalThis.SynthiaKnowledge=vault;globalThis.SynthiaMCP=chair;globalThis.SynthiaEmergence=unit.emergence;

function setStatus(t){$('#status').textContent=t}
function selectTab(name){$$('[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===name));$$('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));if(name==='world')renderWorld();if(name==='learn')renderLearning();if(name==='system')renderSystem();}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
function log(who,text){const d=document.createElement('div');d.className='msg '+who;d.innerHTML=`<b>${who==='you'?'YOU':'SYNTHIA'}</b><div>${esc(text)}</div>`;$('#chat').append(d);d.scrollIntoView({block:'end'});}
function relevantKnowledge(text){return Promise.all([vault.search(text,{limit:4}),validated.claims(40)]).then(([chunks,claims])=>{const ts=text.toLowerCase().split(/\W+/).filter(x=>x.length>3);return [...chunks,...claims.filter(c=>ts.some(t=>String(c.text||'').toLowerCase().includes(t))).slice(0,4).map(c=>({source:'validated-claim',text:c.text,claimId:c.id}))]});}

function projectionHTML(c){if(!c)return '<div class="notice">No active cultivation cycle yet.</div>';const order=['Who','What','Where','When','Why'];const question=c.inquiry?.question||c.next?.text||'Cycle integrated.';return `<div class="cycle-stage">${['awareness','orientation','cultivation','action','integration'].map(s=>`<span class="stage ${s===c.stage?'on':''}">${s}</span>`).join('')}</div><div class="actionbox section"><strong>${c.inquiry?.question?'Synthia is asking':'Current move'}</strong><div>${esc(question)}</div></div><details class="card section"><summary>Inspect how Synthia is reading this</summary><div class="grid section">${order.map(k=>`<div class="dimension"><strong>${k} · ${esc(c.projection[k].dimension)}</strong><b>${esc(c.projection[k].value)}</b></div>`).join('')}</div><div class="section"><strong>HOW · integration</strong><p>${esc(c.how.statement)}</p><div class="toolchips">${c.route.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div></div></details>${c.status==='active'?`<div class="row section"><button class="btn primary" id="doNext">Do the next move</button><button class="btn good" id="worked">That helped</button><button class="btn bad" id="failed">That did not work</button><button class="btn" id="integrate">Integrate / close</button></div>`:`<div class="notice section">Integrated. Start another cycle when reality changes.</div>`}`;}
function renderCycle(c=unit.cultivationProgram.current()){$('#cycleView').innerHTML=projectionHTML(c);if(!c)return;$('#doNext')?.addEventListener('click',()=>actCycle(c.id));$('#worked')?.addEventListener('click',()=>observeCycle(c.id,true));$('#failed')?.addEventListener('click',()=>observeCycle(c.id,false));$('#integrate')?.addEventListener('click',()=>integrateCycle(c.id));}
$('#startCycle').addEventListener('click',()=>{try{const goal=$('#goal').value.trim(),context=$('#context').value.trim();const c=unit.createCultivationCycle({goal,context,purpose:null});renderCycle(c);organismExpression.apply(goal);setStatus('cultivation cycle active');}catch(e){setStatus(e.message)}});
$('#resumeCycle').addEventListener('click',()=>{const c=unit.cultivationProgram.current();renderCycle(c);setStatus(c?'current cycle restored':'no active cycle')});
function renderSelfCultivationResult(result){
  const chart=result.chart, gates=chart?.humanDesign?.gates||[];
  $('#chartStatus').textContent=`Chart ${chart.chartId} calculated · ${chart.astrology.placements.length} astrology placements · ${gates.length} Human Design gates · outcome ${result.hypothesisResult?.status||'recorded'}`;
  $('#chartOutput').innerHTML=`<div class="grid section"><div class="dimension"><strong>Astrology</strong><b>${esc(chart.birth.timestamp)}</b><span>${esc(chart.birth.location.label||'location')} · ${chart.birth.location.latitude}, ${chart.birth.location.longitude}</span></div><div class="dimension"><strong>Human Design coordinates</strong><b>${esc(gates.join(' · '))}</b><span>personality ${esc((chart.humanDesign.personalityGates||[]).join(', '))} · design ${esc((chart.humanDesign.designGates||[]).join(', '))}</span></div><div class="dimension"><strong>Hypothesis</strong><b>${esc(result.hypothesis.hypothesis?.statement||result.hypothesis.statement)}</b><span>${esc(result.hypothesisResult.status)} · ${esc(result.confidenceRevision?.worked?'confidence increased from evidence':'confidence held for revision')}</span></div><div class="dimension"><strong>Cultivation action</strong><b>${esc(result.action.cycle?.lastResult?.instruction||result.action.cycle?.next?.text||'action recorded')}</b><span>persistent outcome: ${esc(result.cycle.evidence?.at?'yes':'recorded')}</span></div></div><details class="section"><summary>Klein tool outputs</summary><pre>${esc(JSON.stringify({autoling:result.klein.autoling,disseminer:result.klein.disseminer,research:result.klein.research},null,2))}</pre></details>`;
  $('#chartProvenance').textContent=JSON.stringify(result.provenance,null,2);
  renderCycle(result.cycle);renderResult(result.action.result,$('#workOutput'));renderWorld();
}
$('#runSelfCultivation').addEventListener('click',async()=>{
  const local=$('#birthDateTime').value.trim(),offset=$('#birthOffset').value.trim()||'+00:00',situation=$('#situation').value.trim();
  if(!local||!situation){$('#chartStatus').textContent='Birth date/time and a real situation are required.';return;}
  setStatus('calculating chart and cultivating through the mesh…');$('#runSelfCultivation').disabled=true;
  try{
    const result=await unit.runSelfCultivation({name:$('#birthName').value.trim(),birth:{timestamp:`${local}${offset}`,location:{label:$('#birthLocationLabel').value.trim(),latitude:Number($('#birthLatitude').value),longitude:Number($('#birthLongitude').value)}},situation,goal:$('#cultivationGoal').value.trim(),worked:true,actualOutcome:'The first cultivation action was completed and recorded from the user-provided outcome.'});
    renderSelfCultivationResult(result);log('synthia',`Chart ${result.chart.chartId} entered the GraphRuntime. AUTOLING and DISSEMINER processed the situation; a hypothesis, cultivation action, and persistent outcome were recorded.`);setStatus('self-cultivation vertical slice complete');
  }catch(e){$('#chartStatus').textContent=`Could not complete chart cultivation: ${e.message}`;setStatus('chart cultivation error');}
  finally{$('#runSelfCultivation').disabled=false;}
});

async function actCycle(id){setStatus('working through the organism…');try{const c=unit.cultivationProgram.get(id);const k=await relevantKnowledge(c.goal+' '+c.context);const {cycle,result}=await unit.actCultivationCycle(id,{knowledgeContext:k});renderCycle(cycle);renderResult(result,$('#workOutput'));log('synthia',summarizeResult(result));setStatus('real-world move prepared; observe what happens next');}catch(e){setStatus('cycle error: '+e.message)}}
function observeCycle(id,worked){const actual=prompt(worked?'What actually improved?':'What actually happened / where did it fail?','')||'';const evidence={source:'user-observation',statement:actual||String(worked),at:Date.now()};try{const c=unit.observeCultivationCycle(id,{worked,actualOutcome:actual,evidence,friction:worked?null:actual});renderCycle(c);renderWorld();setStatus(worked?'progress recorded from evidence':'friction recorded; organism can adapt from it')}catch(e){setStatus(e.message)}}
function integrateCycle(id){const summary=prompt('What are you carrying forward from this cycle?','')||'';try{renderCycle(unit.integrateCultivationCycle(id,{summary,evidence:{source:'user-integration',statement:summary,at:Date.now()}}));setStatus('cycle integrated')}catch(e){setStatus(e.message)}}

function renderCoDevelopment(e){
  const root=$('#coDevView');if(!root||!e)return;
  const q=['Who','What','Where','When','Why'];
  const rows=q.map(k=>{const x=e.claims?.[k]||{};return `<div class="claim"><b>${esc(k)} · ${esc(x.dimension||'')}</b><div>${esc(x.value??'unresolved')}</div><small class="muted">${esc(x.status||'unresolved')}</small></div>`}).join('');
  const active=(e.organism?.strongestProcesses||[]).map(x=>`G${x.gate}`).join(' · ');
  root.innerHTML=`<div class="grid">${rows}</div><div class="card section"><b>Synthia's current edge</b><p>${esc(e.question||e.candidate?.text||'No unresolved edge detected.')}</p><div class="muted">active processes: ${esc(active||'none')}</div></div><details><summary>Inspect this developmental episode</summary><pre>${esc(JSON.stringify(e,null,2))}</pre></details>`;
}
function summarizeResult(r){const texts=(r.outputs||[]).map(x=>x.out?.text||x.out?.reflection||x.out?.summary).filter(Boolean);if(texts.length)return texts.join('\n');return `Worked through: ${(r.route||[]).join(' → ')||'local process'}.`;}
function renderResult(r,el){if(!r){el.innerHTML='';return}const outputs=(r.outputs||[]).map(x=>`<details><summary>${esc(x.organ)} · ${x.out?.ok===false?'failed':'contributed'}</summary><pre>${esc(JSON.stringify(x.out,(k,v)=>v instanceof Blob?`[Blob ${v.type} ${v.size}]`:v,2))}</pre></details>`).join('');el.innerHTML=`<div class="card"><strong>Collective: ${(r.collective?.contributors||r.route||[]).map(esc).join(' → ')}</strong>${outputs}</div>`;}
async function send(){const text=$('#input').value.trim();if(!text)return;log('you',text);$('#input').value='';setStatus('thinking…');try{const dev=unit.coDevelop(text);renderCoDevelopment(dev);if(dev.upload?.status==='awaiting-local-artifact'){selectTab('learn');$('#ingestStatus').textContent='Ready for your upload. Synthia will keep it local, classify it, address it, learn it, and morph from the resulting organism state.';}const k=await relevantKnowledge(text);const r=await unit.ask(text,{knowledgeContext:k,coDevelopment:dev});const response=dev.upload?.status==='awaiting-local-artifact'?`Yes. Give me the upload. I will preserve it locally, classify it, address it, route it through the relevant processes, learn from it, and morph around what it actually is — without exporting your local identity.\n\n${dev.question||''}`.trim():(dev.question?`${dev.question}\n\n${summarizeResult(r)}`:summarizeResult(r));log('synthia',response);renderResult(r,$('#workOutput'));setStatus(`co-development · cycle ${r.cycle} · ${(r.route||[]).join(' + ')}`);organismExpression.apply(text);renderWorld();}catch(e){log('synthia','Error: '+e.message);setStatus('error')}}
$('#send').addEventListener('click',send);$('#input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});
$('#workRun').addEventListener('click',async()=>{const text=$('#workInput').value.trim();if(!text)return;setStatus('workshop running…');try{const k=await relevantKnowledge(text);const r=await unit.ask(text,{knowledgeContext:k});renderResult(r,$('#workOutput'));organismExpression.apply(text);setStatus('workshop complete')}catch(e){setStatus(e.message)}});
$('#auto').addEventListener('click',async()=>{setStatus('autonomous cycle…');try{const r=await unit.autonomousCycle({});$('#workOutput').innerHTML=`<div class="card"><pre>${esc(JSON.stringify(r,null,2))}</pre></div>`;renderWorld();organismExpression.apply(r.organResult?.intent||'autonomous maintenance cycle');setStatus('autonomous cycle complete')}catch(e){setStatus(e.message)}});

function renderWorld(){const life=unit.lifeSnapshot(),success=unit.successSnapshot(),world=unit.world.snapshot(),cult=unit.cultivationProgram.snapshot();livingWorld.render();$('#lifeMetrics').innerHTML=`<div class="metric"><strong>${Math.round((success.vitality||0)*100)}%</strong><span>vitality</span></div><div class="metric"><strong>${Number(success.adaptationBudget||0).toFixed(2)}</strong><span>adaptation</span></div><div class="metric"><strong>${Math.round((success.repairPressure||0)*100)}%</strong><span>repair pressure</span></div><div class="metric"><strong>${cult.verifiedProgress}</strong><span>verified progress</span></div>`;const need=life.needs?.open?.[0];$('#needView').textContent=need?`${need.kind}\n${need.reason}\npressure ${Number(need.pressure||0).toFixed(2)}`:'none';const gaps=success.complement?.open||[];$('#gapView').textContent=gaps.length?gaps.slice(0,6).map(g=>`${g.capability}: ${g.friction||'friction observed'} (${g.persistence})`).join('\n'):'none';$('#worldEntities').innerHTML=(world.entities||[]).length?world.entities.slice(0,30).map(x=>`<div class="claim"><b>${esc(x.kind)}</b> ${esc(x.id)}<div class="muted">${esc(x.worldAddress?.locator||x.worldAddress?.scheme||'unresolved locator')}</div></div>`).join(''):'<div class="notice">World referents appear here when they are actually observed.</div>'; const dev=unit.developmentalSnapshot().current;const b=$('#becomingView');if(b&&dev){const dims=Object.entries(dev.becoming.dimensions||{}).map(([k,v])=>`<div class=\"claim\"><b>${esc(k)}</b><div>${esc(v.reading)}</div></div>`).join('');b.innerHTML=`<div class=\"becoming-pair\"><div><small>I AM</small><p>${esc(dev.iam.statement)}</p></div><div><small>I AM BECOMING</small><p>${esc(dev.becoming.statement)}</p><p><b>Next:</b> ${esc(dev.becoming.nearestNextState)}</p><p><b>Developmental distance:</b> ${Math.round(dev.distance*100)}%</p></div></div><details><summary>Why this direction?</summary>${dims}</details>`;}$('#organs').innerHTML=unit.registry.snapshot().map(o=>`<span class="chip">${esc(o.id)}</span>`).join('');}

async function learnText(source,location,text){const result=await validated.processText(source,location,text);for(const rel of result.relations.filter(r=>r.status==='approved'))await mesh.publish({toolId:'autoling',kind:'relation',value:`${rel.subject} ${rel.predicate} ${rel.object}`,confidence:rel.confidence,evidence:[{sourceId:source,location:String(location),checksum:result.observation.checksum,text:result.observation.originalText}]});return result;}
async function ingestFile(file){
  const rec=await vault.ingestFile(file,{chunkSize:12000});
  let text='';try{if((file.type||'').startsWith('text/')||/\.(?:[cm]?[jt]sx?|css|scss|html?|json|md|txt|csv|xml|ya?ml|toml|sql)$/i.test(file.name))text=await file.text();}catch{}
  const organism=unit.ingestUploadArtifact({name:file.name,type:file.type,size:file.size,text,sourceId:rec.id,hash:rec.hash});
  if(text){for(let i=0,n=0;i<text.length;i+=12000,n++)await learnText(rec.id,`chunk:${n}`,text.slice(i,i+12000));}
  unit.memory.remember('facts',{kind:'knowledge-source',sourceId:rec.id,hash:rec.hash,name:rec.name,size:rec.size,chunks:rec.chunks,chars:rec.chars,evidence:{source:'local-file-ingest',at:Date.now()},organismUploadId:organism.id});
  organismExpression.applyResolved?.({field:unit.processField.snapshot(),recursive:unit.recursiveField.resolve(unit.processField.snapshot()),morph:organism.expression,identity:'Synthia'});
  return {...rec,organism};
}
$('#fileInput').addEventListener('change',async e=>{const files=[...e.target.files];let n=0;for(const f of files){$('#ingestStatus').textContent=`Synthia is receiving ${f.name}…`;try{const r=await ingestFile(f);n++;$('#ingestStatus').textContent=`${f.name}: ${r.organism.artifact.kind} · ${r.organism.actions.join(' → ')}`;renderWorld();}catch(err){$('#ingestStatus').textContent=`Could not integrate ${f.name}: ${err.message}`}}if(files.length>1)$('#ingestStatus').textContent=`Integrated ${n}/${files.length} file(s) into local residence.`;e.target.value='';await renderLearning()});
async function renderLearning(){const docs=await vault.list(),claims=await validated.claims(30);$('#library').innerHTML=docs.length?docs.slice().reverse().slice(0,30).map(d=>`<div class="claim"><b>${esc(d.name)}</b><div class="muted">${Number(d.chars||0).toLocaleString()} chars · ${esc(String(d.hash||d.id||'').slice(0,16))}</div></div>`).join(''):'<div class="notice">No local sources yet. Remote corpus belongs in Supabase, not in the app bundle.</div>';$('#claims').innerHTML=claims.length?claims.slice(0,20).map(c=>`<div class="claim">${esc(c.text)}</div>`).join(''):'<div class="notice">No validated claims yet.</div>';}

async function renderChair(){try{const s=await chair.session();localStorage.setItem('synthia.mcp.token',s.token);$('#mcpToken').value=s.token;$('#mcpEndpoint').value=(s.lanEndpoints?.[0]||location.origin)+'/mcp';const r=await fetch('/mcp/proposals'),j=await r.json(),ps=j.proposals||[];$('#chairState').textContent=`${s.tools.length} tools · ${ps.filter(p=>p.status==='pending').length} pending`;$('#proposalList').innerHTML=ps.length?ps.slice().reverse().map(p=>`<div class="card"><b>${esc(p.target)}</b><div>${esc(p.reason)}</div><small>${esc(p.status)}</small>${p.status==='pending'?`<div class="section"><button class="btn primary" data-approve="${esc(p.id)}">Approve + verify</button></div>`:''}</div>`).join(''):'<div class="notice">No change proposals.</div>';$$('[data-approve]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{const rr=await fetch(`/mcp/proposals/${encodeURIComponent(b.dataset.approve)}/approve`,{method:'POST'}),x=await rr.json();if(!rr.ok)throw new Error(x.error||'approval failed');await renderChair();setStatus(`proposal ${x.proposal.status}`)}catch(e){setStatus(e.message)}finally{b.disabled=false}}));}catch(e){$('#chairState').textContent='MCP Chair unavailable: '+e.message}}
$('#refreshChair').addEventListener('click',renderChair);
function renderSystem(){const s=unit.snapshot();$('#systemSummary').innerHTML=`<div class="toolchips"><span class="chip">${s.organs.length} organs</span><span class="chip">${s.tools.length} tools</span><span class="chip">${s.life.pulses} pulses</span><span class="chip">64 gate processes + ${s.processFabric.processes?.length||0} capability processes</span><span class="chip">${s.emergence?.hypotheses?.length||0} emergence hypotheses</span></div>`;$('#systemRaw').textContent=JSON.stringify({cultivation:s.cultivation,life:s.life,organs:s.organs,processFabric:s.processFabric,generated:s.generated,morphs:s.morphs,emergence:s.emergence},null,2);renderChair();}

async function pollInbox(){try{const r=await fetch('/mcp/inbox'),j=await r.json();for(const x of j.items||[]){await ingestFile(new File([x.text],x.source,{type:'text/plain'}));await fetch(`/mcp/inbox/${encodeURIComponent(x.id)}/ack`,{method:'POST'});}}catch{}}
setInterval(()=>{renderWorld();},1000);setInterval(pollInbox,3000);
renderCycle();renderWorld();renderLearning();renderSystem();renderCoDevelopment(unit.coDevelopment.snapshot().current);setStatus('ready · cultivation ground active');log('synthia','Bring me the real situation. We will read it, act on it, and learn from what actually happens.');

organismExpression.apply('boot');


// r21.18 system-wide assistant bridge: the phone shell routes here rather than duplicating Synthia.
async function systemAssistantAsk(text){
  const dev=unit.coDevelop(text);
  const k=await relevantKnowledge(text);
  const r=await unit.ask(text,{knowledgeContext:k,coDevelopment:dev});
  const response=dev.upload?.status==='awaiting-local-artifact'
    ? `Yes. Give me the upload. I will preserve it locally, classify it, address it, route it through the relevant processes, learn it, and morph around what it actually is — without exporting your local identity.\n\n${dev.question||''}`.trim()
    : (dev.question?`${dev.question}\n\n${summarizeResult(r)}`:summarizeResult(r));
  organismExpression.apply(text);
  try{renderCoDevelopment(dev);renderWorld();}catch{}
  return {response,result:r,development:dev};
}
globalThis.SynthiaSystemAssistant={ask:systemAssistantAsk,unit};
window.addEventListener('message',async e=>{
  const m=e.data||{};
  if(m.type==='synthia:snapshot'){
    try{
      const snap=unit.snapshot();
      const life=unit.lifeSnapshot();
      e.source?.postMessage({type:'synthia:snapshot',requestId:m.requestId||null,ok:true,snapshot:snap,life},'*');
    }catch(error){
      e.source?.postMessage({type:'synthia:snapshot',requestId:m.requestId||null,ok:false,error:error?.message||String(error)},'*');
    }
    return;
  }
  if(m.type!=='synthia:ask'||!m.requestId)return;
  try{
    const x=await systemAssistantAsk(String(m.text||''));
    e.source?.postMessage({type:'synthia:reply',requestId:m.requestId,ok:true,response:x.response},'*');
  }catch(error){
    e.source?.postMessage({type:'synthia:reply',requestId:m.requestId,ok:false,error:error?.message||String(error)},'*');
  }
});
try{parent?.postMessage({type:'synthia:ready'},'*')}catch{}
