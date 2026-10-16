/**
 * UI controls for existing Simlish swarm-fit and frame-morph, bound directly
 * to the real SynthAi Computer ATO formations. No sample art or placeholder
 * frames: the only inputs are images actually selected by the user.
 */
import { matchGrid, expandMotion } from './computer-runtime/donors/verified/simlish/frame-morph.mjs';

const el = id => document.getElementById(id);
const SIZE = Object.freeze({ width: 96, height: 128 });
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
const pixels = surface => surface.getContext('2d', { willReadFrequently: true })
  .getImageData(0, 0, surface.width, surface.height);
const sampleRGB = (data, x, y, width) => {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
};
function normalize(image) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE.width;
  canvas.height = SIZE.height;
  canvas.getContext('2d').drawImage(image, 0, 0, SIZE.width, SIZE.height);
  return canvas;
}
async function fromLocalFile(file) {
  if (!(file instanceof File) || !file.type.startsWith('image/'))
    throw new TypeError('Select two real image files to run swarm fitness');
  const bitmap = await createImageBitmap(file);
  try { return normalize(bitmap); }
  finally { bitmap.close(); }
}
function observations(source, target) {
  const s = pixels(source).data, t = pixels(target).data, samples = [];
  // Actual measured pixel-pair grid; no invented fitness examples.
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    const px = Math.min(SIZE.width - 1, Math.round((x + .5) * SIZE.width / 10));
    const py = Math.min(SIZE.height - 1, Math.round((y + .5) * SIZE.height / 10));
    samples.push({
      x: 2 * px / (SIZE.width - 1) - 1,
      y: 2 * py / (SIZE.height - 1) - 1,
      source: sampleRGB(s, px, py, SIZE.width),
      target: sampleRGB(t, px, py, SIZE.width),
    });
  }
  return samples;
}
function lightingPreview(source, values) {
  const image = pixels(source), { data, width, height } = image;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const dx = 2 * x / (width - 1) - 1, dy = 2 * y / (height - 1) - 1;
    const p = (y * width + x) * 4;
    for (let channel = 0; channel < 3; channel++)
      data[p + channel] = clamp(
        data[p + channel] + values[channel] +
        values[channel + 3] * dx + values[channel + 6] * dy
      );
  }
  const out = document.createElement('canvas');
  out.width = width; out.height = height;
  out.getContext('2d').putImageData(image, 0, 0);
  return out;
}
export function mountFitnessMorphUI({ computer }) {
  if (!computer?.fitnessMorph) throw new Error('Native Simlish swarm donor not mounted');
  let busy = false;
  let studioCharacter = null;
  let acceptedEvolution = null;
  const clearAccepted = () => {
    acceptedEvolution = null;
    el('applyStudioFitness').disabled = true;
  };
  // This special relative module exists ONLY in the original Android
  // YOU-N-I-VERSE assets. Browser-only Computer has no invented studio state.
  if (globalThis.NativeDownloads) {
    el('studioCharacterControls').hidden = false;
    el('studioCharacterStatus').hidden = false;
  }
  el('fitnessSource').addEventListener('change', () => {
    studioCharacter = null;
    clearAccepted();
  });
  el('fitnessTarget').addEventListener('change', clearAccepted);
  const msg = (value, positive = false) => {
    el('fitnessStatus').textContent = value;
    el('fitnessStatus').className = 'message ' + (positive ? 'good' : '');
  };
  const withSurfaces = async callback => {
    if (busy) return;
    busy = true;
    for (const button of ['runSwarmFit', 'runFrameMorph', 'evolveLighting']) el(button).disabled = true;
    try {
      const s = studioCharacter?.file ?? el('fitnessSource').files?.[0], t = el('fitnessTarget').files?.[0];
      const [source, target] = await Promise.all([fromLocalFile(s), fromLocalFile(t)]);
      const address = computer.nativeKlein?.autoLing.address;
      if (!address) throw new Error('An existing donor address must be available before formation assembly');
      await computer.fitnessMorph.ensureFormations({ address });
      await callback(source, target);
    } catch (error) {
      msg(error.message);
    } finally {
      busy = false;
      for (const button of ['runSwarmFit', 'runFrameMorph', 'evolveLighting']) el(button).disabled = false;
    }
  };
  const show = canvas => {
    const preview = el('fitnessPreview');
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(canvas, 0, 0, preview.width, preview.height);
  };

  el('runSwarmFit').addEventListener('click', () => void withSurfaces(async (source, target) => {
    msg('Measuring observed RGB pairs and testing Simlish particle-swarm candidates…');
    const results = await computer.fitnessMorph.fit(observations(source, target), [0, 0, 0]);
    show(lightingPreview(source, results.values));
    el('fitnessEvidence').textContent =
      'CPU PSO · ' + results.particles + ' particles · ' + results.iterations + ' iterations · ' +
      results.samples + ' observed pixel pairs · held-out error ' +
      results.heldOutBefore.toFixed(2) + ' → ' + results.heldOutAfter.toFixed(2);
    msg(results.accepted
      ? 'Accepted: held-out image error improved and the existing MorphEngine expression changed.'
      : 'Not accepted: no held-out gain. The previous morph expression is preserved.', results.accepted);
  }));

  el('useStudioCharacter').addEventListener('click', async () => {
    if (busy) return;
    try {
      const { readStudioCharacter } = await import('../studio-bridge.mjs');
      studioCharacter = await readStudioCharacter();
      clearAccepted();
      el('studioCharacterStatus').textContent =
        'Original Studio ' + studioCharacter.world + ' character loaded locally · ' +
        studioCharacter.activeLayerCount + ' prior fitted layer(s). The saved project remains unchanged.';
      msg('Using the actual saved Studio character as source; choose a reference image to test.');
    } catch (error) {
      studioCharacter = null;
      clearAccepted();
      el('studioCharacterStatus').textContent = 'Studio character unavailable: ' + error.message;
    }
  });

  el('evolveLighting').addEventListener('click', () => void withSurfaces(async (source, target) => {
    clearAccepted();
    msg('Executing both Simlish CPU PSO candidate formations against held-out pixels…');
    const evidence = await computer.fitnessMorph.evolve(observations(source, target), [0, 0, 0]);
    if (evidence.accepted) {
      show(lightingPreview(source, evidence.coefficients));
      if (studioCharacter) {
        acceptedEvolution = { evidence, studioCharacter };
        el('applyStudioFitness').disabled = false;
      }
    }
    const metrics = evidence.candidates.map(c =>
      c.strategy + ' held-out ' + c.heldOutAfter.toFixed(2)).join(' vs ');
    el('fitnessEvidence').textContent = metrics +
      ' · candidate selected: ' + (evidence.selected ?? 'none') +
      ' · active ATO revision: ' + evidence.revision +
      ' · graph transformed: ' + String(evidence.transformed);
    msg(evidence.accepted ?
      'Accepted: the best validated ATO graph and MorphEngine expression are retained.' :
      'Rejected: no candidate improves held-out error; existing formation and character remain unchanged.',
      evidence.accepted);
  }));

  el('applyStudioFitness').addEventListener('click', async () => {
    if (!acceptedEvolution || busy) return;
    el('applyStudioFitness').disabled = true;
    try {
      const { evidence, studioCharacter: state } = acceptedEvolution;
      const { applyAcceptedStudioLighting } = await import('../studio-bridge.mjs');
      const applied = await applyAcceptedStudioLighting({
        coefficients: evidence.coefficients, evidence,
        expectedSavedAt: state.savedAt, expectedLayerId: state.sourceLayerId,
      });
      acceptedEvolution = null;
      studioCharacter = null;
      el('studioCharacterStatus').textContent =
        'Accepted lighting applied to original Studio project as layer ' +
        applied.layerCount + '. Original artwork and all earlier layers are preserved.';
      msg('Saved fitted appearance is ready in YOU-N-I-VERSE Studio.', true);
    } catch (error) {
      el('studioCharacterStatus').textContent =
        'Not applied: ' + error.message + '. No Studio artwork was changed.';
      clearAccepted();
    }
  });

  el('runFrameMorph').addEventListener('click', () => void withSurfaces(async (source, target) => {
    msg('Executing original Simlish triangle matching and ATO mesh interpolation…');
    const sourcePixels = pixels(source).data, targetPixels = pixels(target).data;
    const mesh = matchGrid(sourcePixels, targetPixels, SIZE.width, SIZE.height,
      { columns: 8, rows: 12, radius: 10 });
    const geometry = await computer.fitnessMorph.interpolate(mesh, .5);
    // The original Simlish implementation does the pixel-level triangle warp.
    // The ATO output above proves the underlying formation geometry executes.
    const sheet = document.createElement('canvas');
    sheet.width = SIZE.width * 2; sheet.height = SIZE.height;
    sheet.getContext('2d').drawImage(source, 0, 0);
    sheet.getContext('2d').drawImage(target, SIZE.width, 0);
    const result = await expandMotion(sheet, {
      cols: 2, rows: 1, frameWidth: SIZE.width,
      frameHeight: SIZE.height, count: 2,
    }, { steps: 6 });
    const sample = document.createElement('canvas');
    sample.width = SIZE.width; sample.height = SIZE.height;
    const i = 3; // midway between the user's two observed frames
    sample.getContext('2d').drawImage(result.canvas,
      i % result.grid.cols * SIZE.width,
      Math.floor(i / result.grid.cols) * SIZE.height,
      SIZE.width, SIZE.height,
      0, 0, SIZE.width, SIZE.height);
    show(sample);
    el('fitnessEvidence').textContent = geometry.points.length +
      ' native Simlish mesh vertices · ' + result.keyframes +
      ' source frames · ' + result.steps +
      ' interpolations/transition · ' + result.fallbacks + ' mesh fallback(s)';
    msg('Executable frame morph rendered from the two supplied images; image bytes kept on device.', true);
  }));
}
