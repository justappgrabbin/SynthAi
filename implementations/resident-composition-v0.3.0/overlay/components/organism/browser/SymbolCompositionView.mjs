const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Ordered constituent projection. Each displayed occurrence identifies the
// exact runtime node; repeated membership never creates another runtime node.
export function compositionSurface(graph) {
  if (!graph) return '';
  const addressed = node => node.addressBinding?.complete === true &&
    (!node.members || node.members.every(x => addressed(x.member)));
  const render = node => node.kind === 'occurrence'
    ? `<span data-occurrence-id="${escape(node.id)}">${escape(node.symbol)}</span>`
    : `<span data-composition-id="${escape(node.id)}">${node.members.map(x => render(x.member)).join('')}</span>`;
  return graph.compositions().filter(addressed).map(node =>
    `<div class="symbol-composition" data-scale="${escape(node.scale)}">${render(node)}</div>`).join('');
}
