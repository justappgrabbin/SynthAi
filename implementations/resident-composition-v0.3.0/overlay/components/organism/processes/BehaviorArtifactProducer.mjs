import { requireIntroductionAddress } from '../integration/IntroductionAddress.mjs';
const clone = value => structuredClone(value);
const named = value => typeof value === 'string' && value.trim().length > 0;
const literal = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Compile authored behavior into portable JavaScript; no invented mechanics or canonical interpretation. */
export function validateExperience(experience, parent = null) {
  if (!named(experience?.id) || !named(experience?.initial) || !Array.isArray(experience?.states) || !experience.states.length) {
    throw new TypeError('experience id, initial state, and states required');
  }
  const addressed = clone(experience);
  addressed.addressBinding = requireIntroductionAddress(experience, parent, `experience:${experience.id}`);
  const ids = new Set();
  for (const state of addressed.states) {
    if (!named(state.id) || ids.has(state.id) || !named(state.label)) throw new TypeError('unique labeled states required');
    state.addressBinding = requireIntroductionAddress(state, addressed.addressBinding, `${addressed.addressBinding.identity}/state:${state.id}`);
    ids.add(state.id);
  }
  if (!ids.has(experience.initial)) throw new TypeError('unknown initial state');
  for (const state of addressed.states) {
    if (!Array.isArray(state.actions ?? [])) throw new TypeError('state actions must be an array');
    const actions = new Set();
    for (const action of state.actions ?? []) {
      if (!named(action.id) || actions.has(action.id) || !named(action.label) || !ids.has(action.to)) {
        throw new TypeError('unique labeled actions with known target states required');
      }
      action.addressBinding = requireIntroductionAddress(action, state.addressBinding, `${state.addressBinding.identity}/action:${action.id}`);
      actions.add(action.id);
    }
  }
  // Every declared state must have a path from the authored start.
  const reachable = new Set([experience.initial]);
  const queue = [experience.initial];
  for (let i = 0; i < queue.length; i++) {
    for (const action of experience.states.find(s => s.id === queue[i]).actions ?? []) {
      if (!reachable.has(action.to)) { reachable.add(action.to); queue.push(action.to); }
    }
  }
  if (reachable.size !== ids.size) throw new TypeError('experience contains unreachable states');
  return addressed;
}

export class BehaviorArtifactProducer {
  propose({ kind, resolution, analogy, purpose, context }) {
    if (!['game', 'app'].includes(kind)) throw new TypeError('authored behavior producer supports game or app; install a producer for other output kinds');
    if (!named(context?.identityId)) throw new TypeError('generation identity required');
    const selected = resolution.source?.experience ?? (analogy?.matchStatus === 'unique' ? analogy.matches[0].experience : null);
    if (selected == null) return { held:true, reason:analogy ? `analogy-${analogy.matchStatus}` : 'authored-experience-missing', needs:['explicit authored experience or uniquely mapped experience'] };
    const binding = requireIntroductionAddress({address:resolution.address},null,'generation-source');
    const experience = validateExperience(selected,binding);
    const provenance = {
      producer: 'authored-behavior-compiler', purpose, address: clone(resolution.address),
      analogy: clone(analogy), context: clone(context), experienceId: experience.id
    };
    const runtime = `export function createExperience(identityId) {
  if (typeof identityId !== 'string' || !identityId.trim()) throw new TypeError('identity required');
  const definition = ${literal(experience)};
  let stateId = definition.initial;
  const history = [];
  const copy = value => JSON.parse(JSON.stringify(value));
  const snapshot = () => ({ identityId, experienceId: definition.id, state: copy(definition.states.find(s => s.id === stateId)), history: copy(history) });
  return {
    snapshot,
    act(actionId) {
      const state = definition.states.find(s => s.id === stateId);
      const action = (state.actions || []).find(a => a.id === actionId);
      if (!action) throw new Error('action unavailable in current state');
      history.push({ sequence: history.length + 1, from: stateId, actionId, to: action.to });
      stateId = action.to;
      return snapshot();
    }
  };
}
export const provenance = ${literal(provenance)};
`;
    const render = `const session = createExperience(${literal(context.identityId)});
const root = document.querySelector('main');
function render() {
  const current = session.snapshot();
  root.replaceChildren();
  const title = document.createElement('h1'); title.textContent = current.state.label; root.append(title);
  if (current.state.description) { const text = document.createElement('p'); text.textContent = current.state.description; root.append(text); }
  for (const action of current.state.actions || []) {
    const button = document.createElement('button'); button.textContent = action.label;
    button.onclick = () => { session.act(action.id); render(); }; root.append(button);
  }
}
render();`;
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated experience</title><main></main><script type="module">${runtime}\n${render}</script></html>`;
    return { kind, producer: provenance.producer, experience, provenance,
      files: [{ path: `${kind}.mjs`, source: runtime, inheritAddress:true }, { path: 'index.html', source: html, inheritAddress:true }] };
  }
}
export default BehaviorArtifactProducer;
