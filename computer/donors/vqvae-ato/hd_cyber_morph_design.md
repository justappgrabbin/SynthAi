# HDCyberMorphEngine v1.0
## System Design Document
### Human Design → Cyberpunk Character Morph System

---

## 1. Executive Summary

The **HDCyberMorphEngine** is a morphogenetic image transformation system that converts regular face photographs into cyberpunk character art, where every visual decision is derived from the subject's **Human Design** chart. This is not a random filter — it is a **deterministic aesthetic engine** where each HD property (type, profile, centers, gates, authority, cross) maps to specific cybernetic modifications, color palettes, poses, and narrative themes.

**Core Philosophy:** *Human Design is already a body map. We are simply making the invisible visible.*

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HDCyberMorphEngine Pipeline                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INPUT LAYER                                                                │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐               │
│  │ Face Image   │  │ HD Chart Data   │  │ Optional: Style  │               │
│  │ (JPEG/PNG)   │  │ (JSON/API)      │  │ Reference        │               │
│  └──────┬───────┘  └────────┬────────┘  └────────┬─────────┘               │
│         │                   │                    │                          │
│         └───────────────────┼────────────────────┘                          │
│                             ▼                                               │
│  ANALYSIS LAYER                                                             │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ HDProfileAnalyzer                                           │           │
│  │  • Type → Archetype (D1: Impulse)                          │           │
│  │  • Defined/Open Centers → Cyber/Organic Split (D2)         │           │
│  │  • Profile → Stance & Pose (D3: Witness)                   │           │
│  │  • Cross → Narrative Theme (D4: Context)                   │           │
│  │  • Authority + Gates → Color + Implants (D5: Meaning)      │           │
│  └────────────────────────┬────────────────────────────────────┘           │
│                           ▼                                                 │
│  MAPPING LAYER                                                              │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ AestheticMapper                                             │           │
│  │  • 64 Gates → 64 Unique Implant Specifications             │           │
│  │  • 9 Centers → Body Region Modifications                   │           │
│  │  • 5 Types → Character Archetypes + Factions               │           │
│  │  • 8 Authorities → Color Palettes + Pulse Patterns         │           │
│  │  • 12 Profiles → Pose Libraries + Camera Angles            │           │
│  └────────────────────────┬────────────────────────────────────┘           │
│                           ▼                                                 │
│  GENERATION LAYER                                                           │
│  ┌─────────────────────────────────────────────────────────────┐           │
│  │ MorphPipeline                                               │           │
│  │  • Face Detection (MediaPipe/BlazeFace)                    │           │
│  │  • Feature Landmark Mapping                                │           │
│  │  • Overlay Instruction Generation                          │           │
│  │  • Style Transfer (Stable Diffusion / Custom GAN)          │           │
│  └────────────────────────┬────────────────────────────────────┘           │
│                           ▼                                                 │
│  OUTPUT LAYER                                                               │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐               │
│  │ Cyberpunk    │  │ Spec Document   │  │ Narrative        │               │
│  │ Character    │  │ (JSON)          │  │ Description      │               │
│  │ Image        │  │                 │  │                  │               │
│  └──────────────┘  └─────────────────┘  └──────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dimensional Stack Mapping

The engine maps all operations to the 5-Dimensional cognitive stack:

| Dimension | HD Property | Cyberpunk Output | Function |
|-----------|-------------|------------------|----------|
| **D1** (Impulse) | Type | Archetype, Faction, Threat Level | The drive that animates the character |
| **D2** (Polarity) | Defined vs Open Centers | Cybernetic vs Organic body regions | The split between hardwired and adaptive |
| **D3** (Witness) | Profile | Pose, Stance, Camera Angle | How the body holds itself in space |
| **D4** (Context) | Incarnation Cross | Narrative Theme, Background Story | The movie poster of their existence |
| **D5** (Meaning) | Authority + Gates | Color Palette, Glow, Implants | The signal they emit to the world |

---

## 4. Detailed Mapping Specifications

### 4.1 Type → Archetype (D1: Impulse)

