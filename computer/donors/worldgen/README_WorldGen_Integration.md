# Synth OS + WorldGen Integration

## What This Is

This integration connects your **Synth OS** (Human Design computation kernel) with **WorldGen** (3D Gaussian Splatting scene generation) to create agentic worlds that emerge from birth chart data.

**Core Principle:** Every agent's environment is a function of their design.

## Files Included

| File | Purpose | Language |
|------|---------|----------|
| `worldgenBridge.ts` | TypeScript client for WorldGen API | TypeScript |
| `worldgen_service.py` | Python Flask server wrapping WorldGen | Python |
| `WorldGenApp.tsx` | React components for OS integration | TypeScript/React |
| `COMPREHENSIVE_ARCHITECTURE.md` | Full architecture documentation | Markdown |

## Quick Start

### 1. Install WorldGen (Python Backend)

```bash
# Clone WorldGen
git clone --recursive https://github.com/ZiYang-xie/WorldGen.git
cd WorldGen

# Create environment
conda create -n worldgen python=3.11
conda activate worldgen

# Install dependencies
pip3 install torch torchvision
pip install .
pip install git+https://github.com/EnVision-Research/DA-2.git#subdirectory=src --no-deps
pip install git+https://github.com/facebookresearch/pytorch3d.git --no-build-isolation

# Install Flask for our bridge
pip install flask flask-cors flask-socketio

# Optional: Viser for exploration
pip install git+https://github.com/ZiYang-xie/viser.git
```

### 2. Start the WorldGen Service

```bash
# Copy worldgen_service.py to your project
python server/worldgen_service.py

# Service will start on http://localhost:5000
# WebSocket on ws://localhost:5000
```

### 3. Integrate into Synth OS

```typescript
// In your OS app:
import { useWorldGen, WorldViewer } from './lib/worldgenBridge';

function YourApp() {
  const { generateWorld, currentWorld, exploreUrl } = useWorldGen({
    apiEndpoint: 'http://localhost:5000'
  });

  // Generate world from birth chart
  const seed = {
    agentId: 'user-123',
    birthChart: calculatedChart,
    phs: { environment: 'mountains', tone: 3, base: 2 },
    activeGates: [1, 8, 34],
    // ... see worldgenBridge.ts for full interface
  };

  generateWorld(seed);

  return <WorldViewer world={currentWorld} exploreUrl={exploreUrl} />;
}
```

## Architecture Overview

```
Birth Data → PHS Calculation → Elemental Codon → WorldGen Prompt → 3D Scene
     ↓              ↓                ↓                ↓              ↓
  Planets    Environment      Gate→Element       Natural      Gaussian
  Gates      Tone/Base        →Architecture       Language     Splat/Mesh
  Lines      6 Environments   →Temporal Mode      Prompt       360° Explore
```

## PHS Environment Mapping

| Environment | Element | Neural Family | World Character |
|-------------|---------|---------------|----------------|
| **Caves** | Earth | DFF | Enclosed, protected, womb-like |
| **Markets** | Metal | HMM | Active exchange, social density |
| **Mountains** | Fire | LSM | Elevated, clear, exposed |
| **Valleys** | Water | MC | Contained, fertile, convergent |
| **Shores** | Air | HMM | Edge, transitional, liminal |
| **Kitchens** | Wood | Hybrid | Transformational, alchemical |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check service status |
| `/generate` | POST | Generate 3D scene from prompt |
| `/explore` | GET | Launch Viser for 360° exploration |
| `/world/<id>` | GET | Get world metadata |
| `/world/<id>` | DELETE | Delete world and cleanup |
| `/update` | POST | Send agent actions to world |
| `/worlds` | GET | List all worlds |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `connect` | C→S | Client connects |
| `join-world` | C→S | Join a world's room |
| `agent-action` | C→S | Send action to world |
| `world-morph` | C→S | Trigger world morph |
| `agent-joined` | S→C | New agent in world |
| `agent-action` | S→C | Broadcast agent action |
| `world-morphing` | S→C | World is morphing |

## Environment Variables

```bash
# .env
WORLDGEN_API_URL=http://localhost:5000
WORLDGEN_MODE=t2s  # t2s, i2s, pano2s
WORLDGEN_RESOLUTION=high
WORLDGEN_CACHE=true
WORLDGEN_LOW_VRAM=false  # Set true for <24GB VRAM
```

## Troubleshooting

### WorldGen not found
```bash
# If WorldGen import fails, the service runs in "mock mode"
# It returns placeholder data but won't generate actual 3D scenes
# Install WorldGen properly: https://github.com/ZiYang-xie/WorldGen
```

### CUDA out of memory
```bash
# Set low_vram=True in config or use CPU
export WORLDGEN_LOW_VRAM=true
```

### Viser not launching
```bash
# Install Viser separately
pip install git+https://github.com/ZiYang-xie/viser.git
# Or use the file_path fallback to load .ply in your own viewer
```

## Next Steps

1. **Wire into your OS Shell**: Add WorldGen app to `src/os/appRegistry.ts`
2. **Build PHS calculator**: Connect birth chart → PHS determination
3. **Add elemental visualization**: Show Fire/Water/Earth/Air zones in 3D
4. **Implement dream sharing**: Enable Gen 1+ agent resonance worlds
5. **Responsive environments**: Make worlds react to agent morph actions

## References

- **WorldGen**: https://github.com/ZiYang-xie/WorldGen [^2^]
- **Synth OS**: Your existing Human Design kernel
- **Elemental Codon Engine**: Gate→DNA→Element→Architecture mapping

---

Built for the resonance engine.
