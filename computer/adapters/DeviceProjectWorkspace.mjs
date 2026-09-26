/** The same project view can open older browser projects and on-device Computer projects. */
export class DeviceProjectWorkspace {
  constructor({ runtime } = {}) {
    if (!runtime?.projects) throw new Error('browser Computer runtime required');
    this.runtime = runtime;
    this.browser = runtime.projects;
    this.device = new Map();
    this.ready = false;
  }

  get backend() {
    return this.ready ? this.runtime.requireLocalBackend() : null;
  }

  async attach() {
    this.ready = false;
    const projects = await this.runtime.requireLocalBackend().rpc('project.list');
    this.device = new Map(projects.map(project => [project.id, project]));
    this.ready = true;
    return projects;
  }

  detach() {
    this.ready = false;
  }

  source(id) {
    if (this.device.has(id)) return 'device';
    if (this.browser.get(id)) return 'browser';
    return null;
  }

  get(id) {
    return this.device.get(id) || this.browser.get(id);
  }

  list() {
    return [...this.device.values(), ...this.browser.list().filter(p => !this.device.has(p.id))]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async create(input) {
    if (!this.backend) return this.browser.create(input);
    const project = await this.backend.rpc('project.create', input);
    this.device.set(project.id, project);
    return project;
  }

  async writeFile(id, path, content, options) {
    if (this.device.has(id)) {
      const file = await this.runtime.requireLocalBackend().rpc('project.writeFile', id, path, content, options);
      const project = this.device.get(id);
      project.files[file.path] = { ...file, content: undefined };
      project.updatedAt = Date.now();
      return file;
    }
    return this.browser.writeFile(id, path, content, options);
  }

  async readFile(id, path) {
    if (this.device.has(id)) return this.runtime.requireLocalBackend().rpc('project.readFile', id, path);
    return this.browser.readFile(id, path);
  }

  async listFiles(id) {
    if (this.device.has(id)) return this.runtime.requireLocalBackend().rpc('project.listFiles', id);
    return this.browser.listFiles(id);
  }

  async publish(id, options = {}) {
    if (!this.device.has(id)) return this.browser.publish(id, options);
    const project = await this.runtime.requireLocalBackend().rpc('project.snapshot', id);
    const result = await this.runtime.backends.request(options.backend || 'github', {
      action: 'create-project', project, private: Boolean(options.private)
    });
    const updated = await this.runtime.requireLocalBackend().rpc('project.recordPublication', id, options.backend || 'github', result);
    this.device.set(id, updated);
    return result;
  }
}
