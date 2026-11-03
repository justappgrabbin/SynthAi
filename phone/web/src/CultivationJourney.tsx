import { FormEvent, useEffect, useState } from "react";
import { requestJson, SavedChartResponse } from "./api";

type Profile = {id:string;answers:Record<string,string>;story_path:string};
type Practice = {id:string;title:string;prompt:string;action:string;expected:string;counterevidence:string;deadline:string;sun_reference:{gate:number;line:number}};
type Observation = {id:string;parent_id:string;situation:string;action_taken:string;result:string;assessment:string;created_at:string};
type Interpretation = {id:string;parent_id:string;text:string;created_at:string};
type Option = {id:string;title:string;description:string;category:string;prompts:string[];selected_prompt:string};
type Journey = {profile:Profile|null;profile_revision_count:number;questions:Array<{id:string;label:string;prompt:string}>;story_paths:Array<{id:string;label:string;text:string}>;practice_options:Option[];practices:Practice[];observations:Observation[];interpretations:Interpretation[]};
const tomorrow = () => {const date=new Date(Date.now()+86400000);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};

export default function CultivationJourney({chart,onAsk}:{chart:SavedChartResponse|null;onAsk:(question:string)=>void}) {
  const [state,setState]=useState<Journey|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
  const [round,setRound]=useState(0),[path,setPath]=useState("");
  const [optionId,setOptionId]=useState("reflection"),[prompt,setPrompt]=useState("");
  const [activePractice,setActivePractice]=useState("");
  const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(false);
  const endpoint=chart?`/api/cultivation/${encodeURIComponent(chart.chart_id)}`:"";

  async function refresh() {const next=await requestJson<Journey>(endpoint);setState(next);return next;}
  useEffect(()=>{let active=true;setState(null);setAnswers({});setPath("");setError("");setNotice("");setRound(0);setActivePractice("");if(!chart)return;setLoading(true);(async()=>{
    try{const next=await requestJson<Journey>(endpoint);if(!active)return;setState(next);setAnswers(next.profile?.answers||{});setPath(next.profile?.story_path||"");setPrompt(next.practice_options[0]?.selected_prompt||"");setActivePractice(next.practices.at(-1)?.id||"");}
    catch(e){if(active)setError(e instanceof Error?e.message:"Could not load your cultivation history.");}
    finally{if(active)setLoading(false);}
  })();return()=>{active=false;};},[chart?.chart_id]);

  async function run(action:()=>Promise<unknown>,message:string){setBusy(true);setError("");setNotice("");try{await action();await refresh();setNotice(message);}catch(e){setError(e instanceof Error?e.message:"Your record could not be saved.");}finally{setBusy(false);}}
  async function saveRound(e:FormEvent){e.preventDefault();if(!state)return;await run(async()=>{
    const saved=await requestJson<Profile>(endpoint+"/profile",{answers,story_path:path,expected_revision:state.profile?.id??null});setAnswers(saved.answers);setRound(r=>Math.min(2,r+1));
  },round===2?"Your priorities are saved for your companion.":"Round saved. Continue when you are ready.");}
  async function startPractice(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const fields=new FormData(form);await run(async()=>{
    const saved=await requestJson<Practice>(endpoint+"/practices",{option_id:optionId,prompt,action:fields.get("action"),expected:fields.get("expected"),counterevidence:fields.get("counterevidence"),deadline:new Date(String(fields.get("deadline"))).toISOString()});setActivePractice(saved.id);form.reset();
  },"Practice committed. Its expectation stays fixed while you record what happens.");}
  async function observe(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const fields=new FormData(form);await run(async()=>{
    await requestJson(endpoint+"/observations",{practice_id:activePractice,situation:fields.get("situation"),action_taken:fields.get("action_taken"),result:fields.get("result"),assessment:fields.get("assessment")});form.reset();
  },"Observation saved. A later interpretation will be a separate record.");}
  async function interpret(e:FormEvent<HTMLFormElement>,observationId:string){e.preventDefault();const form=e.currentTarget;const fields=new FormData(form);await run(async()=>{await requestJson(endpoint+"/interpretations",{observation_id:observationId,text:fields.get("interpretation")});form.reset();},"Interpretation added; the original observation is unchanged.");}

  const active=state?.practices.find(p=>p.id===activePractice);
  return <section className="panel cultivation-journey" id="cultivation-journey" aria-label="Your cultivation journey">
    <div className="journey-heading"><span className="journey-eyebrow">YOUR CHART · YOUR EXPERIENCE</span><h2>Your cultivation journey</h2><p>Explore who you are, choose what matters, and test a small practice in everyday life.</p></div>
    {!chart?<div className="journey-welcome"><p>Your birth date, exact time and place establish the wheel position of your Personality Sun in Tropical. Four distinct charts apply their own offsets from that reference.</p><p>Your companion uses that configuration together with what you choose to share about your life.</p><a className="journey-start" href="#birth-information">Begin with my birth chart →</a></div>:<>
      <p className="journey-reference">Personality Sun in Tropical · {chart.birth_anchor.tropical_sun.longitude.toFixed(6)}° · Gate {chart.birth_anchor.tropical_sun.gate}.{chart.birth_anchor.tropical_sun.line}</p>
      {loading&&<p>Opening your saved journey…</p>}
      {state&&<>
        <details open={!state.profile}><summary>Get to know yourself · Three short rounds</summary><p>These questions come from your supplied life-planning interview. Keep answers brief, or leave a field blank. Missing details stay unknown.</p>
          <div className="story-paths">{state.story_paths.map(p=><button key={p.id} type="button" aria-pressed={path===p.id} onClick={()=>setPath(p.id)}>{p.label}</button>)}</div>
          {path&&<p className="story-line">{state.story_paths.find(p=>p.id===path)?.text}</p>}
          <form onSubmit={saveRound} className="birth-form"><fieldset disabled={busy}><legend>Round {round+1} of 3 · {['Where you are','Where you want to go','What supports or interrupts you'][round]}</legend>
            {state.questions.slice(round*4,round*4+4).map(q=><label key={q.id} htmlFor={`journey-${q.id}`}>{q.label}<span>{q.prompt}</span><textarea id={`journey-${q.id}`} value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})} maxLength={2000}/></label>)}
          </fieldset><div className="journey-actions">{round>0&&<button type="button" onClick={()=>setRound(round-1)} disabled={busy}>Previous round</button>}<button disabled={busy}>{round===2?"Save my priorities":"Save and continue"}</button></div></form>
          {state.profile_revision_count>0&&<small>{state.profile_revision_count} saved revision{state.profile_revision_count===1?"":"s"}; earlier answers remain in the history.</small>}
        </details>
        {state.profile&&<section className="journey-priority"><h3>Your direction, in your words</h3><p><strong>Priority:</strong> {state.profile.answers.q5||"You have not chosen one yet."}</p><p><strong>What progress looks like:</strong> {state.profile.answers.q6||"Add a concrete picture in the second round."}</p>{state.profile.answers.q12&&<p><strong>This quarter:</strong> {state.profile.answers.q12}</p>}<button type="button" disabled={busy} onClick={()=>onAsk("Help me understand my saved priorities alongside my four offset charts. Suggest one small voluntary practice and explain what would support or contradict its usefulness. Treat my reported experience as primary evidence about my life.")}>Discuss my direction with my companion</button></section>}
        <details><summary>Choose a practice · Commit before observing</summary><p>The reflection prompts come from the original Self-Discovery game. Their selection is tied to your chart; whether a practice helps is something to observe.</p>
          <form onSubmit={startPractice} className="birth-form"><label>Reflection area<select value={optionId} onChange={e=>{setOptionId(e.target.value);setPrompt(state.practice_options.find(o=>o.id===e.target.value)?.selected_prompt||"");}}>{state.practice_options.map(o=><option value={o.id} key={o.id}>{o.title}</option>)}</select></label>
            <label>Reflection prompt<select value={prompt} onChange={e=>setPrompt(e.target.value)}>{state.practice_options.find(o=>o.id===optionId)?.prompts.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
            <label>What will you actually try?<textarea name="action" required maxLength={2000} placeholder="One small, voluntary action…"/></label>
            <label>What observable result do you expect?<textarea name="expected" required maxLength={2000} placeholder="Name a result you can notice or measure."/></label>
            <label>What would contradict your expectation?<textarea name="counterevidence" required maxLength={2000} placeholder="What result would make you reconsider?"/></label>
            <label>Observation window closes<input name="deadline" type="datetime-local" defaultValue={tomorrow()} required/></label>
            <button disabled={busy||!prompt}>Commit my practice</button>
          </form>
        </details>
        {state.practices.length>0&&<details open><summary>Record what happened</summary><label className="journey-practice-select">Practice<select value={activePractice} onChange={e=>setActivePractice(e.target.value)}>{state.practices.map(p=><option value={p.id} key={p.id}>{p.title} · {p.action.slice(0,65)}</option>)}</select></label>
          {active&&<div className="practice-commitment"><h3>{active.prompt}</h3><p><strong>Planned action:</strong> {active.action}</p><p><strong>Expected:</strong> {active.expected}</p><p><strong>Would contradict:</strong> {active.counterevidence}</p><small>Observation window: {new Date(active.deadline).toLocaleString()}</small></div>}
          <form onSubmit={observe} className="birth-form"><label>Situation<textarea name="situation" required maxLength={4000}/></label><label>What I actually did<textarea name="action_taken" required maxLength={4000}/></label><label>What I observed<textarea name="result" required maxLength={4000}/></label><label>My assessment<select name="assessment" defaultValue="unclear"><option value="unclear">Unclear so far</option><option value="supported">Supports my expectation</option><option value="contradicted">Contradicts my expectation</option><option value="mixed">Mixed</option><option value="not_tested">I did not test it</option></select></label><button disabled={busy||!activePractice}>Save observation</button></form>
        </details>}
        {state.observations.length>0&&<section aria-label="Cultivation observations"><h3>Your observation history</h3><p>These are your reports. A supportive result does not by itself validate a chart interpretation.</p>{state.observations.slice(-8).reverse().map(o=><article className="observation-card" key={o.id}>
          <small>{new Date(o.created_at).toLocaleString()} · {o.assessment.replaceAll("_"," ")}</small><p><strong>Situation:</strong> {o.situation}</p><p><strong>Action:</strong> {o.action_taken}</p><p><strong>Observed:</strong> {o.result}</p>
          <button type="button" onClick={()=>onAsk(`Help me reflect on this recorded observation without changing its facts. Situation: ${o.situation}\nAction: ${o.action_taken}\nObserved result: ${o.result}\nMy assessment: ${o.assessment}. Explain possible interpretations, alternatives, and a useful next test.`)}>Discuss this observation</button>
          {state.interpretations.filter(i=>i.parent_id===o.id).map(i=><div className="later-interpretation" key={i.id}><small>Later interpretation · {new Date(i.created_at).toLocaleString()}</small><p>{i.text}</p></div>)}
          <details><summary>Add a later interpretation</summary><form onSubmit={e=>void interpret(e,o.id)} className="birth-form"><label>My interpretation<textarea name="interpretation" required maxLength={4000}/></label><button disabled={busy}>Append interpretation</button></form></details>
        </article>)}</section>}
      </>}
    </>}
    {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
