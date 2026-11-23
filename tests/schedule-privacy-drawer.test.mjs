import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {dev} from 'astro';

const host='mgiheatingandair.com';
async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}

test('schedule privacy drawer preserves live consent choices without contacting providers', {timeout:60000}, async()=>{
 const workerBefore=await readFile('public/_worker.js'),routesBefore=await readFile('public/_routes.json');
 const port=await freePort(), profile=await mkdtemp(path.join(process.cwd(),'.schedule-privacy-test-'));
 let context,server;
 try{
  server=await dev({root:process.cwd(),server:{host:'127.0.0.1',port},logLevel:'silent'});
  context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,serviceWorkers:'block',args:['--disable-background-networking']});
  let attemptedDni=0;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname===host){
    if(url.pathname==='/api/measurement-region'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({coloradoDefault:false})});return;}
    const upstream=await fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`);
    await route.fulfill({status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/octet-stream'},body:Buffer.from(await upstream.arrayBuffer())});return;
   }
   if(url.hostname==='mads-dni-go.servicetitan.com'||url.pathname.endsWith('/dni.js'))attemptedDni++;
   await route.abort();
  });
  await context.routeWebSocket('**/*',socket=>socket.close());
  const page=await context.newPage();
  await page.goto(`https://${host}/schedule-service/`,{waitUntil:'domcontentloaded'});
  const drawer=page.locator('[data-google-call-measurement]');
  await drawer.waitFor({state:'visible'});
  assert.equal(await drawer.count(),1);
  assert.equal(await drawer.getAttribute('data-sitewide'),'true');
  assert.equal(await drawer.locator('[data-measurement-explanation]').textContent(),'We use cookies and similar tools to understand how you use our website.');
  await drawer.locator('[data-call-measurement-grant]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('mgi-lp-call-measurement-v1')),'granted');
  assert.equal(await drawer.isHidden(),true);
  await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded'});await drawer.waitFor({state:'visible'});
  await drawer.locator('[data-call-measurement-deny]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('mgi-lp-call-measurement-v1')),'denied');
  assert.equal(await drawer.isHidden(),true);
  await page.reload({waitUntil:'domcontentloaded'});assert.equal(await drawer.isHidden(),true);
  const gpc=await context.newPage();
  await gpc.addInitScript(()=>{Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true});localStorage.setItem('mgi-lp-call-measurement-v1','granted');});
  await gpc.goto(`https://${host}/schedule-service/`,{waitUntil:'domcontentloaded'});
  const protectedDrawer=gpc.locator('[data-google-call-measurement]');assert.equal(await protectedDrawer.count(),1);
  await gpc.waitForFunction(()=>document.querySelector('[data-google-call-measurement]')?.dataset.measurementBasis==='gpc');
  assert.equal(await protectedDrawer.isHidden(),true);
  const choices=await context.newPage();await choices.goto(`https://${host}/privacy-choices/`,{waitUntil:'domcontentloaded'});
  const choicePanel=choices.locator('[data-google-call-measurement]');assert.equal(await choicePanel.count(),1);
  assert.equal(await choicePanel.getAttribute('data-choices-only'),'true');
  assert.equal(attemptedDni,0,'no DNI requests may be attempted by the fixture');
  assert.deepEqual(await readFile('public/_worker.js'),workerBefore);assert.deepEqual(await readFile('public/_routes.json'),routesBefore);
 }finally{
  if(context)await context.close();if(server)await server.stop();await rm(profile,{recursive:true,force:true});
 }
});
