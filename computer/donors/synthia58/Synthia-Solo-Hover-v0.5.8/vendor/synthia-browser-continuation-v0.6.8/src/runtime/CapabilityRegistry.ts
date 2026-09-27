import { CapabilityId } from './foundations';

/** Capability registry with reference counts so upgraded/rejected tools can be
 * removed without falsely deleting a capability still supplied elsewhere. */
export class CapabilityRegistry {
  private capabilities: Map<CapabilityId, number> = new Map();

  register(capability: CapabilityId): void {
    this.capabilities.set(capability, (this.capabilities.get(capability) || 0) + 1);
  }

  unregister(capability: CapabilityId): void {
    const count = this.capabilities.get(capability) || 0;
    if (count <= 1) this.capabilities.delete(capability);
    else this.capabilities.set(capability, count - 1);
  }

  has(capability: CapabilityId): boolean {
    return this.capabilities.has(capability);
  }

  getAll(): CapabilityId[] {
    return Array.from(this.capabilities.keys());
  }
}

export default CapabilityRegistry;
