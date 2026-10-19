/**
 * Evidence-guided learning from the actual imported conversation content.
 * Safe default: no invented messages, no automatic edits, no code execution,
 * and no claim that a lexical suggestion is a finished solution.
 */
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const MAX_MESSAGES = 2000, MAX_REVIEW_CHARS = 2000000;
const ASK = /\b(?:please|can you|could you|will you|i want|i need|we need|we should|let'?s|must|should|build|fix|make|create|connect|wire|finish|upload|review|implement|why don'?t)\b/i;
const DECISION = /\b(?:we decided|i decided|the plan is|use the|go with|should be|it needs to be|we're calling|we shall call|instead of|don't use|no templates|first do|don't change)\b/i;
const DEFECT = /\b(?:doesn'?t work|does not work|not working|broken|bug|failed|fails|error|does nothing|won't|can'?t|missing|blocked|stuck|never)\b/i;
const GOOD = /\b(?:works|working|verified|passes|built|finished|complete|deployed|done|success)\b/i;

function text(value, max=1000) { return String(value??'').replace(/\0/g,'').trim().slice(0,max); }
function toMessages(source) {
  if (typeof source !== 'string') throw new Error('Conversation review requires UTF-8 text');
  if (source.length > MAX_REVIEW_CHARS) throw new Error('Conversation text exceeds review limit');
  let raw;
  try { raw=JSON.parse(source); } catch { raw=null; }
  const result=[];
  const append=(role,content,id)=> {
    if (result.length>=MAX_MESSAGES) return;
    const message=text(content,4000);
    if (message) result.push({ role:text(role,30)||'unknown',content:message,sourceId:text(id,120) });
  };
  if (raw?.mapping && typeof raw.mapping==='object') {
    // Single ChatGPT exported conversation mapping.
    for (const [id,item] of Object.entries(raw.mapping)) {
      const message=item?.message;
      const content=message?.content?.parts;
      if (Array.isArray(content)) append(message.author?.role,content.filter(x=>typeof x==='string').join('\n'),id);
    }
  } else if (Array.isArray(raw) && raw.some(x=>x?.mapping)) {
    for (const conversation of raw.slice(0,120)) {
      for (const [id,item] of Object.entries(conversation.mapping||{})) {
        if (result.length>=MAX_MESSAGES) break;
        const message=item?.message;
        const parts=message?.content?.parts;
        if (Array.isArray(parts)) append(message.author?.role,parts.filter(x=>typeof x==='string').join('\n'),id);
      }
    }
  } else if (Array.isArray(raw) && raw.every(x=>x&&typeof x==='object')) {
    for (const [i,item] of raw.entries()) append(item.role||item.speaker||'unknown',item.content||item.text||item.message,i);
  } else {
    // Plain text or Markdown conversation. Keep line identifiers so every
    // extracted finding can cite actual user-provided text.
    for (const [i,line] of source.split(/\r?\n/).entries()) {
      if (line.trim()) append('unknown',line,i+1);
    }
  }
  return result;
}
function findings(messages) {
  const entries=[];
  for (let i=0;i<messages.length;i++) {
    const {role,content,sourceId}=messages[i];
    for (const [type,rule] of [['request',ASK],['decision',DECISION],['blocker',DEFECT],['reported_success',GOOD]]) {
      if (rule.test(content)) entries.push({type,role,quote:text(content,360),messageIndex:i,sourceId});
    }
  }
  // Favor actionable requests and blockers with receipts; keep review compact.
  return entries.slice(-120);
}
function makePatterns(existing) {
  const map=new Map();
  for (const entry of existing) {
    const key=entry.type;
    const group=map.get(key)||{type:key,count:0,examples:[]};
    group.count++;if(group.examples.length<5)group.examples.push(entry);
    map.set(key,group);
  }
  return [...map.values()];
}
function solutionHints(entries) {
  const hints=[];
  const buckets=[
    {rule:/upload|file picker|import|zip|ingest/i, title:'Make file and ZIP intake the first workflow', need:'Address originals before routing; preserve bytes and hashes.'},
    {rule:/terminal|shell|linux|virtual machine|\bvm\b|termux/i,title:'Validate a real embedded runtime',need:'Report the executed command, stdout, exit code and actual runtime type.'},
    {rule:/continuity|memory|context|forget|checkpoint/i,title:'Carry forward project continuity',need:'Use a verified append-only handoff and explicit project context.'},
    {rule:/android|apk|phone|build|release/i,title:'Check the Android release pipeline',need:'Review GitHub Actions results and APK artifacts, then test on device.'},
    {rule:/hands|accessibility|screen|tap/i,title:'Verify Android hands',need:'Run a device-side acceptance test instead of claiming a stub worked.'},
  ];
  for (const bucket of buckets) {
    const matches=entries.filter(e=>bucket.rule.test(e.quote) && ['request','blocker'].includes(e.type));
    if(matches.length)hints.push({title:bucket.title,proposedApproach:bucket.need,
      status:'suggested-not-executed',evidence:matches.slice(-4).map(e=>({type:e.type,quote:e.quote,sourceId:e.sourceId}))});
  }
  return hints;
}
export function createConversationLearning({ledger,library}) {
  const imported=new Map();
  for (const e of ledger.read({after:0,limit:2000})) {
    if (e.type==='conversation_review') {
      try { const record=JSON.parse(e.content);if(record?.sourceAddress)imported.set(record.sourceAddress,record); } catch {}
    }
  }
  function list() { return [...imported.values()].map(r=>({sourceAddress:r.sourceAddress,name:r.name,reviewedAt:r.reviewedAt,messageCount:r.messageCount,findingsCount:r.findings?.length||0,solutionsCount:r.solutions?.length||0})).reverse(); }
  async function reviewText({content,name='pasted-conversation',sourceAddress=null,generatedBy='deterministic-evidence-review'}={}) {
    const original=text(name,240);
    const messageList=toMessages(content);
    if(!messageList.length)throw new Error('No text messages found in conversation input');
    const observations=findings(messageList);
    const review={
      schema:'synthai-conversation-review/v1',
      name:original,sourceAddress,reviewedAt:new Date().toISOString(),
      messageCount:messageList.length,findings:observations,
      patterns:makePatterns(observations),
      solutions:solutionHints(observations),
      reviewMethod:generatedBy,
      limitation:'Suggestions are lexical observations from user-provided text, not validated solutions. Review before promoting.',
    };
    const compact={...review,findings:review.findings.slice(-12),patterns:review.patterns.map(({type,count})=>({type,count})),
      solutions:review.solutions.map(x=>({title:x.title,proposedApproach:x.proposedApproach,status:x.status}))};
    await ledger.append({type:'conversation_review',actor:'synthia',ref:sourceAddress,
      content:JSON.stringify(compact).slice(0,15500)});
    if(sourceAddress)imported.set(sourceAddress,compact);
    return review;
  }
  async function reviewArtifact({address}={}) {
    const item=await library.read(address);
    const kind=item.record.kind;
    if(!['document','data','source'].includes(kind))throw new Error('This import is binary/unsupported. Use a UTF-8 transcript .txt, .md or .json.');
    if(item.record.size>MAX_REVIEW_CHARS)throw new Error('Review supports up to 2 MB per transcript. Split the export or use smaller conversations.');
    const content=await readFile(item.path,'utf8');
    return reviewText({content,name:item.record.name,sourceAddress:address});
  }
  async function feedback({subject,verdict,comment}={}) {
    subject=text(subject,200);verdict=text(verdict,30);
    if(!subject||!['useful','incorrect','approved','rejected','worked','failed'].includes(verdict))throw new Error('Invalid feedback');
    const receipt=await ledger.append({type:'learning_feedback',actor:'human',ref:subject,
      content:JSON.stringify({subject,verdict,comment:text(comment,800),timestamp:new Date().toISOString()})});
    return {subject,verdict,receipt:{seq:receipt.seq,hash:receipt.hash}};
  }
  function stats() {
    const entries=ledger.read({after:0,limit:2000});
    return {schema:'synthai-learning-status/v1',reviewedTranscripts:list().length,
      evidenceEvents:entries.filter(e=>['conversation_review','learning_feedback','artifact_update','project_context','repo_change','receipt'].includes(e.type)).length,
      feedback:entries.filter(e=>e.type==='learning_feedback').length,
      method:'source-grounded pattern extraction and reviewed user feedback; no invented model training',
      automaticEdits:false};
  }
  return Object.freeze({reviewText,reviewArtifact,list,feedback,stats});
}