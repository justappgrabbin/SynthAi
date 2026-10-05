// ============================================================
// HUB 8: MESHWEAVE - Connection & Mesh Intelligence
// Graph-RAG implementation, relationship mapping
// Network topology optimization, emergent connection discovery
// ============================================================

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, any>;
  embedding: number[];
  centrality: number;
  community: string;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  weight: number;
  properties: Record<string, any>;
  bidirectional: boolean;
  createdAt: number;
}

export interface GraphQuery {
  query: string;
  vector?: number[];
  filters?: Record<string, any>;
  depth: number;
  maxResults: number;
  minRelevance: number;
}

export interface GraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: GraphPath[];
  relevance: number;
  explanation: string;
}

export interface GraphPath {
  nodes: string[];
  edges: string[];
  weight: number;
  length: number;
  semanticSimilarity: number;
}

export interface NetworkTopology {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: TopologyMetrics;
  communities: Community[];
  bridges: string[];  // Bridge nodes
  bottlenecks: string[];  // Bottleneck edges
  clusters: string[][];
}

export interface TopologyMetrics {
  density: number;
  averageDegree: number;
  clusteringCoefficient: number;
  averagePathLength: number;
  diameter: number;
  modularity: number;
  assortativity: number;
  robustness: number;
}

export interface Community {
  id: string;
  nodes: string[];
  density: number;
  centrality: number;
  coherence: number;
  topics: string[];
}

export interface EmergentConnection {
  id: string;
  nodeA: string;
  nodeB: string;
  connectionType: string;
  strength: number;
  path: string[];
  explanation: string;
  novelty: number;
  discoveredAt: number;
}

// ============================================================
// MESHWEAVE ENGINE - Graph-RAG & Mesh Intelligence
// ============================================================

export class MeshweaveEngine {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();
  private communities: Map<string, Community> = new Map();
  private emergentConnections: Map<string, EmergentConnection> = new Map();
  private queryHistory: GraphQuery[] = [];

  constructor() {
    console.log('[MESHWEAVE] Initialized - Graph-RAG & Mesh Intelligence');
  }

  // ============================================================
  // GRAPH CONSTRUCTION
  // ============================================================

