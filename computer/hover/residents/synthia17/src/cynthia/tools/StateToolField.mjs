const clone = value => value == null ? value : structuredClone(value);
const canonicalConnection = (a,b) => `${Math.min(Number(a),Number(b))}-${Math.max(Number(a),Number(b))}`;
const validGate = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 64;

function manifestOf(tool) {
  if (!tool) return null;
  try { return typeof tool.manifest === 'function' ? tool.manifest() : (tool.manifest || null); }
  catch { return null; }
}

function normalizeAddress(address = {}) {
  if (!address || !validGate(address.gate)) return null;
  return Object.freeze({
    mode:address.mode || 'macro',
    gate:Number(address.gate),
    line:Number(address.line || 1),
    color:Number(address.color || 1),
    tone:Number(address.tone || 1),
    base:Number(address.base || 1),
  });
}

function toolCapabilities(tool, manifest, extra = []) {
  const values = [
    ...(extra || []),
    ...(tool?.provides || []),
    ...(manifest?.metadata?.capabilities || []),
    ...(manifest?.ports || []).flatMap(port => port.guarantees || []),
    tool?.id,
    manifest?.id,
  ].filter(Boolean);
  return [...new Set(values.map(String))].sort();
}

/**
 * StateToolField
 * --------------
 * Active user/agent tools expressed over the state space. Tools are persistent
 * repertoire; activation is contextual. A connection-born tool is not deleted
 * when its connection disappears -- it simply becomes inactive until the
 * connection becomes reachable again.
 */
export class StateToolField {
  constructor({ stateSpace = null, atoMesh = null, factoryBridge = null, mcpMesh = null } = {}) {
    this.stateSpace = stateSpace;
    this.atoMesh = atoMesh;
    this.factoryBridge = factoryBridge;
    this.mcpMesh = mcpMesh;
    this.tools = new Map();
    this.programs = new Map();
    this.connections = new Map();
    this.current = Object.freeze({ gate:null, activeGates:[], connections:[], role:'agent' });
    this.events = [];
  }

  registerTool(tool, options = {}) {
    const manifest = manifestOf(tool);
    const id = String(options.id || tool?.toolId || tool?.id || manifest?.id || '');
    if (!id) throw new TypeError('STATE_TOOL_ID_REQUIRED');
    const address = normalizeAddress(options.address || manifest?.address || tool?.address);
    const connectionIds = [...new Set((options.requiredConnections || []).map(value => {
      if (Array.isArray(value)) return canonicalConnection(value[0],value[1]);
      return String(value);
    }))];
    const requiredGates = [...new Set((options.requiredGates || []).map(Number).filter(validGate))];
    if (options.connection && Array.isArray(options.connection)) connectionIds.push(canonicalConnection(options.connection[0], options.connection[1]));
    const capabilities = Object.freeze(toolCapabilities(tool, manifest, options.capabilities));
    const roles = Object.freeze([...(options.roles || ['agent','user'])]);
    const requiredConnectionList = Object.freeze([...new Set(connectionIds)]);
    const requiredGateList = Object.freeze(requiredGates);
    const dimension = String(options.dimension || manifest?.metadata?.factoryDimension || manifest?.functionalLevel || tool?.functionalLevel || 'space');
    const structuralLevel = Number(options.structuralLevel ?? manifest?.metadata?.factoryStructuralLevel ?? manifest?.structure?.level ?? 0);
    const record = Object.freeze({
      id,
      name:String(options.name || manifest?.name || tool?.name || id),
      source:String(options.source || manifest?.metadata?.family || 'resident'),
      address,
      dimension,
      structuralLevel,
      capabilities,
      roles,
      availability:options.availability || (connectionIds.length ? 'connection' : 'resident'),
      requiredConnections:requiredConnectionList,
      requiredGates:requiredGateList,
      persistent:options.persistent !== false,
      provenance:Object.freeze([...(options.provenance || [])]),
      genome:Object.freeze({
        address:address ? clone(address) : null,
        dimension,
        structuralLevel,
        capabilities:[...capabilities],
        requiredConnections:[...requiredConnectionList],
        requiredGates:[...requiredGateList],
        roles:[...roles],
      }),
      metadata:Object.freeze(clone(options.metadata || manifest?.metadata || {})),
    });
    this.tools.set(id, record);
    this.events.push(Object.freeze({ type:'tool-register', toolId:id, gate:address?.gate ?? null, availability:record.availability }));
    return record;
  }

