// SYNTHIA Living World — deterministic, offline-first simulation core, v0.1
// Original SYNTH AI donor code stays unchanged. This is a new playable client layer.
export const W=18,H=14,VERSION=1;
export const THEMES=['Grove','Starlight','Ember'];
export const FORMS=['Human','Fox','Gnome','Robot','Orb','Cat'];
export const ACTIONS=['Eat','Rest','Play','Socialize','Create','Wash'];
export const BUILDABLES=[
 {kind:'Snack stand',icon:'🍱',action:'Eat',cost:12},
 {kind:'Rest nest',icon:'🏕️',action:'Rest',cost:12},
 {kind:'Playhouse',icon:'🎲',action:'Play',cost:12},
 {kind:'Meditation bench',icon:'🪑',action:'Rest',cost:12},
 {kind:'Workshop',icon:'🔧',action:'Create',cost:12},
 {kind:'Spa',icon:'🛁',action:'Wash',cost:12}
];
export const FORM_SKILLS={Human:'Social bonding +6',Fox:'Play +10; fast travel',Gnome:'Creative work +12',Robot:'Creative work +6; fast travel',Orb:'Rest +12',Cat:'Rest +8; play +5'};
const BONUSES={Human:{Socialize:6},Fox:{Play:10},Gnome:{Create:12},Robot:{Create:6},Orb:{Rest:12},Cat:{Rest:8,Play:5}};
const REALM_BONUSES={Grove:{Create:3},Starlight:{Play:4},Ember:{Socialize:4}};
export const OBJECTS=[
 {id:'kitchen',kind:'Kitchen',x:4,y:4,icon:'🍲',action:'Eat',label:'Kitchen'},
 {id:'bed',kind:'Bed',x:2,y:3,icon:'🛏️',action:'Rest',label:'Dream nook'},
 {id:'bed2',kind:'Bed',x:5,y:3,icon:'🛏️',action:'Rest',label:'Guest nook'},
 {id:'bath',kind:'Bath',x:7,y:3,icon:'🫧',action:'Wash',label:'Bath'},
 {id:'studio',kind:'Studio',x:13,y:4,icon:'🎨',action:'Create',label:'Studio'},
 {id:'game',kind:'Game',x:11,y:10,icon:'🎮',action:'Play',label:'Arcade'},
 {id:'garden',kind:'Garden',x:4,y:10,icon:'🌱',action:'Create',label:'Garden'},
 {id:'fire',kind:'Fire',x:13,y:10,icon:'🔥',action:'Socialize',label:'Campfire'},
 {id:'pond',kind:'Pond',x:9,y:7,icon:'💧',action:'Play',label:'Pond'}
];
export const STARTERS=[
 ['Synthia','#ac7dff','Human',2,6],['Nova','#ff88b5','Fox',7,5],['Echo','#4be0db','Robot',13,7],['Moss','#f6bc67','Gnome',6,10]
];
const cap=(x,lo=0,hi=100)=>Math.max(lo,Math.min(hi,x));
const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const near=(a,b)=>dist(a,b)<=1;
const addMemory=(a,what,day,tick)=>{a.memories.push({day,tick,text:what});if(a.memories.length>32)a.memories.shift()};
function rand(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296}
const blocked=(x,y)=>x<0||y<0||x>=W||y>=H||(x===9&&y===7);
function route(start,finish){
 if(blocked(finish.x,finish.y))return[];
 const key=(x,y)=>x+','+y, from=new Map(), q=[{x:start.x,y:start.y}], seen=new Set([key(start.x,start.y)]);
 for(let i=0;i<q.length;i++){let p=q[i];if(p.x===finish.x&&p.y===finish.y)break;
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){let x=p.x+dx,y=p.y+dy,k=key(x,y);if(blocked(x,y)||seen.has(k))continue;seen.add(k);from.set(k,p);q.push({x,y})}}
 const out=[];let p={...finish},limit=W*H;
 while((p.x!==start.x||p.y!==start.y)&&limit--){const prev=from.get(key(p.x,p.y));if(!prev)return[];out.push(p);p=prev}
 return out.reverse();
}
function newAgent(id,name,color,form,x,y){return{id,name,color,form,x,y,level:1,xp:0,needs:{Eat:72,Rest:80,Play:68,Socialize:70,Wash:75},relationships:{},memories:[],goal:null,command:null,activity:'Exploring',path:[],progress:0,autonomy:true}}
export function createWorld(seed=121){const s={version:VERSION,seed,day:1,tick:30,theme:'Grove',paused:false,speed:1,nextId:5,nextObjectId:100,sparks:12,agents:STARTERS.map((a,i)=>newAgent(i+1,...a)),objects:OBJECTS.map(o=>({...o})),events:[],community:0,festivalDay:0,selectedId:1};note(s,'A new world wakes up. Every agent has needs, choices, and memories.');return s}
function note(s,text){s.events.unshift({day:s.day,tick:s.tick,text});s.events=s.events.slice(0,45)}
export function validateWorld(w){if(!w||w.version!==VERSION||!Array.isArray(w.agents)||!Array.isArray(w.objects)||typeof w.seed!=='number')throw new Error('Invalid Living World save');if(w.agents.length>20||w.objects.length>100)throw new Error('Save exceeds world limits');w.sparks??=12;w.nextObjectId??=100;return w}
export function buildObject(s,kind,x,y){
 const template=BUILDABLES.find(b=>b.kind===kind);if(!template)throw new Error('Unknown building');
 x=Math.floor(x);y=Math.floor(y);if(!Number.isFinite(x)||!Number.isFinite(y)||blocked(x,y))throw new Error('Choose a walkable empty tile');
 if(s.objects.some(o=>o.x===x&&o.y===y))throw new Error('There is already an object on this tile');
 if(s.sparks<template.cost)throw new Error('Not enough Sparks — let agents Create to earn more');
 const o={id:'crafted-'+s.nextObjectId++,kind:template.kind,label:template.kind,x,y,icon:template.icon,action:template.action};
 s.objects.push(o);s.sparks-=template.cost;note(s,`You built a ${kind} that agents can use`);return o;
}
export function addAgent(s,name,form='Human',color='#a78bfa'){
 if(s.agents.length>=12)throw new Error('The world holds up to 12 agents');
 let label=String(name||'').trim().slice(0,24);if(!label)throw new Error('Give your agent a name');if(!FORMS.includes(form))throw new Error('Unknown form');
 let pos={x:1+Math.floor(rand(s)*(W-2)),y:1+Math.floor(rand(s)*(H-2))};if(blocked(pos.x,pos.y))pos={x:2,y:2};
 const a=newAgent(s.nextId++,label,color,form,pos.x,pos.y);s.agents.push(a);s.selectedId=a.id;note(s,`${label} joined the world`);return a;
}
export function setMorph(s,id,form){const a=s.agents.find(a=>a.id===id);if(!a)throw new Error('Unknown agent');if(!FORMS.includes(form))throw new Error('Unknown form');const old=a.form;a.form=form;a.xp+=3;addMemory(a,`Morph: ${old} → ${form}`,s.day,s.tick);note(s,`${a.name} morphed into ${form}`);return a}
export function setTheme(s,theme){if(!THEMES.includes(theme))throw new Error('Unknown realm');s.theme=theme;note(s,`The world morphed into ${theme}`)}
export function setAgentName(s,id,name){const a=s.agents.find(a=>a.id===id);if(!a)throw new Error('Unknown agent');const label=String(name||'').trim().slice(0,24);if(!label)throw new Error('Name required');a.name=label;note(s,`${label} chose a new name`)}
export function setAutonomy(s,id,value){const a=s.agents.find(a=>a.id===id);if(!a)throw new Error('Unknown agent');a.autonomy=Boolean(value);if(!a.autonomy){a.command=null;a.goal=null;a.path=[];a.activity='Waiting for you'}}
function targetFor(s,a,act){
 if(act==='Socialize'){
  const candidates=s.agents.filter(b=>b.id!==a.id).sort((b,c)=>(a.relationships[b.id]||0)-(a.relationships[c.id]||0));
  const b=candidates[0];return b?{type:'agent',id:b.id,x:b.x,y:b.y,action:'Socialize'}:null;
 }
 const choices=s.objects.filter(o=>o.action===act&&!blocked(o.x,o.y)).sort((b,c)=>dist(a,b)-dist(a,c));
 return choices[0]?{type:'object',id:choices[0].id,x:choices[0].x,y:choices[0].y,action:act}:null;
}
export function directAction(s,id,act){const a=s.agents.find(a=>a.id===id);if(!a)throw new Error('Unknown agent');if(!ACTIONS.includes(act))throw new Error('Unknown action');const target=targetFor(s,a,act);if(!target)throw new Error('No available target');a.command=act;a.goal=target;a.progress=0;a.path=route(a,target);a.activity=`Going to ${act.toLowerCase()}`;note(s,`You asked ${a.name} to ${act.toLowerCase()}`);return a}
export function moveAgent(s,id,x,y){const a=s.agents.find(a=>a.id===id);x=Math.floor(x);y=Math.floor(y);if(!a||blocked(x,y))return false;a.command='Move';a.goal={type:'tile',x,y,action:'Move'};a.progress=0;a.path=route(a,{x,y});a.activity='Walking';return true}
function decide(s,a){const priority=[...ACTIONS].filter(x=>x!=='Socialize'||s.agents.length>1).sort((x,y)=>a.needs[x]-a.needs[y]);let act=priority[0];
 if(a.needs[act]>63){const options=['Create','Play','Socialize','Eat'];act=options[Math.floor(rand(s)*options.length)];if(act==='Socialize'&&s.agents.length<2)act='Create'}
 const goal=targetFor(s,a,act);if(goal){a.goal=goal;a.command=null;a.progress=0;a.path=route(a,goal);a.activity=`Seeking ${act.toLowerCase()}`}
}
function complete(s,a){const g=a.goal;if(!g)return;
 if(g.action==='Move'){a.activity='Arrived';a.goal=null;a.command=null;return}
 const n=a.needs;const base=g.action==='Rest'?32:g.action==='Eat'?30:g.action==='Wash'?31:g.action==='Play'?28:g.action==='Socialize'?25:18;
 const bonus=(BONUSES[a.form]?.[g.action]||0)+(REALM_BONUSES[s.theme]?.[g.action]||0),amount=base+bonus;
 n[g.action]=cap(n[g.action]+amount);
 if(g.action==='Create'){n.Play=cap(n.Play+8);a.xp+=8;s.sparks=cap(s.sparks+Math.ceil(4+bonus/3),0,999)}else a.xp+=4;
 if(g.action==='Socialize'){
  const b=s.agents.find(b=>b.id===g.id);if(b){a.relationships[b.id]=cap((a.relationships[b.id]||0)+9);b.relationships[a.id]=cap((b.relationships[a.id]||0)+9);b.needs.Socialize=cap(b.needs.Socialize+10);
   addMemory(b,`Spent time with ${a.name} (+bond)`,s.day,s.tick);s.community+=2;
   note(s,`${a.name} and ${b.name} connected (bond ${a.relationships[b.id]})`)}
 } else {const ob=s.objects.find(o=>o.id===g.id);note(s,`${a.name} ${g.action.toLowerCase()} ${ob?'at '+ob.label:''}`.trim())}
 addMemory(a,`${g.action} ${g.type==='agent'?'with '+(s.agents.find(b=>b.id===g.id)?.name||'another agent'):'at '+(s.objects.find(o=>o.id===g.id)?.label||'the world')}`,s.day,s.tick);
 if(a.xp>=a.level*24){a.xp-=a.level*24;a.level++;note(s,`${a.name} reached level ${a.level}`)}
 a.activity=g.action;a.goal=null;a.path=[];a.command=null;a.progress=0;
}
export function step(s){validateWorld(s);if(s.paused)return s;
 s.tick++;if(s.tick>=96){s.tick=0;s.day++;note(s,`Day ${s.day} begins`)}
 for(const a of s.agents){
  a.needs.Eat=cap(a.needs.Eat-.29);a.needs.Rest=cap(a.needs.Rest-.23);a.needs.Play=cap(a.needs.Play-.18);a.needs.Socialize=cap(a.needs.Socialize-.15);a.needs.Wash=cap(a.needs.Wash-.12);
  if(!a.goal&&a.autonomy)decide(s,a);
  if(!a.goal)continue;
  if(a.goal.type==='agent'){
   const b=s.agents.find(b=>b.id===a.goal.id);if(!b){a.goal=null;continue}a.goal.x=b.x;a.goal.y=b.y;
  }
  if(a.path.length&&(!a.path.at(-1)||a.path.at(-1).x!==a.goal.x||a.path.at(-1).y!==a.goal.y))a.path=route(a,a.goal);
  const arrived = a.goal.action==='Move' ? (a.x===a.goal.x&&a.y===a.goal.y) : near(a,a.goal);
  if(!arrived){
   const pace=a.form==='Fox'||a.form==='Robot'?2:1;for(let p=0;p<pace;p++){const next=a.path.shift();if(next&&!blocked(next.x,next.y)){a.x=next.x;a.y=next.y;a.activity='Walking'}else {a.path=route(a,a.goal);break}if(a.x===a.goal.x&&a.y===a.goal.y)break}
  }else{
   a.progress++;a.activity=a.goal.action==='Move'?'Arriving':a.goal.action;
   if(a.progress>=3)complete(s,a);
  }
 }
 if(s.community>=24&&s.festivalDay!==s.day){s.festivalDay=s.day;s.community=0;note(s,'✨ A community festival blooms from strong connections!');for(const a of s.agents)a.needs.Play=cap(a.needs.Play+10)}
 return s;
}
export function clock(s){const h=Math.floor(s.tick/4);const m=(s.tick%4)*15;return `Day ${s.day} · ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
export function summary(s){return {day:s.day,agents:s.agents.length,relationships:s.agents.reduce((n,a)=>n+Object.values(a.relationships).reduce((t,v)=>t+v,0),0)/2,memories:s.agents.reduce((n,a)=>n+a.memories.length,0)}}
