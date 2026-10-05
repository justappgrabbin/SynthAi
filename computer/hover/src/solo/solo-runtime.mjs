import { SoloTaskStore } from './solo-task-store.mjs';
import { SoloBrowserHand } from './browser-hand-adapter.mjs';
import { AndroidHandBridge } from './android-hand-adapter.mjs';

export class SoloHoverRuntime {
  constructor({ organism, persistenceDir = '.synthia-state' } = {}) {
    if (!organism) throw new TypeError('SoloHoverRuntime requires a Synthia organism');
    this.organism = organism;
    this.tasks = new SoloTaskStore({ persistenceDir });
    this.browser = new SoloBrowserHand({ persistenceDir });
    this.android = new AndroidHandBridge();
    this.activeSurface = 'chat';
    this.working = false;
    this.stopped = false;
    this.workerError = null;
  }

  async status() {
    const audit = this.organism.wiringAudit();
    return Object.freeze({
      identity: 'Synthia',
      mode: 'solo-hover',
      activeSurface: this.activeSurface,
      taskWorker: { working: this.working, error: this.workerError },
      browser: this.browser.status(),
      android: await this.android.status(),
      morph: this.organism.canonicalMorph.snapshot(),
      identityStatus: this.organism.identityStatus(),
      canonicalAddressOrder: audit?.canonicalMorph?.canon?.addressOrder ?? this.organism.canonicalMorph.snapshot()?.canon?.addressOrder ?? null,
    });
  }

  async startTasks() {
    // A process interruption is not proof of completion: leave it for explicit retry.
    for (const task of await this.tasks.list()) {
      if (task.status === 'running') await this.tasks.update(task.id, { status: 'interrupted', error: 'Runtime restarted. Review the previous attempt before running again.' });
    }
    this.stopped = false;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.workTasks().catch(error => { this.workerError = error.message; }), 1500);
    this.timer.unref?.();
  }

  stopTasks() {
    this.stopped = true;
    clearInterval(this.timer);
  }

  async contact(message, context = {}) {
    // Identity resolution and the existing neural/contact pipeline remain authoritative.
    // Phone observations and executed effects are inputs to that pipeline.
    let before = null;
    let action = null;
    let after = null;
    const phone = await this.android.status();
    if (phone.available) before = await this.android.screen();
    let response = await this.organism.chat(message, {
      ...context,
      phonePerception: { available: phone.available, before },
    });
    if (response.ok !== false) {
      const effect = await this.android.command(message);
      if (effect.action) {
        if (effect.ok === false) throw new Error(effect.error || 'Android action failed');
        action = effect;
        if (phone.available) after = await this.android.screen();
        response = await this.organism.chat(message, {
          ...context,
          phonePerception: { available: phone.available, before, after },
          actionReceipt: action,
        });
      }
    }
    await this.organism.flushPersistence();
    return { ...response, contact: { perception: { before, after }, action, phone } };
  }

  async queueTask(id) {
    const task = (await this.tasks.list()).find(item => item.id === id);
    if (!task) throw new TypeError('Unknown task');
    if (task.done || ['queued', 'running'].includes(task.status)) return task;
    return this.tasks.update(id, { status: 'queued', error: '', result: '' });
  }

  async workTasks() {
    if (this.working || this.stopped || !this.organism.identityStatus().configured) return;
    this.working = true;
    try {
      const task = (await this.tasks.list()).reverse().find(item => item.status === 'queued' && !item.done);
      if (!task) return;
      await this.tasks.update(task.id, { status: 'running', startedAt: new Date().toISOString() });
      try {
        const identity = this.organism.identityStatus();
        const context = { ...task.context, personId: identity.personId, agentId: identity.agentId, surface: 'todo', taskId: task.id };
        const output = await this.contact(task.text, context);
        if (output.ok === false) throw new Error(output.error || 'Task returned an unsuccessful result');
        const result = output.utterance || output.output;
        if (typeof result !== 'string' || !result.trim()) throw new Error('No reviewable task response was produced');
        await this.organism.flushPersistence();
        // A response is not evidence that the user's real-world task is complete.
        await this.tasks.update(task.id, { status: 'review', result, evidence: output.contact ?? null, error: '', finishedAt: new Date().toISOString() });
      } catch (error) {
        await this.tasks.update(task.id, { status: 'blocked', error: error.message, finishedAt: new Date().toISOString() });
      }
    } finally { this.working = false; }
  }

  setSurface(surface) {
    const allowed = new Set(['browser', 'chat', 'world', 'todo', 'build']);
    if (!allowed.has(surface)) throw new Error(`unknown surface: ${surface}`);
    this.activeSurface = surface;
    return this.activeSurface;
  }
}

export default SoloHoverRuntime;
