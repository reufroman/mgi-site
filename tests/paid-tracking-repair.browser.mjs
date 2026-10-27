import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createFixtureServer } from '../scripts/tracking-repair-fixture.mjs';
import fs from 'node:fs';
const server=createFixtureServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();const page=await context.newPage();const external=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1'){external.push(u.hostname);return route.abort();}return route.continue();});
 await page.goto('http://127.0.0.1:'+port+'/?gclid=TEST-MGI-20261026&utm_source=google&utm_medium=cpc');
 await page.getByRole('button',{name:'Submit local test form'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('mgi_form_confirmed'));
 let output=JSON.parse(await page.locator('#result').innerText());assert.equal(output.mockReceipt.attribution.gclid,'TEST-MGI-20261026');assert.equal(output.events.length,1);
 await page.getByRole('button',{name:'Submit local test form'}).click();output=JSON.parse(await page.locator('#result').innerText());assert.equal(output.events.length,1);
 await page.getByRole('button',{name:'Confirm local test booking'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('mgi_booking_confirmed'));output=JSON.parse(await page.locator('#result').innerText());assert.equal(output.events.length,2);assert.equal(output.mockReceipt.dispatch,false);assert.equal(output.mockReceipt.messages,false);
 await page.setViewportSize({width:393,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 fs.mkdirSync('tracking-repair/evidence',{recursive:true});await page.screenshot({path:'tracking-repair/evidence/local-fixture-phone.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'tracking-repair/evidence/local-fixture-desktop.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Confirm local test booking'}).click();await page.waitForFunction(()=>document.querySelector('#result').textContent.includes('mockReceipt'));output=JSON.parse(await page.locator('#result').innerText());assert.equal(output.events.length,0);
 assert.deepEqual(external,[]);fs.writeFileSync('tracking-repair/evidence/local-test-results.json',JSON.stringify({scope:'loopback fixtures only',checks:['form confirmed once','booking confirmed once','reload dedupe','source/gclid preserved','no dispatch','no customer messages','phone overflow absent','zero external requests'],googleAdsReceipt:'unknown, not contacted',serviceTitanReceipt:'unknown, not contacted'},null,2)+'\n');console.log('PASS: 8 local browser checks; zero external requests.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
