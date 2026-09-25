const MCP_HUB = new URL('../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/runtime/MCPHub.js', import.meta.url).href;
const BROWSER = new URL('../donors/recovered/synthai-r21.22-self-cultivation-graph-integrated/runtime/effectors/browser.mjs', import.meta.url).href;

export class AdminCenter {
  constructor({ computer, resident, buildIntake } = {}) {
    if (!computer || !resident || !buildIntake) throw new Error('AdminCenter requires computer, resident, and buildIntake');
    this.computer = computer;
    this.resident = resident;
    this.buildIntake = buildIntake;
    this.mcp = null;
    this.browserModule = null;
  }

  async boot() {
    if (this.mcp) return this;
    const { MCPHub } = await import(MCP_HUB);
    this.mcp = new MCPHub({ maxParallel: 4 });
    this.mcp.registerProvider({
      id: 'synthia-resident',
      capabilities: ['chat', 'tool-factory', 'build-intake', 'state-space'],
      execute: async task => {
        if (task.capability === 'chat') return { success: true, output: await this.resident.chat(task.input?.text ?? task.input ?? '', task.context ?? {}) };
        if (task.capability === 'tool-factory') return { success: true, output: await this.resident.growTool(task.input ?? {}) };
        if (task.capability === 'build-intake') return { success: true, output: await this.buildIntake.receive(task.input ?? {}) };
        if (task.capability === 'state-space') return { success: true, output: await this.computer.resolveState(task.input?.entity ?? {}, task.input?.event ?? null, task.input?.context ?? {}) };
        return { success: false, error: `unsupported resident capability: ${task.capability}` };
      },
    });
    return this;
  }

  async createBrowserExecutor(options = {}) {
    if (!this.browserModule) this.browserModule = await import(BROWSER);
    return new this.browserModule.ChromeDevToolsBrowserExecutor(options);
  }

  async run(task, context = {}) {
    await this.boot();
    return this.mcp.runTask(task, context);
  }

  async runProject(project, context = {}) {
    await this.boot();
    return this.mcp.runProject(project, context);
  }

  snapshot() {
    return {
      id: 'synthia-admin-center',
      status: this.mcp ? 'ready' : 'created',
      resident: this.resident.snapshot(),
      browser: this.resident.browserSurface(),
      registrations: this.computer.autoRegistrar?.list?.() ?? [],
      mcp: this.mcp?.snapshot?.() ?? { providers: [], evidence: [], audit: [] },
    };
  }
}

export default AdminCenter;
