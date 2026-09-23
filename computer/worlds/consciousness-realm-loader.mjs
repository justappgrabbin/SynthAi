import { ConsciousnessRealmAdapter } from './adapters/consciousness-realm.mjs';

const defaultImporter = specifier => import(specifier);

export class ConsciousnessRealmPackageLoader {
  constructor({ computer, importModule = defaultImporter, bus = null } = {}) {
    if (!computer?.worldFederation || !computer?.residents || !computer?.meshKernel) {
      throw new TypeError('ConsciousnessRealmPackageLoader requires mesh-first Computer runtime');
    }
    Object.assign(this, { computer, importModule, bus: bus ?? computer.bus });
    this.mountRecord = null;
  }

  async mountInstalledPackage({
    sourcePath,
    sourceHash,
    worldId = 'reality:consciousness-realm',
    target = 'termux',
  } = {}) {
    if (!sourcePath || !sourceHash) throw new Error('installed Realm package requires sourcePath and sourceHash');
    return this.mount({
      worldId,
      compileSpec: {
        id: 'consciousness-realm:agent-life-engine',
        target,
        sourceHash,
        sourcePath,
        sourceExtension: 'ts',
        outputExtension: 'mjs',
        steps: [{
          argv: ['esbuild','{input}','--bundle','--platform=node','--format=esm','--outfile={output}'],
        }],
      },
    });
  }

  async mount({
    module = null,
    moduleSpecifier = null,
    compileSpec = null,
    worldId = 'reality:consciousness-realm',
  } = {}) {
    let artifact = null;
    if (!module && compileSpec) {
      artifact = await this.computer.ensureCompiled(compileSpec);
      moduleSpecifier = artifact.artifactRef;
    }
    if (!module) {
      if (!moduleSpecifier) throw new Error('Consciousness Realm mount requires module, moduleSpecifier, or compileSpec');
      module = await this.importModule(moduleSpecifier);
    }
    const AgentLifeEngine = module?.AgentLifeEngine;
    if (typeof AgentLifeEngine !== 'function') throw new Error('Consciousness Realm package does not export AgentLifeEngine');

    const engine = new AgentLifeEngine();
    const adapter = new ConsciousnessRealmAdapter({ engine, bus:this.bus, id:worldId });
    await this.computer.worldFederation.bind(worldId, adapter);
    await this.computer.registerReality(worldId, adapter, {
      kind:'home-reality',
      capabilities:this.computer.worldFederation.layer(worldId)?.capabilities ?? [],
      publicState:{ name:'Consciousness Realm', bound:true },
      metadata:{
        package:'ConsciousnessRealm',
        donor:'attached_assets/AgentLifeEngine_1777724026235.ts',
        canonicalIdentityRequired:true,
        randomBirthChartBypassed:true,
      },
    });

    this.mountRecord = { worldId, engine, adapter, artifact, moduleSpecifier };
    this.bus?.emit('consciousness-realm:mounted', {
      worldId,
      moduleSpecifier,
      compiled:Boolean(artifact),
      randomBirthChartBypassed:true,
    });
    return this.mountRecord;
  }

  get() { return this.mountRecord; }

  async attachResident(residentId = 'synthia') {
    if (!this.mountRecord) throw new Error('Consciousness Realm not mounted');
    return this.computer.enterReality(residentId, this.mountRecord.worldId);
  }
}

export default ConsciousnessRealmPackageLoader;
