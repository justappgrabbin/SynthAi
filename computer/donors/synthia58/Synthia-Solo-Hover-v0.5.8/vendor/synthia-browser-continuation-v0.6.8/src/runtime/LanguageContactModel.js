export class LanguageContactModel {
  respond(message, comprehension = {}) {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();
    if (/^(hi|hey|hello|yo)\b/.test(lower)) return Object.freeze({ text: 'Hey. What can I help you with?', mode: 'greeting' });
    if (/\b(thanks|thank you)\b/.test(lower)) return Object.freeze({ text: "You're welcome.", mode: 'acknowledgement' });
    if (/\?$/.test(text)) return Object.freeze({ text: 'I understand the question. I can answer directly unless it needs a tool or external action.', mode: 'question', comprehension });
    return Object.freeze({ text: 'Got it. I’m tracking that.', mode: 'contact', comprehension });
  }
}
export default LanguageContactModel;
