/** Shared base class the original organ files referenced but the archive lacked. */
export class ToolBase {
    mesh;
    name;
    channel;
    constructor(mesh, name, channel) {
        this.mesh = mesh;
        this.name = name;
        this.channel = channel;
    }
    /** Portable diagnostic/codegen description; organs may override later. */
    codegen() {
        return [
            `// ${this.name}`,
            `// channel: ${this.channel}`,
            `// generated from live organ ${this.constructor.name}`,
            `export const organ = ${JSON.stringify({ name: this.name, channel: this.channel }, null, 2)};`,
        ].join('\n');
    }
}
export default ToolBase;