  registerResidentMesh(mesh = this.atoMesh) {
    if (!mesh?.automatons) return [];
    const registered = [];
    for (const tool of mesh.automatons.values()) {
      const manifest = manifestOf(tool);
      const existing = this.tools.get(tool.id);
      if (existing) {
        const enriched = Object.freeze({
          ...existing,
          address: existing.address || normalizeAddress(manifest?.address || tool.address),
          dimension: existing.dimension || manifest?.functionalLevel || tool.functionalLevel || 'space',
          capabilities:Object.freeze([...new Set([...existing.capabilities, ...toolCapabilities(tool,manifest)])].sort()),
          metadata:Object.freeze({ ...existing.metadata, ...(manifest?.metadata || {}), liveATO:true }),
        });
        this.tools.set(existing.id,enriched);
        registered.push(enriched);
      } else {
        registered.push(this.registerTool(tool, { source:'ato', availability:'resident' }));
      }
    }
    return registered;
  }

  registerStateSpaceTools(stateSpace = this.stateSpace) {
    if (!stateSpace?.listTools) return [];
    const registered = [];
    for (const descriptor of stateSpace.listTools()) {
      const existing = this.tools.get(descriptor.id);
      if (existing) {
        const merged = Object.freeze({
          ...existing,
          address: existing.address || normalizeAddress({ gate:descriptor.gate, line:1, color:1, tone:1, base:1 }),
          dimension: descriptor.dimension || existing.dimension,
          capabilities:Object.freeze([...new Set([...existing.capabilities, ...(descriptor.capabilities || [])])].sort()),
          metadata:Object.freeze({ ...existing.metadata, automatonForm:descriptor.automatonForm, stateSpace:true }),
        });
        this.tools.set(existing.id, merged);
        registered.push(merged);
      } else {
        registered.push(this.registerTool({ id:descriptor.id, name:descriptor.id, address:{ gate:descriptor.gate, line:1, color:1, tone:1, base:1 } }, {
          source:'state-space', dimension:descriptor.dimension, capabilities:descriptor.capabilities, metadata:{ automatonForm:descriptor.automatonForm, stateSpace:true }
        }));
      }
    }
    return registered;
  }

  observeConnection(a, b, metadata = {}) {
    if (!validGate(a) || !validGate(b)) throw new TypeError('CONNECTION_GATES_MUST_BE_1_TO_64');
    const id = canonicalConnection(a,b);
    const previous = this.connections.get(id);
    const record = Object.freeze({
      id,
      gates:Object.freeze([Math.min(Number(a),Number(b)),Math.max(Number(a),Number(b))]),
      active:metadata.active !== false,
      observations:(previous?.observations || 0) + 1,
      evidence:Object.freeze([...(previous?.evidence || []), ...(metadata.evidence || [])]),
      metadata:Object.freeze({ ...(previous?.metadata || {}), ...clone(metadata.metadata || {}) }),
    });
    this.connections.set(id, record);
    this.events.push(Object.freeze({ type:'connection-observed', connectionId:id, active:record.active }));
    return record;
  }

  setConnectionActive(id, active = true) {
    const previous = this.connections.get(String(id));
    if (!previous) return false;
    this.connections.set(previous.id, Object.freeze({ ...previous, active:Boolean(active) }));
    this.events.push(Object.freeze({ type:active?'connection-active':'connection-inactive', connectionId:previous.id }));
    return true;
  }

  async emergeFromConnection({ sourceGate, targetGate, purpose, input = purpose, dimension = 'Space', level = 6, roles = ['agent','user'], provenance = [] } = {}) {
    if (!this.factoryBridge) throw new Error('TOOL_FACTORY_BRIDGE_UNAVAILABLE');
    const connectionId = canonicalConnection(sourceGate,targetGate);
    this.observeConnection(sourceGate,targetGate,{ active:true, evidence:provenance });
    const result = this.factoryBridge.generateAndMount({ purpose, input, dimension, level, gate:Number(sourceGate), targetGate:Number(targetGate) });
    if (!result?.automaton) return result;
    const record = this.registerTool(result.automaton, {
      source:'tool-factory',
      roles,
      availability:'connection',
      requiredConnections:[connectionId],
      requiredGates:[Number(sourceGate),Number(targetGate)],
      capabilities:[connectionId],
      provenance,
      metadata:{ generationStatus:result.generationStatus, arisenThrough:'connection', connectionId },
    });
    return Object.freeze({ ...result, fieldTool:record, connectionId });
  }

  registerMCPTool(descriptor, invoke = null) {
    if (!this.mcpMesh) throw new Error('MCP_TOOL_MESH_UNAVAILABLE');
    const mcp = this.mcpMesh.register(descriptor, invoke);
    return this.registerTool({ id:mcp.id, name:mcp.name, address:mcp.address }, {
      source:'mcp', capabilities:mcp.capabilities, roles:mcp.roles,
      availability:'mcp', requiredConnections:mcp.connectionId ? [`mcp:${mcp.connectionId}`] : [],
      metadata:{ ...mcp.metadata, connectionId:mcp.connectionId },
    });
  }

