const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const shell = $('#shell');
const workspace = $('#workspace');
const radial = $('#radial');
const planet = $('#planet');
const setupDialog = $('#setup-dialog');
let activeSurface = 'chat';
let browserPage = null;
let browserBundle = null;
let identityConfigured = false;
let worldAnimation = null;
let pendingChat = null;
let identityContext = { personId: 'front-screen', agentId: 'synthia' };
const draftKey = 'synthia-origin-draft-v1';
const identityFields = $$('#identity-form input, #identity-form select');
try {
  const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
  identityFields.forEach(input => { if (typeof draft[input.id] === 'string') input.value = draft[input.id]; });
} catch {}
$('#identity-form').addEventListener('input', () => {
  try { localStorage.setItem(draftKey, JSON.stringify(Object.fromEntries(identityFields.map(input => [input.id, input.value])))); } catch {}
});

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `${response.status} ${response.statusText}`);
    error.code = data.code || null;
    error.status = response.status;
    throw error;
  }
  return data;
}

function openMenu(force = null) {
  const next = force == null ? !shell.classList.contains('menu-open') : Boolean(force);
  shell.classList.toggle('menu-open', next);
  radial.setAttribute('aria-hidden', String(!next));
}

async function openSurface(name) {
  activeSurface = name;
  shell.dataset.surface = name;
  shell.classList.add('open');
  openMenu(false);
  workspace.setAttribute('aria-hidden', 'false');
  $$('.surface').forEach((surface) => surface.classList.toggle('active', surface.dataset.surface === name));
  $('#surface-subtitle').textContent = ({ browser: 'Browser', chat: 'Chat', world: 'World', todo: 'To Do', build: 'Build' })[name] || name;
  await api('/api/solo/surface', { method: 'POST', body: JSON.stringify({ surface: name }) }).catch(() => {});
  if (name === 'todo') await loadTasks();
  if (name === 'world') await loadWorld();
  if (name === 'browser') await loadBrowserState();
}

function collapse() {
  shell.classList.remove('open');
  workspace.classList.remove('maximized');
  workspace.setAttribute('aria-hidden', 'true');
  openMenu(false);
}

planet.addEventListener('click', () => {
  if (shell.classList.contains('open')) collapse();
  else openMenu();
});

$$('[data-open-surface]').forEach((button) => button.addEventListener('click', () => openSurface(button.dataset.openSurface)));
$('#workspace-close').addEventListener('click', collapse);
$('#workspace-max').addEventListener('click', () => workspace.classList.toggle('maximized'));
$('#setup-open').addEventListener('click', () => setupDialog.showModal());

function addMessage(who, text, trace = false) {
  const div = document.createElement('div');
  div.className = `message ${trace ? 'trace' : who}`;
  div.textContent = text;
  $('#chat-log').appendChild(div);
  $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
  return div;
}

async function sendChat(text, replay = false) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return;
  if (!replay) addMessage('user', trimmed);
  const lower = trimmed.toLowerCase();
  const surfaceMatch = lower.match(/^(?:open|show|go to)\s+(browser|chat|world|to do|todo|build)$/);
  if (surfaceMatch) {
    const target = surfaceMatch[1] === 'to do' ? 'todo' : surfaceMatch[1];
    addMessage('synthia', `Opening ${target === 'todo' ? 'To Do' : target}.`);
    await openSurface(target);
    return;
  }
  try {
    if (activeSurface === 'browser' && browserBundle?.page) {
      const result = await api('/api/solo/browser/command', { method: 'POST', body: JSON.stringify({ message: trimmed, context: { ...identityContext } }) });
      if (result.action !== 'chat-about-page' || result.action) {
        if (result.action === 'chat-about-page' && result.chat?.utterance) addMessage('synthia', result.chat.utterance);
        else addMessage('synthia', browserResultText(result));
        if (result.screenshot || result.page) renderBrowser(result);
        await syncMorphAppearance();
        return;
      }
    }
    const result = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: trimmed, context: { ...identityContext, surface: activeSurface } }) });
    addMessage('synthia', result.utterance || result.output || '(processed)');
    if (result.pipelineTrace) addMessage('', `Trace · ${result.pipelineTrace.map((x) => x.stage).join(' → ')}`, true);
    await syncMorphAppearance();
  } catch (error) {
    if (error.code === 'BIRTH_CONFIGURATION_REQUIRED') {
      pendingChat = trimmed;
      addMessage('synthia', 'I need my origin configured before I can resolve personalized state.');
      if (!setupDialog.open) setupDialog.showModal();
    } else addMessage('', error.message, true);
  }
}

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input');
  const text = input.value;
  input.value = '';
  await sendChat(text);
});
$$('[data-quick]').forEach((button) => button.addEventListener('click', () => sendChat(button.dataset.quick)));

