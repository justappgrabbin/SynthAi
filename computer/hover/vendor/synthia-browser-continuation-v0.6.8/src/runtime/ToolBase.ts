import { EventMesh } from './EventMesh.js';

/** Shared base class the original organ files referenced but the archive lacked. */
export abstract class ToolBase {
  protected mesh: EventMesh;
  readonly name: string;
  readonly channel: string;

  constructor(mesh: EventMesh, name: string, channel: string) {
    this.mesh = mesh;
    this.name = name;
    this.channel = channel;
  }

  abstract run(input?: any): any;

  /** Portable diagnostic/codegen description; organs may override later. */
  codegen(): string {
    return [
      `// ${this.name}`,
      `// channel: ${this.channel}`,
      `// generated from live organ ${this.constructor.name}`,
      `export const organ = ${JSON.stringify({ name: this.name, channel: this.channel }, null, 2)};`,
    ].join('\n');
  }
}

export default ToolBase;
