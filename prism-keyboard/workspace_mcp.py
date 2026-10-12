#!/usr/bin/env python3
"""Minimal MCP stdio server: bounded project inspection. No write tools."""
import json,os,sys
from pathlib import Path
ROOT=Path(os.environ.get('PRISM_PROJECT_ROOT',str(Path(__file__).parent))).resolve()
TOOLS=[{'name':'list_files','description':'List up to 200 project files (excludes state, secrets and build folders).','inputSchema':{'type':'object','properties':{}}},{'name':'read_file','description':'Read a UTF-8 project source file up to 60KB.','inputSchema':{'type':'object','properties':{'path':{'type':'string'}},'required':['path']}}]
def allowed(path):
 return path.is_relative_to(ROOT) and not any(x in ('state','.git','.env','node_modules','.gradle','build','__pycache__','dist') or x.endswith(('.keystore','.pem','.key')) for x in path.relative_to(ROOT).parts)
for line in sys.stdin:
 try:
  msg=json.loads(line)
  if 'id' not in msg:continue
  method=msg.get('method');params=msg.get('params',{})
  if method=='initialize':result={'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'Prism workspace','version':'0.2.0'}}
  elif method=='tools/list':result={'tools':TOOLS}
  elif method=='tools/call':
   name=params['name'];args=params.get('arguments',{})
   if name=='list_files':text='\n'.join(str(p.relative_to(ROOT)) for p in list(ROOT.rglob('*')) if p.is_file() and allowed(p))[:20000]
   elif name=='read_file':
    p=(ROOT/args['path']).resolve()
    if not allowed(p) or not p.is_file() or p.stat().st_size>60000:raise ValueError('File is outside the workspace, private, missing, or too large')
    text=p.read_text()
   else:raise ValueError('Unknown tool')
   result={'content':[{'type':'text','text':text}]}
  else:raise ValueError('Unsupported method')
  response={'jsonrpc':'2.0','id':msg['id'],'result':result}
 except Exception as e:response={'jsonrpc':'2.0','id':locals().get('msg',{}).get('id'),'error':{'code':-32602,'message':str(e)}}
 print(json.dumps(response),flush=True)
