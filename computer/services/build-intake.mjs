const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function normalizedVerification(value = {}) {
  if (typeof value === 'boolean') return { passed: value, status: value ? 'passed' : 'failed', tests: [] };
  const tests = Array.isArray(value.tests) ? value.tests : [];
  const testPass = tests.length ? tests.every(test => test?.passed === true || test?.status === 'passed' || test?.status === 'success') : true;
  const explicitPass = value.passed === true || ['passed', 'success', 'verified'].includes(String(value.status ?? '').toLowerCase());
  const explicitFail = value.passed === false || ['failed', 'failure', 'rejected'].includes(String(value.status ?? '').toLowerCase());
  return { ...value, passed: explicitPass && testPass && !explicitFail, tests };
}

function buildSummary(candidate = {}) {
  return {
    id: candidate.id ?? null,
    name: candidate.name ?? null,
    version: candidate.version ?? null,
    kind: candidate.kind ?? null,
    platform: candidate.platform ?? null,
    source: candidate.source ?? null,
    location: candidate.location ?? candidate.url ?? null,
    manifest: candidate.manifest ?? null,
    capabilities: candidate.capabilities ?? [],
    dependencies: candidate.dependencies ?? [],
    sha256: candidate.sha256 ?? null,
  };
}

export class VerifiedBuildIntake {
  constructor({ bus = null, state = null, resident = null, autoRegistrar = null } = {}) {
    if (!resident) throw new Error('VerifiedBuildIntake resident required');
    this.bus = bus;
    this.state = state;
    this.resident = resident;
    this.autoRegistrar = autoRegistrar;
    this.sequence = 0;
  }

  async receive(candidate = {}) {
    const id = String(candidate.id ?? candidate.buildId ?? `build-${++this.sequence}`);
    const receivedAt = Date.now();
    const summary = { ...buildSummary(candidate), id };
    this.bus?.emit('build:received', { id, summary });
    this.autoRegistrar?.registerAccepted({
      kind: 'build', identity: id, status: 'RECEIVED', origin: { source: candidate.source ?? 'resident-build-inbox', at: receivedAt },
      capabilities: summary.capabilities, location: summary.location,
      verification: [{ kind: 'intake', status: 'received', at: receivedAt }], metadata: summary,
    });

    const analysisPrompt = `Analyze this Synthia build at intake. Identify its role, declared capabilities, dependencies, and where it belongs in the resident computer. Build record: ${JSON.stringify(summary)}`;
    let analysis;
    try {
      const result = await this.resident.chat(analysisPrompt, { actorId: `build:${id}`, goal: 'analyze and address a Synthia build for resident placement' });
      analysis = { status: 'ANALYZED', reply: result.reply, trace: result.trace, stateAddress: result.stateAddress ?? null };
    } catch (error) {
      analysis = { status: 'ANALYSIS_FAILED', error: String(error?.message ?? error) };
    }
    this.bus?.emit('build:analyzed', { id, analysis });

    let verificationInput = candidate.verification ?? {};
    if (typeof candidate.verify === 'function') {
      try { verificationInput = await candidate.verify({ id, summary, analysis }); }
      catch (error) { verificationInput = { passed: false, status: 'failed', error: String(error?.message ?? error) }; }
    }
    const verification = normalizedVerification(verificationInput);

    if (!verification.passed) {
      const awaiting = !verification.status && verification.passed !== false;
      const status = awaiting ? 'AWAITING_VERIFICATION' : 'REJECTED';
      const record = { id, status, summary, analysis, verification, receivedAt, updatedAt: Date.now() };
      await this.state?.set(`resident.buildInbox.${encodeURIComponent(id)}`, record, { source: 'verified-build-intake' });
      this.autoRegistrar?.registerAccepted({
        kind: 'build', identity: id, status, origin: { source: candidate.source ?? 'resident-build-inbox', at: receivedAt },
        capabilities: summary.capabilities, location: summary.location,
        verification: [{ kind: 'build-verification', status: awaiting ? 'awaiting' : 'failed', at: Date.now(), evidence: verification }], metadata: { summary, analysis },
      });
      this.bus?.emit(awaiting ? 'build:awaiting-verification' : 'build:rejected', { id, verification });
      return record;
    }

    const promoted = {
      id, name: summary.name, version: summary.version, kind: summary.kind, platform: summary.platform,
      source: summary.source, location: summary.location, sha256: summary.sha256,
      capabilities: summary.capabilities, dependencies: summary.dependencies,
      manifest: summary.manifest, analysis, verification: clone(verification), promotedAt: Date.now(), status: 'PROMOTED',
    };
    const loaded = await this.resident.loadBuild(promoted);
    if (typeof candidate.install === 'function') promoted.installation = await candidate.install(loaded);
    await this.state?.set(`resident.buildInbox.${encodeURIComponent(id)}`, promoted, { source: 'verified-build-intake' });
    this.autoRegistrar?.registerAccepted({
      kind: 'build', identity: id, status: 'VERIFIED', origin: { source: candidate.source ?? 'resident-build-inbox', at: receivedAt },
      capabilities: summary.capabilities, location: summary.location,
      relationships: [{ type: 'loaded-by', target: 'synthia-resident-computer' }],
      verification: [{ kind: 'build-verification', status: 'passed', at: promoted.promotedAt, evidence: verification }], metadata: promoted,
    });
    this.bus?.emit('build:promoted', { id, version: promoted.version, location: promoted.location });
    return promoted;
  }
}

export default VerifiedBuildIntake;
