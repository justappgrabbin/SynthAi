"""Exercise the actual Java on-device server on the JVM, with contract stubs for phone-only peers."""
import json,pathlib,subprocess,tempfile,time,urllib.request,urllib.error,threading
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
ROOT=pathlib.Path(__file__).resolve().parents[1]
JAVA_CLASSES='/workspace/android-build-tools/server-tests'
JAVA_JSON='/workspace/android-build-tools/json.jar'
class Peer(BaseHTTPRequestHandler):
 def log_message(self,*a):pass
 def do_POST(self):
  data=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
  if self.path=='/api/container/exec':
   assert data['command'];response={'success':True,'code':0,'stdout':'Synthai2 hands contract','stderr':''}
  elif self.path=='/terminal/run':response={'ok':True,'code':0,'stdout':'Synthia hands contract','stderr':''}
  elif self.path=='/operator/do':
   assert data['tool']=='synthia.generate';response={'ok':True,'local':{'generated':'Local Synthia reply'},'hf':{'ok':False}}
  else:response={'error':'unexpected route'}
  raw=json.dumps(response).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
def runtime(config):
 directory=pathlib.Path(tempfile.mkdtemp());cfg=directory/'config.json';cfg.write_text(json.dumps(config))
 proc=subprocess.Popen(['java','-cp',JAVA_JSON+':'+JAVA_CLASSES,'app.prismkeys.PrismServerHarness',str(directory/'state'),str(ROOT/'web'),'18771',str(cfg)],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 for _ in range(80):
  if (directory/'state/token').exists():
   try:
    urllib.request.urlopen('http://127.0.0.1:18771/api/status')
   except urllib.error.HTTPError:break
   except OSError:pass
  if proc.poll() is not None:raise AssertionError(proc.stderr.read().decode())
  time.sleep(.1)
 token=(directory/'state/token').read_text()
 def req(path,data=None,auth=True):
  headers={'Content-Type':'application/json'}
  if auth:headers['Authorization']='Bearer '+token
  r=urllib.request.Request('http://127.0.0.1:18771'+path,headers=headers,data=None if data is None else json.dumps(data).encode())
  with urllib.request.urlopen(r,timeout=10) as response:return json.load(response)
 def job(data):
  jid=req('/api/jobs',data)['id']
  for _ in range(80):
   j=next(x for x in req('/api/jobs') if x['id']==jid)
   if j['status'] in ('done','failed'):return j
   time.sleep(.1)
  raise AssertionError('Job timeout')
 return proc,req,job
peer=ThreadingHTTPServer(('127.0.0.1',18772),Peer);threading.Thread(target=peer.serve_forever,daemon=True).start()
for config in [{},{'linuxUrl':'http://127.0.0.1:18772','linuxMode':'synthai2'},{'linuxUrl':'http://127.0.0.1:18772','linuxMode':'synthia'},{'synthiaUrl':'http://127.0.0.1:18772'}]:
 proc,req,job=runtime(config)
 try:
  assert req('/api/status')['embedded']
  ctx=req('/api/context',{'title':'Coding preference','text':'Python scripts use lavender colors.'})['id'];assert any(x['id']==ctx for x in req('/api/context'))
  j=job({'action':'terminal','text':'echo local-terminal'});assert j['status']=='done',j
  j=job({'action':'mcp-list'});assert j['status']=='done',j;assert len(json.loads(j['result'])['tools'])==3
  j=job({'action':'mcp-call','toolName':'read_file','arguments':{'path':'../token'}});assert j['status']=='failed'
  j=job({'action':'self-apply','approved':False});assert j['status']=='failed'
  j=job({'action':'chat','text':'hello'});assert j['status']=='done',j
  chat=json.loads(j['result']);assert 'Synthia' in chat['text'];assert 'model' not in chat.get('engine','').lower(),chat
  assert req('/mcp',{'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-03-26'}})['result']['protocolVersion']=='2025-03-26'
  try:req('/api/status',auth=False);raise AssertionError('Unauthenticated request succeeded')
  except urllib.error.HTTPError as e:assert e.code==401
 finally:proc.terminate();proc.wait(timeout=8)
peer.shutdown()
print('Embedded Java server, persistent context, shell, MCP, path boundaries, offline chat and Synthai2/Synthia endpoint contracts passed.')
