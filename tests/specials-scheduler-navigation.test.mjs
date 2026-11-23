import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {dev} from 'astro';
import {scheduleHref} from '../src/data/holiday-specials.mjs';

async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}

test('Specials navigation reaches the existing scheduler page without loading the legacy shim', {timeout:60000}, async()=>{
 const liveSchedule=await readFile('../../Handoffs/2026-11-06_Website-Conversion-Recovery/release/candidate/schedule-service/index.html');
 const profile=await mkdtemp(path.resolve('..','specials-scheduler-test-'));
 const port=await freePort();let server,context;
 try{
  server=await dev({root:process.cwd(),server:{host:'127.0.0.1',port},logLevel:'silent'});
  context=await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true,serviceWorkers:'block',args:['--disable-background-networking']});
  let legacyRequests=0,productionFixtureHits=0;
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='mgiheatingandair.com'&&route.request().method()==='GET'){
    if(url.pathname==='/schedule-service/'){productionFixtureHits++;await route.fulfill({status:200,contentType:'text/html',body:liveSchedule});return;}
    if(url.pathname==='/api/measurement-region'){await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({coloradoDefault:false})});return;}
    const upstream=await fetch(`http://127.0.0.1:${port}${url.pathname}${url.search}`);
    await route.fulfill({status:upstream.status,headers:{'content-type':upstream.headers.get('content-type')||'application/octet-stream'},body:Buffer.from(await upstream.arrayBuffer())});return;
   }
   if(url.pathname.includes('webscheduler/shim.js'))legacyRequests++;
   await route.abort();
  });
  await context.routeWebSocket('**/*',socket=>socket.close());
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await context.newPage();await page.setViewportSize(viewport);
   await page.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true,configurable:true}));
   await page.goto('https://mgiheatingandair.com/specials/',{waitUntil:'domcontentloaded'});
   assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' ').trim(),'Up to $3,033 in Rebates + 0% Financing for 72 Months');
   assert.equal(await page.locator('a[href="/specials/"]').count(),3);
   assert.equal(await page.evaluate(()=>typeof window.STWidgetManager),'undefined');
   const links=page.locator('a[href^="/schedule-service/"]');assert.ok(await links.count()>0);
   for(const href of await links.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))))assert.equal(href,scheduleHref);
   await Promise.all([page.waitForURL('**/schedule-service/**'),page.locator('main').getByRole('link',{name:'Schedule service'}).first().click()]);
   assert.equal(new URL(page.url()).pathname,'/schedule-service/');
   assert.equal(new URL(page.url()).search,new URL(scheduleHref,'https://mgiheatingandair.com').search);
   assert.equal(new URL(page.url()).searchParams.get('ws-widget'),'open');
   assert.equal(new URL(page.url()).searchParams.get('topic'),'Holiday specials');
   await page.getByRole('button',{name:'Open service scheduler'}).waitFor({state:'visible'});
   await page.close();
  }
  assert.equal(productionFixtureHits,2);
  assert.equal(legacyRequests,0);
 }finally{
  if(context)await context.close();if(server)await server.stop();await rm(profile,{recursive:true,force:true});
 }
});
