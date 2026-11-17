/* Derive callable tool shapes from verified invocation evidence, without inventing values. */
export function executionContracts(artifacts) {
  return artifacts.flatMap(artifact=>{
    const shapes=new Map();
    for(const test of [...artifact.cases,...(artifact.holdouts||[])]) {
      if(test.invocation?.construct)continue;
      const args=test.invocation?.args??test.args??[];
      if(!Array.isArray(args))continue;
      if(!shapes.has(args.length))shapes.set(args.length,{arity:args.length,example:args});
    }
    return [...shapes.values()].map(shape=>({name:artifact.name,description:artifact.description,...shape,
      inputs:Object.fromEntries(shape.example.map((value,i)=>['arg'+i,{example:value}]))}));
  });
}
export function executionSchema(contracts) {
  return contracts.map(contract=>({type:'object',properties:{cmd:{const:'execute'},args:{type:'object',
    properties:{name:{const:contract.name},inputs:{type:'object',properties:Object.fromEntries(Array.from({length:contract.arity},(_,i)=>['arg'+i,{}])),required:Array.from({length:contract.arity},(_,i)=>'arg'+i),additionalProperties:false}},
    required:['name','inputs'],additionalProperties:false}},required:['cmd','args'],additionalProperties:false}));
}
export function invocationArgs(command,contracts) {
  const candidates=contracts.filter(c=>c.name===command.name);
  if(!candidates.length)throw Error('No verified callable input contract for '+command.name);
  let args;
  if(Object.hasOwn(command,'inputs')) {
    if(!command.inputs||typeof command.inputs!=='object'||Array.isArray(command.inputs))throw Error('inputs must be a named argument object');
    const keys=Object.keys(command.inputs),shape=candidates.find(c=>c.arity===keys.length&&Array.from({length:c.arity},(_,i)=>'arg'+i).every(k=>Object.hasOwn(command.inputs,k)));
    if(!shape)throw Error('Required named inputs: '+candidates.map(c=>Object.keys(c.inputs).join(', ')||'(none)').join(' or '));
    args=Array.from({length:shape.arity},(_,i)=>command.inputs['arg'+i]);
  } else {
    args=command.args;
    if(!Array.isArray(args)||!candidates.some(c=>c.arity===args.length))throw Error('Argument count does not match the verified input contract; use named inputs: '+JSON.stringify(candidates.map(c=>c.inputs)));
  }
  return args;
}
