/** Protocol adapter for the existing Synthia Computer host.
 * Real /api/chat replies only; no simulated LLM or canned fallback.
 * HTTP permitted only for loopback, remote hosts require HTTPS.
 */
export const DEFAULT_COMPUTER_ORIGIN = 'http://127.0.0.1:8765';

export function computerOrigin(raw = DEFAULT_COMPUTER_ORIGIN) {
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('Computer URL is missing.');
  let url;
  try { url = new URL(raw.trim()); } catch { throw new Error('Invalid Computer URL.'); }
  if (url.username || url.password || url.hash || url.search) {
    throw new Error('Use a Computer base URL without credentials or query parameters.');
  }
  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  if (!(url.protocol === 'https:' || (url.protocol === 'http:' && isLoopback))) {
    throw new Error('Remote Computer addresses require HTTPS.');
  }
  const path = url.pathname.replace(/\/+$/, '');
  if (path && path !== '/' && path !== '/api/chat') {
    throw new Error('Use the Computer base URL (or /api/chat).');
  }
  return url.origin;
}

export async function requestComputerChat(
  text,
  { baseUrl = DEFAULT_COMPUTER_ORIGIN, fetcher = fetch, timeoutMs = 15000 } = {}
) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Message must not be empty.');
  if (text.length > 12000) throw new Error('Message is too long.');
  const origin = computerOrigin(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetcher(origin + '/api/chat', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({text}), signal: controller.signal,
    });
    if (!result.ok) throw new Error('Computer HTTP ' + result.status);
    const data = await result.json();
    if (!data || typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('Computer returned no reply.');
    }
    return {text: data.text, provider: data.provider || null,
      resident: data.resident || null, eventId: data.eventId || null};
  } finally { clearTimeout(timeout); }
}

export async function checkComputer({baseUrl = DEFAULT_COMPUTER_ORIGIN, fetcher = fetch} = {}) {
  const r = await fetcher(computerOrigin(baseUrl) + '/api/status');
  if (!r.ok) return {ready: false, status: r.status};
  const body = await r.json();
  return {ready: body.ready === true, computer: body.computer || null};
}
