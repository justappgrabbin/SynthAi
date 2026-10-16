import {
  ExpressionGraph, ArtifactTarget, ArtifactResult, ArtifactPlan, ArtifactFile,
  ArtifactManifest, ToolMaterializationContribution
} from './foundations';
import { ToolRegistry } from './ToolRegistry';

interface HarvestedNodeOutput {
  nodeId: string;
  toolIds: string[];
  channelIds: string[];
  capabilities: string[];
  output: unknown;
}

/**
 * v0.4 ArtifactAssembler
 *
 * Materializes the graph that actually executed. It does not fabricate a
 * starter application/game/CLI and pretend that was the graph's result.
 *
 * Sources, manifests and concrete files contributed by executed tools are
 * preserved. Every remaining runtime output is serialized losslessly, then a
 * thin target surface is added only when the target needs one.
 */
export class ArtifactAssembler {
  constructor(
    private readonly toolRegistry?: ToolRegistry,
    private readonly learningSnapshotProvider?: () => unknown
  ) {}

  async assemble(graph: ExpressionGraph, target: ArtifactTarget): Promise<ArtifactResult> {
    const plan = this.plan(graph, target);
    const harvested = this.harvestNodeOutputs(graph);
    const files: ArtifactFile[] = [];

    // 1) Preserve real contributions from tools that actually executed.
    files.push(...await this.materializeExecutedTools(graph));

    // 2) Preserve the executable graph/result record itself.
    files.push({
      path: 'synthia/expression-graph.json',
      content: this.safeJSON(graph),
      type: 'json'
    });
    files.push({
      path: 'synthia/runtime-output.json',
      content: this.safeJSON(harvested),
      type: 'json'
    });
    files.push({
      path: 'synthia/provenance.json',
      content: this.safeJSON(graph.provenance),
      type: 'json'
    });

    // v0.5: persist the learner state that shaped/observed this execution.
    if (this.learningSnapshotProvider) {
      files.push({
        path: 'synthia/learning-state.json',
        content: this.safeJSON(this.learningSnapshotProvider()),
        type: 'json'
      });
    }

    // 3) If tools returned actual file payloads, materialize those too.
    for (const entry of harvested) {
      files.push(...this.extractArtifactFiles(entry.output, `outputs/${this.safeName(entry.nodeId)}`));
    }

    // 4) Add only the minimum target wrapper needed to open/use the result.
    files.push(...this.targetSurface(graph, target, harvested, files));

    const uniqueFiles = this.dedupeFiles(files);
    const channelIds = this.unique([
      ...graph.nodes.flatMap(n => n.capabilities.filter(c => /^\d+-\d+$/.test(c))),
      ...graph.nodes.flatMap(n => n.sourceChannelIds.filter(c => /^\d+-\d+$/.test(c)))
    ]);
    const toolIds = this.unique(graph.nodes.flatMap(n => n.sourceToolIds));

    const manifest: ArtifactManifest = {
      manifestId: `manifest_${graph.graphId}`,
      artifactId: graph.graphId,
      activatedChannels: channelIds,
      executedTools: toolIds,
      expressionNodes: this.unique(graph.nodes.map(n => n.expressionNodeId)),
      materializedFiles: uniqueFiles.map(f => f.path),
      provenance: graph.provenance
    };

    // A manifest file is part of the artifact, but construct it after the file
    // list exists so its materializedFiles field is truthful.
    const manifestFile: ArtifactFile = {
      path: 'synthia/artifact-manifest.json',
      content: this.safeJSON({ ...manifest, materializedFiles: [...manifest.materializedFiles, 'synthia/artifact-manifest.json'] }),
      type: 'json'
    };
    uniqueFiles.push(manifestFile);
    manifest.materializedFiles.push(manifestFile.path);

    return {
      artifactId: graph.graphId,
      target,
      files: uniqueFiles,
      manifest,
      success: uniqueFiles.length > 0,
      errors: []
    };
  }

  private plan(graph: ExpressionGraph, target: ArtifactTarget): ArtifactPlan {
    return {
      planId: `plan_${graph.graphId}`,
      target,
      expressionGraph: graph,
      files: [], dependencies: [], tests: [], provenance: graph.provenance
    };
  }

  private harvestNodeOutputs(graph: ExpressionGraph): HarvestedNodeOutput[] {
    return graph.nodes
      .filter(node => Object.prototype.hasOwnProperty.call(node.configuration || {}, 'output'))
      .map(node => ({
        nodeId: node.expressionNodeId,
        toolIds: [...node.sourceToolIds],
        channelIds: [...node.sourceChannelIds],
        capabilities: [...node.capabilities],
        output: node.configuration?.output
      }));
  }

  private async materializeExecutedTools(graph: ExpressionGraph): Promise<ArtifactFile[]> {
    if (!this.toolRegistry) return [];
    const files: ArtifactFile[] = [];
    const toolIds = this.unique(graph.nodes.flatMap(n => n.sourceToolIds));

    for (const toolId of toolIds) {
      const tool = this.toolRegistry.getTool(toolId);
      if (!tool) continue;

      let contribution: ToolMaterializationContribution | undefined;
      if (tool.materialize) contribution = await tool.materialize();

      if (contribution?.files?.length) files.push(...contribution.files);
      if (contribution?.manifest) {
        files.push({
          path: `tools/${this.safeName(toolId)}.manifest.json`,
          content: this.safeJSON(contribution.manifest),
          type: 'json'
        });
      }
      if (contribution?.metadata) {
        files.push({
          path: `tools/${this.safeName(toolId)}.metadata.json`,
          content: this.safeJSON(contribution.metadata),
          type: 'json'
        });
      }

      // Even tools without a source exporter remain represented honestly.
      if (!contribution) {
        files.push({
          path: `tools/${this.safeName(toolId)}.adapter.json`,
          content: this.safeJSON({ toolId: tool.toolId, name: tool.name, provides: tool.provides, requires: tool.requires }),
          type: 'json'
        });
      }
    }
    return files;
  }

