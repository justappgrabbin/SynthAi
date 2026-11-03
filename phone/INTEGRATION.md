# Working integration

This directory is the application, not an archive collection. Run `python run_app.py` and, in web/, `npm ci` then `npm run dev -- --host 0.0.0.0`. The development proxy connects phone UI requests to the backend. Use a trusted local network; this prototype does not yet provide multi-user authentication.

Set SYNTHIA_MODEL_RUNTIME=ollama and SYNTHIA_MODEL to an installed model name. SYNTHIA_MODEL_URL defaults to http://127.0.0.1:11434. For llamafile, set SYNTHIA_MODEL_RUNTIME=llamafile; the default base is http://127.0.0.1:8080. Restart the backend after configuration. Model weights remain external to this application. No paid model is used and no replacement language model is trained.

The original chart engine, symbolic/contact machinery and knowledge corpus are preserved. The Self-Discovery storage and progression functions are reused in the cultivation screen with a browser UUID adapter and local persistence. Added code connects these modules; it does not claim they implement validated psychology. The original general-purpose English paragraphs are not faithful translations of the detailed Chinese corpus. Chart chat now receives original detailed records and must explain relevant content in English; faithful translation quality still requires evaluation with a live model.

The six proposed test protocols are in docs/experiment-tests and in the phone interface. No successful social experiment is claimed.

Build: `cd web && npm run build`; runtime: `cd runtimes/isohuman && npm run build`. Tests: `python -m pytest tests/test_local_model.py tests/test_geonatal.py tests/test_contact_loop.py tests/test_being_state.py`.

The supplied Fagan–Bradley approximation and cross-frame houses still require independent precision validation. The chart API returns four distinct chart records anchored to the same natal tropical Personality Sun. Birth profiles and chat are durable locally. Production account-to-private-chart access, measured social matching, and approved mobile release delivery remain integration work. GitHub deployment needs the intended repository and deployment target before enabling releases.

GitHub: validation runs on pull requests and pushes to main. The manual approved-build workflow targets `owner-approved-release`. Configure that GitHub Environment with the owner's required review before enabling it; an environment name alone does not enforce approval. This produces a frontend artifact, not a deployed mobile update. A repository, authenticated backend deployment, and update distribution target are still needed. No GitHub push has occurred.
