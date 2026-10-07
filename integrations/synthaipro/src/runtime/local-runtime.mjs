import { EventBus, Registry, StateStore, LocalStoragePersistence } from './vendor/kernel.mjs';
import { AutomataEngine } from './vendor/execution.mjs';

export class LocalRuntime {
  constructor({ persistence = new LocalStoragePersistence() } = {}) {
    this.bus = new EventBus();
    this.state = new StateStore({ bus: this.bus, persistence, namespace: 'synthaipro-local-v1' });
    this.engine = new AutomataEngine({ bus: this.bus, state: this.state,
      automata: new Registry({ kind: 'automaton', bus: this.bus }), tools: new Registry({ kind: 'tool' }) });
    this.engine.register({ id: 'build-page', execute: ({ input }) => {
      const title = escapeHtml(input.trim() || 'My app');
      return { name: input.trim() || 'My app', source: `<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui;padding:24px;background:#101620;color:white}button{padding:16px;border:0;border-radius:12px;background:#f5c518}textarea{display:block;width:95%;height:160px;margin:20px 0}</style><h1>${title}</h1><p>Your editable JavaScript app.</p><textarea placeholder="Write something…"></textarea><button id="counter">Count: 0</button><script>let count=0;document.querySelector('#counter').onclick=event=>event.target.textContent='Count: '+(++count);</script></html>` };
    } });
  }
  async boot() { await this.state.restore(); return this; }
  list() { return Object.values(this.state.get('apps', {})); }
  async save({ id = crypto.randomUUID(), name, source }) {
    if (!name || typeof source !== 'string') throw new Error('App name and source are required.');
    const app = { id, name, source, updatedAt: Date.now() };
    await this.state.set(`apps.${id}`, app);
    return app;
  }
  async build(title) { return this.save(await this.engine.run('build-page', title)); }
  async ingest(file) {
    if (!/\.(html?|js|mjs)$/i.test(file.name)) throw new Error('Local execution supports HTML and JavaScript files. ZIP, JSX, and native programs need additional adapters.');
    const text = await file.text();
    const source = /\.html?$/i.test(file.name) ? text : `<!doctype html><html><body><script type="module">${text.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
    return this.save({ name: file.name, source });
  }
}
function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
