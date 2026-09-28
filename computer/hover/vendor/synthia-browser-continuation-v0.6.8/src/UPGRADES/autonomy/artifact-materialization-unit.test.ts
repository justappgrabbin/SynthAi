import assert from 'node:assert/strict';
import { ArtifactAssembler } from '../../runtime/ArtifactAssembler';
import { ArtifactValidator } from '../../runtime/ArtifactValidator';
import { ToolRegistry } from '../../runtime/ToolRegistry';
import { CapabilityRegistry } from '../../runtime/CapabilityRegistry';
import { ChannelRegistry, INTEGRATION_CIRCUIT_CHANNELS } from '../../runtime/ChannelRegistry';
import type { ExpressionGraph, KleinToolAdapter } from '../../runtime/foundations';

async function main() {
  const channels = new ChannelRegistry();
  const integration = ['10-34','10-57','34-57','20-34','20-57','10-20'];
  assert.equal(INTEGRATION_CIRCUIT_CHANNELS.size, 6);
  for (const id of integration) assert.equal(channels.getChannel(id)?.circuit, 'Integration');

  const capabilityRegistry = new CapabilityRegistry();
  const tools = new ToolRegistry(capabilityRegistry);
  const fake: KleinToolAdapter = {
    toolId: 'tool-real-generated', name: 'Generated Channel Connector',
    provides: ['34-57'], requires: [], accepts: () => true,
    async execute(){ return { success:true, outputValues:{}, expressionNodes:[], provenance:[] }; },
    materialize(){
      return {
        files:[{ path:'tools/tool-real-generated.mjs', content:'export const call = input => input;', type:'javascript' }],
        manifest:{ id:'tool-real-generated', structure:{ level:6, name:'Channel Connector' } },
        metadata:{ generated:true, capabilityKey:'34-57' }
      };
    }
  };
  tools.registerTool(fake);

  const graph: ExpressionGraph = {
    graphId:'graph-test', sessionId:'session-test', target:'WEB_APP', settled:true,
    nodes:[{
      expressionNodeId:'generated-tool-real-generated-session-test-1',
      sourceChannelIds:['34-57'], sourceStateIds:['a','b'], sourceToolIds:['tool-real-generated'],
      capabilities:['34-57'], inputs:[], outputs:[],
      configuration:{ output:{ packet:{ from:34,to:57,signal:'connect' }, files:[{ path:'data/result.json', content:'{"ok":true}', type:'json' }] } }
    }],
    edges:[], inputs:[], outputs:[], constraints:[],
    provenance:[{ recordId:'prov-1', timestamp:1, sourceType:'TOOL', sourceId:'tool-real-generated', description:'executed', resultingNodeIds:['generated-tool-real-generated-session-test-1'] }]
  };

  const assembler = new ArtifactAssembler(tools);
  const result = await assembler.assemble(graph, 'WEB_APP');
  const validation = await new ArtifactValidator().validate(result);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  const paths = new Set(result.files.map(f=>f.path));
  for (const p of ['tools/tool-real-generated.mjs','tools/tool-real-generated.manifest.json','tools/tool-real-generated.metadata.json','data/result.json','synthia/expression-graph.json','synthia/runtime-output.json','synthia/provenance.json','synthia/artifact-manifest.json','index.html','app.js']) assert.ok(paths.has(p), p);
  assert.deepEqual(new Set(result.manifest.materializedFiles), paths);
  const all = result.files.map(f=>f.content).join('\n');
  assert.equal(all.includes("console.log('Synthia app initialized')"), false);
  assert.equal(all.includes('this.world = new World()'), false);
  assert.ok(all.includes('export const call = input => input;'));
  assert.deepEqual(result.manifest.executedTools, ['tool-real-generated']);
  assert.deepEqual(result.manifest.activatedChannels, ['34-57']);

  console.log(JSON.stringify({ integration, files:[...paths], valid:validation.valid }, null, 2));
}
main();
