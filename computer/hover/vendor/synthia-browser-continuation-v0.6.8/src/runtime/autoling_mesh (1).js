
// ============================================
// AUTOLING MESH v1.0
// One file. Everything. 
// Ingestion → AUTOLING → Mesh → Emergence → Render → Personal Server
// ============================================

class AUTOLINGMesh {
  constructor() {
    // The mesh — where everything lives
    this.mesh = {
      coordinates: new Map(),      // All addresses
      relations: new Map(),        // All connections
      events: [],                  // All history
      patterns: [],                // Compressed rules
      states: new Map(),           // Current state per entity
      files: new Map(),            // All ingested files
      apps: new Map(),             // All running apps
      server: null                 // Personal server instance
    };

    // The five lenses — perspectives for similarity
    this.lenses = {
      structure: (a, b) => this.structuralLens(a, b),
      behavior: (a, b) => this.behavioralLens(a, b),
      function: (a, b) => this.functionalLens(a, b),
      history: (a, b) => this.historicalLens(a, b),
      context: (a, b) => this.contextualLens(a, b)
    };

    // The containment order — recursive nesting
    this.order = ['field', 'environment', 'group', 'person', 'chart', 'planet', 'gate', 'line', 'color', 'tone', 'base'];

    // The personal server config
    this.serverConfig = {
      port: 0, // auto-detect
      host: 'localhost',
      autoStart: true,
      peers: new Set()
    };

    // Start the server immediately
    if (this.serverConfig.autoStart) {
      this.startPersonalServer();
    }
  }

  // ============================================
  // PERSPECTIVE / SIMILARITY — The root primitive
  // ============================================

  perspective(name, lens) {
    return { name, lens, weights: {}, depth: 1, tolerance: 0.1 };
  }

  similarity(a, b, perspective) {
    if (!perspective || !this.lenses[perspective.lens]) {
      return this.defaultLens(a, b);
    }
    return this.lenses[perspective.lens](a, b);
  }

  structuralLens(a, b) {
    let score = 0, checks = 0;
    ['gate', 'line', 'color', 'tone', 'base'].forEach(key => {
      if (a[key] !== undefined && b[key] !== undefined) {
        score += a[key] === b[key] ? 1 : 0;
        checks++;
      }
    });
    return checks > 0 ? score / checks : 0;
  }

  behavioralLens(a, b) {
    let score = 0, checks = 0;
    ['type', 'direction', 'role'].forEach(key => {
      if (a[key] !== undefined && b[key] !== undefined) {
        score += a[key] === b[key] ? 1 : 0;
        checks++;
      }
    });
    return checks > 0 ? score / checks : 0;
  }

  functionalLens(a, b) {
    let score = 0, checks = 0;
    if (a.target !== undefined && b.target !== undefined) {
      score += a.target === b.target ? 1 : 0;
      checks++;
    }
    if (a.strength !== undefined && b.strength !== undefined) {
      score += 1 - Math.min(Math.abs(a.strength - b.strength), 1);
      checks++;
    }
    return checks > 0 ? score / checks : 0;
  }

  historicalLens(a, b) {
    // Check if they appear in same sequence context
    const aEvents = this.mesh.events.filter(e => e.source === a.hash || e.target === a.hash);
    const bEvents = this.mesh.events.filter(e => e.source === b.hash || e.target === b.hash);
    if (aEvents.length === 0 || bEvents.length === 0) return 0;

    const aNeighbors = new Set(aEvents.map(e => e.source === a.hash ? e.target : e.source));
    const bNeighbors = new Set(bEvents.map(e => e.source === b.hash ? e.target : e.source));
    const intersection = new Set([...aNeighbors].filter(x => bNeighbors.has(x)));
    return intersection.size / Math.max(aNeighbors.size, bNeighbors.size);
  }

  contextualLens(a, b) {
    let score = 0, checks = 0;
    ['circuit', 'center', 'zodiac', 'house'].forEach(key => {
      if (a[key] !== undefined && b[key] !== undefined) {
        score += a[key] === b[key] ? 1 : 0;
        checks++;
      }
    });
    return checks > 0 ? score / checks : 0;
  }

