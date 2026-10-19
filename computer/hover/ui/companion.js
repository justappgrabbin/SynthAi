const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let accessKey = sessionStorage.getItem('synthia-companion-key') || '';
let lastReply = '';
let page = 'chat';

function banner(message, kind = '') {
  const box = $('#banner'); box.textContent = message; box.className = 'banner ' + kind;
}
function appendMessage(role, content, kind = '') {
  const el = document.createElement('div');
  el.className = 'message ' + (kind || (role === 'You' ? 'me' : role === 'System' ? 'system' : ''));
  el.textContent = role + ': ' + String(content);
  $('#chat-messages').append(el);
  el.scrollIntoView({ block: 'nearest' });
}
async function api(path, { method = 'GET', body, authenticated = false } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (authenticated) {
    if (!accessKey) throw new Error('Unlock continuity with the access key first.');
    headers['x-synthia-access-key'] = accessKey;
  }
  const response = await fetch(path, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || ('HTTP ' + response.status));
  return data;
}
function markBusy(button, yes) { if (button) button.disabled = yes; }
async function checkpoint(content, actor, type = 'conversation', ref = null) {
  if (!accessKey) return;
  await api('/api/companion/events', { method: 'POST', authenticated: true, body: { type, actor, content, ref } });
}

async function checkStatus() {
  try {
    const status = await api('/api/companion/status');
    $('#terminal-kind').textContent = status.terminal.actual;
    $('#vm-note').textContent = status.terminal.note;
    $('#runtime-badge').textContent = status.terminal.virtualMachine ? 'Linux VM online' : 'Linux userspace · VM pending';
    $('#ledger-position').textContent = 'Entry #' + status.continuity.seq + ' · ' + status.continuity.count + ' records';
    $('#ledger-head').textContent = 'HEAD ' + status.continuity.head;
    banner('Local runtime reachable · ' + status.terminal.actual, 'success');
  } catch (error) { banner('Local runtime unreachable: ' + error.message, 'error'); $('#runtime-badge').textContent = 'Runtime offline'; }
  $('#pairing').classList.toggle('connected', Boolean(accessKey));
}

async function loadEvents() {
  const data = await api('/api/companion/events?limit=100', { authenticated: true });
  const box = $('#events'); box.replaceChildren();
  $('#ledger-position').textContent = 'Entry #' + data.state.seq + ' · ' + data.state.count + ' records';
  $('#ledger-head').textContent = 'HEAD ' + data.state.head;
  if (!data.events.length) {
    const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'The continuity ledger is empty. Save the first checkpoint.';
    box.append(p);
  }
  for (const event of data.events.slice().reverse()) {
    const card = document.createElement('article'); card.className = 'event';
    const meta = document.createElement('div'); meta.className = 'meta';
    const actor = document.createElement('span'); actor.textContent = '#' + event.seq + '  ' + event.type + ' / ' + event.actor;
    const when = document.createElement('time'); when.textContent = new Date(event.timestamp).toLocaleString();
    meta.append(actor, when);
    const body = document.createElement('div'); body.className = 'body'; body.textContent = event.content;
    const digest = document.createElement('div'); digest.className = 'hash'; digest.textContent = event.hash;
    card.append(meta, body, digest); box.append(card);
  }
}
function speak(text) {
  if (!text) return banner('No reply to speak yet.');
  try {
    if (window.SynthiaVoice?.speak) return window.SynthiaVoice.speak(text);
    if ('speechSynthesis' in window) {
      const voice = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice); return;
    }
  } catch (error) { return banner('Voice playback unavailable: ' + error.message, 'error'); }
  banner('Speech output is unavailable in this Android WebView.', 'error');
}

