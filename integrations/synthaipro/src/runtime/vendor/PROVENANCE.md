These unmodified JavaScript modules are copied from justappgrabbin/SynthAi,
commit d7b355707ab7d2ea72c7e72a1ad5e546d1b6e522:
- kernel.mjs: computer/core/kernel.mjs
- execution.mjs: computer/runtime/execution.mjs

The integration deliberately uses these browser-compatible modules rather than
ComputerRuntime.mjs, which imports Node-only services and a Python bridge.
