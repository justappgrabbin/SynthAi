/**
 * Explicit-only simulation intent. Deterministic parser, no LLM-generated
 * tool calls, so ordinary conversation cannot execute a kernel accidentally.
 */
export function parseDiffusionRequest(text) {
  if (typeof text !== 'string' || text.length > 12000) return null;
  const polymer = text.match(/\b(PP|HDPE)\b/i)?.[1]?.toUpperCase();
  if (!polymer || !/\b(simulat(?:e|ion)|calculat(?:e|ion)|diffus(?:ion|ivity))\b/i.test(text))
    return null;
  const mass = text.match(/(\d+(?:\.\d+)?)\s*g\s*\/\s*mol\b/i);
  const temp = text.match(/\b(?:at\s*|temp(?:erature)?\s*(?:of|=|:)?\s*)(-?\d+(?:\.\d+)?)\s*(?:°\s*|degrees?\s*)?c\b/i);
  if (!mass || !temp) return { status: 'incomplete', polymer,
    guidance: 'For a synthetic calculation, specify both values: "simulate PP 100 g/mol at 23 C".' };
  const massGMol = Number(mass[1]);
  const temperatureC = Number(temp[1]);
  return { status: 'ready', polymer, massGMol, temperatureC };
}
export function produceDiffusionAnswer(computer, request) {
  if (request?.status !== 'ready') throw new TypeError('Complete diffusion request required');
  const result = computer.simulate('polymer-diffusion-v1', {
    polymer: request.polymer, massGMol: request.massGMol, temperatureC: request.temperatureC });
  const d = result.output;
  return {
    text: 'Synthetic polymer diffusion simulation (NOT experimental validation)\n'
      + 'Polymer: ' + d.polymer + '\n'
      + 'Molar mass: ' + d.massGMol + ' g/mol\n'
      + 'Temperature: ' + d.temperatureC + ' °C (' + d.temperatureK.toFixed(2) + ' K)\n'
      + 'Predicted diffusivity: ' + d.diffusivityM2PerS.toExponential(6) + ' m²/s\n'
      + 'Scaling exponent α: ' + d.alpha.toFixed(6) + '\n'
      + 'Source: generativeSimulation synthetic educational scaling law; not independently calibrated.',
    provider: 'computer:generative-simulation-lab',
    evidence: result.evidence,
    kernel: result.kernelId,
  };
}
