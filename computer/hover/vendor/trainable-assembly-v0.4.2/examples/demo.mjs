import { PureSynthiaLearningCore } from '../src/pure-synthia-learning-core.mjs';
const s=new PureSynthiaLearningCore();
s.registry.register({entityId:'synthia',nativeAddress:{dimension:'Being',gate:1},sayings:{Being:'I Am'},state:{status:'awake'}});
s.registry.register({entityId:'event',nativeAddress:{dimension:'Evolution',gate:3},sayings:{Evolution:'I Remember chaos'},state:{status:'active'}});
const contact=s.registry.contact('synthia','event',{relation:'encounters'});
console.log(contact);
console.log(s.sentences.explainContact(s.registry.get('synthia'),s.registry.get('event'),{relation:'encounters'}));
