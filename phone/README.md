# Synthia · Human Design, cultivation, and research

One birth configuration is the source of truth: birth date, exact time, timezone, and place coordinates. The natal tropical Sun anchors the configuration. Tropical, Draconic Tropical True Node, Draconic Tropical Mean Node, and Sidereal Fagan–Bradley charts come from that same calculation.

## Run the working phone interface

Requires Python 3.11+ and Node 22+.

```sh
pip install -r requirements-web.txt
cd web
npm ci
npm run build
cd ../runtimes/isohuman
npm ci --ignore-scripts
npm run build
cd ../..
python run_app.py
```

Open http://localhost:8000. On a trusted local network, a phone can use the computer's local IP at port 8000. The Android preview connects to an HTTPS instance of this server. See [phone preview setup](docs/PHONE-PREVIEW.md) for the APK and server connection. The repository does not provide hosted server uptime.

Create the master birth chart first. The chart, four frame views, cultivated-self guidance, game content, and prediction log share its configuration. The supplied Computer and Resonance Network are available from the same interface. Their existing field/waveform engine receives the master chart through an adapter; it does not calculate a competing birth chart. Human and isohuman origin pairs share the master configuration hash.

## Local model

Copy .env.example to .env and set SYNTHIA_MODEL to a model already installed in Ollama. Start Ollama separately. For llamafile, change SYNTHIA_MODEL_RUNTIME and SYNTHIA_MODEL_URL as described in .env.example. Restart the app after configuration. Model weights are external; no language model is trained or bundled in this project. An unavailable model returns an explicit error instead of a canned answer.

Users can ask about the system without entering personal birth information. Personal questions require the selected chart; detailed source records and the chosen coaching methodology are passed to the local model for English explanation. Translation fidelity and live model behavior still need evaluation with the chosen running model.

## Evidence and data

The six research protocol pages state expectations, comparison groups, and falsification criteria. The chart-scoped prediction log locks future claims, stores outcomes separately after the deadline, and computes Brier scores against a baseline. Hashes help detect changed records; they do not independently attest registration time. No empirical validation of Human Design, astrology, or the proposed resonance mechanics is claimed.

Game fragments and archetypes use deterministic chart-derived selection. Their sequence also depends on the user's choices and progress. These are experimental game rules, not psychological measurements. Progress is browser-local and separated by configuration. Birth charts and chat sessions persist in local SQLite. Original observations and later interpretations must remain distinct.

The original social server supports accounts, posts, messages, projects, and experiment observations. Signed-in opt-in resonance discovery, account-to-chart ownership checks and invitation consent are integrated. Private chart, journal, personal chat and prediction routes now enforce creating-browser or linked-account ownership. Signing in from the creating browser links its chart to that account; another signed-in device restores its own saved chart. Prediction records are isolated by private chart ID even when birth configurations match. This remains a private development server; broader administrative routes, hosting and operational controls still need production review.

No nested archives or duplicated donor projects are needed by the app. Development dependencies and model weights are excluded from phone frontend builds. Existing reference knowledge and source-derived mechanisms remain separate from observed evidence.

## Checks

```sh
python -m pytest tests/test_birth_anchor.py tests/test_local_model.py tests/test_research_registry.py tests/test_integrated_questions.py tests/test_geonatal.py tests/test_contact_loop.py tests/test_being_state.py tests/test_cultivation.py tests/test_resonance_network.py tests/test_private_access.py tests/test_ephemeris_reference.py -q
node scripts/test-chart-game.mjs
```

The repository-level Human Design and Resonance APK workflow builds and tests this integration branch. After reviewing a change, use its manual workflow action to publish an APK prerelease. It does not silently install updates or deploy a backend. World embodiments and the interactive science lab come later.

Browser-only charts require the original private cookie. Link a chart by signing in from its creating browser before clearing cookies. Legacy local charts without ownership records are not claimable by ID; recreate them rather than exposing an adoption endpoint. Linking removes anonymous access to that chart.

Independent chart-reference checks and the version-2 node/horizon corrections are documented in [Ephemeris checks](docs/EPHEMERIS-CHECKS.md). Numerical agreement does not validate personality or resonance hypotheses.
