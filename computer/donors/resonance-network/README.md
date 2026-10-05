# YOU-N-I-VERSE / Resonance Network — Assembled Build

This is the assembled, verified app, built from `production_ready.zip`
(the newest, most complete package you uploaded — confirmed by diffing
every other uploaded file against it; older versions were left out) plus
the 9-center "organism" layer described in chat, which did not exist
before this session.

## What was verified for real in this session (not assumed)

- All 17 original backend Python modules: compile clean (`py_compile`).
- A real FastAPI server was booted and hit with real HTTP requests:
  profile creation produced a real ephemeris-based chart (Skyfield/DE421),
  with real Gate/Line/Color/Tone/Base addresses and real Defined/Open
  center states.
- Frontend: `npx tsc --noEmit` and `npx vite build` both clean, 108
  modules, real production bundle in `frontend/dist/` after you build it.
- The 8 TypeScript "hub" tools (`hub-services/src/*.ts`) plus the new
  `mesh-core.ts`: all compile clean with `tsc`. Two real bugs found and
  fixed in `autonovel.ts` while wiring it in (a nonexistent `.genre`
  field, a `midoint`/`midpoint` typo).
- The organism gating logic: tested live through the real API — a real
  user's Root/MCP-HUB center was confirmed **dormant** before finalize,
  and confirmed **unlocked** immediately after a real
  `POST /api/organism/finalize` call, persisted in SQLite (survives
  restart), reversible via `/api/organism/{user_id}/revoke`.

## New this session: `backend/energy_centers.py`

Maps the 9 real Human Design centers (already computed by
`hd_engine.py` from actual gate/channel activation) to 9 existing
subsystems in this project:

| Center | Hub | Where |
|---|---|---|
| Head | AUTOLING | `backend/autoling.py` |
| Ajna | SYNTHESIST | `backend/synthesist_engine.py` |
| Throat | MESSI | `hub-services/src/messi.ts` |
| G | AUTONOVEL | `hub-services/src/autonovel.ts` |
| Ego | DEVCORE | `hub-services/src/devcore.ts` |
| Spleen | DISEMINER | `backend/diseminer_engine.py` |
| Solar | VALORA | `hub-services/src/valora.ts` |
| Sacral | MESHWEAVE | `hub-services/src/meshweave.ts` |
| Root | MCP-HUB | `hub-services/src/mcp-hub.ts` |

This mapping is a documented design decision, not a rediscovered
"original" one — the source files disagreed with each other about hub
numbers, so this reconciles them by matching each hub's actual function
to the center it fits, in the open, in code comments.

**The rule that matters most**: Root/MCP-HUB — the only center that can
reach outside the organism to another LLM/service — stays dormant for a
user regardless of whether their Root is Defined, until
`POST /api/organism/finalize` is called for them specifically, after the
other 8 centers have produced something the person has actually seen.
This is enforced in `energy_centers.py` / `main.py`, the one place every
API call passes through — not left for the hub tool to self-police.

New endpoints:
- `GET /api/organism/{user_id}/status` — live per-user center/hub state
- `POST /api/organism/finalize` — the only way to unlock Root/MCP-HUB
- `POST /api/organism/{user_id}/revoke` — re-lock it

New screen: `frontend/src/screens/OrganismScreen.tsx`, in the bottom nav
as "ORGANISM."

## What's still genuinely open (not fake-finished)

- The 8 TypeScript hubs compile but aren't yet exposed over HTTP for the
  Python backend to actually call — `energy_centers.py` currently
  reports *whether* each hub should be active/receptive/dormant for a
  user, but doesn't yet invoke `messi.ts`/`autonovel.ts`/etc. Wiring a
  small Node service (`hub-services/`) up as a real HTTP peer that
  `main.py` calls is the natural next step.
- `mcp-hub.ts` itself still only knows about GitHub/generic MCP servers
  in its `initializeServers()` — connecting it to real external LLM
  endpoints once unlocked is unbuilt.
- Everything flagged as "not yet built" in the original
  `PRODUCTION_MANIFEST.md` (Neo4j canonical layer wiring, Bridgefy P2P
  mesh, Capacitor native build) is still exactly that: not built. Not
  re-claimed as done here.

## Running it

**Backend**
```
cd backend
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --port 8811
```

**Frontend**
```
cd frontend
npm install
npm run dev
```

**Hub services (TypeScript, compiles, not yet HTTP-wired)**
```
cd hub-services
npm install
npx tsc --noEmit   # verify
```

## External Opportunity / MCP membrane (2026-09-23 integration)

The complete `Synthia-MCP-Opportunity-Consent` layer is now mounted in
`external-opportunity/`. Internal network matching runs first; unmatched Market
needs can then search authorized external MCP participants/business systems.
External candidates remain outside the Resonance Network until they accept an
invitation. Collaboration and installation consent are separate, and deployment
is blocked without a valid installation token.

Run backend + opportunity service together with:

```bash
./run-backend-with-opportunities.sh
```

Configure real MCP participants in
`external-opportunity/config/mcp-servers.json`; see the example and
`docs/EXTERNAL_OPPORTUNITY_MCP_STATUS.md`.
