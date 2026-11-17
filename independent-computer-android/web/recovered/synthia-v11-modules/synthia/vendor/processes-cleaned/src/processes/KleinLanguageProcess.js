import { SynthiaProcess } from 'synthia/vendor/processes-cleaned/src/runtime/SynthiaProcess.js';
import { AspirationCore } from 'synthia/vendor/processes-cleaned/src/engine/AspirationCore.js';
import { KleinLinguisticLayer } from 'synthia/vendor/processes-cleaned/src/engine/KleinLinguisticLayer.js';

export class KleinLanguageProcess extends SynthiaProcess {
  constructor() {
    super({
      id: 'klein-language',
      kind: 'language-learning',
      capabilities: ['language.interaction', 'language.analyze', 'language.grammar'],
      metadata: {
        authority: 'local-process',
        lineage: 'Klein/AUTOLING-inspired donor implementation',
      },
    });

    // This process owns its own aspiration/memory support. It does not borrow a global mind.
    this.localAspiration = new AspirationCore();
    const localTriadAdapter = {
      updateLinguisticCHNOPS: (speaker, vector) => {
        this.mind.remember(`linguistic-chnops:${speaker}`, vector, 'KleinLinguisticLayer');
      },
    };
    this.layer = new KleinLinguisticLayer(this.localAspiration, localTriadAdapter);

    this.register('language.interaction', async ({ utterance, speaker = 'partner1', context = {}, outcome }) =>
      this.layer.processInteraction(utterance, speaker, context, outcome));

    this.register('language.analyze', ({ utterance }) => {
      const morphs = this.layer.morphology.analyze(utterance);
      const roles = this.layer.inferSemanticRoles(morphs, utterance);
      const elements = roles.map(role => this.layer.semanticElemental[role] || 'C');
      return { morphs, roles, elements, chnops: this.layer.computeLinguisticCHNOPS(elements) };
    });
    this.register('language.grammar', () => this.layer.exportGrammar());
  }
}

export default KleinLanguageProcess;
