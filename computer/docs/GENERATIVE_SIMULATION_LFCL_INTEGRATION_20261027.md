# Generative Simulation / LFCL donor integration

Source archive: `generativeSimulation-main.zip` (Google Drive file `1Bix3Xnmmebd3WDCVQ9zK9O_tWI1RUiBz`), attributed in its README to Olivier Vitrac / `ovitrac/generativeSimulation`.

## Inspected material

- The archive contains a Jekyll informational site, illustrations, README with a proposed Language-First Computational Lab (LFCL), and one Python neural regression example (`examples/deeplearning_D.py`).
- Its proposed `agent.py`, `memory.py` and scientific-kernel ecosystem are documented as sketches or separate external projects. They are not complete executable modules in this ZIP.
- The Python example generates **synthetic** PP/HDPE diffusivity data from a scaling law, constructs contrastive log-ratio pairs, trains a PyTorch `3 → 32 → 32 → 1` regression net and a polynomial surrogate. This archive does not contain saved trained network weights.
- Within-polymer pair construction makes `Tg_diff` identically zero. Pair-level random splits reuse source scenarios in training and evaluation; the example also fits scalers on all samples before its first split. None of those scores should be treated as independent empirical prediction validation.

## Integrated into existing Computer

The **original donor ZIP is not modified** and no original source code is transplanted. `computer/services/generative-simulation-lab.mjs` implements an independently written, zero-dependency, bounded kernel registry and the example scaling law in JavaScript for existing Computer/Android-friendly runtimes.

```js
const runtime = await new ComputerRuntime().boot();
const available = runtime.listSimulationKernels();
const result = runtime.simulate('polymer-diffusion-v1', {
  polymer: 'PP', massGMol: 100, temperatureC: 23
});
const grid = runtime.simulations.grid('polymer-diffusion-v1', {
  polymers: ['PP', 'HDPE'],
  massesGMol: [40, 100, 500],
  temperaturesC: [23, 50, 100]
});
const contrasts = runtime.simulations.contrastivePairs({
  scenarios: grid.scenarios
});
```

Registered as existing service `generative-simulation-lab`, capability `numerical-simulation`, and public `simulate` / `listSimulationKernels` methods. Its computations are **synthetic model outputs**. The existing `experiment-loop` remains responsible for actual experiments and explicit evidence classification. An agent can call the service through an approved executor; this commit does not grant untrusted apps unrestricted kernel execution or access to the shell.

### Integration boundaries

- **No separate Computer.** No replacement of Synthia's neural resident, Klein tools, donor ExperimentLoop, or world engine.
- **No hidden LLM.** A numerical toy kernel and contrastive data generator are not a pretrained language model.
- **No claimed material-science accuracy.** Constants are those in the example, including an arbitrary diffusivity reference.
- **No unconstrained execution.** Inputs and number of scenarios/pairs are bounded. No runtime model downloads or API keys.
- **Next validation gates:** full Node CI on the draft PR, sample Android browser path, and eventually empirically calibrated kernel(s) with independent data.

This is a first **functioning numerical kernel** with a durable integration seam, not completion of the overall LFCL architecture.