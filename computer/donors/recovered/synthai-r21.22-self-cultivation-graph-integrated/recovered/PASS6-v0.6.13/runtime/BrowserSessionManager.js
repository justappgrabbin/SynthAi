import { ChromeDevToolsBrowserExecutor } from './ChromeDevToolsBrowserExecutor.js';
import { isHumanOnlyField } from './BrowserTaskPlanner.js';
import { BrowserPerceptionNavigator } from './BrowserPerceptionNavigator.js';
import { BrowserTaskMemory } from './BrowserTaskMemory.js';
import { BrowserOutcomeVerifier } from './BrowserOutcomeVerifier.js';

let browserSessionSequence = 0;
const freeze = (value) => Object.freeze(value);

export class BrowserSessionManager {
  constructor({
    browserForm,
    planner,
    navigator = new BrowserPerceptionNavigator(),
    taskMemory = new BrowserTaskMemory(),
    fieldComposer = null,
    artifactComposer = null,
    outcomeVerifier = new BrowserOutcomeVerifier(),
    executorFactory = () => new ChromeDevToolsBrowserExecutor()
  } = {}) {
    if (!browserForm) throw new Error('BrowserSessionManager requires browser-form automaton');
    if (!planner) throw new Error('BrowserSessionManager requires BrowserTaskPlanner');
    this.browserForm = browserForm;
    this.planner = planner;
    this.navigator = navigator;
    this.taskMemory = taskMemory;
    this.fieldComposer = fieldComposer;
    this.artifactComposer = artifactComposer;
    this.outcomeVerifier = outcomeVerifier;
    this.executorFactory = executorFactory;
    this.sessions = new Map();
  }

  async startForm({ url, html = null, profile = {}, preapprovedFields = [], executor = null, comprehension = null } = {}) {
    return this.startGoal({ url, html, message: 'fill out this form', route: { task: 'form-workflow' }, profile, preapprovedFields, executor, navigate: false, comprehension });
  }

  async startGoal({
    url,
    html = null,
    message = '',
    route = { task: 'navigation-workflow' },
    profile = {},
    preapprovedFields = [],
    executor = null,
    navigate = true,
    comprehension = null,
    taskId = null
  } = {}) {
    if (!url) throw new Error('Live browser workflow requires a URL');
    await this.taskMemory?.load?.();
    const hand = executor || this.executorFactory();
    if (html !== null) await hand.loadHTML(html, { url });
    else await hand.navigate(url);

    let navigation = freeze({ status: 'not-requested', trace: freeze([]), page: await hand.inspectPage(), steps: 0 });
    if (navigate) navigation = await this.navigator.navigate({ executor: hand, message, route, memory: this.taskMemory, url });
    let page = navigation.page || await hand.inspectPage();

    if (navigation.trace?.length) {
      await this.taskMemory?.recordNavigation?.({ url, route, trace: navigation.trace, goalPage: page });
    }

    let artifacts = freeze({ fields: freeze([]), files: freeze([]), tempDirs: freeze([]) });
    if (route.task === 'form-workflow' && this.artifactComposer && (navigation.status === 'goal-reached' || !navigate)) {
      artifacts = await this.artifactComposer.composeForPage({ page, message, route, comprehension, profile });
      for (const artifact of artifacts.files || []) {
        const uploaded = await hand.upload(artifact.name, artifact.filePath);
        if (!uploaded?.ok) throw new Error(`Browser artifact upload failed for ${artifact.name}: ${uploaded?.reason || 'unknown'}`);
      }
      if (artifacts.files?.length) page = await hand.inspectPage();
    }

    let generated = freeze({ values: freeze({}), sources: freeze({}), fields: freeze([]) });
    if (route.task === 'form-workflow' && this.fieldComposer && (navigation.status === 'goal-reached' || !navigate)) {
      generated = this.fieldComposer.composeForPage({ page, message, route, comprehension, profile });
    }

    let prepared = freeze({ status: navigation.status, unresolved: freeze([]), humanOnly: freeze([]), next: navigation.status === 'goal-reached' ? 'goal surface reached' : 'browser navigation requires guidance' });
    let fillResult = null;
    if (route.task === 'form-workflow' && (navigation.status === 'goal-reached' || !navigate)) {
      prepared = await this.planner.prepareForm(this.browserForm, {
        page,
        profile,
        preapprovedFields,
        generatedValues: generated.values,
        generatedSources: generated.sources
      });
      if (prepared.draft?.status === 'filled') fillResult = await hand.fillDraft(prepared.draft);
    }

    const livePage = await hand.inspectPage();
    const checkpoint = await this.taskMemory?.checkpointTask?.({
      taskId,
      url,
      message,
      route,
      status: prepared.status,
      unresolved: prepared.unresolved || [],
      navigation,
      generatedFields: [...(generated.fields || []), ...(artifacts.fields || [])]
    });
    const id = `browser-${++browserSessionSequence}`;
    const record = {
      id,
      taskId: checkpoint?.id || taskId || null,
      url,
      message,
      executor: hand,
      prepared,
      page: livePage,
      navigation,
      route,
      generated,
      artifacts,
      createdAt: Date.now(),
      submitted: false
    };
    this.sessions.set(id, record);
    return this.#view(record, { fillResult, navigation });
  }

  async resumeTask(taskId, { url = null, html = null, profile = {}, preapprovedFields = [], executor = null, comprehension = null } = {}) {
    const task = await this.taskMemory?.getTask?.(taskId);
    if (!task) throw new Error(`Unknown browser task: ${taskId}`);
    return this.startGoal({
      taskId,
      url: url || task.url,
      html,
      message: task.message,
      route: task.route,
      profile,
      preapprovedFields,
      executor,
      navigate: true,
      comprehension
    });
  }

