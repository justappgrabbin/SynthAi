import { BrowserPerceptionNavigator } from '../recovered/PASS6-v0.6.13/runtime/BrowserPerceptionNavigator.js';
import { BrowserTaskPlanner } from '../recovered/PASS6-v0.6.13/runtime/BrowserTaskPlanner.js';
import { BrowserOutcomeVerifier } from '../recovered/PASS6-v0.6.13/runtime/BrowserOutcomeVerifier.js';
import { ContactActionRouter } from '../recovered/PASS6-v0.6.13/runtime/ContactActionRouter.js';

/**
 * Sovereign browser/contact effector process ("arms").
 * It can route, plan, perceive/navigate, act, and verify without SynthiaUnit.
 * Cognition/authorization remain outside this process; binding actions are not auto-approved.
 */
export class BrowserEffectorProcess {
  constructor({ executor = null, navigator = null, planner = null, verifier = null, router = null } = {}) {
    this.executor = executor || null;
    this.navigator = navigator || new BrowserPerceptionNavigator();
    this.planner = planner || new BrowserTaskPlanner();
    this.verifier = verifier || new BrowserOutcomeVerifier();
    this.router = router || new ContactActionRouter();
    this.history = [];
  }

  route(message, comprehension = {}) { return this.router.route(message, comprehension); }
  plan(message, route = this.route(message)) { return this.planner.plan(message, route); }
  available() { return Boolean(this.executor) || (typeof process!=='undefined'&&Boolean(process?.versions?.node)); }

  async ensureExecutor() { if(this.executor)return this.executor;if(typeof process==='undefined'||!process?.versions?.node)throw new Error('browser execution requires a terminal/native browser host');const {ChromeDevToolsBrowserExecutor}=await import('../recovered/PASS6-v0.6.13/runtime/ChromeDevToolsBrowserExecutor.js');this.executor=new ChromeDevToolsBrowserExecutor();return this.executor; }
  async start() { const executor=await this.ensureExecutor();await executor.start?.(); return this; }
  async stop() { await this.executor.stop?.(); return true; }
  async inspect() { const x=await this.ensureExecutor();return x.inspectPage(); }

  async navigate({ message, route = null, url = null, memory = null, maxSteps = undefined } = {}) {
    const resolvedRoute = route || this.route(message);
    const plan = this.plan(message, resolvedRoute);
    await this.start();
    const result = await this.navigator.navigate({ executor: this.executor, message, route: resolvedRoute, url, memory, maxSteps });
    const page = await this.executor.inspectPage();
    const verification = this.verifier.verify({ route: resolvedRoute, page, dispatched: result });
    const record = Object.freeze({ at: Date.now(), message: String(message || ''), route: resolvedRoute, plan, result, verification });
    this.history.push(record);
    return record;
  }

  async loadHTML(html, { url = 'https://synthia.local/' } = {}) { await this.start(); return this.executor.loadHTML(html, { url }); }
  async clickAction(actionId) { const x=await this.ensureExecutor();return x.clickAction(actionId); }
  async setField(name, value) { const x=await this.ensureExecutor();return x.setField(name, value); }
  async fillDraft(draft) { const x=await this.ensureExecutor();return x.fillDraft(draft); }
  async select(name, value) { const x=await this.ensureExecutor();return x.select(name, value); }
  async upload(name, filePath) { const x=await this.ensureExecutor();return x.upload(name, filePath); }

  /** Explicit caller authorization is required for submission/binding action. */
  async submitForm(formId, { authorized = false } = {}) {
    if (!authorized) return Object.freeze({ ok: false, status: 'authorization-required', formId });
    const x=await this.ensureExecutor();return x.submitForm(formId);
  }

  snapshot() { return { kind: 'browser-effector-process', available: this.available(), history: [...this.history] }; }
}
export default BrowserEffectorProcess;
