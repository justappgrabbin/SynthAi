from pathlib import Path
from playwright.sync_api import sync_playwright
import json,subprocess,tempfile,time
root=Path(__file__).resolve().parents[1];state=Path(tempfile.mkdtemp())
proc=subprocess.Popen(['java','-cp','/workspace/android-build-tools/json.jar:/workspace/android-build-tools/server-tests','app.prismkeys.PrismServerHarness',str(state),str(root/'web'),'18773'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
try:
 for _ in range(50):
  if (state/'token').exists():break
  time.sleep(.1)
 token=(state/'token').read_text()
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':390,'height':700});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   path=r.request.url.split(':8770',1)[1].split('?',1)[0]
   if path.startswith('/api/'):
    h=r.request.headers.copy();h['origin']='http://127.0.0.1:18773';response=r.fetch(url='http://127.0.0.1:18773'+path,headers=h);r.fulfill(response=response);return
   f=root/'web'/('index.html' if path=='/' else path.lstrip('/'))
   r.fulfill(path=str(f),content_type='text/javascript' if f.suffix=='.js' else 'text/html')
  page.route('http://127.0.0.1:8770/**',route);page.goto('http://127.0.0.1:8770/')
  page.evaluate('(token)=>{window.prismEmbedded=true;enableEmbeddedRuntimeUI();workerToken=token;sessionStorage.setItem("prismToken",token);refreshWorker();}',token)
  page.wait_for_timeout(400);assert page.evaluate('window.Synthia !== undefined')
  page.locator('#moreTools').click();page.locator('#panelContent').get_by_role('button',name='◌ Synthia chat',exact=True).click();page.locator('#synthiaMessage').fill('hello Synthia');page.locator('#synthiaSend').click()
  page.locator('#synthiaMessages').get_by_text("Hi, I'm Synthia.",exact=False).wait_for(timeout=12000)
  page.locator('#synthiaClose').click();page.locator('#openTerminal').click();page.locator('#terminalCommand').fill('echo server-is-inside');page.locator('#runTerminal').click();page.locator('#terminalOutput').get_by_text('server-is-inside',exact=False).wait_for(timeout=12000)
  assert not errors,errors
  browser.close();print('Built-in server auto-pair, supplied Synthia core, conversation inbox and native-runtime terminal UI passed.')
finally:
 proc.terminate();proc.wait(timeout=8)
