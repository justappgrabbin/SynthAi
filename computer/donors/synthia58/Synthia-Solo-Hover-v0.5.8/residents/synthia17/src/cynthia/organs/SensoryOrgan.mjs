const stamp = (clock) => clock();
const brightness = (pixels = []) => {
  if (!pixels.length) return 0.5;
  let sum = 0;
  for (let i = 0; i < pixels.length; i += 3) sum += ((pixels[i] || 0) + (pixels[i + 1] || 0) + (pixels[i + 2] || 0)) / 3;
  return sum / (Math.ceil(pixels.length / 3) * 255);
};

export class SensoryOrgan {
  constructor({ clock = () => Date.now() } = {}) { this.clock = clock; }

  perceive(input = {}) {
    const at = stamp(this.clock);
    const packet = { at, kind: 'five-sense-perception', senses: {} };
    if (input.smell) packet.senses.smell = { source: 'smell', raw: structuredClone(input.smell), vector: Object.values(input.smell).slice(0, 3) };
    if (input.taste) packet.senses.taste = { source: 'taste', raw: structuredClone(input.taste) };
    if (input.touch) packet.senses.touch = { source: 'touch', raw: structuredClone(input.touch) };
    if (input.hearing) packet.senses.hear = { source: 'hearing', raw: structuredClone(input.hearing), dominantFrequency: input.hearing.frequency ?? null };
    if (input.sight) packet.senses.see = {
      source: 'sight', frameIndex: input.sight.frameIndex ?? 0,
      brightness: brightness(input.sight.pixels), objects: structuredClone(input.sight.objects ?? []),
      relations: structuredClone(input.sight.relations ?? []), changes: structuredClone(input.sight.stateChanges ?? []),
    };
    return Object.freeze(packet);
  }
}

