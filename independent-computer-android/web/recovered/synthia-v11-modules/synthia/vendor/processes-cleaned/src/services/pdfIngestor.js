// Deterministic, local ingestion for Synthia process fields.
// No LLM, hosted embedding API, or opaque learned embedding model is required.
// Text is represented by a reproducible hashed lexical fingerprint and explicit tags.

export class ResonanceIngestor {
  constructor({ dimensions = 256 } = {}) {
    this.dimensions = dimensions;
    this.vectorStore = new Map();
    this.indexedDB = null;
    this.dbName = 'SynthiaLocalKnowledge';
    this.storeName = 'records';
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this;
    if (typeof indexedDB !== 'undefined') {
      await this.initIndexedDB();
    }
    this.initialized = true;
    return this;
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('by-source', 'source', { unique: false });
          store.createIndex('by-user', 'userId', { unique: false });
          store.createIndex('by-timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async ingestPDF(file, userId = 'local', sourceName = null) {
    await this.init();
    const arrayBuffer = await file.arrayBuffer();
    const pdfjs = await import('pdfjs-dist');
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      fullText += `${textContent.items.map(item => item.str).join(' ')}\n\n`;
    }

    return this.ingestText(fullText, userId, sourceName || file.name);
  }

  async ingestText(text, userId = 'local', sourceName = 'text') {
    await this.init();
    const chunks = this.semanticChunk(text);
    const timestamp = Date.now();
    const storedIds = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const id = `${userId}:${this.stableHash(`${sourceName}:${index}:${chunk}`)}`;
      const record = {
        id,
        vector: this.fingerprint(chunk),
        text: chunk,
        source: sourceName,
        codonTags: this.extractCodonTags(chunk),
        elementalSignature: this.computeElementalSignature(chunk),
        timestamp,
        userId,
        representation: 'deterministic-lexical-fingerprint-v1',
      };
      await this.store(record);
      storedIds.push(id);
    }