function findColor(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const key of ['css', 'hex', 'color']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(candidate) || /^(rgb|hsl)a?\(/i.test(candidate))) return candidate;
  }
  for (const child of Object.values(value)) {
    const found = findColor(child, seen);
    if (found) return found;
  }
  return null;
}

async function syncMorphAppearance() {
  try {
    const data = await api('/api/solo/morph-state');
    const accent = findColor(data.morph?.packet?.perception ?? data.morph?.packet?.current ?? data.morph);
    if (accent) document.documentElement.style.setProperty('--state-accent', accent);
    planet.title = data.morph?.packet?.id ? `Canonical morph ${data.morph.packet.id}` : 'Synthia';
  } catch {}
}

async function loadStatus() {
  try {
    const [status, solo] = await Promise.all([api('/api/status'), api('/api/solo/status')]);
    identityConfigured = status.personalizedReady === true;
    if (status.identity?.configured) identityContext = { personId: status.identity.personId, agentId: status.identity.agentId };
    $('#status-dot').classList.toggle('ready', status.structurallyReady === true);
    $('#planet-label').textContent = identityConfigured ? 'Synthia · online' : 'Synthia · setup';
    if (!identityConfigured) $('#status-dot').title = 'Origin configuration required';
    if (!solo.browser?.available) $('#browser-empty p').textContent = 'Browser runtime is present but Chromium/Chrome was not found in this Linux environment.';
  } catch (error) {
    $('#status-dot').title = error.message;
  }
}

$('#identity-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = $('#identity-result');
  const submit = event.currentTarget.querySelector('[type=submit]');
  submit.disabled = true;
  result.textContent = 'configuring…';
  try {
    const data = await api('/api/identity/configure', {
      method: 'POST', body: JSON.stringify({
        ...identityContext,
        birthDate: $('#birth-date').value, birthTime: $('#birth-time').value,
        disambiguation: $('#birth-disambiguation').value,
        place: {
          label: $('#birth-place').value,
          timeZone: $('#birth-timezone').value,
          latitude: Number($('#birth-latitude').value), longitude: Number($('#birth-longitude').value),
        },
      }),
    });
    identityConfigured = true;
    identityContext = { personId: data.identity.personId, agentId: data.identity.agentId };
    try { localStorage.removeItem(draftKey); } catch {};
    result.textContent = data.identity?.configurationId ? `configured · ${data.identity.configurationId}` : 'configured';
    $('#status-dot').classList.add('ready');
    setupDialog.close();
    await loadStatus();
    if (pendingChat) { const queued = pendingChat; pendingChat = null; await sendChat(queued, true); }
    await syncMorphAppearance();
  } catch (error) { result.textContent = error.message; }
  finally { submit.disabled = false; }
});

