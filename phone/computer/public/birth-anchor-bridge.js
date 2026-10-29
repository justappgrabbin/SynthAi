/* Adapter for the supplied Computer. Its resident modules and saved weights stay intact. */
(() => {
 const read = () => {try{return JSON.parse(localStorage.getItem('synthia.birth.configuration.v1') || 'null');}catch{return null;}};
 const configuration = read();
 globalThis.SynthiaBirthConfiguration = configuration?.birth_anchor || null;
 if (configuration?.birth_anchor) {
  const badge=document.createElement('div');
  badge.textContent=`Birth chart · Personality Sun in Tropical ${configuration.birth_anchor.tropical_sun.longitude.toFixed(6)}° · Gate ${configuration.birth_anchor.tropical_sun.gate}.${configuration.birth_anchor.tropical_sun.line}`;
  badge.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483646;background:#132a27;color:#d1fff2;text-align:center;font:12px system-ui;padding:6px;pointer-events:none';document.body.append(badge);
 }
 let attempts=0;
 const timer=setInterval(()=>{
  const runtime=globalThis.SynthiaDesktop;
  if(!runtime){if(++attempts>120)clearInterval(timer);return;}
  clearInterval(timer);
  runtime.birthConfiguration=configuration?.birth_anchor || null;
  for(const key of ['date','time','timezoneOffset','city','lat','lon']){const field=document.getElementById('res-'+key);if(field){field.readOnly=true;field.title='Change birth inputs in the master Human Design chart.';}}
  const save=document.getElementById('res-save-profile');if(save)save.textContent='Connect this master birth chart';
  if(configuration?.birth_anchor && globalThis.SynthiaCanonicalProfileData){
   globalThis.SynthiaCanonicalProfileData().then(master=>{for(const key of ['date','time','timezoneOffset','city','lat','lon']){const field=document.getElementById('res-'+key);if(field)field.value=master.birthData[key]??'';}if(globalThis.SynthiaBindMasterChart){globalThis.SynthiaBindMasterChart().then(()=>{runtime.birthConfigurationReady=true;}).catch(e=>{const status=document.getElementById("res-profile-status");if(status)status.textContent=e.message;});}}).catch(()=>{});
  }
  const original=runtime.respond.bind(runtime);
  runtime.respond=async text=>{
   const result=await original(text);
   if(result.acted)return result;
   const current=read();
   if(!current?.chart_id)return {text:'Create your birth chart first in Human Design · Research · Cultivation. Your date, exact time, and place establish the tropical Sun anchor for personal guidance.',acted:false};
   const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chart_id:current.chart_id,question:String(text),session_id:sessionStorage.getItem('synthia.computer.chart-session')||undefined})});
   const data=await response.json();
   if(!response.ok)return {text:typeof data.detail==='string'?data.detail:'The chart-grounded model is unavailable. Regenerate your chart if the server restarted.',error:true,acted:false};
   sessionStorage.setItem('synthia.computer.chart-session',data.session_id);
   return {text:data.answer_markdown,acted:false,configuration_id:current.birth_anchor.configuration_id};
  };
  globalThis.dispatchEvent(new CustomEvent('synthia:birth-configuration',{detail:runtime.birthConfiguration}));
 },250);
})();
