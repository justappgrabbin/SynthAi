import test from 'node:test';
import assert from 'node:assert/strict';
import {newBoard,validateBoard,updateGoal,progress,safePath,zipDirectory,extractTextZip,makeSafePreview,pickEntry} from '../../public/workspace-core.mjs';

function storedZip(name,text){
  const encoder=new TextEncoder(),n=encoder.encode(name),b=encoder.encode(text),total=30+n.length+b.length+46+n.length+22;
  const a=new Uint8Array(total),v=new DataView(a.buffer);let p=0;
  const w16=x=>{v.setUint16(p,x,true);p+=2},w32=x=>{v.setUint32(p,x,true);p+=4},write=x=>{a.set(x,p);p+=x.length};
  w32(0x04034b50);w16(20);w16(0);w16(0);w16(0);w16(0);w32(0);w32(b.length);w32(b.length);w16(n.length);w16(0);write(n);write(b);
  const offset=p;
  w32(0x02014b50);w16(20);w16(20);w16(0);w16(0);w16(0);w16(0);w32(0);w32(b.length);w32(b.length);w16(n.length);w16(0);w16(0);w16(0);w16(0);w32(0);w32(0);write(n);
  const dirsize=p-offset;
  w32(0x06054b50);w16(0);w16(0);w16(1);w16(1);w32(dirsize);w32(offset);w16(0);
  return a.buffer;
}
test('paths reject traversal; retain nested source paths',()=>{
  assert.equal(safePath('../secrets.txt'),null);
  assert.equal(safePath('foo/../secret'),null);
  assert.equal(safePath('src/index.html'),'src/index.html');
  assert.equal(safePath('/index.html'),'index.html');
});
test('goals persist only verified complete state',()=>{
  const b=newBoard();assert.equal(progress(b).done,5);
  assert.throws(()=>updateGoal(b,'G03','done'),/verification note/);
  const updated=updateGoal(b,'G03','done','Browser acceptance receipt #1');
  assert.equal(progress(updated).done,6);
  assert.equal(b.goals.find(g=>g.id==='G03').status,'todo');
  assert.equal(validateBoard(updated).goals.length,b.goals.length);
  assert.throws(()=>validateBoard({...updated,goals:[{...updated.goals[0],evidence:''}]}),/Invalid goal/);
});
test('ZIP directory and import correctly unpack stored HTML',async()=>{
  const array=storedZip('demo/index.html','<h1>real source</h1>');
  assert.equal(zipDirectory(array).length,1);
  const data=await extractTextZip(array);
  assert.equal(data.entryCount,1);assert.equal(data.files.length,1);
  assert.equal(pickEntry(data.files).path,'demo/index.html');
  const rendered=makeSafePreview(data.files,data.files[0]);
  assert.match(rendered,/real source/);
});
test('ZIP path traversal is never imported',async()=>{
  const data=await extractTextZip(storedZip('../escape.html','evil'));
  assert.equal(data.files.length,0);
});
test('preview embeds permitted local resources and blocks remote requests',()=>{
 const files=[
   {path:'demo/index.html',text:'<html><head><link rel="stylesheet" href="style.css"></head><body><script src="app.js"></script><script src="https://evil.example/script.js"></script></body></html>'},
   {path:'demo/style.css',text:'body{color:red}'},
   {path:'demo/app.js',text:'document.body.dataset.ready="yes";'}
 ];
 const s=makeSafePreview(files,files[0]);
 assert.match(s,/Content-Security-Policy/);
 assert.match(s,/connect-src/);
 assert.match(s,/body\{color:red\}/);
 assert.match(s,/dataset.ready/);
 assert.doesNotMatch(s,/https:\/\/evil.example/);
});
