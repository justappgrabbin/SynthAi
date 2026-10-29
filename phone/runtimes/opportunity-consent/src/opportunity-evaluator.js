import { clamp01, id, now } from './utils.js';

export class OpportunityEvaluator {
  constructor({minimumMutualBenefit=0.55}={}){ this.minimumMutualBenefit=minimumMutualBenefit; }
  evaluate({need,candidate,networkOffer=[],evidence=[]}){
    const required=need.requiredCapabilities||[];
    const available=candidate.availableCapabilities||[];
    const overlap=required.length ? required.filter(x=>available.includes(x)).length/required.length : 0;
    const evidenceScore=evidence.length ? evidence.reduce((s,e)=>s+clamp01(e.confidence ?? e.relevance ?? .5),0)/evidence.length : .25;
    const reciprocal=networkOffer.length ? Math.min(1, .35 + networkOffer.length*.15) : 0;
    const score=clamp01(overlap*.5 + evidenceScore*.2 + reciprocal*.3);
    return {
      opportunityId:id('opp'), createdAt:now(), need, candidate,
      reciprocalValue:{whatNetworkCanOffer:[...networkOffer],whatCandidateCanOffer:required.filter(x=>available.includes(x)),predictedMutualBenefit:score},
      evidence:[...evidence], confidence:clamp01((overlap+evidenceScore)/2), eligible:score>=this.minimumMutualBenefit && reciprocal>0
    };
  }
}
