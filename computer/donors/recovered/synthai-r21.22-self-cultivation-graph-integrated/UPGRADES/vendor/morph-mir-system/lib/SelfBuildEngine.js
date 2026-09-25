import { MorphMemoryEngine } from "./morphMemoryEngine.js";
import { ZipProjectIngestor } from "./ZipProjectIngestor.js";

/**
 * Synthia's lineage self-construction loop.
 *
 * Archives are source material only. Synthia never executes foreign source;
 * she infers its relationships/purpose, searches JS reconstructions, verifies
 * them, and remembers the winning result.
 */
class SelfBuildEngine {
  constructor({ memoryEngine, zipIngestor } = {}) {
    this.memoryEngine = memoryEngine || new MorphMemoryEngine();
    this.zipIngestor = zipIngestor || new ZipProjectIngestor();
  }

  async rebuildArchives(archives, options = {}) {
    if (!Array.isArray(archives) || archives.length === 0) {
      throw new Error("rebuildArchives requires at least one archive.");
    }

    const extensions = options.extensions || [".py"];
    const ingested = [];
    const skipped = [];

    for (const archive of archives) {
      const result = await this.zipIngestor.ingest(
        archive.bytes ?? archive.source ?? archive,
        {
          archiveName: archive.name || archive.source?.name || "archive.zip",
          extensions
        }
      );
      ingested.push(...result.files);
      skipped.push(...result.skipped);
    }

    const occurrences = this.groupByContent(ingested);
    const archiveGraphs = this.buildArchiveGraphs(ingested);
    const rebuilt = [];
    const failures = [];

    for (const group of occurrences.values()) {
      const canonical = this.chooseCanonicalOccurrence(group, archiveGraphs);
      const graph = archiveGraphs.get(canonical.metadata.archiveName);

      try {
        const analyzed = await this.memoryEngine.analyzeArtifact(canonical);
        await this.memoryEngine.rememberArtifact(analyzed);
        const result = await this.memoryEngine.semanticRebuildArtifact(
          analyzed,
          [analyzed],
          {
            graph,
            temperature: options.temperature,
            samples: options.samples
          }
        );

        rebuilt.push({
          sourceHash: this.contentHash(canonical.originalContent),
          canonicalSource: {
            archiveName: canonical.metadata.archiveName,
            archivePath: canonical.metadata.archivePath
          },
          lineage: group.map((item) => ({
            archiveName: item.metadata.archiveName,
            archivePath: item.metadata.archivePath
          })),
          purpose: graph.nodes.find((node) => node.id === canonical.id)?.purpose || "",
          relationships: graph.neighborhoods[canonical.id] || {
            incoming: [],
            outgoing: [],
            collaborators: []
          },
          result
        });
      } catch (error) {
        failures.push({
          sourceHash: this.contentHash(canonical.originalContent),
          canonicalSource: {
            archiveName: canonical.metadata.archiveName,
            archivePath: canonical.metadata.archivePath
          },
          lineage: group.map((item) => ({
            archiveName: item.metadata.archiveName,
            archivePath: item.metadata.archivePath
          })),
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      rebuilt,
      failures,
      skipped,
      manifest: this.buildManifest(archives, ingested, occurrences, rebuilt, failures, skipped)
    };
  }

  buildArchiveGraphs(artifacts) {
    const byArchive = new Map();
    for (const artifact of artifacts) {
      const key = artifact.metadata.archiveName;
      if (!byArchive.has(key)) byArchive.set(key, []);
      byArchive.get(key).push(artifact);
    }

    const graphs = new Map();
    for (const [archiveName, files] of byArchive) {
      graphs.set(archiveName, this.memoryEngine.relationshipMapper.mapProject(files));
    }
    return graphs;
  }

  groupByContent(artifacts) {
    const groups = new Map();
    for (const artifact of artifacts) {
      const hash = this.contentHash(artifact.originalContent);
      if (!groups.has(hash)) groups.set(hash, []);
      groups.get(hash).push(artifact);
    }
    return groups;
  }

  chooseCanonicalOccurrence(group, archiveGraphs) {
    return [...group].sort((left, right) => {
      const leftScore = this.contextScore(left, archiveGraphs.get(left.metadata.archiveName));
      const rightScore = this.contextScore(right, archiveGraphs.get(right.metadata.archiveName));
      if (rightScore !== leftScore) return rightScore - leftScore;
      return this.archiveRank(right.metadata.archiveName) - this.archiveRank(left.metadata.archiveName);
    })[0];
  }

  contextScore(artifact, graph) {
    const neighborhood = graph?.neighborhoods?.[artifact.id];
    if (!neighborhood) return 0;
    const resolvedOutgoing = neighborhood.outgoing.filter((edge) => edge.resolved).length;
    return resolvedOutgoing * 4 + neighborhood.incoming.length * 2 + neighborhood.collaborators.length;
  }

  archiveRank(name) {
    const value = String(name).toLowerCase();
    const release = value.match(/r(\d+)(?:[._-](\d+))?/);
    if (release) return Number(release[1]) * 1000 + Number(release[2] || 0);
    const version = value.match(/v(\d+)[._-](\d+)(?:[._-](\d+))?/);
    if (version) {
      return Number(version[1]) * 1000000 + Number(version[2]) * 1000 + Number(version[3] || 0);
    }
    return 0;
  }

  buildManifest(archives, ingested, occurrences, rebuilt, failures, skipped) {
    const scores = rebuilt.map((entry) => entry.result.regenerationResult?.confidence || 0);
    const verified = rebuilt.filter((entry) => {
      const verification = entry.result.regenerationResult?.verification;
      return verification?.metrics?.syntax === 1 && verification.score >= 0.7;
    }).length;

    return {
      schema: "synthia.self-build.v1",
      createdAt: new Date().toISOString(),
      sourceArchives: archives.map((archive) => archive.name || archive.source?.name || "archive.zip"),
      sourceOccurrences: ingested.length,
      uniqueSourceBodies: occurrences.size,
      rebuilt: rebuilt.length,
      verified,
      needsReview: rebuilt.length - verified,
      failures: failures.length,
      skipped: skipped.length,
      meanConfidence: scores.length
        ? scores.reduce((total, value) => total + value, 0) / scores.length
        : 0,
      runtime: {
        foreignSourceExecution: false,
        pythonRequired: false,
        npmDependenciesRequired: false,
        reconstructionLanguage: "javascript"
      }
    };
  }

  contentHash(content) {
    let hash = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    const bytes = new TextEncoder().encode(String(content));
    for (const byte of bytes) {
      hash ^= BigInt(byte);
      hash = BigInt.asUintN(64, hash * prime);
    }
    return hash.toString(16).padStart(16, "0");
  }
}

export { SelfBuildEngine };
