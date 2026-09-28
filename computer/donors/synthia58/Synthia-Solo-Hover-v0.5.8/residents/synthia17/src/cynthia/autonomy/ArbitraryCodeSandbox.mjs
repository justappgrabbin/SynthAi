export class ArbitraryCodeSandbox {
  constructor({ runner = null } = {}) {
    this.runner = runner;
    this.artifacts = new Map();
  }

  stage({ id = `artifact-${crypto.randomUUID()}`, code, language = 'javascript', contracts = [] } = {}) {
    if (typeof code !== 'string' || !code.trim()) throw new TypeError('CODE_REQUIRED');
    const artifact = Object.freeze({ id, code, language, contracts: Object.freeze([...contracts]), status: 'staged' });
    this.artifacts.set(id, artifact);
    return artifact;
  }

  async run(id, context = {}) {
    const artifact = this.artifacts.get(id);
    if (!artifact) throw new Error('ARTIFACT_NOT_FOUND');
    if (!this.runner) return Object.freeze({ status: 'sandbox-runner-required', artifact });
    // Deliberately never evaluates generated code in Cynthia's own realm. APK residence
    // mounts an isolated Worker/WebView/QuickJS runner behind this capability boundary.
    return this.runner.execute(artifact, structuredClone(context));
  }
}

