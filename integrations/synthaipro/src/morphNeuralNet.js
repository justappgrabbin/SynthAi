const STORAGE_KEY = 'synthaipro:morph-neural-net:v1';

const now = () => new Date().toISOString();
const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

export const MORPH_MODES = ['exact', 'equivalent', 'morph_runtime', 'improved'];

export function createMorphNet() {
  return {
    id: 'synthaipro-morph-neural-net',
    version: 1,
    phase: 'learning',
    artifacts: [],
    memories: [],
    skills: [
      { id: 'skill_upload', name: 'Upload Intake', strength: 0.72, purpose: 'Accept files, code, and zip contents.' },
      { id: 'skill_chunk', name: 'Source Memory', strength: 0.81, purpose: 'Preserve source in indexed chunks without losing function.' },
      { id: 'skill_reconstruct', name: 'Exact Reconstruction', strength: 0.68, purpose: 'Rebuild known inputs honestly from remembered chunks.' },
      { id: 'skill_morph', name: 'Morph Runtime', strength: 0.59, purpose: 'Transform remembered systems into usable versions.' },
      { id: 'skill_learn', name: 'Functional Learning', strength: 0.64, purpose: 'Improve behavior from uploaded source patterns.' }
    ],
    events: [{ id: uid('event'), type: 'boot', message: 'Morph neural net initialized.', at: now() }]
  };
}

export function loadMorphNet() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : createMorphNet();
  } catch {
    return createMorphNet();
  }
}

export function saveMorphNet(net) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(net));
  return net;
}

export async function ingestFiles(net, fileList) {
  const files = Array.from(fileList || []);
  const results = [];
  for (const file of files) {
    const source = await readFile(file);
    results.push(ingestSource(net, file.name, source, file.type || inferType(file.name)));
  }
  learn(net, `Ingested ${results.length} upload${results.length === 1 ? '' : 's'}.`);
  return results;
}

export function ingestSource(net, name, source, mimeType = 'text/plain') {
  const chunks = chunkSource(source, 1400).map((chunk, index) => ({
    id: uid('chunk'),
    index,
    start: index * 1400,
    end: index * 1400 + chunk.length,
    chunk
  }));

  const artifact = {
    id: uid('artifact'),
    name,
    mimeType,
    size: source.length,
    uploadedAt: now(),
    status: 'remembered',
    signature: signature(source),
    contract: inferFunctionalContract(name, source),
    chunks,
    originalLength: source.length
  };

  net.artifacts.unshift(artifact);
  net.memories.unshift({
    id: uid('memory'),
    artifactId: artifact.id,
    kind: 'functional_contract',
    label: `${name} functional contract`,
    content: JSON.stringify(artifact.contract, null, 2),
    strength: 0.74,
    createdAt: now()
  });
  learn(net, `Remembered ${name} as ${chunks.length} indexed source chunk${chunks.length === 1 ? '' : 's'}.`);
  return artifact;
}

export function reconstructExact(net, artifactId) {
  const artifact = net.artifacts.find((item) => item.id === artifactId) || net.artifacts[0];
  if (!artifact) return emptyResult('exact', ['no artifact selected']);
  const code = [...artifact.chunks].sort((a, b) => a.index - b.index).map((item) => item.chunk).join('');
  const isIdenticalLength = code.length === artifact.originalLength;
  return {
    code,
    confidence: isIdenticalLength ? 0.98 : 0.64,
    modeUsed: 'exact',
    missing: isIdenticalLength ? [] : ['byte identity cannot be verified without original checksum service'],
    integrity: artifact.originalLength ? code.length / artifact.originalLength : 0,
    isExact: isIdenticalLength,
    isIdentical: isIdenticalLength,
    chunkCount: artifact.chunks.length,
    reconstructedLength: code.length,
    originalLength: artifact.originalLength
  };
}

