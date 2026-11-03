export function masterProfileData(master) {
  const geo=master.geonatal, chart=master.chart, anchor=master.birth_anchor;
  const signs=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const frame=(id,label)=>{
   const positions=geo.placements.filter(p=>p.frame===id&&p.orientation==='personality').map(p=>({...p,planet:p.planetary,sign:signs[Math.floor(p.longitude/30)],degree:p.longitude%30}));
   return {system:label,offset:geo.charts[id].personalityOffsetDegrees,positions,northNode:positions.find(p=>p.planet==='North Node'),ascendant:{sign:'See master chart',degree:null},precision:geo.methods.ephemeris};
  };
  const astrology={tropical:frame('tropical','Tropical'),sidereal:frame('sidereal_fagan_bradley','Sidereal · Fagan–Bradley'),draconic:frame('draconic_tropical_true','Draconic · Tropical True'),draconicMean:frame('draconic_tropical_mean','Draconic · Tropical Mean'),ayanamsa:geo.faganBradleyAyanamsa};
  const activation=a=>({...a,planet:a.planet_label,keyword:'Gate '+a.gate,lineArchetype:'Line '+a.line});
  const value=k=>chart.summary[k]?.label || chart.summary[k]?.code || '';
  const humanDesign={type:value('type'),strategy:value('strategy'),authority:value('authority'),profile:value('profile'),definition:{type:value('definition')},incarnationCross:{label:value('incarnation_cross')},activeGates:chart.activated_gates.map(g=>g.gate),channels:chart.channels.map(c=>({a:c.gates[0],b:c.gates[1],centerA:c.centers[0],centerB:c.centers[1]})),personality:chart.personality.activations.map(activation),design:chart.design.activations.map(activation),calculation:{precision:'Derived from the master birth chart · '+anchor.configuration_id}};
  const utc=new Date(anchor.birth_utc);
  const birthData={name:master.user_name||'Human',date:utc.toISOString().slice(0,10),time:utc.toISOString().slice(11,19),timezoneOffset:0,lat:anchor.location.latitude,lon:anchor.location.longitude,city:chart.input.location?.name||'Birthplace',configuration_id:anchor.configuration_id};
  return {anchor,astrology,humanDesign,birthData};
}
