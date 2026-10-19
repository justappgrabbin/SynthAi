// Existing published SynthAi2 — YOU-N-I-VERSE MCP; outbound, no tunnel or shared credentials.
export const SYNTHAI2_MCP_URL = 'https://synthai2-computer.adayacarter8.chatgpt.site/mcp';
// Never run remote mutations through a generic tool proxy. Only explicitly selected reads.
export const SITES_READ_TOOLS = Object.freeze([
  'synthai2_status', 'synthia_server_status', 'synthai2_list_apps',
  'synthai2_list_source', 'synthai2_read_source',
  'synthia_longitude_to_address', 'synthia_calculate_human_design',
  'synthia_calculate_transit', 'synthia_parse_symbolic_structure',
]);
function limitedText(message) { return String(message ?? '').slice(0, 420); }
function decodeMcp(body, contentType) {
  if (/text\/event-stream/i.test(contentType)) {
    const messages = [];
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const value = line.slice(5).trim();
      if (value && value !== '[DONE]') {
        try { messages.push(JSON.parse(value)); } catch {}
      }
    }
    const resolved = messages.find(item => item && (item.result || item.error));
    if (!resolved) throw Error('Remote MCP event stream contained no JSON-RPC response');
    return resolved;
  }
  try { return JSON.parse(body); }
  catch { throw Error('Remote endpoint returned non-MCP content'); }
}
export function createSitesMcpLink({ fetchImpl = globalThis.fetch, endpoint = SYNTHAI2_MCP_URL } = {}) {
  if (endpoint !== SYNTHAI2_MCP_URL) throw Error('Only the existing verified SynthAi2 Site is allowed');
  let last = { connected: false, checkedAt: null, endpoint, tools: [], error: 'Not checked from this Android runtime yet' };
  async function exchange(message) {
    const response = await fetchImpl(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(9500),
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json, text/event-stream',
        'mcp-protocol-version': '2025-06-18',
      },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403)
        throw Error('Site MCP requires Sites viewer authorization (HTTP ' + response.status + '). The ChatGPT connection cannot be reused as an Android login.');
      throw Error('Site MCP returned HTTP ' + response.status);
    }
    const raw = await response.text();
    if (raw.length > 128000) throw Error('Remote MCP result exceeded 128 KB');
    const parsed = decodeMcp(raw, response.headers.get('content-type') || '');
    if (parsed.error) throw Error('Remote MCP: ' + limitedText(parsed.error.message));
    return parsed.result;
  }
  async function discover() {
    try {
      const initialized = await exchange({ jsonrpc: '2.0', id: 1, method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'synthai-hover', version: '0.1.0' } } });
      if (!initialized?.serverInfo?.name) throw Error('Endpoint did not return MCP server information');
      const discovered = await exchange({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
      if (!Array.isArray(discovered?.tools)) throw Error('Endpoint did not provide MCP tools/list');
      const tools = discovered.tools.map(item => item.name).filter(n => SITES_READ_TOOLS.includes(n));
      last = { connected: true, checkedAt: new Date().toISOString(), endpoint,
        server: initialized.serverInfo.name, tools, error: null };
    } catch (error) {
      last = { connected: false, checkedAt: new Date().toISOString(), endpoint,
        tools: [], error: limitedText(error.message) };
    }
    return { ...last, tools: [...last.tools] };
  }
  async function call(name, args = {}) {
    if (!SITES_READ_TOOLS.includes(name)) throw Error('Remote MCP tool not allowlisted');
    if (!last.connected || !last.tools.includes(name)) throw Error('Test remote MCP tool discovery before calling a tool');
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('MCP tool arguments must be an object');
    const result = await exchange({ jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name, arguments: args } });
    if (!result || !Array.isArray(result.content)) throw Error('Remote MCP returned invalid tool result');
    return result;
  }
  return Object.freeze({ status: () => ({...last, tools:[...last.tools]}), discover, call });
}
