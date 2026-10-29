import CultivationJourney from "./CultivationJourney";
import ResonanceConnections from "./ResonanceConnections";
import PredictionLog from "./PredictionLog";
import SystemQuestions from "./SystemQuestions";
import Cultivation from "./cultivation/Cultivation";
import ResearchTests from "./ResearchTests";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  askQuestion,
  ChartCreateInput,
  createChart,
  createInterpretationMap,
  GeonatalResponse,
  InterpretationMapItem,
  InterpretationMapResponse,
  SavedChartResponse
} from "./api";
import "./styles.css";

const mapTabs = [
  { key: "body", label: "Body Map", hint: "Response, energy, and conditioning" },
  { key: "wealth", label: "Wealth Map", hint: "Resources, value, and boundaries" },
  { key: "talent", label: "Talent Map", hint: "Lines, channels, and key gates" },
  { key: "relationship", label: "Relationship Map", hint: "Connection, communication, and boundaries" },
  { key: "mission", label: "Mission Map", hint: "Direction, strategy, and life themes" },
  { key: "professional", label: "Chart Details", hint: "Centers, channels, and gates" }
];

const centerLabels: Record<string, string> = {
  head: "Head Center", ajna: "Ajna Center", throat: "Throat Center",
  g: "G Center", heart: "Heart Center", spleen: "Spleen Center",
  "solar-plexus": "Solar Plexus Center", sacral: "Sacral Center", root: "Root Center"
};

const channelLabels: Record<string, string> = {
  "01-08": "Inspiration", "02-14": "The Beat", "03-60": "Mutation",
  "04-63": "Logic", "05-15": "Rhythm", "06-59": "Intimacy",
  "07-31": "The Alpha", "09-52": "Concentration", "10-20": "Awakening",
  "10-34": "Exploration", "10-57": "Perfected Form", "11-56": "Curiosity",
  "12-22": "Openness", "13-33": "The Prodigal", "16-48": "The Wavelength",
  "17-62": "Acceptance", "18-58": "Judgment", "19-49": "Synthesis",
  "20-34": "Charisma", "20-57": "The Brainwave", "21-45": "The Money Line",
  "23-43": "Structuring", "24-61": "Awareness", "25-51": "Initiation",
  "26-44": "Surrender", "27-50": "Preservation", "28-38": "Struggle",
  "29-46": "Discovery", "30-41": "Recognition", "32-54": "Transformation",
  "34-57": "Power", "35-36": "Transitoriness", "37-40": "Community",
  "39-55": "Emoting", "42-53": "Maturation", "47-64": "Abstraction"
};

const gateLabels: Record<number, string> = Object.fromEntries(
  Array.from({ length: 64 }, (_, index) => [index + 1, `Gate ${index + 1}`])
);

const initialForm: ChartCreateInput = {
  user_name: "",
  gender: "",
  birth_date: "",
  birth_time: "",
  city: "",
  region: "",
  timezone_name: ""
};

type ChatLine = {
  role: "user" | "assistant";
  content: string;
};