export function morphArtifact(net, artifactId, mode = 'morph_runtime') {
  if (mode === 'exact') return reconstructExact(net, artifactId);
  const artifact = net.artifacts.find((item) => item.id === artifactId) || net.artifacts[0];
  if (!artifact) return emptyResult(mode, ['no artifact selected']);
  const exact = reconstructExact(net, artifact.id);
  const contract = artifact.contract;
  const header = `// Morph output for ${artifact.name}\n// mode: ${mode}\n// preserved chunks: ${artifact.chunks.length}\n// intent: ${contract.intent}\n`;
  const code = mode === 'morph_runtime'
    ? `${header}\nexport const MorphRuntimeSpec = ${JSON.stringify(contract, null, 2)};\n`
    : `${header}\n${exact.code}`;
  learn(net, `Morphed ${artifact.name} using ${mode} mode.`);
  return {
    code,
    confidence: mode === 'improved' ? 0.62 : 0.78,
    modeUsed: mode,
    missing: mode === 'morph_runtime' ? ['exact styles may need adapter mapping', 'external services need credentials'] : [],
    integrity: exact.integrity,
    isExact: false,
    isIdentical: false,
    chunkCount: artifact.chunks.length,
    reconstructedLength: code.length,
    originalLength: artifact.originalLength
  };
}

export function recall(net, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const haystacks = [
    ...net.artifacts.map((artifact) => ({ kind: 'artifact', item: artifact, text: `${artifact.name} ${artifact.contract.intent} ${artifact.contract.capabilities.join(' ')}` })),
    ...net.memories.map((memory) => ({ kind: 'memory', item: memory, text: `${memory.label} ${memory.content}` }))
  ];
  const terms = q.split(/\s+/);
  return haystacks
    .map((entry) => ({ ...entry, score: terms.filter((term) => entry.text.toLowerCase().includes(term)).length / terms.length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function stats(net) {
  return {
    artifacts: net.artifacts.length,
    memories: net.memories.length,
    skills: net.skills.length,
    chunks: net.artifacts.reduce((sum, artifact) => sum + artifact.chunks.length, 0),
    strongestSkill: [...net.skills].sort((a, b) => b.strength - a.strength)[0]?.name || 'none'
  };
}

function learn(net, message) {
  net.events.unshift({ id: uid('event'), type: 'learn', message, at: now() });
  net.events = net.events.slice(0, 60);
  net.skills = net.skills.map((skill) => ({ ...skill, strength: Math.min(0.99, +(skill.strength + 0.01).toFixed(2)) }));
  saveMorphNet(net);
}

function emptyResult(mode, missing) {
  return { code: '', confidence: 0, modeUsed: mode, missing, integrity: 0, isExact: false, isIdentical: false, chunkCount: 0, reconstructedLength: 0, originalLength: 0 };
}

function chunkSource(source, size) {
  const chunks = [];
  for (let start = 0; start < source.length; start += size) chunks.push(source.slice(start, start + size));
  return chunks.length ? chunks : [''];
}

function inferFunctionalContract(name, source) {
  const lower = source.toLowerCase();
  const capabilities = [];
  if (lower.includes('<input') || lower.includes('upload') || lower.includes('file')) capabilities.push('file intake');
  if (lower.includes('zip') || lower.includes('jszip')) capabilities.push('zip handling');
  if (lower.includes('window') || lower.includes('dock') || lower.includes('desktop')) capabilities.push('os shell movement');
  if (lower.includes('agent') || lower.includes('chat')) capabilities.push('agent interaction');
  if (lower.includes('function') || lower.includes('=>') || lower.includes('class ')) capabilities.push('runtime behavior');
  if (lower.includes('<style') || lower.includes('css')) capabilities.push('visual system');
  return {
    name,
    intent: capabilities.length ? `Preserve and morph ${capabilities.join(', ')}.` : 'Preserve uploaded source and infer behavior.',
    capabilities,
    addresses: extractAddresses(source),
    imports: extractImports(source),
    honesty: 'Exact mode reconstructs indexed source chunks. Morph modes must report missing runtime details.'
  };
}

function extractImports(source) {
  return [...source.matchAll(/(?:import\s+.*?from\s+['"]([^'"]+)['"]|<script[^>]+src=['"]([^'"]+)['"])/g)].map((match) => match[1] || match[2]);
}

function extractAddresses(source) {
  return [...source.matchAll(/(?:id|class)=['"]([^'"]+)['"]/g)].slice(0, 24).map((match) => match[1]);
}

function signature(source) {
  let hash = 0;
  for (let i = 0; i < source.length; i++) hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  return `sig_${Math.abs(hash).toString(36)}_${source.length}`;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function inferType(name) {
  if (name.endsWith('.html')) return 'text/html';
  if (name.endsWith('.zip')) return 'application/zip';
  if (name.endsWith('.js')) return 'text/javascript';
  if (name.endsWith('.ts') || name.endsWith('.tsx')) return 'text/typescript';
  return 'text/plain';
}
