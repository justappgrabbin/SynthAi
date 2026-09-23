# PROVENANCE — Synthai2 penta/composite ephemeris (recovered donor, wave-3 P0)

- Source repo: justappgrabbin/Synthai2 @ main, commit cfbe3ee3018c41fc8abe6e1734eee5b630595a3f
- File taken (verbatim, 822 lines): synthia-server/ephemeris.py — real PyEphem
  triple-zodiac (tropical/sidereal/draconic); contains calc_penta (5 positions
  Foundation/Connector/Provider/Director/Transmitter), calc_wa (pair group field
  with emergent gate + penta_needed completion logic).
- Language: Python. NOT rewritten; executed via child_process boundary
  (computer/services/penta-runner.py adapter + penta-ephemeris.mjs lazy wrapper).
- ENV REQUIREMENT: python3 + pyephem. pyephem 4.2.1 installed locally via pip
  (user site) on 2026-09-23 — documented here; `import ephem` verified. If
  missing, the wrapper emits service:provider-failure and status stays PRESENT.

## KNOWN donor limitations (recorded, not hidden)
- Penta POSITION FORMULA is a PLACEHOLDER hash: pos = (body+mind+heart)%5+1.
  The gates/coordinates feeding it are REAL PyEphem computations; group
  completion logic (filled/needed positions) is real.
- calculate() full report additionally imports trinity_field/state_observer/
  quantum_bridge/sentence_engine (NOT vendored); we call TrinityCalculator.
  generate_trinity_report() directly, which depends only on ephem+math.
