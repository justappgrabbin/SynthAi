import { BrowserTaskPlanner, isHumanOnlyField } from '../../runtime/BrowserTaskPlanner.js';
import { BrowserPerceptionNavigator } from '../../runtime/BrowserPerceptionNavigator.js';
import { BrowserOutcomeVerifier } from '../../runtime/BrowserOutcomeVerifier.js';

const freeze = (value) => Object.freeze(value);
let sequence = 0;

export function browserRouteFor(message='') {
  const text = String(message || '');
  if (/\b(apply|application|register|sign[ -]?up|form|benefits?|ebt|snap|calfresh|medicaid|assistance)\b/i.test(text)) return freeze({kind:'browser',task:'form-workflow'});
  if (/\b(buy|purchase|shop|order|cart)\b/i.test(text)) return freeze({kind:'browser',task:'purchase-workflow'});
  if (/\b(book|booking|reserve|reservation|appointment|schedule)\b/i.test(text)) return freeze({kind:'browser',task:'booking-workflow'});
  return freeze({kind:'browser',task:'navigation-workflow'});
}

function reviewPage(page={}) {
  const form = page.forms?.[0];
  if (!form) return freeze({status:'no-form-found',missing:freeze([]),humanOnly:freeze([]),page});
  const missing = (form.fields||[])
    .filter(field => field.required && (field.value===null || field.value===undefined || field.value==='' || field.value===false))
    .map(field => field.name);
  const humanOnly = (form.fields||[]).filter(field => isHumanOnlyField(field)).map(field => field.name);
  return freeze({status:missing.length?'awaiting-human':'ready-for-final-confirmation',missing:freeze(missing),humanOnly:freeze(humanOnly),page});
}

export class BrowserActionLoop {
  constructor({browserForm, planner=new BrowserTaskPlanner(), navigator=new BrowserPerceptionNavigator(), verifier=new BrowserOutcomeVerifier(), storage=globalThis.localStorage ?? null}={}) {
    if (!browserForm) throw new Error('BrowserActionLoop requires the browser-form automaton');
    this.browserForm = browserForm;
    this.planner = planner;
    this.navigator = navigator;
    this.verifier = verifier;
    this.storage = storage;
    this.sessions = new Map();
    this.memoryKey = 'synthia.browser.action-loop.v1';
  }

  async run(message,{executor,profile={},preapprovedFields=[],autonomousNavigation=true,url=null}={}) {
    if (!executor) return freeze({status:'browser-executor-needed',route:browserRouteFor(message),plan:this.planner.plan(message,browserRouteFor(message))});
    const route = browserRouteFor(message);
    let page = await executor.inspectPage();
    let navigation = freeze({status:'current-page',trace:freeze([]),page,steps:0});

    if (route.task !== 'form-workflow' && autonomousNavigation) {
      navigation = await this.navigator.navigate({executor,message,route,url:url || page.url});
      page = navigation.page || await executor.inspectPage();
    }

    let prepared = freeze({status:navigation.status,unresolved:freeze([]),humanOnly:freeze([]),next:null});
    let fillResult = null;
    if (route.task === 'form-workflow') {
      prepared = await this.planner.prepareForm(this.browserForm,{page,profile,preapprovedFields});
      if (prepared.draft?.status === 'filled') fillResult = await executor.fillDraft(prepared.draft);
      page = await executor.inspectPage();
    }

    const id = `browser-${Date.now().toString(36)}-${++sequence}`;
    const record = {id,message,route,executor,profile,preapprovedFields:[...preapprovedFields],prepared,page,navigation,submitted:false,createdAt:Date.now()};
    this.sessions.set(id,record);
    this.#remember(record);
    return this.#view(record,{fillResult});
  }

  async provideInput(sessionId,values={}) {
    const session=this.#session(sessionId);
    const fields=[];
    for (const [name,value] of Object.entries(values)) fields.push(await session.executor.setField(name,value));
    session.page=await session.executor.inspectPage();
    const review=reviewPage(session.page);
    this.#remember(session);
    return freeze({status:'human-input-recorded',browserSessionId:sessionId,fields:freeze(fields),review});
  }

