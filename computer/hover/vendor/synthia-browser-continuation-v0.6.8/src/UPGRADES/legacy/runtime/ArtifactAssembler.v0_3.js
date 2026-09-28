class ArtifactAssembler {
  /**
   * Assemble an artifact from expression graph.
   */
  async assemble(graph, target) {
    const plan = this.plan(graph, target);
    const files = [];
    const manifest = {
      manifestId: `manifest_${graph.graphId}`,
      artifactId: graph.graphId,
      activatedChannels: graph.nodes.filter((n) => n.sourceChannelIds.length > 0).flatMap((n) => n.sourceChannelIds),
      executedTools: graph.nodes.filter((n) => n.sourceToolIds.length > 0).flatMap((n) => n.sourceToolIds),
      expressionNodes: graph.nodes.map((n) => n.expressionNodeId),
      materializedFiles: files.map((f) => f.path),
      provenance: graph.provenance
    };
    switch (target) {
      case "WEB_APP":
        files.push(...this.generateWebAppFiles(graph));
        break;
      case "GAME":
        files.push(...this.generateGameFiles(graph));
        break;
      case "CLI":
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
  plan(graph, target) {
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
  generateWebAppFiles(graph) {
    return [
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html>
<head><title>Synthia App</title></head>
<body>
  <div id="app"></div>
  <script src="app.js"><\/script>
</body>
</html>`,
        type: "html"
      },
      {
        path: "app.js",
        content: `// Generated from expression graph: ${graph.graphId}
// Nodes: ${graph.nodes.length}
// Channels: ${graph.nodes.filter((n) => n.sourceChannelIds.length > 0).length}
console.log('Synthia app initialized');`,
        type: "javascript"
      },
      {
        path: "manifest.json",
        content: JSON.stringify({
          name: "Synthia App",
          version: "1.0.0",
          graphId: graph.graphId,
          nodeCount: graph.nodes.length,
          edgeCount: graph.edges.length
        }, null, 2),
        type: "json"
      }
    ];
  }
  generateGameFiles(graph) {
    return [
      {
        path: "game.js",
        content: `// Synthia Game
// Generated from expression graph: ${graph.graphId}
// World nodes: ${graph.nodes.filter((n) => n.capabilities.includes("world")).length}
// Entity nodes: ${graph.nodes.filter((n) => n.capabilities.includes("entity")).length}
class SynthiaGame {
  constructor() {
    this.world = new World();
    this.entities = [];
  }
  init() {
    console.log('Game initialized');
  }
}`,
        type: "javascript"
      },
      {
        path: "index.html",
        content: `<!DOCTYPE html>
<html>
<body>
  <canvas id="game"></canvas>
  <script src="game.js"><\/script>
</body>
</html>`,
        type: "html"
      }
    ];
  }
  generateCLIFiles(graph) {
    return [
      {
        path: "cli.js",
        content: `#!/usr/bin/env node
// Synthia CLI
// Graph: ${graph.graphId}
const args = process.argv.slice(2);
console.log('Synthia CLI:', args);`,
        type: "javascript"
      }
    ];
  }
  generateGenericFiles(graph) {
    return [
      {
        path: "README.md",
        content: `# Synthia Artifact

Generated from expression graph: ${graph.graphId}

## Nodes
${graph.nodes.map((n) => `- ${n.expressionNodeId}: ${n.capabilities.join(", ")}`).join("\n")}

## Provenance
${graph.provenance.map((p) => `- ${p.sourceType}: ${p.description}`).join("\n")}`,
        type: "markdown"
      }
    ];
  }
}
var stdin_default = ArtifactAssembler;
export {
  ArtifactAssembler,
  stdin_default as default
};
