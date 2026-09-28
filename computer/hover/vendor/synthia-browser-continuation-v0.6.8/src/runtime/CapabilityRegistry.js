class CapabilityRegistry {
  capabilities = /* @__PURE__ */ new Map();
  register(capability) {
    this.capabilities.set(capability, (this.capabilities.get(capability) || 0) + 1);
  }
  unregister(capability) {
    const count = this.capabilities.get(capability) || 0;
    if (count <= 1) this.capabilities.delete(capability);
    else this.capabilities.set(capability, count - 1);
  }
  has(capability) {
    return this.capabilities.has(capability);
  }
  getAll() {
    return Array.from(this.capabilities.keys());
  }
}
var stdin_default = CapabilityRegistry;
export {
  CapabilityRegistry,
  stdin_default as default
};
