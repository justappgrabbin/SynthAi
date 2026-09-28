class ArtifactValidator {
  /**
   * Validate an artifact result.
   */
  async validate(result) {
    const errors = [];
    const warnings = [];
    if (!result.manifest) {
      errors.push("Missing artifact manifest");
    }
    if (result.files.length === 0) {
      errors.push("No files generated");
    }
    if (result.manifest.provenance.length === 0) {
      warnings.push("No provenance records");
    }
    if (result.manifest.activatedChannels.length === 0) {
      warnings.push("No channels activated");
    }
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
var stdin_default = ArtifactValidator;
export {
  ArtifactValidator,
  stdin_default as default
};