| Type | Archetype | Faction | Threat | Body Frame | Eye Color |
|------|-----------|---------|--------|------------|-----------|
| **Manifestor** | Vanguard | Militech / Frontline | 9/10 | Heavy Plate | Fiery Red-Orange |
| **Generator** | Powerhouse | Industrial / Grid | 6/10 | Reinforced Frame | Teal |
| **Manifesting Generator** | Hybrid | Mercenary / Free Agent | 8/10 | Adaptive Combat | Gold |
| **Projector** | Observer | Surveillance / Intelligence | 7/10 | Light Sensor | Violet |
| **Reflector** | Mirror | Diplomat / Chameleon | 4/10 | Adaptive Membrane | Silver |

**Visual Signature:**
- **Manifestor:** Angular armor plates, aggressive shoulder geometry, command arrays on crown
- **Generator:** Visible power conduits, bulkier frame, reactor glow in sacral region
- **Manifesting Generator:** Transformable frame sections, dual-mode indicators, unpredictable silhouette
- **Projector:** Minimal armor, maximum sensor coverage (dish arrays, extended optics), thin frame
- **Reflector:** No fixed form, mirror-finish segments, adaptive camouflage, nearly invisible when still

### 4.2 Center → Body Region (D2: Polarity)

Each of the 9 HD centers maps to a specific body region. **Defined centers** become cybernetically integrated (hardwired, always-on). **Open/undefined centers** remain organic with exposed wiring (receptive, adaptive, vulnerable).

| Center | Body Region | Defined Modification | Open Exposure |
|--------|-------------|---------------------|---------------|
| **Head** | Crown, temples, forehead | Command array / Data receiver | Exposed neural ports, unfiltered input |
| **Ajna** | Third eye, brow ridge | Tactical processor / Recognition engine | Open mental pressure, confusion receptors |
| **Throat** | Throat, jaw, neck | Vox emitter / Expression beam | Silent nodes, choked wiring |
| **G** | Sternum, heart space | Identity core / Self projector | Empty mirror, no fixed self |
| **Heart** | Cardiac, left shoulder | Will cannon / Ego beacon | Vulnerable core, no willpower armor |
| **Solar Plexus** | Solar plexus, upper abdomen | Emotional engine / Mood reactor | Exposed feeling wires, mood-sensitive |
| **Sacral** | Lower abdomen, hips, sacrum | Power reactor / Generator core | No power source, dependent on others |
| **Spleen** | Spleen area, lymphatic | Instinct port / Immune array | No survival filter, health vulnerability |
| **Root** | Root base, adrenal glands | Pressure converter / Adrenal cannon | No pressure valve, stress amplification |

**Key Insight:** The character's **power** comes from what is defined. Their **wisdom** comes from what is open. A Manifestor with an open Sacral has immense initiating power but cannot sustain — they need a Generator partner (or battery pack) to complete missions.

### 4.3 Profile → Stance (D3: Witness)

The profile determines the character's pose, camera angle, and detail level (how much visual information is present).

| Profile | Stance | Pose | Camera | Detail |
|---------|--------|------|--------|--------|
| 1/3 | Investigator/Martyr | Crouched, examining | Low angle | 5/6 |
| 1/4 | Investigator/Influencer | Grounded, facing forward | Eye level | 4/6 |
| 2/4 | Hermit/Influencer | Seated, turned | Three-quarter | 3/6 |
| 2/5 | Hermit/Heretic | Back turned, looking over shoulder | Behind shoulder | 4/6 |
| 3/5 | Martyr/Heretic | Dynamic mid-action | Action pan | 6/6 |
| 3/6 | Martyr/Role Model | Ascending, transcendent | Below looking up | 6/6 |
| 4/6 | Influencer/Role Model | Mentor standing | Slight elevation | 4/6 |
| 4/1 | Influencer/Investigator | Networked, grounded | Eye level | 4/6 |
| 5/1 | Heretic/Investigator | Mysterious, partially obscured | Shadowed | 5/6 |
| 5/2 | Heretic/Hermit | Isolated beacon | Distant | 3/6 |
| 6/2 | Role Model/Hermit | Transcendent seated | Eye level soft | 2/6 |
| 6/3 | Role Model/Martyr | Wounded, rising | Low dramatic | 6/6 |

### 4.4 Authority → Color Palette (D5: Meaning)

The authority determines the primary color palette, glow color, and pulse pattern of the character.

