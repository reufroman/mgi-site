// Loopback-only fixture. Never calls Google or ServiceTitan. Not part of Astro routes.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const modulePath=fileURLToPath(new URL('../src/data/paid-tracking-repair.mjs',import.meta.url));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>MGI tracking test fixture</title>
<style>body{font:18px system-ui;max-width:850px;margin:40px auto;padding:20px;background:#fffdfb;color:#174e5b}section{border:1px solid #174e5b;padding:20px;margin:20px 0}button{font:inherit;padding:12px;background:#174e5b;color:white;border:0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}label{display:block;margin:10px 0}input{font:inherit;width:90%}</style>
<h1>MGI tracking test fixture</h1><p>Local mock only. No ServiceTitan lead, job, Google Ads conversion, email, or text will be created.</p>
<section><h2>1. Labeled test form</h2><form id="form"><label>Test name<input name="name" value="TEST-CODEX Form" readonly></label><label>Test receipt label<input name="marker" value="TEST-MGI-FORM-20261026" readonly></label><button>Submit local test form</button></form></section>
<section><h2>2. Labeled test booking</h2><form id="booking"><label>Test name<input name="name" value="TEST-CODEX Booking" readonly></label><label>Test receipt label<input name="marker" value="TEST-MGI-BOOKING-20261026" readonly></label><button>Confirm local test booking</button></form></section>
<label><input type="checkbox" id="allow" checked style="width:auto">Allow measurement in this local fixture</label><h2>Local test receipts and event output</h2><pre id="result" role="status">No test submitted.</pre>
<script type="module">
import{createReceiptReporter,schedulerDestination}from'/repair.mjs';
const events=[];const report=createReceiptReporter({mode:'fixture',hostname:location.hostname,consent:()=>document.querySelector('#allow').checked,storage:sessionStorage,emit:event=>events.push(event)});
for(const kind of ['form','booking'])document.getElementById(kind).addEventListener('submit',async e=>{e.preventDefault();const id=new FormData(e.target).get('marker');const url=schedulerDestination({pageUrl:location.href,measurementAllowed:document.querySelector('#allow').checked});const response=await fetch('/mock/'+kind,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,attribution:Object.fromEntries(url.searchParams)})});const receipt=await response.json();report(receipt);document.querySelector('#result').textContent=JSON.stringify({mockReceipt:receipt,events,googleAds:'not contacted',serviceTitan:'not contacted'},null,2);});
</script></html>`;
export function createFixtureServer(){return http.createServer(async(req,res)=>{
 const origin='http://'+req.headers.host;
 if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)){res.writeHead(403);res.end();return;}
 res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-src 'none'");
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const path=new URL(req.url,origin).pathname;
 if(req.method==='GET'&&path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 if(req.method==='GET'&&path==='/repair.mjs'){res.setHeader('Content-Type','application/javascript');res.end(await readFile(modulePath));return;}
 if(req.method==='POST'&&/^\/mock\/(form|booking)$/.test(path)){
  if(req.headers.origin!==origin){res.writeHead(403);res.end();return;}
  let body='';for await(const part of req){body+=part;if(body.length>4096){res.writeHead(413);res.end();return;}}
  try{const input=JSON.parse(body),kind=path.split('/').at(-1),expected=kind==='form'?'TEST-MGI-FORM-20261026':'TEST-MGI-BOOKING-20261026';if(input.id!==expected)throw Error();
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:expected,kind,confirmed:true,test:true,dispatch:false,messages:false,attribution:input.attribution}));return;
  }catch{res.writeHead(400);res.end();return;}
 }
 res.writeHead(404);res.end();
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){const server=createFixtureServer();server.listen(4346,'127.0.0.1',()=>console.log('Local fixture: http://127.0.0.1:4346/?gclid=TEST-MGI-20261026&utm_source=google&utm_medium=cpc&utm_campaign=mgi_tracking_test'));}
