const clone = value => value == null ? value : structuredClone(value);

/**
 * MCPToolMesh
 * -----------
 * MCP is an outward tool/contact mesh, not Synthia's reasoning engine.
 * A tool is executable only when a real invoke function is connected.
 * Persisted descriptors survive restarts but remain unavailable until their
 * provider/connection is restored, preventing simulated-success behavior.
 */
export class MCPToolMesh {
  constructor() {
    this.tools = new Map();
    this.invokers = new Map();
    this.connections = new Map();
    this.events = [];
  }

  connect(id, metadata = {}) {
    if (!id) throw new TypeError('MCP_CONNECTION_ID_REQUIRED');
    const record = Object.freeze({ id:String(id), online:true, ...clone(metadata) });
    this.connections.set(record.id, record);
    this.events.push(Object.freeze({ type:'connection-up', id:record.id }));
    return record;
  }

  disconnect(id, reason = 'disconnected') {
    const previous = this.connections.get(String(id));
    if (!previous) return false;
    this.connections.set(String(id), Object.freeze({ ...previous, online:false, reason }));
    this.events.push(Object.freeze({ type:'connection-down', id:String(id), reason }));
    return true;
  }

  register(tool, invoke = null) {
    if (!tool?.id) throw new TypeError('MCP_TOOL_ID_REQUIRED');
    const descriptor = Object.freeze({
      id:String(tool.id),
      name:String(tool.name || tool.id),
      capabilities:Object.freeze([...(tool.capabilities || [])]),
      connectionId:tool.connectionId ? String(tool.connectionId) : null,
      address:tool.address ? clone(tool.address) : null,
      roles:Object.freeze([...(tool.roles || ['agent','user'])]),
      metadata:Object.freeze(clone(tool.metadata || {})),
    });
    this.tools.set(descriptor.id, descriptor);
    if (typeof invoke === 'function') this.invokers.set(descriptor.id, invoke);
    this.events.push(Object.freeze({ type:'tool-register', toolId:descriptor.id, connectionId:descriptor.connectionId }));
    return descriptor;
  }

  unregister(id) {
    this.invokers.delete(String(id));
    return this.tools.delete(String(id));
  }

  isConnectionAvailable(id) {
    if (!id) return true;
    return this.connections.get(String(id))?.online === true;
  }

  isAvailable(id) {
    const tool = this.tools.get(String(id));
    return Boolean(tool && this.invokers.has(tool.id) && this.isConnectionAvailable(tool.connectionId));
  }

  discover({ capability = null, role = null, onlyAvailable = true } = {}) {
    return [...this.tools.values()].filter(tool => {
      if (capability && !tool.capabilities.includes(capability)) return false;
      if (role && !tool.roles.includes(role)) return false;
      if (onlyAvailable && !this.isAvailable(tool.id)) return false;
      return true;
    });
  }

  async execute(id, input, context = {}) {
    const tool = this.tools.get(String(id));
    if (!tool) return Object.freeze({ ok:false, status:'unavailable', reason:'MCP_TOOL_NOT_FOUND', toolId:String(id) });
    if (!this.isConnectionAvailable(tool.connectionId)) {
      return Object.freeze({ ok:false, status:'unavailable', reason:'MCP_CONNECTION_OFFLINE', toolId:tool.id, connectionId:tool.connectionId });
    }
    const invoke = this.invokers.get(tool.id);
    if (!invoke) return Object.freeze({ ok:false, status:'unavailable', reason:'MCP_INVOKER_NOT_CONNECTED', toolId:tool.id });
    try {
      const output = await invoke(input, context);
      this.events.push(Object.freeze({ type:'tool-complete', toolId:tool.id }));
      return Object.freeze({ ok:true, status:'complete', toolId:tool.id, output });
    } catch (error) {
      const reason = error?.message || String(error);
      this.events.push(Object.freeze({ type:'tool-failed', toolId:tool.id, reason }));
      return Object.freeze({ ok:false, status:'failed', toolId:tool.id, reason });
    }
  }

  snapshot() {
    return Object.freeze({
      schema:'synthia-mcp-tool-mesh/1',
      tools:[...this.tools.values()].map(clone),
      connections:[...this.connections.values()].map(clone),
      events:this.events.map(clone),
    });
  }

  restore(snapshot) {
    if (!snapshot) return this;
    this.tools = new Map((snapshot.tools || []).map(tool => [tool.id, Object.freeze(clone(tool))]));
    this.connections = new Map((snapshot.connections || []).map(connection => [connection.id, Object.freeze({ ...clone(connection), online:false, reason:'provider-not-reconnected-after-restore' })]));
    this.events = (snapshot.events || []).map(event => Object.freeze(clone(event)));
    // Invokers are intentionally not persisted. Real providers must reconnect.
    this.invokers.clear();
    return this;
  }
}

export default MCPToolMesh;
