class CapabilityRegistry {
  capabilities = /* @__PURE__ */ new Set();
  register(capability) {
    this.capabilities.add(capability);
  }
  has(capability) {
    return this.capabilities.has(capability);
  }
  getAll() {
    return Array.from(this.capabilities);
  }
}
var stdin_default = CapabilityRegistry;
export {
  CapabilityRegistry,
  stdin_default as default
};
