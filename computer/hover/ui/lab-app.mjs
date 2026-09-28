const $ = (selector) => document.querySelector(selector);
const pretty = (value) => JSON.stringify(value, null, 2);
let catalog = [];
let identityConfigured = false;

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const value = await response.json();
  if (!response.ok || value.ok === false) throw new Error(value.error ?? `request failed: ${response.status}`);
  return value;
}

function setPanel(id) {
  document.querySelectorAll('.panel').forEach((node) => node.classList.toggle('active', node.id === id));
  document.querySelectorAll('.nav').forEach((node) => node.classList.toggle('active', node.dataset.panel === id));
  if (id === 'outbox') loadProposals();
}
document.querySelectorAll('.nav').forEach((button) => button.addEventListener('click', () => setPanel(button.dataset.panel)));

async function loadStatus() {
  const status = await api('/api/status');
  $('.system-state').classList.toggle('live', status.ready);
  $('#state-label').textContent = status.ready ? 'configured organism live' : status.structurallyReady ? 'birth configuration required' : 'attention required';
  const labels = { liveProcesses: 'live processes', hands: 'hands', meshes: 'local meshes', channels: 'channels', instruments: 'instruments', aspects: 'agent traits', codons: 'hexagram codons' };
  $('#metrics').innerHTML = Object.entries(status.counts).map(([key, value]) => `<div class="metric"><strong>${value}</strong><span>${labels[key]}</span></div>`).join('');
  $('#dimensions').innerHTML = status.dimensions.map((dimension, index) => `<div class="dimension">0${index + 1} · ${dimension}</div>`).join('');
}

function lockPersonalizedSurfaces() {
  for (const selector of ['#chat-input', '#chat-form button', '#run-instrument', '#save-agent-chart', '#run-genome']) {
    const node = $(selector);
    if (node) node.disabled = !identityConfigured;
  }
}

function renderIdentity(identity) {
  identityConfigured = identity.configured === true;
  $('#identity-card').classList.toggle('configured', identityConfigured);
  $('#identity-state').textContent = identityConfigured ? `${identity.status} · persisted mirror active` : 'configuration required';
  $('#identity-form').hidden = identityConfigured;
  if (!identityConfigured) {
    $('#identity-summary').innerHTML = '<div class="identity-warning">Personalized chat, execution, and genome controls remain locked until this path succeeds. Diagnostic code may exist, but it is not presented as your mirror.</div>';
  } else {
    const facts = [
      ['Type', identity.type],
      ['Authority', identity.authority],
      ['Profile', identity.profile],
      ['Definition', identity.definition],
      ['Dimension × planets', identity.fiveDimensionIntersections],
      ['Exact seconds', identity.exactSecondsPreserved ? 'preserved' : 'not preserved'],
      ['Swarm mirror', identity.configurationId],
      ['Coordinate', identity.coordinateSignature],
    ];
    const blockers = (identity.blockers ?? []).filter((entry) => entry.status !== 'WIRED');
    $('#identity-summary').innerHTML = facts.map(([label, value]) => `<div class="identity-fact"><span>${label}</span><strong>${value}</strong></div>`).join('')
      + blockers.map((entry) => `<div class="identity-warning"><strong>${entry.status}</strong> · ${entry.detail}</div>`).join('');
  }
  lockPersonalizedSurfaces();
}

async function loadIdentity() {
  const data = await api('/api/identity');
  renderIdentity(data.identity);
  return data.identity;
}

$('#identity-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.submitter;
  try {
    button.disabled = true;
    $('#identity-state').textContent = 'calculating chart and wiring the organism…';
    const result = await api('/api/identity/configure', {
      method: 'POST',
      body: JSON.stringify({
        personId: 'front-screen',
        agentId: 'synthia',
        birthDate: $('#birth-date').value,
        birthTime: $('#birth-time').value,
        disambiguation: $('#birth-disambiguation').value,
        place: {
          label: $('#birth-place').value,
          latitude: Number($('#birth-latitude').value),
          longitude: Number($('#birth-longitude').value),
          timeZone: $('#birth-timezone').value,
        },
      }),
    });
    renderIdentity(result.identity);
    await Promise.all([loadStatus(), loadGenome(), loadTray()]);
  } catch (error) {
    $('#identity-state').textContent = 'configuration failed';
    $('#identity-summary').innerHTML = `<div class="identity-warning">${error.message}</div>`;
  } finally {
    button.disabled = false;
  }
});

