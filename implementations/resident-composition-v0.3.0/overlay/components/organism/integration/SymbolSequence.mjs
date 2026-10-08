// Scale order from unified-execution-spine/state-space/constants.js.
// Dependency-free implementation shared by the graph and o_sequence.
const scales=['feature','phoneme','grapheme','morpheme','word','phrase','clause','sentence','discourse','automaton','mesh'];
export function sequence(operands) {
 const members=Array.isArray(operands)?operands:[operands];
 const identities=members.map(member=>member&&typeof member==='object'&&typeof member.id==='string'&&member.id?{occurrenceId:member.id}:{value:member});
 const unique=new Set(members.map(m=>m&&m.scale).filter(Boolean));
 const base=unique.size===1?[...unique][0]:null;
 const index=scales.indexOf(base);
 return {kind:'sequence',operator:'o_sequence',id:`sequence:${encodeURIComponent(JSON.stringify(identities))}`,
 positional:true,scale:base?(index<0?'mesh':scales[Math.min(index+1,scales.length-1)]):'mixed',members:members.map((member,position)=>({position,member}))};
}
