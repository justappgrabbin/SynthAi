// On-device bridge to the existing external Sites MCP. No credentials are copied from ChatGPT.
const byId = id => document.getElementById(id);
const api = async (path, method = 'GET', payload) => {
  const key = sessionStorage.getItem('synthia-companion-key') || '';
  if (!/^[a-f0-9]{64}$/.test(key)) throw Error('Unlock the local Continuity companion with your phone key first.');
  const response = await fetch(path, {
    method,
    headers: { 'x-synthia-access-key': key, 'content-type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error || ('Local MCP API returned HTTP ' + response.status));
  return data;
};
function status(info) {
  byId('sites-mcp-state').textContent = info.connected ? 'Verified from this Android runtime' : 'Remote MCP is not connected from Android';
  byId('sites-mcp-detail').textContent = info.connected
    ? 'Handshake and tools/list succeeded · ' + (info.server || 'MCP server')
    : String(info.error || 'Run the live handshake check to diagnose authorization.');
  byId('sites-mcp-tools').textContent = info.tools?.length
    ? 'Available read-only tool names: ' + info.tools.join(', ')
    : 'No remote tools are available for phone calls until discovery succeeds.';
}
function render(result) {
  const content = result?.content || [];
  if (!Array.isArray(content) || result?.isError) throw Error(content.map(x => x.text || '').join('\n') || 'Remote MCP tool returned an error');
  const str = content.filter(x => x.type === 'text').map(x => x.text).join('\n');
  let parsed;
  try { parsed = JSON.parse(str); } catch { parsed = null; }
  if (Array.isArray(parsed)) return parsed.map(entry => typeof entry === 'object' ? (entry.path || entry.name || JSON.stringify(entry)) : String(entry)).join('\n');
  if (parsed && typeof parsed === 'object') return Object.entries(parsed)
    .map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value))).join('\n');
  return str || 'Server returned no text';
}
async function check() {
  byId('sites-mcp-state').textContent = 'Checking remote MCP initialize + tools/list…';
  try { status(await api('/api/companion/sites/discover','POST',{})); }
  catch (error) { status({ connected:false, error:error.message, tools:[] }); }
}
async function callTool(name) {
  const out = byId('sites-mcp-output');
  out.textContent = 'Calling ' + name + ' on the remote server…';
  try { const data = await api('/api/companion/sites/call', 'POST', {name,arguments:{}});
    out.textContent = render(data.result);
  } catch (error) { out.textContent = 'Not available: ' + error.message; }
}
byId('sites-mcp-test').addEventListener('click',check);
byId('sites-mcp-status').addEventListener('click',()=>callTool('synthai2_status'));
byId('sites-mcp-apps').addEventListener('click',()=>callTool('synthai2_list_apps'));
api('/api/companion/sites/status').then(status).catch(() => {});
