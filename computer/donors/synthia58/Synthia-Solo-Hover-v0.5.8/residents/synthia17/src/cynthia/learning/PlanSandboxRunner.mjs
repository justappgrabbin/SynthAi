export class PlanSandboxRunner {
  constructor({compiler}={}){this.compiler=compiler;}
  async execute(artifact,context={}){
    try{const plan=this.compiler.parse(artifact.code),implementation=this.compiler.compile(plan),evidence=(context.examples??[]).map(example=>{const actual=implementation(example.input);const observed=example.condition?.path?.reduce((value,key)=>value?.[key],actual);const passed=example.condition?Object.is(observed,example.condition.equals):Object.is(actual,example.output);return Object.freeze({input:example.input,expected:example.output??example.condition,actual,passed});});return Object.freeze({status:evidence.length&&evidence.every(item=>item.passed)?'passed':'failed',passed:evidence.length>0&&evidence.every(item=>item.passed),evidence:Object.freeze(evidence)});}catch(error){return Object.freeze({status:'failed',passed:false,error:error.message});}
  }
}
