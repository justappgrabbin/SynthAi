import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ARTIFACT_FIELD = /\b(resume|résumé|cv|portfolio|attachment|document|work sample|writing sample)\b/i;
const freeze = (value) => Object.freeze(value);

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}

function evidenceFor(field, profile = {}) {
  const descriptor = `${field?.name || ''} ${field?.label || ''}`;
  const pools = [];
  if (/resume|résumé|cv/i.test(descriptor)) pools.push(['resumeFacts', profile.resumeFacts]);
  if (/portfolio|work sample|writing sample/i.test(descriptor)) pools.push(['portfolioFacts', profile.portfolioFacts]);
  pools.push(['facts', profile.facts]);
  const seen = new Set();
  const out = [];
  for (const [key, value] of pools) {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    for (const item of values) {
      const text = String(item || '').trim();
      if (!text || seen.has(text)) continue;
      seen.add(text);
      out.push({ ref: `profile.${key}`, text });
    }
  }
  return out;
}

export class BrowserArtifactComposer {
  constructor({ autoNovel, messy } = {}) {
    if (!autoNovel || !messy) throw new Error('BrowserArtifactComposer requires AutoNovel and MESSY roles');
    this.autoNovel = autoNovel;
    this.messy = messy;
  }

  isArtifactField(field = {}) {
    return String(field.type || '').toLowerCase() === 'file' || ARTIFACT_FIELD.test(`${field.name || ''} ${field.label || ''}`);
  }

  async composeForPage({ page, message, route, comprehension, profile = {} } = {}) {
    const form = page?.forms?.[0];
    if (!form) return freeze({ fields: freeze([]), files: freeze([]), tempDirs: freeze([]) });
    const fields = [];
    const files = [];
    const tempDirs = [];
    for (const field of form.fields || []) {
      if (!this.isArtifactField(field) || (field.value !== null && field.value !== undefined && field.value !== '')) continue;
      const descriptor = `${field.name || ''} ${field.label || ''}`;
      const directMap = profile.files || {};
      const direct = directMap[field.name] || (/resume|résumé|cv/i.test(descriptor) ? profile.resumePath : null) || (/portfolio/i.test(descriptor) ? profile.portfolioPath : null);
      if (direct) {
        const result = freeze({ status: 'existing-file', name: field.name, filePath: String(direct), evidenceRefs: freeze([`profile.files.${field.name}`]), expressionPlan: null, morph: null });
        fields.push(result); files.push(result); continue;
      }
      const evidence = evidenceFor(field, profile);
      if (!evidence.length) {
        fields.push(freeze({ status: 'insufficient-evidence', name: field.name, filePath: null, evidenceRefs: freeze([]) }));
        continue;
      }
      const prompt = `Create the artifact requested by browser field "${field.label || field.name}" for task: ${message}`;
      const expressionPlan = this.autoNovel.plan(prompt, { kind: 'expression', task: 'browser-upload', dimension: route?.dimension || null }, comprehension);
      const morph = this.messy.route(expressionPlan);
      const dir = await mkdtemp(join(tmpdir(), 'synthia-browser-artifact-'));
      tempDirs.push(dir);
      const basename = /resume|résumé|cv/i.test(descriptor) ? 'synthia-resume.html' : 'synthia-portfolio.html';
      const filePath = join(dir, basename);
      const title = field.label || field.name || 'Requested Artifact';
      const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(title)}</title><main><h1>${escapeHtml(title)}</h1><ul>${evidence.map((item) => `<li>${escapeHtml(item.text)}</li>`).join('')}</ul></main>`;
      await writeFile(filePath, html, 'utf8');
      const result = freeze({ status: 'composed', name: field.name, filePath, mimeType: 'text/html', evidenceRefs: freeze(evidence.map((item) => item.ref)), expressionPlan, morph });
      fields.push(result); files.push(result);
    }
    return freeze({ fields: freeze(fields), files: freeze(files), tempDirs: freeze(tempDirs) });
  }

  async cleanup(tempDirs = []) {
    for (const dir of tempDirs) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export default BrowserArtifactComposer;