| Authority | Primary | Secondary | Glow | Pulse | Visual Description |
|-----------|---------|-----------|------|-------|-------------------|
| Emotional | Deep Crimson `#DC3C28` | Amber `#FF8C00` | Warm Red `#FF503C` | Pulsing | Slow-breathing crimson glow in chest |
| Sacral | Deep Teal `#00B4C8` | Cyan `#00FFB4` | Teal `#00FFC8` | Steady | Generator hum, sustainable power |
| Splenic | Cold Steel `#B4C8DC` | Ice Blue `#6496FF` | Ice `#C8DCFF` | Erratic | Sudden ice-blue survival flashes |
| Ego | Gold `#FFD700` | Deep Red `#C83232` | Gold `#FFC832` | Steady | Heart-sun, will made metal |
| Self-Projected | Deep Violet `#9333FF` | Lavender `#C864FF` | Violet `#B450FF` | Pulsing | G-center identity beacon |
| Mental | Acid Green `#00FF96` | Moss `#32C864` | Green `#64FF96` | Erratic | Overclocked thought streams |
| Lunar | Moon Silver `#C8C8DC` | Shadow `#9696B4` | Silver `#DCDCFF` | Dormant | Phase-shifted, moon-modulated |
| Environmental | Neutral Grey `#646464` | Mirror `#969696` | Grey `#C8C8C8` | Steady | Body as room sensor |

### 4.5 The 64 Gates → 64 Implants

Each of the 64 Human Design gates becomes a **unique cybernetic implant** with:
- **Name:** The HD gate name (e.g., "Friction", "Creative", "Power Skills")
- **Implant Type:** The cybernetic device (e.g., "conflict_sensor", "neural_array", "resource_converter")
- **Body Location:** Where on the body it manifests (crown, jaw, throat, hands, etc.)
- **Visual Signature:** How it appears (radiating spikes, grid projectors, clockwork gears, etc.)
- **Circuit Color:** Individual (violet), Tribal (orange), Collective (teal), Integration (gold)

**Example Mappings:**

| Gate | Name | Implant | Location | Circuit | Visual |
|------|------|---------|----------|---------|--------|
| 1 | Creative | Neural Array | Crown | Individual | Radiating crown spikes |
| 6 | Friction | Conflict Sensor | Jaw | Tribal | Jaw-line tension glow |
| 10 | Behavior | Behavioral Matrix | Heart Space | Integration | Sternum pulsing grid |
| 14 | Power Skills | Resource Converter | Sacrum | Integration | Sacral gear converter |
| 20 | Now | Present Moment | Throat | Integration | Throat chrono-lock |
| 34 | Power | Raw Power Cell | Sacral | Integration | Sacral power flare |
| 43 | Insight | Breakthrough Array | Ajna | Individual | Ajna lightning bolt |
| 57 | Intuitive | Instinct Port | Spleen | Individual | Spleen clear beam |
| 61 | Mystery | Truth Seeker | Head | Individual | Head unknown vortex |

**Line Expression Modifier:**
The line of each gate (1-6) modifies the implant's intensity and expression:
- **Line 1:** Foundation/Investigation — implant is deeply embedded, structural
- **Line 2:** Projection/Calling — implant has a calling beacon, attracts attention
- **Line 3:** Trial & Error — implant shows wear, adaptive scarring
- **Line 4:** Externalization — implant is external, visible, influential
- **Line 5:** Universalization — implant is iconic, heretical, universally recognized
- **Line 6:** Role Model — implant is transcendent, minimal, perfected

---

## 5. Integration with Synthia OS

### 5.1 Server Placement

The HDCyberMorphEngine belongs in the **Synthia Body** server (the bridge layer), specifically as a **Body Field Extension**:

```
Synthia Core (Body) 
  └── BodyPresets.ts
  └── HumanAgent.tsx
  └── hd-cyber-morph/
      ├── HDCyberMorphEngine.ts      ← Main engine
      ├── HDCyberMorphUI.tsx         ← React component
      ├── gate-implant-map.ts        ← 64 gate specifications
      ├── center-modifications.ts    ← 9 center body maps
      ├── type-archetypes.ts         ← 5 type character classes
      ├── authority-palettes.ts      ← 8 authority color systems
      └── profile-poses.ts           ← 12 profile stance libraries
```

### 5.2 API Interface

```typescript
// POST /api/v1/morph/generate
interface MorphRequest {
  image: File;           // Face photograph
  chart: HDChart;        // Human Design chart data
  style?: string;        // Optional: "neon", "industrial", "biopunk"
  intensity?: number;    // 0.0 - 1.0
}

interface MorphResponse {
  image: string;         // Base64 encoded PNG
  spec: CyberpunkSpec;   // Full specification document
  narrative: string;     // Character backstory
  overlay: OverlayInstruction[];  // For client-side rendering
}
```