function refreshInstrumentList() {
  const kind = $('#tray-kind').value;
  const entries = catalog.filter((entry) => entry.kind === kind);
  $('#tray-id').innerHTML = entries.map((entry) => `<option value="${entry.id}">${entry.label}</option>`).join('');
  refreshMeta();
}
function refreshMeta() {
  const entry = catalog.find((candidate) => candidate.kind === $('#tray-kind').value && candidate.id === $('#tray-id').value);
  $('#instrument-meta').textContent = entry ? `${entry.center ? `${entry.center}${entry.gate ? ` · Gate ${entry.gate}` : ''} · ` : ''}${(entry.capabilities ?? []).join(' · ')}` : '';
}
async function loadTray() {
  const data = await api('/api/tray');
  catalog = data.instruments;
  const kinds = [...new Set(catalog.map((entry) => entry.kind))];
  $('#tray-kind').innerHTML = kinds.map((kind) => `<option value="${kind}">${kind}</option>`).join('');
  refreshInstrumentList();
}
let generatedToolId = null;
$('#factory-create').addEventListener('click', async () => {
  const button = $('#factory-create');
  generatedToolId = null;
  $('#factory-run').disabled = true;
  try {
    button.disabled = true;
    $('#factory-state').textContent = 'generating…';
    const result = await api('/api/solo/tool-factory', {
      method: 'POST',
      body: JSON.stringify({ operation: 'synthesize', purpose: $('#factory-purpose').value.trim(), dimension: $('#factory-dimension').value, level: Number($('#factory-level').value) }),
    });
    const output = result.execution.output;
    if (!output?.tool?.id || !['mounted', 'existing'].includes(output.status)) throw new Error(output?.reason ?? `Tool was not mounted: ${output?.status ?? 'unknown'}`);
    generatedToolId = output.tool.id;
    $('#factory-run').disabled = false;
    $('#factory-state').textContent = output.status;
    $('#factory-output').textContent = pretty(output);
  } catch (error) {
    $('#factory-state').textContent = 'failed';
    $('#factory-output').textContent = `${error.name}: ${error.message}`;
  } finally { button.disabled = false; }
});
$('#factory-run').addEventListener('click', async () => {
  if (!generatedToolId) return;
  const button = $('#factory-run');
  try {
    button.disabled = true;
    $('#factory-state').textContent = 'running…';
    const result = await api('/api/solo/tool-factory', {
      method: 'POST', body: JSON.stringify({ operation: 'run', id: generatedToolId, input: $('#factory-input').value }),
    });
    $('#factory-state').textContent = 'executed';
    $('#factory-output').textContent = pretty(result.execution.output);
  } catch (error) {
    $('#factory-state').textContent = 'failed';
    $('#factory-output').textContent = `${error.name}: ${error.message}`;
  } finally { button.disabled = false; }
});

