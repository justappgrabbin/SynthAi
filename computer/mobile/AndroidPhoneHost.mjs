const clone = value => value === undefined ? undefined : structuredClone(value);

export class AndroidPhoneHost {
  constructor({ plugin = globalThis.Capacitor?.Plugins?.WorldShell ?? null } = {}) {
    this.id = 'android-world-shell-host';
    this.plugin = plugin;
  }

  available() {
    return Boolean(this.plugin?.listApps && this.plugin?.launchApp);
  }

  #require(method) {
    if (!this.plugin?.[method]) {
      throw new Error('Android WorldShell plugin method unavailable: ' + method);
    }
    return this.plugin[method].bind(this.plugin);
  }

  async listApplications() {
    const result = await this.#require('listApps')();
    return (result?.apps ?? []).map(app => ({
      packageName: String(app.packageName ?? ''),
      label: String(app.label ?? app.packageName ?? 'Application'),
      activity: app.activity ?? null,
      category: app.category ?? null,
      launchable: true,
      metadata: {
        activity: app.activity ?? null,
        source: result?.source ?? 'android-launcher',
      },
    })).filter(app => app.packageName);
  }

  async launchApplication(packageName, context = {}) {
    return this.#require('launchApp')({
      packageName: String(packageName),
      activity: context?.activity ?? null,
    });
  }

  async homeStatus() {
    return this.#require('homeStatus')();
  }

  async accessibilityStatus() {
    return this.#require('accessibilityStatus')();
  }

  async openAccessibilitySettings() {
    return this.#require('openAccessibilitySettings')();
  }

  async readObservations() {
    const result = await this.#require('observations')();
    if (!result?.observationQueueJson) {
      return {
        observations: [],
        count: 0,
        enabled: Boolean(result?.enabled),
        error: result?.error ?? null,
        errorAt: result?.errorAt ?? null,
      };
    }

    let observations;
    try {
      observations = JSON.parse(result.observationQueueJson);
    } catch (error) {
      throw new Error('Android observation queue is not valid JSON: ' + (error?.message ?? error));
    }

    return {
      observations: Array.isArray(observations) ? clone(observations) : [],
      count: Array.isArray(observations) ? observations.length : 0,
      enabled: Boolean(result.enabled),
      error: result.error ?? null,
      errorAt: result.errorAt ?? null,
    };
  }

  async acknowledgeObservations(throughObservedAt) {
    if (!Number.isFinite(Number(throughObservedAt))) {
      throw new Error('acknowledgeObservations requires throughObservedAt');
    }
    return this.#require('ackObservations')({ throughObservedAt: Number(throughObservedAt) });
  }
}

export function createAndroidPhoneHost(options = {}) {
  const host = new AndroidPhoneHost(options);
  return host.available() ? host : null;
}

export default AndroidPhoneHost;
