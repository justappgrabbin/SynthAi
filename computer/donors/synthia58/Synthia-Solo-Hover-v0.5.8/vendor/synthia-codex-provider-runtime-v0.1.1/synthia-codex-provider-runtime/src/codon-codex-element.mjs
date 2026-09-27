import { buildCodonCatalog, describeState, UI_STATES, persistenceState } from './codon-codex-core.mjs';

const esc = (v) => String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));

export class SynthiaCodonCodex extends HTMLElement {
  #catalog = [];
  #selected = null;
  #states = new Map();
  #activations = new Map();

  constructor() { super(); this.attachShadow({mode:'open'}); }
  connectedCallback() { this.render(); }
  set catalog(rows) { this.#catalog = buildCodonCatalog(rows); this.render(); }
  get catalog() { return this.#catalog; }

  setState(gate, state) {
    const codon = this.#catalog.find(x => x.id === Number(gate));
    if (!codon) throw new Error(`Unknown gate ${gate}`);
    const normalized = String(state).toLowerCase();
    if (!UI_STATES.includes(normalized)) throw new Error(`Unknown state ${state}`);
    this.#states.set(codon.id, normalized);
    this.#selected = codon.id;
    this.dispatchEvent(new CustomEvent('synthia-codon-state-change', {detail:{gate:codon.id, uiState:normalized, persistenceState:persistenceState(normalized)}, bubbles:true, composed:true}));
    this.render();
  }

  activate(gate) {
    const id = Number(gate);
    if (!this.#catalog.some(x=>x.id===id)) throw new Error(`Unknown gate ${gate}`);
    this.#activations.set(id, (this.#activations.get(id) ?? 0) + 1);
    this.#selected = id;
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    const selected = this.#catalog.find(x=>x.id===this.#selected) ?? null;
    this.shadowRoot.innerHTML = `
      <style>
        :host{display:block;font-family:system-ui,sans-serif;background:#0b0b0f;color:#f5f5f7;border-radius:18px;overflow:hidden}
        header{padding:16px 18px;border-bottom:1px solid #2a2a32;display:flex;justify-content:space-between;gap:12px;align-items:center}
        h2{margin:0;font-size:1.1rem}.sub{opacity:.7;font-size:.8rem}.grid{padding:14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(62px,1fr));gap:8px}
        button.gate{min-height:62px;border:1px solid #30303a;background:#16161d;color:inherit;border-radius:12px;padding:7px;cursor:pointer;text-align:left}
        button.gate[aria-current="true"]{outline:2px solid currentColor}.n{font-weight:800;font-size:1rem}.kw{opacity:.72;font-size:.66rem;line-height:1.1;margin-top:4px}.count{float:right;opacity:.55;font-size:.65rem}
        aside{border-top:1px solid #2a2a32;padding:16px 18px;background:#111117}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;font-size:.78rem;margin:10px 0}.meta b{display:block;opacity:.55;font-size:.68rem;text-transform:uppercase}
        .states{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0}.states button{border:1px solid #34343e;border-radius:999px;background:#1b1b23;color:inherit;padding:7px 10px;cursor:pointer}.states button[aria-pressed="true"]{background:#f2f2f4;color:#111}
        .expression{padding:10px 12px;border-radius:10px;background:#1a1a22;line-height:1.35;font-size:.88rem}.note{opacity:.65;font-size:.72rem;margin-top:8px}
      </style>
      <header><div><h2>Codon Codex</h2><div class="sub">64-gate canonical Synthia field viewer</div></div><div class="sub">${this.#catalog.length}/64</div></header>
      <section class="grid">${this.#catalog.map(c=>`<button class="gate" data-gate="${c.id}" aria-current="${selected?.id===c.id}"><span class="count">${this.#activations.get(c.id)??0}</span><div class="n">${c.id}</div><div class="kw">${esc(c.gate)}</div></button>`).join('')}</section>
      ${selected ? this.#detail(selected) : ''}
    `;
    this.shadowRoot.querySelectorAll('[data-gate]').forEach(btn=>btn.addEventListener('click',()=>this.activate(btn.dataset.gate)));
    this.shadowRoot.querySelectorAll('[data-state]').forEach(btn=>btn.addEventListener('click',()=>this.setState(selected.id, btn.dataset.state)));
  }

  #detail(c) {
    const state = this.#states.get(c.id) ?? 'dormant';
    return `<aside><strong>Gate ${c.id} · ${esc(c.name)}</strong><div class="sub">${esc(c.gate)} · ${esc(c.dimension)}</div>
      <div class="meta"><div><b>Center</b>${esc(c.center)}</div><div><b>Circuit</b>${esc(c.circuit)}</div><div><b>Harmonic</b>${c.harmonic}</div><div><b>Biology</b>${esc(c.biology)}</div><div><b>Amino</b>${esc(c.amino)}</div><div><b>Binary</b>${esc(c.binary)}</div></div>
      <div class="states">${UI_STATES.map(s=>`<button data-state="${s}" aria-pressed="${state===s}">${s}</button>`).join('')}</div>
      <div class="expression">${esc(describeState(c,state))}</div>
      ${state==='neutral'?'<div class="note">Neutral is UI/session-only and does not rewrite the canonical four-state substrate.</div>':''}
    </aside>`;
  }
}

export function defineSynthiaCodonCodex(tag='synthia-codon-codex') {
  if (!customElements.get(tag)) customElements.define(tag, SynthiaCodonCodex);
  return tag;
}