async function sendChat(text) {
  const trimmed = String(text).trim(); if (!trimmed) return;
  appendMessage('You', trimmed);
  try { await checkpoint(trimmed, 'human'); } catch (e) { banner('Continuity write failed: ' + e.message, 'error'); }
  const button = $('#send-chat'); markBusy(button, true);
  try {
    const result = await api('/api/chat', { method: 'POST', body: { message: trimmed, context: { surface: 'gpt-companion', personId: 'companion', agentId: 'synthia' } } });
    const reply = result.utterance || result.output || result.reply;
    if (!reply) throw new Error('Existing Synthia runtime returned no spoken response.');
    lastReply = typeof reply === 'string' ? reply : JSON.stringify(reply);
    appendMessage('Synthia', lastReply);
    try { await checkpoint(lastReply, 'synthia'); } catch (e) { banner('Continuity write failed: ' + e.message, 'error'); }
  } catch (e) {
    appendMessage('System', 'Synthia is not ready: ' + e.message + '. Your input remains in the ledger when authenticated.', 'error');
  } finally { markBusy(button, false); }
}
$('#chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#chat-input'), text = input.value; input.value = ''; sendChat(text);
});
$$('[data-command]').forEach(button => button.addEventListener('click', () => sendChat(button.dataset.command)));
$('#say-last').addEventListener('click', () => speak(lastReply));

$('#mic').addEventListener('click', () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return banner('This WebView has no voice-to-text engine. Typed commands and Cynthia voice playback remain available.', 'error');
  const rec = new Recognition(); rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
  rec.onresult = (event) => { const words = event.results?.[0]?.[0]?.transcript; if (words) { $('#chat-input').value = words; banner('Speech recognized. Tap Send to submit.', 'success'); } };
  rec.onerror = (event) => banner('Microphone recognition failed: ' + event.error, 'error');
  try { rec.start(); banner('Listening for your words…'); } catch (error) { banner('Microphone unavailable: ' + error.message, 'error'); }
});

$('#pair-form').addEventListener('submit', async event => {
  event.preventDefault();
  const candidate = $('#access-key').value.trim();
  accessKey = candidate;
  try {
    await api('/api/companion/events?limit=1', { authenticated: true });
    sessionStorage.setItem('synthia-companion-key', accessKey);
    $('#access-key').value = ''; $('#pairing').classList.add('connected');
    banner('Continuity and authenticated terminal unlocked.', 'success');
    await loadEvents();
    await loadGitHubStatus();
  } catch (error) {
    accessKey = ''; sessionStorage.removeItem('synthia-companion-key');
    banner('Access key rejected: ' + error.message, 'error');
  }
});

$('#terminal-form').addEventListener('submit', async event => {
  event.preventDefault();
  const input = $('#terminal-input'), command = input.value.trim();
  if (!command) return;
  if (!accessKey) return banner('Unlock the companion before running real commands.', 'error');
  if (!window.confirm('Execute this actual Linux command?\n\n' + command)) return;
  const button = event.currentTarget.querySelector('[type=submit]'); markBusy(button, true);
  $('#terminal-output').textContent += '\n$ ' + command + '\n[running]\n';
  try {
    const data = await api('/api/companion/terminal', { method: 'POST', authenticated: true, body: { command } });
    $('#terminal-output').textContent += [data.stdout, data.stderr, '[exit ' + data.code + ', timedOut=' + data.timedOut + ']'].filter(Boolean).join('\n') + '\n';
    $('#terminal-output').scrollTop = $('#terminal-output').scrollHeight;
    input.value = '';
  } catch (error) { $('#terminal-output').textContent += 'ERROR: ' + error.message + '\n'; }
  finally { markBusy(button, false); }
});

async function loadHands() {
  const status = $('#hands-status'), details = $('#hands-details'), grid = $('#hands-apps');
  status.textContent = 'Connecting to Android hands…'; grid.replaceChildren();
  try {
    const [hands, apps] = await Promise.all([api('/api/solo/android/status'), api('/api/solo/android/apps')]);
    status.textContent = hands.available || hands.reachable ? 'Android hand bridge connected' : 'Android hand bridge status received';
    details.textContent = JSON.stringify(hands);
    const items = apps.apps || [];
    if (!items.length) { const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'No installed applications reported.'; grid.append(p); }
    for (const app of items) {
      const card = document.createElement('div'); card.className = 'app-item';
      const title = document.createElement('strong'); title.textContent = app.label || app.packageName;
      const pkg = document.createElement('small'); pkg.textContent = app.packageName;
      const open = document.createElement('button'); open.textContent = 'Open app';
      open.addEventListener('click', async () => {
        if (!window.confirm('Ask Synthia to open ' + (app.label || app.packageName) + '?')) return;
        try {
          const result = await api('/api/solo/android/open-app', { method: 'POST', body: { packageName: app.packageName } });
          banner(result.ok === false ? 'Android rejected launch.' : 'Android accepted launch request.', result.ok === false ? 'error' : 'success');
          await checkpoint('Android app launch request: ' + app.packageName + ' response=' + JSON.stringify(result).slice(0, 2000), 'human', 'receipt');
        } catch (error) { banner('Launch failed: ' + error.message, 'error'); }
      });
      card.append(title, pkg, open); grid.append(card);
    }
  } catch (error) { status.textContent = 'Android hands unavailable'; details.textContent = error.message; }
}
$('#hands-refresh').addEventListener('click', loadHands);

