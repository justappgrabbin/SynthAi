export class EconomyOrgan{
 constructor(){this.id='economy';this.capabilities=['opportunity','gift','need','community','economy'];this.opportunities=[];this.gifts=[];this.needs=[];}
 postOpportunity(o){const x={id:o.id||`opp-${Date.now()}-${this.opportunities.length}`,...o,createdAt:Date.now()};this.opportunities.push(x);return x;}
 signalNeed(n){const x={id:n.id||`need-${Date.now()}-${this.needs.length}`,...n,createdAt:Date.now(),status:'open'};this.needs.push(x);return x;}
 give(g){const x={id:g.id||`gift-${Date.now()}-${this.gifts.length}`,...g,createdAt:Date.now()};this.gifts.push(x);return x;}
 match(profile={}){const wanted=new Set([...(profile.neededCapabilities||[]),...(profile.capabilities||[])]);return this.opportunities.map(o=>({opportunity:o,score:(o.capabilities||[]).filter(x=>wanted.has(x)).length})).sort((a,b)=>b.score-a.score);}
 accepts(intent){return /\b(opportunity|job|gift|need|community|economy|help)\b/i.test(String(intent||''));}
 execute({action='snapshot',...payload}={}){if(action==='postOpportunity')return {ok:true,opportunity:this.postOpportunity(payload.opportunity||payload)};if(action==='signalNeed')return {ok:true,need:this.signalNeed(payload.need||payload)};if(action==='give')return {ok:true,gift:this.give(payload.gift||payload)};if(action==='match')return {ok:true,matches:this.match(payload.profile||{})};return {ok:true,...this.snapshot()};}
 snapshot(){return structuredClone({opportunities:this.opportunities,gifts:this.gifts,needs:this.needs});}
}
export default EconomyOrgan;
