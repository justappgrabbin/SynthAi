import { runSlice } from './bridge.mjs';
import { mountPlayableWorld } from './world-play.mjs';
import { nearestReachable, recordSnapshot } from './character-world.mjs';

const $ = selector => document.querySelector(selector);
const playable = mountPlayableWorld(document);
let mode = 'Play', voice = false, episode = null;
const copy = {
  Watch: ['A moment in the residence', 'Review your last recorded event without changing your world.', 'Review last event ↗'],
  Play: ['Choose an interaction', 'Walk near an object, then interact with it. The simulation keeps its outcome.', 'Interact in the world ↗'],
  Create: ['Create a new possibility', 'Run the supplied Klein grammar, neural classifier and world capability experiment in this same visible habitat.', 'Generate & execute scene ↗'],
  Mission: ['Reach the beacon', 'Find the glowing goal beacon at the northeast of the map, then activate it from nearby.', 'Activate goal beacon ↗']
};
for (const button of document.querySelectorAll('[data-mode]')) {
  button.addEventListener('click', () => {
    mode = button.dataset.mode;
    for (const other of document.querySelectorAll('[data-mode]')) other.classList.toggle('active', other === button);
    const [title, copyText, action] = copy[mode];
    $('#scene-title').textContent = title;
    $('#scene-copy').textContent = copyText;
    $('#act').textContent = action;
  });
}
$('#voice').addEventListener('click', () => {
  voice = !voice;
  $('#voice').textContent = voice ? 'Voice on' : 'Voice off';
  $('#voice').setAttribute('aria-pressed', String(voice));
  if (!voice) { globalThis.speechSynthesis?.cancel(); $('.waves').classList.remove('speaking'); }
});
function speak(text) {
  if (!voice || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onstart = () => $('.waves').classList.add('speaking');
  utterance.onend = utterance.onerror = () => $('.waves').classList.remove('speaking');
  speechSynthesis.cancel(); speechSynthesis.speak(utterance);
}
function setReceipt(text) { $('#receipt').textContent = text; }
function showHistory() {
  const events = playable?.world.worldLedger.filter(e => !['GENESIS', 'MODE'].includes(e.type)) ?? [];
  const last = events.at(-1);
  $('#history-title').textContent = last ? 'Interaction ' + last.id : 'Your first chapter';
  $('#history').textContent = last ? last.text + ' · ' + events.length + ' events in this world.' : 'Move through the habitat and use Interact or Morph.';
}
showHistory();
$('#act').addEventListener('click', async () => {
  const button = $('#act'); button.disabled = true;
  if (!playable) { setReceipt('World simulation is unavailable.'); button.disabled = false; return; }
  try {
    const world = playable.world;
    if (mode === 'Watch') {
      const last = world.worldLedger.filter(e => !['GENESIS', 'MODE'].includes(e.type)).at(-1);
      if (!last) { setReceipt('No world interactions have been recorded yet.'); return; }
      setReceipt(last.type + ': ' + last.text);
    } else if (mode === 'Play') {
      const near = nearestReachable(world);
      if (!near) { setReceipt('Walk close to an object to interact with it.'); return; }
      if (playable.interact()) {
        setReceipt(world.worldLedger.at(-1)?.text || 'Interaction added to the world.');
        speak('Interaction recorded.');
      }
    } else if (mode === 'Create') {
      if (!world.object('chair')) { setReceipt('The original chair is missing. Reset the saved world to restore it.'); return; }
      episode = await runSlice(world);
      playable.save();
      const e = episode.event;
      setReceipt(e.executed
        ? 'Klein-neural action executed in the visible world. Chair morph state: ' + e.before + ' → ' + e.after + '.'
        : 'Neural experiment completed, but no emergent world action qualified for execution. No capability was fabricated.');
      try { localStorage.setItem('synthia-world-episode', JSON.stringify(episode)); } catch { /* local storage can be limited */ }
      speak(e.executed ? 'A new possibility was executed.' : 'The experiment was recorded without an executed capability.');
    } else if (mode === 'Mission') {
      const beacon = world.object('beacon'), player = world.agents.find(agent => agent.player);
      const distance = beacon ? Math.hypot(player.position.x - beacon.x, player.position.z - beacon.z) : Infinity;
      if (distance > 1.8) { setReceipt('Mission incomplete. Walk to the glowing Goal Beacon first.'); return; }
      world.post('MISSION', 'Goal Beacon reached by ' + player.name, player, player.activeState, { targetId: beacon.id, verified: true });
      playable.save();
      setReceipt('Mission complete. The beacon visit is recorded in your world ledger.');
      speak('Mission complete.');
    }
    showHistory();
  } catch (error) { setReceipt('Action was not completed: ' + error.message); }
  finally { button.disabled = false; }
});
$('#reference').addEventListener('click', () => { $('#refs').open = true; $('#refs').scrollIntoView({ behavior: 'smooth' }); });
$('#export').addEventListener('click', () => {
  if (!playable) { setReceipt('World is not loaded.'); return; }
  const world = playable.world;
  const payload = {
    exportedAt: new Date().toISOString(), version: 'synthia-hover-world-1',
    summary: world.summary(),
    checkpoint: recordSnapshot(world, playable.state.formIndex, playable.state.companion, playable.state.following),
    worldLedger: world.worldLedger,
    episode: episode ?? (() => { try { return JSON.parse(localStorage.getItem('synthia-world-episode') || 'null'); } catch { return null; } })()
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'you-n-i-verse-world.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setReceipt('World state, evidence events and existing generated episode exported.');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) showHistory(); });
