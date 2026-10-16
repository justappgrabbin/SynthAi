const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const finite=(n,fallback=0)=>Number.isFinite(Number(n))?Number(n):fallback;
const hash01=value=>{let h=2166136261;for(const ch of String(value??'')){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0)/4294967295};

export class MorphPhenotypeResolver{
  resolve(unit,{overrides={}}={}){
    if(!unit)throw new TypeError('unit required');
    const metabolism=unit.metabolism?.snapshot?.()||{};
    const life=unit.living?.snapshot?.()||{};
    const tools=unit.runtime?.getRegisteredTools?.()||[];
    const morphs=unit.morphs?.size||0;
    const rules=unit.rules?.snapshot?.()||{events:[]};
    const lastRule=(rules.events||[]).slice(-1)[0]||null;
    const mem=unit.memory?.snapshot?.()||{};
    const lastEvent=(mem.events||[]).slice(-1)[0]||null;
    const profileAddress=unit.profile?.micro&&['gate','line','color','tone','base'].every(k=>Number.isFinite(Number(unit.profile.micro[k])))?unit.profile.micro:null;
    const address=lastEvent?.address||profileAddress||unit.resolveAddress?.('self')?.canonical||{};

    const vitality=clamp(metabolism.vitality??0.68);
    const repair=clamp(metabolism.repairPressure??0);
    const budget=clamp(metabolism.adaptationBudget??0);
    const replenished=clamp((metabolism.totalReplenished??0)/2);
    const toolGrowth=clamp((tools.length-16)/16);
    const perspective=1/Math.max(1,morphs+1);
    const gate=finite(address.gate,1);
    const line=finite(address.line,1);
    const color=finite(address.color,1);
    const tone=finite(address.tone,1);
    const base=finite(address.base,1);

    const dimensions={
      Movement:clamp(.35+repair*.65),
      Evolution:clamp(.25+Math.max(budget,replenished)*.75),
      Being:clamp(vitality),
      Design:clamp(.35+toolGrowth*.45+(lastRule?.permit?0.2:0)),
      Space:clamp(.35+perspective*.45+((base%5)/5)*.2)
    };
    const dominantDimension=Object.entries(dimensions).sort((a,b)=>b[1]-a[1])[0][0];
    const palettes={
      Movement:{base:'#b98c66',glow:'#63e67e'},
      Evolution:{base:'#aab4c8',glow:'#78a7ff'},
      Being:{base:'#d1a37a',glow:'#ff7b66'},
      Design:{base:'#c7b7d9',glow:'#c57cff'},
      Space:{base:'#d6cbbd',glow:'#f0d86a'}
    };
    const palette=palettes[dominantDimension];
    const state=repair>.62?'shadow':vitality>.82&&budget>.18?'siddhi':'gift';
    const structuralKey=unit.structuralKey?.()||'';const identityNoise=hash01(`${structuralKey}:${gate}:${line}:${color}:${tone}:${base}`)-.5;

    const phenotype={
      source:'live-synthia-organism-state',
      structuralKey,
      address:{...address},
      dimensions,
      dominantDimension,
      state,
      vitality,repairPressure:repair,adaptationBudget:budget,
      perspective:{part:1,whole:morphs+1,proportion:perspective},
      anatomy:{toolCount:tools.length,morphCount:morphs},
      proportions:{
        height:clamp(1+(vitality-.5)*.12+identityNoise*.03,.88,1.14),
        chest:clamp(1.02+dimensions.Being*.18+dimensions.Design*.10,.85,1.45),
        shoulders:clamp(.98+dimensions.Movement*.16+dimensions.Design*.12,.85,1.38),
        waist:clamp(.96-repair*.14+dimensions.Space*.05,.72,1.18),
        hips:clamp(1.02+dimensions.Space*.18+dimensions.Evolution*.08,.88,1.52)
      },
      motion:{
        breathHz:.7+vitality*.9,
        breathDepth:.008+vitality*.024,
        sway:.015+repair*.07,
        headTurn:.03+dimensions.Space*.10
      },
      material:{baseColor:palette.base,glowColor:palette.glow,emissive:state==='siddhi'?.62:state==='gift'?.30:.10},
      glyphs:[`G${gate}`,`L${line}`,`C${color}`,`T${tone}`,`B${base}`],
      evidence:{lastRuleHash:lastRule?.ruleHash||null,lastRuleType:lastRule?.type||null,lastIntent:lastEvent?.intent||null}
    };
    for(const [k,v] of Object.entries(overrides||{}))if(k in phenotype.proportions)phenotype.proportions[k]=Number(v);
    return phenotype;
  }
}
export default MorphPhenotypeResolver;
