import { SynthiaProcessField } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcessField.js';
import { DyadResonanceProcess } from 'synthia/vendor/processes-cleaned/src/processes/DyadResonanceProcess.js';
import { CHNOPSProcess } from 'synthia/vendor/processes-cleaned/src/processes/CHNOPSProcess.js';
import { CodonProcess } from 'synthia/vendor/processes-cleaned/src/processes/CodonProcess.js';
import { KleinLanguageProcess } from 'synthia/vendor/processes-cleaned/src/processes/KleinLanguageProcess.js';
import { IngestionProcess } from 'synthia/vendor/processes-cleaned/src/processes/IngestionProcess.js';

export function createDefaultProcessField({ dyadProfile = null, layerMapping = null, ingestor = null } = {}) {
  const field = new SynthiaProcessField();

  // Peers. Registration order is not a hierarchy.
  field.register(new DyadResonanceProcess({ dyadProfile, layerMapping }));
  field.register(new CHNOPSProcess());
  field.register(new CodonProcess());
  field.register(new KleinLanguageProcess());
  field.register(new IngestionProcess({ ingestor }));

  return field;
}

export default createDefaultProcessField;