async function residentAction(buttonId, stateId, outputId, action) {
  const button = $(buttonId);
  try {
    button.disabled = true;
    $(stateId).textContent = 'working…';
    const result = await action();
    $(outputId).textContent = pretty(result);
    $(stateId).textContent = result?.ok === false ? result.status || 'failed' : 'complete';
  } catch (error) {
    $(stateId).textContent = 'failed';
    $(outputId).textContent = `${error.name}: ${error.message}`;
  } finally { button.disabled = false; }
}
const residentPost = (path, body) => api(`/api/solo/organism/${path}`, { method: 'POST', body: JSON.stringify(body) });
api('/api/solo/organism/status').then(({ diagnostics }) => {
  $('#resident17-state').textContent = `${diagnostics.stateToolField.registeredTools} tools · ${diagnostics.stateToolField.programs} programs`;
}).catch((error) => { $('#resident17-state').textContent = `offline · ${error.message}`; });
$('#resident17-process').addEventListener('click', () => residentAction('#resident17-process', '#resident17-state', '#resident17-output', async () => {
  const input = $('#resident17-input').value.trim();
  if (!input) throw new Error('Enter work for the organism.');
  return (await residentPost('process', { input })).result;
}));
$('#resident17-grow').addEventListener('click', () => residentAction('#resident17-grow', '#resident17-state', '#resident17-output', async () => {
  const purpose = $('#resident17-purpose').value.trim();
  if (!purpose) throw new Error('Enter a tool purpose.');
  return (await residentPost('grow', { purpose, input: purpose, dimension: $('#resident17-dimension').value })).result;
}));
$('#resident17-register').addEventListener('click', () => residentAction('#resident17-register', '#resident17-state', '#resident17-output', async () => {
  const id = $('#resident17-program-id').value.trim();
  const steps = $('#resident17-program-steps').value.split(',').map((step) => step.trim()).filter(Boolean);
  if (!id || !steps.length) throw new Error('Enter a program name and at least one tool ID.');
  return (await residentPost('program', { operation: 'register', program: { id, steps } })).result;
}));
$('#resident17-run').addEventListener('click', () => residentAction('#resident17-run', '#resident17-state', '#resident17-output', async () => {
  const id = $('#resident17-program-id').value.trim();
  if (!id) throw new Error('Enter the saved program name.');
  const value = $('#resident17-program-input').value.trim();
  let input = value;
  if (value.startsWith('{') || value.startsWith('[')) input = JSON.parse(value);
  return (await residentPost('program', { operation: 'run', id, input })).result;
}));

const businessOpportunities = [];
$('#business-add').addEventListener('click', () => {
  const title = $('#business-title').value.trim();
  const fields = ['revenue', 'cost', 'hours', 'time', 'evidence', 'readiness', 'risk'];
  const numbers = fields.map((key) => Number($(`#business-${key}`).value));
  if (!title || fields.some((key) => $(`#business-${key}`).value === '') || numbers.some((n) => !Number.isFinite(n)) || numbers.slice(0, 4).some((n) => n < 0) || numbers[2] <= 0 || numbers.slice(4).some((n) => n < 0 || n > 1)) {
    $('#business-state').textContent = 'enter valid costs, timing, evidence, readiness, and risk';
    return;
  }
  const [expectedRevenue, upfrontCost, timeHours, timeToCashHours, evidence, readiness, risk] = numbers;
  businessOpportunities.push({ id: `opportunity-${Date.now()}-${businessOpportunities.length}`, title, expectedRevenue, upfrontCost, timeHours, timeToCashHours, evidence, readiness, risk });
  $('#business-list').textContent = businessOpportunities.map((item) => item.title).join(' · ');
  $('#business-state').textContent = `${businessOpportunities.length} opportunities`;
});
$('#business-evaluate').addEventListener('click', () => residentAction('#business-evaluate', '#business-state', '#business-output', async () => {
  if (!businessOpportunities.length) throw new Error('Add an opportunity first.');
  const context = {};
  if ($('#business-cash').value !== '') context.cashAvailable = Number($('#business-cash').value);
  if ($('#business-deadline').value !== '') context.deadlineHours = Number($('#business-deadline').value);
  const { decision, explanation } = (await residentPost('business', { opportunities: businessOpportunities, context })).result;
  return { ranking: decision.ranked.map((item) => ({ title: item.title, score: item.score, economics: item.economics, risks: item.risks, approvalRequired: item.approvalRequired })), explanation };
}));
$('#tray-kind').addEventListener('change', refreshInstrumentList);
$('#tray-id').addEventListener('change', refreshMeta);
$('#run-instrument').addEventListener('click', async () => {
  const button = $('#run-instrument');
  try {
    button.disabled = true; $('#run-state').textContent = 'running through live mesh…';
    const input = JSON.parse($('#tray-input').value || '{}');
    const result = await api('/api/tray', { method: 'POST', body: JSON.stringify({ kind: $('#tray-kind').value, id: $('#tray-id').value, input, context: { personId: 'front-screen' } }) });
    $('#tray-output').textContent = pretty(result); $('#run-state').textContent = 'complete';
  } catch (error) { $('#tray-output').textContent = `${error.name}: ${error.message}`; $('#run-state').textContent = 'failed'; }
  finally { button.disabled = false; }
});

