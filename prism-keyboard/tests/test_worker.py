import importlib.util, os, tempfile, unittest, json, threading, time
os.environ['PRISM_STATE']=tempfile.mkdtemp()
spec=importlib.util.spec_from_file_location('server',str(__import__('pathlib').Path(__file__).resolve().parents[1]/'server.py'));s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);s.init()
class WorkerTests(unittest.TestCase):
 def test_fix_preserves_lines(self):self.assertEqual(s.fix('i need help\ncan you help'), 'I need help.\nCan you help?')
 def test_unconfigured_ai_is_explicit(self):
  from unittest.mock import patch
  with patch.dict(os.environ,{},clear=True):
   with self.assertRaisesRegex(ValueError,'not configured'):s.execute('write',{'text':'write a letter'})
 def test_sources_are_not_verdicts(self):
  from unittest.mock import patch
  with patch.object(s,'fetch_json',return_value={'query':{'search':[{'title':'Moon','pageid':1,'snippet':'<b>Moon</b> orbits Earth'}]}}):
   r=s.execute('receipts',{'text':'Moon orbits Earth'})
   self.assertEqual(r['receipts'][0]['excerpt'],'Moon orbits Earth');self.assertIn('not verified',r['receipts'][0]['status'])
 def test_resume_running_job(self):
  with s.db() as c:c.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)',('resume','fix','{}','running',None,None,time.time()))
  s.init()
  with s.db() as c:self.assertEqual(c.execute("SELECT status FROM jobs WHERE id='resume'").fetchone()[0],'queued')
 def test_job_persists_result(self):
  with s.db() as c:c.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)',('test','fix',json.dumps({'text':'hello'}),'queued',None,None,time.time()))
  threading.Thread(target=s.worker,daemon=True).start()
  for _ in range(30):
   with s.db() as c:r=c.execute("SELECT * FROM jobs WHERE id='test'").fetchone()
   if r['status']=='done':break
   time.sleep(.1)
  self.assertEqual(json.loads(r['result'])['text'],'Hello.')
if __name__=='__main__':unittest.main()
