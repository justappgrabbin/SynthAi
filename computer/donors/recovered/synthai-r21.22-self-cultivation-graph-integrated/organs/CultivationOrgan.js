/**
 * CultivationOrgan — teaches from the address spine + I-Ching / gate-line structure.
 * Self-referential: reads StateSpaceKernel vectors when available.
 */
import { StateSpaceKernel } from '../vendor/ato-core/src/state-space-kernel.mjs';
import { resolveGate } from '../vendor/ato-core/src/gate-address.mjs';

const LINE_TEACHINGS = {
  1: 'Beginning — pure potential, the seed before form.',
  2: 'Direction — the first orientation of the force.',
  3: 'Bonding — connection and mutual definition.',
  4: 'Externalization — expression into the field.',
  5: 'Fixing — pattern recognition and discipline.',
  6: 'Transition — the edge before the next gate.'
};

export class CultivationOrgan {
  constructor() {
    this.id = 'cultivation';
    this.capabilities = ['cultivation', 'teach', 'human-design', 'i-ching', 'practice'];
    this.kernel = new StateSpaceKernel({ featureWidth: 24 });
  }

  accepts(intent) {
    return /\b(cultivat|practice|teach|gate|line|hexagram|i-?ching|human design|discipline|train|meditat)\b/i.test(intent);
  }

  async execute({ intent, address, mode = 'complement' }) {
    const gate = Number(address?.gate ?? address?.canonical?.gate ?? 1) || 1;
    const line = Number(address?.line ?? address?.canonical?.line ?? 1) || 1;
    const addr = { mode: 'macro', gate, line, color: 1, tone: 1, base: 1 };

    let vector = null;
    let annotation = null;
    try {
      vector = this.kernel.vector(addr);
      // define / annotate current practice point so tools can read it later
      this.kernel.define(addr, { practice: true, intent: String(intent || '').slice(0, 120) });
      annotation = this.kernel.annotations?.get?.(this.kernel.constructor.name) || null;
    } catch (e) {
      vector = null;
    }

    const lineTeaching = LINE_TEACHINGS[line] || LINE_TEACHINGS[1];
    let gateResolution=null; try{ gateResolution=resolveGate(gate); }catch{}
    const text = [
      `Cultivation at Gate ${gate} / Line ${line}${gateResolution?.content?.name ? ` — ${gateResolution.content.name}` : ''}.`,
      lineTeaching,
      mode === 'mirror'
        ? 'Mirror mode: notice where this pattern already lives in you.'
        : 'Complement mode: practice the polarity that balances this gate.',
      vector ? `State-space vector length ${vector.length} is now readable by tools on this address.` : ''
    ].filter(Boolean).join(' ');

    return {
      ok: true,
      organ: this.id,
      text,
      gate,
      line,
      teaching: lineTeaching,
      address: addr,
      stateSpace: vector ? { vector: [...vector].slice(0, 12), width: vector.length } : null,
      mode,
      gateResolution: gateResolution ? {kingWenGate:gateResolution.kingWenGate,binaryValue:gateResolution.binaryValue,bits:gateResolution.bits,content:gateResolution.content} : null
    };
  }
}

export default CultivationOrgan;
