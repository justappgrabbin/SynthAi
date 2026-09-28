import { FirstMind } from './FirstMind.mjs';
import { SensoryOrgan } from './organs/SensoryOrgan.mjs';
import { QianKernelOrgan } from './organs/QianKernelOrgan.mjs';
import { IsomorphismOrgan } from './organs/IsomorphismOrgan.mjs';
import { EpisodicMemoryOrgan } from './organs/EpisodicMemoryOrgan.mjs';
import { HexagramStateOrgan } from './organs/HexagramStateOrgan.mjs';

export class OrganismRuntime {
  constructor(options={}) {
    this.mind = options.mind ?? new FirstMind(options);
    this.senses = options.senses ?? new SensoryOrgan(options);
    this.qian = options.qian ?? new QianKernelOrgan();
    this.isomorphism = options.isomorphism ?? new IsomorphismOrgan();
    this.episodes = options.episodes ?? new EpisodicMemoryOrgan(options);
    this.stateField = options.stateField ?? new HexagramStateOrgan();
  }

  async ingest(input, context={}) {
    const sensory = typeof input === 'string' ? null : this.senses.perceive(input.sensors ?? {});
    const text = typeof input === 'string' ? input : String(input.text ?? JSON.stringify(input.data ?? sensory ?? input));
    const learned = await this.mind.ingestText(text, context);
    const qian = this.qian.measure(learned.addressed?.analysis?.dimensionVector ?? [0,0,0,0,0]);
    this.episodes.remember({ id: learned.source.id, input:text, fields: learned.addressed?.analysis ?? {}, outcome:{status:'ingested'} });
    return Object.freeze({ ...learned, sensory, qian, precedents:this.episodes.recall(text) });
  }
}
