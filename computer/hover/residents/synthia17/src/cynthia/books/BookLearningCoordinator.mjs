export class BookLearningCoordinator {
  constructor({ingestion,resolver,gapFactory}={}){if(!ingestion||!resolver||!gapFactory)throw new TypeError('BOOK_COORDINATOR_DEPENDENCIES_REQUIRED');Object.assign(this,{ingestion,resolver,gapFactory});}
  discover(book){return this.ingestion.discover(book);}
  async assess(proposition){const resolution=this.resolver.resolve(proposition);if(resolution.ready)return Object.freeze({status:'ready',proposition,resolution});const gap=await this.gapFactory.identify(proposition,resolution);return Object.freeze({status:'gap-identified',proposition,resolution,gap});}
  retain(proposition,toolId){this.resolver.registerProposition(proposition.id,toolId);return Object.freeze({propositionId:proposition.id,toolId});}
}