  async review(sessionId) {
    const session=this.#session(sessionId);
    session.page=await session.executor.inspectPage();
    const review=reviewPage(session.page);
    this.#remember(session);
    return freeze({browserSessionId:sessionId,...review});
  }

  async confirmAndSubmit(sessionId,{confirmed=false}={}) {
    const session=this.#session(sessionId);
    session.page=await session.executor.inspectPage();
    const review=reviewPage(session.page);
    if (review.missing.length) return freeze({status:'awaiting-human',browserSessionId:sessionId,...review});
    if (!confirmed) return freeze({...review,status:'awaiting-final-confirmation',browserSessionId:sessionId,next:'explicitly confirm final submission'});

    const form=session.page.forms?.[0];
    if (!form) return freeze({status:'no-form-found',browserSessionId:sessionId});
    await this.browserForm.call({operation:'inspect-page',page:session.page});
    const values={}; const sources={};
    for (const field of form.fields||[]) {
      if (field.value===null || field.value===undefined || field.value==='') continue;
      values[field.name]=field.value;
      sources[field.name]=isHumanOnlyField(field)
        ? {kind:'human-browser-entry',ref:`browser.${field.name}`}
        : {kind:'reviewed-page-value',ref:`browser.${field.name}`};
    }
    let draft=await this.browserForm.call({operation:'draft',formId:form.id,values,context:{sources}});
    const populated=draft.entries.filter(entry=>entry.value!==null && entry.value!=='').map(entry=>entry.name);
    draft=await this.browserForm.call({operation:'approve-fields',draftId:draft.id,names:populated,context:{scope:'explicit-final-page-review'}});
    draft=await this.browserForm.call({operation:'fill',draftId:draft.id});
    const validation=await this.browserForm.call({operation:'validate',draftId:draft.id});
    if (!validation.valid) return freeze({status:'awaiting-human',browserSessionId:sessionId,validation,missing:validation.missing});
    const request=await this.browserForm.call({operation:'request-submission',draftId:draft.id});
    await this.browserForm.call({operation:'confirm-submission',requestId:request.id});
    const dispatched=await this.browserForm.ownedState.submit(request.id,()=>session.executor.submitForm(form.id));
    session.submitted=true;
    session.page=await session.executor.inspectPage().catch(()=>session.page);
    const outcome=this.verifier.verify({route:session.route,page:session.page,dispatched});
    this.#remember(session,{outcome});
    return freeze({status:'submitted',browserSessionId:sessionId,requestId:request.id,dispatched,outcome,page:session.page});
  }

  close(sessionId){ return this.sessions.delete(sessionId); }

  #session(id){const session=this.sessions.get(id);if(!session)throw new Error(`Unknown browser session: ${id}`);return session;}
  #view(session,extra={}){const review=reviewPage(session.page);return freeze({status:session.prepared.status,browserSessionId:session.id,route:session.route,plan:this.planner.plan(session.message,session.route),url:session.page?.url||null,unresolved:session.prepared.unresolved||review.missing,humanOnly:session.prepared.humanOnly||review.humanOnly,next:session.prepared.next,page:session.page,navigation:session.navigation,...extra});}
  #remember(session,extra={}){
    if (!this.storage?.setItem) return;
    try {
      const previous=JSON.parse(this.storage.getItem(this.memoryKey)||'{"tasks":[]}');
      const tasks=Array.isArray(previous.tasks)?previous.tasks:[];
      const summary={id:session.id,message:session.message,route:session.route,url:session.page?.url||null,status:extra.outcome?.status||session.prepared?.status||'active',unresolved:[...(session.prepared?.unresolved||[])],updatedAt:new Date().toISOString(),...extra};
      const next=[summary,...tasks.filter(item=>item.id!==session.id)].slice(0,50);
      this.storage.setItem(this.memoryKey,JSON.stringify({schemaVersion:1,tasks:next}));
    } catch {}
  }
}

export default BrowserActionLoop;