  defaultLens(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 1 : 0;
  }

  // ============================================
  // COORDINATE — Pure address
  // ============================================

  coordinate(props) {
    const coord = {
      gate: props.gate || 1,
      line: props.line || 1,
      color: props.color || 1,
      tone: props.tone || 1,
      base: props.base || 1,
      degree: props.degree || 0,
      minute: props.minute || 0,
      second: props.second || 0,
      arcsecond: props.arcsecond || 0,
      zodiac: props.zodiac || null,
      house: props.house || null,
      planet: props.planet || null,
      layer: props.layer || 'gate',
      hash: () => `${props.gate || 1}.${props.line || 1}.${props.color || 1}.${props.tone || 1}.${props.base || 1}`,
      toString: () => `${props.planet || '?'}.${props.degree || 0}°${props.minute || 0}'${props.second || 0}"${props.zodiac || '?'}.${props.house || '?'}.${props.gate || 1}.${props.line || 1}.${props.color || 1}.${props.tone || 1}.${props.base || 1}`
    };
    this.mesh.coordinates.set(coord.hash(), coord);
    return coord;
  }

  // ============================================
  // RELATIONS — Five operators
  // ============================================

  resonate(a, b) {
    if (a.gate === b.gate) return { type: 'RESONANCE', strength: 1.0, phase: 0, harmonic: 1, role: 'initiate' };
    const complement = 65 - a.gate;
    if (b.gate === complement) return { type: 'RESONANCE', strength: 0.5, phase: 0.5, harmonic: 2, role: 'pulse' };
    return null;
  }

  oppose(a, b) {
    const complement = 65 - a.gate;
    if (b.gate === complement) return { type: 'OPPOSITION', strength: 1.0, phase: 0.5, tension: 'direct', role: 'collapse' };
    if (a.line === b.line && a.gate !== b.gate) return { type: 'OPPOSITION', strength: 0.4, phase: 0.33, tension: 'line', role: 'collapse' };
    return null;
  }

  complete(a, b) {
    const channels = [
      [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52], [10, 20], [11, 56],
      [12, 22], [13, 33], [16, 48], [17, 62], [18, 58], [19, 49], [21, 45], [23, 43], [24, 61], [25, 51],
      [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36], [37, 40], [39, 55],
      [42, 53], [47, 64]
    ];
    for (const [g1, g2] of channels) {
      if ((a.gate === g1 && b.gate === g2) || (a.gate === g2 && b.gate === g1)) {
        return { type: 'COMPLETION', strength: 1.0, channel: `${g1}-${g2}`, role: 'initiate' };
      }
    }
    if (a.line === b.line) return { type: 'COMPLETION', strength: 0.5, profile: `${a.line}/${b.line}`, role: 'pulse' };
    return null;
  }

