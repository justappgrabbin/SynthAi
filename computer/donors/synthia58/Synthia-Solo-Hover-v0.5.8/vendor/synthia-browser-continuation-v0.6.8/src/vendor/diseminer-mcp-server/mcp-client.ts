// ============================================================
// DISEMINER MCP Client — Test/Demo Client
// Connects to diseminer-mcp-server via stdio
// ============================================================

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/diseminer-mcp-server.js']
  });

  const client = new Client(
    { name: 'diseminer-test-client', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  await client.connect(transport);

  console.log('=== DISEMINER MCP Client Demo ===\n');

  // 1. List available tools
  console.log('--- Available Tools ---');
  const tools = await client.listTools();
  for (const tool of tools.tools) {
    console.log(`  • ${tool.name}: ${tool.description}`);
  }

  // 2. Query a gate
  console.log('\n--- Query Gate 6.4 ---');
  const gateResult = await client.callTool({
    name: 'query_gate',
    arguments: {
      gate: 6,
      line: 4,
      color: 4,
      tone: 3,
      base: 2
    }
  });
  console.log(JSON.parse((gateResult.content[0] as any).text));

  // 3. Transform a house
  console.log('\n--- Transform House 1 with ATO 110 ---');
  const transformResult = await client.callTool({
    name: 'transform_house',
    arguments: {
      houseId: 1,
      atoOperator: '110'
    }
  });
  const transform = JSON.parse((transformResult.content[0] as any).text);
  console.log(`Original: ${transform.analogyMapping[0].original}`);
  console.log(`Transformed: ${transform.analogyMapping[0].transformed}`);

  // 4. Evaluate Klein Tools
  console.log('\n--- Evaluate Klein Tools ---');
  const kleinResult = await client.callTool({
    name: 'evaluate_klein_tools',
    arguments: {
      nodeId: 'demo-node',
      activeToolIds: ['gate-6-primary', 'gate-6-secondary'],
      decompose: true,
      decomposeDepth: 1
    }
  });
  console.log(JSON.parse((kleinResult.content[0] as any).text));

  // 5. Simulate narrative
  console.log('\n--- Simulate Narrative ---');
  const simResult = await client.callTool({
    name: 'simulate_narrative',
    arguments: {
      query: 'How do I resolve conflict in my relationship?',
      chartData: {
        sunGate: 6,
        sunLine: 4,
        sunColor: 4,
        sunTone: 3,
        sunBase: 2,
        earthGate: 36,
        earthLine: 1
      },
      nSamples: 100,
      seed: 42
    }
  });
  const sim = JSON.parse((simResult.content[0] as any).text);
  console.log(`Best path score: ${(sim.bestPath.finalScore * 100).toFixed(1)}%`);
  console.log(`Trajectory: ${sim.bestPath.trajectory}`);
  console.log(`Convergence: ${sim.bestPath.convergencePoint.substring(0, 60)}...`);

  // 6. List houses
  console.log('\n--- List Houses ---');
  const housesResult = await client.callTool({
    name: 'list_houses',
    arguments: {}
  });
  const houses = JSON.parse((housesResult.content[0] as any).text);
  for (const h of houses.houses) {
    console.log(`  House ${h.houseId}: ${h.name} (${h.trigram}) — ${h.hexagramCount} hexagrams`);
  }

  await client.close();
  console.log('\n=== Demo Complete ===');
}

main().catch(console.error);
