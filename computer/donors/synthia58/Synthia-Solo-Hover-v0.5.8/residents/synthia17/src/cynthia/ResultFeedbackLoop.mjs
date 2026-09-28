const clone = (value) => structuredClone(value);

export class ResultFeedbackLoop {
  constructor({ maxCorrections = 2 } = {}) { this.maxCorrections = maxCorrections; }

  async run({ produce, observe = (value) => value, verify, correct = null, contract = {} } = {}) {
    if (typeof produce !== 'function' || typeof verify !== 'function') throw new TypeError('PRODUCER_AND_VERIFIER_REQUIRED');
    const attempts = [];
    let candidate = await produce();
    for (let index = 0; index <= this.maxCorrections; index += 1) {
      const observation = await observe(candidate);
      const verification = await verify(observation, contract);
      attempts.push(Object.freeze({ index, observation: clone(observation), verification: clone(verification) }));
      if (verification?.passed === true) return Object.freeze({ status: 'verified', candidate, observation, verification, attempts: Object.freeze(attempts) });
      if (index === this.maxCorrections || typeof correct !== 'function') break;
      candidate = await correct(candidate, verification, contract);
    }
    return Object.freeze({ status: 'unverified', candidate, observation: attempts.at(-1)?.observation, verification: attempts.at(-1)?.verification, attempts: Object.freeze(attempts) });
  }
}
