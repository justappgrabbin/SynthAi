/** Optional primary-to-resident execution. A failure is retained, never hidden. */
export async function executeWithResidentFallback({artifact,context={},primary,resident,enabled=false}={}){
 const attempts=[];let first;
 try{first=await primary(artifact,context);attempts.push({path:'primary',ok:first?.ok===true,result:first});}
 catch(error){first={ok:false,error:String(error?.message??error)};attempts.push({path:'primary',ok:false,error:first.error});}
 if(first?.ok===true||!enabled)return {...first,fallback:{used:false,attempts}};
 // Opt-in is insufficient to replay a possibly mutating operation. The request must also declare its safe demonstration/read-only scope.
 if(!['example','read-only'].includes(context.fallbackScope))return {...first,fallback:{used:false,status:'scope-required',attempts,
  disclosure:'The primary execution failed. Local fallback requires an example or read-only request.'}};
 let local;
 try{local=await resident(artifact,context);}
 catch(error){local={ok:false,error:String(error?.message??error)};}
 attempts.push({path:'resident',ok:local?.ok===true,result:local});
 return {...local,backendUsed:false,workerUsed:false,fallback:{used:true,scope:context.fallbackScope,attempts,primaryFailure:first,
  disclosure:local?.ok===true?'The primary execution failed. This result was executed locally using resident capabilities.':'The primary execution failed, and resident capabilities could not execute this request.'}};
}