export default function App() {
  const [form, setForm] = useState<ChartCreateInput>(initialForm);
  const [birthRegion, setBirthRegion] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [chart, setChart] = useState<SavedChartResponse | null>(null);
  const [geonatal, setGeonatal] = useState<GeonatalResponse | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [activeFrame, setActiveFrame] = useState<GeonatalResponse["placements"][number]["frame"]>("tropical");
  const [activeMap, setActiveMap] = useState("talent");
  const [mapPackage, setMapPackage] = useState<InterpretationMapResponse | null>(null);
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);
  const [coachingMode, setCoachingMode] = useState("chart");
  const [question, setQuestion] = useState("");
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [status, setStatus] = useState("Enter birth information to generate a chart and reading.");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const chatDockRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const selected = JSON.parse(localStorage.getItem("synthia.birth.configuration.v1") || "null");
        if (!selected?.chart_id) return;
        const response = await fetch((import.meta.env.VITE_API_BASE_URL ?? "") + "/api/charts/" + encodeURIComponent(selected.chart_id));
        if (!response.ok) return;
        const restored = await response.json() as SavedChartResponse;
        const map = await createInterpretationMap(restored.chart_id, "talent");
        if (!active) return;
        setChart(restored); setGeonatal(restored.geonatal); setForm(restored.birth_profile);
        setLatitude(String(restored.birth_anchor.location.latitude)); setLongitude(String(restored.birth_anchor.location.longitude));
        setMapPackage(map); setOpenItemKey(firstItemKey(map)); setStatus("Restored your master birth chart.");
      } catch { if (active) setStatus("Enter birth information to restore your chart; saved game progress stays separate."); }
    })();
    return () => { active = false; };
  }, []);

  async function handleCreateChart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus("Generating your Human Design chart...");
    try {
      const nextChart = await createChart({
        ...form,
        latitude: Number(latitude),
        longitude: Number(longitude),
        city: birthCity || form.city,
        region: birthRegion || form.region,
        timezone_name: form.timezone_name || "UTC"
      });
      const nextGeonatal = nextChart.geonatal;
      const nextMap = await createInterpretationMap(nextChart.chart_id, activeMap);
      setChart(nextChart);
      localStorage.setItem("synthia.birth.configuration.v1", JSON.stringify({chart_id:nextChart.chart_id,birth_anchor:nextChart.birth_anchor}));
      setGeonatal(nextGeonatal);
      setMapPackage(nextMap);
      setOpenItemKey(firstItemKey(nextMap));
      setChatLines([]);
      setChatSessionId(undefined);
      setStatus("Generated. Explore any section or ask a question.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setStatus("A formal chart requires a birth date, exact time, and location.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMapChange(mapType: string) {
    setActiveMap(mapType);
    if (!chart) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextMap = await createInterpretationMap(chart.chart_id, mapType);
      setMapPackage(nextMap);
      setOpenItemKey(firstItemKey(nextMap));
      setStatus(`Viewing ${mapTabs.find((item) => item.key === mapType)?.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The map could not be generated.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chart || !question.trim()) {
      return;
    }
    const nextQuestion = question.trim();
    setQuestion("");
    await sendQuestion(nextQuestion, openItemKey ?? undefined);
  }

  async function sendQuestion(nextQuestion: string, mapItemKey?: string, entrySource?: string) {
    if (!chart || !nextQuestion.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await askQuestion(chart.chart_id, nextQuestion.trim(), chatSessionId, activeMap, mapItemKey, entrySource, coachingMode);
      setChatSessionId(response.session_id);
      setChatLines(response.session.messages);
      setStatus("Answered. You can continue the conversation.");
      window.setTimeout(() => chatDockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The answer could not be generated. Please try again.");
      setQuestion(nextQuestion);
    } finally {
      setLoading(false);
    }
  }

  function handleBirthRegionChange(nextRegion: string) {
    setBirthRegion(nextRegion);
    setBirthCity("");
    setForm({
      ...form,
      region: nextRegion,
      city: ""
    });
  }

  function handleBirthCityChange(nextCity: string) {
    setBirthCity(nextCity);
    setForm({
      ...form,
      region: birthRegion,
      city: nextCity
    });
  }

  function toggleMapItem(key: string) {
    const nextKey = openItemKey === key ? null : key;
    setOpenItemKey(nextKey);
    if (nextKey) {
      window.setTimeout(() => {
        document.querySelector(`[data-item-key="${nextKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  return (
    <main className="app-shell">
      {window.location.hostname === "appassets.androidplatform.net" && <section className="panel" role="status"><strong>Offline interface preview</strong><p>You can explore these screens and read all six research protocols. Use the Android Server settings menu to connect an HTTPS server for chart calculation, saved records, live connections and AI answers.</p><a href="/assets/index.html">Open server setup →</a></section>}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">HD</span>
          <div>
            <h1>Human Design Guide</h1>
              <p>V0.4 · Explore how body, talent, resources, relationships, and purpose connect.</p>
          </div>
        </div>
        <div className="topbar-note"><a href="/computer/">Computer &amp; Network →</a><br/>English · Chart-grounded · Non-deterministic</div>
      </header>
      {chart && <section className="panel"><strong>One birth configuration · Tropical Sun anchor</strong><p>Sun {chart.birth_anchor.tropical_sun.longitude.toFixed(6)}° · Gate {chart.birth_anchor.tropical_sun.gate}.{chart.birth_anchor.tropical_sun.line} · All four frames and the cultivation game use this same chart.</p><small>Configuration {chart.birth_anchor.configuration_id.slice(0,16)}</small></section>}
      <CultivationJourney chart={chart} onAsk={question=>{void sendQuestion(question);}} />
      <ResonanceConnections chart={chart} onAsk={question=>{void sendQuestion(question,undefined,"resonance_match");}} />
      <ResearchTests />
      <Cultivation chart={chart} />
      <SystemQuestions />
      <PredictionLog chart={chart} />

      <section className="workspace">
        <aside className="panel input-panel" id="birth-information">
          <div className="panel-heading">
            <h2>Birth Information</h2>
          </div>
          <form onSubmit={handleCreateChart} className="birth-form">
            <label htmlFor="user-name">
              Name
              <input
                id="user-name"
                value={form.user_name}
                onChange={(event) => setForm({ ...form, user_name: event.target.value })}
              />
            </label>
            <label htmlFor="gender">
              Gender
              <select
                id="gender"
                value={form.gender ?? ""}
                onChange={(event) => setForm({ ...form, gender: event.target.value as ChartCreateInput["gender"] })}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label htmlFor="birth-date">
              Birth date
              <input
                id="birth-date"
                required
                type="date"
                value={form.birth_date}
                onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
              />
            </label>
            <label htmlFor="birth-time">
              Birth time
              <input
                id="birth-time"
                required
                type="time"
                value={form.birth_time}
                onChange={(event) => setForm({ ...form, birth_time: event.target.value })}
              />
            </label>
            <label htmlFor="birth-timezone">
              Timezone
              <input
                id="birth-timezone"
                required
                value={form.timezone_name ?? ""}
                onChange={(event) => setForm({ ...form, timezone_name: event.target.value })}
                placeholder="IANA timezone, e.g. America/Los_Angeles"
              />
            </label>
            <div className="birth-place-group">
              <span className="birth-place-title">Birth location</span>
              <div className="form-grid">
                <label htmlFor="birth-region">
                  Region
                  <input
                    id="birth-region"
                    value={birthRegion}
                    onChange={(event) => handleBirthRegionChange(event.target.value)}
                    placeholder="State, province, or region"
                  />
                </label>
                <label htmlFor="birth-city">
                  City
                  <input
                    id="birth-city"
                    required
                    value={birthCity}
                    onChange={(event) => handleBirthCityChange(event.target.value)}
                    placeholder="City"
                  />
                </label>
              </div>
              <div className="form-grid">
                <label htmlFor="birth-latitude">
                  Latitude
                  <input
                    id="birth-latitude"
                    required
                    type="number"
                    min="-90"
                    max="90"
                    step="0.0001"
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                  />
                </label>
                <label htmlFor="birth-longitude">
                  Longitude
                  <input
                    id="birth-longitude"
                    required
                    type="number"
                    min="-180"
                    max="180"
                    step="0.0001"
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                  />
                </label>
              </div>
            </div>
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? "Generating..." : "Generate My Human Design"}
            </button>
          </form>
          <div className="precision-card">
            <strong>Chart accuracy</strong>
            <p>A formal chart requires a birth date, exact time, and location. A date alone supports guidance only.</p>
            <p>{status}</p>
            {error && <p className="error-text">{error}</p>}
          </div>
        </aside>

        <section className="graph-stage">
          <div className="stage-toolbar">
            <div>
              <h2>{chart?.user_name ? `${chart.user_name}'s Human Design` : "Your Human Design"}</h2>
              <p>{chart ? "These chart facts ground every interpretation that follows." : "Generate a chart to see type, strategy, authority, profile, centers, channels, and gates."}</p>
            </div>
            <div className="stage-actions">
              {chart && <span className="chart-id">V0.4</span>}
            </div>
          </div>

          {chart ? <ProfessionalSnapshot chart={chart} facts={mapPackage?.professional_facts ?? []} /> : <EmptySnapshot />}

          <div className="graph-canvas">
            {chart ? (
              <div className="svg-frame" dangerouslySetInnerHTML={{ __html: chart.bodygraph_svg }} />
            ) : (
              <EmptyGraph />
            )}
          </div>
          {geonatal && (
            <GeonatalPanel
              chart={geonatal}
              frame={activeFrame}
              onFrame={setActiveFrame}
            />
          )}
        </section>

        <aside className="panel reading-panel">
          <div className="panel-heading">
            <h2>Interpretation Maps</h2>
            <span>{mapPackage ? mapTabs.find((item) => item.key === activeMap)?.label : "Not generated"}</span>
          </div>
          <div className="map-tabs">
            {mapTabs.map((tab) => (
              <button
                key={tab.key}
                className={activeMap === tab.key ? "active" : ""}
                onClick={() => handleMapChange(tab.key)}
                type="button"
              >
                <strong>{tab.label}</strong>
                <span>{tab.hint}</span>
              </button>
            ))}
          </div>
          {mapPackage ? (
            <InterpretationMapPanel
              mapPackage={mapPackage}
              openItemKey={openItemKey}
              onToggle={toggleMapItem}
              onFollowup={(nextQuestion, itemKey) => {
                setOpenItemKey(itemKey ?? null);
                void sendQuestion(nextQuestion, itemKey, "followup_button");
              }}
            />
          ) : (
            <div className="map-empty">
              <strong>Six maps will appear here</strong>
              <span>Explore body, talent, wealth, relationships, mission, or ask a direct question.</span>
            </div>
          )}
        </aside>
      </section>

      <section className="chat-dock" ref={chatDockRef}>
        <div className="chat-heading">
          <div>
            <h2>Human Design Guide</h2>
            <p>Your cultivated-self simulation · Ollama or llamafile · Interpretations are hypotheses.</p>
          </div>
        </div>
        <label className="coaching-mode">Guidance style <select value={coachingMode} onChange={e => setCoachingMode(e.target.value)}><option value="chart">Chart-grounded guide</option><option value="reflection">Reflective companion</option><option value="career">Career coaching</option><option value="startup">Project and startup coaching</option><option value="spiritual">Contemplative practice</option></select></label>
        <div className="chat-history">
          {chatLines.length === 0 ? (
            <div className="chat-empty">
              <strong>Start with a real question</strong>
              <span>For example: Why am I drained lately? Should I take this project? How can my talents be recognized?</span>
            </div>
          ) : (
            chatLines.map((line, index) => (
              <article key={`${line.role}-${index}`} className={`chat-line ${line.role}`}>
                <span>{line.role === "user" ? "You" : "Guide"}</span>
                <MarkdownView text={line.content} compact={false} />
              </article>
            ))
          )}
        </div>
        <form className="chat-form" onSubmit={handleAsk}>
          <input
            disabled={!chart || loading}
            value={question}
            placeholder={chart ? "Ask what feels stuck, what you are choosing, or what is happening in a relationship..." : "Generate a Human Design chart first"}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <button disabled={!chart || loading || !question.trim()} type="submit">
            Ask
          </button>
        </form>
      </section>
    </main>
  );
}

const frameLabels: Record<GeonatalResponse["placements"][number]["frame"], string> = {
  tropical: "Tropical",
  draconic_tropical_true: "Draconic Tropical — True Node",
  draconic_tropical_mean: "Draconic Tropical — Mean Node",
  sidereal_fagan_bradley: "Sidereal — Fagan–Bradley"
};

const zodiacLabels = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

function formattedPosition(item: GeonatalResponse["placements"][number]): string {
  const fractionalSeconds = `${item.second}.${String(item.arc).padStart(2, "0")}`;
  return `${item.degree}°${item.minute}′${fractionalSeconds}″`;
}

function GeonatalPanel({
  chart,
  frame,
  onFrame
}: {
  chart: GeonatalResponse;
  frame: GeonatalResponse["placements"][number]["frame"];
  onFrame: (value: GeonatalResponse["placements"][number]["frame"]) => void;
}) {
  const selectedChart = chart.charts[frame];
  const placements = selectedChart.personality;
  return (
    <section className="geonatal-panel">
      <div className="geonatal-heading">
        <div>
          <h3>Your Four Charts</h3>
          <p>Shared anchor: Personality Sun in Tropical {selectedChart.personalityTropicalSunAnchor.toFixed(6)}°. The original wheel position stays fixed; each chart applies its own offset from that reference.</p>
        </div>
        <span>Applied offset: −{selectedChart.personalityOffsetDegrees.toFixed(6)}° · wrapped to 0–360°</span>
      </div>
      <div className="geonatal-controls">
        <select aria-label="Chart" value={frame} onChange={(event) => onFrame(event.target.value as typeof frame)}>
          {Object.entries(frameLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>
      <div className="geonatal-table-wrap">
        <table className="geonatal-table">
          <thead>
            <tr>
              <th>Planet</th><th>G.L.C.T.B</th><th>Position</th><th>Zodiac</th><th>House</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((item) => (
              <tr key={`${item.orientation}-${item.planetary}-${item.frame}`}>
                <td>{item.planetary}</td>
                <td>{item.gate}.{item.line}.{item.color}.{item.tone}.{item.base}</td>
                <td>{formattedPosition(item)}</td>
                <td>{zodiacLabels[item.zodiac - 1] ?? `Z${item.zodiac}`}</td>
                <td>H{item.house}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ProfessionalSnapshot({ chart, facts }: { chart: SavedChartResponse; facts: string[] }) {
  const summary = chart.display_summary;
  const definedCenters = chart.chart.centers.filter((center) => center.defined).map((center) => centerLabels[center.code] ?? center.label);
  const openCenters = chart.chart.centers.filter((center) => !center.defined).map((center) => centerLabels[center.code] ?? center.label);
  const channels = chart.chart.channels.map((channel) => `${channel.code} ${channelLabels[channel.code] ?? channel.label}`);
  const gates = chart.chart.activated_gates.map((gate) => gateLabels[gate.gate] ?? `Gate ${gate.gate}`).slice(0, 24);
  const coreFacts = [
    ["Type", chart.chart.summary.type.label],
    ["Strategy", chart.chart.summary.strategy.label],
    ["Authority", chart.chart.summary.authority.label],
    ["Profile", chart.chart.summary.profile.label],
    ["Definition", chart.chart.summary.definition.label],
    ["Incarnation Cross", chart.chart.summary.incarnation_cross.label]
  ];
  return (
    <div className="snapshot">
      <div className="snapshot-grid">
        {coreFacts.map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="fact-rails">
        <FactRail title="Defined Centers" items={definedCenters} />
        <FactRail title="Open Centers" items={openCenters} />
        <FactRail title="Channels" items={channels} />
        <FactRail title="Gates" items={gates} />
      </div>
      {facts.length > 0 && (
        <details className="professional-facts">
          <summary>Chart Details</summary>
          <p>Detailed interpretation text is presented in English in the map sections below.</p>
        </details>
      )}
    </div>
  );
}

function FactRail({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="fact-rail">
      <span>{title}</span>
      <p>{items.length > 0 ? items.join(", ") : "None"}</p>
    </div>
  );
}

function InterpretationMapPanel({
  mapPackage,
  openItemKey,
  onToggle,
  onFollowup
}: {
  mapPackage: InterpretationMapResponse;
  openItemKey: string | null;
  onToggle: (key: string) => void;
  onFollowup: (question: string, itemKey?: string) => void;
}) {
  return (
    <div className="map-panel">
      <div className="map-intro">
        <h3>{mapTabs.find((item) => item.key === mapPackage.map_type)?.label ?? "Interpretation Map"}</h3>
        <p>Chart-grounded observations organized by structure, expression, blind spots, and practical experiments.</p>
      </div>
      {mapPackage.sections.map((section, sectionIndex) => (
        <section key={section.key} className="map-section">
          <div className="map-section-heading">
            <h4>{englishSectionTitle(mapPackage.map_type, sectionIndex)}</h4>
            <p>{englishSectionIntro(mapPackage.map_type)}</p>
          </div>
          {section.items.map((item) => (
            <MapItemCard
              key={item.key}
              item={item}
              open={openItemKey === item.key}
              onToggle={() => onToggle(item.key)}
              onFollowup={(nextQuestion) => onFollowup(nextQuestion, item.key)}
            />
          ))}
        </section>
      ))}
      <div className="followup-block">
        <strong>Continue the conversation</strong>
        {englishSuggestedQuestions(mapPackage.map_type).map((item) => (
          <button key={item} type="button" onClick={() => onFollowup(item, openItemKey ?? undefined)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function MapItemCard({
  item,
  open,
  onToggle,
  onFollowup
}: {
  item: InterpretationMapItem;
  open: boolean;
  onToggle: () => void;
  onFollowup: (question: string) => void;
}) {
  return (
    <article className={open ? "map-item open" : "map-item"} data-item-key={item.key}>
      <button type="button" onClick={onToggle}>
        <div>
          <strong>{englishItemTitle(item)}</strong>
          <span>{englishItemSubtitle(item)}</span>
        </div>
        <b>{open ? "Close" : "Open"}</b>
      </button>
      {open && (
        <div className="map-item-body">
          <button type="button" onClick={() => onFollowup("Explain all the original details for this selected item in English: its chart basis, embodied expression, blind spots, stuck patterns, causes, and practices. Preserve the source distinctions and tell me which claims are untested. Item key: " + item.key)}>Explain the detailed source in English</button>
          <InfoBlock title="Chart Basis" items={englishChartBasis(item)} />
          <section>
            <h5>Why this matters</h5>
            <p>{englishProfessionalBasis(item)}</p>
          </section>
          <section>
            <h5>What it can mean</h5>
            <p>{englishUserLanguage(item)}</p>
          </section>
          <InfoBlock title="Embodied Expression" items={englishEmbodied(item)} />
          <InfoBlock title="Blind Spots" items={englishBlindSpots(item)} />
          <InfoBlock title="When It Feels Stuck" items={englishStuck(item)} />
          <InfoBlock title="Why It Gets Stuck" items={englishCauses(item)} />
          <InfoBlock title="Experiments" items={englishPractices(item)} />
          {englishItemQuestions(item).length > 0 && (
            <section className="item-followups">
              <h5>Follow-up Questions</h5>
              {englishItemQuestions(item).map((nextQuestion) => (
                <button key={nextQuestion} type="button" onClick={() => onFollowup(nextQuestion)}>
                  {nextQuestion}
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </article>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section>
      <h5>{title}</h5>
      {items.map((item) => (
        <p key={item}>• {item}</p>
      ))}
    </section>
  );
}

function itemTheme(item: InterpretationMapItem): string {
  return item.key.split(/[._-]/).filter(Boolean).slice(-3).join(" ");
}

function englishItemTitle(item: InterpretationMapItem): string {
  const theme = itemTheme(item);
  return theme ? theme.replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Chart Pattern";
}

function englishItemSubtitle(item: InterpretationMapItem): string {
  return `A ${item.diagnosis_depth === "deep" ? "deep" : "focused"} view of how this pattern operates in your chart.`;
}

function englishChartBasis(item: InterpretationMapItem): string[] {
  const source = [item.title, item.subtitle, ...item.chart_basis].join(" ");
  const codes = Array.from(new Set(source.match(/\b(?:[0-6]?\d-[0-6]?\d|[1-6]\/[1-6]|Gate\s*\d+|\d+号|\d+闸门)\b/gi) ?? []))
    .map((value) => value.replace(/号|闸门/g, "").replace(/^(\d+)$/, "Gate $1"));
  return codes.length ? codes : [`Chart pattern: ${itemTheme(item) || "integrated structure"}`];
}

function englishProfessionalBasis(item: InterpretationMapItem): string {
  return `This interpretation combines the chart structures connected to ${itemTheme(item) || "this theme"} rather than treating one gate, center, or line in isolation.`;
}

function englishUserLanguage(item: InterpretationMapItem): string {
  return `This framework proposes a way to notice how your energy, attention, relationships, and choices interact around ${itemTheme(item) || "the current theme"}.`;
}

function englishEmbodied(item: InterpretationMapItem): string[] {
  return [`You can observe this pattern through repeatable body signals, real decisions, and the quality of your interactions.`];
}

function englishBlindSpots(item: InterpretationMapItem): string[] {
  return [`A blind spot appears when mental certainty replaces direct observation of your body's response and the actual context.`];
}

function englishStuck(item: InterpretationMapItem): string[] {
  return [`The pattern may feel stuck when you force timing, overcommit, or try to prove an identity before the situation is clear.`];
}

function englishCauses(item: InterpretationMapItem): string[] {
  return [`Conditioning, urgency, and incomplete context can pull this chart pattern away from its natural proportion.`];
}

function englishPractices(item: InterpretationMapItem): string[] {
  return [`Track one real situation for seven days: what happened, what your body signaled, what you chose, and what followed.`];
}

function englishItemQuestions(item: InterpretationMapItem): string[] {
  return [`Where is ${itemTheme(item) || "this pattern"} showing up most clearly in your life right now?`];
}

function englishSectionTitle(mapType: string, index: number): string {
  const labels: Record<string, string[]> = {
    body: ["Body Response", "Energy and Conditioning", "Practical Integration"],
    wealth: ["Resource Flow", "Value and Boundaries", "Sustainable Practice"],
    talent: ["Natural Capacities", "Expression and Recognition", "Talent Experiments"],
    relationship: ["Connection Patterns", "Communication and Boundaries", "Relational Practice"],
    mission: ["Direction and Purpose", "Life Themes", "Grounded Expression"],
    professional: ["Core Configuration", "Centers and Channels", "Technical Detail"]
  };
  return labels[mapType]?.[index] ?? `Perspective ${index + 1}`;
}

function englishSectionIntro(mapType: string): string {
  return `This section reads the ${mapType} perspective through connected chart structures and observable experience.`;
}

function englishSuggestedQuestions(mapType: string): string[] {
  return [
    `What is the clearest ${mapType} pattern in my chart?`,
    `How can I test this pattern in a real situation?`,
    `What conditioning might distort this part of my design?`
  ];
}

function MarkdownView({ text, compact = false }: { text: string; compact?: boolean }) {
  const nodes = text
    .split("\n")
    .map(normalizeChatLine)
    .filter((line) => line.text.length > 0);
  return (
    <div className={compact ? "markdown compact" : "markdown"}>
      {nodes.slice(0, compact ? 18 : 80).map((line, index) => {
        const isLastQuestion = index === nodes.length - 1 && /[？?]$/.test(line.text);
        return (
          <p key={index} className={[line.kind === "bullet" ? "bullet" : "", isLastQuestion ? "dialogue-question" : ""].filter(Boolean).join(" ") || undefined}>
            {renderInlineMarkdown(line.text)}
          </p>
        );
      })}
    </div>
  );
}

function normalizeChatLine(line: string): { text: string; kind?: "bullet" } {
  let clean = line.trim();
  let kind: "bullet" | undefined;
  if (!clean || /^```/.test(clean)) {
    return { text: "" };
  }
  clean = clean.replace(/^#{1,6}\s+/, "");
  clean = clean.replace(/^>\s+/, "");
  if (/^([-*•·]|[0-9]+[.)、])\s+/.test(clean)) {
    kind = "bullet";
    clean = clean.replace(/^([-*•·]|[0-9]+[.)、])\s+/, "");
  }
  clean = clean.replace(/`([^`]+)`/g, "$1").replace(/```/g, "").trim();
  return { text: clean, kind };
}

function renderInlineMarkdown(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part.replace(/\*\*/g, "")}</span>;
    });
}

function EmptySnapshot() {
  return (
    <div className="snapshot empty-snapshot">
      <strong>Your core chart appears here</strong>
      <p>Type, strategy, authority, profile, incarnation cross, centers, channels, and gates will be shown.</p>
    </div>
  );
}

function EmptyGraph() {
  return (
    <div className="empty-graph">
      <div className="orbit one" />
      <div className="orbit two" />
      <div className="empty-centers">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>Your BodyGraph will appear here</p>
    </div>
  );
}

function firstItemKey(mapPackage: InterpretationMapResponse): string | null {
  return mapPackage.sections[0]?.items[0]?.key ?? null;
}
