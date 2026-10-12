import os
import subprocess,tempfile,pathlib,json,time,urllib.request,urllib.error
root=pathlib.Path(__file__).resolve().parents[1];state=pathlib.Path(tempfile.mkdtemp());settings=state/'settings.json';settings.write_text(json.dumps({'synthiaMode':'hover','synthiaUrl':'http://127.0.0.1:18974'}))
node=subprocess.Popen(['node',str(root/'tests/hover_chat_server.mjs')],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,env={**os.environ,'PRISM_SYNTHIA_SOURCE':'/workspace/synthia-hover-source/computer/donors/synthia58/Synthia-Solo-Hover-v0.5.8'})
server=None
(state/'runtime').mkdir()
(state/'runtime/jobs.json').write_text(json.dumps([{'id':'execution-fixture','created':0,'status':'done','action':'code','result':json.dumps({'files':[{'name':'keyboard-check.js','content':'console.log(6 * 7);'}]})}]))
try:
 ready=node.stdout.readline();assert 'ready' in ready,ready
 server=subprocess.Popen(['java','-cp','/workspace/android-build-tools/json.jar:/workspace/android-build-tools/server-tests','app.prismkeys.PrismServerHarness',str(state/'runtime'),str(root/'web'),'18774',str(settings)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 for _ in range(50):
  if (state/'runtime/token').exists():break
  time.sleep(.1)
 token=(state/'runtime/token').read_text()
 def call(path,data=None):
  req=urllib.request.Request('http://127.0.0.1:18774'+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=None if data is None else json.dumps(data).encode())
  with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)
 time.sleep(.2)
 for message in ['I want to understand a situation where a team keeps missing its goal.','How do relationships and obstacles change the meaning of that situation?']:
  jid=call('/api/jobs',{'action':'chat','text':message,'history':[{'role':'user','text':'We are discussing a team situation'}],'meaningContext':{'scope':'all-contexts','situation':message,'framework':'BANTU/AUTOLING'}})['id']
  for _ in range(100):
   job=next(j for j in call('/api/jobs') if j['id']==jid)
   if job['status'] in ('done','failed'):break
   time.sleep(.1)
  assert job['status']=='done',job.get('error');result=json.loads(job['result']);assert result['text'].strip();assert result['engine']=='Synthia 0.5.8 Hover canonical chat pipeline';assert result['text']==result['trace']['utterance'];assert len(result['trace']['pipelineTrace'])==7;assert result['trace']['meaningContextApplied'];assert result['trace']['meaningContext']['scope']=='all-contexts';assert 'fixture' not in result['text'].lower()
 jid=call('/api/jobs',{'action':'run','sourceJob':'execution-fixture'})['id']
 for _ in range(200):
  job=next(j for j in call('/api/jobs') if j['id']==jid)
  if job['status'] in ('done','failed'):break
  time.sleep(.1)
 assert job['status']=='done',job
 result=json.loads(job['result']);assert result['trace']['ok'];assert '42' in json.dumps(result['trace']['result']);assert result['trace']['analysis']['analogy']['ok']
 print('Keyboard Run → Java job → real Synthia execution pipeline → persisted Inbox passed.')
 for name,code in [('keyboard-check.js','console.log(6 * 7);'),('keyboard-check.py','print(6 * 7)')]:
  req=urllib.request.Request('http://127.0.0.1:18974/api/execute',headers={'Content-Type':'application/json'},data=json.dumps({'artifact':{'name':name,'content':code},'context':{'personId':'front-screen','agentId':'synthia','prismCompact':True}}).encode())
  with urllib.request.urlopen(req,timeout=60) as reply:execution=json.load(reply)
  assert execution['ok'],execution
  assert '42' in json.dumps(execution['result']),execution
  assert execution['analysis']['analogy']['ok'],execution['analysis']
 print('Actual universal JavaScript engine executes JS and reconstructs a Python sample; Klein strategy analysis is present.')
 print('Actual Hover branch → Java server → persisted inbox: two chat turns return the donor utterance, with no canned fallback.')
finally:
 if server is not None:server.terminate();server.wait(timeout=8)
 node.terminate()
 try:node.wait(timeout=8)
 except subprocess.TimeoutExpired:node.kill();node.wait()
