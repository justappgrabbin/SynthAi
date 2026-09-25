# ResearchReportAutomaton v0.1.0

This is an additive bounded-automata cartridge for the PR #13 magazine:

`ResearchScout → EvidenceMiner → ScientistLoop → ReportPlanner → ReportWriter → ReportVerifier → Publisher`

It accepts local sources and optionally detects `globalThis.SynthiaResearchBridge` when the 5.8 browser/container exposes a `research` or `search` function. The bridge is an input adapter; it does not replace the evidence ledger or publication verifier.

The ScientistLoop keeps source-supported findings separate from unsupported claims. Unsupported claims are excluded from Findings and retained in Limitations. Publisher refuses an unverified packet.

The output carries `acceptance=statically-verified-not-user-accepted`. A generated report is not treated as creator-accepted merely because the deterministic pipeline and tests passed.

This cartridge does not modify protected Prime 5.8, Echo, Venom, or 5.7. It does not reuse Synthia's life-process swarm as a software-worker swarm.

