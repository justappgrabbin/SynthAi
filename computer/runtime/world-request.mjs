import { SynthiaLinguisticKernel } from '../donors/dream-habitat/grammarKernel.mjs';

// Local, compositional scene compiler. These are geometry primitives, not
// whole-world presets. Unknown subjects require an asset resolver; they must
// never silently become a palette change or consume the one-time choice.
export const WORLD_REQUEST_FIELDS = ['Movement', 'Evolution', 'Being', 'Design', 'Space'];
const primitives = [
  { id: 'rainbow', pattern: /\brainbows?\b/i, roles: ['structures'], geometry: 'spectrum-arch' },
  { id: 'butterfly', pattern: /\bbutterfl(?:y|ies)\b/i, roles: ['inhabitants'], geometry: 'winged-body' },
  { id: 'flower', pattern: /\bflowers?\b/i, roles: ['structures', 'inhabitants'], geometry: 'petal-body' },
  { id: 'star', pattern: /\bstars?\b/i, roles: ['structures', 'inhabitants'], geometry: 'radial-star' },
  { id: 'crystal', pattern: /\bcrystals?\b/i, roles: ['structures', 'inhabitants'], geometry: 'faceted-body' },
  { id: 'human', pattern: /\b(?:humans?|people|persons?)\b/i, roles: ['inhabitants'], geometry: 'identity-body' },
];
const colors = { red: '#ef4560', orange: '#ff9b45', yellow: '#ffe36b', green: '#76d9a0', blue: '#72baff', purple: '#af89ff', pink: '#ff9ad9', gold: '#e7bb65', white: '#eeeeff', black: '#171827' };

function resolveSubject(text, role) {
  const matches = primitives.filter(p => p.roles.includes(role) && p.pattern.test(text));
  if (matches.length !== 1) throw new Error(`Cannot yet resolve ${role} from “${text.trim()}” locally. Your world choice has not been used.`);
  return { kind: matches[0].id, geometry: matches[0].geometry };
}

