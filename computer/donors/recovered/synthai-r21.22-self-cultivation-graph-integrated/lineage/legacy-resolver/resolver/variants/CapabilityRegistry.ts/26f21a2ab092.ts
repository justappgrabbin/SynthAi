import { CapabilityId } from './foundations';

export class CapabilityRegistry {
  private capabilities: Set<CapabilityId> = new Set();

  register(capability: CapabilityId): void {
    this.capabilities.add(capability);
  }

  has(capability: CapabilityId): boolean {
    return this.capabilities.has(capability);
  }

  getAll(): CapabilityId[] {
    return Array.from(this.capabilities);
  }
}

export default CapabilityRegistry;
