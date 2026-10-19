/**
 * Durable per-project purpose/context is an append-only projection of the same
 * chain as conversations, receipts, builds, and repository-change events.
 * No silent overwrites; last entry is current state, earlier versions survive.
 */
function validateRepository(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) || value.includes('..')) {
    throw new Error('Repository must be owner/name');
  }
  return value;
}
const keys = ['purpose', 'whatExists', 'whatWorks', 'whatIsMissing', 'nextTask', 'notes'];
export function createProjectContexts({ ledger }) {
  function all() {
    const contexts = new Map();
    // This ledger cap is deliberate; a later indexed projection is needed if
    // the append-only history exceeds 2,000 entries.
    const events = ledger.read({ after: 0, limit: 2000 });
    for (const event of events) {
      if (event.type !== 'project_context' || !event.ref) continue;
      try {
        const value = JSON.parse(event.content);
        if (value && value.schema === 'synthai-project-context/v1') contexts.set(event.ref, { ...value, receipt: { seq: event.seq, hash: event.hash, timestamp: event.timestamp } });
      } catch { /* retain ledger integrity while isolating invalid legacy metadata */ }
    }
    return Object.fromEntries(contexts);
  }
  function one(repository) { return all()[validateRepository(repository)] || null; }
  async function save(input) {
    const repository = validateRepository(input?.repository);
    const current = one(repository);
    const next = { schema: 'synthai-project-context/v1', repository, revision: (current?.revision || 0) + 1 };
    for (const field of keys) {
      const text = input?.[field] === undefined ? String(current?.[field] ?? '') : String(input[field] ?? '');
      if (text.length > 4000) throw new Error(field + ' exceeds 4000 characters');
      next[field] = text;
    }
    if (!next.purpose.trim()) throw new Error('Every repository must have a purpose before saving a new context');
    const event = await ledger.append({ actor: 'human', type: 'project_context', ref: repository, content: JSON.stringify(next) });
    return { ...next, receipt: { seq: event.seq, hash: event.hash, timestamp: event.timestamp } };
  }
  return Object.freeze({ one, all, save });
}