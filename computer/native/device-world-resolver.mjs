const clone = value => value === undefined ? undefined : structuredClone(value);

export const LEGACY_DEVICE_CATEGORIES = Object.freeze({
  ENGINE: Object.freeze({
    glyph: '◈',
    role: 'machine',
    defaultKind: 'machine-system',
    description: 'Core mechanics, system state, services, settings and processes',
  }),
  INTERFACE: Object.freeze({
    glyph: '◯',
    role: 'place',
    defaultKind: 'application-place',
    description: 'Interactive surfaces and applications the inhabitant can enter',
  }),
  AGENT: Object.freeze({
    glyph: '◆',
    role: 'inhabitant',
    defaultKind: 'person-presence',
    description: 'People, assistants, agents and autonomous presences',
  }),
  WORLD: Object.freeze({
    glyph: '⬡',
    role: 'world',
    defaultKind: 'world-place',
    description: 'Spatial systems, maps, locations and navigable environments',
  }),
  KNOWLEDGE: Object.freeze({
    glyph: '◉',
    role: 'artifact',
    defaultKind: 'document-object',
    description: 'Documents, memory, media, archives and knowledge artifacts',
  }),
});

const APP_KIND_RULES = Object.freeze([
  { test: /communication|social|messag|chat|mail/i, kind: 'communication-place', function: 'communicate', symbol: 'conversation' },
  { test: /creative|photo|image|paint|draw|design|studio/i, kind: 'creation-studio', function: 'create', symbol: 'art' },
  { test: /productivity|office|notes?|document|editor/i, kind: 'workshop-place', function: 'work', symbol: 'tool' },
  { test: /map|navigation|travel|transport/i, kind: 'navigation-world', function: 'navigate', symbol: 'path' },
  { test: /music|audio|video|media|stream/i, kind: 'media-hall', function: 'experience-media', symbol: 'media' },
  { test: /education|learn|book|reader/i, kind: 'learning-place', function: 'learn', symbol: 'knowledge' },
  { test: /game|play/i, kind: 'play-space', function: 'play', symbol: 'play' },
  { test: /finance|bank|wallet|ledger/i, kind: 'ledger-house', function: 'finance', symbol: 'ledger' },
  { test: /system|settings?|device|utility|tools?/i, kind: 'machine-room', function: 'control-device', symbol: 'control' },
]);

function textOf(input = {}) {
  return [
    input.name,
    input.label,
    input.packageName,
    input.category,
    input.mimeType,
    input.kind,
    input.type,
    input.description,
  ].filter(Boolean).join(' ');
}

function categoryFor(input = {}) {
  const sourceType = String(input.sourceType ?? input.type ?? '').toLowerCase();
  const text = textOf(input);

  if (['contact','person','agent','assistant','mcp','resident'].includes(sourceType)) {
    return { category: 'AGENT', confidence: 1, reason: 'source-type' };
  }
  if (['document','file','memory','archive','media','photo'].includes(sourceType)) {
    return { category: 'KNOWLEDGE', confidence: 1, reason: 'source-type' };
  }
  if (['setting','process','service','sensor','device-state','system'].includes(sourceType)) {
    return { category: 'ENGINE', confidence: 1, reason: 'source-type' };
  }
  if (['location','world','map','navigation'].includes(sourceType)) {
    return { category: 'WORLD', confidence: 1, reason: 'source-type' };
  }
  if (['application','app','interface','screen','notification','route'].includes(sourceType)) {
    return { category: 'INTERFACE', confidence: 0.95, reason: 'source-type' };
  }

  const tests = [
    ['WORLD', /spatial|location|world|map|universe|navigation|route|district/i],
    ['AGENT', /agent|assistant|bot|oracle|person|contact|resident|npc/i],
    ['KNOWLEDGE', /context|knowledge|data|memory|document|archive|note|book|media/i],
    ['INTERFACE', /component|widget|ui|view|screen|display|application|app/i],
    ['ENGINE', /engine|core|system|calculator|state|manager|service|process|setting/i],
  ];
  for (const [category, re] of tests) {
    if (re.test(text)) return { category, confidence: 0.75, reason: 'legacy-keyword' };
  }
  return { category: 'ENGINE', confidence: 0.5, reason: 'legacy-default' };
}

function applicationWorld(input = {}) {
  const text = textOf(input);
  for (const rule of APP_KIND_RULES) {
    if (rule.test.test(text)) return { kind: rule.kind, function: rule.function, symbol: rule.symbol };
  }
  return { kind: 'application-place', function: input.category ?? 'application', symbol: 'app' };
}

function worldShape(input, category) {
  const sourceType = String(input.sourceType ?? input.type ?? '').toLowerCase();

  if (sourceType === 'application' || sourceType === 'app') return applicationWorld(input);
  if (sourceType === 'document' || sourceType === 'file') {
    return { kind: 'document-object', function: input.mimeType ?? input.kind ?? 'document', symbol: 'document' };
  }
  if (sourceType === 'contact' || sourceType === 'person') {
    return { kind: 'person-presence', function: 'contact', symbol: 'person' };
  }
  if (sourceType === 'setting') {
    return { kind: 'world-law', function: input.category ?? 'setting', symbol: 'control' };
  }
  if (sourceType === 'notification') {
    return { kind: 'world-event', function: input.category ?? 'notification', symbol: 'event' };
  }
  if (sourceType === 'process' || sourceType === 'service') {
    return { kind: 'machine-process', function: sourceType, symbol: 'process' };
  }
  if (sourceType === 'location' || sourceType === 'world' || sourceType === 'map') {
    return { kind: 'world-place', function: sourceType, symbol: 'world' };
  }

  const legacy = LEGACY_DEVICE_CATEGORIES[category];
  return { kind: legacy.defaultKind, function: legacy.role, symbol: legacy.role };
}

/**
 * Deterministic device-to-world resolver recovered from the Legacy/LegacyBuilder
 * organizer pattern: identify what an input is, classify it, assign a glyph,
 * then route it to a semantic destination before rendering.
 *
 * The resolver does not decide personal appearance. IndiVerse grammar remains
 * responsible for host-specific expression after canonical identity is resolved.
 */
export class DeviceWorldResolver {
  constructor({ id = 'legacy-device-world-resolver', version = 1 } = {}) {
    this.id = id;
    this.version = version;
  }

  resolve(input = {}) {
    const normalized = {
      sourceType: String(input.sourceType ?? input.type ?? 'unknown').toLowerCase(),
      id: input.id == null ? null : String(input.id),
      name: input.name ?? input.label ?? null,
      label: input.label ?? input.name ?? null,
      packageName: input.packageName ?? null,
      category: input.category ?? null,
      mimeType: input.mimeType ?? null,
      kind: input.kind ?? null,
      description: input.description ?? null,
      metadata: clone(input.metadata ?? {}),
    };

    const classification = categoryFor(normalized);
    const legacy = LEGACY_DEVICE_CATEGORIES[classification.category];
    const world = worldShape(normalized, classification.category);
    const privateByDefault = ['document','file','contact','person','setting','device-state']
      .includes(normalized.sourceType);

    return {
      resolver: this.id,
      version: this.version,
      source: normalized,
      category: classification.category,
      glyph: legacy.glyph,
      role: legacy.role,
      confidence: classification.confidence,
      reason: classification.reason,
      world: {
        kind: world.kind,
        function: world.function,
        presentation: {
          glyph: legacy.glyph,
          symbol: world.symbol,
          material: 'shared-interface',
        },
      },
      privacy: {
        privateByDefault,
      },
    };
  }
}

export default DeviceWorldResolver;
