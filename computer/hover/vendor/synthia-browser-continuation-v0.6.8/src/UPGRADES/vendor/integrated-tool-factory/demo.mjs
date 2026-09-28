import { IntegratedToolFactory } from './src/integrated-tool-factory.mjs';
const factory=new IntegratedToolFactory();
for(const request of [
  {purpose:'compare and match a pair',dimension:'Movement',input:['alpha beta','beta gamma']},
  {purpose:'analyze and learn observations',dimension:'Evolution',input:'a recurring pattern'},
  {purpose:'orchestrate a workflow system',dimension:'Space',input:'sense classify build test mount'},
]) { const result=factory.generate(request); console.log(result.tool.manifest()); console.log(await result.tool.execute(request.input)); }
console.log(`Factory holds ${factory.snapshot().tools.length} generated tools.`);