    return {
      chunksProcessed: chunks.length,
      source: sourceName,
      storedIds,
      codonTagsFound: [...new Set(chunks.flatMap(chunk => this.extractCodonTags(chunk)))],
    };
  }

  semanticChunk(text, maxLength = 700) {
    const paragraphs = String(text || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    const chunks = [];
    let current = '';

    const flush = () => {
      if (current.trim()) chunks.push(current.trim());
      current = '';
    };

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxLength) {
        flush();
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if ((current + ' ' + sentence).trim().length > maxLength) flush();
          current = `${current} ${sentence}`.trim();
        }
      } else if ((current + ' ' + paragraph).trim().length > maxLength) {
        flush();
        current = paragraph;
      } else {
        current = `${current} ${paragraph}`.trim();
      }
    }
    flush();
    return chunks;
  }

  tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFKC')
      .match(/[a-z0-9]+(?:[-'][a-z0-9]+)*/g) || [];
  }

  stableHash(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  fingerprint(text) {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = this.tokenize(text);
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      const h1 = parseInt(this.stableHash(token), 16) >>> 0;
      const h2 = parseInt(this.stableHash(`${token}:${index % 7}`), 16) >>> 0;
      vector[h1 % this.dimensions] += (h2 & 1) === 0 ? 1 : -1;
      if (index > 0) {
        const bigram = `${tokens[index - 1]}→${token}`;
        const hb = parseInt(this.stableHash(bigram), 16) >>> 0;
        vector[hb % this.dimensions] += 0.5;
      }
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? vector : vector.map(value => value / norm);
  }

  extractCodonTags(textChunk) {
    const lower = String(textChunk || '').toLowerCase();
    const tags = [];
    const acids = [
      'alanine', 'arginine', 'asparagine', 'aspartic', 'cysteine',
      'glutamine', 'glutamic', 'glycine', 'histidine', 'isoleucine',
      'leucine', 'lysine', 'methionine', 'phenylalanine', 'proline',
      'serine', 'threonine', 'tryptophan', 'tyrosine', 'valine',
    ];
    for (const acid of acids) if (lower.includes(acid)) tags.push(acid);
    for (let gate = 1; gate <= 64; gate += 1) {
      if (new RegExp(`\\bgate\\s+${gate}\\b`, 'i').test(textChunk)) tags.push(`gate-${gate}`);
    }
    return tags;
  }

  computeElementalSignature(chunk) {
    const signature = { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 };
    const keywords = {
      C: ['structure', 'form', 'boundary', 'system', 'framework'],
      H: ['flow', 'emotion', 'movement', 'adapt', 'change'],
      N: ['transform', 'catalyze', 'mutate', 'evolve', 'breakthrough'],
      O: ['action', 'energy', 'power', 'manifest', 'create'],
      S: ['bond', 'connect', 'bridge', 'link', 'relationship'],
      P: ['activate', 'timing', 'trigger', 'initiate', 'start'],
    };
    const lower = String(chunk || '').toLowerCase();
    for (const [element, words] of Object.entries(keywords)) {
      for (const word of words) {
        signature[element] += lower.split(word).length - 1;
      }
    }
    return signature;
  }

  async store(record) {
    this.vectorStore.set(record.id, record);
    if (!this.indexedDB) return;
    await new Promise((resolve, reject) => {
      const tx = this.indexedDB.transaction([this.storeName], 'readwrite');
      const request = tx.objectStore(this.storeName).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const length = Math.min(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      dot += a[index] * b[index];
      normA += a[index] * a[index];
      normB += b[index] * b[index];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async queryKnowledge(query, userId = 'local', topK = 5, codonFilter = null) {
    await this.init();
    const qVector = this.fingerprint(query);
    const records = await this.getAllRecords(userId);
    return records
      .filter(doc => !codonFilter || doc.codonTags.some(tag => codonFilter.includes(tag)))
      .map(doc => ({ ...doc, similarity: this.cosineSimilarity(qVector, doc.vector) }))
      .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
      .slice(0, topK);
  }

  async getAllRecords(userId = 'local') {
    const memory = [...this.vectorStore.values()].filter(record => record.userId === userId);
    if (!this.indexedDB) return memory;

    const persisted = await new Promise((resolve, reject) => {
      const tx = this.indexedDB.transaction([this.storeName], 'readonly');
      const request = tx.objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve(request.result.filter(record => record.userId === userId));
      request.onerror = () => reject(request.error);
    });

    const merged = new Map(memory.map(record => [record.id, record]));
    for (const record of persisted) merged.set(record.id, record);
    return [...merged.values()];
  }

  async getKnowledgeStats(userId = 'local') {
    const allRecords = await this.getAllRecords(userId);
    const stats = {
      totalChunks: allRecords.length,
      sources: [...new Set(allRecords.map(record => record.source))],
      codonCoverage: [...new Set(allRecords.flatMap(record => record.codonTags || []))].length,
      elementalProfile: { C: 0, H: 0, N: 0, O: 0, S: 0, P: 0 },
    };
    for (const record of allRecords) {
      for (const [element, value] of Object.entries(record.elementalSignature || {})) {
        stats.elementalProfile[element] += value;
      }
    }
    return stats;
  }

  async exportKnowledge(userId = 'local') {
    const records = await this.getAllRecords(userId);
    return {
      representation: 'deterministic-lexical-fingerprint-v1',
      exportDate: Date.now(),
      userId,
      recordCount: records.length,
      records: records.map(({ vector, ...record }) => record),
    };
  }

  async importKnowledge(exportData) {
    for (const record of exportData.records || []) {
      const next = { ...record, vector: this.fingerprint(record.text), userId: exportData.userId || record.userId || 'local' };
      await this.store(next);
    }
    return (exportData.records || []).length;
  }
}

export default ResonanceIngestor;