$('#note-form').addEventListener('submit', async event => {
  event.preventDefault(); const input = $('#note-text'), text = input.value.trim();
  try { await checkpoint(text, 'human', 'checkpoint'); input.value = ''; await loadEvents(); banner('Durable checkpoint appended and verified.', 'success'); }
  catch (error) { banner(error.message, 'error'); }
});
$('#ledger-refresh').addEventListener('click', () => loadEvents().catch(error => banner(error.message, 'error')));
$('#ledger-export').addEventListener('click', async () => {
  try {
    const data = await api('/api/companion/export', { authenticated: true });
    const serialized = JSON.stringify(data.snapshot, null, 2);
    await navigator.clipboard.writeText(serialized);
    banner('Copied the verified handoff snapshot for ChatGPT.', 'success');
  } catch (error) { banner('Cannot copy snapshot: ' + error.message, 'error'); }
});

async function loadGitHubStatus() {
  if (!accessKey) return;
  try {
    const data = await api('/api/companion/github/status', { authenticated: true });
    $('#github-status').textContent = data.configured ? 'Connected to ' + data.repository + ' (' + data.branch + ')' : 'Not connected. Use a private repository for continuity.';
  } catch (error) { $('#github-status').textContent = error.message; }
}
$('#github-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('[type=submit]'); markBusy(button, true);
  try {
    const result = await api('/api/companion/github/config', { method: 'POST', authenticated: true, body: {
      repository: $('#github-repo').value.trim(), branch: $('#github-branch').value.trim(),
      token: $('#github-token').value.trim(), allowPublic: $('#github-public').checked,
    } });
    $('#github-token').value = '';
    $('#github-status').textContent = 'Connected to ' + result.repository + ' (' + result.branch + ')';
    banner('GitHub continuation configured. Nothing uploaded until Push.', 'success');
  } catch (error) { $('#github-status').textContent = error.message; banner(error.message, 'error'); }
  finally { markBusy(button, false); }
});
$('#github-push').addEventListener('click', async () => {
  try {
    if (!window.confirm('Export the current continuity snapshot to your configured GitHub repository?')) return;
    const data = await api('/api/companion/github/push', { method: 'POST', authenticated: true, body: {} });
    $('#github-status').textContent = data.pushed ? 'Snapshot written: ' + data.path : data.reason;
    banner(data.pushed ? 'GitHub continuity snapshot pushed.' : data.reason, data.pushed ? 'success' : '');
  } catch (error) { banner(error.message, 'error'); }
});
$('#github-pull').addEventListener('click', async () => {
  try {
    const data = await api('/api/companion/github/pull', { method: 'POST', authenticated: true, body: {} });
    banner('Received ' + data.received + ' proposed handoffs. No commands executed.', 'success');
    await loadEvents();
  } catch (error) { banner(error.message, 'error'); }
});

$$('[data-page]').forEach(button => button.addEventListener('click', async () => {
  page = button.dataset.page;
  $$('.page').forEach(element => element.classList.toggle('visible', element.id === 'page-' + page));
  $$('[data-page]').forEach(item => item.classList.toggle('active', item.dataset.page === page));
  if (page === 'hands') await loadHands();
  if (page === 'continuity' && accessKey) { await loadEvents().catch(e => banner(e.message, 'error')); await loadGitHubStatus(); }
}));

await checkStatus();
if (accessKey) {
  try { await loadEvents(); await loadGitHubStatus(); }
  catch { accessKey = ''; sessionStorage.removeItem('synthia-companion-key'); $('#pairing').classList.remove('connected'); }
}