### 5.3 MCP Tool Integration

For the Termux/Synthia mobile deployment, the engine exposes these MCP tools:

- `morph_face` — Takes image + HD data, returns morphed character
- `analyze_chart` — Returns cyberpunk spec without image processing
- `get_gate_implant` — Returns implant details for a specific gate
- `get_type_archetype` — Returns archetype details for a type
- `compare_morphs` — Compares two HD charts as cyberpunk characters

---

## 6. Image Generation Pipeline

### 6.1 Stage 1: Face Detection & Landmark Mapping
- **Input:** Regular face photograph
- **Tool:** MediaPipe Face Mesh (468 landmarks)
- **Output:** Facial feature boundaries + HD center overlay coordinates

### 6.2 Stage 2: Spec Generation
- **Input:** HD chart + face landmarks
- **Tool:** HDCyberMorphEngine.analyze()
- **Output:** CyberpunkSpec JSON document

### 6.3 Stage 3: Overlay Generation (Preview)
- **Input:** Source image + CyberpunkSpec
- **Tool:** Canvas 2D / WebGL shader
- **Output:** Real-time preview with glows, implants, circuit patterns
- **Use Case:** Quick preview, mobile rendering, low-bandwidth

### 6.4 Stage 4: Deep Generation (Production)
- **Input:** Source image + CyberpunkSpec + style reference
- **Tool:** Stable Diffusion XL + ControlNet + IP-Adapter
- **Process:**
  1. Use ControlNet OpenPose for body pose (from profile stance)
  2. Use IP-Adapter for face identity preservation
  3. Use CyberpunkSpec as prompt engineering input
  4. Apply inpainting for implant details
- **Output:** High-resolution cyberpunk character art

### 6.5 Stage 5: Post-Processing
- Color grading based on authority palette
- Glow effects on defined centers
- Circuit pattern overlays on channels
- Eye color modification based on type

---

## 7. Example: Manifestor 1/4, Emotional Authority, Cross of Eden

### HD Chart
- **Type:** Manifestor
- **Profile:** 1/4
- **Authority:** Emotional
- **Defined Centers:** Heart, Throat, Head, Ajna, Root
- **Open Centers:** Solar Plexus, Sacral, Spleen, G
- **Conscious Gates:** 6.4, 12.1, 22.3, 36.2, 37.5, 49.6
- **Cross:** Cross of Eden

### Cyberpunk Spec Output

```json
{
  "archetype": "Vanguard",
  "faction": "Militech / Frontline",
  "threatLevel": 9,
  "stance": "Investigator/Influencer",
  "pose": "grounded_forward",
  "primaryPalette": [220, 60, 40],
  "secondaryPalette": [255, 140, 0],
  "glowColor": [255, 80, 60],
  "cyberneticZones": [
    { "center": "Heart", "modification": "will_cannon", "coverage": 0.7 },
    { "center": "Throat", "modification": "command_vox", "coverage": 0.5 },
    { "center": "Head", "modification": "command_array", "coverage": 0.5 },
    { "center": "Ajna", "modification": "tactical_processor", "coverage": 0.5 },
    { "center": "Root", "modification": "adrenal_cannon", "coverage": 0.5 }
  ],
  "organicZones": [
    { "center": "SolarPlexus", "exposure": "exposed_wiring" },
    { "center": "Sacral", "exposure": "no_power_source" },
    { "center": "Spleen", "exposure": "no_survival_filter" },
    { "center": "G", "exposure": "empty_mirror" }
  ],
  "implants": [
    { "gate": 6, "name": "Friction", "type": "conflict_sensor", "location": "jaw", "line": 4 },
    { "gate": 12, "name": "Caution", "type": "hesitation_brake", "location": "throat", "line": 1 },
    { "gate": 22, "name": "Grace", "type": "social_grace", "location": "solar_plexus", "line": 3 },
    { "gate": 36, "name": "Crisis", "type": "crisis_navigator", "location": "solar_plexus", "line": 2 },
    { "gate": 37, "name": "Friendship", "type": "bond_weaver", "location": "solar_plexus", "line": 5 },
    { "gate": 49, "name": "Revolution", "type": "rejection_field", "location": "solar_plexus", "line": 6 }
  ],
  "narrativeTheme": "Cross of Eden — The character who initiates through emotional friction, pauses with caution, and navigates crisis through friendship bonds. Their open Sacral means they cannot sustain alone — they need a Generator partner to complete the mission. The open G means they have no fixed identity — they become whoever the mission requires."
}
```

