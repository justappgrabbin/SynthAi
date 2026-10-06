
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HDCyberMorphEngine v1.0
 * Human Design → Cyberpunk Character Morph System
 * For Synthia OS — Body Field Extension
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Architecture:
 *   Input: Face Image + HD Chart Data
 *   ↓
 *   HDProfileAnalyzer → extracts morphogenetic signature
 *   ↓
 *   AestheticMapper → maps HD properties to cyberpunk visual parameters
 *   ↓
 *   MorphPipeline → applies transformations to face image
 *   ↓
 *   Output: Cyberpunk character render + specification document
 * 
 * Dimensional Mapping:
 *   D1 (Impulse)     → Type archetype (the drive)
 *   D2 (Polarity)    → Defined/Open center split (cyber vs organic)
 *   D3 (Witness)     → Profile stance (how the body holds itself)
 *   D4 (Context)     → Cross / Incarnation theme (narrative frame)
 *   D5 (Meaning)     → Authority glow + Gate circuit patterns (the signal)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type HDType = 'Manifestor' | 'Generator' | 'ManifestingGenerator' | 'Projector' | 'Reflector';
export type HDCenter = 'Head' | 'Ajna' | 'Throat' | 'G' | 'Heart' | 'SolarPlexus' | 'Sacral' | 'Spleen' | 'Root';
export type HDAuthority = 'Emotional' | 'Sacral' | 'Splenic' | 'Ego' | 'SelfProjected' | 'Mental' | 'Lunar' | 'Environmental';

export interface HDGate {
  number: number;      // 1-64
  line: number;        // 1-6
  color: number;       // 1-6
  tone: number;        // 1-6
  base: number;        // 1-5
}

export interface HDChart {
  type: HDType;
  profile: [number, number];  // e.g., [1, 4]
  authority: HDAuthority;
  definedCenters: HDCenter[];
  undefinedCenters: HDCenter[];
  consciousGates: HDGate[];
  unconsciousGates: HDGate[];
  incarnationCross: string;   // e.g., "Cross of Eden"
  variables: [string, string, string, string]; // N/S, A/R, C/D, P/T
}

export interface CyberpunkSpec {
  archetype: string;
  stance: string;
  pose: string;
  primaryPalette: [number, number, number];  // RGB
  secondaryPalette: [number, number, number];
  glowColor: [number, number, number];
  cyberneticZones: CyberZone[];
  organicZones: OrganicZone[];
  implants: Implant[];
  circuitPatterns: CircuitPattern[];
  narrativeTheme: string;
  threatLevel: number;  // 0-10
  faction: string;
}

export interface CyberZone {
  center: HDCenter;
  bodyRegion: string;
  modificationType: string;
  coverage: number;  // 0-1
  detail: string;
}

export interface OrganicZone {
  center: HDCenter;
  bodyRegion: string;
  exposureType: string;
  vulnerability: string;
}

export interface Implant {
  gateNumber: number;
  name: string;
  bodyLocation: string;
  visualType: string;
  glowIntensity: number;
  description: string;
}

export interface CircuitPattern {
  channel: string;
  from: number;
  to: number;
  pattern: string;
  color: [number, number, number];
  pulse: 'steady' | 'pulsing' | 'erratic' | 'dormant';
}

export interface MorphResult {
  spec: CyberpunkSpec;
  overlayInstructions: OverlayInstruction[];
  narrative: string;
  rawImage?: ImageData;
}

