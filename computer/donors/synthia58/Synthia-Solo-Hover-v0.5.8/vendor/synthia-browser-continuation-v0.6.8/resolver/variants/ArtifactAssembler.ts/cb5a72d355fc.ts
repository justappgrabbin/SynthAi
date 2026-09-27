import { ExpressionGraph, ArtifactTarget, ArtifactResult, ArtifactPlan, ArtifactFile, ArtifactManifest, ProvenanceRecord } from './foundations';

export class ArtifactAssembler {
  /**
   * Assemble an artifact from expression graph.
   */
  async assemble(graph: ExpressionGraph, target: ArtifactTarget): Promise<ArtifactResult> {
    const plan = this.plan(graph, target);

    const files: ArtifactFile[] = [];

    // Generate manifest
    const manifest: ArtifactManifest = {
      manifestId: `manifest_${graph.graphId}`,
      artifactId: graph.graphId,
      activatedChannels: graph.nodes
        .filter(n => n.sourceChannelIds.length > 0)
        .flatMap(n => n.sourceChannelIds),
      executedTools: graph.nodes
        .filter(n => n.sourceToolIds.length > 0)
        .flatMap(n => n.sourceToolIds),
      expressionNodes: graph.nodes.map(n => n.expressionNodeId),
      materializedFiles: files.map(f => f.path),
      provenance: graph.provenance
    };

    // Generate basic files based on target
    switch (target) {
      case 'WEB_APP':
        files.push(...this.generateWebAppFiles(graph));
        break;
      case 'GAME':
        files.push(...this.generateGameFiles(graph));
        break;
      case 'CLI':
        files.push(...this.generateCLIFiles(graph));
        break;
      default:
        files.push(...this.generateGenericFiles(graph));
    }

    return {
      artifactId: graph.graphId,
      target,
      files,
      manifest,
      success: files.length > 0,
      errors: []
    };
  }

  private plan(graph: ExpressionGraph, target: ArtifactTarget): ArtifactPlan {
    return {
      planId: `plan_${graph.graphId}`,
      target,
      expressionGraph: graph,
      files: [],
      dependencies: [],
      tests: [],
      provenance: graph.provenance
    };
  }

  private generateWebAppFiles(graph: ExpressionGraph): ArtifactFile[] {
    return [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>\n<html>\n<head><title>Synthia App</title></head>\n<body>\n  <div id="app"></div>\n  <script src="app.js"></script>\n</body>\n</html>`,
        type: 'html'
      },
      {
        path: 'app.js',
        content: `// Generated from expression graph: ${graph.graphId}\n// Nodes: ${graph.nodes.length}\n// Channels: ${graph.nodes.filter(n => n.sourceChannelIds.length > 0).length}\nconsole.log('Synthia app initialized');`,
        type: 'javascript'
      },
      {
        path: 'manifest.json',
        content: JSON.stringify({
          name: 'Synthia App',
          version: '1.0.0',
          graphId: graph.graphId,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length
        }, null, 2),
        type: 'json'
      }
    ];
  }

  private generateGameFiles(graph: ExpressionGraph): ArtifactFile[] {
    return [
      {
        path: 'game.js',
        content: `// Synthia Game\n// Generated from expression graph: ${graph.graphId}\n// World nodes: ${graph.nodes.filter(n => n.capabilities.includes('world')).length}\n// Entity nodes: ${graph.nodes.filter(n => n.capabilities.includes('entity')).length}\nclass SynthiaGame {\n  constructor() {\n    this.world = new World();\n    this.entities = [];\n  }\n  init() {\n    console.log('Game initialized');\n  }\n}`,
        type: 'javascript'
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>\n<html>\n<body>\n  <canvas id="game"></canvas>\n  <script src="game.js"></script>\n</body>\n</html>`,
        type: 'html'
      }
    ];
  }

  private generateCLIFiles(graph: ExpressionGraph): ArtifactFile[] {
    return [
      {
        path: 'cli.js',
        content: `#!/usr/bin/env node\n// Synthia CLI\n// Graph: ${graph.graphId}\nconst args = process.argv.slice(2);\nconsole.log('Synthia CLI:', args);`,
        type: 'javascript'
      }
    ];
  }

  private generateGenericFiles(graph: ExpressionGraph): ArtifactFile[] {
    return [
      {
        path: 'README.md',
        content: `# Synthia Artifact\n\nGenerated from expression graph: ${graph.graphId}\n\n## Nodes\n${graph.nodes.map(n => `- ${n.expressionNodeId}: ${n.capabilities.join(', ')}`).join('\n')}\n\n## Provenance\n${graph.provenance.map(p => `- ${p.sourceType}: ${p.description}`).join('\n')}`,
        type: 'markdown'
      }
    ];
  }
}

export default ArtifactAssembler;
