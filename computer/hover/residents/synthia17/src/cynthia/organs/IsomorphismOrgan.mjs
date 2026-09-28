const tokens = (value) => new Set(String(value ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? []);
const similarity = (a, b) => { const x=tokens(a), y=tokens(b); let n=0; for (const t of x) if(y.has(t)) n++; return n / Math.max(1, new Set([...x,...y]).size); };

export class IsomorphismOrgan {
  constructor() { this.domains = new Map(); this.mappings = []; }
  registerDomain(name, nodes) { this.domains.set(name, structuredClone(nodes)); return this; }
  compare(source, target) {
    const a=this.domains.get(source)??[], b=this.domains.get(target)??[];
    const candidates=[];
    for (const left of a) for (const right of b) {
      const structural = left.level != null && left.level === right.level ? 1 : 0;
      const score = structural * .7 + similarity(left.label, right.label) * .3;
      if (score > 0) candidates.push({ source:left.id, target:right.id, score, evidence:{ structural, lexical: similarity(left.label,right.label) } });
    }
    return candidates.sort((x,y)=>y.score-x.score || String(x.source).localeCompare(String(y.source)));
  }
  retain(source, target, mapping, evidence=[]) { const record=Object.freeze({source,target,mapping:structuredClone(mapping),evidence:structuredClone(evidence)}); this.mappings.push(record); return record; }
}

