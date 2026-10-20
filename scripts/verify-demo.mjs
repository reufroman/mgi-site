import fs from 'node:fs';
import crypto from 'node:crypto';
const env={};for(const line of fs.readFileSync('/Volumes/LNserver/Dropbox/Clients/.env','utf8').split('\n')){if(!line.trim()||line.trim().startsWith('#')||!line.includes('='))continue;const i=line.indexOf('=');env[line.slice(0,i).replace(/^export /,'').trim()]=line.slice(i+1).trim().replace(/^["']|["']$/g,'');}
const base=`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/mgi-localnerds`;
async function get(url){const r=await fetch(url,{headers:{Authorization:`Bearer ${env.CLOUDFLARE_PAGES_TOKEN}`}}),j=await r.json();if(!r.ok||!j.success)throw Error('API verification failed');return j.result;}
const evidenceDir=process.argv.find(x=>x.startsWith('--evidence-dir='))?.split('=').slice(1).join('=')||'evidence';
const p=await get(base),created=JSON.parse(fs.readFileSync(`${evidenceDir}/demo-deployment-created.json`)),expected=JSON.parse(fs.readFileSync(`${evidenceDir}/demo-preflight.json`));
const d=await get(base+'/deployments/'+created.id);
const errors=[];
if(p.canonical_deployment.id!==created.id)errors.push('Canonical deployment not updated');
if(d.latest_stage.status!=='success')errors.push('Deployment stage not successful');
if(crypto.createHash('sha256').update(JSON.stringify(p.deployment_configs.production)).digest('hex')!==expected.productionConfigHash)errors.push('Production configuration changed');
for(const [name,key] of Object.entries(expected.manifest))if(d.files[name]!==key)errors.push('Asset mismatch: '+name);
if(Object.keys(d.files).length!==expected.totalAssets)errors.push('Asset count mismatch');
const host='https://mgi.localnerds.co';
const responses=[];for(const route of ['/','/review/','/robots.txt','/this-route-does-not-exist/']){const r=await fetch(host+route,{headers:{'User-Agent':'Mozilla/5.0 MGI-Demo-Verification'}}),body=await r.text();responses.push({route,status:r.status,url:r.url,noindex:r.headers.get('x-robots-tag'),home:route==='/'?body.includes('data-page-id="ST-001"'):undefined});if(route!=='/robots.txt'&&r.headers.get('x-robots-tag')!=='noindex, nofollow')errors.push('Noindex missing: '+route);if(route==='/'&&(r.status!==200||!body.includes('data-page-id="ST-001"')))errors.push('Wrong live Home');if(route==='/robots.txt'&&!body.includes('Disallow: /'))errors.push('Robots protection missing');if(route==='/this-route-does-not-exist/'&&r.status!==404)errors.push('Unknown route not 404');}
const receipt={deployment:created.id,status:d.latest_stage.status,host,totalAssets:Object.keys(d.files).length,preservedAssets:expected.preservedAssets,assetHashesMatch:errors.every(e=>!e.startsWith('Asset')),productionConfigUnchanged:!errors.includes('Production configuration changed'),responses,errors};fs.writeFileSync(`${evidenceDir}/demo-live-verification.json`,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));if(errors.length)process.exitCode=1;
