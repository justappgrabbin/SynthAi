const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type ChartCreateInput = {
  latitude?: number;
  longitude?: number;
  user_name?: string;
  gender?: "male" | "female" | "";
  birth_date: string;
  birth_time: string;
  city?: string;
  region?: string;
  country?: string;
  timezone_name?: string;
};

export type LabeledValue = {
  code: string;
  label: string;
};

export type ChartSummary = {
  type: LabeledValue;
  strategy: LabeledValue;
  authority: LabeledValue;
  profile: LabeledValue;
  definition: LabeledValue;
  signature: LabeledValue;
  not_self_theme: LabeledValue;
  incarnation_cross: LabeledValue;
};

export type CenterState = {
  code: string;
  label: string;
  defined: boolean;
};

export type ChannelState = {
  code: string;
  label: string;
  gates: [number, number];
  centers: [string, string];
};

export type HumanDesignChart = {
  birth_datetime_utc: string;
  summary: ChartSummary;
  centers: CenterState[];
  channels: ChannelState[];
  activated_gates: Array<{ gate: number; theme: string; center: string }>;
  input: {
    birth_datetime_local: string;
    timezone_name: string;
    warnings: string[];
  };
};

export type BirthAnchor = { configuration_id: string; reference: string; birth_utc: string; tropical_sun: {longitude:number;gate:number;line:number;color:number;tone:number;base:number}; location: {latitude:number;longitude:number} };
export type SavedChartResponse = {
  birth_profile: ChartCreateInput;
  birth_anchor: BirthAnchor;
  geonatal: GeonatalResponse;
  chart_id: string;
  user_name?: string;
  chart: HumanDesignChart;
  display_summary: {
    type: string;
    strategy: string;
    authority: string;
    profile: string;
    definition: string;
    signature: string;
    not_self_theme: string;
    incarnation_cross: string;
  };
  bodygraph_svg_url: string;
  bodygraph_svg: string;
  precision_warnings: string[];
};

export type BodyEnergyProfile = {
  headline: string;
  summary: string;
  defined_centers: string[];
  open_centers: string[];
  center_notes: Array<{
    code: string;
    label: string;
    state_label: string;
    body_resource: string;
    spiritual_resource: string;
    consumption_pattern: string;
    practice: string;
    observation_prompt: string;
  }>;
  channel_notes: Array<{
    code: string;
    label: string;
    centers: [string, string];
    body_flow: string;
    expression: string;
    practice: string;
  }>;
  energy_management: string[];
  suggested_questions: string[];
};

export type DeepSynthesisProfile = {
  headline: string;
  thesis: string;
  structure_formula: string;
  research_method_notes: string[];
  non_genericity_checks: string[];
  suggested_experiments: string[];
  research_sources: Array<{ kind: string; code: string; title: string; path: string }>;
};

export type InterpretationMapItem = {
  key: string;
  title: string;
  subtitle: string;
  diagnosis_depth: "deep" | "standard" | "trace";
  chart_basis: string[];
  professional_basis: string;
  user_language: string;
  life_scenes: string[];
  embodied_expression: string[];
  blind_spots: string[];
  stuck_patterns: string[];
  stuck_causes: string[];
  common_blocks: string[];
  practices: string[];
  followup_questions: string[];
  source_atom_ids: string[];
  sources: Array<{ kind: string; code: string; title: string; path: string }>;
};

export type InterpretationMapSection = {
  key: string;
  title: string;
  intro: string;
  items: InterpretationMapItem[];
};

export type InterpretationMapResponse = {
  generated_at_utc: string;
  product_version: string;
  map_type: string;
  title: string;
  description: string;
  chart_id?: string | null;
  professional_facts: string[];
  sections: InterpretationMapSection[];
  prompt_pack: {
    pack_id: string;
    map_type: string;
    system_prompt: string;
    retrieval_topics: string[];
    atom_ids: string[];
    rule_ids: string[];
  };
  retrieved_knowledge: Array<{
    atom_id: string;
    topic: string;
    user_translation: string;
    chart_keys: string[];
  }>;
  sources: Array<{
    source_id: string;
    title: string;
    author: string;
    language: string;
    source_type: string;
    url?: string | null;
    priority: string;
  }>;
  suggested_questions: string[];
};

export type ReportResponse = {
  report_id: string;
  chart_id: string;
  report_type: string;
  focus: string;
  depth: string;
  answer_markdown: string;
  suggested_followups: string[];
  body_energy?: BodyEnergyProfile | null;
  deep_synthesis?: DeepSynthesisProfile | null;
  export_markdown: string;
};

