import { StateSpaceEngine } from '../donors/recovered/you-n-i-verse-corrected/state-space-engine-v2.ported.mjs';
import { expressAddress } from './address-expression.mjs';

// The dimensional operators are the preserved YOU-N-I-VERSE rules, not a
// replacement physics model. Actual chart coordinates remain separately intact.
export function resolveRealmSwarm(participants = [], tick = 0) {
  const engine = new StateSpaceEngine();
  const pieces = [];
  for (const participant of participants) {
    for (const item of participant.addresses ?? []) {
      const address = item.expression.address;
      if (![address.gate, address.line, address.color, address.tone, address.base].every(Number.isFinite)) continue;
      let node = engine.createNode(address.gate, address.line, address.color, address.tone, address.base);
      node.id = `${participant.id}:${item.id}`;
      // Preserve source coordinates while explicitly selecting an operator from
      // the donor's five-stage cycle. Do not invent a natal dimension.
      const dimensions = ['Movement', 'Evolution', 'Being', 'Design', 'Space'];
      node = engine.applyDimension(node, 'Movement');
      const dimension = dimensions[Math.floor(tick / 4) % dimensions.length];
      if (dimension !== 'Movement') node = engine.applyDimension(node, dimension);
      pieces.push({ id: node.id, ownerId: participant.id, position: participant.position ?? [0, 1, 0],
        address, expression: expressAddress(address, { encodings: false }), dimension, amplitude: node.amplitude, phase: node.phase });
    }
  }
  // A second Design pass sees all owners, allowing actual cross-owner edges.
  for (const node of [...engine.state.nodes.values()].filter(node => !node.parent)) engine.applyDimension(node, 'Design');
  return { pieces, edges: engine.state.edges.map(({ from, to, weight, coherence, type }) => ({ from, to, weight, coherence, type })),
    coherence: engine.state.coherence, rules: 'YOU-N-I-VERSE state-space-engine-v2', mode: 'local-mesh' };
}
