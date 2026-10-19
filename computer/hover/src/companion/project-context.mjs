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
const keys = ['purpose', 'whatExists', 'whatWorks', 'whatIsMissing', 'nextTask', 'notes', 'releaseCriteria', 'androidPackageName'];
const statuses = new Set(['todo','doing','blocked','verified']);
const decisions = new Set(['active','ship-candidate','paused','retired']);
function validateMilestones(raw) {
  if (!Array.isArray(raw) || raw.length > 25) throw new Error('Use at most 25 milestones');
  const names = new Set();
  return raw.map((item, i) => {
    const name = String(item?.name || '').trim();
    const status = String(item?.status || 'todo');
    const evidence = String(item?.evidence || '').trim();
    if (!name || name.length > 180 || names.has(name.toLowerCase())) throw new Error('Milestone ' + (i+1) + ' has invalid/duplicate name');
    if (!statuses.has(status)) throw new Error('Invalid milestone status');
    if (evidence.length > 1000) throw new Error('Milestone evidence exceeds 1000 characters');
    if (status === 'verified' && !evidence) throw new Error('Verified milestone "' + name + '" needs actual evidence');
    names.add(name.toLowerCase());
    return { name, status, evidence };
  });
}
export function progressOf(project) {
  const items = project?.milestones || [];
  if (!items.length) return { percent: null, completed: 0, total: 0, blockers: 0, readiness: 'unassessed', note: 'Goals are not defined yet; cannot calculate progress.' };
  const completed = items.filter(x => x.status === 'verified' && x.evidence).length;
  const blockers = items.filter(x => x.status === 'blocked').length;
  const percent = Math.round(completed / items.length * 100);
  const readiness = project.decision === 'retired' ? 'retired'
    : project.decision === 'paused' ? 'paused'
    : completed === items.length && !blockers && project.releaseCriteria?.trim() ? 'review-for-release'
    : blockers ? 'blocked' : 'in-progress';
  return { percent, completed, total: items.length, blockers, readiness,
    note: 'Evidence-backed milestone count only; not an estimate of remaining time or all work.' };
}
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
    return Object.fromEntries([...contexts].map(([key, value]) => [key, { ...value, progress: progressOf(value) }]));
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
    next.milestones = validateMilestones(input?.milestones === undefined ? (current?.milestones || []) : input.milestones);
    next.decision = input?.decision === undefined ? (current?.decision || 'active') : String(input.decision);
    if (!decisions.has(next.decision)) throw new Error('Invalid project decision');
    if (next.androidPackageName && !/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(next.androidPackageName)) throw new Error('Android package must be a valid installed app identifier');
    if (!next.purpose.trim()) throw new Error('Every repository must have a purpose before saving a new context');
    const event = await ledger.append({ actor: 'human', type: 'project_context', ref: repository, content: JSON.stringify(next) });
    return { ...next, progress: progressOf(next), receipt: { seq: event.seq, hash: event.hash, timestamp: event.timestamp } };
  }
  return Object.freeze({ one, all, save });
}