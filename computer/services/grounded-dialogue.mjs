/**
 * Evidence-first local dialogue for the EXISTING Synthia Computer.
 *
 * This is a deterministic interpreter/retriever and evidence composer, NOT an
 * LLM and NOT a hidden template-chat substitute. Never turns a speaker report,
 * donor self-report or lexical overlap into a verified physical fact.
 *
 * For unsupported turns return null: the caller may use the existing Morph
 * language donor, but must label that provider as a pattern-based fallback.
 */
const WORDS = s => String(s ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const STOP = new Set([
  'a','an','the','and','or','to','for','of','in','on','at','i','me','my','you',
  'your','we','are','was','is','were','it','this','that','do','did','does',
  'who','what','why','how','when','which','could','would','should','can','tell',
  'show','please','about','anything','something','say','said','know','remember',
  'think','have','has','had','from','with','there','their','them','they','our',
]);
const TERMS = text => [...new Set(WORDS(text).filter(x => x.length > 2 && !STOP.has(x)))];
const bounded = (s, max = 320) => String(s ?? '').replace(/\s+/g,' ').trim().slice(0,max);
const isQuestion = text => /\?/.test(text) || /\b(what|which|who|where|why|when|how|list|show|tell|recall|remember|status|summarize)\b/i.test(text);
const clip = (text, max = 260) => bounded(text,max) + (String(text ?? '').length > max ? '…' : '');

function relevant(text, queryTerms) {
  if (!queryTerms.length) return 0;
  const words = new Set(TERMS(text));
  let matched = 0;
  for (const term of queryTerms) if (words.has(term)) matched++;
  return matched / queryTerms.length;
}

/** These routes only report data the host actually possesses. */
export class GroundedDialogue {
  constructor(computer) {
    if (!computer?.state || !computer?.synthia || !computer?.vfs)
      throw new TypeError('Grounded dialogue needs the existing Computer.');
    this.computer = computer;
  }

  respond(input, { currentReadingId = null } = {}) {
    const query = bounded(input,12000);
    if (!isQuestion(query)) return null;
    const tokens = WORDS(query);
    const has = (...words) => words.some(word => tokens.includes(word));
    const make = (text, sources = [], kind = 'runtime-observation') => ({
      text, provider: 'computer:grounded-dialogue', kind,
      evidence: sources, confidence: sources.length ? 'source-linked' : 'host-observed',
      llm: false, generatedBy: 'retrieval-and-composition',
    });
    if (has('status', 'capabilities') && has('synthia', 'computer','model','neural','llm')) {
      const state = this.computer.synthia.status();
      const addons = this.computer.donorIntegration?.status();
      const tools = (state.tools ?? []).join(', ');
      const reports = addons?.observedReports ?? 0;
      return make('Synthia is resident in this Computer. Model: ' + state.model +
        '; pretrained large language model: ' + (state.llm === true ? 'yes' : 'no') +
        '; supervised training examples: ' + state.trainingExamples +
        '; runnable local language tools: ' + tools + '; imported donor reports: ' +
        reports + '. A semantic graph is not proof of independent world understanding.');
    }
    if (has('files','file','imports','imported','uploaded','uploads')) {
      const items = this.computer.vfs.list('/home/user/Imports/');
      const terms = TERMS(query).filter(x => !['file','files','imports','imported','uploaded','uploads'].includes(x));
      const hits = terms.length ? items.filter(item => relevant(item.path, terms) > 0) : items;
      if (!hits.length) return make(terms.length
        ? 'No imported file name matches those terms in this Computer.'
        : 'No files are presently recorded under this Computer’s Imports path.');
      return make(hits.length + ' matching imported file(s) in Computer storage:\n' +
        hits.slice(-20).map(x => '- ' + x.path.slice('/home/user/Imports/'.length) +
          (x.meta?.address ? ' (' + x.meta.address.dimension + ', gate ' + x.meta.address.gate + ')' : '')).join('\n'),
        hits.slice(-20).map(x => ({ type:'computer-file', path:x.path, digest:x.meta?.digest ?? null })), 'file-index');
    }
    if (has('world','swarm','agents','resonance') && (has('status','happened','changed','movement','moved','state','now','how','what'))) {
      const world = this.computer.observeWorld();
      const reports = this.computer.donorIntegration?.events({ donor:'adaptive-swarm-3d',limit:12 }) ?? [];
      const lines = [
        'Computer world runtime: ' + world.agents.length + ' live agents, ' +
        world.places.length + ' places, ' + world.fiveW_history + ' recorded 5W events.',
        'Imported 3D donor reports: ' + reports.length +
        '. These are source reports, not verified actions or resonance.',
      ];
      if (reports.length) lines.push('Latest source report: ' + clip(JSON.stringify({
        kind: reports.at(-1).kind, payload: reports.at(-1).payload,
      })));
      return make(lines.join('\n'), reports.map(x => ({type:'donor-report',id:x.computerEventId,verified:false})), 'world-status');
    }
    if (has('video','film','story','remorph','ending') && (has('status','happened','choice','choices','scene','state','what','which'))) {
      const reports = this.computer.donorIntegration?.events({ donor:'remorph-video',limit:8 }) ?? [];
      return make(reports.length
        ? 'Interactive film reports (not verified rendered frames):\n' +
          reports.map(x => '- ' + x.kind + ': ' + clip(JSON.stringify(x.payload),180)).join('\n')
        : 'There are no runtime film receipts in the Computer yet. The ZIP alone does not mean its player is mounted.',
        reports.map(x => ({type:'donor-report',id:x.computerEventId,verified:false})), 'film-status');
    }
    if (has('donors','donor','integration','integrated') && has('status','what','which','how')) {
      const integration = this.computer.donorIntegration?.status();
      if (!integration) return make('The donor event service is not mounted.');
      return make('Connected evidence formats: ' + integration.sourceFormats.join(', ') +
        '. Recorded events: ' + integration.observedReports + '. Source events do not imply that donor app UIs have been installed.');
    }

    // Retrieve user utterances and actual registered donor events, always with provenance.
    // Exclude the very question we just recorded, avoid treating reports as facts.
    const subject = TERMS(query).filter(w => !['synthia','remember','recall','conversation','earlier','discussed','history'].includes(w));
    if (!subject.length) return null;
    const entries = this.computer.synthia.spacetime.nodes
      .filter(n => n.type === 'utterance' && n.id !== currentReadingId && n.actor === 'user:local')
      .map(n => ({ id:n.id, text:n.text, actor:n.actor, kind:'speaker-report', score:relevant(n.text,subject) }));
    const recalls = entries.filter(n => n.score >= (subject.length === 1 ? 1 : 0.5))
      .sort((a,b)=>b.score-a.score || b.id.localeCompare(a.id)).slice(0,3);
    if (recalls.length && (has('remember','recall','earlier','said','talked','discussed') || isQuestion(query))) {
      const passages = recalls.map((r,i)=> (i+1) + '. ' + clip(r.text,300)).join('\n');
      return make('Previous user statements relevant to ' + subject.join(', ') +
        ' (attributed, not independently verified):\n' + passages,
        recalls.map(r=>({type:r.kind,id:r.id,verified:false})), 'speaker-recall');
    }
    if (has('remember','recall','said','earlier','discussed')) {
      return make('I have no earlier user statement indexed for ' + subject.join(', ') +
        '. I will not invent a memory.');
    }
    return null;
  }
}
export default GroundedDialogue;
