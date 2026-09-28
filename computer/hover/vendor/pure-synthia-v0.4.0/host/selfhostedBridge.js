/**
 * Attach the phone-selfhosted Node server (127.0.0.1:3000) as a capability.
 * Does not replace synthia.process(). No spreading.
 */
const BASE = "http://127.0.0.1:3000";

export async function probeSelfhosted(timeoutMs = 1200) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}/mcp/status`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { up: false, status: res.status };
    const body = await res.json().catch(() => ({}));
    return { up: true, base: BASE, body };
  } catch (error) {
    clearTimeout(t);
    return { up: false, error: error.message || String(error) };
  }
}

export function studioUrl() {
  return `${BASE}/dashboard`;
}

export function startHint() {
  return "In Acode terminal: cd www/synthia-server && node server.js";
}

export async function selfhostedProcess(text, fallback) {
  const probe = await probeSelfhosted();
  if (!probe.up) return fallback ? fallback(text) : { summary: "Selfhosted engine offline.", path: [] };
  const res = await fetch(`${BASE}/mcp/capture`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, surface: "synth-ai-residence" }),
  });
  if (!res.ok) {
    return fallback ? fallback(text) : { summary: `Engine HTTP ${res.status}`, path: ["selfhosted"] };
  }
  const body = await res.json().catch(() => ({}));
  return {
    summary: body.summary || body.message || "Selfhosted accepted the cue.",
    addressText: body.addressText || "",
    path: ["selfhosted", ...(body.path || [])],
    raw: body,
  };
}
