import { FormEvent, useEffect, useState } from "react";
import { ApiError, requestJson, SavedChartResponse } from "./api";

type Settings = {discoverable:boolean; intents:string[]; interests:string[]; chart_id:string|null};
type Resonance = {overall:number;sharedGates:number[];electromagneticChannels:string[];fields:Array<{field:string;resonance:number;type:string}>};
type Match = {member_id:number;name:string;shared_intents:string[];shared_interests:string[];true_node:Resonance;mean_node:Resonance;can_invite:boolean;invitation_status:string|null;reason:string};
type Invitation = {id:string;status:string;direction:string;other_name:string;other_member_id:number;consent_kind:string|null};
const purposes = [{id:"conversation",label:"Conversation"},{id:"collaboration",label:"Collaboration"},{id:"shared_practice",label:"Shared practice"},{id:"research",label:"Research"}];
const score = (value:number) => `${(value*100).toFixed(1)} / 100`;

export default function ResonanceConnections({chart,onAsk}:{chart:SavedChartResponse|null;onAsk:(question:string)=>void}) {
  const [member,setMember]=useState<{id:number;name:string}|null>(null);
  const [settings,setSettings]=useState<Settings|null>(null);
  const [intents,setIntents]=useState<string[]>(["conversation"]);
  const [interests,setInterests]=useState("");
  const [matches,setMatches]=useState<Match[]>([]);
  const [invitations,setInvitations]=useState<Invitation[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[ready,setReady]=useState(false);

  async function refresh() {
    const state=await requestJson<{member:{id:number;name:string};profile:Settings}>("/api/resonance-network/profile");
    setMember(state.member);setSettings(state.profile);
    setIntents(state.profile.intents.length?state.profile.intents:["conversation"]);setInterests(state.profile.interests.join(", "));
    const [people,links]=await Promise.all([
      requestJson<{matches:Match[]}>("/api/resonance-network/matches"),
      requestJson<{invitations:Invitation[]}>("/api/resonance-network/invitations")
    ]);
    setMatches(people.matches);setInvitations(links.invitations);
  }
  useEffect(()=>{let active=true;(async()=>{
    try {const state=await requestJson<{member:{id:number;name:string};profile:Settings}>("/api/resonance-network/profile");if(!active)return;setMember(state.member);setSettings(state.profile);setIntents(state.profile.intents.length?state.profile.intents:["conversation"]);setInterests(state.profile.interests.join(", "));
      const [people,links]=await Promise.all([requestJson<{matches:Match[]}>("/api/resonance-network/matches"),requestJson<{invitations:Invitation[]}>("/api/resonance-network/invitations")]);if(active){setMatches(people.matches);setInvitations(links.invitations);}
    } catch(e){if(active && !(e instanceof ApiError && e.status===401))setError(e instanceof Error?e.message:"Could not load discovery.");}
    finally{if(active)setReady(true);}
  })();return()=>{active=false;};},[chart?.chart_id]);

  async function mutate(action:()=>Promise<unknown>) {setBusy(true);setError("");try{await action();await refresh();}catch(e){setError(e instanceof Error?e.message:"Could not update your connection.");}finally{setBusy(false);}}
  function publish(e:FormEvent) {e.preventDefault();if(chart)void mutate(()=>requestJson("/api/resonance-network/profile",{chart_id:chart.chart_id,discoverable:true,intents,interests:interests.split(",").map(s=>s.trim()).filter(Boolean)},"PUT"));}
  return <details className="panel resonance-connections" id="resonance-connections" open>
    <summary>Connect by resonance</summary>
    <p>Meet members who have chosen a shared purpose. Resonance is an experimental chart-similarity model; a suggestion becomes a connection only after an invitation is accepted.</p>
    {!ready?<p>Loading your network…</p>:!member?<p><a href="/computer/">Sign in or create your network account →</a><br/>Return here to choose whether your chart participates in discovery.</p>:<>
      <p>Signed in as <strong>{member.name}</strong> · Discovery is <strong>{settings?.discoverable?"on":"off"}</strong>.</p>
      {!chart?<p>Create your birth chart before joining discovery.</p>:<form onSubmit={publish} className="birth-form">
        <fieldset><legend>What are you open to?</legend><div className="connection-purposes">{purposes.map(p=><label key={p.id}><input type="checkbox" checked={intents.includes(p.id)} onChange={e=>setIntents(e.target.checked?[...intents,p.id]:intents.filter(i=>i!==p.id))}/>{p.label}</label>)}</div></fieldset>
        <label>Interests, separated by commas<input value={interests} onChange={e=>setInterests(e.target.value)} maxLength={1000} placeholder="Music, gardening, learning…"/></label>
        <p>Your name, connection purposes, shared gates and model scores can appear to other opted-in members. Birth date, time and place, interview answers, private observations and chat are not included in match responses.</p>
        <button disabled={busy || intents.length===0} type="submit">{settings?.discoverable?"Update my resonance profile":"Join resonance discovery"}</button>

        {settings?.discoverable&&settings.chart_id!==chart.chart_id&&<p>The network currently uses a different saved chart. Updating will link the chart selected here.</p>}
      </form>}
      {settings?.discoverable&&<button disabled={busy} type="button" onClick={()=>void mutate(()=>requestJson("/api/resonance-network/withdraw",{}))}>Leave resonance discovery</button>}
      {settings?.discoverable&&<section aria-label="Resonance matches"><h3>Your resonance suggestions</h3><button disabled={busy} type="button" onClick={()=>void mutate(async()=>{})}>Refresh suggestions</button>
        {matches.length===0?<p>No opted-in members with a shared purpose yet. Real matches will appear as people join.</p>:matches.map(match=><article className="connection-card" key={match.member_id}>
          <h4>{match.name}</h4><p>Shared purpose: {match.shared_intents.map(s=>s.replaceAll("_"," ")).join(", ")}</p>
          <div className="connection-scores"><span>True-node model <strong>{score(match.true_node.overall)}</strong></span><span>Mean-node check <strong>{score(match.mean_node.overall)}</strong></span></div>
          {match.shared_interests.length>0&&<p>Shared interests: {match.shared_interests.join(", ")}</p>}
          <details><summary>Why this suggestion?</summary><p>Shared gates: {match.true_node.sharedGates.map(g=>`G${g}`).join(", ")||"None"}.</p><p>The supplied nine-field model compares gate, line and waveform relationships. Scores describe this model, not the probability that you will get along.</p><ul>{match.true_node.fields.slice(0,3).map(field=><li key={field.field}>{field.field}: {field.type} · {score(field.resonance)}</li>)}</ul></details>
          <button disabled={busy||!match.can_invite} onClick={()=>void mutate(()=>requestJson("/api/resonance-network/invitations",{recipient_id:match.member_id}))}>{match.invitation_status?`Invitation: ${match.invitation_status}`:"Invite to connect"}</button>
          <button type="button" disabled={!chart||settings.chart_id!==chart.chart_id||busy} onClick={()=>onAsk("Help me understand this resonance suggestion. It is an experimental model score, not a measured relationship. Use only these shared facts; do not invent the other person's birth placements, intentions, or feelings: " + JSON.stringify({name:match.name,shared_purposes:match.shared_intents,shared_interests:match.shared_interests,true_node:match.true_node,mean_node:match.mean_node}) + ". Suggest a respectful question we could discuss and an observation that could contradict the suggestion.")}>Ask my companion about this suggestion</button>
          {!match.can_invite&&<small>{match.reason}</small>}
        </article>)}
      </section>}
      <section aria-label="Your invitations and connections"><h3>Invitations and connections</h3>{invitations.length===0?<p>No invitations yet.</p>:invitations.map(invitation=><article className="connection-card" key={invitation.id}>
        <strong>{invitation.other_name}</strong><p>{invitation.direction} · {invitation.status==="revoked"?"disconnected":invitation.status}</p>
        {invitation.direction==="incoming"&&invitation.status==="pending"&&<div className="connection-actions"><button disabled={busy} onClick={()=>void mutate(()=>requestJson(`/api/resonance-network/invitations/${encodeURIComponent(invitation.id)}/response`,{response:"accepted"}))}>Accept connection</button><button disabled={busy} onClick={()=>void mutate(()=>requestJson(`/api/resonance-network/invitations/${encodeURIComponent(invitation.id)}/response`,{response:"declined"}))}>Decline connection</button></div>}
        {invitation.status==="accepted"&&<div className="connection-actions"><a href={`/computer/?with=${invitation.other_member_id}`}>Open conversation →</a><button disabled={busy} onClick={()=>void mutate(()=>requestJson(`/api/resonance-network/invitations/${encodeURIComponent(invitation.id)}/response`,{response:"revoked"}))}>Disconnect</button></div>}
      </article>)}</section>
    </>}
    {error&&<p role="alert">{error}</p>}
  </details>;
}
