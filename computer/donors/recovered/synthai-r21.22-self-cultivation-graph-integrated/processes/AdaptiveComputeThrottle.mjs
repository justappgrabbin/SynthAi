const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
export class AdaptiveComputeThrottle{
 constructor({low=.45,critical=.22,dormant=.08}={}){this.thresholds={low,critical,dormant};this.last=null;}
 assess({vitality=1,adaptationBudget=1,repairPressure=0,load=0}={}){
  const available=clamp(vitality)*.55+clamp(adaptationBudget)*.30+(1-clamp(repairPressure))*.10+(1-clamp(load))*.05;
  const mode=available<=this.thresholds.dormant?'dormant':available<=this.thresholds.critical?'critical':available<=this.thresholds.low?'low':'normal';
  const policy={normal:{parallelism:4,allowGrowth:true,allowBackground:true},low:{parallelism:2,allowGrowth:true,allowBackground:false},critical:{parallelism:1,allowGrowth:false,allowBackground:false},dormant:{parallelism:0,allowGrowth:false,allowBackground:false}}[mode];
  return this.last={mode,available,policy,at:Date.now()};
 }}
export default AdaptiveComputeThrottle;
