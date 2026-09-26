import { BrowserComputerRuntime } from '/computer-runtime/BrowserComputerRuntime.mjs';
import { LocalStoragePersistence } from '/computer-runtime/core/kernel.mjs';
import { DeviceProjectWorkspace } from '/computer-runtime/adapters/DeviceProjectWorkspace.mjs';
import { buildPhoneAcceptanceReport } from '/computer-runtime/phone-acceptance-report.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
const titleFor = id => ({ home:'Computer Home', build:'Build', files:'Files', github:'GitHub', systems:'Systems', activity:'Activity' }[id] || 'SynthAI Computer');

const computer = await new BrowserComputerRuntime({
  persistence: new LocalStoragePersistence(),
  namespace: 'synthai-computer-web'
}).boot();

globalThis.SynthAIComputer = computer;
const projects = new DeviceProjectWorkspace({ runtime: computer });
const isAndroidApp = /SynthAIComputer\//.test(navigator.userAgent);
const previousPhoneBootAt = Number(localStorage.synthaiPhoneBootAt || 0);
localStorage.synthaiPhoneBootAt = String(Date.now());

let currentProjectId = localStorage.synthaiCurrentProject || '';
let activity = [];

function log(type, payload = {}) {
  activity.unshift({ at: Date.now(), type, payload });
  activity = activity.slice(0, 120);
  renderActivity();
}

computer.bus.on('*', event => log(event.type, event.payload));

function show(view) {
  $$('.view').forEach(el => el.classList.toggle('active', el.id === view));
  $$('.nav').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $('#viewTitle').textContent = titleFor(view);
  if (view === 'files') renderFiles();
  if (view === 'systems') renderSystems();
  window.scrollTo(0, 0);
}

$$('[data-view]').forEach(button => button.addEventListener('click', () => show(button.dataset.view)));
$$('[data-go]').forEach(button => button.addEventListener('click', () => show(button.dataset.go)));

function project() {
  return currentProjectId ? projects.get(currentProjectId) : null;
}

function setCurrentProject(id) {
  currentProjectId = id || '';
  localStorage.synthaiCurrentProject = currentProjectId;
  renderProjects();
  loadCurrentFile();
}

