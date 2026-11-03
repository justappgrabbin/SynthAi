import { clamp01, now } from './utils.js';

export class ExternalOutcomeTracker {
  constructor({ledger,eventBus}){ this.ledger=ledger; this.eventBus=eventBus; }
  async observe(opportunityId,outcome){
    const normalized={...outcome,observedAt:now(),perceivedBenefitA:clamp01(outcome.perceivedBenefitA),perceivedBenefitB:clamp01(outcome.perceivedBenefitB)};
    this.ledger.record(opportunityId,'collaboration.outcome',normalized);
    await this.eventBus?.emit('external.outcome',{opportunityId,outcome:normalized});
    return normalized;
  }
}

export class ValueAttributionEngine {
  evaluate({economicValue,facilitationEvidence=[],agreement}){
    const attributable=Number(economicValue)>0 && facilitationEvidence.length>0 && Boolean(agreement?.successShareAccepted);
    return {valueCreated:Math.max(0,Number(economicValue)||0),systemAttributed:attributable,agreedShare:attributable?Number(agreement.shareRate||0):null,shareValue:attributable?(Number(economicValue)||0)*Number(agreement.shareRate||0):0};
  }
}