$('#chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input'); const text = input.value.trim(); if (!text) return;
  const log = $('#chat-log');
  log.insertAdjacentHTML('beforeend', `<div class="message user"></div>`); log.lastElementChild.textContent = text;
  input.value = ''; const button = event.submitter; button.disabled = true;
  try {
    const result = await api('/api/chat', { method: 'POST', body: JSON.stringify({ message: text, context: { personId: 'front-screen' } }) });
    log.insertAdjacentHTML('beforeend', '<div class="message synthia"></div>'); log.lastElementChild.textContent = result.utterance;
    log.insertAdjacentHTML('beforeend', '<div class="message trace"></div>');
    log.lastElementChild.textContent = `Trace · ${result.pipelineTrace.map((entry) => entry.stage).join(' → ')} · coordinated ${result.coordination.participants.length} population instruments · ${result.federation.centers.channels.length} active channel path(s)`;
  } catch (error) { log.insertAdjacentHTML('beforeend', '<div class="message trace"></div>'); log.lastElementChild.textContent = error.message; }
  finally { button.disabled = false; log.scrollTop = log.scrollHeight; }
});

async function loadChannels() {
  const data = await api('/api/channels');
  $('#channel-grid').innerHTML = data.channels.map((channel) => `<article class="channel"><strong>${channel.id}</strong><h3>${channel.name}</h3><p>${channel.gates.join(' ↔ ')} · higher-order opposite-equivalent composite</p><span class="status">${channel.analogueClaimStatus}</span></article>`).join('');
}

function renderSensory(senses) {
  if (!senses) { $('#sensory-result').innerHTML = ''; return; }
  const entries = [
    ['Feeling', `${senses.feeling.quality} · ${senses.feeling.faculty}`],
    ['Voice', `${senses.voice.timbre} · ${senses.voice.prosody} · ${senses.voice.rateWpm} wpm`],
    ['Taste', senses.taste.primary],
    ['Smell', senses.smell.primary],
    ['Color', senses.color.css],
    ['Shape', senses.shape.geometry],
    ['Sound', `${senses.sound.timbre} · ${senses.sound.pitchHz} Hz`],
    ['Intake', `${senses.intake.primaryChannel} · ${senses.intake.lighting}`],
  ];
  $('#sensory-result').innerHTML = entries.map(([label, value]) => `<div class="sense"><span>${label}</span><strong>${value}</strong></div>`).join('');
}

function exactGenomeAddress() {
  return {
    planetary: Number($('#genome-planetary').value),
    dimension: $('#genome-dimension').value,
    gate: Number($('#genome-gate').value),
    line: Number($('#genome-line').value),
    color: Number($('#genome-color').value),
    tone: Number($('#genome-tone').value),
    base: Number($('#genome-base').value),
    degree: Number($('#genome-degree').value),
    minute: Number($('#genome-minute').value),
    second: Number($('#genome-second').value),
    arc: Number($('#genome-arc').value),
    zodiac: Number($('#genome-zodiac').value),
    house: Number($('#genome-house').value),
  };
}

function showAgentAddress(address) {
  if (!address) return;
  $('#genome-planetary').value = address.planetary;
  $('#genome-dimension').value = address.dimension;
  $('#genome-gate').value = address.gate;
  $('#genome-line').value = address.line;
  $('#genome-color').value = address.color;
  $('#genome-tone').value = address.tone;
  $('#genome-base').value = address.base;
  $('#genome-degree').value = address.degree;
  $('#genome-minute').value = address.minute;
  $('#genome-second').value = address.second;
  $('#genome-arc').value = address.arc;
  $('#genome-zodiac').value = address.zodiac;
  $('#genome-house').value = address.house;
}

