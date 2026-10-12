from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':420,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8765');page.evaluate("byId('auto').checked=false");page.locator('#t').fill('hello original keyboard');page.locator('#bP').click();assert page.locator('#t').input_value()=='Hello original keyboard.'
 page.locator('#settingsButton').click();page.locator('#workerToken').fill((root/'state/token').read_text());page.locator('#connectWorker').click();page.wait_for_timeout(500);page.locator('#closeSettings').click()
 page.locator('#saveContext').click();page.wait_for_timeout(500)
 page.evaluate('''() => openJob({id:'preview',action:'code',input:JSON.stringify({text:'html'}),result:JSON.stringify({text:'HTML result',files:[{name:'test.html',content:'<h1>Preview works</h1><script>document.body.dataset.test="ok";<\\/script>'}]})})''')
 assert page.locator('#kb').is_hidden();assert page.frame_locator('#previewFrame').locator('h1').inner_text()=='Preview works'
 page.locator('#pushPreview').click();assert page.locator('#t').input_value()=='HTML result';assert page.locator('#kb').is_visible()
 page.locator('#settingsButton').click();page.locator('#openFeatureStore').click();page.locator('#customFeatureName').fill('Summarize');page.locator('#customFeatureInstructions').fill('Summarize the input in two sentences');page.locator('#installCustomFeature').click();assert page.locator('#customFeatureBar').get_by_text('Summarize',exact=True).count()==1
 page.locator('#featureCatalog .context-item').filter(has_text='Summarize').get_by_role('button',name='Remove').click();assert page.locator('#customFeatureBar').is_hidden();page.locator('#closeFeatureStore').click()
 page.screenshot(path=str(root/'preview.png'),full_page=True)
 assert not errors,errors
 browser.close();print('Original typing, punctuation, pairing, context save, sandbox preview and Push passed.')
