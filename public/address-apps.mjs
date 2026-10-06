export function startAddressApps(computer, show) {
  const $ = id => document.getElementById(id);
  let data, session, expiresAt = 0, selectedType = '', refreshing = false;
  const rpc = (method, ...args) => computer.requireLocalBackend().rpc(method, ...args);
  const text = (id, value) => { $(id).textContent = value; };
  const button = (label, action) => { const b = document.createElement('button'); b.className = 'quiet'; b.textContent = label; b.onclick = action; return b; };
  const run = async (id, fn) => { try { await fn(); } catch (e) { text(id, e.message); } };
  async function open(address) {
    const app = await rpc('apps.resolve', address);
    if (app.launch) location.href = app.launch;
    else show(app.view);
  }
  function options(picker, apps) {
    picker.replaceChildren(...apps.map(app => { const o = document.createElement('option'); o.value = app.address; o.textContent = app.name; return o; }));
  }
  function render() {
    if (!data) return;
    const apps = data.apps.filter(app => app.enabled);
    $('addressApps').replaceChildren(...data.apps.map(app => {
      const row = document.createElement('p'); row.textContent = `${app.name} · ${app.address} ${app.enabled ? '' : '(disabled)'}`;
      const b = button('Open', () => run('addressStatus', () => open(app.address))); b.disabled = !app.enabled || !data.settings.enabled;
      row.append(b); return row;
    }));
    $('addressInbox').replaceChildren(...data.files.map(file => {
      const row = document.createElement('div'), label = document.createElement('p'), picker = document.createElement('select');
      label.textContent = `${file.name} · ${file.bytes} bytes · ${file.address}`; options(picker, apps); picker.value = file.address;
      row.append(label, picker, button('Route file', () => run('addressStatus', async () => { await rpc('apps.routeFile', file.id, picker.value); await refresh(true); text('addressStatus', 'File delivered to the app’s private inbox.'); })), button('Download', () => run('addressStatus', async () => {
        const record = await rpc('apps.readFile', file.id);
        const bytes = Uint8Array.from(atob(record.base64), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: record.type }));
        const a = document.createElement('a'); a.href = url; a.download = record.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }))); return row;
    }));
    text('adminInfo', data.adminConfigured ? 'Unlock owner admin with your device’s owner PIN.' : 'Choose a 6–12 digit PIN to claim owner admin on this device.');
    $('addressEnabled').checked = data.settings.enabled; $('suggestionsEnabled').checked = data.settings.suggestions;
    options($('scheduleApp'), apps);
    $('adminAppSettings').replaceChildren(...data.apps.filter(app => app.view !== 'admin').map(app => button(`${app.enabled ? 'Disable' : 'Enable'} ${app.name}`, () => run('adminStatus', async () => { await rpc('admin.configure', session, { address: app.address, disabled: app.enabled }); await refresh(true); }))));
    $('adminScheduleList').replaceChildren(...data.schedules.map(item => {
      const row = document.createElement('p'); row.textContent = `${item.label} · ${new Date(item.at).toLocaleString()}`;
      row.append(button('Cancel', () => run('adminStatus', async () => { await rpc('admin.cancel', session, item.id); await refresh(true); }))); return row;
    }));
    text('adminStatus', data.gptConfigured ? `GPT configured: ${data.gptModel}` : 'GPT key is not configured.');
    countdown();
  }
  function countdown() {
    if (session && Date.now() >= expiresAt) { session = null; $('ownerControls').hidden = true; text('adminStatus', 'Admin session expired. Unlock again.'); }
    const upcoming = data?.settings.enabled ? data.schedules.filter(item => item.at >= Date.now() - 60000 && data.apps.some(app => app.enabled && app.address === item.address)).sort((a,b) => a.at-b.at)[0] : null;
    text('appUpcoming', upcoming ? `◷ ${upcoming.label} · ${Math.max(0, Math.ceil((upcoming.at - Date.now()) / 1000))} seconds ${upcoming.at <= Date.now() ? '· Ready to open' : 'remaining'}` : 'No scheduled activities.');
  }
  async function refresh(full = false) {
    if (refreshing || !computer.localBackendVerified || document.hidden) return;
    refreshing = true;
    try {
      data = await rpc('apps.snapshot');
      if (full) render();
      countdown();
      const suggestions = await rpc('apps.suggestions', { type: selectedType, context: 'home' });
      $('appSuggestions').replaceChildren(...suggestions.map(app => {
        const card = document.createElement('article'), p = document.createElement('p'); p.textContent = `${app.name}: ${app.reason}`;
        card.append(p, button('Open app', () => run('addressStatus', () => open(app.address)))); return card;
      }));
    } catch (e) { text('addressStatus', e.message); }
    finally { refreshing = false; }
  }
  $('openAddress').onclick = () => run('addressStatus', () => open($('appAddress').value.trim()));
  $('addressFile').onchange = () => run('addressStatus', async () => {
    const file = $('addressFile').files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) throw new Error('Choose a file no larger than 2 MB.');
    const base64 = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
    selectedType = file.type || 'application/octet-stream';
    await rpc('apps.import', { name: file.name, type: selectedType, base64, address: $('appAddress').value.trim() }); await refresh(true); text('addressStatus', 'Imported into the addressed app inbox.');
  });
  $('unlockOwner').onclick = () => run('adminStatus', async () => {
    data = await rpc('apps.snapshot');
    const result = await rpc(data.adminConfigured ? 'admin.login' : 'admin.setup', $('ownerPin').value);
    $('ownerPin').value = ''; session = result.session; expiresAt = result.expiresAt; $('ownerControls').hidden = false; await refresh(true);
  });
  $('lockOwner').onclick = () => run('adminStatus', async () => { await rpc('admin.logout', session); session = null; $('ownerControls').hidden = true; $('gptKey').value = ''; text('adminStatus', 'Owner admin locked.'); });
  $('saveAddressSettings').onclick = () => run('adminStatus', async () => { await rpc('admin.configure', session, { enabled: $('addressEnabled').checked, suggestions: $('suggestionsEnabled').checked }); await refresh(true); });
  $('scheduleAddress').onclick = () => run('adminStatus', async () => { await rpc('admin.schedule', session, { address: $('scheduleApp').value, label: $('scheduleLabel').value, at: new Date($('scheduleWhen').value).getTime() }); await refresh(true); });
  $('saveGpt').onclick = () => run('adminStatus', async () => { const key = $('gptKey').value; $('gptKey').value = ''; await rpc('admin.gpt.configure', session, { key, model: $('gptModel').value.trim() }); await refresh(true); });
  $('removeGpt').onclick = () => run('adminStatus', async () => { await rpc('admin.gpt.configure', session, { key: '' }); await refresh(true); });
  $('askGpt').onclick = () => run('gptReply', async () => { text('gptReply', 'GPT is responding…'); const reply = await rpc('admin.gpt.chat', session, $('gptMessage').value); text('gptReply', reply.text); });
  computer.bus.on('local-backend:verified', () => refresh(true));
  setInterval(countdown, 1000); setInterval(() => refresh(false), 10000); refresh(true);
}