async function loadGenome() {
  const data = await api('/api/genome');
  const synthiaChart = data.snapshot.agentChartCatalog.find((chart) => chart.agentId === 'synthia');
  showAgentAddress(synthiaChart?.address);
  $('#genome-grid').innerHTML = data.catalog.map((codon) => `<button class="codon" data-gate="${codon.gate}"><strong>${codon.gate}</strong><span>${codon.center}</span><small>12 traits · 6 dyads</small></button>`).join('');
  document.querySelectorAll('.codon').forEach((button) => button.addEventListener('click', () => {
    $('#genome-gate').value = button.dataset.gate;
    document.querySelectorAll('.codon').forEach((node) => node.classList.toggle('selected', node === button));
  }));
}

$('#save-agent-chart').addEventListener('click', async () => {
  const button = $('#save-agent-chart');
  try {
    button.disabled = true; $('#genome-state').textContent = 'saving exact chart…';
    const agentId = $('#genome-agent').value.trim() || 'synthia';
    const result = await api('/api/genome', {
      method: 'POST',
      body: JSON.stringify({
        input: { operation: 'register-agent-chart', agentId, address: exactGenomeAddress(), replace: true },
        context: { agentId, personId: 'front-screen' },
      }),
    });
    $('#genome-output').textContent = pretty(result.result);
    $('#genome-state').textContent = `saved · ${result.result.coordinateSignature}`;
  } catch (error) {
    $('#genome-output').textContent = `${error.name}: ${error.message}`;
    $('#genome-state').textContent = 'save failed';
  } finally { button.disabled = false; }
});

$('#run-genome').addEventListener('click', async () => {
  const button = $('#run-genome');
  const gate = Number($('#genome-gate').value);
  const line = Number($('#genome-line').value);
  const address = exactGenomeAddress();
  const agentId = $('#genome-agent').value.trim() || 'synthia';
  try {
    button.disabled = true; $('#genome-state').textContent = 'configuring agent genome…';
    const result = await api('/api/genome', {
      method: 'POST',
      body: JSON.stringify({
        input: {
          operation: $('#genome-operation').value,
          task: $('#genome-task').value,
          gate,
          line,
          address,
        },
        context: { personId: 'front-screen', agentId },
      }),
    });
    const senses = result.result.sensoryExpression ?? result.result.renderContract?.sensoryExpression ?? null;
    renderSensory(senses);
    $('#genome-output').textContent = pretty(result.result);
    $('#genome-state').textContent = 'complete';
  } catch (error) {
    $('#genome-output').textContent = `${error.name}: ${error.message}`;
    $('#genome-state').textContent = 'failed';
  } finally { button.disabled = false; }
});

async function proposalAction(operation, proposalId) {
  await api('/api/proposals', { method: 'POST', body: JSON.stringify({ operation, proposalId }) });
  await loadProposals();
}
async function loadProposals() {
  const data = await api('/api/proposals');
  const pending = data.proposals.filter((proposal) => proposal.status === 'pending');
  $('#proposal-list').innerHTML = pending.length ? pending.map((proposal) => `<article class="proposal"><header><strong>${proposal.kind}</strong><span>${proposal.flow} · ${proposal.status}</span></header><p>${proposal.proposedChange.description ?? proposal.reasoning}</p><p>${proposal.reasoning}</p><div class="actions"><button data-accept="${proposal.id}">Accept</button><button data-dismiss="${proposal.id}">Dismiss</button></div></article>`).join('') : '<div class="empty">No pending proposals. The append-only ledger remains available in the API.</div>';
  document.querySelectorAll('[data-accept]').forEach((button) => button.addEventListener('click', () => proposalAction('accept', button.dataset.accept)));
  document.querySelectorAll('[data-dismiss]').forEach((button) => button.addEventListener('click', () => proposalAction('dismiss', button.dataset.dismiss)));
}

Promise.all([loadStatus(), loadIdentity(), loadTray(), loadGenome(), loadChannels()]).catch((error) => {
  $('#state-label').textContent = `offline · ${error.message}`;
});

if (location.hash === '#tray') setPanel('tray');
