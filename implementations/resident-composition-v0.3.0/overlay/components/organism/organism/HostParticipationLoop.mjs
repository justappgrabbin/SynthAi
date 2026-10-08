const clone = value => value == null ? value : structuredClone(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const key = (...parts) => JSON.stringify(parts);
const hex = value => [...new TextEncoder().encode(value)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const jsonValue = value => value === null || typeof value === 'string' || typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (Array.isArray(value) && value.every(jsonValue)) ||
  (value != null && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.values(value).every(jsonValue));
const hasEvidence = value => text(value) || (value != null && typeof value === 'object' && Object.keys(value).length > 0 && jsonValue(value));
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item);

/** Boundary glue for active participation in a host, using GraphRuntime tools,
 * ComplementaryGapModel, LivingLoop needs, and LocalMemory. No role is assigned
 * at mount time. Discovery describes needs; authority remains with the host.
 */
export class HostParticipationLoop {
  constructor({unit, hostId, revision, authorize, scope = 'local-residence'} = {}) {
    if (!unit || !text(hostId) || !text(revision) || typeof authorize !== 'function') {
      throw new TypeError('unit, hostId, revision, and host authorize function required');
    }
    if (scope !== 'local-residence') throw new TypeError('global host participation requires an IdentityBoundary adapter; this loop supports local residence only');
    this.unit = unit;
    this.hostId = hostId;
    this.revision = revision;
    this.authorize = authorize;
    this.scope = scope;
    this.memoryKey = key(hostId, revision);
    this.state = clone(unit.memory?.get?.('host-participation', this.memoryKey)?.value) || {
      hostId, revision, needs: [], questions: [], contacts: [], events: []
    };
    this.queue = Promise.resolve();
    this.inFlight = null;
    this.closed = false;
    // Restart cannot establish whether an interrupted effect actually happened.
    for (const item of [...this.state.needs, ...this.state.questions, ...this.state.contacts]) {
      if (item.status === 'executing' || item.status === 'dispatching') item.status = 'uncertain';
    }
    this.#save();
  }

  pulse() {
    if (this.closed) return Promise.resolve({status:'unmounted', hostId:this.hostId});
    if (this.inFlight) return this.inFlight;
    const operation = this.#serial(() => this.#pulse());
    this.inFlight = operation.finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  answer(questionId, answer) {
    if (this.closed) return Promise.reject(new Error('host participation is unmounted'));
    return this.#serial(async () => {
      const question = this.state.questions.find(q => q.id === questionId);
      if (!question) throw new Error('unknown host question');
      return this.#integrate(question, answer);
    });
  }

  snapshot() { return clone(this.state); }

  async close() {
    this.closed = true;
    await this.queue;
    return this.snapshot();
  }

  #serial(run) {
    const operation = this.queue.then(run);
    this.queue = operation.catch(() => {});
    return operation;
  }

  #tools(capability, endpoint = false) {
    return this.unit.runtime.getRegisteredTools().filter(tool =>
      text(tool.toolId) && typeof tool.execute === 'function' && tool.provides?.includes(capability) &&
      (!tool.hostBinding || (tool.hostBinding.hostId === this.hostId && tool.hostBinding.revision === this.revision)) &&
      (!endpoint || (tool.hostBinding?.hostId === this.hostId && tool.hostBinding?.revision === this.revision))
    );
  }

  async #grant(operation, tool, details = {}) {
    if (this.closed) return false;
    const request = {hostId:this.hostId, revision:this.revision, scope:this.scope, operation, toolId:tool?.toolId || null, ...clone(details)};
    const grant = await this.authorize(clone(request));
    const allowed = !this.closed && grant?.allowed === true && hasEvidence(grant.evidence);
    this.#record('authorization', {request, allowed, evidence:hasEvidence(grant?.evidence) ? clone(grant.evidence) : null});
    return allowed;
  }

  #context(capability, input) {
    return {
      sessionId:`host:${this.memoryKey}`, hostId:this.hostId, hostRevision:this.revision, scope:this.scope,
      expression:{capabilities:[capability], parameters:{}, constraints:['host-authorization-required']},
      inputValues:clone(input)
    };
  }

  async #pulse() {
    const observer = this.#tools('host:observe', true)[0];
    if (!observer) {
      this.#capabilityGap('host:observe', 'No host-bound observation capability is available');
      return {status:'observation-unavailable', hostId:this.hostId};
    }
    if (!await this.#grant('observe', observer, {capability:'host:observe'})) return {status:'authorization-required', operation:'observe'};
    const observed = await observer.execute(this.#context('host:observe', {hostId:this.hostId, revision:this.revision}));
    const observation = observed?.outputValues?.observation;
    if (observed?.success !== true || observation?.hostId !== this.hostId || observation?.revision !== this.revision || !Array.isArray(observation.needs) || !jsonValue(observation)) {
      return {status:'unresolved-observation'};
    }
    // Validate the whole batch before storing or executing any discovered need.
    const seen = new Set();
    for (const need of observation.needs) {
      if (!text(need?.id) || !text(need.revision) || !text(need.goal) || !text(need.capability) || !Array.isArray(need.requirements || [])) return {status:'unresolved-observation'};
      const id = key(need.id, need.revision);
      if (seen.has(id)) return {status:'unresolved-observation'};
      seen.add(id);
      if (need.qualities != null && (!Array.isArray(need.qualities) || !need.qualities.every(quality =>
        text(quality?.name) && ['Movement','Evolution','Being','Design','Space'].includes(quality.dimension) && hasEvidence(quality.source)
      ))) return {status:'unresolved-qualities', needId:need.id};
      const requirementKeys = new Set();
      for (const requirement of need.requirements || []) {
        if (!text(requirement?.key) || !text(requirement.question) || requirementKeys.has(requirement.key) ||
          (requirement.choices != null && (!Array.isArray(requirement.choices) || !requirement.choices.length || !requirement.choices.every(text)))) return {status:'unresolved-observation'};
        requirementKeys.add(requirement.key);
      }
      const saved = this.state.needs.find(n => n.key === id);
      if (saved && stable(saved.spec) !== stable(need)) return {status:'need-revision-required', needId:need.id};
    }
    for (const spec of observation.needs) {
      const id = key(spec.id, spec.revision);
      if (!this.state.needs.some(n => n.key === id)) {
        this.state.needs.push({key:id, spec:clone(spec), status:'open'});
        this.#record('need-discovered', {needId:spec.id, needRevision:spec.revision, capability:spec.capability});
      }
    }
    // An unanswered need does not prevent independent useful work.
    const results = [];
    for (const spec of observation.needs) {
      const need = this.state.needs.find(n => n.key === key(spec.id, spec.revision));
      if (need.status === 'completed') continue;
      try { results.push(await this.#participate(need)); }
      catch (error) {
        this.#record('participation-error', {needId:spec.id, error:String(error)});
        results.push({needId:spec.id, status:need.status === 'executing' ? 'uncertain' : 'unresolved', error:String(error)});
        if (need.status === 'executing') { need.status = 'uncertain'; this.#save(); }
      }
    }
    return {status:'observed', hostId:this.hostId, results};
  }

  async #participate(need) {
    const spec = need.spec;
    if (need.status === 'uncertain') return {needId:spec.id, status:'execution-uncertain'};
    const answers = [];
    let blocked = false;
    for (const requirement of spec.requirements || []) {
      const id = key(this.hostId, this.revision, spec.id, spec.revision, requirement.key);
      let question = this.state.questions.find(q => q.id === id);
      if (!question) {
        question = {id, needKey:need.key, requirement:clone(requirement), status:'open'};
        const gap = this.unit.complement.observe({
          human:`host:${this.hostId}`, capability:`clarification:${hex(id)}`,
          friction:requirement.question, evidence:{type:'host-observation', needId:spec.id},
          context:{hostId:this.hostId, revision:this.revision, needId:spec.id, needRevision:spec.revision, questionId:id}
        });
        question.gapId = gap.id;
        this.state.questions.push(question);
        this.#record('question-created', {questionId:id, needId:spec.id});
      }
      if (question.status !== 'answered') await this.#ask(question, need);
      if (question.status === 'answered') answers.push([requirement.key, clone(question.answer.value)]);
      else blocked = true;
    }
    if (blocked) return {needId:spec.id, status:'awaiting-clarification'};
    const tool = this.#tools(spec.capability)[0];
    if (!tool) {
      this.#capabilityGap(spec.capability, `Discovered need cannot yet execute: ${spec.goal}`);
      return {needId:spec.id, status:'capability-unavailable', capability:spec.capability};
    }
    const input = {
      need:clone(spec), answers:Object.fromEntries(answers),
      expression:{
        field:spec.field ?? null,
        composition:clone(this.unit.compositions?.snapshot?.() ?? null),
        organismField:clone(this.unit.processField?.snapshot?.() ?? null),
        qualities:clone(spec.qualities ?? [])
      }
    };
    if (!await this.#grant('execute', tool, {needId:spec.id, needRevision:spec.revision, capability:spec.capability, input})) return {needId:spec.id, status:'authorization-required', operation:'execute'};
    need.status = 'executing';
    this.#save();
    const result = await tool.execute(this.#context(spec.capability, input));
    // A generic factory success flag is not proof of a host operation.
    const receipt = result?.outputValues?.receipt;
    const repaired = spec.kind !== 'repair' || (
      receipt?.verification?.pass === true && hasEvidence(receipt.verification.evidence) &&
      Array.isArray(receipt.changes) && receipt.changes.length > 0 &&
      receipt.changes.every(change => text(change?.target) && change.before != null && change.after != null)
    );
    if (result?.success !== true || receipt?.hostId !== this.hostId || receipt?.revision !== this.revision || receipt?.needId !== spec.id || receipt?.needRevision !== spec.revision || receipt?.completed !== true || !hasEvidence(receipt.evidence) || !repaired) {
      need.status = 'uncertain';
      this.#record('execution-unverified', {needId:spec.id, toolId:tool.toolId});
      return {needId:spec.id, status:'execution-uncertain'};
    }
    need.status = 'completed';
    need.receipt = clone(receipt);
    if (spec.kind === 'repair') {
      this.unit.memory?.remember?.('host-repairs', {
        hostId:this.hostId, revision:this.revision, needId:spec.id, needRevision:spec.revision,
        problem:spec.goal, toolId:tool.toolId, changes:clone(receipt.changes),
        verification:clone(receipt.verification), evidence:clone(receipt.evidence), at:Date.now()
      });
    }
    this.#record('need-completed', {needId:spec.id, toolId:tool.toolId, receipt:clone(receipt)});
    return {needId:spec.id, status:'completed'};
  }

  async #ask(question, need) {
    if (question.status !== 'open') return;
    let contact = this.#tools('host:ask', true)[0];
    if (!contact) {
      this.#capabilityGap('host:ask', 'An unresolved host question needs an authorized communication path');
      const establisher = this.#tools('host:establish-contact', true)[0];
      if (!establisher) {
        this.#capabilityGap('host:establish-contact', 'No capability can establish a host communication path');
        return;
      }
      if (this.state.contacts.some(c => c.status !== 'open')) return;
      if (!await this.#grant('establish-contact', establisher, {capability:'host:establish-contact', questionId:question.id})) return;
      const attempt = {toolId:establisher.toolId, status:'executing'};
      this.state.contacts.push(attempt);
      this.#save();
      try {
        const result = await establisher.execute(this.#context('host:establish-contact', {hostId:this.hostId, revision:this.revision, questionId:question.id}));
        contact = this.#tools('host:ask', true)[0];
        const receipt = result?.outputValues?.receipt;
        attempt.status = result?.success === true && receipt?.hostId === this.hostId && receipt?.revision === this.revision && receipt?.established === true && hasEvidence(receipt.evidence) && contact ? 'established' : 'uncertain';
      } catch (error) { attempt.status = 'uncertain'; attempt.error = String(error); }
      this.#record('contact-attempted', clone(attempt));
      if (attempt.status !== 'established') return;
    }
    const request = {
      questionId:question.id, hostId:this.hostId, revision:this.revision,
      needId:need.spec.id, needRevision:need.spec.revision, goal:need.spec.goal,
      question:question.requirement.question, choices:clone(question.requirement.choices || [])
    };
    if (!await this.#grant('ask', contact, {capability:'host:ask', questionId:question.id, request})) return;
    question.status = 'dispatching';
    this.#save();
    try {
      const result = await contact.execute(this.#context('host:ask', request));
      const receipt = result?.outputValues?.receipt;
      question.status = result?.success === true && receipt?.questionId === question.id && receipt?.delivered === true && hasEvidence(receipt.evidence) ? 'awaiting-answer' : 'uncertain';
      question.receipt = clone(receipt ?? null);
      this.#record('question-dispatched', {questionId:question.id, status:question.status});
      const answer = result?.outputValues?.answer;
      if (answer) await this.#integrate(question, answer);
    } catch (error) { question.status = 'uncertain'; this.#record('question-delivery-uncertain', {questionId:question.id, error:String(error)}); }
  }

  async #integrate(question, answer) {
    if (answer?.questionId !== question.id || answer?.hostId !== this.hostId || answer?.revision !== this.revision || !text(answer?.responder) || !hasEvidence(answer?.evidence) || answer.value == null || !jsonValue(answer)) {
      return {status:'unresolved-answer', questionId:question.id};
    }
    // Persist only JSON context. Functions and non-JSON objects are not answers.
    let value;
    try { value = JSON.parse(JSON.stringify(answer.value)); }
    catch { return {status:'unresolved-answer', questionId:question.id}; }
    if (value == null || (question.requirement.choices?.length && !question.requirement.choices.includes(value))) return {status:'unresolved-answer', questionId:question.id};
    if (question.status === 'answered') return {status:stable(question.answer.value) === stable(value) ? 'already-integrated' : 'answer-conflict', questionId:question.id};
    if (!await this.#grant('integrate-answer', null, {questionId:question.id, responder:answer.responder, answer:clone(answer)})) return {status:'authorization-required', operation:'integrate-answer'};
    question.answer = {...clone(answer), value};
    question.status = 'answered';
    this.unit.complement.satisfy(question.gapId, {by:answer.responder, evidence:{type:'host-answer', questionId:question.id, evidence:clone(answer.evidence)}});
    this.#record('answer-integrated', {questionId:question.id, responder:answer.responder});
    return {status:'integrated', questionId:question.id};
  }

  #capabilityGap(capability, reason) {
    this.unit.living?.observeCapabilityGap?.({capabilities:[capability], subject:`host:${this.memoryKey}`, reason,
      evidence:[{type:'host-participation-gap', hostId:this.hostId, revision:this.revision}], dimension:5});
  }

  #record(type, details) {
    this.state.events.push({type, ...clone(details), at:Date.now()});
    if (this.state.events.length > 128) this.state.events.splice(0, this.state.events.length - 128);
    this.#save();
  }

  #save() { this.unit.memory?.upsert?.('host-participation', this.memoryKey, clone(this.state)); }
}
export default HostParticipationLoop;
