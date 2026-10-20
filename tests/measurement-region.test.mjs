import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../public/_worker.js';
const endpoint='https://mgiheatingandair.com/api/measurement-region';
const request=(url=endpoint,cf,method='GET')=>({url,cf,method});
const env={ASSETS:{fetch:async()=>new Response('existing-static',{status:203})}};
test('Colorado request is eligible and cannot be shared-cached',async()=>{
 const res=await worker.fetch(request(endpoint,{country:'US',regionCode:'CO'}),env);
 assert.deepEqual(await res.json(),{coloradoDefault:true});
 for(const header of ['Cache-Control','CDN-Cache-Control','Cloudflare-CDN-Cache-Control'])assert.match(res.headers.get(header),/no-store/);
 assert.equal(res.headers.get('Cross-Origin-Resource-Policy'),'same-origin');
});
for(const [name,cf] of [['nonCO',{country:'US',regionCode:'CA'}],['foreign',{country:'GB',regionCode:'CO'}],['unknown',undefined]])
 test(`${name} request defaults off`,async()=>assert.deepEqual(await (await worker.fetch(request(endpoint,cf),env)).json(),{coloradoDefault:false}));
test('Client query cannot spoof trusted geography',async()=>assert.deepEqual(await (await worker.fetch(request(endpoint+'?country=US&regionCode=CO',undefined),env)).json(),{coloradoDefault:false}));
test('Preview hostname cannot enable Colorado default',async()=>assert.deepEqual(await (await worker.fetch(request('https://preview.pages.dev/api/measurement-region',{country:'US',regionCode:'CO'}),env)).json(),{coloradoDefault:false}));
test('HEAD no response body and POST rejected',async()=>{
 assert.equal(await (await worker.fetch(request(endpoint,undefined,'HEAD'),env)).text(),'');
 assert.equal((await worker.fetch(request(endpoint,undefined,'POST'),env)).status,405);
});
test('Every other asset falls through unchanged',async()=>{
 const res=await worker.fetch(request('https://mgiheatingandair.com/schedule-service/'),env);
 assert.equal(res.status,203);assert.equal(await res.text(),'existing-static');
});
