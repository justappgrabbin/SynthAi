import { ExperienceCompiler } from '../worlds/experience-compiler.mjs';
import { registerDefaultExperienceAdapters } from './AppExperienceAdapters.mjs';

const clone = value => value === undefined ? undefined : structuredClone(value);

export class AppExperienceRuntime {
  constructor({ state, bus = null, compiler = null, historyLimit = 200 } = {}) {
    if (!state?.get || !state?.set) throw new TypeError('AppExperienceRuntime requires a StateStore-like state service');
    this.state = state;
    this.bus = bus;
    this.historyLimit = historyLimit;
    this.compiler = compiler ?? registerDefaultExperienceAdapters(new ExperienceCompiler());
  }

  registerAdapter(adapter) {
    return this.compiler.register(adapter);
  }

  compile(observation, context = {}) {
    return this.compiler.compile(observation, context);
  }

  async observe(observation, context = {}) {
    const experience = this.compile(observation, context);
    const history = this.state.get('experiences.history', []);
    const record = {
      ...experience,
      sequence: Number(this.state.get('experiences.sequence', 0)) + 1,
    };
    history.push(record);
    if (history.length > this.historyLimit) history.splice(0, history.length - this.historyLimit);
    await this.state.set('experiences.sequence', record.sequence, { source: 'app-experience' });
    await this.state.set('experiences.current', record, { source: 'app-experience' });
    await this.state.set('experiences.history', history, { source: 'app-experience' });
    this.bus?.emit('experience:observed', clone(record));
    this.bus?.emit(`experience:app:${record.application.packageName ?? 'unknown'}`, clone(record));
    return clone(record);
  }

  current() {
    return clone(this.state.get('experiences.current', null));
  }

  history() {
    return clone(this.state.get('experiences.history', []));
  }

  async recordLaunchResult(app, result = {}) {
    if (!app?.packageName && !app?.appLabel) throw new Error('app packageName or appLabel required');
    return this.observe({
      packageName: app.packageName ?? null,
      appLabel: app.appLabel ?? app.label ?? app.packageName,
      activity: result.activity ?? app.activity ?? null,
      eventType: result.launched === false ? 'application_launch_failed' : 'application_launch',
      observedAt: Date.now(),
      source: result.source ?? 'native-launcher',
      metadata: { launchResult: clone(result) },
    });
  }

  snapshot() {
    return {
      current: this.current(),
      history: this.history(),
    };
  }
}

export default AppExperienceRuntime;
