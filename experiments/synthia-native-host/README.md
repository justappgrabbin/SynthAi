# Synthia Native Host — independent Computer trial

**Chosen complete host:** Bitterbot Desktop `v1.10.1` (from the supplied `bitterbot-desktop-main.zip`). The original code and its desktop gateway remain the runtime. **Synthia** is an independently authored project identity and workspace, not a generic chatbot template.

**This is a replacement-host experiment, not another SynthAi Computer module.** This folder is intentionally isolated from `computer/` and every existing integration branch. No previous Computer code or user files are migrated, replaced, overwritten, merged or deleted.

## What is real versus missing

| Component | Comes from | State |
| --- | --- | --- |
| Desktop/web Computer host + gateway | Unmodified Bitterbot v1.10.1 | Existing upstream product; **not yet booted here** |
| Synthia identity / operating rules | This trial's GENOME and PROTOCOLS | Created, versioned |
| Conversation inference | Local Ollama running `qwen3:4b` | Requires model installation on the test machine |
| Memory + sessions | Upstream Bitterbot runtime | Separate candidate profile |
| Tools | Upstream, restricted by trial policy | Trial blocks command execution, process, browser, outbound message and automation tools |
| Phone application | None | Bitterbot targets macOS/Linux/Windows via WSL2. This is not an Android APK |
| Synthia-original model weights | None | This is a real *existing* Qwen3 model, not an original trained Synthia LLM |

Bitterbot's source archive contains full TypeScript gateway, session/memory pipeline and desktop UI; it **does not** contain pretrained language model weights. MIT copyright belongs to Victor Michael Gil / Bitterbot AI and must be retained for any actual forks or redistributions. The user ZIP is source code, not a signed executable.

## Local test (Linux/macOS/WSL2)

1. Install a pinned, signed **Bitterbot v1.10.1** release from its official releases (do not run an unreviewed moving `latest` installer). Follow the official release verification instructions and verify its signature/checksum.
2. Install Ollama from its official installer.
3. Pull one model on your own device, e.g. `ollama pull qwen3:4b` (about 2.5 GB of weights). If RAM is tight, `ollama pull qwen3:1.7b` is smaller, but has weaker capability.
4. From this Git branch, run:

```bash
bash experiments/synthia-native-host/launch.sh --check
bash experiments/synthia-native-host/launch.sh run
```

For the smaller model set `SYNTHIA_TRIAL_MODEL=qwen3:1.7b`. The launcher never downloads executables, model weights or other dependencies automatically. Prerequisites must already be installed.

Open `http://127.0.0.1:19021/` on the **same machine** and follow the upstream gateway's authorization/onboarding steps. If a token is required, obtain it using `bitterbot --profile synthia-candidate config get gateway.auth.token` in another local terminal. Never paste credentials into an unrelated website. The UI is still Bitterbot's upstream interface; only the Synthia workspace identity and rules are changed. This experiment **does not claim to remove all vendor strings or prompts from the upstream codebase**.

## Reversibility, permissions and data

- Profile: `synthia-candidate`, separate from your existing Bitterbot and SynthAi Computer data.
- Workspace: `~/.bitterbot-synthia-candidate/workspace`. Existing trial files are preserved on repeat launches.
- Network: gateway on `127.0.0.1:19021` only, P2P disabled.
- Model: Ollama local provider; no cloud-model provider credentials or remote endpoint are configured.
- Tools: shell, process, file patch, browser, outbound messaging and cron-style operations denied by this trial's host configuration. This is **not a hardened sandbox**; run with a disposable OS user or further sandbox if the Computer may inspect sensitive files.
- Shutdown: press Ctrl+C in the gateway terminal. The old Computer is untouched.
- Removal: review the isolated `~/.bitterbot-synthia-candidate` directory and its contents before manually removing the trial. No automatic deletion script is supplied.
- Do not connect wallets, social messaging or external apps during the first validation.

## Acceptance criteria

A meaningful green light is: (1) genuine upstream gateway starts; (2) Synthia workspace is loaded rather than the default template; (3) the installed Ollama model responds to three different non-prewritten prompts; (4) retained memory survives gateway restart; (5) restricted tool actions cannot execute; (6) original SynthAi Computer remains unchanged.

This folder's CI only validates the launcher contract **with mocked CLI tools**. CI passing alone does **not** establish steps 1–5 or Android compatibility.

## Why try this first

Bitterbot is an operating agent platform instead of a pile of disconnected simulation kernels. Testing a full host separately answers a better engineering question than adding another component: is this foundation more usable, reliable and maintainable for Synthia?

The source also has major tradeoffs: thousands of files, a large runtime (official platform tarballs around 400 MB, roughly 1.5 GB unpacked), significant model memory needs, bundled vendor defaults, and Linux/macOS/WSL2 support rather than direct Android support.

**Estimate:** local model invocation has no per-token API charge; it costs your machine's CPU/GPU time, memory and electricity. A cloud model is not used in this trial. Exact RAM/CPU requirements and response latency must be measured on the actual machine.

### Source documents

- User archive `bitterbot-desktop-main.zip` from Google Drive file `1agZOS_vKwb00gttblHQF21Yqucyuev2s` (root `README.md`, `package.json`, `LICENSE`, `docs/concepts/agent-workspace.md`, `docs/providers/ollama.md`, `docs/cli/gateway.md`)
- Official Bitterbot v1.10.1 release: https://github.com/Bitterbot-AI/bitterbot-desktop/releases/tag/v1.10.1
- Official Ollama Qwen3 model: https://ollama.com/library/qwen3:4b