  private extractArtifactFiles(value: unknown, basePath: string, depth = 0): ArtifactFile[] {
    if (depth > 5 || value == null) return [];
    const out: ArtifactFile[] = [];

    if (Array.isArray(value)) {
      value.forEach((item, i) => out.push(...this.extractArtifactFiles(item, `${basePath}-${i + 1}`, depth + 1)));
      return out;
    }

    if (typeof value !== 'object') return out;
    const obj = value as Record<string, any>;

    // Common file payload shape used by builders/materializers.
    if (typeof obj.path === 'string' && (typeof obj.content === 'string' || obj.content != null)) {
      out.push({
        path: this.sanitizePath(obj.path),
        content: typeof obj.content === 'string' ? obj.content : this.safeJSON(obj.content),
        type: typeof obj.type === 'string' ? obj.type : this.inferType(obj.path)
      });
      return out;
    }

    if (Array.isArray(obj.files)) {
      for (const item of obj.files) out.push(...this.extractArtifactFiles(item, basePath, depth + 1));
    }
    if (obj.artifact && typeof obj.artifact === 'object') {
      out.push(...this.extractArtifactFiles(obj.artifact, basePath, depth + 1));
    }

    return out;
  }

  private targetSurface(graph: ExpressionGraph, target: ArtifactTarget, outputs: HarvestedNodeOutput[], current: ArtifactFile[]): ArtifactFile[] {
    switch (target) {
      case 'WEB_APP':
      case 'ANDROID_APP':
        return this.webSurface(graph, outputs, current);
      case 'CLI':
        return this.cliSurface(graph, outputs);
      case 'DOCUMENT':
        return this.documentSurface(graph, outputs);
      default:
        return [{
          path: 'artifact.json',
          content: this.safeJSON({ graphId: graph.graphId, target, outputs }),
          type: 'json'
        }];
    }
  }

  private webSurface(graph: ExpressionGraph, outputs: HarvestedNodeOutput[], current: ArtifactFile[]): ArtifactFile[] {
    // Never overwrite a real index.html produced by a tool.
    if (current.some(f => f.path === 'index.html')) return [];
    const payload = this.escapeScriptJSON({ graphId: graph.graphId, outputs });
    return [
      {
        path: 'index.html',
        type: 'html',
        content: `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthia Materialized Artifact</title></head><body><main id="app"></main><script src="app.js"></script></body></html>`
      },
      {
        path: 'app.js',
        type: 'javascript',
        content: `// Materialized from the executed Expression Graph ${graph.graphId}\nconst artifact=${payload};\nwindow.SYNTHIA_ARTIFACT=artifact;\nconst app=document.getElementById('app');\nconst pre=document.createElement('pre');\npre.textContent=JSON.stringify(artifact,null,2);\napp.appendChild(pre);\n`
      }
    ];
  }

  private cliSurface(graph: ExpressionGraph, outputs: HarvestedNodeOutput[]): ArtifactFile[] {
    return [{
      path: 'cli.mjs',
      type: 'javascript',
      content: `#!/usr/bin/env node\n// Materialized Expression Graph ${graph.graphId}\nconst outputs=${this.escapeScriptJSON(outputs)};\nprocess.stdout.write(JSON.stringify(outputs,null,2)+'\\n');\n`
    }];
  }

  private documentSurface(graph: ExpressionGraph, outputs: HarvestedNodeOutput[]): ArtifactFile[] {
    const body = outputs.map(o => `## ${o.nodeId}\n\nTools: ${o.toolIds.join(', ') || 'none'}\n\n\`\`\`json\n${this.safeJSON(o.output)}\n\`\`\``).join('\n\n');
    return [{ path: 'artifact.md', type: 'markdown', content: `# Materialized Synthia Artifact\n\nGraph: ${graph.graphId}\n\n${body}` }];
  }

  private dedupeFiles(files: ArtifactFile[]): ArtifactFile[] {
    const map = new Map<string, ArtifactFile>();
    for (const file of files) {
      const path = this.sanitizePath(file.path);
      const candidate = { ...file, path };
      const previous = map.get(path);
      if (!previous || (!previous.content && candidate.content)) map.set(path, candidate);
    }
    return [...map.values()];
  }

  private unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }
  private safeName(value: string): string { return value.replace(/[^a-zA-Z0-9._-]+/g, '_'); }
  private sanitizePath(value: string): string {
    const clean = value.replace(/\\/g, '/').replace(/^\/+/, '').split('/').filter(p => p && p !== '.' && p !== '..').join('/');
    return clean || 'artifact-output.txt';
  }
  private inferType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    return ({ html:'html', htm:'html', js:'javascript', mjs:'javascript', ts:'typescript', json:'json', md:'markdown', txt:'text', css:'css' } as Record<string,string>)[ext || ''] || 'text';
  }
  private safeJSON(value: unknown): string {
    const seen = new WeakSet<object>();
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return `${v}n`;
      if (v instanceof Map) return Object.fromEntries(v);
      if (v instanceof Set) return [...v];
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      return v;
    }, 2);
  }
  private escapeScriptJSON(value: unknown): string { return this.safeJSON(value).replace(/<\//g, '<\\/'); }
}

export default ArtifactAssembler;