export function compileWorldRequest(input, context = {}) {
  if (typeof input !== 'string' || input.trim().length < 3 || input.length > 2000) throw new Error('Describe your world in 3–2000 characters');
  const request = input.trim();
  const vocabulary = new Set(('i my me our a an the world system theme please want would like create make choose where with of in to be as are is should have has and for all its their they them turns into everyone people person persons human humans structures structure buildings building architecture home homes bridge bridges inhabitant inhabitants visitor visitors character characters avatar avatars butterfly butterflies rainbow rainbows flower flowers star stars crystal crystals ' + Object.keys(colors).join(' ')).split(' '));
  const unresolved = [...new Set((request.toLowerCase().match(/[a-z]+/g) ?? []).filter(word => !vocabulary.has(word)))];
  if (unresolved.length) throw new Error(`No local resolver yet for: ${unresolved.join(', ')}. Your world choice has not been used.`);
  const clauses = request.split(/[,;.!\n]+|\band\b/i).map(s => s.trim()).filter(Boolean);
  let structures, inhabitants;
  for (const clause of clauses) {
    const structural = /\b(structures?|buildings?|architecture|homes?|bridges?)\b/i.test(clause);
    const embodied = /\b(people|inhabitants?|visitors?|characters?|avatars?|everyone)\b/i.test(clause);
    if (structural && embodied) throw new Error('Describe structures and inhabitants in separate clauses');
    const role = structural ? 'structures' : embodied ? 'inhabitants' : null;
    // Remove the role word "people" before recognizing a requested species.
    const subject = clause.replace(/\b(people|inhabitants?|visitors?|characters?|avatars?|everyone|structures?|buildings?|architecture|homes?|bridges?)\b/gi, '');
    if (role) {
      const value = resolveSubject(subject, role);
      if (role === 'structures') { if (structures) throw new Error('Specify one structural form'); structures = value; }
      else { if (inhabitants) throw new Error('Specify one inhabitant form'); inhabitants = value; }
    } else {
      const matches = primitives.filter(p => p.pattern.test(clause));
      if (matches.length !== 1) throw new Error(`No local geometry resolver for “${clause}”. Your world choice has not been used.`);
      const primitive = matches[0];
      if (primitive.roles.length !== 1) throw new Error(`Specify whether ${primitive.id} represents structures or inhabitants`);
      const value = { kind: primitive.id, geometry: primitive.geometry };
      if (primitive.roles[0] === 'structures') { if (structures) throw new Error('Specify one structural form'); structures = value; }
      else { if (inhabitants) throw new Error('Specify one inhabitant form'); inhabitants = value; }
    }
  }
  if (!structures || !inhabitants) throw new Error('Describe both structures and inhabitants—for example, rainbows are structures and butterflies are people. Your choice has not been used.');
  const accent = Object.entries(colors).find(([word]) => new RegExp(`\\b${word}\\b`, 'i').test(request))?.[1] ?? '#e8a3df';
  const fields = [
    { field: 'Movement', output: { locomotion: 'visitor-controlled', wingMotion: inhabitants.kind === 'butterfly', coreStates: ['idle', 'walk', 'turn', 'reach', 'scan', 'navigate', 'activate', 'sit', 'stand', 'lift', 'throw', 'return'] } },
    { field: 'Evolution', output: { structures, inhabitants, generator: 'local-procedural-geometry-v1' } },
    { field: 'Being', output: { accent, material: structures.kind === 'crystal' ? 'glass' : 'organic', identity: 'preserve-source-photo-and-address' } },
    { field: 'Design', output: { hostDeterminesEmbodiment: true, interactions: 'relational-mesh', temporaryStates: true } },
    { field: 'Space', output: { structures: { count: 8, radius: 12 }, inhabitants: { hostForm: inhabitants.kind }, dimensionRules: 'YOU-N-I-VERSE' } },
  ];
  const definition = {
    request, fields, generator: 'local-procedural-geometry-v1',
    grammar: {
      colors: { world: accent }, materials: { world: structures.kind === 'crystal' ? 'glass' : 'organic' },
      atmosphere: { world: { theme: request, background: structures.kind === 'rainbow' ? '#a3d9ee' : '#171b30', ground: structures.kind === 'rainbow' ? '#82b5a3' : '#364d50', path: '#687e83', light: '#fff0de', accent, material: structures.kind === 'crystal' ? 'glass' : 'organic', fog: .008 } },
      architecture: { world: structures }, embodiment: { default: { ...inhabitants, preserveIdentity: true } },
      movement: { world: fields[0].output }, interaction: { world: fields[3].output }, layout: { world: fields[4].output.structures },
    },
  };
  const kernel = new SynthiaLinguisticKernel({ strictDesign: true });
  kernel.registerRewrite('construct-host-world', (_state, action) => action.type === 'choose-world', () => definition.grammar);
  kernel.registerConstraint('resolved-structures-and-body', candidate => Boolean(candidate?.architecture?.world?.geometry && candidate?.embodiment?.default?.geometry));
  kernel.registerConstraint('retain-source-identity', candidate => candidate?.embodiment?.default?.preserveIdentity === true);
  kernel.registerInterpreter('requested-host-meaning', () => ({ request, structures, inhabitants, identity: context.identity ?? null }));
  kernel.registerRelation('visitor-host-embodiment', () => ({ homeWorldId: context.homeWorldId ?? null, hostDeterminesForm: true, preserveVisitorIdentity: true }));
  const initial = kernel.createState({ x: { request, structures, inhabitants }, c: context, h: [] });
  const resolved = kernel.step(initial, { action: { type: 'choose-world' }, perspective: 'host' });
  if (!resolved.projections.d.valid) throw new Error('World definition failed design validation; your choice has not been used');
  const projections = ['mu', 'e', 'b', 'd', 's'];
  definition.fields = fields.map((field, i) => ({ ...field, projection: resolved.projections[projections[i]] }));
  definition.grammar = resolved.state.x;
  definition.eventId = resolved.eventId;
  return definition;
}
