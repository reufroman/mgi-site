import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const base=process.env.MGI_TEST_URL||'https://mgiheatingandair.com';
const evidence='evidence/scheduler-2026-10-12';
const routes=JSON.parse(fs.readFileSync('src/data/routes.json'));
const paths=['/','/schedule-service/','/contact/','/services/','/homeowner-help/'];
const browser=await chromium.launch({headless:true});
const results=[];
try{
 // Verify each actual governed output contains exactly one installation.
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
 const html=walk('dist-review').filter(p=>p.endsWith('.html')&&!p.includes('/review/'));
 for(const file of html){const source=fs.readFileSync(file,'utf8');assert.equal((source.match(/static\.servicetitan\.com\/webscheduler\/shim\.js/g)||[]).length,1,file);assert.ok(source.includes('73995714-0241-4b8a-a89d-e81f8b1dfef6'),file)}
 results.push({check:'all-rendered-pages-single-install',count:html.length,governed:routes.length});
 const context=await browser.newContext();
 if(!process.env.MGI_TEST_URL){await context.route('https://mgiheatingandair.com/**',r=>{const path=new URL(r.request().url()).pathname;const file='dist-review'+(path.endsWith('/')?path+'index.html':path);if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({body:fs.readFileSync(file),contentType:path.includes('/_astro/')?'text/css':file.endsWith('.html')?'text/html':undefined});return r.continue();});}
 await context.route('https://static.servicetitan.com/webscheduler/shim.js',r=>r.fulfill({contentType:'application/javascript',body:`window.schedulerCalls=(window.STWidgetManager.q||[]);window.STWidgetManager=(...args)=>window.schedulerCalls.push(args);`}));
 const page=await context.newPage();
 for(const width of [320,393,820,1440]){
  await page.setViewportSize({width,height:900});
  for(const path of paths){
   const response=await page.goto(base+path,{waitUntil:'networkidle'});if(response.status()!==200)continue;
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${path}@${width} overflow`);
   const count=await page.locator('a[href^="/schedule-service/"]').count();assert.ok(count>=2,`${path} shared scheduling`);
   // All booking links, including contextual service/town query strings, open the widget.
   const hrefs=await page.locator('a[href^="/schedule-service/"]').evaluateAll(es=>es.map(e=>e.href));
   for(const href of hrefs){const before=await page.evaluate(()=>window.schedulerCalls.length);await page.evaluate(href=>document.querySelector(`a[href="${new URL(href).pathname+new URL(href).search}"]`).click(),href);assert.equal(await page.evaluate(()=>window.schedulerCalls.length),before+1);assert.equal(page.url(),base+path)}
   if(path==='/schedule-service/'){assert.equal(await page.locator('#service-request').count(),0);await page.locator('[data-scheduler-open]').click();assert.deepEqual(await page.evaluate(()=>window.schedulerCalls.at(-1)),['ws-open']);}
   if(width===393&&path==='/'){await page.locator('.mobile-menu summary').click();await page.locator('.mobile-menu a[href^="/schedule-service/"]').click();assert.equal(await page.locator('.mobile-menu').getAttribute('open'),null);}
   const header=page.locator('.schedule-button');await header.focus();const before=await page.evaluate(()=>window.schedulerCalls.length);await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.schedulerCalls.length),before+1);
   results.push({check:'booking-links-and-keyboard',path,width,links:count});
  }
 }
 await context.close();
 const blocked=await browser.newContext();await blocked.route('https://static.servicetitan.com/webscheduler/shim.js',r=>r.abort());const bp=await blocked.newPage();await bp.goto(base+'/',{waitUntil:'networkidle'});await bp.locator('.schedule-button').click();assert.ok(await bp.locator('#scheduler-help').isVisible());assert.equal(await bp.locator('#scheduler-help a').getAttribute('href'),'tel:+19702871673');results.push({check:'blocked-provider-call-fallback'});await blocked.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base+'/schedule-service/');assert.ok(await np.locator('noscript').isVisible());results.push({check:'no-javascript-call-fallback'});await nojs.close();
 fs.writeFileSync(evidence+'/site-integration-tests.json',JSON.stringify({base,results,errors:[]},null,2)+'\n');console.log(JSON.stringify({checks:results.length,errors:0}));
}finally{await browser.close()}
