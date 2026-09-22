# Closed-Loop App Foundry

## Overview
A complete web console implementing glyph-based component registry, lineage tracking, and quality governance through the Resonance Engine (LAW).

## Current State
- Full backend service layer implemented: Resonance Engine, Overseer, Selector, Builder, Financial Engine
- Frontend pages: Studio, Overseer, Agents, System
- Database schema for glyphs, edges, agents, resonance profiles

## Architecture

### Core Services

**Resonance Engine** (`server/resonance-engine.ts`)
- LAW - the mandatory, non-negotiable alignment system
- Human Design calculations using Ra Uru Hu's canonical 5°37'30" per gate math
- Three-layer chart system: Body (Tropical), Mind (Sidereal/Fagan-Bradley), Heart (Draconic)
- Formula: `Score = (HD Alignment × I Ching Probability) / Friction Factor`
- Field diagnosis for missing harmonics, charge imbalance, chart disorder

**Overseer** (`server/overseer.ts`)
- Governance enforcement with freeze/approve/deny decisions
- Thresholds: Coherence ≥ 70, Resonance ≥ 0.5
- Conservative defaults when no activation data (resonanceScore = 0.1875, approved = false)
- Freeze on critical fail (coherence < 30 or resonance < 0.1)
- Incorruptible decision logging

**Selector** (`server/selector.ts`)
- Weighted routing with resonance awareness
- Filters by type, quality, and resonance thresholds
- Integrates Overseer checks for every selection

**Builder** (`server/builder.ts`)
- App assembly with causal graph tracking
- Hard-stops on component-level Overseer denials/freezes
- Financial impact calculation for each build

**Financial Engine** (`server/financial-engine.ts`)
- Stability scoring with ethical constraints
- Risk assessment (max risk ≤ 0.7)
- Resonance requirement (> 0.3)
- Timeline constraints (≤ 90 days)

### Pages

**Studio** (`/studio`) - Build apps with Overseer governance
**Overseer** (`/overseer`) - Governance dashboard with decision logs and freeze controls  
**Agents** (`/agents`) - Hugan ecosystem with resonance/economy bindings
**System** (`/system`) - Admin/Dev/User modes with financial engine and health monitoring

### API Routes

- `/api/resonance/*` - Resonance Engine endpoints
- `/api/overseer/*` - Governance evaluation and control
- `/api/selector/*` - Component selection
- `/api/builder/*` - Build manifest submission
- `/api/financial/*` - Financial evaluation
- `/api/system/*` - System health and mode management

## Technical Requirements

### Resonance Engine (LAW)
- 5°37'30" (5.625°) per gate for ecliptic to gate mapping
- Fagan-Bradley ayanamsa: 24°02'31" + precession for Sidereal
- North Node shift for Draconic calculations
- 64 gates with 6 lines each, Color-Tone-Base subdivisions

### Approval Thresholds
- Coherence Score ≥ 70
- Resonance Score ≥ 0.5

### Empty Activation Handling
When no activation data is provided:
- hdAlignment = 0 (no gates activated)
- resonanceScore = 0 (below threshold)
- coherenceScore = 100 (no issues detected)
- approved = false (resonance threshold not met)

## Running the Project
```bash
npm run dev
```
Starts Express backend + Vite frontend on port 5000.
