import { SacralAnalogyEngine } from '../runtime/SacralAnalogyEngine.js';
import { EventMesh } from '../runtime/EventMesh.js';

/**
 * Thin organ wrapper around the recovered SacralAnalogyEngine.
 * The recovered engine remains intact; this wrapper only translates the
 * canonical Synthia address/state into the shape it already expects.
 */
export class SacralCreationOrgan {
  constructor(mesh=null) {
    this.id = 'sacral-create';
    this.capabilities = ['analogy', 'sacral-creation', 'cosmological-surface', 'hypercube-transform'];
    this.eventMesh = (mesh && typeof mesh.subscribe==='function' && typeof mesh.publish==='function') ? mesh : new EventMesh();
    this.engine = new SacralAnalogyEngine(this.eventMesh);
  }
  accepts(intent) {
    return /\b(sacral|analogy|analogical|hypercube|cosmological surface|transform analogy)\b/i.test(String(intent));
  }
  execute({ intent, canonicalAddress, address, domain='language', ontology=null, depth=1 }) {
    const a = canonicalAddress || address || {};
    const dimensions = ['Movement','Evolution','Being','Design','Space'];
    const dimIndex = Math.max(0, dimensions.indexOf(a.dimension));
    const oneHot = [0,0,0,0,0]; oneHot[dimIndex] = 1;
    const state = {
      resolved: true,
      hash: `sacral-${a.gate||1}-${a.line||1}-${a.color||1}-${a.tone||1}-${a.base||1}`,
      coordinates: {
        gate: Number(a.gate||1), line: Number(a.line||1), color: Number(a.color||1),
        tone: Number(a.tone||1), base: Number(a.base||1), degree: Number(a.degree||0),
        minute: Number(a.minute||0), second: Number(a.second||0), arc: Number(a.arc||0),
        house: Number(a.house||1)
      },
      ontology: ontology || {
        movement: oneHot[0], evolution: oneHot[1], being: oneHot[2], design: oneHot[3], space: oneHot[4]
      }
    };
    const out = this.engine.run({ state, domain, depth });
    return { ok:true, organ:this.id, intent, ...out };
  }
}
export default SacralCreationOrgan;
