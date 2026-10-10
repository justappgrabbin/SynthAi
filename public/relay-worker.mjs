let browserToken = '';

export class RelayWorkerClient {
  constructor(computer, { onProject = () => {}, onMessage = () => {} } = {}) { Object.assign(this, { computer, onProject, onMessage }); }
  get token() { return globalThis.RelaySecrets?.getWorkerToken() || browserToken || ''; }
  get url() { return localStorage.getItem('relayWorkerUrl') || ''; }
  async request(path, options = {}) {
    if (!this.url || !this.token) throw new Error('Connect the worker first');
    const response = await fetch(this.url + path, { ...options, headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json', ...options.headers } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Worker returned ${response.status}`);
    return result;
  }
  async connect(url, token) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) throw new Error('Use an HTTPS worker address');
    localStorage.setItem('relayWorkerUrl', url.replace(/\/$/, ''));
    if (globalThis.RelaySecrets) { if (!RelaySecrets.saveWorkerToken(token)) throw new Error('Could not save the worker token securely'); }
    else browserToken = token;
    const status = await this.request('/api/worker/status');
    if (!status.workerActive) throw new Error('The server is reachable, but its worker is not running');
    return status;
  }
  async submit(spec) {
    // Keep the same request key after a lost response, so retry cannot duplicate a job.
    const previous = this.computer.state.get('relay.remoteSubmission', null);
    const pending = previous && JSON.stringify(previous.spec) === JSON.stringify(spec) ? previous : { spec, key: crypto.randomUUID() };
    await this.computer.state.set('relay.remoteSubmission', pending, { source: 'relay-worker' });
    const job = await this.request('/api/jobs', { method: 'POST', headers: { 'Idempotency-Key': pending.key }, body: JSON.stringify(spec) });
    await this.computer.state.set('relay.remoteSubmission', null, { source: 'relay-worker' });
    return job;
  }
  async importArtifact(jobId) {
    const key = `relay.remoteImports.${jobId}`;
    let local = this.computer.state.get(key, null);
    if (local?.status === 'imported') { this.onProject(local.projectId); return local; }
    const artifact = await this.request(`/api/jobs/${jobId}/artifact`);
    if (!local) {
      const project = await this.computer.projects.create({ name: artifact.project.name, description: artifact.project.description });
      local = { projectId: project.id, status: 'importing', workerUrl: this.url, jobId };
      await this.computer.state.set(key, local, { source: 'relay-worker' });
    }
    for (const file of artifact.project.files) await this.computer.projects.writeFile(local.projectId, file.path, file.content, { type: file.type });
    await this.computer.projects.writeFile(local.projectId, 'worker-receipt.json', JSON.stringify({ jobId, workerUrl: this.url, verification: artifact.verification }, null, 2), { type: 'application/json' });
    local.status = 'imported'; await this.computer.state.set(key, local, { source: 'relay-worker' });
    this.onProject(local.projectId); return local;
  }
}

export function mountWorkerPanel(client) {
  const $ = id => document.getElementById(id);
  $('workerUrl').value = client.url;
  const report = message => { $('workerMessage').textContent = message; };
  async function refresh() {
    try {
      const { jobs } = await client.request('/api/jobs');
      $('workerJobs').replaceChildren();
      for (const job of jobs.slice().reverse()) {
        const row = document.createElement('div'); row.className = 'activity-row';
        const text = document.createElement('span'); text.textContent = `${job.spec.name}: ${job.status} (${job.stage})${job.error ? ' — ' + job.error : ''}`; row.append(text);
        if (job.status === 'verified') {
          const open = document.createElement('button'); open.textContent = 'Bring into Relay';
          open.onclick = async () => { try { await client.importArtifact(job.id); report('Verified app saved in your workspace. Use Open app to run it.'); } catch (error) { report(error.message); } };
          row.append(open);
        }
        $('workerJobs').append(row);
      }
      if (!jobs.length) report('Worker connected. No submitted jobs yet.');
    } catch (error) { report(error.message); }
  }
  $('connectWorker').onclick = async () => {
    try { await client.connect($('workerUrl').value.trim(), $('workerToken').value); $('workerToken').value = ''; report('Worker is running. Builds continue while Relay is closed.'); await refresh(); }
    catch (error) { report(error.message); }
  };
  $('refreshWorker').onclick = refresh;
  $('backgroundBuild').onclick = async () => {
    try {
      const name = $('projectName').value.trim(); const description = $('projectDescription').value.trim();
      const job = await client.submit({ name, description, kind: /note|journal/i.test(description) ? 'notes' : 'tasks' });
      report(`Job ${job.id.slice(0, 8)} saved on the worker. You can close Relay.`); await refresh();
    } catch (error) { report(error.message); }
  };
  if (client.url && client.token) refresh();
  const interval = setInterval(() => { if (client.url && client.token && !document.hidden) refresh(); }, 5000);
  window.addEventListener('pagehide', () => clearInterval(interval), { once: true });
}
