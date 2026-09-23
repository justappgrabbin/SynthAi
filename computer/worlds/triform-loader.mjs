import { TriformWorldAdapter } from './adapters/triform.mjs';

const defaultImporter = specifier => import(specifier);

export class TriformPackageLoader {
  constructor({ computer, importModule = defaultImporter, bus = null } = {}) {
    if (!computer?.worldFederation || !computer?.meshKernel) throw new TypeError('TriformPackageLoader requires mesh-first Computer runtime');
    Object.assign(this,{computer,importModule,bus:bus??computer.bus});
    this.mountRecord=null;
  }

  async mountInstalledPackage({
    sourcePath,
    sourceHash,
    characters = [],
    worldId = 'lab:triform',
    target = 'termux',
  } = {}) {
    if (!sourcePath || !sourceHash) throw new Error('installed Triform package requires sourcePath and sourceHash');
    return this.mount({
      worldId,
      characters,
      compileSpec:{
        id:'triform:shared-world',
        target,
        sourceHash,
        sourcePath,
        sourceExtension:'ts',
        outputExtension:'mjs',
        steps:[{argv:['esbuild','{input}','--bundle','--platform=node','--format=esm','--outfile={output}']}],
      },
    });
  }

  async mount({
    module = null,
    moduleSpecifier = null,
    compileSpec = null,
    characters = [],
    initialState = null,
    worldId = 'lab:triform',
  } = {}) {
    let artifact=null;
    if(!module && compileSpec){
      artifact=await this.computer.ensureCompiled(compileSpec);
      moduleSpecifier=artifact.artifactRef;
    }
    if(!module){
      if(!moduleSpecifier) throw new Error('Triform mount requires module, moduleSpecifier, or compileSpec');
      module=await this.importModule(moduleSpecifier);
    }
    for(const name of ['createWorldState','applyWorldConsequence']){
      if(typeof module?.[name]!=='function') throw new Error(`Triform package missing ${name}`);
    }

    const adapter=new TriformWorldAdapter({worldModule:module,characters,initialState,id:worldId});
    await this.computer.worldFederation.bind(worldId,adapter);
    this.mountRecord={worldId,module,adapter,artifact,moduleSpecifier};
    this.bus?.emit('triform:mounted',{worldId,moduleSpecifier,compiled:Boolean(artifact)});
    return this.mountRecord;
  }

  get(){return this.mountRecord;}
}

export default TriformPackageLoader;