function browserBusy(on) { $('#browser-busy').classList.toggle('on', Boolean(on)); }
function browserResultText(result) {
  if (result.chat?.utterance) return result.chat.utterance;
  if (result.action === 'navigate') return `Opened ${result.page?.title || result.page?.url || 'page'}.`;
  if (result.action === 'click') return result.clicked?.text ? `Clicked ${result.clicked.text}.` : 'Clicked the requested control.';
  if (result.status === 'AWAITING_VALUES') return 'I found the form. Add the values you want me to type.';
  if (result.status === 'READY_FOR_FINAL_CONFIRMATION') return 'The form is filled and ready for your final submission confirmation.';
  if (result.status === 'SUBMITTED') return 'Submitted.';
  if (result.status === 'NO_FORM_FOUND') return 'I do not see a form on this page.';
  return result.status ? String(result.status).replaceAll('_', ' ').toLowerCase() : 'Done.';
}

function renderBrowser(bundle) {
  if (!bundle) return;
  browserBundle = bundle;
  browserPage = bundle.page || browserPage;
  if (bundle.screenshot) {
    $('#browser-shot').src = bundle.screenshot;
    $('#browser-shot').classList.add('live');
    $('#browser-empty').style.display = 'none';
  }
  if (browserPage) {
    $('#browser-title').textContent = browserPage.title || 'Untitled';
    $('#browser-url').textContent = browserPage.url || '';
    if (browserPage.url) $('#browser-address').value = browserPage.url;
    renderBrowserFields(browserPage);
    renderBrowserActions(browserPage);
  }
}

function renderBrowserFields(page) {
  const box = $('#browser-fields');
  box.innerHTML = '';
  const form = page.forms?.[0];
  if (!form) return;
  const title = document.createElement('div'); title.className = 'eyebrow'; title.textContent = `FORM · ${form.fields.length} FIELDS`; box.appendChild(title);
  for (const field of form.fields.slice(0, 14)) {
    const row = document.createElement('div'); row.className = 'field-row';
    const label = document.createElement('label'); label.textContent = field.label || field.name;
    const input = document.createElement('input'); input.dataset.field = field.name; input.value = field.value ?? ''; input.placeholder = field.required ? 'required' : 'optional';
    label.appendChild(input); row.appendChild(label); box.appendChild(row);
  }
  const fill = document.createElement('button'); fill.textContent = 'Fill approved fields'; fill.addEventListener('click', fillVisibleForm); box.appendChild(fill);
  const submit = document.createElement('button'); submit.textContent = 'Review / submit'; submit.addEventListener('click', reviewSubmit); box.appendChild(submit);
}

function renderBrowserActions(page) {
  const box = $('#browser-actions'); box.innerHTML = '';
  for (const action of (page.actions || []).filter((x) => x.text).slice(0, 12)) {
    const button = document.createElement('button'); button.textContent = action.text; button.addEventListener('click', () => browserCommand(`click ${action.text}`)); box.appendChild(button);
  }
}

async function loadBrowserState() {
  try {
    const result = await api('/api/solo/browser');
    if (result.page || result.screenshot) renderBrowser(result);
  } catch {}
}

async function browserNavigate(url) {
  browserBusy(true);
  try { renderBrowser(await api('/api/solo/browser/navigate', { method: 'POST', body: JSON.stringify({ url }) })); await syncMorphAppearance(); }
  catch (error) { addMessage('', error.message, true); }
  finally { browserBusy(false); }
}

$('#browser-address-form').addEventListener('submit', async (event) => { event.preventDefault(); const url = $('#browser-address').value.trim(); if (url) await browserNavigate(url); });
$$('[data-browser-nav]').forEach((button) => button.addEventListener('click', async () => {
  browserBusy(true); try { renderBrowser(await api(`/api/solo/browser/${button.dataset.browserNav}`, { method: 'POST', body: '{}' })); } finally { browserBusy(false); }
}));

$('#browser-shot').addEventListener('click', async (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) * 430 / rect.width;
  const y = (event.clientY - rect.top) * 760 / rect.height;
  browserBusy(true); try { renderBrowser(await api('/api/solo/browser/click', { method: 'POST', body: JSON.stringify({ x, y }) })); } finally { browserBusy(false); }
});

