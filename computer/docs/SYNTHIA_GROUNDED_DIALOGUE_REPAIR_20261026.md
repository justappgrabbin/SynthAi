# Synthia dialogue repair — release gates (2026-10-26)

## Defect

The provided Spacetime LLM workbench scored handwritten realization patterns, lexical associations and Klein variants; it was not a pretrained neural language model. The existing SynthAi Computer also delegated visible chat text to Morph Chat despite its dual-graph resident observing and recording the conversation. Linguistic processing did not imply that returned facts were externally verified.

## Changes in this branch

- GroundedDialogue answers supported questions from actual Computer VFS records, world snapshots, donor event reports and earlier attributed user statements. Reports remain explicitly unverified; the current question cannot appear as a recalled memory.
- LocalSequenceLearner is a bounded token-trigram probability model trained only from explicit user-corrected replies to real previous turns. No arbitrary user observation is treated as a verified fact or reply-training sample; training persists across restart.
- ConversationExecution reply priority: host evidence first, human-trained sequence second, original Morph Chat third. The legacy provider is labeled pattern-based, never an LLM. The UI displays the actual provider and stores its origin.
- Existing Synthia Chat now includes an Improve reply correction field and a Save training example action. The response is never prefilled as a purported human correction; unchanged old answers are rejected.
- Computer host accepts POST /api/synthia/teach-language with turnId and answer; GET /api/synthia/status reports local learner capabilities. No external tool execution or owner permission is granted by the training endpoint.

## Using Synthia after actual deployment

Open Computer > Synthia. Ask: What is the status of the Synthia model? Or list imported files; those answers are derived from live runtime state. After discussing a topic, ask What did I say about [topic]? to retrieve attributed memory. To teach a preferred response, choose Improve reply, write the correction and save it. The next similar request can use the learned local token model.

## Verification

Node tests: synthia-resident.test.mjs, kimi-donor-evidence.test.mjs, grounded-dialogue.test.mjs, local-language-learner.test.mjs, runtime.test.mjs, reassembly-ingest-e2e.test.mjs.
Desktop build: npm --prefix computer/shell/kimi-linux ci --no-audit --no-fund ; npm --prefix computer/shell/kimi-linux run build. These commands are included in the acceptance GitHub Actions workflow.

## Honest limits

- This is not a pretrained LLM, transformer or complete general-purpose language generator. The token model can reproduce and recombine approved examples; it will not reliably answer arbitrary unseen questions.
- Unmatched prompts retain the old Morph Chat path, visibly labeled pattern-based. Do not mistake the parser's success for externally verified evidence.
- The three original Kimi donor archives have a separate event receipt bridge in PR #53 but are not end-to-end mounted as full executable/visual applications. Their original source code and media are not bundled here.
- Passing Node tests and desktop compilation does NOT verify a physical Android APK, 3D GPU output, offline video decoding, or installability. These remain independent release gates.
- Persistence encryption and authenticated owner identity are not added here; learning corrections cannot exercise tool execution permissions.

Originals and previous integration branches are preserved. This is an additive patch on the existing Computer.