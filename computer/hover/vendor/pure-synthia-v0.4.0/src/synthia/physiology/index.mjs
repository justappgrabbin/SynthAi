import { PhysiologyMetabolism } from './metabolism.mjs';
import { PhysiologyInnerLife } from './innerLife.mjs';
import { PhysiologyHypothesisLife } from './hypothesisLife.mjs';
import { PhysiologyWorldMemory } from './worldMemory.mjs';
import { AutonomousPhysiology } from './autonomousPhysiology.mjs';

export function createPhysiology() {
  const metabolism = new PhysiologyMetabolism();
  const innerLife = new PhysiologyInnerLife();
  const hypotheses = new PhysiologyHypothesisLife({ metabolism });
  const world = new PhysiologyWorldMemory({ hypotheses, metabolism });
  const autonomous = new AutonomousPhysiology({ metabolism, innerLife, hypotheses, world });
  const processes = Object.freeze([metabolism, innerLife, hypotheses, world, autonomous]);
  return Object.freeze({
    id: 'synthia-physiology',
    metabolism, innerLife, hypotheses, world, autonomous, processes,
    observeInput: (text, context) => autonomous.observeInput(text, context),
    observeOutcome: (outcome) => autonomous.observeOutcome(outcome),
    tick: () => autonomous.tick(),
    context: () => autonomous.context(),
    snapshot: () => Object.freeze({
      metabolism: metabolism.snapshot(), innerLife: innerLife.snapshot(), hypotheses: hypotheses.snapshot(), world: world.snapshot(), autonomous: autonomous.snapshot(),
    }),
  });
}

export default createPhysiology;
