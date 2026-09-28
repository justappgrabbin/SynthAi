const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function renderSvg(primitives, { width = 640, height = 480, stroke = '#e8c36a', background = '#10110f' } = {}) {
  const body = primitives.map((primitive) => {
    if (primitive.type === 'point') return `<circle cx="${primitive.x}" cy="${primitive.y}" r="3" fill="${stroke}" data-id="${esc(primitive.id)}"/>`;
    if (primitive.type === 'line') return `<line x1="${primitive.start.x}" y1="${primitive.start.y}" x2="${primitive.end.x}" y2="${primitive.end.y}" data-id="${esc(primitive.id)}"/>`;
    if (primitive.type === 'circle') return `<circle cx="${primitive.center.x}" cy="${primitive.center.y}" r="${primitive.radius}" fill="none" data-id="${esc(primitive.id)}"/>`;
    if (primitive.type === 'arc') {
      const start = { x: primitive.center.x + primitive.radius * Math.cos(primitive.startAngle), y: primitive.center.y + primitive.radius * Math.sin(primitive.startAngle) };
      const end = { x: primitive.center.x + primitive.radius * Math.cos(primitive.endAngle), y: primitive.center.y + primitive.radius * Math.sin(primitive.endAngle) };
      const large = Math.abs(primitive.endAngle - primitive.startAngle) > Math.PI ? 1 : 0;
      return `<path d="M ${start.x} ${start.y} A ${primitive.radius} ${primitive.radius} 0 ${large} 1 ${end.x} ${end.y}" fill="none" data-id="${esc(primitive.id)}"/>`;
    }
    return '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background:${background}" stroke="${stroke}" stroke-width="2">${body}</svg>`;
}