export type ChatResponse = {
  session_id: string;
  chart_id: string;
  focus: string;
  answer_markdown: string;
  answer_provider?: string;
  answer_model?: string | null;
  provider_configured?: boolean;
  entry_source?: string | null;
  synthesis_mode?: string | null;
  map_context?: {
    map_type: string;
    title: string;
    sections: InterpretationMapSection[];
    retrieved_knowledge: Array<{ atom_id: string; topic: string; user_translation: string }>;
  };
  suggested_followups: string[];
  session: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };
};

export type ReadingVisualResponse = {
  image_id: string;
  chart_id: string;
  provider: string;
  model?: string | null;
  prompt: string;
  image_url?: string | null;
  fallback_bodygraph_svg_url: string;
  provider_configured: boolean;
  created_at_utc: string;
};

export type GeonatalPlacement = {
  sourceTropicalLongitude: number;
  tropicalPersonalitySunAnchor: number;
  anchorRelativeLongitude: number;
  frameOffsetDegrees: number;
  planetary: string;
  dimension: "being" | "movement" | "evolution" | "design" | "space";
  frame: "tropical" | "sidereal_fagan_bradley" | "draconic_tropical_true" | "draconic_tropical_mean";
  orientation: "personality" | "design";
  longitude: number;
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
  degree: number;
  minute: number;
  second: number;
  arc: number;
  zodiac: number;
  house: number;
  ascendingSide: number;
};

export type GeonatalResponse = {
  timestamp: string;
  designTimestamp: string;
  houseMethod: "equal";
  trueNodeLongitude: number;
  faganBradleyAyanamsa: number;
  placements: GeonatalPlacement[];
  charts: Record<GeonatalPlacement["frame"], { frame: GeonatalPlacement["frame"]; personalityTropicalSunAnchor: number; personalityOffsetDegrees: number; designOffsetDegrees: number; personalityAscendantLongitude: number; designAscendantLongitude: number; personality: GeonatalPlacement[]; design: GeonatalPlacement[] }>;
  methods: Record<string, string>;
};

export async function createChart(input: ChartCreateInput): Promise<SavedChartResponse> {
  return postJson("/api/charts", input);
}

export async function createGeonatal(
  timestamp: string,
  latitude: number,
  longitude: number
): Promise<GeonatalResponse> {
  return postJson("/api/geonatal", { timestamp, latitude, longitude });
}

export async function createReport(
  chartId: string,
  reportType: string,
  question?: string
): Promise<ReportResponse> {
  return postJson("/api/reports", {
    chart_id: chartId,
    report_type: reportType,
    question
  });
}

export async function createInterpretationMap(
  chartId: string,
  mapType: string,
  depth = "deep"
): Promise<InterpretationMapResponse> {
  return postJson("/api/interpretation-maps", {
    chart_id: chartId,
    map_type: mapType,
    depth
  });
}

export async function askQuestion(
  chartId: string,
  question: string,
  sessionId?: string,
  mapType?: string,
  mapItemKey?: string,
  entrySource?: string,
  coachingMode = "chart"
): Promise<ChatResponse> {
  return postJson("/api/chat", {
    chart_id: chartId,
    question,
    session_id: sessionId,
    map_type: mapType,
    map_item_key: mapItemKey,
    entry_source: entrySource,
    coaching_mode: coachingMode,
    synthesis_mode: entrySource === "followup_button" ? "full_chart" : undefined
  });
}

export async function createReadingVisual(
  chartId: string,
  prompt?: string
): Promise<ReadingVisualResponse> {
  return postJson("/api/images/reading-visual", {
    chart_id: chartId,
    prompt
  });
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail = payload?.detail;
    const message =
      typeof detail?.message === "string"
        ? detail.message
        : typeof detail === "string"
          ? detail
          : "The request failed. Check the information and try again.";
    throw new Error(message);
  }
  return payload as T;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function requestJson<T>(path: string, body?: unknown, method = body === undefined ? "GET" : "POST"): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method, credentials: "same-origin",
    ...(body === undefined ? {} : {headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)})
  });
  const payload = await response.json();
  if (!response.ok) {
    const detail = payload.detail ?? payload.error;
    const message = typeof detail === "string" ? detail : typeof detail?.message === "string" ? detail.message : "The request could not be completed.";
    throw new ApiError(message, response.status);
  }
  return payload as T;
}
