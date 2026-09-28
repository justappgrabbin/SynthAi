# The Foundry

An offline-first app that transforms code fragments into complete applications.

## What This Is

The Foundry is **not** a code editor, GitHub clone, or cloud storage service.

It's a **transmutation engine** that:
- Collects scattered code fragments
- Organizes them intelligently
- Assembles them into complete apps
- Preserves fragments with lineage after they are used

## Philosophy

**Completion over accumulation.**

Fragments are reusable ingredients.
Apps are permanent artifacts.
Nothing is hard-deleted by the patched swarm integration; consumed material is preserved as lineage.

## Features

### The Pool
Drop your code fragments here. They're given:
- A unique glyph (visual identifier)
- Automatic type detection
- Metadata extraction

### The Forge
Stage fragments and assemble them into apps. The system:
- Analyzes what you have
- Detects missing pieces
- Generates glue code (entry points, configs)
- Validates the structure

### The Vault
Your completed apps live here. They're:
- Clean and organized
- Ready to export
- Treated as artifacts, not ingredients

### Export (Coming Soon)
Push to GitHub or download as zip files.
**Only goes online when you explicitly press the button.**

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## How To Use

1. **Drop files into The Pool**
   - Drag & drop or click to browse
   - Any code files work

2. **Select fragments to assemble**
   - Click checkboxes to select
   - Click "Stage for Assembly"

3. **Go to The Forge**
   - Review staged fragments
   - Click "Assemble App"

4. **Find your app in The Vault**
   - Complete, validated application
   - Ready to export or use

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- IndexedDB (local storage via idb)
- React Router (navigation)

## Roadmap

- [x] Basic Pool functionality
- [x] Fragment storage
- [x] Simple assembly
- [x] Vault display
- [ ] Real LLM integration (Transformers.js)
- [ ] Zip export
- [ ] GitHub push
- [ ] Auto-cleanup of consumed fragments
- [ ] Mobile wrapper (Capacitor)

## Philosophy in Action

**What happens to fragments after assembly?**

They're marked as "consumed" and preserved as lineage.
Archiving hides material from the active workspace without destroying it.

The goal is to **finish things** without losing the ingredients that made them possible.

## Offline First

This app works completely offline by default.
It only goes online when you explicitly export to GitHub.

All data stored locally in your browser's IndexedDB.

## License

MIT
