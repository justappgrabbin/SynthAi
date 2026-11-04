import { AutoLingMemory, autoLingAutomaton, AutoNovelMemory, autoNovelAutomaton } from '../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/vendor/ato-core/src/klein-tools.mjs';

// Integration rules for this bounded builder, not changes to the swarm model.
export class RelayBuilder {
  constructor(computer) {
    this.computer = computer;
    const grammar = new AutoLingMemory();
    for (const kind of ['tasks', 'notes', 'budget', 'experiments']) grammar.learn({ id: `relay.${kind}`, relation: kind, pattern: ['build', kind], template: `build ${kind}` });
    this.language = autoLingAutomaton({ memory: grammar });
    this.composer = autoNovelAutomaton({ memory: new AutoNovelMemory() });
    this.draining = null;
  }

  async enqueue(spec) {
    const task = { id: crypto.randomUUID(), spec, status: 'queued', createdAt: Date.now() };
    await this.computer.state.set(`relay.tasks.${task.id}`, task, { source: 'relay' });
    return task;
  }

  drain() {
    if (this.draining) return this.draining;
    this.draining = this.runPending().finally(() => { this.draining = null; });
    return this.draining;
  }

  async runPending() {
    for (const task of Object.values(this.computer.state.get('relay.tasks', {}))) {
      if (!['queued', 'running'].includes(task.status)) continue;
      const path = `relay.tasks.${task.id}`;
      try {
        task.status = 'running';
        if (!task.projectId) {
          const project = await this.computer.projects.create({ name: task.spec.name, description: task.spec.description });
          task.projectId = project.id;
        }
        await this.computer.state.set(path, task, { source: 'relay' });
        await this.build({ ...task.spec, projectId: task.projectId });
        task.status = 'built'; task.finishedAt = Date.now();
      } catch (error) { task.status = 'failed'; task.error = error.message; }
      await this.computer.state.set(path, task, { source: 'relay' });
    }
    return this.computer.state.get('relay.tasks', {});
  }

  async build({ name = 'My Tasks', description = '', kind = 'tasks', projectId = null } = {}) {
    const recognized = await this.language.call({ operation: 'recognize', text: `build ${kind}` });
    if (!recognized.ok) throw new Error('This builder currently supports task trackers, notebooks, budget trackers, and experiment logs. Other builds need additional executable rules.');
    const project = projectId ? this.computer.projects.get(projectId) : await this.computer.projects.create({ name, description });
    const title = String(name).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const key = `relay-app-${project.id}`;
    const entry = kind === 'experiments'
      ? '<input id="text" aria-label="Hypothesis" placeholder="Hypothesis" required><textarea id="observation" aria-label="Observation" placeholder="Observation" required></textarea><select id="outcome" aria-label="Outcome"><option>Inconclusive</option><option>Supported</option><option>Not supported</option></select><button>Add observation</button>'
      : kind === 'budget'
      ? '<input id="text" aria-label="Expense" placeholder="Expense" required><input id="amount" aria-label="Amount" inputmode="decimal" type="number" min="0" step="0.01" placeholder="0.00" required><button>Add expense</button>'
      : `<${kind === 'notes' ? 'textarea' : 'input'} id="text" aria-label="${kind === 'notes' ? 'New note' : 'New task'}" required></${kind === 'notes' ? 'textarea' : 'input'}><button>Add ${kind === 'notes' ? 'note' : 'task'}</button>`;
    const summary = kind === 'budget' ? '<p id="total" aria-live="polite">Total: $0.00</p>' : '';
    const document = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:18px system-ui;background:#141824;color:#eef0f8;max-width:720px;margin:auto;padding:24px}input,textarea,button{font:inherit;padding:12px;border-radius:8px;margin:5px 0}input,textarea{box-sizing:border-box;width:100%}button{cursor:pointer}li{padding:12px;white-space:pre-wrap;overflow-wrap:anywhere}.done{text-decoration:line-through;opacity:.6}small{color:#bbc3da}#total{font-size:1.4rem;font-weight:700}</style></head><body><h1>${title}</h1><small>Saved on this device. Export JSON to keep a separate backup.</small><form id="entry">${entry}</form>${summary}<ul id="items"></ul><button id="export">Export JSON</button>`;
    const program = `const key=${JSON.stringify(key)},kind=${JSON.stringify(kind)};let items=JSON.parse(localStorage.getItem(key)||'[]');const list=document.getElementById('items');function save(){localStorage.setItem(key,JSON.stringify(items));render()}function render(){list.replaceChildren();items.forEach(item=>{const row=document.createElement('li');const text=document.createElement('span');text.textContent=kind==='budget'?item.text+' — $'+item.amount.toFixed(2):kind==='experiments'?item.text+' — '+item.observation+' ['+item.outcome+']':item.text;text.className=item.done?'done':'';row.append(text);if(kind==='tasks'){const done=document.createElement('button');done.textContent=item.done?'Undo':'Done';done.onclick=()=>{item.done=!item.done;save()};row.append(' ',done)}const remove=document.createElement('button');remove.textContent='Delete';remove.onclick=()=>{items=items.filter(x=>x.id!==item.id);save()};row.append(' ',remove);list.append(row)});if(kind==='budget')document.getElementById('total').textContent='Total: $'+items.reduce((sum,item)=>sum+item.amount,0).toFixed(2)}document.getElementById('entry').onsubmit=e=>{e.preventDefault();const input=document.getElementById('text');if(!input.value.trim())return;const item={id:crypto.randomUUID(),text:input.value.trim(),done:false,createdAt:Date.now()};if(kind==='budget'){const amount=document.getElementById('amount');const value=Number(amount.value);if(!Number.isFinite(value)||value<0)return;item.amount=value;amount.value=''}if(kind==='experiments'){const observation=document.getElementById('observation');if(!observation.value.trim())return;item.observation=observation.value.trim();item.outcome=document.getElementById('outcome').value;observation.value=''}items.push(item);input.value='';save()};document.getElementById('export').onclick=()=>{const content=JSON.stringify(items,null,2);if(globalThis.RelayAndroid){RelayAndroid.save('data.json',content);return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'application/json'}));a.download='data.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};render();`;
    await this.composer.call({ operation: 'register', domain: { id: 'relay-document', primitives: [], combinators: [{ id: 'join-document-program', inputs: ['document', 'program'], output: 'app', apply: (html, js) => html + '<script>' + js + '</script></body></html>' }] } });
    const composition = await this.composer.call({ operation: 'generate', spec: { domain: 'relay-document', seeds: [{ type: 'document', value: document }, { type: 'program', value: program }], maxDepth: 1 } });
    const html = composition.nodes.find(node => node.type === 'app')?.value;
    if (!html) throw new Error('Klein composition did not produce an app');
    await this.computer.projects.writeFile(project.id, 'index.html', html, { type: 'text/html' });
    const evidence = { kind, language: recognized, composition: { lineage: composition.lineage, generationDepth: composition.generationDepth }, createdAt: Date.now() };
    await this.computer.projects.writeFile(project.id, 'build-evidence.json', JSON.stringify(evidence, null, 2), { type: 'application/json' });
    this.computer.bus.emit('relay:built', { projectId: project.id, ...evidence });
    return project;
  }
}