  async addNode(node: Omit<GraphNode, 'id' | 'createdAt' | 'updatedAt' | 'centrality' | 'community'>): Promise<GraphNode> {
    const id = `node_${this.nodes.size}_${Date.now()}`;

    const graphNode: GraphNode = {
      ...node,
      id,
      centrality: 0,
      community: 'unassigned',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.nodes.set(id, graphNode);
    this.adjacencyList.set(id, new Set());

    // Recalculate centralities and communities
    await this.recalculateMetrics();

    return graphNode;
  }

  async addEdge(edge: Omit<GraphEdge, 'id' | 'createdAt'>): Promise<GraphEdge> {
    const id = `edge_${this.edges.size}_${Date.now()}`;

    const graphEdge: GraphEdge = {
      ...edge,
      id,
      createdAt: Date.now()
    };

    this.edges.set(id, graphEdge);

    // Update adjacency list
    if (!this.adjacencyList.has(edge.from)) {
      this.adjacencyList.set(edge.from, new Set());
    }
    this.adjacencyList.get(edge.from)!.add(edge.to);

    if (edge.bidirectional) {
      if (!this.adjacencyList.has(edge.to)) {
        this.adjacencyList.set(edge.to, new Set());
      }
      this.adjacencyList.get(edge.to)!.add(edge.from);
    }

    // Recalculate metrics
    await this.recalculateMetrics();

    return graphEdge;
  }

  async buildGraphFromDocuments(documents: Array<{id: string; text: string; metadata: any}>): Promise<void> {
    console.log(`[MESHWEAVE] Building graph from ${documents.length} documents`);

    for (const doc of documents) {
      // Create document node
      const docNode = await this.addNode({
        label: doc.text.substring(0, 100),
        type: 'document',
        properties: { ...doc.metadata, fullText: doc.text },
        embedding: this.generateEmbedding(doc.text)
      });

      // Extract entities and create nodes
      const entities = this.extractEntities(doc.text);
      for (const entity of entities) {
        let entityNode = Array.from(this.nodes.values()).find(n => n.label === entity.name && n.type === entity.type);

        if (!entityNode) {
          entityNode = await this.addNode({
            label: entity.name,
            type: entity.type,
            properties: {},
            embedding: this.generateEmbedding(entity.name)
          });
        }

        // Link document to entity
        await this.addEdge({
          from: docNode.id,
          to: entityNode.id,
          label: 'contains',
          weight: entity.confidence,
          properties: { position: entity.position },
          bidirectional: false
        });
      }

      // Extract relations and create edges
      const relations = this.extractRelations(doc.text, entities);
      for (const relation of relations) {
        const fromNode = Array.from(this.nodes.values()).find(n => n.label === relation.from);
        const toNode = Array.from(this.nodes.values()).find(n => n.label === relation.to);

        if (fromNode && toNode) {
          await this.addEdge({
            from: fromNode.id,
            to: toNode.id,
            label: relation.type,
            weight: relation.confidence,
            properties: {},
            bidirectional: relation.bidirectional
          });
        }
      }
    }

    console.log(`[MESHWEAVE] Graph built: ${this.nodes.size} nodes, ${this.edges.size} edges`);
  }

  private generateEmbedding(text: string): number[] {
    // Simple hash-based embedding (in production: use real embedding model)
    const embedding: number[] = [];
    const words = text.toLowerCase().split(/\s+/);

    for (let i = 0; i < 128; i++) {
      let val = 0;
      for (const word of words) {
        for (const char of word) {
          val += char.charCodeAt(0) * (i + 1);
        }
      }
      embedding.push(Math.sin(val) * 0.5);
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map(v => v / (magnitude + 0.001));
  }

  private extractEntities(text: string): Array<{name: string; type: string; confidence: number; position: number}> {
    const entities: Array<{name: string; type: string; confidence: number; position: number}> = [];

    // Simple regex-based entity extraction
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    for (const match of capitalized) {
      entities.push({
        name: match,
        type: 'entity',
        confidence: 0.7,
        position: text.indexOf(match)
      });
    }

    return entities;
  }

  private extractRelations(text: string, entities: any[]): Array<{from: string; to: string; type: string; confidence: number; bidirectional: boolean}> {
    const relations: Array<{from: string; to: string; type: string; confidence: number; bidirectional: boolean}> = [];

    // Simple relation extraction based on proximity
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const distance = Math.abs(entities[i].position - entities[j].position);
        if (distance < 200) { // Within 200 characters
          relations.push({
            from: entities[i].name,
            to: entities[j].name,
            type: 'related_to',
            confidence: 1 - distance / 200,
            bidirectional: true
          });
        }
      }
    }

    return relations;
  }

  // ============================================================
  // GRAPH-RAG RETRIEVAL
  // ============================================================

  async queryGraph(query: GraphQuery): Promise<GraphResult> {
    console.log(`[MESHWEAVE] Graph query: "${query.query}" (depth: ${query.depth})`);

    this.queryHistory.push(query);

    // Generate query embedding
    const queryEmbedding = query.vector || this.generateEmbedding(query.query);

    // Find semantically similar nodes
    const similarNodes = this.findSimilarNodes(queryEmbedding, query.maxResults);

    // Expand graph around similar nodes
    const expanded = await this.expandGraph(similarNodes, query.depth, query.minRelevance);

    // Find paths between relevant nodes
    const paths = this.findPaths(expanded.nodes, query.query);

    // Calculate relevance
    const relevance = this.calculateQueryRelevance(query, expanded);

    // Generate explanation
    const explanation = this.generateExplanation(query, expanded, paths);

    return {
      nodes: expanded.nodes,
      edges: expanded.edges,
      paths,
      relevance,
      explanation
    };
  }

  private findSimilarNodes(embedding: number[], maxResults: number): GraphNode[] {
    const similarities: Array<{node: GraphNode; similarity: number}> = [];

    for (const node of this.nodes.values()) {
      const similarity = this.cosineSimilarity(embedding, node.embedding);
      if (similarity > 0.3) {
        similarities.push({ node, similarity });
      }
    }

    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, maxResults).map(s => s.node);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async expandGraph(seedNodes: GraphNode[], depth: number, minRelevance: number): Promise<{nodes: GraphNode[]; edges: GraphEdge[]}> {
    const resultNodes = new Set<GraphNode>(seedNodes);
    const resultEdges = new Set<GraphEdge>();
    const visited = new Set<string>(seedNodes.map(n => n.id));

    let frontier = seedNodes.map(n => n.id);

    for (let d = 0; d < depth; d++) {
      const newFrontier: string[] = [];

      for (const nodeId of frontier) {
        const neighbors = this.adjacencyList.get(nodeId) || new Set();

        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            const neighbor = this.nodes.get(neighborId);
            if (neighbor) {
              // Check relevance
              const relevance = this.calculateNodeRelevance(neighbor, seedNodes);
              if (relevance >= minRelevance) {
                resultNodes.add(neighbor);
                visited.add(neighborId);
                newFrontier.push(neighborId);
              }
            }
          }

          // Find edge
          const edge = Array.from(this.edges.values()).find(e => 
            (e.from === nodeId && e.to === neighborId) || 
            (e.bidirectional && e.from === neighborId && e.to === nodeId)
          );

          if (edge) {
            resultEdges.add(edge);
          }
        }
      }

