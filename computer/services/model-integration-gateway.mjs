/**
 * Local model backend gateway. Actual execution delegates to the preserved
 * TRIDENT source/checkpoint or a Modelmaker save_pretrained directory.
 * No synthetic fallback, no remote inference and no arbitrary executable paths
 * in user requests. Only deployment-owned environment configuration is used.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const worker = fileURLToPath(new URL('./model-inference-worker.py', import.meta.url));

export class ModelIntegrationGateway {
  constructor({ env = process.env, python = null, timeoutMs = 120000, bus = null,
                state = null } = {}) {
    this.env = {...env};
    const lastModelDir = state?.get('models.trainedModelDir', null);
    if(lastModelDir) this.env.SYNTHIA_MODELMAKER_DIR=lastModelDir;
    this.python = python ?? env.SYNTHIA_PYTHON ?? 'python3';
    this.timeoutMs = timeoutMs;
    this.bus = bus;
    this.state = state;
  }

  args(backend, operation) {
    if (!['trident','modelmaker'].includes(backend))
      throw new TypeError('Unknown backend');
    if(operation==='train'){
      if(backend!=='modelmaker')throw new TypeError('Only original Modelmaker trains through this interface');
      return [fileURLToPath(new URL('./model-training-worker.py',import.meta.url)),
        this.env.SYNTHIA_MODELMAKER_TRAIN_SOURCE||'',
        this.env.SYNTHIA_TRAINED_MODELS_DIR||''];
    }
    if (!['status','generate'].includes(operation))
      throw new TypeError('Unknown model operation');
    const args = [worker,'--backend',backend,'--operation',operation];
    if (backend === 'trident') {
      if (this.env.SYNTHIA_TRIDENT_MODEL_SOURCE)
        args.push('--source', resolve(this.env.SYNTHIA_TRIDENT_MODEL_SOURCE));
      if (this.env.SYNTHIA_TRIDENT_CHECKPOINT)
        args.push('--checkpoint', resolve(this.env.SYNTHIA_TRIDENT_CHECKPOINT));
    } else if (this.env.SYNTHIA_MODELMAKER_DIR) {
      args.push('--model-dir',resolve(this.env.SYNTHIA_MODELMAKER_DIR));
    }
    return args;
  }

  async call(backend, operation, payload = null) {
    const args = this.args(backend, operation);
    return new Promise((yes,no)=>{
      const child = spawn(this.python,args,{shell:false,windowsHide:true,
        env:{...process.env,PYTHONUNBUFFERED:'1'},stdio:['pipe','pipe','pipe']});
      let stdout='',stderr='',finished=false;
      const rejectOnce=e=>{if(!finished){finished=true;no(e)}};
      const timer=setTimeout(()=>child.kill('SIGKILL'),this.timeoutMs);
      child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
      child.stdout.on('data',part=>{
        stdout+=part;
        if(stdout.length>1024*1024)child.kill('SIGKILL');
      });
      child.stderr.on('data',part=>{stderr=(stderr+part).slice(-16000)});
      child.on('error',rejectOnce);
      child.on('close',(code,signal)=>{
        clearTimeout(timer);if(finished)return;finished=true;
        let item;
        try {item=JSON.parse(stdout.trim())}
        catch {return no(new Error('Model worker failed without a valid result: '+
          (signal||code)+' '+stderr.slice(0,1000)))}
        if(!item.ok) return no(new Error(item.error || 'Model worker failed'));
        yes(item.result);
      });
      child.stdin.on('error',()=>{});
      child.stdin.end(payload === null ? '' : JSON.stringify(payload)+'\n');
    });
  }

  async status() {
    const [trident,modelmaker] = await Promise.all(['trident','modelmaker']
      .map(async backend => {
        try{return await this.call(backend,'status')}
        catch(error){return {backend,inference_ready:false,error:error.message}}
      }));
    return {trident,modelmaker,service:'owner-local-model-inference',
      trident_address_onnx:'separate-authority-not-substituted',
      inference_can_be_claimed_only_after_real_generate:true};
  }

  async trainModelmaker({name='synthia-seed',corpus,epochs=1,architecture={}}={}){
    if(!this.env.SYNTHIA_MODELMAKER_TRAIN_SOURCE||!this.env.SYNTHIA_TRAINED_MODELS_DIR)
      throw new Error('Configure existing Modelmaker source and local output directory before training');
    if(typeof corpus!=='string'||corpus.trim().length<200||corpus.length>750000)
      throw new TypeError('A real training corpus of 200-750000 characters is required');
    // External user data is sent only to the original local trainer process.
    // It is not recorded in inference receipts or uploaded to Hugging Face.
    const output=await this.call('modelmaker','train',{name,corpus,epochs,architecture});
    if(!output?.trained||!output?.ready_for_inference||!output.model_dir)
      throw new Error('Original Modelmaker did not confirm an exported model');
    this.env.SYNTHIA_MODELMAKER_DIR=output.model_dir;
    const receipt={backend:'modelmaker',trainer:'original-owner-modelmaker',
      trained:true,modelDir:output.model_dir,epochs,at:new Date().toISOString()};
    if(this.state){
      await this.state.set('models.trainedModelDir',output.model_dir,{source:'modelmaker-integration'});
      const history=this.state.get('models.trainingReceipts',[]);
      await this.state.set('models.trainingReceipts',[...history,receipt].slice(-20),
        {source:'modelmaker-integration'});
    }
    this.bus?.emit('model:training-completed',receipt);
    return receipt;
  }

  async generate({text,backend='trident',head=null,maxNewTokens=24,temperature=0.8}={}) {
    if(typeof text!=='string'||!text.trim()||text.length>4096)
      throw new TypeError('Nonempty prompt (at most 4096 chars) is required');
    if(!Number.isInteger(maxNewTokens)||maxNewTokens<1||maxNewTokens>64)
      throw new RangeError('Invalid output length');
    if(!Number.isFinite(temperature)||temperature<0.05||temperature>2)
      throw new RangeError('Invalid sampling temperature');
    const request={prompt:text,max_new_tokens:maxNewTokens,temperature};
    if(head!==null)request.head=head;
    const inference=await this.call(backend,'generate',request);
    if(!inference?.weights_loaded||typeof inference.text!=='string')
      throw new Error('Model did not prove it loaded weights and generated text');
    const receipt={
      backend,provider:'original-source-local-checkpoint',weightsLoaded:true,
      inputChars:text.length,head:head||'router',outputChars:inference.text.length,
      generatedTokens:inference.new_tokens,output:inference.text,
      at:new Date().toISOString(),inferenceVerified:true
    };
    if(this.state) {
      const history=this.state.get('models.inferenceReceipts',[]);
      await this.state.set('models.inferenceReceipts',[...history,receipt].slice(-50),{
        source:'model-integration'});
    }
    this.bus?.emit('model:inference-completed',receipt);
    return receipt;
  }
}
