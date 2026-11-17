import { gateBits } from 'synthia/vendor/browser/src/state-space/addressing.js';
import { addressPresentation } from 'synthia/src/state-space-adapter.mjs';
export const EXPRESSION_SOURCES=Object.freeze({
 grammar:'https://blog.juliosong.com/linguistics/metaphysics/generative-grammar-of-i-ching-part5/',
 notation:'https://musicalhexagram.com/',
 glyphs:'supplied Unicode charts',colors:'supplied RGB hexadecimal charts',
 sound:'vendor/browser/src/state-space/sounds.js'
});
export function expressGlyph(address,{category='hexagram',context={},level=2}={}){
 const presentation=addressPresentation(address,{level});
 const bits=gateBits(address.gate);
 const symbol=String.fromCodePoint(0x4dc0+address.gate-1);
 return {address:{...address},symbol,category,level,addressFields:presentation.fields,context:structuredClone(context),
   encoding:{unicode:`U+${symbol.codePointAt(0).toString(16).toUpperCase()}`,codePoint:symbol.codePointAt(0),utf8:[...new TextEncoder().encode(symbol)],ascii:null},
   composition:{lines:bits.map((bit,index)=>({index:index+1,bit,symbol:bit?'⚊':'⚋'})),bigrams:[bits.slice(0,2),bits.slice(2,4),bits.slice(4,6)],trigrams:[bits.slice(0,3),bits.slice(3,6)],hexagram:bits},
   color:presentation.color,sound:presentation.sound,provenance:EXPRESSION_SOURCES,
   notationMapping:'Musical Hexagram is a notation reference; no gate-to-frequency rule imported from it'};
}
export function renderGlyph(expression,document){
 const node=document.createElement('span');node.textContent=expression.symbol;
 node.style.color=expression.color.hex;node.style.fontSize='64px';node.dataset.gate=String(expression.address.gate);
 node.title=`${expression.encoding.unicode} · Gate ${expression.address.gate} · ${expression.address.dimension}`;
 return node;
}
export async function playGlyph(expression,AudioContextClass=globalThis.AudioContext??globalThis.webkitAudioContext,{bpm=120,pulseDuty=0.5}={}){
 if(!AudioContextClass)throw Error('AudioContext unavailable');
 if(!(bpm>0&&Number.isFinite(bpm))||!(pulseDuty>0&&pulseDuty<1))throw Error('Invalid tempo or pulse duty');
 const context=new AudioContextClass();
 try{
  await context.resume();
  const sound=expression.sound,duration=sound.duration*60/bpm;
  const gain=context.createGain();gain.gain.value=sound.velocity*0.15;gain.connect(context.destination);
  let source;
  if(sound.timbre==='noise'){
   source=context.createBufferSource();
   const buffer=context.createBuffer(1,Math.max(1,Math.ceil(duration*context.sampleRate)),context.sampleRate);
   const samples=buffer.getChannelData(0);let seed=expression.address.gate||1;
   for(let i=0;i<samples.length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;samples[i]=(seed>>>0)/0xffffffff*2-1;}
   source.buffer=buffer;
  }else{
   source=context.createOscillator();source.frequency.value=sound.freq;
   if(sound.timbre==='pulse'){
    const real=new Float32Array(65),imaginary=new Float32Array(65);real[0]=2*pulseDuty-1;
    for(let n=1;n<65;n++){real[n]=2*Math.sin(2*Math.PI*n*pulseDuty)/(Math.PI*n);imaginary[n]=2*(1-Math.cos(2*Math.PI*n*pulseDuty))/(Math.PI*n);}
    source.setPeriodicWave(context.createPeriodicWave(real,imaginary));
   }else if(['sine','triangle','square','sawtooth'].includes(sound.timbre))source.type=sound.timbre;
   else throw Error(`Unknown supplied timbre: ${sound.timbre}`);
  }
  source.connect(gain);
  await new Promise((resolve,reject)=>{source.onended=resolve;try{source.start();source.stop(context.currentTime+duration);}catch(error){reject(error);}});
  return {frequency:sound.freq,timbre:sound.timbre,duration,bpm,pulseDuty,renderer:'Web Audio adapter; source sound table supplies qualities'};
 }finally{await context.close();}
}