  registerProgram({ id, name = id, steps = [], roles = ['agent','user'], requiredConnections = [], metadata = {} } = {}) {
    if (!id) throw new TypeError('PROGRAM_ID_REQUIRED');
    if (!Array.isArray(steps) || !steps.length) throw new TypeError('PROGRAM_STEPS_REQUIRED');
    const record = Object.freeze({
      id:String(id), name:String(name),
      steps:Object.freeze(steps.map(step => typeof step === 'string' ? Object.freeze({ toolId:step }) : Object.freeze(clone(step)))),
      roles:Object.freeze([...roles]),
      requiredConnections:Object.freeze([...new Set(requiredConnections.map(String))]),
      metadata:Object.freeze(clone(metadata)), persistent:true,
    });
    this.programs.set(record.id, record);
    this.events.push(Object.freeze({ type:'program-register', programId:record.id, steps:record.steps.length }));
    return record;
  }

  #connectionAvailable(id, activeConnections) {
    if (String(id).startsWith('mcp:')) return this.mcpMesh?.isConnectionAvailable(String(id).slice(4)) === true;
    if (activeConnections.has(String(id))) return true;
    return this.connections.get(String(id))?.active === true;
  }

  isToolAvailable(toolOrId, context = this.current) {
    const tool = typeof toolOrId === 'string' ? this.tools.get(toolOrId) : toolOrId;
    if (!tool) return false;
    if (context.role && !tool.roles.includes(context.role)) return false;
    if (tool.source === 'mcp' && this.mcpMesh && !this.mcpMesh.isAvailable(tool.id)) return false;
    const activeConnections = new Set(context.connections || []);
    if (tool.requiredConnections.some(id => !this.#connectionAvailable(id, activeConnections))) return false;
    if (!tool.requiredConnections.length && tool.requiredGates.length) {
      const activeGates = new Set((context.activeGates || []).map(Number));
      if (validGate(context.gate)) activeGates.add(Number(context.gate));
      if (activeGates.size && !tool.requiredGates.every(gate => activeGates.has(gate))) return false;
    }
    return true;
  }

  isToolActive(toolOrId, context = this.current) {
    const tool = typeof toolOrId === 'string' ? this.tools.get(toolOrId) : toolOrId;
    if (!this.isToolAvailable(tool, context)) return false;
    const activeGates = new Set((context.activeGates || []).map(Number).filter(validGate));
    if (validGate(context.gate)) activeGates.add(Number(context.gate));
    // No focal Gate means "show me the available repertoire" rather than a
    // state activation query.
    if (!activeGates.size || !tool.address?.gate) return true;
    if (activeGates.has(Number(tool.address.gate))) return true;
    const activeConnections = new Set(context.connections || []);
    for (const id of activeConnections) {
      if (String(id).startsWith('mcp:')) continue;
      const gates = String(id).split('-').map(Number);
      if (gates.includes(Number(tool.address.gate)) && gates.some(gate => activeGates.has(gate))) return true;
    }
    // Connection-born tools are the expression of their required connection;
    // a live required connection is sufficient even if the focal cursor is on
    // only one end of the channel.
    if (tool.requiredConnections.length) return tool.requiredConnections.every(id => this.#connectionAvailable(id,activeConnections));
    return false;
  }

  activate({ address = null, gate = address?.gate, activeGates = [], connections = [], role = 'agent' } = {}) {
    const current = Object.freeze({
      gate:validGate(gate) ? Number(gate) : null,
      activeGates:Object.freeze([...new Set([...(activeGates || []).map(Number).filter(validGate), ...(validGate(gate)?[Number(gate)]:[])])]),
      connections:Object.freeze([...new Set(connections.map(String))]),
      role,
    });
    this.current = current;
    const tools = [...this.tools.values()].filter(tool => this.isToolActive(tool,current));
    const programs = [...this.programs.values()].filter(program => this.isProgramActive(program,current));
    return Object.freeze({ context:current, tools:Object.freeze(tools), programs:Object.freeze(programs) });
  }

  isProgramActive(programOrId, context = this.current) {
    const program = typeof programOrId === 'string' ? this.programs.get(programOrId) : programOrId;
    if (!program) return false;
    if (context.role && !program.roles.includes(context.role)) return false;
    const activeConnections = new Set(context.connections || []);
    if (program.requiredConnections.some(id => !this.#connectionAvailable(id,activeConnections))) return false;
    return program.steps.every(step => this.isToolActive(step.toolId,context));
  }

  list({ activeOnly = false, role = null, gate = null } = {}) {
    let values = [...this.tools.values()];
    if (activeOnly) values = values.filter(tool => this.isToolActive(tool, { ...this.current, role:role || this.current.role, gate:gate ?? this.current.gate }));
    else {
      if (role) values = values.filter(tool => tool.roles.includes(role));
      if (validGate(gate)) values = values.filter(tool => tool.address?.gate === Number(gate));
    }
    return values;
  }

  listByGate(gate) { return this.list({ gate }); }

  async execute(toolId, input, context = {}) {
    const tool = this.tools.get(String(toolId));
    if (!tool) return Object.freeze({ ok:false, status:'unavailable', reason:'TOOL_NOT_REGISTERED', toolId:String(toolId) });
    const activation = this.activate({ ...this.current, ...context });
    if (!activation.tools.some(candidate => candidate.id === tool.id)) {
      return Object.freeze({ ok:false, status:'inactive', reason:'REQUIRED_CONNECTION_OR_ROLE_UNAVAILABLE', toolId:tool.id });
    }
    if (tool.source === 'mcp') return this.mcpMesh.execute(tool.id,input,context);
    const executable = this.atoMesh?.automatons?.get(tool.id);
    if (executable?.call) {
      try { return Object.freeze({ ok:true, status:'complete', toolId:tool.id, output:await executable.call(input,{toolField:this,...context}) }); }
      catch (error) { return Object.freeze({ ok:false, status:'failed', toolId:tool.id, reason:error?.message || String(error) }); }
    }
    const stateTool = this.stateSpace?.toolsById?.get?.(tool.id);
    if (stateTool?.run) {
      try { return Object.freeze({ ok:true, status:'complete', toolId:tool.id, output:stateTool.run(input,context) }); }
      catch (error) { return Object.freeze({ ok:false, status:'failed', toolId:tool.id, reason:error?.message || String(error) }); }
    }
    return Object.freeze({ ok:false, status:'unavailable', reason:'TOOL_EXECUTOR_NOT_MOUNTED', toolId:tool.id });
  }

  async runProgram(programId, input, context = {}) {
    const program = this.programs.get(String(programId));
    if (!program) return Object.freeze({ ok:false, status:'unavailable', reason:'PROGRAM_NOT_REGISTERED', programId:String(programId) });
    const activation = this.activate({ ...this.current, ...context });
    if (!this.isProgramActive(program, activation.context)) return Object.freeze({ ok:false, status:'inactive', reason:'PROGRAM_REQUIREMENTS_UNAVAILABLE', programId:program.id });
    let value = input;
    const trace = [];
    for (const step of program.steps) {
      const result = await this.execute(step.toolId, value, { ...activation.context, ...(step.context || {}) });
      trace.push(Object.freeze({ toolId:step.toolId, result }));
      if (!result.ok) return Object.freeze({ ok:false, status:'failed', programId:program.id, trace:Object.freeze(trace) });
      value = step.select ? result.output?.[step.select] : result.output;
    }
    return Object.freeze({ ok:true, status:'complete', programId:program.id, output:value, trace:Object.freeze(trace) });
  }

  snapshot() {
    return Object.freeze({
      schema:'synthia-state-tool-field/1',
      tools:[...this.tools.values()].filter(tool => tool.persistent).map(clone),
      programs:[...this.programs.values()].map(clone),
      connections:[...this.connections.values()].map(clone),
      current:clone(this.current),
      events:this.events.map(clone),
    });
  }

  restore(snapshot) {
    if (!snapshot) return this;
    const rememberedTools = new Map((snapshot.tools || []).map(tool => [tool.id,Object.freeze(clone(tool))]));
    // Rebind any live ATO/state-space tools to their remembered genomes while
    // retaining remembered connection-born tools even if temporarily offline.
    this.tools = rememberedTools;
    this.programs = new Map((snapshot.programs || []).map(program => [program.id,Object.freeze(clone(program))]));
    this.connections = new Map((snapshot.connections || []).map(connection => [connection.id,Object.freeze(clone(connection))]));
    this.current = Object.freeze(clone(snapshot.current || { gate:null,activeGates:[],connections:[],role:'agent' }));
    this.events = (snapshot.events || []).map(event => Object.freeze(clone(event)));
    this.registerResidentMesh(this.atoMesh);
    this.registerStateSpaceTools(this.stateSpace);
    return this;
  }
}

export { canonicalConnection };
export default StateToolField;
