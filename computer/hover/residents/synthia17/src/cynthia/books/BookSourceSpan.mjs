export class BookSourceSpan {
  constructor({bookId,title,page,text,visualEvidence=[],provenance={}}={}){if(!bookId||!Number.isInteger(page)||!String(text).trim())throw new TypeError('BOOK_SOURCE_ID_PAGE_TEXT_REQUIRED');Object.assign(this,{schema:'cynthia-book-span/1',bookId,title:String(title??bookId),page,text:String(text),visualEvidence:Object.freeze(structuredClone(visualEvidence)),provenance:Object.freeze(structuredClone(provenance))});Object.freeze(this);}
  citation(){return Object.freeze({bookId:this.bookId,title:this.title,page:this.page,visualEvidence:this.visualEvidence});}
}