function starterHtml(name) {
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeName}</title>
  <style>
    body{font-family:system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#100b18;color:#f8f3ff}
    main{max-width:700px;padding:32px}
    h1{font-size:clamp(2rem,8vw,4.5rem);margin:0 0 12px}
    p{color:#c8b8d7;line-height:1.6}
  </style>
</head>
<body><main><h1>${safeName}</h1><p>This project was created inside SynthAI Computer. Edit this file, preview it locally, then publish the same files to GitHub.</p></main></body>
</html>`;
}

function mimeFor(path) {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js') || path.endsWith('.mjs')) return 'text/javascript';
  if (path.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

async function createProject() {
  const name = $('#projectName').value.trim();
  if (!name) return message('#builderMessage', 'Project name is required.', false);
  try {
    const p = await projects.create({ name, description: $('#projectDescription').value.trim() });
    await projects.writeFile(p.id, 'index.html', starterHtml(name), { type: 'text/html' });
    $('#filePath').value = 'index.html';
    setCurrentProject(p.id);
    await loadCurrentFile();
    message('#builderMessage', projects.source(p.id) === 'device'
      ? 'Project created in the on-device Linux Computer and saved across restarts.'
      : 'Project created in this browser’s storage. Your on-device Computer is unavailable.', true);
  } catch (error) {
    message('#builderMessage', error.message, false);
  }
}

async function saveFile() {
  const p = project();
  if (!p) return message('#builderMessage', 'Choose or create a project first.', false);
  const path = $('#filePath').value.trim();
  if (!path) return message('#builderMessage', 'File path is required.', false);
  try {
    await projects.writeFile(p.id, path, $('#editor').value, { type: mimeFor(path) });
    message('#builderMessage', `${path} saved ${projects.source(p.id) === 'device' ? 'to the on-device Computer' : 'in browser storage'}.`, true);
    renderProjects();
    renderFiles();
    return true;
  } catch (error) {
    message('#builderMessage', error.message, false);
    return false;
  }
}

async function loadCurrentFile() {
  const p = project();
  $('#projectState').textContent = p ? p.status.toUpperCase() : 'NO PROJECT';
  $('#fileProjectName').textContent = p ? p.name : 'choose a project';
  if (!p) {
    $('#editor').value = '';
    renderFiles();
    return;
  }
  $('#projectName').value = p.name;
  $('#projectDescription').value = p.description || '';
  const requested = $('#filePath').value.trim() || 'index.html';
  try {
    const file = await projects.readFile(p.id, requested) || (await projects.listFiles(p.id))[0];
    if (currentProjectId !== p.id) return;
    if (file) {
      $('#filePath').value = file.path;
      $('#editor').value = file.content;
    } else {
      $('#editor').value = '';
    }
    renderFiles();
  } catch (error) {
    message('#builderMessage', `Could not read project: ${error.message}`, false);
  }
}

async function preview() {
  const p = project();
  if (!p) return message('#builderMessage', 'Choose a project first.', false);
  try {
    const file = await projects.readFile(p.id, 'index.html');
    if (!file) return message('#builderMessage', 'This project has no index.html to preview.', false);
    $('#preview').srcdoc = file.content;
    message('#builderMessage', 'Preview rendered from the saved project file.', true);
  } catch (error) {
    message('#builderMessage', error.message, false);
  }
}

async function publish() {
  const p = project();
  if (!p) return message('#builderMessage', 'Choose a project first.', false);
  if ($('#githubPanelState').textContent !== 'VERIFIED') {
    show('github');
    return message('#githubMessage', 'To publish, connect your GitHub account through the optional Synthia Server bridge.', false);
  }
  try {
    if (!(await saveFile())) return;
    const result = await projects.publish(p.id, { backend: 'github' });
    renderProjects();
    const url = result?.repo?.url;
    message('#builderMessage', url ? `Published: ${url}` : 'GitHub publish completed.', true);
    await loadRepos();
  } catch (error) {
    message('#builderMessage', `Publish failed: ${error.message}`, false);
  }
}

function renderProjects() {
  const all = projects.list();
  const deviceCount = all.filter(p => projects.source(p.id) === 'device').length;
  const browserCount = all.length - deviceCount;
  $('#projectCount').textContent = `${deviceCount} on device · ${browserCount} in browser`;
  $('#projectPicker').innerHTML = '<option value="">Choose project</option>' + all.map(p =>
    `<option value="${escapeHtml(p.id)}" ${p.id === currentProjectId ? 'selected' : ''}>${escapeHtml(p.name)} · ${projects.source(p.id) === 'device' ? 'on device' : 'browser'}</option>`
  ).join('');
  $('#recentProjects').classList.toggle('empty', all.length === 0);
  $('#recentProjects').innerHTML = all.length ? all.slice(0, 6).map(p =>
    `<div class="system-row"><div><strong>${escapeHtml(p.name)}</strong><small>${Object.keys(p.files || {}).length} files · ${escapeHtml(p.status)}</small></div><span class="state">${projects.source(p.id) === 'device' ? 'ON DEVICE' : 'BROWSER'}</span></div>`
  ).join('') : 'No local projects yet.';
}

async function renderFiles() {
  const p = project();
  $('#fileProjectName').textContent = p ? p.name : 'choose a project';
  if (!p) {
    $('#fileList').className = 'file-list empty';
    $('#fileList').textContent = 'No project selected.';
    return;
  }
  $('#fileList').textContent = 'Loading files…';
  try {
    const files = await projects.listFiles(p.id);
    if (currentProjectId !== p.id) return;
    $('#fileList').className = files.length ? 'file-list' : 'file-list empty';
    $('#fileList').innerHTML = files.length ? files.map(file =>
      `<button class="file-row" data-file="${escapeHtml(file.path)}"><div><strong>${escapeHtml(file.path)}</strong><small>${escapeHtml(file.type)}</small></div><span>Open</span></button>`
    ).join('') : 'No files in this project.';
  } catch (error) {
    $('#fileList').className = 'file-list empty';
    $('#fileList').textContent = `Could not load files: ${error.message}`;
    return;
  }
  $$('#fileList [data-file]').forEach(button => button.addEventListener('click', () => {
    $('#filePath').value = button.dataset.file;
    loadCurrentFile();
    show('build');
  }));
}

function renderSystems() {
  const systems = computer.systems.list();
  const rows = systems.map(system =>
    `<div class="card-mini"><div><strong>${escapeHtml(system.name)}</strong><small>${escapeHtml(system.role)} · ${escapeHtml(system.relationship)}</small></div><span class="state">${system.id === 'synthai-computer' && projects.ready ? 'ON DEVICE' : 'REGISTERED'}</span></div>`
  ).join('');
  $('#systemsList').innerHTML = rows;
  $('#homeSystems').innerHTML = systems.slice(0, 5).map(system =>
    `<div class="system-row"><div><strong>${escapeHtml(system.name)}</strong><small>${escapeHtml(system.role)}</small></div><span class="state">${system.id === 'synthai-computer' && projects.ready ? 'ON DEVICE' : 'REGISTERED'}</span></div>`
  ).join('');
  const services = computer.localBackendHealth?.services || [];
  $('#localServiceList').innerHTML = services.length ? services.map(id =>
    `<div class="system-row"><strong>${escapeHtml(id)}</strong><span class="state">REGISTERED</span></div>`
  ).join('') : '<div class="empty">Local Computer services have not been verified on this device.</div>';
}

function renderActivity() {
  const el = $('#activityList');
  if (!el) return;
  el.innerHTML = activity.length ? activity.map(item =>
    `<div class="activity-row"><time>${new Date(item.at).toLocaleTimeString()}</time><strong>${escapeHtml(item.type)}</strong><div>${escapeHtml(JSON.stringify(item.payload).slice(0, 500))}</div></div>`
  ).join('') : '<div class="empty">No visible events yet.</div>';
}

function message(selector, text, good) {
  const el = $(selector);
  el.textContent = text;
  el.className = `message ${good === true ? 'good' : good === false ? 'bad' : ''}`;
}

async function connectGitHub() {
  const baseUrl = $('#serverUrl').value.trim().replace(/\/$/, '');
  const token = $('#computerToken').value;
  if (!baseUrl || !token) return message('#githubMessage', 'Enter the optional server URL and its access token to connect GitHub.', false);
  localStorage.synthaiServerUrl = baseUrl;
  localStorage.synthaiComputerToken = token;
  computer.configureGitHub({ baseUrl, token });
  $('#githubPanelState').textContent = 'CONNECTING';
  try {
    const result = await computer.backends.request('github', { action: 'status' });
    $('#githubStatus').textContent = 'VERIFIED';
    $('#githubPanelState').textContent = 'VERIFIED';
    $('#githubDetail').textContent = `connected as ${result.user}`;
    message('#githubMessage', `Verified GitHub connection as ${result.user}.`, true);
    await loadRepos();
  } catch (error) {
    $('#githubStatus').textContent = 'NOT CONNECTED';
    $('#githubPanelState').textContent = 'NOT CONNECTED';
    $('#githubDetail').textContent = 'optional GitHub connection unavailable';
    message('#githubMessage', error.message, false);
  }
}

async function loadRepos() {
  try {
    const result = await computer.backends.request('github', { action: 'list-repos' });
    const repos = result.repos || [];
    $('#repoCount').textContent = String(repos.length);
    $('#repoList').className = repos.length ? 'repo-list' : 'repo-list empty';
    $('#repoList').innerHTML = repos.length ? repos.map(repo =>
      `<div class="repo-row"><div><a class="repo-link" target="_blank" rel="noreferrer" href="${escapeHtml(repo.url)}"><strong>${escapeHtml(repo.fullName)}</strong></a><small>${escapeHtml(repo.defaultBranch)} · ${repo.private ? 'private' : 'public'}</small></div><span class="state">PRESENT</span></div>`
    ).join('') : 'No repositories returned.';
  } catch (error) {
    message('#githubMessage', error.message, false);
  }
}

$('#createProject').addEventListener('click', createProject);
$('#saveFile').addEventListener('click', saveFile);
$('#previewFile').addEventListener('click', preview);
$('#publishProject').addEventListener('click', publish);
$('#connectGitHub').addEventListener('click', connectGitHub);
$('#refreshRepos').addEventListener('click', loadRepos);
$('#projectPicker').addEventListener('change', event => setCurrentProject(event.target.value));
$('#clearActivity').addEventListener('click', () => { activity = []; renderActivity(); });

function homeIsVisible() {
  const home = $('#home');
  const heading = home?.querySelector('h2');
  const create = home?.querySelector('[data-go="build"]');
  const visible = element => {
    if (!element) return false;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility === 'visible'
      && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
  };
  return Boolean(home?.classList.contains('active') && visible(home) && visible(heading) && visible(create));
}

function runPhoneCheck() {
  show('home');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const allProjects = projects.list();
    const report = buildPhoneAcceptanceReport({
      androidHost: isAndroidApp,
      visibleHome: homeIsVisible(),
      runtimeStatus: $('#runtimeStatus').textContent.trim(),
      runtimeDetail: $('#runtimeDetail').textContent.trim(),
      services: computer.localBackendHealth?.services || [],
      projectCount: allProjects.length,
      onDeviceProjectCount: allProjects.filter(item => projects.source(item.id) === 'device').length,
      previousBootAt: previousPhoneBootAt,
      creatorAccepted: $('#creatorAccepted').checked,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      artifactSource: 'https://github.com/justappgrabbin/SynthAi/pull/24',
    });
    localStorage.synthaiPhoneAcceptanceReport = JSON.stringify(report);
    $('#phoneCheckState').textContent = report.state.toUpperCase();
    $('#phoneReport').textContent = JSON.stringify(report, null, 2);
    log('computer:phone-check', { state: report.state, checks: report.checks });
  }));
}

$('#runPhoneCheck').addEventListener('click', runPhoneCheck);
$('#copyPhoneReport').addEventListener('click', async () => {
  const text = $('#phoneReport').textContent;
  try {
    await navigator.clipboard.writeText(text);
    $('#copyPhoneReport').textContent = 'Copied';
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('#phoneReport'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    $('#copyPhoneReport').textContent = 'Selected';
  }
});


function runtimeState(status, detail) {
  console.info('LOCAL_COMPUTER_UI_STATUS=' + status);
  $('#bootDot').classList.toggle('good', status === 'VERIFIED');
  $('#bootDot').classList.toggle('bad', status === 'UNAVAILABLE');
  $('#bootLabel').textContent = status === 'VERIFIED' ? 'local Computer connected'
    : status === 'STARTING' ? 'starting local Computer' : 'browser workspace';
  $('#runtimeStatus').textContent = status;
  $('#runtimeDetail').textContent = detail;
  $('#runtimeEvidence').textContent = status === 'VERIFIED'
    ? 'Projects and files now run in the Linux Computer on this device. No server address is needed.'
    : status === 'STARTING'
      ? 'Starting the embedded Linux Computer. Project creation will be available when it finishes.'
      : `${detail} Browser projects remain accessible; new projects use browser storage until the local Computer connects.`;
  $('#projectStatus').textContent = status === 'VERIFIED' ? 'ON DEVICE' : status === 'STARTING' ? 'WAITING' : 'BROWSER';
  $('#createProject').disabled = status === 'STARTING';
  $('#workspaceNotice').textContent = status === 'VERIFIED'
    ? 'New projects are saved in the on-device Computer. Existing browser projects remain available in the project picker.'
    : status === 'STARTING' ? 'Waiting for the on-device Computer to start.'
      : 'New projects will be stored in this browser. Existing projects remain available.';
}

computer.bus.on('local-backend:verified', async event => {
  try {
    await projects.attach();
    runtimeState('VERIFIED', `${event.payload.environment} · ${event.payload.services.length} registered services · ${event.payload.version}`);
    renderProjects();
    renderSystems();
    if (currentProjectId && projects.get(currentProjectId)) await loadCurrentFile();
    log('workspace:on-device', { projects: projects.list().filter(p => projects.source(p.id) === 'device').length });
  } catch (error) {
    runtimeState('UNAVAILABLE', `Could not load on-device projects: ${error.message}`);
    log('workspace:failed', { error: error.message });
  }
});

window.addEventListener('synthai-local-backend-error', event => {
  const detail = String(event.detail?.message || 'The embedded Computer did not start.');
  runtimeState('UNAVAILABLE', detail);
  log('local-backend:unavailable', { error: detail });
});

const savedServer = localStorage.synthaiServerUrl;
const savedToken = localStorage.synthaiComputerToken;
if (savedServer) $('#serverUrl').value = savedServer;
if (savedToken) $('#computerToken').value = savedToken;

runtimeState(isAndroidApp ? 'STARTING' : 'BROWSER', isAndroidApp
  ? 'Waiting for the embedded Linux backend'
  : `Browser host ${computer.snapshot().version}; no on-device backend attached`);
$('#mountCount').textContent = `${computer.shellManager.listMounted().length} mounted`;

renderProjects();
renderSystems();
renderActivity();
if (currentProjectId && projects.get(currentProjectId)) loadCurrentFile();
if (window.SynthAIAndroidBackendError) runtimeState('UNAVAILABLE', window.SynthAIAndroidBackendError);

function verifyVisibleHome() {
  const painted = homeIsVisible();
  console.info('COMPUTER_HOME_VISIBLE=' + (painted ? 'true' : 'false'));
  if (!painted) log('computer:first-paint-failed', {});
}

const savedPhoneReport = localStorage.synthaiPhoneAcceptanceReport;
if (savedPhoneReport) {
  try {
    const report = JSON.parse(savedPhoneReport);
    $('#phoneCheckState').textContent = String(report.state || 'pending').toUpperCase();
    $('#phoneReport').textContent = JSON.stringify(report, null, 2);
  } catch {}
}

requestAnimationFrame(() => requestAnimationFrame(verifyVisibleHome));

if (!isAndroidApp && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(error => log('service-worker:failed', { error: String(error?.message ?? error) }));
}
