/* Shared chart adapter; no competing ephemeris calculation. */
(() => {
 let cached=null;
 globalThis.SynthiaCanonicalProfileData=async()=>{
  const selected=JSON.parse(localStorage.getItem('synthia.birth.configuration.v1')||'null');
  if(!selected?.chart_id)throw Error('Create the master birth chart in Human Design first.');
  if(cached?.anchor.configuration_id===selected.birth_anchor.configuration_id)return cached;
  const response=await fetch('/api/charts/'+encodeURIComponent(selected.chart_id));
  if(!response.ok)throw Error('The master birth chart is unavailable.');
  const {masterProfileData}=await import('/computer/master-profile-adapter.mjs');
  cached=masterProfileData(await response.json());return cached;
 };
})();
