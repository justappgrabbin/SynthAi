
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number(n)||0));
const hexToRgb=h=>{const s=String(h||'').replace('#','');if(!/^[0-9a-f]{6}$/i.test(s))return null;return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]};
const luminance=h=>{const rgb=hexToRgb(h);if(!rgb)return .5;const c=rgb.map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const contrast=(a,b)=>{const A=luminance(a),B=luminance(b),hi=Math.max(A,B),lo=Math.min(A,B);return (hi+.05)/(lo+.05)};
const mix=(a,b,t=.5)=>{const A=hexToRgb(a),B=hexToRgb(b);if(!A||!B)return a;return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*clamp(t)).toString(16).padStart(2,'0')).join('')};

export class VisualSelfDesignProcess{
  constructor(){this.last=null;this.history=[];}
  inspect({phenotype=null,morph=null,viewport=null}={}){
    const p=phenotype||{},m=morph||{};
    return {
      state:p.state||'gift',
      dominantDimension:p.dominantDimension||m.focus?.dimension||'Being',
      baseColor:p.material?.baseColor||'#c7b7d9',
      glowColor:p.material?.glowColor||'#c57cff',
      vitality:clamp(p.vitality??.68),
      repairPressure:clamp(p.repairPressure??m.behavior?.pressure??0),
      openness:clamp(m.habitat?.openness??.5),
      density:clamp(m.habitat?.density??.5),
      coherence:clamp(m.habitat?.coherence??.5),
      motion:clamp(m.behavior?.motion??.25),
      mode:m.mode||'field',
      viewport:viewport||null
    };
  }
  propose(input={}){
    const s=this.inspect(input),compact=Boolean(s.viewport?.width&&s.viewport.width<520);
    const bg='#0d0d12',base=s.baseColor,glow=s.glowColor;
    const surface=mix('#17151d',base,.08+.06*s.coherence);
    const surface2=mix('#211e29',glow,.08+.08*s.vitality);
    const line=mix('#34313d',base,.18),accent=mix(base,glow,.42);
    let text='#f5f1f8',muted='#aaa3b4';
    if(contrast(text,bg)<7)text='#ffffff';
    if(contrast(muted,bg)<4.5)muted='#c4bdca';
    const spec={
      type:'visual-self-design',source:'organism-state+phenotype',mode:s.mode,quality:s,
      tokens:{
        bg,surface,surface2,line,text,muted,accent,
        radius:Math.round(14+10*s.openness),
        gap:Math.round((compact?10:12)+(1-s.density)*6),
        maxWidth:compact?'100%':`${Math.round(900+100*s.openness)}px`,
        shadow:s.repairPressure>.55?'0 10px 28px #0005':`0 ${Math.round(14+10*s.openness)}px ${Math.round(38+18*s.openness)}px #0007`
      },
      layout:{
        shell:compact?'phone-single-column':'responsive-centered',
        navigation:'bottom-dock',
        density:s.density>.68?'compact':s.density<.32?'airy':'balanced',
        motion:s.motion>.62?'expressive':s.motion<.2?'quiet':'subtle'
      },
      accessibility:{textContrast:contrast(text,bg),mutedContrast:contrast(muted,bg),accentContrast:contrast(accent,bg)},
      at:Date.now()
    };
    this.last=spec;this.history.push(spec);if(this.history.length>64)this.history.shift();
    return structuredClone(spec);
  }
  apply(root,spec=null){
    const d=root?.documentElement?root:(root?.ownerDocument||globalThis.document);
    if(!d?.documentElement)return null;spec=spec||this.last;if(!spec)return null;
    const r=d.documentElement.style,t=spec.tokens;
    const vars={'--bg':t.bg,'--panel':t.surface,'--panel2':t.surface2,'--line':t.line,'--text':t.text,'--muted':t.muted,'--accent':t.accent,'--ui-radius':`${t.radius}px`,'--ui-gap':`${t.gap}px`,'--ui-max-width':t.maxWidth,'--shadow':t.shadow,'--synthia-design-motion':spec.layout.motion==='expressive'?'1':spec.layout.motion==='quiet'?'0':'0.45'};
    for(const [k,v] of Object.entries(vars))r.setProperty(k,String(v));
    const body=d.body;if(body?.dataset){body.dataset.synthiaVisualMode=spec.mode;body.dataset.synthiaDensity=spec.layout.density;body.dataset.synthiaMotion=spec.layout.motion;}
    return structuredClone(spec);
  }
  design({root=globalThis.document,phenotype=null,morph=null,viewport=null}={}){
    const spec=this.propose({phenotype,morph,viewport});this.apply(root,spec);return spec;
  }
  snapshot(){return this.last?structuredClone(this.last):null;}
}
export default VisualSelfDesignProcess;
