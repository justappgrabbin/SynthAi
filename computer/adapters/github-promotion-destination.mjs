import { createHash } from 'node:crypto';

const safe = value => String(value ?? '')
  .trim()
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'artifact';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export class GitHubPromotionDestination {
  constructor({ repository, artifactSource, client, channel = 'synthia-deliveries' } = {}) {
    if (!String(repository ?? '').includes('/')) throw new Error('GitHub repository must be owner/name');
    if (typeof artifactSource?.read !== 'function') throw new TypeError('GitHub promotion requires artifactSource.read(storageRef)');
    if (typeof client?.uploadImmutable !== 'function') throw new TypeError('GitHub promotion requires client.uploadImmutable(request)');
    this.repository = String(repository);
    this.artifactSource = artifactSource;
    this.client = client;
    this.channel = safe(channel);
  }

  async upload(candidate) {
    if (candidate?.state !== 'ready-for-uploader') throw new Error('GitHub promotion candidate must be ready-for-uploader');
    const expected = String(candidate.artifact?.sha256 ?? '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('GitHub promotion candidate requires artifact sha256');

    const bytes = await this.artifactSource.read(candidate.artifact.storageRef);
    if (!(bytes instanceof Uint8Array)) throw new TypeError('artifactSource.read must return Uint8Array');
    const observed = digest(bytes);
    if (observed !== expected) throw new Error('source artifact hash mismatch');

    const name = [
      safe(candidate.cartridgeId),
      safe(candidate.version),
      expected.slice(0, 12),
    ].join('-') + '.bin';
    const tag = this.channel + '/' + safe(candidate.cartridgeId) + '/' + safe(candidate.version) + '/' + expected;

    const result = await this.client.uploadImmutable({
      repository: this.repository,
      tag,
      name,
      bytes,
      sha256: expected,
      metadata: {
        schema: candidate.schema,
        capability: candidate.capability,
        provenance: candidate.provenance,
        verification: candidate.verification,
        queuedAt: candidate.queuedAt,
      },
    });

    const location = String(result?.location ?? '').trim();
    const receiptId = String(result?.receiptId ?? '').trim();
    if (!location || !receiptId) throw new Error('GitHub upload returned incomplete receipt');
    return { location, receiptId, sha256: expected };
  }
}

export default GitHubPromotionDestination;
