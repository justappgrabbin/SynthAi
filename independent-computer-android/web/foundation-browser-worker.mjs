import {invoke} from './foundation.mjs';
self.onmessage=async({data})=>{
  try{self.postMessage({ok:true,result:await invoke(data.url,data.entry,data.invocation)});}
  catch(error){self.postMessage({ok:false,error:error.stack||String(error)});}
};
