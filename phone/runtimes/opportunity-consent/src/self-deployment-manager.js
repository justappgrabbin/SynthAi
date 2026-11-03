import { assert, id, now } from './utils.js';

export class SelfDeploymentManager {
  constructor({consent,ledger,provisioner,allowedPackages=[]}){ this.consent=consent; this.ledger=ledger; this.provisioner=provisioner; this.allowedPackages=new Set(allowedPackages); }
  async deploy(plan, installationConsentToken){
    const verified=this.consent.verify(installationConsentToken,{kind:'installation',requiredScopes:plan.requiredScopes||[]});
    assert(verified.valid,`Installation blocked: ${verified.reason}`);
    assert(verified.record.subjectId===plan.deviceOwnerId,'Installation blocked: consent subject is not device owner');
    assert(!plan.packageId || this.allowedPackages.has(plan.packageId),'Installation blocked: package is not allowlisted');
    assert(this.provisioner?.deploy,'Installation blocked: no authorized provisioner');
    const deploymentId=id('deploy');
    this.ledger.record(plan.opportunityId,'installation.started',{deploymentId,packageId:plan.packageId,deviceOwnerId:plan.deviceOwnerId});
    const result=await this.provisioner.deploy({...plan,deploymentId,consentId:verified.record.consentId});
    this.ledger.record(plan.opportunityId,result?.ok?'installation.completed':'installation.failed',{deploymentId,result:result||null,at:now()});
    return {deploymentId,...result};
  }
}
