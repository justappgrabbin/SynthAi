import type { SavedChartResponse } from "../api";
import { useEffect, useMemo, useState } from "react";
import { MemStorage } from "./storage";
import type { GameState, Datababy } from "./types";
const categories: Datababy["category"][] = ["identity", "purpose", "connection", "strength", "dream"];
export default function Cultivation({chart}: {chart:SavedChartResponse|null}) {
  const anchor = chart?.birth_anchor;
  const configurationId = anchor?.configuration_id;
  const storageKey = configurationId ? "synthia.cultivation.v2." + configurationId : null;
  const storage = useMemo(() => anchor ? new MemStorage(anchor) : null, [configurationId]);
  const [game, setGame] = useState<GameState | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { setGame(null); setError(""); if(!storage || !storageKey) return; let active = true; (async () => {
    try { const saved = localStorage.getItem(storageKey);
      const fresh = await storage.createGame("Explorer");
      const next = saved ? await storage.updateGame(fresh.playerId, {...JSON.parse(saved), playerId:fresh.playerId}) : fresh;
      if (active && next) setGame(next);
    } catch { if(active) setError("Saved progress could not be loaded. Clear progress to restart."); }
  })(); return () => { active = false; }; }, [storage, storageKey]);
  async function collect(category: Datababy["category"]) {
    if(!game || !storage) return;
    const result = await storage.collectDatababy(game.playerId, category);
    if(result) save(result.gameState);
  }
  async function fuse() { if(!game || !storage) return; const result = await storage.fuseGeneGnome(game.playerId); if(result) save(result.gameState); }
  function save(next: GameState) { setGame(next); try {localStorage.setItem(storageKey!, JSON.stringify(next));} catch {setError("Storage is full; this session's progress is not saved.");} }
  return <details className="panel"><summary>Self-discovery · Cultivation playground</summary>
    <p>Your natal tropical Sun and birth configuration determine the fragment sequence. Combine 13 into a Gene Gnome. This chart-to-game rule is experimental; rewards are not measurements of mental health or genetic changes.</p>
    {!chart && <p>Generate your birth chart first. The game needs your birth date, exact time, and place; it does not create random personality values.</p>}
    {anchor && <p>Anchor: tropical Sun {anchor.tropical_sun.longitude.toFixed(6)}° · Gate {anchor.tropical_sun.gate}.{anchor.tropical_sun.line}</p>}
    {error && <p role="alert">{error}</p>}
    {game && <><p>Level {game.level} · {game.datababies.length}/13 fragments ready · {game.geneGnomes.length} Gene Gnomes</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{categories.map(c => <button key={c} onClick={() => collect(c)}>Explore {c}</button>)}</div>
      <p>{game.datababies.map(d => d.fragment).join(" · ") || "Choose a reflection category to begin."}</p>
      <button disabled={game.datababies.length < 13} onClick={fuse}>Fuse 13 fragments</button>
      {game.geneGnomes.slice(-3).map(g => <p key={g.id}><strong>{g.archetype}</strong> · {g.sentence}</p>)}
      <p>What does this expression mean to you today? Discuss it with your chart-grounded agent below. The agent is available independently of game level.</p></>}
    <button disabled={!storageKey} onClick={async () => {if(storageKey && storage){localStorage.removeItem(storageKey);setGame(await storage.createGame("Explorer"));}}}>Clear this chart’s game progress</button>
  </details>;
}
