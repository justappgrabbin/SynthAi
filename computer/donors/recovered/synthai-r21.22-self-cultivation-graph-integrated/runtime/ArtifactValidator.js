/** Structural validation + bounded repair for materialized artifacts. */
export class ArtifactValidator {
    async validate(result) {
        const errors = [];
        const warnings = [];
        if (!result.manifest)
            errors.push('Missing artifact manifest');
        if (!result.files.length)
            errors.push('No files generated');
        const paths = result.files.map(f => f.path);
        const unique = new Set(paths);
        if (unique.size !== paths.length)
            errors.push('Duplicate materialized file paths');
        if (result.files.some(f => !f.path || typeof f.content !== 'string'))
            errors.push('Malformed artifact file');
        if (result.files.some(f => f.content.length === 0))
            warnings.push('One or more materialized files are empty');
        if (result.manifest) {
            const listed = new Set(result.manifest.materializedFiles);
            for (const path of paths)
                if (!listed.has(path))
                    errors.push(`Manifest missing materialized file: ${path}`);
            for (const path of listed)
                if (!unique.has(path))
                    errors.push(`Manifest references absent file: ${path}`);
            if (!result.manifest.provenance.length)
                warnings.push('No provenance records');
            if (!result.manifest.activatedChannels.length)
                warnings.push('No channels activated');
            if (!result.manifest.expressionNodes.length)
                warnings.push('No expression nodes materialized');
        }
        const hasGraph = paths.includes('synthia/expression-graph.json');
        const hasOutput = paths.includes('synthia/runtime-output.json');
        if (!hasGraph)
            errors.push('Expression graph was not materialized');
        if (!hasOutput)
            errors.push('Runtime outputs were not materialized');
        return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
    }
    /** Repair only structural packaging faults; never fabricate semantic output. */
    async repair(result) {
        const byPath = new Map();
        for (const file of result.files) {
            if (!file?.path || typeof file.content !== 'string')
                continue;
            const previous = byPath.get(file.path);
            if (!previous || (!previous.content && file.content))
                byPath.set(file.path, file);
        }
        result.files = [...byPath.values()];
        if (result.manifest)
            result.manifest.materializedFiles = result.files.map(f => f.path);
        result.errors = [];
        return result;
    }
}
export default ArtifactValidator;