async function browserCommand(text) {
  browserBusy(true);
  try {
    const result = await api('/api/solo/browser/command', { method: 'POST', body: JSON.stringify({ message: text, context: { ...identityContext } }) });
    renderBrowser(result);
    if (result.action === 'chat-about-page' && result.chat?.utterance) addMessage('synthia', result.chat.utterance);
    await syncMorphAppearance();
    return result;
  } catch (error) {
    if (error.code === 'BIRTH_CONFIGURATION_REQUIRED') { if (!setupDialog.open) setupDialog.showModal(); }
    else addMessage('', error.message, true);
  } finally { browserBusy(false); }
}

$('#browser-command-form').addEventListener('submit', async (event) => { event.preventDefault(); const input = $('#browser-command'); const text = input.value.trim(); input.value = ''; if (text) await browserCommand(text); });
$('#browser-inspect').addEventListener('click', () => browserCommand('inspect'));
$('#browser-form-scan').addEventListener('click', () => browserCommand('fill out the form'));
$('#browser-morph').addEventListener('click', async () => {
  browserBusy(true);
  try { const result = await api('/api/solo/browser/morph', { method: 'POST', body: '{}' }); renderBrowser(result); }
  catch (error) { addMessage('', error.message, true); }
  finally { browserBusy(false); }
});

async function fillVisibleForm() {
  const values = {};
  $$('#browser-fields [data-field]').forEach((input) => { if (input.value !== '') values[input.dataset.field] = input.value; });
  browserBusy(true);
  try { const result = await api('/api/solo/browser/fill', { method: 'POST', body: JSON.stringify({ values }) }); renderBrowser(result); addMessage('synthia', browserResultText(result)); }
  finally { browserBusy(false); }
}

async function reviewSubmit() {
  browserBusy(true);
  try {
    let result = await api('/api/solo/browser/submit', { method: 'POST', body: JSON.stringify({ confirmed: false }) });
    renderBrowser(result);
    if (result.status !== 'AWAITING_FINAL_CONFIRMATION') { addMessage('synthia', browserResultText(result)); return; }
    if (confirm('Submit this form now?')) {
      result = await api('/api/solo/browser/submit', { method: 'POST', body: JSON.stringify({ confirmed: true }) }); renderBrowser(result); addMessage('synthia', browserResultText(result));
    }
  } catch (error) { addMessage('', error.message, true); }
  finally { browserBusy(false); }
}

