/* Complete-source acquisition and recursive construction. Existing engines remain intact. */
const encoder = new TextEncoder();
export const canonical = x => JSON.stringify(x, (_key, value) => {
  if (typeof value === 'number' && !Number.isFinite(value)) throw Error('Contract values must be finite JSON numbers');
  if (['undefined','bigint','function','symbol'].includes(typeof value)) throw Error('Contract values must be JSON');
  if(value && typeof value === 'object' && !Array.isArray(value)) {
    if(Object.prototype.toString.call(value)!=='[object Object]')throw Error('Contract values must be plain JSON objects or arrays');
    return Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]]));
  }
  return value;
});
export async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(canonical(value)))), b => b.toString(16).padStart(2, '0')).join('');
}
export function pathName(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.split('/').some(x => !x || x === '..' || x === '.')) throw Error('Unsafe module path: ' + path);
  return path;
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
export function inspectSource(parser, path, source) {
  const ast = parser.parse(source, {ecmaVersion:'latest', sourceType:'module', locations:true, allowHashBang:true});
  const imports = [], declarations = [], calls = [], exports = [];
  let commonjs = /\.cjs$/.test(path);
  walk(ast, n => {
    if (['FunctionDeclaration','ClassDeclaration','VariableDeclarator'].includes(n.type) && n.id?.name)
      declarations.push({name:n.id.name,kind:n.type,line:n.loc.start.line});
    if (n.type === 'CallExpression') {
      calls.push({name:source.slice(n.callee.start,n.callee.end),line:n.loc.start.line});
      if (n.callee.type === 'Identifier' && n.callee.name === 'require') {
        commonjs = true;
        if (n.arguments.length !== 1 || typeof n.arguments[0].value !== 'string') throw Error('Dynamic require needs an explicit adapter: ' + path);
        imports.push({specifier:n.arguments[0].value,start:n.arguments[0].start,end:n.arguments[0].end,kind:'require'});
      }
    }
    if (['ImportDeclaration','ExportAllDeclaration','ExportNamedDeclaration'].includes(n.type) && n.source)
      imports.push({specifier:n.source.value,start:n.source.start,end:n.source.end,kind:'import'});
    if (n.type === 'ImportExpression') {
      if (typeof n.source.value !== 'string') throw Error('Dynamic import needs a literal module path: ' + path);
      imports.push({specifier:n.source.value,start:n.source.start,end:n.source.end,kind:'import'});
    }
    if (n.type === 'ExportDefaultDeclaration') exports.push('default');
    if (n.type === 'ExportNamedDeclaration') {
      if (n.declaration?.id) exports.push(n.declaration.id.name);
      for (const d of n.declaration?.declarations || []) if(d.id.name) exports.push(d.id.name);
      for (const s of n.specifiers || []) exports.push(s.exported.name ?? s.exported.value);
    }
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && ['module','exports'].includes(n.object.name)) commonjs = true;
    if (n.type === 'MetaProperty') throw Error('import.meta needs a file/environment adapter: ' + path);
  });
  if (commonjs && exports.length) throw Error('Mixed CommonJS and ESM needs an adapter: ' + path);
  return {path,bytes:encoder.encode(source).length,imports,declarations,calls,exports:commonjs?['default (CommonJS exports object)']:exports,format:commonjs?'commonjs':'esm',
    interpretation:'Structural evidence only. Behavior is established separately by executed contracts.'};
}
function localPath(from, specifier, files, importMap = {}) {
  if (!specifier.startsWith('.')) {
    if(Object.hasOwn(files,specifier))return specifier;
    const key=Object.keys(importMap).filter(k=>k===specifier||(k.endsWith('/')&&specifier.startsWith(k))).sort((a,b)=>b.length-a.length)[0];
    if(key){const target=importMap[key]+(key.endsWith('/')?specifier.slice(key.length):'');pathName(target);if(Object.hasOwn(files,target))return target;throw Error('Import-map target missing: '+target);}
    throw Error('Unresolved dependency: ' + specifier + ' from ' + from);
  }
  const parts = from.split('/'); parts.pop();
  for (const piece of specifier.split('/')) {
    if (piece === '..') { if (!parts.length) throw Error('Dependency escapes project: ' + specifier); parts.pop(); }
    else if (piece && piece !== '.') parts.push(piece);
  }
  const base = parts.join('/');
  const found = [base, base+'.js', base+'.mjs', base+'.cjs', base+'/index.js'].filter(p => Object.hasOwn(files,p));
  if (!found.length) throw Error('Missing dependency: ' + specifier + ' from ' + from);
  return found[0];
}
export async function graph(parser, files, entry, resolveCapability, importMap = {}) {
  pathName(entry);
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw Error('Supply a path-to-source file map');
  for (const [p,s] of Object.entries(files)) {pathName(p);if(typeof s !== 'string')throw Error('Source must be text: '+p);}
  const modules = {}, imported = new Map(), parents = [];
  async function acquireAlias(name) {
    if(imported.has(name))return imported.get(name);
    const artifact = await resolveCapability(name);
    await checkArtifact(artifact);
    const prefix = artifact.digest + '/';
    for (const [id,m] of Object.entries(artifact.modules)) modules[prefix+id] = {...m,deps:Object.fromEntries(Object.entries(m.deps).map(([s,t])=>[s,prefix+t]))};
    imported.set(name,prefix+artifact.entry);
    parents.push({name,digest:artifact.digest});
    return prefix+artifact.entry;
  }
  async function visit(path) {
    const id = 'project/'+path;
    if(Object.hasOwn(modules,id))return id;
    if(!Object.hasOwn(files,path))throw Error('Missing entry: '+path);
    const source=files[path], inspection=inspectSource(parser,path,source);
    const record={path,source,format:inspection.format,imports:inspection.imports,deps:{},inspection};
    modules[id]=record;
    for(const item of inspection.imports) {
      const target=item.specifier.startsWith('@cap/')?await acquireAlias(item.specifier.slice(5)):await visit(localPath(path,item.specifier,files,importMap));
      record.deps[item.specifier]=target;
    }
    return id;
  }
  const root=await visit(entry);
  return {entry:root,modules,parents,originalFiles:files,importMap};
}
export async function checkArtifact(artifact) {
  if(!artifact || artifact.schema!=='independent-executable/v1')throw Error('Invalid executable artifact');
  const {digest:expected,...body}=artifact;
  if(await digest(body)!==expected)throw Error('Artifact integrity mismatch');
  return artifact;
}
export function moduleURL(artifact) {
  const urls=new Map(), active=new Set();
  function build(id) {
    if(urls.has(id))return urls.get(id);
    if(active.has(id))throw Error('Cyclic module graph needs an adapter: '+id);
    const record=artifact.modules[id]; if(!record)throw Error('Missing captured module: '+id);
    active.add(id);
    const dependencies=Object.fromEntries(Object.entries(record.deps).map(([s,target])=>[s,build(target)]));
    let source=record.source;
    if(record.format==='commonjs') {
      for(const imp of record.imports.filter(i=>i.kind==='import').sort((a,b)=>b.start-a.start))source=source.slice(0,imp.start)+JSON.stringify(dependencies[imp.specifier])+source.slice(imp.end);
      const names=Object.keys(dependencies);
      source=names.map((s,i)=>`import * as dependency${i} from ${JSON.stringify(dependencies[s])};`).join('\n')+
        '\nconst module={exports:{}};const exports=module.exports;\nconst dependencies={'+names.map((s,i)=>`${JSON.stringify(s)}:Object.hasOwn(dependency${i},'default')?dependency${i}.default:dependency${i}`).join(',')+'};\n'+
        'const require = name => {if(!Object.hasOwn(dependencies,name))throw Error("Unresolved require: "+name);return dependencies[name];};\n'+
        `(function(module,exports,require,__filename,__dirname){\n${source.replace(/^#![^\n]*/, '')}\n})(module,exports,require,${JSON.stringify(record.path)},${JSON.stringify(record.path.split('/').slice(0,-1).join('/'))});\nexport default module.exports;`;
    } else {
      for(const imp of [...record.imports].sort((a,b)=>b.start-a.start))source=source.slice(0,imp.start)+JSON.stringify(dependencies[imp.specifier])+source.slice(imp.end);
    }
    // Native ES modules execute full JavaScript, including closures, classes, promises and built-ins.
    const bytes=encoder.encode(source);
    let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const url='data:text/javascript;base64,'+btoa(binary);
    if(url.length>16*1024*1024)throw Error('Bundled module URL exceeds 16 MB; split the dependency graph');
    active.delete(id);urls.set(id,url);return url;
  }
  return build(artifact.entry);
}
export async function invoke(url, entry, invocation) {
  const namespace=await import(url);
  let callable=namespace;
  for(const name of entry.split('.')) {if(!Object.hasOwn(callable,name))throw Error('Export not found: '+entry);callable=callable[name];}
  if(typeof callable!=='function')throw Error('Selected export is not callable: '+entry);
  if(invocation.construct) {
    const instance=new callable(...(invocation.args||[])), results=[];
    for(const call of invocation.calls||[]) {
      if(typeof instance[call.method]!=='function')throw Error('Method not found: '+call.method);
      results.push(await instance[call.method](...(call.args||[])));
    }
    return results;
  }
  return await callable(...(invocation.args||[]));
}
export class Computer {
  constructor({parser,store,executor}) {this.parser=parser;this.store=store;this.executor=executor;}
  async inspect(files) {return Object.entries(files).map(([path,source])=>inspectSource(this.parser,path,source));}
  async build({name,description,files,entry,exportName='main',cases,holdouts=[],importMap={}}) {
    if(typeof name!=='string'||! /^[A-Za-z][\w.-]{0,100}$/.test(name)||['constructor','prototype'].includes(name)||!description?.trim())throw Error('Name and behavioral description are required');
    if(!Array.isArray(cases)||!cases.length||!Array.isArray(holdouts))throw Error('Verification examples are required');
    const captured=await graph(this.parser,files,entry,n=>this.store.get(n),importMap);
    const candidate={schema:'independent-executable/v1',name,description,exportName,...captured};
    const url=moduleURL(candidate), evidence=[];
    for(const [group,examples] of [['contract',cases],['holdout',holdouts]]) {
      for(const example of examples) {
        if(!example||!Object.hasOwn(example,'expected'))throw Error('Every example requires an expected result');
        const invocation=example.invocation||{args:example.args||[]};
        const actual=await this.executor({url,entry:exportName,invocation});
        const pass=canonical(actual)===canonical(example.expected);
        evidence.push({group,invocation,expected:example.expected,actual,pass});
        if(!pass)throw Error('Verification failed: '+canonical(evidence.at(-1)));
      }
    }
    const body={...candidate,cases,holdouts,evidence,status:'verified-on-recorded-examples'};
    const artifact={...body,digest:await digest(body)};
    await this.store.put(artifact);
    return artifact;
  }
  acquire(spec) {return this.build(spec);}
  construct(spec) {return this.build(spec);}
  async run(name,args=[],invocation=null) {
    const artifact=await checkArtifact(await this.store.get(name));
    const result=await this.executor({url:moduleURL(artifact),entry:artifact.exportName,invocation:invocation||{args}});
    canonical(result); // Never silently turn NaN/undefined into successful JSON output.
    return result;
  }
  async reverify(name) {
    const artifact=await checkArtifact(await this.store.get(name)),results=[];
    for(const example of [...artifact.cases,...artifact.holdouts]) {
      const actual=await this.run(name,[],example.invocation||{args:example.args||[]});
      results.push({actual,expected:example.expected,pass:canonical(actual)===canonical(example.expected)});
    }
    if(results.some(r=>!r.pass))throw Error('Persisted verification failed');
    return results;
  }
  async exportWorkspace(capability) {
    const state=await this.store.export();
    // The archive writer is an acquired implementation, not an algorithm in this kernel.
    return this.run(capability, [[{path:'computer-state.json',text:JSON.stringify(state)}]]);
  }
}