  async provideHumanInput(sessionId, values = {}) {
    const session = this.#session(sessionId);
    const results = [];
    for (const [name, value] of Object.entries(values)) results.push(await session.executor.setField(name, value));
    session.page = await session.executor.inspectPage();
    const review = this.#reviewPage(session.page);
    if (session.taskId) await this.taskMemory?.updateTask?.(session.taskId, { status: review.status, unresolved: review.missing });
    return freeze({ status: 'human-input-recorded', browserSessionId: sessionId, taskId: session.taskId, fields: freeze(results), review });
  }

  async review(sessionId) {
    const session = this.#session(sessionId);
    session.page = await session.executor.inspectPage();
    const review = this.#reviewPage(session.page);
    if (session.taskId) await this.taskMemory?.updateTask?.(session.taskId, { status: review.status, unresolved: review.missing });
    return freeze({ browserSessionId: sessionId, taskId: session.taskId, ...review });
  }

  async confirmAndSubmit(sessionId, { confirmed = false } = {}) {
    const session = this.#session(sessionId);
    session.page = await session.executor.inspectPage();
    const review = this.#reviewPage(session.page);
    if (review.missing.length) return freeze({ status: 'awaiting-human', browserSessionId: sessionId, taskId: session.taskId, ...review });
    if (!confirmed) {
      if (session.taskId) await this.taskMemory?.updateTask?.(session.taskId, { status: 'awaiting-final-confirmation', unresolved: [] });
      return freeze({ browserSessionId: sessionId, taskId: session.taskId, ...review, status: 'awaiting-final-confirmation', next: 'explicitly confirm final submission' });
    }

    const form = session.page.forms?.[0];
    if (!form) return freeze({ status: 'no-form-found', browserSessionId: sessionId, taskId: session.taskId });
    await this.browserForm.call({ operation: 'inspect-page', page: session.page });
    const values = {};
    const sources = {};
    for (const field of form.fields || []) {
      if (field.value === null || field.value === undefined || field.value === '') continue;
      values[field.name] = field.value;
      sources[field.name] = isHumanOnlyField(field)
        ? { kind: 'human-browser-entry', ref: `browser.${field.name}` }
        : { kind: 'reviewed-page-value', ref: `browser.${field.name}` };
    }
    let draft = await this.browserForm.call({ operation: 'draft', formId: form.id, values, context: { sources } });
    const populated = draft.entries.filter((entry) => entry.value !== null && entry.value !== '').map((entry) => entry.name);
    draft = await this.browserForm.call({ operation: 'approve-fields', draftId: draft.id, names: populated, context: { scope: 'explicit-final-page-review' } });
    draft = await this.browserForm.call({ operation: 'fill', draftId: draft.id });
    const validation = await this.browserForm.call({ operation: 'validate', draftId: draft.id });
    if (!validation.valid) return freeze({ status: 'awaiting-human', browserSessionId: sessionId, taskId: session.taskId, validation, missing: validation.missing });
    const request = await this.browserForm.call({ operation: 'request-submission', draftId: draft.id });
    await this.browserForm.call({ operation: 'confirm-submission', requestId: request.id });
    const dispatched = await this.browserForm.ownedState.submit(request.id, () => session.executor.submitForm(form.id));
    session.submitted = true;
    session.page = await session.executor.inspectPage().catch(() => session.page);
    const outcome = this.outcomeVerifier.verify({ route: session.route, page: session.page, dispatched });
    if (session.taskId) await this.taskMemory?.updateTask?.(session.taskId, { status: outcome.achieved ? 'completed' : outcome.status, unresolved: [] });
    return freeze({ status: 'submitted', browserSessionId: sessionId, taskId: session.taskId, requestId: request.id, dispatched, outcome, page: session.page });
  }

  async close(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    this.sessions.delete(sessionId);
    if (session.taskId && !session.submitted) {
      const review = this.#reviewPage(session.page);
      await this.taskMemory?.updateTask?.(session.taskId, { status: 'interrupted', unresolved: review.missing }).catch(() => {});
    }
    await session.executor.stop();
    await this.artifactComposer?.cleanup?.(session.artifacts?.tempDirs || []);
    return true;
  }

  async closeAll() {
    for (const id of [...this.sessions.keys()]) await this.close(id);
  }

  #session(id) {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`Unknown browser session: ${id}`);
    return session;
  }

  #reviewPage(page) {
    const form = page.forms?.[0];
    if (!form) return { status: 'no-form-found', missing: freeze([]), humanOnly: freeze([]), page };
    const missing = (form.fields || []).filter((field) => field.required && (field.value === null || field.value === undefined || field.value === '' || field.value === false)).map((field) => field.name);
    const humanOnly = (form.fields || []).filter((field) => isHumanOnlyField(field)).map((field) => field.name);
    return { status: missing.length ? 'awaiting-human' : 'ready-for-final-confirmation', missing: freeze(missing), humanOnly: freeze(humanOnly), page };
  }

  #view(session, extra = {}) {
    const review = this.#reviewPage(session.page);
    return freeze({
      status: session.prepared.status,
      browserSessionId: session.id,
      taskId: session.taskId,
      url: session.url,
      unresolved: session.prepared.unresolved,
      humanOnly: session.prepared.humanOnly || review.humanOnly,
      next: session.prepared.next,
      page: session.page,
      navigation: session.navigation || null,
      generatedFields: session.generated?.fields || freeze([]),
      generatedArtifacts: session.artifacts?.fields || freeze([]),
      ...extra
    });
  }
}

export default BrowserSessionManager;
