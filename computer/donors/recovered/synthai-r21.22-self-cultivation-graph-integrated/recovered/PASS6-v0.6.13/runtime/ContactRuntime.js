import { ContactActionRouter } from './ContactActionRouter.js';
import { BrowserTaskPlanner } from './BrowserTaskPlanner.js';
import { LanguageContactModel } from './LanguageContactModel.js';
import { AutoNovelExpressionPlanner } from './AutoNovelExpressionPlanner.js';
import { MessyExpressionRouter } from './MessyExpressionRouter.js';
import { BrowserSessionManager } from './BrowserSessionManager.js';
import { BrowserTaskMemory } from './BrowserTaskMemory.js';
import { BrowserFieldExpressionComposer } from './BrowserFieldExpressionComposer.js';
import { BrowserArtifactComposer } from './BrowserArtifactComposer.js';

let contactSequence = 0;
const semanticTools = new Set(['autoling', 'diseminer', 'computational-grammar-coder']);

function stableSeed(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text || '')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return BigInt(h || 1);
}

export class ContactRuntime {
  constructor({ runtime, stack, router = new ContactActionRouter(), browserPlanner = new BrowserTaskPlanner(), lcm = new LanguageContactModel(), autoNovel = new AutoNovelExpressionPlanner(), messy = new MessyExpressionRouter(), browserSessions = null, browserMemoryPath = undefined } = {}) {
    if (!runtime || !stack) throw new Error('ContactRuntime requires the modern GraphRuntime and installed tool stack');
    this.runtime = runtime;
    this.stack = stack;
    this.router = router;
    this.browserPlanner = browserPlanner;
    this.lcm = lcm;
    this.autoNovel = autoNovel;
    this.messy = messy;
    const browserForm = this.stack.ato?.mesh?.automatons?.get('browser-form') || null;
    const taskMemory = new BrowserTaskMemory(browserMemoryPath === undefined ? {} : { path: browserMemoryPath });
    const fieldComposer = new BrowserFieldExpressionComposer({ autoNovel: this.autoNovel, messy: this.messy });
    const artifactComposer = new BrowserArtifactComposer({ autoNovel: this.autoNovel, messy: this.messy });
    this.browserSessions = browserSessions || (browserForm ? new BrowserSessionManager({ browserForm, planner: browserPlanner, taskMemory, fieldComposer, artifactComposer }) : null);
  }

  async comprehend(message, { intentId } = {}) {
    const id = intentId || `contact-${++contactSequence}-${stableSeed(message)}`;
    const session = await this.runtime.ingest({ intentId: id, description: String(message || ''), side: 'FOUR_SIDE', seed: stableSeed(message) });
    await this.runtime.step(session.sessionId);
    const state = this.runtime.states.get(session.sessionId);
    const nodes = (state?.expressionGraph?.nodes || []).filter((node) => (node.sourceToolIds || []).some((toolId) => semanticTools.has(toolId)));
    const evidence = {};
    for (const node of nodes) {
      for (const toolId of node.sourceToolIds || []) if (semanticTools.has(toolId)) evidence[toolId] = node.configuration?.output;
    }
    return Object.freeze({ sessionId: session.sessionId, text: String(message || ''), evidence: Object.freeze(evidence), semanticTools: Object.freeze(Object.keys(evidence).sort()) });
  }

  async contact(message, options = {}) {
    const comprehension = await this.comprehend(message, options);
    const route = this.router.route(message, comprehension);

    if (route.kind === 'chat') {
      return Object.freeze({ route, comprehension, response: this.lcm.respond(message, comprehension) });
    }

    if (route.kind === 'browser') {
      const plan = this.browserPlanner.plan(message, route);
      const browserForm = this.stack.ato?.mesh?.automatons?.get('browser-form') || null;
      let browser = Object.freeze({ status: 'browser-executor-needed', next: 'provide a URL or mount a browser page/executor', plan });
      if (route.task === 'form-workflow') {
        if ((options.url || options.pageHtml) && this.browserSessions) {
          browser = await this.browserSessions.startGoal({
            url: options.url || options.page?.url || 'https://synthia.local/form',
            html: options.pageHtml ?? null,
            message,
            route,
            profile: options.profile || {},
            preapprovedFields: options.preapprovedFields || [],
            executor: options.browserExecutor || null,
            navigate: options.autonomousNavigation !== false,
            comprehension
          });
        } else {
          browser = await this.browserPlanner.prepareForm(browserForm, {
            page: options.page,
            profile: options.profile || {},
            preapprovedFields: options.preapprovedFields || []
          });
        }
      } else if ((options.url || options.pageHtml) && this.browserSessions) {
        browser = await this.browserSessions.startGoal({
          url: options.url || options.page?.url || 'https://synthia.local/',
          html: options.pageHtml ?? null,
          message,
          route,
          profile: options.profile || {},
          preapprovedFields: options.preapprovedFields || [],
          executor: options.browserExecutor || null,
          navigate: options.autonomousNavigation !== false,
          comprehension
        });
      }
      return Object.freeze({ route, comprehension, plan, browser });
    }

    const expressionPlan = this.autoNovel.plan(message, route, comprehension);
    const morph = this.messy.route(expressionPlan);
    let artifact = null;
    if (options.materialize !== false) artifact = await this.runtime.materialize(comprehension.sessionId, options.target || 'CLI');
    return Object.freeze({ route, comprehension, expressionPlan, morph, artifact });
  }


  async resumeBrowserTask(taskId, options = {}) {
    if (!this.browserSessions) throw new Error('Browser session manager unavailable');
    const task = await this.browserSessions.taskMemory?.getTask?.(taskId);
    if (!task) throw new Error(`Unknown browser task: ${taskId}`);
    const comprehension = await this.comprehend(task.message, options);
    return this.browserSessions.resumeTask(taskId, {
      url: options.url || null,
      html: options.pageHtml ?? null,
      profile: options.profile || {},
      preapprovedFields: options.preapprovedFields || [],
      executor: options.browserExecutor || null,
      comprehension
    });
  }

  async provideBrowserInput(browserSessionId, values) {
    if (!this.browserSessions) throw new Error('Browser session manager unavailable');
    return this.browserSessions.provideHumanInput(browserSessionId, values);
  }

  async reviewBrowserSession(browserSessionId) {
    if (!this.browserSessions) throw new Error('Browser session manager unavailable');
    return this.browserSessions.review(browserSessionId);
  }

  async confirmBrowserSubmission(browserSessionId, { confirmed = false } = {}) {
    if (!this.browserSessions) throw new Error('Browser session manager unavailable');
    return this.browserSessions.confirmAndSubmit(browserSessionId, { confirmed });
  }

  async closeBrowserSession(browserSessionId) {
    if (!this.browserSessions) return false;
    return this.browserSessions.close(browserSessionId);
  }
}

export default ContactRuntime;
