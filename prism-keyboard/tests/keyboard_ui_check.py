from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':330});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def serve(route):
  path=route.request.url.split('8765',1)[-1].split('?',1)[0]
  file=root/'web'/('index.html' if path=='/' else path.lstrip('/'))
  if path.startswith('/api/'):route.fulfill(status=401,json={'error':'Worker not paired'});return
  if file.is_file():route.fulfill(path=str(file),content_type='text/javascript' if file.suffix=='.js' else 'text/html')
  else:route.fulfill(status=404,body='Not found')
 page.route('http://127.0.0.1:8765/**',serve);page.goto('http://127.0.0.1:8765/')
 page.evaluate("enableNativeKeyboardUI();byId('auto').checked=false")
 assert page.locator('header').is_hidden();assert page.locator('main').is_hidden();assert page.locator('#keyboardSwitch').is_visible()
 assert page.locator('.number-row .k').count()==10
 page.locator('#moreTools').click();assert page.locator('#panelTitle').inner_text()=='More tools';assert page.locator('#kb').is_hidden()
 page.locator('#panelContent').get_by_role('button',name='◉ Colors',exact=True).click();page.locator('#panelContent').get_by_role('button',name='Lavender + pink',exact=True).click()
 assert page.evaluate('localStorage.prismPalette')=='lavenderPink';assert page.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(228, 201, 237)'
 page.locator('#panelBack').click();page.locator('#glyphButton').click();page.locator('#panelContent').get_by_role('button',name='♡',exact=True).click();assert page.locator('#t').input_value().endswith('♡')
 page.locator('#panelBack').click();assert page.locator('#kb').is_visible()
 total=page.evaluate('document.documentElement.scrollHeight');assert total<=330,total
 page.screenshot(path=str(root/'keyboard-lavender-pink.png'));page.reload();assert page.evaluate('localStorage.prismPalette')=='lavenderPink'
 assert not errors,errors
 browser.close();print('Toolbar, more tools, palettes, glyph insertion, persistence and 330px layout passed.')
