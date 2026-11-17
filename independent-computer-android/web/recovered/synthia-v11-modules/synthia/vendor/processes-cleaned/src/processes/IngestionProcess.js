import { SynthiaProcess } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcess.js';
import { ResonanceIngestor } from 'synthia/vendor/processes-cleaned/src/services/pdfIngestor.js';

export class IngestionProcess extends SynthiaProcess {
  constructor({ ingestor = null } = {}) {
    super({
      id: 'ingestion',
      kind: 'ingestion',
      capabilities: ['ingestion.init', 'ingestion.pdf', 'ingestion.query', 'ingestion.stats'],
      metadata: {
        authority: 'local-process',
        representation: 'deterministic lexical fingerprint',
      },
    });
    this.ingestor = ingestor || new ResonanceIngestor();

    this.register('ingestion.init', async () => {
      await this.ingestor.init();
      return { ready: true };
    });

    this.register('ingestion.pdf', async ({ file, userId = 'local', sourceName = null }) =>
      this.ingestor.ingestPDF(file, userId, sourceName));

    this.register('ingestion.query', async ({ query, userId = 'local', topK = 5, codonFilter = null }) =>
      this.ingestor.queryKnowledge(query, userId, topK, codonFilter));

    this.register('ingestion.stats', async ({ userId = 'local' }) =>
      this.ingestor.getKnowledgeStats(userId));
  }
}

export default IngestionProcess;
