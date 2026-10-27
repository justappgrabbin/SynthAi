# Synthia real local conversation: existing Computer upgrade (2026-10-27)

This patch extends the **existing** Computer > Synthia dialogue branch. It does not replace the consciousness engine, state space, charts, tools, or Klein donor code.

On each turn, the existing `ConversationExecution` still runs Synthia Resident, AutoLing, DISEMINER, the Morph/Klein donor, and the execution spine. Host-grounded facts and attributed memory take precedence. Otherwise it now calls a real **local Ollama** conversational model, passing bounded previous chat turns and provisional semantic observations. The response is persisted through the existing Computer state and Synthia semantic graph with an honest provider label.

If no model is available, Synthia explicitly reports the missing local model; it never presents the old canned Morph fallback as free-form intelligent conversation.

### Open the existing Computer

Prerequisites: Node.js 20+, Ollama with an installed model such as `llama3.2`, and this repository checked out including its existing submodules. No model API key is required.

On Windows double-click `START_SYNTHIA_CHAT.bat` in the repository root. It checks Node and Ollama, installs UI dependencies if needed, builds the existing desktop, opens the existing Computer UI and starts its backend. Open the Synthia chat app.

Manual equivalent on any supported desktop:
```sh
npm --prefix computer/shell/kimi-linux ci
npm --prefix computer/shell/kimi-linux run build
npm --prefix computer start
```
Then visit `http://127.0.0.1:8765` and open Synthia.

If Ollama has no model, install `llama3.2` using Ollama (equivalent `ollama pull llama3.2`), then retry the chat. You may select a different **already installed** model using `SYNTHIA_OLLAMA_MODEL`. The endpoint is strictly localhost/loopback; your conversation is not sent to a remote API.

### Limits

This is **not** an Android APK, not the new Python Sovereign Engine integration, and not a newly trained Klein neural language model. The local language model must actually be running on the host computer. Automated tests mock that protocol; they do not verify actual conversation quality or phone usability. Neither the original four charts nor their state space are changed.