export interface OverlayInstruction {
  type: 'glow' | 'implant' | 'circuit' | 'tattoo' | 'eye' | 'skin';
  region: string;
  x: number;  // normalized 0-1
  y: number;
  radius: number;
  color: [number, number, number];
  intensity: number;
  params: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CENTER → BODY REGION MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const CENTER_BODY_MAP: Record<HDCenter, { region: string; subRegions: string[] }> = {
  Head: { region: 'cranial', subRegions: ['crown', 'temples', 'forehead'] },
  Ajna: { region: 'neural', subRegions: ['third_eye', 'brow_ridge', 'temple_implants'] },
  Throat: { region: 'vocal', subRegions: ['throat', 'jaw', 'neck', 'vocal_cords'] },
  G: { region: 'core_identity', subRegions: ['sternum', 'heart_space', 'diaphragm'] },
  Heart: { region: 'power', subRegions: ['cardiac', 'left_shoulder', 'will_center'] },
  SolarPlexus: { region: 'emotional', subRegions: ['solar_plexus', 'upper_abdomen', 'mood_nodes'] },
  Sacral: { region: 'generative', subRegions: ['lower_abdomen', 'hips', 'sacrum', 'reactor'] },
  Spleen: { region: 'immune', subRegions: ['spleen_area', 'lymphatic', 'instinct_ports'] },
  Root: { region: 'adrenal', subRegions: ['root_base', 'perineum', 'adrenal_glands', 'pressure_valves'] }
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE → ARCHETYPE MAPPING (D1: Impulse)
// ═══════════════════════════════════════════════════════════════════════════════

const TYPE_ARCHETYPE_MAP: Record<HDType, {
  archetype: string;
  faction: string;
  threatLevel: number;
  bodyFrame: string;
  description: string;
}> = {
  Manifestor: {
    archetype: 'Vanguard',
    faction: 'Militech / Frontline',
    threatLevel: 9,
    bodyFrame: 'heavy_plate',
    description: 'Initiator-class chassis. Built for shock and awe. Armor plates are angular, aggressive. Always the first through the breach.'
  },
  Generator: {
    archetype: 'Powerhouse',
    faction: 'Industrial / Grid',
    threatLevel: 6,
    bodyFrame: 'reinforced_frame',
    description: 'Sustainable output engine. Bulkier frame with visible power conduits. The grid runs because they run.'
  },
  ManifestingGenerator: {
    archetype: 'Hybrid',
    faction: 'Mercenary / Free Agent',
    threatLevel: 8,
    bodyFrame: 'adaptive_combat',
    description: 'Dual-core system. Can sustain AND initiate. Frame shifts between efficiency and aggression modes. Unpredictable.'
  },
  Projector: {
    archetype: 'Observer',
    faction: 'Surveillance / Intelligence',
    threatLevel: 7,
    bodyFrame: 'light_sensor',
    description: 'Recognition array. Minimal armor, maximum sensor coverage. Sees what others cannot. Guides from the shadows.'
  },
  Reflector: {
    archetype: 'Mirror',
    faction: 'Diplomat / Chameleon',
    threatLevel: 4,
    bodyFrame: 'adaptive_membrane',
    description: 'Adaptive skin system. No fixed form. Reflects the environment and the people in it. Nearly invisible when still.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY → COLOR PALETTE (D5: Meaning / Signal)
// ═══════════════════════════════════════════════════════════════════════════════

const AUTHORITY_PALETTE: Record<HDAuthority, {
  primary: [number, number, number];
  secondary: [number, number, number];
  glow: [number, number, number];
  pulse: 'steady' | 'pulsing' | 'erratic' | 'dormant';
  description: string;
}> = {
  Emotional: {
    primary: [220, 60, 40],      // Deep crimson
    secondary: [255, 140, 0],    // Amber
    glow: [255, 80, 60],         // Warm pulse
    pulse: 'pulsing',
    description: 'Emotional wave visible as a slow-breathing crimson glow in the chest cavity.'
  },
  Sacral: {
    primary: [0, 180, 200],      // Deep teal
    secondary: [0, 255, 180],    // Cyan
    glow: [0, 255, 200],         // Generator hum
    pulse: 'steady',
    description: 'Sacral core emits a steady teal hum — the sound of sustainable power.'
  },
  Splenic: {
    primary: [180, 200, 220],    // Cold steel
    secondary: [100, 150, 255],  // Ice blue
    glow: [200, 220, 255],       // Instant flash
    pulse: 'erratic',
    description: 'Splenic instinct fires as sudden ice-blue flashes — survival instinct made visible.'
  },
  Ego: {
    primary: [255, 215, 0],      // Gold
    secondary: [200, 50, 50],    // Deep red
    glow: [255, 200, 50],        // Heart-sun
    pulse: 'steady',
    description: 'Heart-center burns with golden willpower. The ego made metal.'
  },
  SelfProjected: {
    primary: [147, 51, 255],     // Deep violet
    secondary: [200, 100, 255],  // Lavender
    glow: [180, 80, 255],        // Identity beacon
    pulse: 'pulsing',
    description: 'G-center projects a violet identity beacon — "I am" made light.'
  },
  Mental: {
    primary: [0, 255, 150],      // Acid green
    secondary: [50, 200, 100],   // Moss
    glow: [100, 255, 150],       // Thought-stream
    pulse: 'erratic',
    description: 'Mental authority streams acid-green data — overclocked cognition visible.'
  },
  Lunar: {
    primary: [200, 200, 220],    // Moon silver
    secondary: [150, 150, 180],  // Shadow
    glow: [220, 220, 255],       // Phase shift
    pulse: 'dormant',
    description: 'Lunar cycle modulates all systems. Glow shifts with the moon phase.'
  },
  Environmental: {
    primary: [100, 100, 100],    // Neutral grey
    secondary: [150, 150, 150],  // Mirror
    glow: [200, 200, 200],       // Context glow
    pulse: 'steady',
    description: 'Environmental authority — the body becomes a sensor for the room itself.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE → STANCE & POSE (D3: Witness / Observer-Node)
// ═══════════════════════════════════════════════════════════════════════════════

const PROFILE_STANCE: Record<string, {
  stance: string;
  pose: string;
  cameraAngle: string;
  description: string;
  detailLevel: number;  // 1-6
}> = {
  '1_3': {
    stance: 'Investigator_Martyr',
    pose: 'crouched_examining',
    cameraAngle: 'low_angle',
    description: 'Crouched low, examining something on the ground. One hand on the surface, the other ready. Investigative depth meets experiential crash.',
    detailLevel: 5
  },
  '1_4': {
    stance: 'Investigator_Influencer',
    pose: 'grounded_forward',
    cameraAngle: 'eye_level',
    description: 'Standing firm, facing forward. Feet planted. The investigator who influences. Solid, trustworthy, but with network ports visible.',
    detailLevel: 4
  },
  '2_4': {
    stance: 'Hermit_Influencer',
    pose: 'seated_turned',
    cameraAngle: 'three_quarter',
    description: 'Seated, body turned slightly away but face toward camera. The hermit who is called out. Natural talent meets social network.',
    detailLevel: 3
  },
  '2_5': {
    stance: 'Hermit_Heretic',
    pose: 'contemplative_back',
    cameraAngle: 'behind_shoulder',
    description: 'Back mostly to camera, looking over shoulder. The hermit projected upon. Mysterious, almost mythical. Universal solutions.',
    detailLevel: 4
  },
  '3_5': {
    stance: 'Martyr_Heretic',
    pose: 'dynamic_mid_action',
    cameraAngle: 'action_pan',
    description: 'Captured mid-motion. One foot off the ground. The martyr who becomes the heretic. Trial and error made heroic.',
    detailLevel: 6
  },
  '3_6': {
    stance: 'Martyr_RoleModel',
    pose: 'ascending_transcendent',
    cameraAngle: 'below_looking_up',
    description: 'Ascending, looking upward. The transition from chaos to wisdom. Three distinct life phases visible in the wear patterns.',
    detailLevel: 6
  },
  '4_6': {
    stance: 'Influencer_RoleModel',
    pose: 'mentor_standing',
    cameraAngle: 'slight_elevation',
    description: 'Standing with open posture, one hand extended as if guiding. The influencer who becomes the role model. Network made wisdom.',
    detailLevel: 4
  },
  '4_1': {
    stance: 'Influencer_Investigator',
    pose: 'networked_grounded',
    cameraAngle: 'eye_level',
    description: 'Grounded but surrounded by visible network connections. The foundation of influence. Internal depth meets external reach.',
    detailLevel: 4
  },
  '5_1': {
    stance: 'Heretic_Investigator',
    pose: 'mysterious_partially_obscured',
    cameraAngle: 'shadowed',
    description: 'Partially in shadow, one eye clearly visible. The heretic with deep foundation. Universal projection meets inner depth.',
    detailLevel: 5
  },
  '5_2': {
    stance: 'Heretic_Hermit',
    pose: 'isolated_beacon',
    cameraAngle: 'distant',
    description: 'Standing alone, a single bright point in darkness. The heretic who is naturally called. Projection meets natural genius.',
    detailLevel: 3
  },
  '6_2': {
    stance: 'RoleModel_Hermit',
    pose: 'transcendent_seated',
    cameraAngle: 'eye_level_soft',
    description: 'Seated in meditation pose, eyes closed or half-open. The role model as hermit. Transcendence through natural being.',
    detailLevel: 2
  },
  '6_3': {
    stance: 'RoleModel_Martyr',
    pose: 'wounded_rising',
    cameraAngle: 'low_dramatic',
    description: 'Rising from a kneeling position, damage visible but ascending. The role model forged through trial. Three life phases in scars.',
    detailLevel: 6
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// 64 GATES → IMPLANT SPECIFICATIONS
// Each gate becomes a specific cybernetic implant or modification
// ═══════════════════════════════════════════════════════════════════════════════

const GATE_IMPLANT_MAP: Record<number, {
  name: string;
  implantType: string;
  bodyLocation: string;
  description: string;
  visualSignature: string;
}> = {
  1: { name: 'Creative', implantType: 'neural_array', bodyLocation: 'crown', description: 'Creative drive made circuit. The pressure to create manifests as a crown of light.', visualSignature: 'radiating_crown_spikes' },
  2: { name: 'Keeper of Keys', implantType: 'data_vault', bodyLocation: 'temple', description: 'The direction keeper. A vault of keys and maps stored in temple implants.', visualSignature: 'keyhole_pupil_hologram' },
  3: { name: 'Ordering', implantType: 'chaos_dampener', bodyLocation: 'forehead', description: 'Ordering from chaos. Forehead array that sorts and structures incoming data.', visualSignature: 'grid_projector_forehead' },
  4: { name: 'Formulization', implantType: 'logic_processor', bodyLocation: 'brow', description: 'Answers through logic. Brow-mounted logic processor with formula displays.', visualSignature: 'formula_stream_brow' },
  5: { name: 'Patterns', implantType: 'rhythm_sync', bodyLocation: 'temple', description: 'Fixing patterns in time. Temple implant that pulses with circadian rhythm.', visualSignature: 'clockwork_temple_gear' },
  6: { name: 'Friction', implantType: 'conflict_sensor', bodyLocation: 'jaw', description: 'Intimacy and conflict. Jaw-mounted tension sensors that glow during friction.', visualSignature: 'jaw_line_tension_glow' },
  7: { name: 'Role of Self', implantType: 'direction_compass', bodyLocation: 'third_eye', description: 'The direction of the self. Third-eye compass that orients identity.', visualSignature: 'compass_rose_third_eye' },
  8: { name: 'Contribution', implantType: 'expression_beam', bodyLocation: 'throat', description: 'Contribution made visible. Throat emitter that projects creative expression.', visualSignature: 'throat_hologram_projector' },
  9: { name: 'Focus', implantType: 'concentration_lens', bodyLocation: 'eyes', description: 'The power of focus. Eye lenses that narrow and intensify during concentration.', visualSignature: 'iris_contracting_mechanism' },
  10: { name: 'Behavior', implantType: 'behavioral_matrix', bodyLocation: 'heart_space', description: 'The behavior of the self. Heart-space matrix that modulates social behavior.', visualSignature: 'sternum_pulsing_grid' },
  11: { name: 'Ideas', implantType: 'idea_generator', bodyLocation: 'crown', description: 'The seeker of ideas. Crown-mounted idea generator with random spark patterns.', visualSignature: 'spark_shower_crown' },
  12: { name: 'Caution', implantType: 'hesitation_brake', bodyLocation: 'throat', description: 'Standstill and caution. Throat brake that pauses speech before release.', visualSignature: 'throat_valve_mechanism' },
  13: { name: 'Listener', implantType: 'audio_array', bodyLocation: 'ears', description: 'The listener. Ear arrays with extended audio capture and empathy processing.', visualSignature: 'extended_ear_fins' },
  14: { name: 'Power Skills', implantType: 'resource_converter', bodyLocation: 'sacrum', description: 'Power for skills. Sacral converter that transforms power into capability.', visualSignature: 'sacral_gear_converter' },
  15: { name: 'Extremes', implantType: 'range_extender', bodyLocation: 'lymphatic', description: 'The extremes of life. Lymphatic extender that pushes biological limits.', visualSignature: 'vein_network_glow' },
  16: { name: 'Skills', implantType: 'talent_matrix', bodyLocation: 'hands', description: 'The enthusiasm of skills. Hand-mounted talent matrix for dexterity.', visualSignature: 'finger_circuit_lines' },
  17: { name: 'Opinions', implantType: 'opinion_projector', bodyLocation: 'ajna', description: 'Opinions and answers. Ajna projector that beams thought structures.', visualSignature: 'ajna_holographic_fan' },
  18: { name: 'Correction', implantType: 'fault_detector', bodyLocation: 'spleen_area', description: 'The correction of patterns. Spleen fault detector for instinctive correction.', visualSignature: 'spleen_blinking_alert' },
  19: { name: 'Wanting', implantType: 'need_sensor', bodyLocation: 'heart', description: 'The pressure to want. Heart sensor that pulses with desire frequency.', visualSignature: 'heart_pulse_need' },
  20: { name: 'Now', implantType: 'present_moment', bodyLocation: 'throat', description: 'The now. Throat implant that speaks only the present. No past, no future.', visualSignature: 'throat_chrono_lock' },
  21: { name: 'Hunter/Huntress', implantType: 'control_grip', bodyLocation: 'hands', description: 'The hunter. Hand control grips with predatory precision.', visualSignature: 'hand_claw_mechanism' },
  22: { name: 'Grace', implantType: 'social_grace', bodyLocation: 'solar_plexus', description: 'Grace under pressure. Solar plexus grace modulator for social flow.', visualSignature: 'solar_soft_glow' },
  23: { name: 'Assimilation', implantType: 'knowledge_integrator', bodyLocation: 'throat', description: 'Assimilation of knowledge. Throat integrator that translates knowing to speech.', visualSignature: 'throat_translation_grid' },
  24: { name: 'Rationalization', implantType: 'thought_loop', bodyLocation: 'head', description: 'The return of the rational. Head loop that cycles until insight strikes.', visualSignature: 'head_spiral_glow' },
  25: { name: 'Innocence', implantType: 'purity_filter', bodyLocation: 'g_center', description: 'The spirit of the self. G-center purity filter. Untouched core.', visualSignature: 'g_center_white_core' },
  26: { name: 'Trickster', implantType: 'deception_array', bodyLocation: 'heart', description: 'The trickster. Heart-mounted deception array for selective transmission.', visualSignature: 'heart_mask_projector' },
  27: { name: 'Nurturing', implantType: 'care_distributor', bodyLocation: 'sacral', description: 'Nurturing and caring. Sacral care distributor with healing frequency.', visualSignature: 'sacral_warmth_emitter' },
  28: { name: 'Struggle', implantType: 'struggle_engine', bodyLocation: 'spleen', description: 'The struggle for meaning. Spleen struggle engine that finds purpose in pressure.', visualSignature: 'spleen_pressure_gauge' },
  29: { name: 'Perseverance', implantType: 'commitment_lock', bodyLocation: 'sacral', description: 'The perseverance of the self. Sacral commitment lock — once engaged, unbreakable.', visualSignature: 'sacral_lock_mechanism' },
  30: { name: 'Feelings', implantType: 'desire_furnace', bodyLocation: 'solar_plexus', description: 'The feelings of desire. Solar plexus furnace that burns with longing.', visualSignature: 'solar_furnace_glow' },
  31: { name: 'Influence', implantType: 'leadership_beacon', bodyLocation: 'throat', description: 'The influence of the self. Throat leadership beacon that calls followers.', visualSignature: 'throat_command_halo' },
  32: { name: 'Continuity', implantType: 'endurance_core', bodyLocation: 'root', description: 'The continuity of life. Root endurance core that survives failure.', visualSignature: 'root_backup_battery' },
  33: { name: 'Privacy', implantType: 'stealth_mode', bodyLocation: 'throat', description: 'The retreat into privacy. Throat stealth mode — silence as shield.', visualSignature: 'throat_dampening_field' },
  34: { name: 'Power', implantType: 'raw_power_cell', bodyLocation: 'sacral', description: 'The power of the self. Sacral raw power cell — pure generative force.', visualSignature: 'sacral_power_flare' },
  35: { name: 'Change', implantType: 'experience_collector', bodyLocation: 'throat', description: 'The hunger for change. Throat experience collector — always seeking the next.', visualSignature: 'throat_experience_meter' },
  36: { name: 'Crisis', implantType: 'crisis_navigator', bodyLocation: 'solar_plexus', description: 'The crisis of emotion. Solar plexus crisis navigator — finds light in dark.', visualSignature: 'solar_storm_eye' },
  37: { name: 'Friendship', implantType: 'bond_weaver', bodyLocation: 'solar_plexus', description: 'The warmth of friendship. Solar plexus bond weaver — connection made visible.', visualSignature: 'solar_connection_threads' },
  38: { name: 'Fighter', implantType: 'combat_stim', bodyLocation: 'root', description: 'The fighter. Root combat stim — the pressure to struggle for purpose.', visualSignature: 'root_adrenal_spike' },
  39: { name: 'Provocation', implantType: 'provocation_field', bodyLocation: 'root', description: 'The provocateur. Root provocation field — disturbs to awaken.', visualSignature: 'root_disruption_pulse' },
  40: { name: 'Aloneness', implantType: 'isolation_chamber', bodyLocation: 'heart', description: 'The gate of aloneness. Heart isolation chamber — strength in separation.', visualSignature: 'heart_solo_field' },
  41: { name: 'Contraction', implantType: 'dream_seed', bodyLocation: 'root', description: 'The contraction of feeling. Root dream seed — all experience begins here.', visualSignature: 'root_seed_glow' },
  42: { name: 'Growth', implantType: 'maturation_cycle', bodyLocation: 'sacral', description: 'The maturation cycle. Sacral growth ring — each cycle adds a layer.', visualSignature: 'sacral_growth_rings' },
  43: { name: 'Insight', implantType: 'breakthrough_array', bodyLocation: 'ajna', description: 'The insight of the self. Ajna breakthrough array — sudden knowing.', visualSignature: 'ajna_lightning_bolt' },
  44: { name: 'Alertness', implantType: 'pattern_recognizer', bodyLocation: 'spleen', description: 'The alertness of the self. Spleen pattern recognizer — instinctive memory.', visualSignature: 'spleen_pattern_grid' },
  45: { name: 'Gatherer', implantType: 'resource_controller', bodyLocation: 'throat', description: 'The gatherer. Throat resource controller — directs the material.', visualSignature: 'throat_resource_orb' },
  46: { name: 'Determination', implantType: 'body_lock', bodyLocation: 'g_center', description: 'The determination of the self. G-center body lock — form as destiny.', visualSignature: 'g_center_body_grid' },
  47: { name: 'Realization', implantType: 'insight_compressor', bodyLocation: 'ajna', description: 'The realization of the self. Ajna compressor — abstraction made real.', visualSignature: 'ajna_compression_spiral' },
  48: { name: 'Depth', implantType: 'depth_probe', bodyLocation: 'spleen', description: 'The depth of the self. Spleen depth probe — measures what others miss.', visualSignature: 'spleen_depth_needle' },
  49: { name: 'Revolution', implantType: 'rejection_field', bodyLocation: 'solar_plexus', description: 'The rejection of the old. Solar plexus revolution field — principle over comfort.', visualSignature: 'solar_revolution_flame' },
  50: { name: 'Values', implantType: 'value_calibrator', bodyLocation: 'spleen', description: 'The values of the self. Spleen value calibrator — instinctive worth.', visualSignature: 'spleen_value_scale' },
  51: { name: 'Shock', implantType: 'shock_inductor', bodyLocation: 'heart', description: 'The shock of the self. Heart shock inductor — initiates through disruption.', visualSignature: 'heart_lightning_coil' },
  52: { name: 'Stillness', implantType: 'inertia_anchor', bodyLocation: 'root', description: 'The stillness of the self. Root inertia anchor — the power of not moving.', visualSignature: 'root_anchor_spike' },
  53: { name: 'Beginnings', implantType: 'startup_sequence', bodyLocation: 'root', description: 'The start of a new cycle. Root startup sequence — initiation protocol.', visualSignature: 'root_boot_sequence' },
  54: { name: 'Ambition', implantType: 'drive_turbine', bodyLocation: 'root', description: 'The ambition of the self. Root drive turbine — transforms pressure into rise.', visualSignature: 'root_turbine_spin' },
  55: { name: 'Spirit', implantType: 'mood_synth', bodyLocation: 'solar_plexus', description: 'The spirit of the self. Solar plexus mood synth — emotional weather system.', visualSignature: 'solar_weather_map' },
  56: { name: 'Stimulation', implantType: 'story_projector', bodyLocation: 'throat', description: 'The stimulation of the self. Throat story projector — the wanderer's tale.', visualSignature: 'throat_story_stream' },
  57: { name: 'Intuitive', implantType: 'instinct_port', bodyLocation: 'spleen', description: 'The intuitive clarity. Spleen instinct port — clear in the now.', visualSignature: 'spleen_clear_beam' },
  58: { name: 'Vitality', implantType: 'joy_reactor', bodyLocation: 'root', description: 'The vitality of the self. Root joy reactor — pressure transformed to bliss.', visualSignature: 'root_joy_burst' },
  59: { name: 'Sexuality', implantType: 'attraction_field', bodyLocation: 'sacral', description: 'The sexuality of the self. Sacral attraction field — the drive to bond.', visualSignature: 'sacral_attraction_hum' },
  60: { name: 'Limitation', implantType: 'mutation_trigger', bodyLocation: 'root', description: 'The limitation of the self. Root mutation trigger — pressure forces evolution.', visualSignature: 'root_mutation_pulse' },
  61: { name: 'Mystery', implantType: 'truth_seeker', bodyLocation: 'head', description: 'The mystery of the self. Head truth seeker — the pressure to know the unknown.', visualSignature: 'head_unknown_vortex' },
  62: { name: 'Details', implantType: 'detail_scanner', bodyLocation: 'throat', description: 'The details of the self. Throat detail scanner — precision in expression.', visualSignature: 'throat_precision_grid' },
  63: { name: 'Doubt', implantType: 'doubt_processor', bodyLocation: 'head', description: 'The doubt of the self. Head doubt processor — questions until truth emerges.', visualSignature: 'head_question_spiral' },
  64: { name: 'Confusion', implantType: 'confusion_transmuter', bodyLocation: 'head', description: 'The confusion before realization. Head transmuter — fog into clarity.', visualSignature: 'head_fog_to_light' }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CIRCUIT GROUP → PATTERN STYLE
// ═══════════════════════════════════════════════════════════════════════════════

const CIRCUIT_PATTERNS: Record<string, {
  pattern: string;
  color: [number, number, number];
  flow: string;
  description: string;
}> = {
  'Individual': { pattern: 'pulse_spike', color: [147, 51, 255], flow: 'erratic_mutation', description: 'Individual circuit: sudden mutations, empowerment pulses, chaotic brilliance.' },
  'Tribal': { pattern: 'bond_weave', color: [255, 140, 0], flow: 'circular_support', description: 'Tribal circuit: circular flows, support structures, shared resources.' },
  'Collective': { pattern: 'logic_stream', color: [0, 180, 200], flow: 'linear_progression', description: 'Collective circuit: linear logic, shared patterns, predictable streams.' },
  'Integration': { pattern: 'self_core', color: [255, 215, 0], flow: 'centralized_radiance', description: 'Integration circuit: centralized power, self-projected radiance.' }
};

// Gate to circuit mapping
const GATE_CIRCUIT: Record<number, string> = {
  1: 'Individual', 2: 'Collective', 3: 'Individual', 4: 'Collective', 5: 'Collective',
  6: 'Tribal', 7: 'Collective', 8: 'Individual', 9: 'Collective', 10: 'Integration',
  11: 'Collective', 12: 'Individual', 13: 'Tribal', 14: 'Integration', 15: 'Collective',
  16: 'Tribal', 17: 'Collective', 18: 'Tribal', 19: 'Tribal', 20: 'Integration',
  21: 'Tribal', 22: 'Individual', 23: 'Individual', 24: 'Individual', 25: 'Integration',
  26: 'Tribal', 27: 'Tribal', 28: 'Individual', 29: 'Tribal', 30: 'Individual',
  31: 'Collective', 32: 'Tribal', 33: 'Individual', 34: 'Integration', 35: 'Individual',
  36: 'Individual', 37: 'Tribal', 38: 'Individual', 39: 'Individual', 40: 'Tribal',
  41: 'Individual', 42: 'Collective', 43: 'Individual', 44: 'Tribal', 45: 'Tribal',
  46: 'Integration', 47: 'Individual', 48: 'Collective', 49: 'Tribal', 50: 'Tribal',
  51: 'Individual', 52: 'Collective', 53: 'Collective', 54: 'Tribal', 55: 'Individual',
  56: 'Individual', 57: 'Individual', 58: 'Collective', 59: 'Tribal', 60: 'Individual',
  61: 'Individual', 62: 'Collective', 63: 'Collective', 64: 'Individual'
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export class HDCyberMorphEngine {
  private profileKey(p: [number, number]): string {
    return `${p[0]}_${p[1]}`;
  }

  analyze(chart: HDChart): CyberpunkSpec {
    const typeData = TYPE_ARCHETYPE_MAP[chart.type];
    const authData = AUTHORITY_PALETTE[chart.authority];
    const profileKey = this.profileKey(chart.profile);
    const profileData = PROFILE_STANCE[profileKey] || PROFILE_STANCE['1_4'];

    // Build cybernetic zones from defined centers
    const cyberZones: CyberZone[] = chart.definedCenters.map(center => {
      const map = CENTER_BODY_MAP[center];
      const coverage = center === 'Sacral' ? 0.9 : center === 'Heart' ? 0.7 : 0.5;
      return {
        center,
        bodyRegion: map.region,
        modificationType: this.getModificationType(center, chart.type),
        coverage,
        detail: `${map.subRegions.join(', ')} — fully integrated ${center.toLowerCase()} system`
      };
    });

    // Build organic zones from undefined centers
    const organicZones: OrganicZone[] = chart.undefinedCenters.map(center => {
      const map = CENTER_BODY_MAP[center];
      return {
        center,
        bodyRegion: map.region,
        exposureType: 'exposed_wiring',
        vulnerability: `Open ${center.toLowerCase()} — receptive, adaptive, vulnerable to conditioning`
      };
    });

    // Build implants from conscious gates
    const implants: Implant[] = chart.consciousGates.map(gate => {
      const spec = GATE_IMPLANT_MAP[gate.number];
      const circuit = GATE_CIRCUIT[gate.number] || 'Individual';
      const circuitData = CIRCUIT_PATTERNS[circuit];
      return {
        gateNumber: gate.number,
        name: spec.name,
        bodyLocation: spec.bodyLocation,
        visualType: spec.implantType,
        glowIntensity: gate.line / 6,
        description: `${spec.description} [Line ${gate.line}: ${this.getLineExpression(gate.line)}] — ${circuitData.description}`
      };
    });

    // Build circuit patterns from channels (simplified: pair gates)
    const circuitPatterns: CircuitPattern[] = this.inferChannels(chart.consciousGates).map(ch => {
      const circuit = GATE_CIRCUIT[ch.from] || 'Individual';
      const cData = CIRCUIT_PATTERNS[circuit];
      return {
        channel: `${ch.from}-${ch.to}`,
        from: ch.from,
        to: ch.to,
        pattern: cData.pattern,
        color: cData.color,
        pulse: authData.pulse
      };
    });

    // Determine narrative theme from cross
    const narrative = this.generateNarrative(chart, typeData, profileData);

    return {
      archetype: typeData.archetype,
      stance: profileData.stance,
      pose: profileData.pose,
      primaryPalette: authData.primary,
      secondaryPalette: authData.secondary,
      glowColor: authData.glow,
      cyberneticZones,
      organicZones,
      implants,
      circuitPatterns,
      narrativeTheme: narrative,
      threatLevel: typeData.threatLevel,
      faction: typeData.faction
    };
  }

  private getModificationType(center: HDCenter, type: HDType): string {
    const mods: Record<HDCenter, Record<HDType, string>> = {
      Head: { Manifestor: 'command_array', Generator: 'data_receiver', ManifestingGenerator: 'dual_processor', Projector: 'scanning_dish', Reflector: 'mirror_array' },
      Ajna: { Manifestor: 'tactical_processor', Generator: 'work_processor', ManifestingGenerator: 'switching_logic', Projector: 'recognition_engine', Reflector: 'reflection_pool' },
      Throat: { Manifestor: 'command_vox', Generator: 'response_vox', ManifestingGenerator: 'hybrid_vox', Projector: 'guidance_vox', Reflector: 'echo_vox' },
      G: { Manifestor: 'identity_core', Generator: 'direction_core', ManifestingGenerator: 'shifting_core', Projector: 'self_projector', Reflector: 'empty_mirror' },
      Heart: { Manifestor: 'will_cannon', Generator: 'steady_heart', ManifestingGenerator: 'burst_heart', Projector: 'ego_beacon', Reflector: 'absent_heart' },
      SolarPlexus: { Manifestor: 'rage_engine', Generator: 'satisfaction_meter', ManifestingGenerator: 'frustration_loop', Projector: 'bitterness_filter', Reflector: 'disappointment_pool' },
      Sacral: { Manifestor: 'N/A', Generator: 'power_reactor', ManifestingGenerator: 'dual_reactor', Projector: 'N/A', Reflector: 'N/A' },
      Spleen: { Manifestor: 'instinct_trigger', Generator: 'gut_sensor', ManifestingGenerator: 'rapid_gut', Projector: 'spleen_scanner', Reflector: 'spleen_mirror' },
      Root: { Manifestor: 'adrenal_cannon', Generator: 'pressure_converter', ManifestingGenerator: 'stress_engine', Projector: 'root_drain', Reflector: 'root_pool' }
    };
    return mods[center]?.[type] || 'standard_implant';
  }

  private getLineExpression(line: number): string {
    const expressions = [
      'Investigation / Foundation',
      'Projection / Calling',
      'Trial & Error / Adaptation',
      'Externalization / Influence',
      'Universalization / Heresy',
      'Role Model / Transcendence'
    ];
    return expressions[line - 1] || 'Unknown';
  }

  private inferChannels(gates: HDGate[]): { from: number; to: number }[] {
    // Simplified channel inference — in real system this uses the full HD channel map
    const channelMap: Record<number, number[]> = {
      1: [8], 2: [14], 3: [60], 4: [63], 5: [15], 6: [59],
      7: [31], 9: [52], 10: [20, 34, 57], 11: [56], 12: [22],
      13: [33], 16: [48], 17: [62], 18: [58], 19: [49],
      21: [45], 23: [43], 24: [61], 25: [51], 26: [44],
      27: [50], 28: [38], 29: [46], 30: [41], 32: [54],
      34: [57], 35: [36], 37: [40], 39: [55], 42: [53],
      47: [64], 59: [6]
    };
    const channels: { from: number; to: number }[] = [];
    const gateNums = gates.map(g => g.number);
    const seen = new Set<string>();

    for (const g of gateNums) {
      const partners = channelMap[g] || [];
      for (const p of partners) {
        if (gateNums.includes(p)) {
          const key = [g, p].sort().join('-');
          if (!seen.has(key)) {
            seen.add(key);
            channels.push({ from: Math.min(g, p), to: Math.max(g, p) });
          }
        }
      }
    }
    return channels;
  }

  private generateNarrative(chart: HDChart, typeData: any, profileData: any): string {
    const openCenters = chart.undefinedCenters.join(', ');
    const definedCenters = chart.definedCenters.join(', ');

    return `
      ARCHETYPE: ${typeData.archetype} | FACTION: ${typeData.faction} | THREAT: ${typeData.threatLevel}/10
      STANCE: ${profileData.stance} | POSE: ${profileData.pose}

      DEFINED SYSTEMS (HARDWIRED): ${definedCenters}
      These centers are cybernetically integrated — stable, reliable, always-on.

      OPEN SYSTEMS (ADAPTIVE): ${openCenters}
      These centers remain organic — exposed wiring, receptive, vulnerable to the environment.
      The character's power comes from what is defined. Their wisdom comes from what is open.

      INCARNATION THEME: ${chart.incarnationCross}
      The narrative arc of this character's existence. The cross is the movie poster of their life.

      AUTHORITY SIGNAL: ${chart.authority}
      How this character makes decisions — visible as their primary glow color and pulse pattern.

      PROFILE: ${chart.profile[0]}/${chart.profile[1]}
      ${profileData.description}
    `.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // IMAGE PROCESSING PIPELINE
  // Generates overlay instructions for a canvas/WebGL renderer
  // ═══════════════════════════════════════════════════════════════════════════════

  generateOverlayInstructions(chart: HDChart, spec: CyberpunkSpec, faceBounds: { x: number; y: number; w: number; h: number }): OverlayInstruction[] {
    const instructions: OverlayInstruction[] = [];
    const cx = faceBounds.x + faceBounds.w / 2;
    const cy = faceBounds.y + faceBounds.h / 2;

    // Authority glow — centered on the dominant authority center
    const authCenter = this.authorityToCenter(chart.authority);
    const authPos = this.centerToFacePosition(authCenter, faceBounds);
    instructions.push({
      type: 'glow',
      region: authCenter,
      x: authPos.x,
      y: authPos.y,
      radius: faceBounds.w * 0.15,
      color: spec.glowColor,
      intensity: 0.7,
      params: { pulse: AUTHORITY_PALETTE[chart.authority].pulse }
    });

    // Defined center overlays
    for (const zone of spec.cyberneticZones) {
      const pos = this.centerToFacePosition(zone.center, faceBounds);
      instructions.push({
        type: 'implant',
        region: zone.center,
        x: pos.x,
        y: pos.y,
        radius: faceBounds.w * 0.08 * zone.coverage,
        color: spec.primaryPalette,
        intensity: 0.8,
        params: { modificationType: zone.modificationType, coverage: zone.coverage }
      });
    }

    // Open center wiring
    for (const zone of spec.organicZones) {
      const pos = this.centerToFacePosition(zone.center, faceBounds);
      instructions.push({
        type: 'circuit',
        region: zone.center,
        x: pos.x,
        y: pos.y,
        radius: faceBounds.w * 0.06,
        color: [80, 80, 80],
        intensity: 0.4,
        params: { exposureType: zone.exposureType, vulnerability: zone.vulnerability }
      });
    }

    // Gate implants
    for (const implant of spec.implants) {
      const pos = this.implantLocationToFace(implant.bodyLocation, faceBounds);
      const circuit = GATE_CIRCUIT[implant.gateNumber] || 'Individual';
      const cData = CIRCUIT_PATTERNS[circuit];
      instructions.push({
        type: 'implant',
        region: implant.bodyLocation,
        x: pos.x,
        y: pos.y,
        radius: faceBounds.w * 0.04,
        color: cData.color,
        intensity: implant.glowIntensity,
        params: { 
          gateNumber: implant.gateNumber, 
          name: implant.name, 
          visualType: implant.visualType,
          pattern: cData.pattern
        }
      });
    }

    // Eye modification based on type
    const eyeColor = this.typeToEyeColor(chart.type);
    instructions.push({
      type: 'eye',
      region: 'left_eye',
      x: cx - faceBounds.w * 0.15,
      y: cy - faceBounds.h * 0.1,
      radius: faceBounds.w * 0.06,
      color: eyeColor,
      intensity: 0.9,
      params: { type: chart.type }
    });
    instructions.push({
      type: 'eye',
      region: 'right_eye',
      x: cx + faceBounds.w * 0.15,
      y: cy - faceBounds.h * 0.1,
      radius: faceBounds.w * 0.06,
      color: eyeColor,
      intensity: 0.9,
      params: { type: chart.type }
    });

    // Circuit patterns between connected gates
    for (const pattern of spec.circuitPatterns) {
      const fromPos = this.gateNumberToFacePosition(pattern.from, faceBounds);
      const toPos = this.gateNumberToFacePosition(pattern.to, faceBounds);
      instructions.push({
        type: 'circuit',
        region: `channel_${pattern.channel}`,
        x: (fromPos.x + toPos.x) / 2,
        y: (fromPos.y + toPos.y) / 2,
        radius: faceBounds.w * 0.12,
        color: pattern.color,
        intensity: 0.5,
        params: { 
          from: pattern.from, 
          to: pattern.to, 
          pattern: pattern.pattern, 
          pulse: pattern.pulse,
          fromX: fromPos.x,
          fromY: fromPos.y,
          toX: toPos.x,
          toY: toPos.y
        }
      });
    }

    return instructions;
  }

  private authorityToCenter(authority: HDAuthority): HDCenter {
    const map: Record<HDAuthority, HDCenter> = {
      Emotional: 'SolarPlexus',
      Sacral: 'Sacral',
      Splenic: 'Spleen',
      Ego: 'Heart',
      SelfProjected: 'G',
      Mental: 'Ajna',
      Lunar: 'Head',
      Environmental: 'Throat'
    };
    return map[authority] || 'G';
  }

  private centerToFacePosition(center: HDCenter, bounds: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const positions: Record<HDCenter, { x: number; y: number }> = {
      Head: { x: cx, y: bounds.y + bounds.h * 0.05 },
      Ajna: { x: cx, y: bounds.y + bounds.h * 0.15 },
      Throat: { x: cx, y: bounds.y + bounds.h * 0.35 },
      G: { x: cx, y: bounds.y + bounds.h * 0.5 },
      Heart: { x: cx - bounds.w * 0.15, y: bounds.y + bounds.h * 0.45 },
      SolarPlexus: { x: cx, y: bounds.y + bounds.h * 0.6 },
      Sacral: { x: cx, y: bounds.y + bounds.h * 0.75 },
      Spleen: { x: cx - bounds.w * 0.25, y: bounds.y + bounds.h * 0.55 },
      Root: { x: cx, y: bounds.y + bounds.h * 0.9 }
    };
    return positions[center] || { x: cx, y: cy };
  }

  private implantLocationToFace(location: string, bounds: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
    const cx = bounds.x + bounds.w / 2;
    const cy = bounds.y + bounds.h / 2;
    const map: Record<string, { x: number; y: number }> = {
      crown: { x: cx, y: bounds.y + bounds.h * 0.02 },
      temple: { x: cx - bounds.w * 0.2, y: bounds.y + bounds.h * 0.15 },
      forehead: { x: cx, y: bounds.y + bounds.h * 0.12 },
      brow: { x: cx, y: bounds.y + bounds.h * 0.18 },
      'third_eye': { x: cx, y: bounds.y + bounds.h * 0.16 },
      throat: { x: cx, y: bounds.y + bounds.h * 0.35 },
      jaw: { x: cx, y: bounds.y + bounds.h * 0.4 },
      neck: { x: cx, y: bounds.y + bounds.h * 0.45 },
      eyes: { x: cx, y: bounds.y + bounds.h * 0.2 },
      ears: { x: cx - bounds.w * 0.3, y: bounds.y + bounds.h * 0.2 },
      heart_space: { x: cx, y: bounds.y + bounds.h * 0.5 },
      sternum: { x: cx, y: bounds.y + bounds.h * 0.5 },
      cardiac: { x: cx - bounds.w * 0.1, y: bounds.y + bounds.h * 0.48 },
      'solar_plexus': { x: cx, y: bounds.y + bounds.h * 0.6 },
      'upper_abdomen': { x: cx, y: bounds.y + bounds.h * 0.58 },
      sacrum: { x: cx, y: bounds.y + bounds.h * 0.8 },
      hips: { x: cx - bounds.w * 0.15, y: bounds.y + bounds.h * 0.75 },
      'lower_abdomen': { x: cx, y: bounds.y + bounds.h * 0.7 },
      spleen_area: { x: cx - bounds.w * 0.2, y: bounds.y + bounds.h * 0.55 },
      lymphatic: { x: cx - bounds.w * 0.25, y: bounds.y + bounds.h * 0.5 },
      'root_base': { x: cx, y: bounds.y + bounds.h * 0.95 },
      hands: { x: cx + bounds.w * 0.4, y: bounds.y + bounds.h * 0.7 },
      g_center: { x: cx, y: bounds.y + bounds.h * 0.5 }
    };
    return map[location] || { x: cx, y: cy };
  }

  private gateNumberToFacePosition(gate: number, bounds: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
    // Map gates to approximate face/body positions
    const implant = GATE_IMPLANT_MAP[gate];
    return this.implantLocationToFace(implant.bodyLocation, bounds);
  }

  private typeToEyeColor(type: HDType): [number, number, number] {
    const colors: Record<HDType, [number, number, number]> = {
      Manifestor: [255, 80, 60],      // Fiery red-orange
      Generator: [0, 255, 200],       // Teal
      ManifestingGenerator: [255, 200, 0], // Gold
      Projector: [180, 80, 255],      // Violet
      Reflector: [200, 200, 220]      // Silver
    };
    return colors[type];
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FULL PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════════

  morph(chart: HDChart, faceImage: ImageData, faceBounds: { x: number; y: number; w: number; h: number }): MorphResult {
    const spec = this.analyze(chart);
    const overlayInstructions = this.generateOverlayInstructions(chart, spec, faceBounds);

    return {
      spec,
      overlayInstructions,
      narrative: spec.narrativeTheme,
      rawImage: faceImage
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANVAS RENDERER (for preview/demo)
  // ═══════════════════════════════════════════════════════════════════════════════

  renderToCanvas(result: MorphResult, canvas: HTMLCanvasElement, sourceImage?: HTMLImageElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw source image if provided
    if (sourceImage) {
      ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    }

    // Apply overlay instructions
    for (const inst of result.overlayInstructions) {
      this.renderInstruction(ctx, inst, canvas.width, canvas.height);
    }

    // Apply overall color grade
    this.applyColorGrade(ctx, result.spec, canvas.width, canvas.height);
  }

  private renderInstruction(ctx: CanvasRenderingContext2D, inst: OverlayInstruction, w: number, h: number): void {
    const [r, g, b] = inst.color;
    const x = inst.x * w;
    const y = inst.y * h;
    const radius = inst.radius * w;

    ctx.save();
    ctx.globalAlpha = inst.intensity * 0.6;

    switch (inst.type) {
      case 'glow':
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        glow.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'implant':
        // Core
        ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Ring
        ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
        // Tech marks
        ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * radius * 0.5, y + Math.sin(angle) * radius * 0.5);
          ctx.lineTo(x + Math.cos(angle) * radius * 0.8, y + Math.sin(angle) * radius * 0.8);
          ctx.stroke();
        }
        break;

      case 'circuit':
        ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        if (inst.params.fromX !== undefined) {
          ctx.beginPath();
          ctx.moveTo(inst.params.fromX * w, inst.params.fromY * h);
          ctx.lineTo(inst.params.toX * w, inst.params.toY * h);
          ctx.stroke();
        } else {
          // Draw circuit node
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        break;

      case 'eye':
        const eyeGlow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        eyeGlow.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
        eyeGlow.addColorStop(0.5, `rgba(${r},${g},${b},0.4)`);
        eyeGlow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();
        // Iris ring
        ctx.strokeStyle = `rgba(${r},${g},${b},1)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'tattoo':
        ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'skin':
        ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        break;
    }

    ctx.restore();
  }

  private applyColorGrade(ctx: CanvasRenderingContext2D, spec: CyberpunkSpec, w: number, h: number): void {
    // Apply subtle color grading based on authority palette
    const [r, g, b] = spec.primaryPalette;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Vignette
    const vignette = ctx.createRadialGradient(w/2, h/2, w*0.3, w/2, h/2, w*0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE USAGE / DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_CHART: HDChart = {
  type: 'Manifestor',
  profile: [1, 4],
  authority: 'Emotional',
  definedCenters: ['Heart', 'Throat', 'Head', 'Ajna', 'Root'],
  undefinedCenters: ['SolarPlexus', 'Sacral', 'Spleen', 'G'],
  consciousGates: [
    { number: 6, line: 4, color: 4, tone: 3, base: 2 },
    { number: 12, line: 1, color: 2, tone: 1, base: 1 },
    { number: 22, line: 3, color: 5, tone: 2, base: 3 },
    { number: 36, line: 2, color: 3, tone: 4, base: 2 },
    { number: 37, line: 5, color: 1, tone: 6, base: 4 },
    { number: 49, line: 6, color: 6, tone: 5, base: 1 }
  ],
  unconsciousGates: [
    { number: 21, line: 2, color: 3, tone: 1, base: 2 },
    { number: 51, line: 1, color: 4, tone: 2, base: 3 }
  ],
  incarnationCross: 'Cross of Eden',
  variables: ['N', 'A', 'C', 'P']
};

export const EXAMPLE_CHART_PROJECTOR: HDChart = {
  type: 'Projector',
  profile: [5, 1],
  authority: 'Splenic',
  definedCenters: ['Ajna', 'Throat', 'G'],
  undefinedCenters: ['Head', 'Heart', 'SolarPlexus', 'Sacral', 'Spleen', 'Root'],
  consciousGates: [
    { number: 11, line: 5, color: 3, tone: 2, base: 1 },
    { number: 17, line: 2, color: 1, tone: 4, base: 2 },
    { number: 43, line: 1, color: 5, tone: 3, base: 4 },
    { number: 62, line: 4, color: 2, tone: 6, base: 1 }
  ],
  unconsciousGates: [
    { number: 10, line: 3, color: 4, tone: 1, base: 2 }
  ],
  incarnationCross: 'Cross of the Sphinx',
  variables: ['N', 'R', 'C', 'T']
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEB INTERFACE (for integration into Synthia OS)
// ═══════════════════════════════════════════════════════════════════════════════

export class HDCyberMorphUI {
  private engine: HDCyberMorphEngine;
  private canvas: HTMLCanvasElement;
  private currentImage: HTMLImageElement | null = null;

  constructor(canvasId: string) {
    this.engine = new HDCyberMorphEngine();
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  }

  loadImage(file: File): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        const ctx = this.canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve();
      };
      img.src = URL.createObjectURL(file);
    });
  }

  applyMorph(chart: HDChart, faceBounds: { x: number; y: number; w: number; h: number }): MorphResult {
    const result = this.engine.morph(chart, new ImageData(1, 1), faceBounds);
    this.engine.renderToCanvas(result, this.canvas, this.currentImage || undefined);
    return result;
  }

  exportSpec(result: MorphResult): string {
    return JSON.stringify(result.spec, null, 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  HDCyberMorphEngine,
  HDCyberMorphUI,
  EXAMPLE_CHART,
  EXAMPLE_CHART_PROJECTOR,
  GATE_IMPLANT_MAP,
  TYPE_ARCHETYPE_MAP,
  AUTHORITY_PALETTE,
  PROFILE_STANCE,
  CIRCUIT_PATTERNS
};
