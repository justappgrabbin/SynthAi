export class MessyExpressionRouter {
  route(plan) {
    const table = {
      image: { surface: 'visual', materializer: 'VisualPrimitiveCompiler/SceneGraphCompiler' },
      video: { surface: 'visual-timeline', materializer: 'SceneGraphCompiler/RendererRouter' },
      code: { surface: 'code', materializer: 'SemanticArtifactCompiler' },
      document: { surface: 'document', materializer: 'semantic-surface' },
      'browser-field': { surface: 'browser-field', materializer: 'BrowserFieldExpressionComposer' },
      'browser-upload': { surface: 'browser-artifact', materializer: 'BrowserArtifactComposer' },
      'rich-expression': { surface: 'adaptive', materializer: 'best-available-renderer' }
    };
    return Object.freeze({ role: 'messy', ...(table[plan.kind] || table['rich-expression']), plan });
  }
}
export default MessyExpressionRouter;
