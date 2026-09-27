import { SoloTaskStore } from './solo-task-store.mjs';
import { SoloBrowserHand } from './browser-hand-adapter.mjs';
import { AndroidHandBridge } from './android-hand-adapter.mjs';

export class SoloHoverRuntime {
  constructor({ organism, persistenceDir = '.synthia-state' } = {}) {
    if (!organism) throw new TypeError('SoloHoverRuntime requires a Synthia organism');
    this.organism = organism;
    this.tasks = new SoloTaskStore({ persistenceDir });
    this.browser = new SoloBrowserHand({ persistenceDir });
    this.android = new AndroidHandBridge();
    this.activeSurface = 'chat';
  }

  async status() {
    const audit = this.organism.wiringAudit();
    return Object.freeze({
      identity: 'Synthia',
      mode: 'solo-hover',
      activeSurface: this.activeSurface,
      browser: this.browser.status(),
      android: await this.android.status(),
      morph: this.organism.canonicalMorph.snapshot(),
      identityStatus: this.organism.identityStatus(),
      canonicalAddressOrder: audit?.canonicalMorph?.canon?.addressOrder ?? this.organism.canonicalMorph.snapshot()?.canon?.addressOrder ?? null,
    });
  }

  setSurface(surface) {
    const allowed = new Set(['browser', 'chat', 'world', 'todo', 'build']);
    if (!allowed.has(surface)) throw new Error(`unknown surface: ${surface}`);
    this.activeSurface = surface;
    return this.activeSurface;
  }
}

export default SoloHoverRuntime;
