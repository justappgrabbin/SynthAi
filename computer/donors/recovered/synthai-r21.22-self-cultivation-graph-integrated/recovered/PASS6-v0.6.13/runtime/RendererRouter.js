const LOCAL_FEATURES = new Set([
  'geometry.sphere', 'geometry.circle', 'geometry.mountain', 'geometry.polygon',
  'material.solid', 'material.glow', 'lighting.sunset', 'background.gradient',
  'timeline.position', 'timeline.scale', 'camera.pan', 'camera.static'
]);

class RendererRouter {
  route(scene) {
    if (!scene) return null;
    const requested = new Set(scene.features || []);
    const unsupported = [...requested].filter(feature => !LOCAL_FEATURES.has(feature)).sort();
    const localCapable = unsupported.length === 0;
    return {
      schemaVersion: 1,
      selected: localCapable ? 'procedural-raster' : 'media-renderer',
      reason: localCapable
        ? 'All scene features are supported by the deterministic local raster renderer.'
        : `Scene requires capabilities outside the local raster renderer: ${unsupported.join(', ')}`,
      unsupported,
      fallbacks: localCapable
        ? ['host-graphics', 'media-renderer']
        : ['host-graphics'],
      mediaRenderer: {
        automatonId: 'media-renderer',
        renderer: localCapable ? 'graphics' : 'graphics',
        requiredHostCapabilities: ['graphics']
      }
    };
  }
}

export { RendererRouter, LOCAL_FEATURES };
export default RendererRouter;
