import { MorphMemoryEngine } from "../vendor/morph-mir-system/lib/morphMemoryEngine.js";
import { SelfBuildEngine } from "../vendor/morph-mir-system/lib/SelfBuildEngine.js";

let sequence = 0;

function nodeFor(toolId, output, context) {
  return {
    expressionNodeId: `tool_${toolId}_${context.sessionId}_${++sequence}`,
    sourceChannelIds: [...context.expression.capabilities],
    sourceStateIds: [],
    sourceToolIds: [toolId],
    capabilities: [...context.expression.capabilities],
    inputs: [],
    outputs: [],
    configuration: { output }
  };
}

function success(toolId, output, context) {
  const node = nodeFor(toolId, output, context);
  const provenance = {
    recordId: `prov_${toolId}_${context.sessionId}_${sequence}`,
    timestamp: Date.now(),
    sourceType: "TOOL",
    sourceId: toolId,
    description: `Executed ${toolId}`,
    resultingNodeIds: [node.expressionNodeId]
  };
  return {
    success: true,
    outputValues: { output },
    expressionNodes: [node],
    provenance: [provenance]
  };
}

function failure(error) {
  return {
    success: false,
    outputValues: {
      error: error instanceof Error ? error.message : String(error)
    },
    expressionNodes: [],
    provenance: []
  };
}

function createArtifact(file, sessionId, index = 0) {
  const name = String(file.name || file.originalName || `artifact-${index}`);
  const content = String(file.content ?? file.originalContent ?? "");
  return {
    id: String(file.id || `art_${sessionId}_${index}`),
    originalName: name,
    originalContent: content,
    metadata: {
      fileType: name.split(".").pop() || "unknown",
      size: content.length,
      uploadedAt: new Date().toISOString(),
      status: "uploaded"
    }
  };
}

function normalizeArchives(input) {
  const values = Array.isArray(input.archives)
    ? input.archives
    : input.archive || input.zip
      ? [input.archive || input.zip]
      : [];

  return values.map((value, index) => {
    if (value?.bytes || value?.source) {
      return {
        name: value.name || value.source?.name || `archive-${index}.zip`,
        bytes: value.bytes,
        source: value.source
      };
    }
    return {
      name: value?.name || `archive-${index}.zip`,
      source: value
    };
  });
}

/**
 * Exposes MIR ingestion, ZIP self-construction, and semantic JS rebuilding as
 * one Synthia tool. Foreign source is analyzed, never executed.
 */
function morphMirAdapter(engine = new MorphMemoryEngine()) {
  const selfBuilder = new SelfBuildEngine({ memoryEngine: engine });
  const provides = [
    "ingest",
    "ingest_project",
    "ingest_zip",
    "self_build",
    "self_rebuild",
    "analyze",
    "remember",
    "regenerate",
    "rebuild",
    "reconstruct"
  ];

  return {
    toolId: "morph-mir",
    name: "Morph MIR Semantic Reconstruction Engine",
    provides,
    requires: [],

    accepts(expression) {
      return expression.capabilities.some((capability) => provides.includes(capability));
    },

    async execute(context) {
      try {
        const input = context.inputValues || {};
        const archives = normalizeArchives(input);

        if (archives.length) {
          const extensions = Array.isArray(input.extensions)
            ? input.extensions
            : [".py"];
          const isSelfBuild = context.expression.capabilities.some(
            (capability) => ["self_build", "self_rebuild", "rebuild"].includes(capability)
          );

          if (!isSelfBuild && context.expression.capabilities.includes("ingest_zip")) {
            const ingested = [];
            for (const archive of archives) {
              ingested.push(await selfBuilder.zipIngestor.ingest(
                archive.bytes ?? archive.source,
                {
                  archiveName: archive.name,
                  extensions
                }
              ));
            }
            return success("morph-mir", {
              mode: "zip_ingest",
              archives: ingested.map((entry) => ({
                archiveName: entry.archiveName,
                entries: entry.entries,
                files: entry.files.map((file) => ({
                  id: file.id,
                  name: file.originalName,
                  metadata: file.metadata
                })),
                skipped: entry.skipped
              }))
            }, context);
          }

          const build = await selfBuilder.rebuildArchives(archives, {
            extensions,
            temperature: input.temperature,
            samples: input.samples
          });

          return success("morph-mir", {
            mode: "self_build",
            manifest: build.manifest,
            rebuilt: build.rebuilt.map((entry) => ({
              sourceHash: entry.sourceHash,
              canonicalSource: entry.canonicalSource,
              lineage: entry.lineage,
              purpose: entry.purpose,
              regeneration: entry.result.regenerationResult
            })),
            failures: build.failures,
            skipped: build.skipped
          }, context);
        }

        const files = Array.isArray(input.files) ? input.files : null;
        if (files?.length) {
          const artifacts = files.map((file, index) =>
            createArtifact(file, context.sessionId, index)
          );
          const project = await engine.rebuildProject(artifacts, {
            temperature: input.temperature,
            samples: input.samples
          });

          return success("morph-mir", {
            mode: "semantic_js",
            project: {
              summary: project.summary,
              graph: project.graph
            },
            files: project.artifacts.map((artifact) => ({
              id: artifact.id,
              name: artifact.originalName,
              understanding: artifact.understanding,
              regeneration: artifact.regenerationResult
            }))
          }, context);
        }

        const artifact = createArtifact({
          name: input.name || "artifact",
          content: input.content || "",
          id: input.id
        }, context.sessionId, 0);
        const mode = input.mode || (
          artifact.originalName.toLowerCase().endsWith(".py")
            ? "semantic_js"
            : "morph_runtime"
        );

        const analyzed = await engine.analyzeArtifact(artifact);
        await engine.rememberArtifact(analyzed);
        const regenerated = await engine.regenerateArtifact(
          analyzed,
          { projectArtifacts: [analyzed] },
          mode
        );

        return success("morph-mir", {
          understanding: analyzed.understanding,
          regeneration: regenerated.regenerationResult
        }, context);
      } catch (error) {
        return failure(error);
      }
    }
  };
}

export {
  morphMirAdapter as default,
  morphMirAdapter
};
