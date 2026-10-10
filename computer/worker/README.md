# Relay unattended worker

This is an executable worker, not a scheduled reminder. The HTTP service supervises a separate worker process. Job specifications, checkpoints, event history, results and verification records are retained on a persistent disk. The phone can disconnect after submission; it is not needed for execution.

## Actual supported operations

- Build a task tracker or notebook through the original AutoLing and AutoNovel implementations.
- Run a separate browser verifier against the generated artifact: add an entry, complete a task when applicable, reload and recover data, delete the entry, and reject JavaScript errors.
- Recover queued/running jobs after a process restart; reuse the saved artifact rather than rebuilding a checkpointed job.
- Deliver only verified artifacts through the authenticated API. Relay imports them into its existing project workspace and exposes Open app and Export app.

This worker does not yet implement arbitrary software construction, general source repair, or swarm/memory evolution. A failed verification stays failed with its error; it is never reported as finished. Supported construction rules can be extended with additional narrow-scope handlers.

## Run and deploy

`npm ci`, then `npx playwright install --with-deps chromium`. Set a random `RELAY_API_TOKEN` of at least 32 characters and a persistent `RELAY_DATA_DIR`. Start `npm run start:worker`. For local browser use, include its exact origin in the comma-separated `RELAY_ALLOWED_ORIGINS`; the default allows the Android workspace's `https://relay.local` origin.

`render-worker.yaml` declares one always-on Docker web service with an internal worker process and a 1 GB disk. This deliberate single-instance arrangement lets the API and worker share the same durable disk; separate Render services cannot share a disk. The Dockerfile installs the exact locked Playwright package and its matching browser. Automatic deployment is disabled. Deployment has not been performed in this session.

Proposed hosting: 1 CPU/2 GB Render service ($25/month) plus 1 GB disk ($0.25/month), approximately $25.25/month before bandwidth or other account charges. No model API is invoked by these two handlers. Pricing checked against Render's published pricing on October 10, 2026. Inspect existing paid hosting before creating another billed service.

## Phone connection

Enter the deployed HTTPS service address and its token in Build → Unattended worker. Connect worker confirms that the service has a live worker process. Build while away submits the project name and declared notebook/task-tracker purpose. Refresh jobs retrieves status; Bring into Relay imports a verified result. The Android token is encrypted with an Android Keystore key. Generated app windows receive the export bridge but never the credential bridge. Browser tokens remain only in the workspace module’s memory and must be reentered after a reload. Generated app windows have no opener reference and receive no copied browser token.

## API

All `/api` routes require `Authorization: Bearer <token>`. `POST /api/jobs` also requires an `Idempotency-Key`; retries reuse a job instead of creating duplicates. The body is `{ "name": "Trip", "kind": "tasks", "description": "" }`. `GET /api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/artifact`, and `/api/worker/status` expose status and verified results. `/health` is a public minimal process-liveness endpoint. It is not proof that an artifact passes verification.

## Reliability targets and recovery

Initial single-instance targets: claim an accepted job within 5 seconds when idle; finish or report verification failure within 90 seconds for supported builds on adequately sized healthy hosting; never expose an unverified artifact as complete. These are targets, not production SLO results. The local restart and client-disconnection tests passed. Monthly availability and cloud recovery timings remain unmeasured.

Atomic job-file publication and idempotent submission preserve accepted jobs across process restarts. One worker owns the disk at a time. Restart the service after a worker failure; its supervisor also attempts a restart automatically. If verification fails because Chromium is unavailable, correct the deployment dependencies; do not relabel the artifact as verified. Keep the persistent disk when replacing a service. Copy its job directory to separate retained storage before infrastructure changes; restoration should be exercised before relying on it. No cross-region backup or disaster-recovery service is configured here.

The worker's verifier receives only the generated app and a reduced environment, with no API token. It blocks external browser requests. This is verification for the known generated apps, not a sandbox for executing arbitrary uploaded projects. API tokens belong in hosting secrets, never source, app exports or job logs.

## Verification

`RELAY_TEST_BROWSER=1 node --test computer/tests/worker.test.mjs` tests a real subprocess interruption/restart and browser verification. `npm run test:browser` exercises submission through the visible Relay UI, closes all client pages during execution, then imports and uses the delivered app. `npm test` covers the existing runtime and local queue (the heavy worker test is opt-in). Physical Android credential storage, popup and file-picker behavior remain unvalidated on a device. The Docker image and Render deployment have not been executed locally.
