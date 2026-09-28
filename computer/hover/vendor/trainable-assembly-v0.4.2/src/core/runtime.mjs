import * as StateSpace from './state-space/index.mjs';
import * as ATO from './ato/index.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Klein = require('./klein/index.js');

export class SynthiaCoreRuntime {
  constructor(options = {}) {
    this.options = options;
    this.stateSpace = StateSpace;
    this.ato = ATO;
    this.klein = Klein;
  }
  capabilities() {
    return {
      stateSpace: Object.keys(this.stateSpace),
      ato: Object.keys(this.ato),
      klein: Object.keys(this.klein),
    };
  }
}
export default SynthiaCoreRuntime;
