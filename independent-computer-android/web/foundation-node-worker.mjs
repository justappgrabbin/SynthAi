import {parentPort,workerData} from 'node:worker_threads';
import {invoke} from './foundation.mjs';
const keepAlive=setInterval(()=>{},1000);
try {parentPort.postMessage({ok:true,result:await invoke(workerData.url,workerData.entry,workerData.invocation)});}
catch(error){parentPort.postMessage({ok:false,error:error.stack||String(error)});}

finally {clearInterval(keepAlive);}
