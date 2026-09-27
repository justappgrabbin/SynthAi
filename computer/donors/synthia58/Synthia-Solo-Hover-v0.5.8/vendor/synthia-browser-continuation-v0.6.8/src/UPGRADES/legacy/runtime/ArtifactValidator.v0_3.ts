import { ArtifactResult, ArtifactPlan } from './foundations';

export class ArtifactValidator {
  /**
   * Validate an artifact result.
   */
  async validate(result: ArtifactResult): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check manifest exists
    if (!result.manifest) {
      errors.push('Missing artifact manifest');
    }

    // Check files exist
    if (result.files.length === 0) {
      errors.push('No files generated');
    }

    // Check provenance
    if (result.manifest.provenance.length === 0) {
      warnings.push('No provenance records');
    }

    // Check channel activations traced
    if (result.manifest.activatedChannels.length === 0) {
      warnings.push('No channels activated');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default ArtifactValidator;