  transform(a, b) {
    const mandala = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64];
    const idxA = mandala.indexOf(a.gate);
    const idxB = mandala.indexOf(b.gate);
    if (Math.abs(idxA - idxB) === 1) {
      return { type: 'TRANSFORMATION', strength: 0.7, direction: idxB > idxA ? 'forward' : 'backward', role: 'pulse' };
    }
    if (a.gate === b.gate && Math.abs(a.line - b.line) === 1) {
      return { type: 'TRANSFORMATION', strength: 0.9, direction: b.line > a.line ? 'ascending' : 'descending', layer: 'line', role: 'initiate' };
    }
    return null;
  }

  contain(a, b) {
    const idxA = this.order.indexOf(a.layer);
    const idxB = this.order.indexOf(b.layer);
    if (idxA < idxB && (a.gate === b.gate || a.layer === 'field' || a.layer === 'environment' || a.layer === 'group' || a.layer === 'person' || a.layer === 'chart')) {
      return { type: 'CONTAINMENT', strength: 1.0, container: a.layer, contained: b.layer, role: 'initiate' };
    }
    return null;
  }

  evaluate(a, b) {
    const events = [];
    [this.resonate, this.oppose, this.complete, this.transform, this.contain].forEach(op => {
      const event = op.call(this, a, b);
      if (event) {
        event.source = a.hash();
        event.target = b.hash();
        event.timestamp = Date.now();
        events.push(event);
      }
    });
    return events;
  }

  // ============================================
  // AUTOLING — Observe, Compare, Compress, Predict
  // ============================================

  observe(event) {
    this.mesh.events.push(event);

    // Ask the questions
    const questions = this.askQuestions(event);

    // Find patterns
    const patterns = this.findPatterns(event);

    // Compress
    const rules = this.compress(patterns);

    // Predict
    const prediction = this.predict(event);

    return { questions, patterns, rules, prediction };
  }

  askQuestions(event) {
    return {
      what: `What is ${event.source}?`,
      where: `Where does ${event.source} belong?`,
      how: `How does ${event.source} relate to ${event.target}?`,
      why: `Why did ${event.type} occur?`,
      whatNext: `What emerges from ${event.type}?`
    };
  }

  findPatterns(event) {
    // Find similar events
    const similar = this.mesh.events.filter(e => {
      const sim = this.similarity(event, e, this.perspective('structural', 'structure'));
      return sim > 0.7 && e.timestamp !== event.timestamp;
    });

    return similar.map(e => ({
      type: 'repetition',
      event: e,
      similarity: this.similarity(event, e, this.perspective('structural', 'structure'))
    }));
  }

  compress(patterns) {
    if (patterns.length < 2) return [];

    // Group by type
    const byType = {};
    patterns.forEach(p => {
      if (!byType[p.event.type]) byType[p.event.type] = [];
      byType[p.event.type].push(p);
    });

    // Create rules from groups
    const rules = [];
    for (const [type, group] of Object.entries(byType)) {
      if (group.length >= 2) {
        rules.push({
          type: 'rule',
          pattern: type,
          frequency: group.length,
          confidence: group.length / this.mesh.events.length,
          sources: group.map(p => p.event.source),
          targets: group.map(p => p.event.target)
        });
      }
    }

    this.mesh.patterns.push(...rules);
    return rules;
  }

  predict(event) {
    // Find rules that match this event's pattern
    const relevant = this.mesh.patterns.filter(p => 
      p.sources.includes(event.source) || p.targets.includes(event.target)
    );

    if (relevant.length === 0) return null;

    // Predict most likely next event
    const predictions = relevant.map(r => ({
      rule: r,
      likelihood: r.confidence,
      predictedTarget: r.targets[Math.floor(Math.random() * r.targets.length)]
    }));

    predictions.sort((a, b) => b.likelihood - a.likelihood);
    return predictions[0];
  }

  // ============================================
  // INGESTION — Take anything, place it
  // ============================================

  ingest(input, metadata = {}) {
    // Detect type
    const detected = this.detectType(input, metadata);

    // Generate coordinate
    const coord = this.generateCoordinate(detected);

    // Place in mesh
    const placed = this.placeInMesh(coord, detected);

    // Generate emergent properties
    const emergent = this.generateEmergent(coord, detected);

    // Store file
    this.mesh.files.set(coord.hash(), {
      input,
      detected,
      coord,
      placed,
      emergent,
      timestamp: Date.now()
    });

    // AUTOLING observes
    const observation = this.observe({
      type: 'INGESTION',
      source: coord.hash(),
      target: 'mesh',
      ...detected
    });

    return {
      hash: coord.hash(),
      coord,
      detected,
      placed,
      emergent,
      observation,
      questions: observation.questions
    };
  }

  detectType(input, metadata) {
    const type = metadata.type || this.inferType(input);
    return {
      type,
      format: metadata.format || this.inferFormat(input, type),
      size: metadata.size || (typeof input === 'string' ? input.length : 0),
      name: metadata.name || 'unnamed',
      source: metadata.source || 'unknown'
    };
  }

  inferType(input) {
    if (typeof input === 'string') {
      if (input.startsWith('<!DOCTYPE') || input.startsWith('<html')) return 'html';
      if (input.startsWith('{') || input.startsWith('[')) return 'json';
      if (input.startsWith('function') || input.startsWith('class') || input.startsWith('const')) return 'javascript';
      if (input.startsWith('---') || input.includes(':')) return 'yaml';
      if (input.startsWith('#')) return 'markdown';
      return 'text';
    }
    if (input instanceof ArrayBuffer) return 'binary';
    if (input instanceof Blob) return 'blob';
    return 'unknown';
  }

  inferFormat(input, type) {
    const formats = {
      html: 'text/html',
      json: 'application/json',
      javascript: 'application/javascript',
      yaml: 'text/yaml',
      markdown: 'text/markdown',
      text: 'text/plain',
      binary: 'application/octet-stream',
      blob: 'application/octet-stream',
      unknown: 'application/octet-stream'
    };
    return formats[type] || 'application/octet-stream';
  }

  generateCoordinate(detected) {
    // Map type to gate
    const typeToGate = {
      html: 1,      // Inspiration
      json: 2,      // Beat
      javascript: 3, // Mutation
      yaml: 4,      // Logic
      markdown: 5,  // Rhythm
      text: 6,      // Intimacy
      binary: 7,    // Alpha
      blob: 8,      // Concentration
      unknown: 9    // Curiosity
    };

    const gate = typeToGate[detected.type] || 9;
    const line = Math.min(Math.floor(detected.size / 100) + 1, 6);
    const color = Math.min(Math.floor(detected.size / 50) + 1, 6);
    const tone = Math.min(Math.floor(detected.size / 25) + 1, 6);
    const base = Math.min(Math.floor(detected.size / 10) + 1, 5);

    return this.coordinate({
      gate,
      line,
      color,
      tone,
      base,
      layer: 'gate',
      planet: detected.source
    });
  }

  placeInMesh(coord, detected) {
    // Find where this coordinate belongs
    const container = this.findContainer(coord);
    const neighbors = this.findNeighbors(coord);
    const relations = this.evaluate(coord, container);

    return {
      container: container ? container.hash() : 'field',
      neighbors: neighbors.map(n => n.hash()),
      relations,
      layer: coord.layer
    };
  }

  findContainer(coord) {
    // Find the largest coordinate that contains this one
    for (let i = this.order.indexOf(coord.layer) - 1; i >= 0; i--) {
      const layer = this.order[i];
      for (const [hash, c] of this.mesh.coordinates) {
        if (c.layer === layer) {
          const containment = this.contain(c, coord);
          if (containment) return c;
        }
      }
    }
    return null;
  }

  findNeighbors(coord) {
    // Find coordinates that resonate with this one
    const neighbors = [];
    for (const [hash, c] of this.mesh.coordinates) {
      if (hash !== coord.hash()) {
        const resonance = this.resonate(coord, c);
        if (resonance && resonance.strength > 0.3) {
          neighbors.push(c);
        }
      }
    }
    return neighbors;
  }

  generateEmergent(coord, detected) {
    // Generate emergent properties from coordinate
    const hue = ((coord.gate - 1) * 5.625 + (coord.line - 1) * 0.9375) % 360;
    const frequency = 440 * Math.pow(2, (coord.gate - 1) / 64);
    const form = this.getFormFromGate(coord.gate);
    const function_type = this.getFunctionFromCircuit(coord.gate);

    return {
      color: {
        hue,
        saturation: 0.7 + (coord.color / 6) * 0.3,
        lightness: 0.4 + (coord.tone / 6) * 0.4
      },
      sound: {
        frequency,
        timbre: this.getTimbreFromBase(coord.base),
        harmonic: coord.line
      },
      form: {
        shape: form,
        texture: this.getTextureFromLine(coord.line),
        size: 1 + (coord.base / 5)
      },
      function: {
        type: function_type,
        circuit: this.getCircuitName(coord.gate),
        center: this.getCenterFromGate(coord.gate)
      }
    };
  }

  getFormFromGate(gate) {
    const forms = ['circle', 'triangle', 'square', 'spiral', 'wave', 'star', 'hexagon', 'diamond'];
    return forms[gate % forms.length];
  }

  getTextureFromLine(line) {
    const textures = ['smooth', 'rough', 'grainy', 'polished', 'matte', 'glossy'];
    return textures[line - 1];
  }

  getTimbreFromBase(base) {
    const timbres = ['pure', 'rich', 'bright', 'warm', 'dark'];
    return timbres[base - 1];
  }

  getFunctionFromCircuit(gate) {
    const circuits = {
      'Understanding': 'sequential',
      'Knowing': 'associative',
      'Sensing': 'sensory',
      'Ego': 'identity',
      'Integration': 'connective'
    };
    return circuits[this.getCircuitName(gate)] || 'general';
  }

  getCircuitName(gate) {
    const circuits = {
      'Understanding': [1, 2, 7, 13, 25, 40, 41, 44, 57, 61],
      'Knowing': [3, 10, 20, 36, 37, 49, 55, 63],
      'Sensing': [5, 9, 15, 16, 28, 46, 47, 48],
      'Ego': [21, 26, 32, 35, 45, 51, 54, 62],
      'Integration': [10, 20, 34, 57]
    };
    for (const [name, gates] of Object.entries(circuits)) {
      if (gates.includes(gate)) return name;
    }
    return 'Individual';
  }

  getCenterFromGate(gate) {
    const centers = {
      'Head': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      'Ajna': [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
      'Throat': [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
      'G': [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64],
      'Heart': [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
      'Solar Plexus': [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52],
      'Sacral': [53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 1, 2, 3, 4],
      'Spleen': [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
      'Root': [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
    };
    for (const [name, gates] of Object.entries(centers)) {
      if (gates.includes(gate)) return name;
    }
    return 'Unknown';
  }

  // ============================================
  // FRONTEND — Knows what to render
  // ============================================

  render(hash) {
    const file = this.mesh.files.get(hash);
    if (!file) return null;

    const { coord, emergent, detected } = file;

    // Determine what frontend component to use
    const component = this.selectComponent(detected, emergent);

    return {
      hash,
      component,
      props: {
        color: emergent.color,
        sound: emergent.sound,
        form: emergent.form,
        function: emergent.function,
        coord,
        detected
      },
      actions: this.getActions(detected, emergent)
    };
  }

  selectComponent(detected, emergent) {
    const components = {
      html: 'HTMLViewer',
      json: 'JSONViewer',
      javascript: 'CodeEditor',
      yaml: 'ConfigEditor',
      markdown: 'MarkdownViewer',
      text: 'TextEditor',
      binary: 'BinaryViewer',
      blob: 'MediaPlayer',
      unknown: 'GenericViewer'
    };
    return components[detected.type] || 'GenericViewer';
  }

  getActions(detected, emergent) {
    const actions = ['view', 'edit', 'share', 'delete'];
    if (detected.type === 'javascript') actions.push('run');
    if (detected.type === 'html') actions.push('preview');
    if (emergent.sound) actions.push('play');
    return actions;
  }

  // ============================================
  // PERSONAL SERVER — Auto-starts, terminal-activated
  // ============================================

  startPersonalServer() {
    // Check if we're in Node.js environment
    if (typeof window !== 'undefined') {
      // Browser: use WebSocket or Service Worker
      this.startBrowserServer();
      return;
    }

    // Node.js: start HTTP server
    try {
      const http = require('http');
      const server = http.createServer((req, res) => {
        this.handleServerRequest(req, res);
      });

      server.listen(0, 'localhost', () => {
        const port = server.address().port;
        this.serverConfig.port = port;
        this.mesh.server = server;
        console.log(`🌱 AUTOLING Mesh Personal Server running on http://localhost:${port}`);
        console.log(`   Terminal: curl http://localhost:${port}/status`);
      });
    } catch (e) {
      console.log('Server not available in this environment');
    }
  }

  startBrowserServer() {
    // In browser: use BroadcastChannel or SharedWorker
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('autoling_mesh');
      channel.onmessage = (e) => {
        this.handleBrowserMessage(e.data);
      };
      this.mesh.server = channel;
      console.log('🌱 AUTOLING Mesh Browser Server running via BroadcastChannel');
    }
  }

  handleServerRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const url = new URL(req.url, `http://localhost:${this.serverConfig.port}`);
    const path = url.pathname;

    switch (path) {
      case '/status':
        res.end(JSON.stringify({
          status: 'running',
          coordinates: this.mesh.coordinates.size,
          events: this.mesh.events.length,
          patterns: this.mesh.patterns.length,
          files: this.mesh.files.size,
          peers: Array.from(this.serverConfig.peers)
        }));
        break;

      case '/ingest':
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const result = this.ingest(data.input, data.metadata);
              res.end(JSON.stringify(result));
            } catch (e) {
              res.end(JSON.stringify({ error: e.message }));
            }
          });
        } else {
          res.end(JSON.stringify({ error: 'POST required' }));
        }
        break;

      case '/query':
        const hash = url.searchParams.get('hash');
        if (hash) {
          const result = this.render(hash);
          res.end(JSON.stringify(result));
        } else {
          res.end(JSON.stringify({ files: Array.from(this.mesh.files.keys()) }));
        }
        break;

      case '/bloom':
        const target = url.searchParams.get('target');
        if (target) {
          const coord = this.mesh.coordinates.get(target);
          if (coord) {
            const events = this.bloom(coord);
            res.end(JSON.stringify({ events }));
          } else {
            res.end(JSON.stringify({ error: 'Coordinate not found' }));
          }
        }
        break;

      default:
        res.end(JSON.stringify({
          routes: ['/status', '/ingest', '/query', '/bloom'],
          message: 'AUTOLING Mesh Personal Server'
        }));
    }
  }

  handleBrowserMessage(data) {
    switch (data.type) {
      case 'ingest':
        return this.ingest(data.input, data.metadata);
      case 'query':
        return this.render(data.hash);
      case 'status':
        return {
          coordinates: this.mesh.coordinates.size,
          events: this.mesh.events.length,
          patterns: this.mesh.patterns.length
        };
    }
  }

  bloom(coord, maxDepth = 5) {
    const allEvents = [];
    let current = [coord];
    const visited = new Set([coord.hash()]);

    for (let i = 0; i < maxDepth; i++) {
      const next = [];
      for (const c of current) {
        for (const [hash, other] of this.mesh.coordinates) {
          if (!visited.has(hash)) {
            const events = this.evaluate(c, other);
            if (events.length > 0) {
              visited.add(hash);
              allEvents.push(...events);
              next.push(other);
            }
          }
        }
      }
      if (next.length === 0) break;
      current = next;
    }

    return allEvents;
  }

  // ============================================
  // TERMINAL INTERFACE
  // ============================================

  terminal(command, args = {}) {
    switch (command) {
      case 'ingest':
        return this.ingest(args.input, args.metadata);
      case 'query':
        return this.render(args.hash);
      case 'status':
        return {
          coordinates: this.mesh.coordinates.size,
          events: this.mesh.events.length,
          patterns: this.mesh.patterns.length,
          files: this.mesh.files.size,
          server: this.serverConfig.port ? `running on port ${this.serverConfig.port}` : 'not running'
        };
      case 'bloom':
        const coord = this.mesh.coordinates.get(args.hash);
        return coord ? this.bloom(coord) : { error: 'Not found' };
      case 'server':
        if (args.action === 'start') {
          this.startPersonalServer();
          return { status: 'starting' };
        }
        return { status: this.mesh.server ? 'running' : 'stopped' };
      default:
        return { error: `Unknown command: ${command}` };
    }
  }
}

// ============================================
// AUTO-START
// ============================================

const mesh = new AUTOLINGMesh();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AUTOLINGMesh, mesh };
}

// Global access
if (typeof window !== 'undefined') {
  window.AUTOLINGMesh = AUTOLINGMesh;
  window.autolingMesh = mesh;
}

// Terminal-ready
console.log('🌱 AUTOLING Mesh loaded. Type: mesh.terminal("status")');
