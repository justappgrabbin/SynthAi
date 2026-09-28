import { point, line, circle, circleIntersections, distance, verifyConstraints } from '../geometry/GeometryKernel.mjs';
const OPERATIONS = new Set(['input','constant','get','object','array','add','subtract','multiply','divide','concat','equal','map','geometry-program','relation-program']);
const clone = value => structuredClone(value);

function validate(node, depth=0) {
  if (depth > 32) throw new Error('PLAN_DEPTH_LIMIT');
  if (!node || typeof node !== 'object' || !OPERATIONS.has(node.op)) throw new Error('UNKNOWN_PLAN_OPERATION');
  if (node.op === 'constant') return;
  if (node.op === 'input') return;
  if (node.op === 'geometry-program') { if(!Array.isArray(node.steps)||!node.steps.length)throw new Error('EMPTY_GEOMETRY_PROGRAM');return; }
  if (node.op === 'relation-program') { if(typeof node.predicate!=='string'||!node.predicate.trim())throw new Error('RELATION_PREDICATE_REQUIRED');if(node.maxDepth!==undefined&&(!Number.isInteger(node.maxDepth)||node.maxDepth<1||node.maxDepth>256))throw new Error('INVALID_RELATION_DEPTH');return; }
  if (node.op === 'get') { if (!Array.isArray(node.path) || node.path.some(x=>typeof x!=='string'&&typeof x!=='number')) throw new Error('INVALID_GET_PATH'); validate(node.from??{op:'input'},depth+1); return; }
  if (node.op === 'object') { if (!node.fields || typeof node.fields!=='object') throw new Error('INVALID_OBJECT_FIELDS');Object.values(node.fields).forEach(x=>validate(x,depth+1));return; }
  if (node.op === 'array') { if (!Array.isArray(node.items)) throw new Error('INVALID_ARRAY_ITEMS');node.items.forEach(x=>validate(x,depth+1));return; }
  if (node.op === 'map') { validate(node.from,depth+1);validate(node.each,depth+1);return; }
  validate(node.left,depth+1);validate(node.right,depth+1);
}

function execute(node,input,scope={}) {
  switch(node.op) {
    case 'input': return scope.item === undefined ? input : scope.item;
    case 'geometry-program': return executeGeometryProgram(node,input);
    case 'relation-program': return executeRelationProgram(node,input);
    case 'constant': return clone(node.value);
    case 'get': return node.path.reduce((value,key)=>value?.[key],execute(node.from??{op:'input'},input,scope));
    case 'object': return Object.fromEntries(Object.entries(node.fields).map(([key,value])=>[key,execute(value,input,scope)]));
    case 'array': return node.items.map(value=>execute(value,input,scope));
    case 'map': { const values=execute(node.from,input,scope);if(!Array.isArray(values))throw new TypeError('MAP_INPUT_MUST_BE_ARRAY');return values.map((item,index)=>execute(node.each,input,{...scope,item,index})); }
    case 'concat': return String(execute(node.left,input,scope))+String(execute(node.right,input,scope));
    case 'equal': return Object.is(execute(node.left,input,scope),execute(node.right,input,scope));
    case 'add': return Number(execute(node.left,input,scope))+Number(execute(node.right,input,scope));
    case 'subtract': return Number(execute(node.left,input,scope))-Number(execute(node.right,input,scope));
    case 'multiply': return Number(execute(node.left,input,scope))*Number(execute(node.right,input,scope));
    case 'divide': { const divisor=Number(execute(node.right,input,scope));if(divisor===0)throw new Error('DIVISION_BY_ZERO');return Number(execute(node.left,input,scope))/divisor; }
    default: throw new Error('UNKNOWN_PLAN_OPERATION');
  }
}