      frontier = newFrontier;
    }

    return {
      nodes: Array.from(resultNodes),
      edges: Array.from(resultEdges)
    };
  }

  private calculateNodeRelevance(node: GraphNode, seedNodes: GraphNode[]): number {
    let maxSimilarity = 0;
    for (const seed of seedNodes) {
      const similarity = this.cosineSimilarity(node.embedding, seed.embedding);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    return maxSimilarity;
  }

  private findPaths(nodes: GraphNode[], query: string): GraphPath[] {
    const paths: GraphPath[] = [];
    const nodeIds = nodes.map(n => n.id);

    // Find shortest paths between all pairs
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const path = this.shortestPath(nodeIds[i], nodeIds[j]);
        if (path) {
          const pathNodes = path.map(id => this.nodes.get(id)).filter(Boolean) as GraphNode[];
          const semanticSimilarity = this.calculatePathSemanticSimilarity(pathNodes, query);

          paths.push({
            nodes: path,
            edges: this.getPathEdges(path),
            weight: path.length,
            length: path.length,
            semanticSimilarity
          });
        }
      }
    }

    // Sort by semantic similarity
    paths.sort((a, b) => b.semanticSimilarity - a.semanticSimilarity);

    return paths.slice(0, 10);
  }

  private shortestPath(from: string, to: string): string[] | null {
    // BFS
    const queue: Array<{node: string; path: string[]}> = [{node: from, path: [from]}];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.node === to) {
        return current.path;
      }

      const neighbors = this.adjacencyList.get(current.node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({node: neighbor, path: [...current.path, neighbor]});
        }
      }
    }

    return null;
  }

  private getPathEdges(path: string[]): string[] {
    const edges: string[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const edge = Array.from(this.edges.values()).find(e => 
        e.from === path[i] && e.to === path[i + 1]
      );
      if (edge) edges.push(edge.id);
    }
    return edges;
  }

  private calculatePathSemanticSimilarity(pathNodes: GraphNode[], query: string): number {
    const queryEmbedding = this.generateEmbedding(query);
    let totalSimilarity = 0;

    for (const node of pathNodes) {
      totalSimilarity += this.cosineSimilarity(queryEmbedding, node.embedding);
    }

    return pathNodes.length > 0 ? totalSimilarity / pathNodes.length : 0;
  }

  private calculateQueryRelevance(query: GraphQuery, result: {nodes: GraphNode[]}): number {
    const queryEmbedding = query.vector || this.generateEmbedding(query.query);
    let totalRelevance = 0;

    for (const node of result.nodes) {
      totalRelevance += this.cosineSimilarity(queryEmbedding, node.embedding);
    }

    return result.nodes.length > 0 ? totalRelevance / result.nodes.length : 0;
  }

  private generateExplanation(query: GraphQuery, result: {nodes: GraphNode[]; edges: GraphEdge[]}, paths: GraphPath[]): string {
    let explanation = `Query: "${query.query}"\n`;
    explanation += `Found ${result.nodes.length} relevant nodes and ${result.edges.length} connections.\n`;

    if (paths.length > 0) {
      explanation += `Top path: ${paths[0].nodes.map(id => this.nodes.get(id)?.label || id).join(' -> ')}\n`;
    }

    explanation += `Relevance: ${(this.calculateQueryRelevance(query, result) * 100).toFixed(1)}%`;

    return explanation;
  }

  // ============================================================
  // NETWORK TOPOLOGY OPTIMIZATION
  // ============================================================

  async analyzeTopology(): Promise<NetworkTopology> {
    console.log(`[MESHWEAVE] Analyzing topology: ${this.nodes.size} nodes, ${this.edges.size} edges`);

    const nodes = Array.from(this.nodes.values());
    const edges = Array.from(this.edges.values());

    // Find bridges and bottlenecks
    const bridges = this.findBridges(nodes, edges);
    const bottlenecks = this.findBottlenecks(edges);

    // Calculate metrics (needs bridges for the robustness figure)
    const metrics = this.calculateTopologyMetrics(nodes, edges, bridges);

    // Detect communities
    const communities = this.detectCommunities();

    // Find clusters
    const clusters = this.findClusters();

    return {
      nodes,
      edges,
      metrics,
      communities: Array.from(communities.values()),
      bridges,
      bottlenecks,
      clusters
    };
  }

  private calculateTopologyMetrics(nodes: GraphNode[], edges: GraphEdge[], bridges: string[]): TopologyMetrics {
    const n = nodes.length;
    const m = edges.length;

    // Density
    const maxEdges = n * (n - 1) / 2;
    const density = n > 1 ? m / maxEdges : 0;

    // Average degree
    const degrees = new Map<string, number>();
    for (const edge of edges) {
      degrees.set(edge.from, (degrees.get(edge.from) || 0) + 1);
      if (edge.bidirectional) {
        degrees.set(edge.to, (degrees.get(edge.to) || 0) + 1);
      }
    }
    const avgDegree = n > 0 ? Array.from(degrees.values()).reduce((sum, d) => sum + d, 0) / n : 0;

    // Clustering coefficient (simplified)
    const clusteringCoeff = this.calculateClusteringCoefficient();

    // Average path length (simplified)
    const avgPathLength = this.calculateAveragePathLength();

    // Diameter (simplified)
    const diameter = this.calculateDiameter();

    // Modularity
    const modularity = this.calculateModularity();

    // Assortativity (simplified)
    const assortativity = 0; // Would require degree correlation calculation

    // Robustness (simplified)
    const robustness = 1 - (bridges.length / nodes.length);

    return {
      density,
      averageDegree: avgDegree,
      clusteringCoefficient: clusteringCoeff,
      averagePathLength: avgPathLength,
      diameter,
      modularity,
      assortativity,
      robustness
    };
  }

  private calculateClusteringCoefficient(): number {
    // Simplified: fraction of triangles to possible triangles
    let triangles = 0;
    let possibleTriangles = 0;

    for (const [nodeId, neighbors] of this.adjacencyList) {
      const neighborList = Array.from(neighbors);
      for (let i = 0; i < neighborList.length; i++) {
        for (let j = i + 1; j < neighborList.length; j++) {
          possibleTriangles++;
          if (this.adjacencyList.get(neighborList[i])?.has(neighborList[j])) {
            triangles++;
          }
        }
      }
    }

    return possibleTriangles > 0 ? triangles / possibleTriangles : 0;
  }

  private calculateAveragePathLength(): number {
    let totalPathLength = 0;
    let pathCount = 0;

    const nodeIds = Array.from(this.nodes.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const path = this.shortestPath(nodeIds[i], nodeIds[j]);
        if (path) {
          totalPathLength += path.length - 1;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalPathLength / pathCount : 0;
  }

  private calculateDiameter(): number {
    let maxPathLength = 0;

    const nodeIds = Array.from(this.nodes.keys());
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const path = this.shortestPath(nodeIds[i], nodeIds[j]);
        if (path) {
          maxPathLength = Math.max(maxPathLength, path.length - 1);
        }
      }
    }

    return maxPathLength;
  }

  private calculateModularity(): number {
    // Real Newman modularity: Q = sum_c [ (L_c / m) - (k_c / 2m)^2 ]
    // where L_c = edges with BOTH endpoints inside community c, and
    // k_c = sum of degrees of nodes in c. The previous version used
    // this.edges.size (the TOTAL graph edge count) for every community's
    // L_c, which made the formula meaningless -- every community got
    // credited with the whole graph's edges. This version actually
    // partitions edges by community membership.
    const communities = this.detectCommunities();
    const m = this.edges.size;

    if (m === 0) return 0;

    // Precompute community membership per node for O(1) lookup.
    const nodeCommunity = new Map<string, string>();
    for (const community of communities.values()) {
      for (const nodeId of community.nodes) {
        nodeCommunity.set(nodeId, community.id);
      }
    }

    // Real degree per node (out-adjacency + in-edges, since edges may be
    // one-directional even when the adjacency list only stores one way).
    const degree = new Map<string, number>();
    for (const edge of this.edges.values()) {
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    }

    let modularity = 0;
    for (const community of communities.values()) {
      let internalEdges = 0;
      for (const edge of this.edges.values()) {
        if (nodeCommunity.get(edge.from) === community.id && nodeCommunity.get(edge.to) === community.id) {
          internalEdges++;
        }
      }

      const communityDegree = community.nodes.reduce((sum, n) => sum + (degree.get(n) || 0), 0);
      modularity += (internalEdges / m) - Math.pow(communityDegree / (2 * m), 2);
    }

    return modularity;
  }

  private findBridges(nodes: GraphNode[], edges: GraphEdge[]): string[] {
    // Simplified bridge detection: nodes with high betweenness
    const bridges: string[] = [];

    for (const node of nodes) {
      const betweenness = this.calculateBetweenness(node.id);
      if (betweenness > 0.5) {
        bridges.push(node.id);
      }
    }

    return bridges;
  }

  private calculateBetweenness(nodeId: string): number {
    // Simplified betweenness centrality
    let betweenness = 0;
    const nodeIds = Array.from(this.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        if (nodeIds[i] === nodeId || nodeIds[j] === nodeId) continue;

        const path = this.shortestPath(nodeIds[i], nodeIds[j]);
        if (path && path.includes(nodeId)) {
          betweenness++;
        }
      }
    }

    const possiblePairs = (nodeIds.length - 1) * (nodeIds.length - 2) / 2;
    return possiblePairs > 0 ? betweenness / possiblePairs : 0;
  }

  private findBottlenecks(edges: GraphEdge[]): string[] {
    // Edges with high betweenness
    const bottlenecks: string[] = [];

    for (const edge of edges) {
      const edgeBetweenness = this.calculateEdgeBetweenness(edge);
      if (edgeBetweenness > 0.5) {
        bottlenecks.push(edge.id);
      }
    }

    return bottlenecks;
  }

  private calculateEdgeBetweenness(edge: GraphEdge): number {
    // Simplified
    return 0;
  }

  private detectCommunities(): Map<string, Community> {
    // Simple community detection by label propagation
    const communities = new Map<string, Community>();
    const labels = new Map<string, string>();

    // Initialize each node with its own label
    for (const nodeId of this.nodes.keys()) {
      labels.set(nodeId, nodeId);
    }

    // Propagate labels
    for (let iteration = 0; iteration < 10; iteration++) {
      for (const [nodeId, neighbors] of this.adjacencyList) {
        const neighborLabels = new Map<string, number>();

        for (const neighbor of neighbors) {
          const label = labels.get(neighbor);
          if (label) {
            neighborLabels.set(label, (neighborLabels.get(label) || 0) + 1);
          }
        }

        // Choose most common label
        let maxCount = 0;
        let bestLabel = labels.get(nodeId) || nodeId;

        for (const [label, count] of neighborLabels) {
          if (count > maxCount) {
            maxCount = count;
            bestLabel = label;
          }
        }

        labels.set(nodeId, bestLabel);
      }
    }

    // Group by label
    for (const [nodeId, label] of labels) {
      if (!communities.has(label)) {
        communities.set(label, {
          id: label,
          nodes: [],
          density: 0,
          centrality: 0,
          coherence: 0,
          topics: []
        });
      }
      communities.get(label)!.nodes.push(nodeId);
    }

    // Update node communities
    for (const [nodeId, label] of labels) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.community = label;
      }
    }

    return communities;
  }

  private findClusters(): string[][] {
    // Connected components
    const visited = new Set<string>();
    const clusters: string[][] = [];

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cluster: string[] = [];
        const queue = [nodeId];
        visited.add(nodeId);

        while (queue.length > 0) {
          const current = queue.shift()!;
          cluster.push(current);

          const neighbors = this.adjacencyList.get(current) || new Set();
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        clusters.push(cluster);
      }
    }

    return clusters;
  }

  // ============================================================
  // EMERGENT CONNECTION DISCOVERY
  // ============================================================

  async discoverEmergentConnections(): Promise<EmergentConnection[]> {
    console.log('[MESHWEAVE] Discovering emergent connections...');

    const connections: EmergentConnection[] = [];
    const nodeIds = Array.from(this.nodes.keys());

    // Find pairs of nodes that are not directly connected but have interesting paths
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = nodeIds[i];
        const b = nodeIds[j];

        // Check if directly connected
        const directlyConnected = this.adjacencyList.get(a)?.has(b) || this.adjacencyList.get(b)?.has(a);
        if (directlyConnected) continue;

        // Find path
        const path = this.shortestPath(a, b);
        if (path && path.length > 2 && path.length <= 5) {
          const nodeA = this.nodes.get(a)!;
          const nodeB = this.nodes.get(b)!;

          // Calculate novelty
          const novelty = this.calculateConnectionNovelty(nodeA, nodeB, path);

          if (novelty > 0.5) {
            const connection: EmergentConnection = {
              id: `emergent_${connections.length}_${Date.now()}`,
              nodeA: a,
              nodeB: b,
              connectionType: this.inferConnectionType(nodeA, nodeB, path),
              strength: 1 / path.length,
              path,
              explanation: this.generateConnectionExplanation(nodeA, nodeB, path),
              novelty,
              discoveredAt: Date.now()
            };

            connections.push(connection);
            this.emergentConnections.set(connection.id, connection);
          }
        }
      }
    }

    console.log(`[MESHWEAVE] Discovered ${connections.length} emergent connections`);
    return connections;
  }

  private calculateConnectionNovelty(nodeA: GraphNode, nodeB: GraphNode, path: string[]): number {
    // Novelty based on semantic distance and path length
    const semanticDistance = 1 - this.cosineSimilarity(nodeA.embedding, nodeB.embedding);
    const pathLengthFactor = 1 / path.length;

    // Higher novelty if nodes are in different communities
    const crossCommunity = nodeA.community !== nodeB.community ? 0.3 : 0;

    return Math.min(semanticDistance * pathLengthFactor + crossCommunity, 1.0);
  }

  private inferConnectionType(nodeA: GraphNode, nodeB: GraphNode, path: string[]): string {
    // Infer type based on node types and path structure
    if (nodeA.type === 'document' && nodeB.type === 'document') {
      return 'thematic_bridge';
    }
    if (nodeA.type === 'entity' && nodeB.type === 'entity') {
      return 'indirect_association';
    }
    return 'emergent_link';
  }

  private generateConnectionExplanation(nodeA: GraphNode, nodeB: GraphNode, path: string[]): string {
    const pathLabels = path.map(id => this.nodes.get(id)?.label || id);
    return `${nodeA.label} is connected to ${nodeB.label} through: ${pathLabels.join(' -> ')}`;
  }

  // ============================================================
  // METRICS RECALCULATION
  // ============================================================

  private async recalculateMetrics(): Promise<void> {
    // Calculate centrality for all nodes
    const centralities = this.calculateCentralities();

    for (const [nodeId, centrality] of centralities) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.centrality = centrality;
      }
    }

    // Detect communities
    const communities = this.detectCommunities();

    for (const [nodeId, node] of this.nodes) {
      const community = communities.get(node.community);
      if (community) {
        node.community = community.id;
      }
    }
  }

  private calculateCentralities(): Map<string, number> {
    const centrality = new Map<string, number>();

    for (const nodeId of this.nodes.keys()) {
      centrality.set(nodeId, 0);
    }

    for (const edge of this.edges.values()) {
      centrality.set(edge.from, (centrality.get(edge.from) || 0) + edge.weight);
      if (edge.bidirectional) {
        centrality.set(edge.to, (centrality.get(edge.to) || 0) + edge.weight);
      }
    }

    // Normalize
    const maxCentrality = Math.max(...centrality.values(), 0.001);
    for (const [nodeId, value] of centrality) {
      centrality.set(nodeId, value / maxCentrality);
    }

    return centrality;
  }

  // ============================================================
  // API INTERFACE
  // ============================================================

  async handleMessage(message: any): Promise<any> {
    const { type, payload } = message;

    switch (type) {
      case 'add_node':
        return await this.addNode(payload);

      case 'add_edge':
        return await this.addEdge(payload);

      case 'build_from_docs':
        await this.buildGraphFromDocuments(payload.documents);
        return { built: true, nodes: this.nodes.size, edges: this.edges.size };

      case 'query':
        return await this.queryGraph(payload);

      case 'analyze_topology':
        return await this.analyzeTopology();

      case 'discover_emergent':
        return await this.discoverEmergentConnections();

      case 'get_node':
        return this.nodes.get(payload.nodeId);

      case 'get_edge':
        return this.edges.get(payload.edgeId);

      case 'get_neighbors':
        const neighbors = this.adjacencyList.get(payload.nodeId);
        return neighbors ? Array.from(neighbors).map(id => this.nodes.get(id)) : [];

      case 'stats':
        return {
          nodes: this.nodes.size,
          edges: this.edges.size,
          communities: this.communities.size,
          emergentConnections: this.emergentConnections.size,
          queries: this.queryHistory.length
        };

      default:
        return { error: `Unknown message type: ${type}` };
    }
  }
}

export default MeshweaveEngine;
