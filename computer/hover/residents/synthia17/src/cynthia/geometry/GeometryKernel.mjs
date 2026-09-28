const EPSILON = 1e-9;

const finite = (value, label) => {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
};

export const point = (id, x, y) => Object.freeze({
  type: 'point', id: String(id), x: finite(x, 'x'), y: finite(y, 'y'),
});

export const line = (id, start, end, valid = true) => Object.freeze({
  type: 'line', id: String(id), start, end, valid: Boolean(valid),
});

export const circle = (id, center, radius) => Object.freeze({
  type: 'circle', id: String(id), center, radius: finite(radius, 'radius'),
});

export const arc = (id, center, radius, startAngle, endAngle) => Object.freeze({
  type: 'arc', id: String(id), center, radius: finite(radius, 'radius'),
  startAngle: finite(startAngle, 'startAngle'), endAngle: finite(endAngle, 'endAngle'),
});

export function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function circleIntersections(first, second, epsilon = EPSILON) {
  const d = distance(first.center, second.center);
  if (d > first.radius + second.radius + epsilon) return [];
  if (d < Math.abs(first.radius - second.radius) - epsilon) return [];
  if (d <= epsilon && Math.abs(first.radius - second.radius) <= epsilon) return [];
  const a = ((first.radius ** 2) - (second.radius ** 2) + (d ** 2)) / (2 * d);
  const hSquared = Math.max(0, (first.radius ** 2) - (a ** 2));
  const h = Math.sqrt(hSquared);
  const x2 = first.center.x + (a * (second.center.x - first.center.x)) / d;
  const y2 = first.center.y + (a * (second.center.y - first.center.y)) / d;
  const rx = -(second.center.y - first.center.y) * (h / d);
  const ry = (second.center.x - first.center.x) * (h / d);
  const one = point('intersection-1', x2 + rx, y2 + ry);
  if (h <= epsilon) return [one];
  return [one, point('intersection-2', x2 - rx, y2 - ry)];
}

export function normalizePrimitives(primitives, width, height, scale = 1000) {
  const sx = scale / finite(width, 'width');
  const sy = scale / finite(height, 'height');
  const p = (value) => point(value.id, value.x * sx, value.y * sy);
  return primitives.map((primitive) => {
    if (primitive.type === 'point') return p(primitive);
    if (primitive.type === 'line') return line(primitive.id, p(primitive.start), p(primitive.end), primitive.valid);
    if (primitive.type === 'circle') return circle(primitive.id, p(primitive.center), primitive.radius * Math.min(sx, sy));
    if (primitive.type === 'arc') return arc(primitive.id, p(primitive.center), primitive.radius * Math.min(sx, sy), primitive.startAngle, primitive.endAngle);
    throw new TypeError(`Unknown primitive: ${primitive.type}`);
  });
}

const resolveMeasure = (constraint, objects) => {
  if (constraint.kind === 'length') {
    const target = objects.get(constraint.target);
    if (!target || target.type !== 'line') return null;
    return distance(target.start, target.end);
  }
  if (constraint.kind === 'radius') {
    const target = objects.get(constraint.target);
    return target && (target.type === 'circle' || target.type === 'arc') ? target.radius : null;
  }
  if (constraint.kind === 'value') return constraint.value;
  return null;
};

export function verifyConstraints(primitives, constraints, tolerance = 1e-6) {
  const objects = new Map(primitives.map((value) => [value.id, value]));
  const results = constraints.map((constraint) => {
    if (constraint.kind === 'equal') {
      const left = resolveMeasure(constraint.left, objects);
      const right = resolveMeasure(constraint.right, objects);
      const error = left === null || right === null ? Infinity : Math.abs(left - right);
      return Object.freeze({ constraint, passed: error <= tolerance, error, left, right });
    }
    if (constraint.kind === 'coincident') {
      const a = objects.get(constraint.a);
      const b = objects.get(constraint.b);
      const error = a?.type === 'point' && b?.type === 'point' ? distance(a, b) : Infinity;
      return Object.freeze({ constraint, passed: error <= tolerance, error });
    }
    return Object.freeze({ constraint, passed: false, error: Infinity, reason: 'unsupported-constraint' });
  });
  return Object.freeze({ passed: results.every((item) => item.passed), results: Object.freeze(results) });
}

export function constructEquilateralTriangle(start, end, { side = 'upper' } = {}) {
  const baseLength = distance(start, end);
  if (baseLength <= EPSILON) throw new Error('The supplied segment must have positive length');
  const firstCircle = circle('circle-A', start, baseLength);
  const secondCircle = circle('circle-B', end, baseLength);
  const intersections = circleIntersections(firstCircle, secondCircle);
  if (intersections.length !== 2) throw new Error('Expected two circle intersections');
  const apexRaw = side === 'lower'
    ? intersections.reduce((a, b) => a.y > b.y ? a : b)
    : intersections.reduce((a, b) => a.y < b.y ? a : b);
  const apex = point('C', apexRaw.x, apexRaw.y);
  const primitives = Object.freeze([
    start, end, apex, firstCircle, secondCircle,
    line('AB', start, end), line('AC', start, apex), line('BC', end, apex),
  ]);
  const constraints = Object.freeze([
    { kind: 'equal', left: { kind: 'length', target: 'AB' }, right: { kind: 'length', target: 'AC' } },
    { kind: 'equal', left: { kind: 'length', target: 'AB' }, right: { kind: 'length', target: 'BC' } },
  ]);
  return Object.freeze({ primitives, constraints, verification: verifyConstraints(primitives, constraints) });
}