function executeRelationProgram(program,input){
  const predicate=program.predicate.trim().toLowerCase(),maxDepth=program.maxDepth??32,source=Array.isArray(input?.triples)?input.triples:[];
  const triples=source.map(item=>({subject:String(item?.subject??'').trim(),predicate:String(item?.predicate??'').trim().toLowerCase(),object:String(item?.object??'').trim()})).filter(item=>item.subject&&item.object&&item.predicate===predicate);
  const adjacency=new Map();for(const triple of triples){const values=adjacency.get(triple.subject)??[];if(!values.includes(triple.object))values.push(triple.object);adjacency.set(triple.subject,values);}
  const from=String(input?.query?.from??'').trim(),to=input?.query?.to===undefined?null:String(input.query.to).trim(),queue=from?[{node:from,path:[from]}]:[],visited=new Set(from?[from]:[]),paths=new Map(from?[[from,[from]]]:[]);
  while(queue.length){const current=queue.shift();if(current.path.length-1>=maxDepth)continue;for(const next of adjacency.get(current.node)??[]){if(visited.has(next))continue;const path=[...current.path,next];visited.add(next);paths.set(next,path);queue.push({node:next,path});}}
  const reachable=[...visited].filter(value=>value!==from),path=to?(paths.get(to)??[]):[],derived=[];for(const target of reachable){if(target!==from)derived.push(Object.freeze({subject:from,predicate,object:target,path:Object.freeze(paths.get(target)??[])}));}
  return Object.freeze({predicate,from,to,connected:to?paths.has(to):reachable.length>0,path:Object.freeze(path),reachable:Object.freeze(reachable),derived:Object.freeze(derived),sourceCount:triples.length});
}

function executeGeometryProgram(program,input){
  const values=new Map(),primitives=[];
  for(const [id,value] of Object.entries(input??{})){if(Number.isFinite(value?.x)&&Number.isFinite(value?.y)){const p=point(id,value.x,value.y);values.set(id,p);primitives.push(p);}else values.set(id,value);}
  const resolve=value=>typeof value==='string'&&values.has(value)?values.get(value):value;
  for(const step of program.steps){
    if(step.op==='distance'){values.set(step.as,distance(resolve(step.from),resolve(step.to)));continue;}
    if(step.op==='subtract'){values.set(step.as,Number(resolve(step.left))-Number(resolve(step.right)));continue;}
    if(step.op==='circle'){const value=circle(step.as,resolve(step.center),resolve(step.radius));values.set(step.as,value);primitives.push(value);continue;}
    if(step.op==='intersection'){const hits=circleIntersections(resolve(step.left),resolve(step.right));if(!hits.length)throw new Error('NO_GEOMETRY_INTERSECTION');const selected=step.select==='lower'?hits.reduce((a,b)=>a.y>b.y?a:b):hits.reduce((a,b)=>a.y<b.y?a:b);const value=point(step.as,selected.x,selected.y);values.set(step.as,value);primitives.push(value);continue;}
    if(step.op==='line'){const value=line(step.as,resolve(step.from),resolve(step.to));values.set(step.as,value);primitives.push(value);continue;}
    if(step.op==='extend'){const from=resolve(step.from),through=resolve(step.through),extra=Number(resolve(step.extra));const base=distance(from,through);if(base<=0||!Number.isFinite(extra)||extra<0)throw new Error('INVALID_LINE_EXTENSION');const value=point(step.as,through.x+((through.x-from.x)/base)*extra,through.y+((through.y-from.y)/base)*extra);values.set(step.as,value);primitives.push(value);if(step.lineAs){const segment=line(step.lineAs,through,value);values.set(step.lineAs,segment);primitives.push(segment);}continue;}
    if(step.op==='ray-at-distance'){const from=resolve(step.from),through=resolve(step.through),length=Number(resolve(step.distance)),base=distance(from,through);if(base<=0||!Number.isFinite(length)||length<0)throw new Error('INVALID_RAY_DISTANCE');const value=point(step.as,from.x+((through.x-from.x)/base)*length,from.y+((through.y-from.y)/base)*length);values.set(step.as,value);primitives.push(value);continue;}
    throw new Error(`UNSUPPORTED_GEOMETRY_STEP:${step.op}`);
  }
  const materialize=value=>{if(Array.isArray(value))return value.map(materialize);if(value&&typeof value==='object'){if(value.kind==='binding')return{kind:'value',value:Number(resolve(value.target))};return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,materialize(item)]));}return value;};
  const constraints=(program.constraints??[]).map(materialize);
  return Object.freeze({primitives:Object.freeze(primitives),constraints:Object.freeze(constraints),verification:verifyConstraints(primitives,constraints)});
}

export class DeclarativeOperatorCompiler {
  validate(plan) { validate(plan);return true; }
  compile(plan) { this.validate(plan);const sealed=clone(plan);return input=>execute(sealed,clone(input)); }
  artifact(plan) { this.validate(plan);return JSON.stringify({schema:'cynthia-operator-plan/1',plan:clone(plan)}); }
  parse(artifact) { const value=JSON.parse(artifact);if(value.schema!=='cynthia-operator-plan/1')throw new Error('INVALID_OPERATOR_PLAN_SCHEMA');this.validate(value.plan);return value.plan; }
}
