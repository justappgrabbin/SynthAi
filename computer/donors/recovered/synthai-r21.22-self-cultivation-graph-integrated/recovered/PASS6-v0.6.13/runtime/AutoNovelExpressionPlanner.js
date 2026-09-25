export class AutoNovelExpressionPlanner {
  plan(message, route, comprehension = {}) {
    const kind = route?.task || 'rich-expression';
    const beats = [];
    if (kind === 'browser-upload') beats.push('read-upload-request', 'select-grounded-evidence', 'compose-upload-artifact');
    else if (kind === 'browser-field') beats.push('read-field-prompt', 'select-grounded-evidence', 'compose-field-expression');
    else if (kind === 'video') beats.push('establish-scene', 'express-change-over-time', 'resolve-scene');
    else if (kind === 'image') beats.push('establish-subjects', 'establish-relations', 'compose-frame');
    else if (kind === 'code') beats.push('define-behavior', 'compose-primitives', 'emit-tests');
    else if (kind === 'document') beats.push('define-purpose', 'organize-sections', 'realize-surface');
    else beats.push('extract-core-meaning', 'choose-strong-form', 'compose-expression');
    return Object.freeze({
      role: 'autonovel',
      kind,
      source: String(message || ''),
      dimension: route?.dimension || null,
      beats: Object.freeze(beats),
      comprehension
    });
  }
}
export default AutoNovelExpressionPlanner;
