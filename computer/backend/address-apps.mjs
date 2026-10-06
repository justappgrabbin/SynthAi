import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const defaults = [
  { address: 'app://computer/files', name: 'Files', view: 'files', types: ['*'], reason: 'Keep and inspect files on this device.' },
  { address: 'app://computer/build', name: 'Build', view: 'build', types: ['text/', 'application/json'], reason: 'This file can be used in your local project workspace.' },
  { address: 'app://computer/realm', name: 'Consciousness Realm', view: 'world', types: ['image/'], reason: 'Use your picture or authored animation sheet in your world.' },
  { address: 'app://computer/resonance', name: 'Resonance Network', view: 'resonance', types: ['application/json'], reason: 'Inspect profile data with the Resonance app.' },
  { address: 'app://computer/synthworld', name: 'Synthworld', launch: 'synthai://synthworld', types: [], reason: 'Open the native game.' },
  { address: 'app://computer/admin', name: 'Owner admin', view: 'admin', types: [], reason: 'Manage app availability, schedules and your GPT plugin.' }
];
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const pinHash = (pin, salt) => scryptSync(String(pin), salt, 32);

export class AddressApps {
  constructor({ state, vfs, privateStore, fetchImpl = globalThis.fetch, now = () => Date.now() }) {
    Object.assign(this, { state, vfs, privateStore, fetchImpl, now });
    this.sessions = new Map();
  }
  async boot() {
    this.owner = await this.privateStore.load('address-app-owner') ?? null;
    this.gpt = await this.privateStore.load('address-app-gpt') ?? null;
    return this;
  }
  settings() { return this.state.get('addressApps.settings', { enabled: true, suggestions: true, disabled: [] }); }
  apps() { const settings = this.settings(); return defaults.map(app => ({ ...app, enabled: !settings.disabled.includes(app.address) })); }
  resolve(address) {
    if (!this.settings().enabled) fail('Address app system is disabled in Settings.');
    const app = this.apps().find(app => app.address === address);
    if (!app?.enabled) fail('App address is unknown or disabled.');
    return app;
  }
  snapshot() {
    return { apps: this.apps(), settings: this.settings(), files: this.state.get('addressApps.files', []), schedules: this.state.get('addressApps.schedules', []), adminConfigured: !!this.owner, gptConfigured: !!this.gpt?.key, gptModel: this.gpt?.model ?? 'gpt-4.1-mini' };
  }
  async setup(pin) {
    if (this.owner) fail('Owner already configured.', 409);
    if (!/^\d{6,12}$/.test(String(pin))) fail('Choose an owner PIN with 6–12 digits.');
    const salt = randomBytes(16).toString('hex');
    this.owner = { salt, hash: pinHash(pin, salt).toString('hex') };
    await this.privateStore.save('address-app-owner', this.owner);
    return this.login(pin);
  }
  login(pin) {
    if (this.lockUntil > this.now()) fail('Too many attempts. Try again in one minute.', 429);
    if (!this.owner || !timingSafeEqual(pinHash(pin, this.owner.salt), Buffer.from(this.owner.hash, 'hex'))) {
      this.failures = (this.failures ?? 0) + 1;
      if (this.failures >= 5) { this.lockUntil = this.now() + 60000; this.failures = 0; }
      fail('Incorrect owner PIN.', 401);
    }
    this.failures = 0;
    const session = randomBytes(32).toString('hex');
    this.sessions.set(session, this.now() + 15 * 60000);
    return { session, expiresAt: this.sessions.get(session) };
  }
  admin(session) {
    if (!session || (this.sessions.get(session) ?? 0) <= this.now()) fail('Unlock owner admin first.', 401);
  }
  logout(session) { this.sessions.delete(session); return { locked: true }; }
  async configure(session, patch) {
    this.admin(session);
    const settings = this.settings();
    for (const key of ['enabled', 'suggestions']) if (key in patch) settings[key] = !!patch[key];
    if (patch.address) {
      if (!defaults.some(app => app.address === patch.address) || patch.address === 'app://computer/admin') fail('This app cannot be disabled.');
      settings.disabled = settings.disabled.filter(address => address !== patch.address);
      if (patch.disabled) settings.disabled.push(patch.address);
    }
    await this.state.set('addressApps.settings', settings);
    return this.snapshot();
  }
  async importFile({ name, type = 'application/octet-stream', base64, address = 'app://computer/files' } = {}) {
    this.resolve(address);
    if (typeof name !== 'string' || !name || name.length > 200 || /[\\/\u0000-\u001f]/.test(name)) fail('Use a file name without path separators.');
    if (typeof base64 !== 'string' || base64.length > 2800000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) fail('Invalid file or file larger than 2 MB.');
    if (typeof type !== 'string' || type.length > 150) fail('Invalid file type.');
    if (Buffer.from(base64, 'base64').length > 2 * 1024 * 1024) fail('File larger than 2 MB.');
    const id = randomUUID();
    const file = { id, name, type, bytes: Buffer.from(base64, 'base64').length, address, path: `/app-files/${id}`, importedAt: this.now() };
    await this.vfs.write(file.path, base64, { encoding: 'base64', name, type });
    const files = this.state.get('addressApps.files', []);
    files.push(file);
    await this.state.set('addressApps.files', files);
    return file;
  }
  async routeFile(id, address) {
    this.resolve(address);
    const files = this.state.get('addressApps.files', []);
    const file = files.find(file => file.id === id);
    if (!file) fail('Unknown file.');
    file.address = address;
    file.routedAt = this.now();
    await this.state.set('addressApps.files', files);
    return { file, app: this.resolve(address), delivery: 'private-inbox', executed: false };
  }
  readFile(id) {
    const file = this.state.get('addressApps.files', []).find(file => file.id === id);
    if (!file) fail('Unknown file.');
    return { ...file, base64: this.vfs.read(file.path)?.content };
  }
  suggestions({ type = '', context = 'home' } = {}) {
    if (!this.settings().enabled || !this.settings().suggestions) return [];
    const due = this.state.get('addressApps.schedules', []).filter(item => item.at >= this.now() - 60000 && item.at <= this.now() + 15 * 60000);
    return this.apps().filter(app => app.enabled && (app.types.some(t => t !== '*' && type.startsWith(t)) || due.some(item => item.address === app.address))).map(app => {
      const scheduled = due.find(item => item.address === app.address);
      return { ...app, reason: scheduled ? `You scheduled “${scheduled.label}” for ${new Date(scheduled.at).toISOString()}.` : app.reason, context, dueAt: scheduled?.at ?? null, automaticExecution: false };
    });
  }
  async schedule(session, { address, at, label }) {
    this.admin(session);
    this.resolve(address);
    if (!Number.isFinite(at) || at <= this.now()) fail('Choose a future time.');
    if (typeof label !== 'string' || !label.trim() || label.length > 200) fail('Use a short activity label.');
    const schedules = this.state.get('addressApps.schedules', []);
    const item = { id: randomUUID(), address, at, label: label.trim() };
    schedules.push(item);
    await this.state.set('addressApps.schedules', schedules);
    return item;
  }
  async cancel(session, id) {
    this.admin(session);
    await this.state.set('addressApps.schedules', this.state.get('addressApps.schedules', []).filter(item => item.id !== id));
    return this.snapshot();
  }
  async configureGPT(session, { key, model = 'gpt-4.1-mini' }) {
    this.admin(session);
    if (typeof key !== 'string' || key.length > 500 || !/^gpt-[a-zA-Z0-9._-]+$/.test(model)) fail('Invalid GPT configuration.');
    this.gpt = key.trim() ? { key: key.trim(), model } : null;
    await this.privateStore.save('address-app-gpt', this.gpt);
    return { configured: !!this.gpt, model };
  }
  async chat(session, text) {
    this.admin(session);
    if (!this.gpt?.key) fail('Configure an OpenAI API key in owner admin first.');
    if (typeof text !== 'string' || !text.trim() || text.length > 12000) fail('Enter a message of at most 12,000 characters.');
    const response = await this.fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${this.gpt.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.gpt.model, input: text, instructions: 'You are the owner-admin assistant for a phone computer. Explain clearly. You have no execution tools; do not claim to change settings or files.', max_output_tokens: 1500, store: false }), signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) fail(`GPT request failed (HTTP ${response.status}). Check your API key and model access.`, 502);
    const result = await response.json();
    return { text: (result.output ?? []).flatMap(item => item.content ?? []).filter(item => item.type === 'output_text').map(item => item.text).join('\n'), model: this.gpt.model };
  }
}