async function loadTasks() {
  try {
    const data = await api('/api/solo/tasks');
    const list = $('#todo-list'); list.innerHTML = '';
    for (const task of data.tasks) {
      const row = document.createElement('div'); row.className = `todo-item${task.done ? ' done' : ''}`;
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.addEventListener('change', async () => { await api(`/api/solo/tasks/${encodeURIComponent(task.id)}`, { method: 'PATCH', body: JSON.stringify({ done: check.checked }) }); await loadTasks(); });
      const text = document.createElement('div'); text.className = 'task-text'; text.textContent = task.text;
      const del = document.createElement('button'); del.textContent = '×'; del.addEventListener('click', async () => { await api(`/api/solo/tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE' }); await loadTasks(); });
      const run = document.createElement('button');
      run.textContent = task.status === 'queued' ? 'Queued' : task.status === 'running' ? 'Working…' : 'Run';
      run.disabled = task.done || ['queued', 'running'].includes(task.status);
      run.addEventListener('click', async () => {
        try { await api(`/api/solo/tasks/${encodeURIComponent(task.id)}/run`, { method: 'POST', body: '{}' }); await loadTasks(); }
        catch (error) { $('#task-status').textContent = error.message; }
      });
      row.append(check, text, run, del);
      if (task.result || task.error) { const output = document.createElement('div'); output.className = 'task-result'; output.textContent = `${task.status}: ${task.result || task.error}`; row.appendChild(output); }
      list.appendChild(row);
    }
  } catch (error) { $('#task-status').textContent = error.message; }
}
$('#todo-form').addEventListener('submit', async (event) => { event.preventDefault(); const input = $('#todo-input'); const text = input.value.trim(); if (!text) return; await api('/api/solo/tasks', { method: 'POST', body: JSON.stringify({ text, source: 'user', context: { surface: activeSurface } }) }); input.value = ''; await loadTasks(); });

async function loadWorld() {
  try {
    const data = await api('/api/solo/world');
    const latest = data.perception?.latest;
    $('#world-state').textContent = latest?.address ? `${latest.address.dimension} · Gate ${latest.address.gate}.${latest.address.line} · Color ${latest.address.color} · Tone ${latest.address.tone} · Base ${latest.address.base}` : 'Waiting for a landed state.';
    drawWorld(data);
  } catch (error) { $('#world-state').textContent = error.message; drawWorld(null); }
}
$('#world-refresh').addEventListener('click', loadWorld);

function drawWorld(data) {
  const canvas = $('#world-canvas'); const rect = canvas.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.max(1, rect.width * dpr); canvas.height = Math.max(1, rect.height * dpr); const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const w = rect.width, h = rect.height; const dims = ['Movement','Evolution','Being','Design','Space']; const active = data?.perception?.latest?.address?.dimension;
  const particles = Array.from({length:90},(_,i)=>({x:(i*73)%Math.max(1,w),y:(i*149)%Math.max(1,h),r:.4+(i%4)*.25,a:.18+(i%5)*.07}));
  if (worldAnimation) cancelAnimationFrame(worldAnimation);
  let t=0;
  const render=()=>{t+=.006;ctx.clearRect(0,0,w,h);const g=ctx.createRadialGradient(w*.56,h*.54,0,w*.56,h*.54,Math.max(w,h)*.7);g.addColorStop(0,'rgba(103,30,170,.18)');g.addColorStop(1,'rgba(1,1,5,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(const p of particles){ctx.beginPath();ctx.fillStyle=`rgba(220,190,255,${p.a})`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}const cx=w*.55,cy=h*.55,R=Math.min(w,h)*.3;dims.forEach((d,i)=>{const a=-Math.PI/2+i*Math.PI*2/dims.length+t*.15;const x=cx+Math.cos(a)*R,y=cy+Math.sin(a)*R;ctx.beginPath();ctx.strokeStyle=d===active?'rgba(56,241,231,.85)':'rgba(194,94,255,.46)';ctx.lineWidth=d===active?2:1;ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();ctx.beginPath();ctx.fillStyle=d===active?'#3cf0e7':'#b749f2';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=18;ctx.arc(x,y,d===active?8:6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(232,219,244,.75)';ctx.font='11px system-ui';ctx.fillText(d,x+11,y+3)});ctx.beginPath();ctx.fillStyle='#b84cf4';ctx.shadowColor='#e268ff';ctx.shadowBlur=28;ctx.arc(cx,cy,16+Math.sin(t*3)*2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;worldAnimation=requestAnimationFrame(render)};render();
}

window.addEventListener('resize', () => { if (activeSurface === 'world') loadWorld(); });

await loadStatus();
await loadTasks();
await syncMorphAppearance();

setInterval(() => { if (activeSurface === 'todo' && !document.hidden) loadTasks(); }, 3000);

$('#build-home').addEventListener('click', () => { $('#build-frame').src = '/build/index.html'; });
$('#build-tools').addEventListener('click', () => { $('#build-frame').src = '/lab.html#tray'; });

if (new URLSearchParams(location.search).get('setup') === '1') {
  await openSurface('chat');
  workspace.classList.add('maximized');
  setupDialog.showModal();
}
window.addEventListener('focus', loadStatus);

async function openTalk() {
  await openSurface('build');
  $('#build-frame').src = '/talk/index.html';
}
$('#build-talk').addEventListener('click', openTalk);
$('#talk-open').addEventListener('click', openTalk);
