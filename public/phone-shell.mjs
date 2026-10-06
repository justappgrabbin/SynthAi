import { createHostSpriteSheet } from '/computer-runtime/runtime/photo-avatar.mjs';

export function startPhoneShell(computer) {
  const $ = id => document.getElementById(id);
  const frame = $('realmApp');
  if (!frame) return;
  let packet = null;
  let fetching = false;
  let boundUserId;
  let profilePending = Promise.resolve();
  let audio;

  function sendSession() {
    if (packet?.realm) frame.contentWindow?.postMessage({ type: 'phone:session', session: packet.realm, encoding: $('swarmEncoding').value }, location.origin);
  }

  function renderSession() {
    const realm = packet?.realm;
    if (!realm) return;
    $('worldRequest').disabled = !!realm.worldChoice;
    $('chooseWorld').disabled = !!realm.worldChoice || !realm.profile;
    $('worldChoiceStatus').textContent = realm.worldChoice ? `Your world: ${realm.worldChoice.request}` : 'Your world has not been chosen yet.';
    if (realm.worldChoice) $('worldRequest').value = realm.worldChoice.request;
    $('roomStatus').textContent = realm.room.error ?? (realm.room.mode === 'local' ? 'Your local world' : `${realm.room.mode === 'host' ? 'Hosting your world' : 'Shared world'} · ${realm.room.peers} connected`);
    if (realm.room.invite) $('worldInvite').value = realm.room.invite;
    $('realmStatus').textContent = realm.profile
      ? `${realm.profile.name} · ${realm.worlds.find(world => world.id === realm.world?.worldId)?.name ?? 'Consciousness Realm'}`
      : 'Consciousness Realm · Create or load your profile in Resonance Network to embody your addresses.';
    const picker = $('worldSelect');
    picker.replaceChildren(...realm.worlds.map(world => {
      const option = document.createElement('option');
      option.value = world.id; option.textContent = world.name;
      option.selected = world.id === realm.world?.worldId;
      return option;
    }));
    sendSession();
    const expression = realm.profile?.addresses?.[0]?.expression;
    if (expression) {
      $('expressionInspector').textContent = `${expression.sentence}\n\n${expression.structure.hexagram} ${expression.structure.name}\nBits (line 1 first): ${expression.structure.bits.join(' ')}\nBigrams: ${expression.structure.bigrams.map(group => group.join('')).join(' / ')}\nTrigrams: ${expression.structure.trigrams.map(group => group.join('')).join(' / ')}\n\n${expression[$('swarmEncoding').value]}\n\nRules: ${realm.swarm.rules} · ${realm.swarm.mode}`;
      if (expression.channels) $('expressionInspector').textContent += `\nSound: ${expression.channels.sound.freq.toFixed(2)} Hz · ${expression.channels.sound.timbre}\nColor: ${expression.channels.color.hex} · ${expression.channels.color.layer}\nProjection: ${expression.channels.projection}`;
      const unit = realm.swarm.pieces.find(piece => piece.ownerId === realm.profile.id);
      if (unit?.fields) $('expressionInspector').textContent += '\n\nFive simultaneous fields:\n' + Object.entries(unit.fields).map(([name, field]) => `${name} · ${field.scale}\n  amplitude ${field.qualities.amplitude.toFixed(4)} · phase ${field.qualities.phase.toFixed(4)}${field.micro?.expression?.name ? `\n  micro: ${field.micro.expression.name}` : ''}${field.macro?.chain?.length ? `\n  macro: ${field.macro.chain.map(claim => claim.value).join(' → ')}` : ''}`).join('\n') + `\n\nHexagram vocabulary: ${realm.swarm.hexagrams.length}`;
    }
  }

  async function refresh() {
    $('phoneClock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('phoneDate').textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    if (fetching || document.hidden || !computer.localBackendVerified) return;
    fetching = true;
    try {
      packet = await computer.requireLocalBackend().rpc('phone.runtime');
      const child = packet.resonance?.children?.['resonance-network'];
      const ready = child?.state === 'ready';
      const label = ready ? 'Resonance Network running on this phone' : `Resonance Network: ${child?.state ?? 'not installed'}`;
      $('phoneNetworkStatus').textContent = label;
      $('resonanceStatus').textContent = child?.error ? `${label} · ${child.error}` : label;
      if (ready && !$('resonanceApp').getAttribute('src')) $('resonanceApp').src = 'http://127.0.0.1:17383/';
      if (!ready) $('resonanceApp').removeAttribute('src');
      renderSession();
    } catch (error) {
      $('phoneNetworkStatus').textContent = error.message;
      $('resonanceStatus').textContent = error.message;
      $('resonanceApp').removeAttribute('src');
    } finally { fetching = false; }
  }

  window.addEventListener('message', event => {
    if (event.source === frame.contentWindow && event.origin === location.origin) {
      if (event.data?.type === 'realm:ready') sendSession();
      if (event.data?.type === 'realm:event' && computer.localBackendVerified) {
        computer.requireLocalBackend().rpc('phone.observe', event.data.event)
          .catch(error => { $('realmStatus').textContent = error.message; });
      }
    }
    if (event.source !== $('resonanceApp').contentWindow || event.origin !== 'http://127.0.0.1:17383' || event.data?.type !== 'resonance:profile') return;
    const userId = event.data.userId;
    if (userId === boundUserId) return;
    profilePending = profilePending.then(async () => {
      try {
        packet ??= {};
        packet.realm = await computer.requireLocalBackend().rpc('phone.bindProfile', userId);
        boundUserId = userId;
        renderSession();
      } catch (error) { $('realmStatus').textContent = error.message; }
    });
  });
  $('worldSelect').addEventListener('change', async event => {
    try { packet.realm = await computer.requireLocalBackend().rpc('phone.enterWorld', event.target.value); renderSession(); }
    catch (error) { $('realmStatus').textContent = error.message; }
  });
  for (const [id, method] of [['hostWorld', 'phone.hostRoom'], ['joinWorld', 'phone.joinRoom'], ['leaveWorld', 'phone.leaveRoom']]) {
    $(id).addEventListener('click', async () => {
      try { packet.realm = await computer.requireLocalBackend().rpc(method, ...(id === 'joinWorld' ? [$('worldInvite').value.trim()] : [])); renderSession(); }
      catch (error) { $('roomStatus').textContent = error.message; }
    });
  }
  $('copyWorldInvite').addEventListener('click', async () => {
    if (packet?.realm?.room?.invite) { await navigator.clipboard.writeText(packet.realm.room.invite); $('roomStatus').textContent = 'Invitation copied. Share it with someone on the same network.'; }
  });

  async function photoData(file, sheet = false) {
    if (!file) return undefined;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP image.');
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    let ratio = Math.min(1, (sheet ? 4096 : 1024) / Math.max(bitmap.width, bitmap.height));
    let data;
    do {
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      data = canvas.toDataURL(sheet || file.type === 'image/png' ? 'image/png' : 'image/jpeg', .86);
      ratio *= .8;
    } while (data.length > 1900000 && Math.max(canvas.width, canvas.height) > 256);
    bitmap.close();
    return data;
  }
  $('saveWorld').addEventListener('click', async () => {
    try {
      const [photo, spriteSheet] = await Promise.all([photoData($('avatarPhoto').files[0]), photoData($('avatarSheet').files[0], true)]);
      packet.realm = await computer.requireLocalBackend().rpc('phone.preferences', { photo, spriteSheet, frameCount: $('avatarFrames').value });
      $('avatarPhoto').value = ''; $('avatarSheet').value = '';
      renderSession();
    } catch (error) { $('realmStatus').textContent = error.message; }
  });
  $('chooseWorld').addEventListener('click', async () => {
    $('chooseWorld').disabled = true;
    try {
      packet ??= {};
      packet.realm = await computer.requireLocalBackend().rpc('phone.chooseWorld', $('worldRequest').value);
      renderSession();
    } catch (error) {
      $('worldChoiceStatus').textContent = error.message;
      $('chooseWorld').disabled = false;
    }
  });
  $('downloadAvatar').addEventListener('click', async () => {
    try {
      if (!packet?.realm?.avatar?.photo) throw new Error('Choose an avatar photo and save your world first.');
      const expression = packet.realm.world.contract.hostExpression;
      const sheet = await createHostSpriteSheet(packet.realm.avatar.photo, { ...expression.atmosphere, material: expression.material, kind: packet.realm.world.contract.sceneMorph?.kind ?? 'human' });
      const link = document.createElement('a'); link.href = sheet; link.download = 'my-avatar-12-states.png'; link.click();
    } catch (error) { $('realmStatus').textContent = error.message; }
  });
  $('swarmEncoding').addEventListener('change', renderSession);
  $('hearAddress').addEventListener('click', () => {
    const sentence = packet?.realm?.profile?.addresses?.[0]?.expression?.sentence;
    if (sentence && 'speechSynthesis' in window) { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(sentence)); }
  });
  $('playAddress').addEventListener('click', async () => {
    const sound = packet?.realm?.profile?.addresses?.[0]?.expression?.channels?.sound;
    if (!sound) return;
    audio ??= new AudioContext(); await audio.resume();
    const gain = audio.createGain();
    const now = audio.currentTime, duration = Math.max(.15, Math.min(2, sound.duration * .5));
    let oscillator;
    if (sound.timbre === 'noise') {
      oscillator = audio.createBufferSource();
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * duration), audio.sampleRate), data = buffer.getChannelData(0);
      let seed = Math.round(sound.freq * 1000) || 1;
      for (let i = 0; i < data.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = (seed >>> 0) / 2147483648 - 1; }
      oscillator.buffer = buffer;
    } else {
      oscillator = audio.createOscillator();
      if (sound.timbre === 'pulse') {
        const real = new Float32Array(32), imaginary = new Float32Array(32);
        for (let n = 1; n < 32; n++) imaginary[n] = Math.sin(Math.PI * n * .25) / n;
        oscillator.setPeriodicWave(audio.createPeriodicWave(real, imaginary));
      } else oscillator.type = sound.timbre;
      oscillator.frequency.value = sound.freq;
    }
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(sound.velocity * .07, now + .03); gain.gain.linearRampToValueAtTime(0, now + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + duration); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  });
  computer.bus.on('local-backend:verified', refresh);
  document.addEventListener('visibilitychange', refresh);
  refresh();
  const timer = setInterval(refresh, 3000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