### Visual Description

**Face:** Angular jaw with visible conflict sensors (Gate 6.4) — a tension-detection array that glows crimson when interpersonal friction is detected. The jaw is the most modified part of the face, reflecting the 1/4 profile's investigative depth (Line 1) combined with influential reach (Line 4).

**Eyes:** Fiery red-orange (Manifestor signature) with tactical processing overlays (defined Ajna). The eyes burn with initiating power but show no emotional processing (open Solar Plexus means feelings are received, not generated).

**Throat:** Command vox emitter with hesitation brake (Gate 12.1) — the Manifestor's throat is powerful but cautious. A valve mechanism physically prevents rash speech. When they do speak, it carries authority.

**Chest:** Heart center is a will cannon (defined) — the character has immense willpower and ego strength. But the solar plexus area shows exposed wiring — they feel others' emotions intensely but have no internal emotional authority of their own. The emotional authority comes from a wave pattern, visible as a slow-breathing crimson glow.

**Sacral:** Open — no power reactor. This Manifestor cannot sustain long operations. They initiate brilliantly but need to retreat or delegate to Generators. The empty sacral shows as a dark cavity with connection ports for external power sources.

**Root:** Adrenal cannon — defined root means they handle pressure well. The root base shows pressure valves and adrenal boosters.

**Overall:** A frontline commander with powerful initiating capacity, strong will, and tactical mind — but emotionally receptive (not generative), unsustainable alone, and identity-fluid. The Cross of Eden theme suggests a character who creates new beginnings through struggle and friendship.

---

## 8. Implementation Roadmap

### Phase 1: Spec Engine (Complete)
- ✅ HD chart parser
- ✅ Aesthetic mapping tables (64 gates, 9 centers, 5 types, 8 authorities, 12 profiles)
- ✅ Spec generation pipeline
- ✅ JSON export

### Phase 2: Canvas Preview (Complete)
- ✅ Real-time overlay renderer
- ✅ Glow effects, implant markers, circuit patterns
- ✅ Color grading and vignette
- ✅ Web interface

### Phase 3: Deep Generation (Next)
- ⬜ Stable Diffusion XL integration
- ⬜ ControlNet pose pipeline
- ⬜ IP-Adapter face preservation
- ⬜ Custom LoRA training on cyberpunk character art
- ⬜ Inpainting for implant detail

### Phase 4: Mobile/Termux (Future)
- ⬜ Lightweight ONNX runtime
- ⬜ Termux daemon integration
- ⬜ MCP server tools
- ⬜ Batch processing for avatar generation

---

## 9. Files Delivered

| File | Description | Lines |
|------|-------------|-------|
| `hd_cyber_morph_engine.ts` | Core TypeScript engine with full mapping tables | ~1200 |
| `hd_cyber_morph_widget.html` | Interactive web demo with canvas renderer | ~900 |
| `hd_cyber_morph_design.md` | This design document | ~400 |

---

## 10. Theoretical Foundation

This system is built on the understanding that **Human Design is a morphogenetic field description** — it maps how energy moves through a body, which centers are stable (defined) vs adaptive (open), and which gates (genetic imprints) create specific behavioral and perceptual patterns.

By translating these patterns into cybernetic modifications, we create a **biosemiotic character design system** where:
- **Defined centers** = Hardwired cybernetics (stable, reliable, always-on)
- **Open centers** = Organic vulnerability (receptive, adaptive, conditioned by environment)
- **Gates** = Specific implants (the 64 genetic imprints as 64 device types)
- **Channels** = Circuit connections (energy flow paths as glowing conduits)
- **Type** = Character class (the role in the social/physical system)
- **Profile** = Stance (how the body presents itself to the world)
- **Authority** = Decision-making glow (the signal that indicates authentic action)

The result is not just a cool image — it is a **visual representation of a person's energetic architecture**, rendered in the symbolic language of cyberpunk.

---

*Built for Synthia OS. The body is the message.*
