import { Synthia57ResidentAdapter } from './synthia57-resident.mjs';
import { Synthia57OrganBridge } from './synthia57-organ-bridge.mjs';

const defaultImporter = specifier => import(specifier);

function modulePath(base, relative) {
  const root = String(base ?? '').replace(/\/$/, '');
  return `${root}/${relative.replace(/^\//, '')}`;
}

export class Synthia57PackageLoader {
  constructor({ computer, importModule = defaultImporter, bus = null } = {}) {
    if (!computer?.meshKernel || !computer?.registerResident) {
      throw new TypeError('Synthia57PackageLoader requires a mesh-first Computer runtime');
    }
    Object.assign(this, { computer, importModule, bus: bus ?? computer.bus });
    this.mounts = new Map();
  }

  async mount({
    base,
    residentId = 'synthia',
    federatedModule = null,
    synthiaRuntimeModule = null,
    createOptions = {},
    birthMirror = null,
    publicState = { name: 'Synthia' },
    capabilities = ['resident.synthia57', 'world.observe', 'world.act', 'body.capability'],
  } = {}) {
    if (!base && (!federatedModule || !synthiaRuntimeModule)) {
      throw new Error('Synthia 5.7 mount requires base or explicit module specifiers');
    }
    const federatedSpec = federatedModule ?? modulePath(base, 'src/federated-synthia.mjs');
    const runtimeSpec = synthiaRuntimeModule ?? modulePath(base, 'vendor/pure-synthia-v0.4.0/src/synthia/synthiaRuntime.mjs');

    const [federated, baselineRuntime] = await Promise.all([
      this.importModule(federatedSpec),
      this.importModule(runtimeSpec),
    ]);
    const FederatedSynthia = federated?.FederatedSynthia;
    const embodiment = baselineRuntime?.embodiment;
    if (typeof FederatedSynthia?.create !== 'function') throw new Error('mounted package does not export FederatedSynthia.create');
    if (!embodiment?.body || typeof embodiment.bindHost !== 'function') throw new Error('mounted package does not expose canonical embodiment runtime');

    const runtime = await FederatedSynthia.create(createOptions);
    if (birthMirror) await runtime.configureBirthMirror(birthMirror);

    const adapter = new Synthia57ResidentAdapter({
      runtime,
      embodiment,
      mesh: this.computer.meshKernel,
      bus: this.bus,
      residentId,
    });

    await this.computer.registerResident(residentId, {
      runtime: adapter,
      publicState,
      capabilities,
      metadata: {
        package: 'synthia-integrated-automata',
        version: '0.5.7',
        federatedModule: federatedSpec,
        runtimeModule: runtimeSpec,
      },
    });
    await adapter.start();
    const organs = new Synthia57OrganBridge({ runtime, embodiment, mesh: this.computer.meshKernel, bus: this.bus, residentId });
    await organs.mount();

    if (this.computer.meshKernel.participant('computer:self')) {
      await this.computer.meshKernel.connect(residentId, 'computer:self', {
        type: 'resident-of',
        evidence: { runtime: 'synthia-5.7' },
      });
    }

    const record = { residentId, runtime, embodiment, adapter, organs, federatedSpec, runtimeSpec };
    this.mounts.set(String(residentId), record);
    this.bus?.emit('synthia57:mounted', { residentId, federatedSpec, runtimeSpec });
    return record;
  }

  get(residentId = 'synthia') { return this.mounts.get(String(residentId)) ?? null; }

  async unmount(residentId = 'synthia') {
    const mounted = this.get(residentId);
    if (!mounted) return false;
    mounted.adapter.stop();
    await mounted.organs?.unmount?.();
    await this.computer.residents.leaveWorld(residentId).catch(() => {});
    await this.computer.meshKernel.setResidency(residentId, 'offline');
    this.mounts.delete(String(residentId));
    this.bus?.emit('synthia57:unmounted', { residentId: String(residentId) });
    return true;
  }
}

export default Synthia57PackageLoader;
