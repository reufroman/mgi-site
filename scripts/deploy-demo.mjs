// Additive demo deployment: reuse published legacy assets, retain the budget Worker.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {hash}=require('/Users/reubensmith/.npm-global/lib/node_modules/wrangler/node_modules/blake3-wasm');
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const client=path.resolve(root,'../..');
const budget=path.join(client,'01_Projects/Marketing-Plan-App/deploy');
const guide=path.join(client,'06_Assets-&-Resources/Brand-Guidelines/2026-09-28_MGI-Brand-Guide/Deploy/2026-09-29-Moments');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'evidence/demo-before.json')));
const env={};
for(const line of fs.readFileSync('/Volumes/LNserver/Dropbox/Clients/.env','utf8').split('\n')){if(!line.trim()||line.trim().startsWith('#')||!line.includes('='))continue;const i=line.indexOf('=');env[line.slice(0,i).replace(/^export /,'').trim()]=line.slice(i+1).trim().replace(/^["']|["']$/g,'');}
const api='https://api.cloudflare.com/client/v4';
const project=`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/mgi-localnerds`;
async function req(route,options={},token=env.CLOUDFLARE_PAGES_TOKEN){const r=await fetch(api+route,{...options,headers:{Authorization:`Bearer ${token}`,...options.headers}});const j=await r.json();if(!r.ok||!j.success)throw Error(`Cloudflare request failed: ${r.status}`);return j.result;}
const evidenceArg=process.argv.find(x=>x.startsWith('--evidence-dir='));
const evidenceDir=evidenceArg?path.resolve(root,evidenceArg.split('=').slice(1).join('=')):path.join(root,'evidence');
fs.mkdirSync(evidenceDir,{recursive:true});
const save=(name,value)=>fs.writeFileSync(path.join(evidenceDir,name),JSON.stringify(value,null,2)+'\n');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const expectedCurrent=process.argv.includes('--repair')?JSON.parse(fs.readFileSync(path.join(root,'evidence/demo-deployment-created.json'))).id:baseline.deployment_id;
const p=await req(project);
if(p.canonical_deployment.id!==expectedCurrent)throw Error('Hosting baseline advanced; reconcile first');
const configHash=sha(JSON.stringify(p.deployment_configs.production));
const previous=JSON.parse(fs.readFileSync(path.join(guide,'preflight.json')));
if(configHash!==previous.productionConfigHash)throw Error('Production settings changed from the preserved Worker baseline');
const worker=fs.readFileSync(path.join(budget,'release/_worker.js'));
if(!worker.equals(fs.readFileSync(path.join(budget,'access-gate.mjs'))))throw Error('Budget Worker source disagrees with preserved package');
const manifest={...baseline.files},upload=[];
const types={html:'text/html',css:'text/css',js:'application/javascript',png:'image/png',webp:'image/webp',woff2:'font/woff2',jpg:'image/jpeg',txt:'text/plain; charset=UTF-8',xml:'application/xml',svg:'image/svg+xml'};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of walk(path.join(root,'dist-review'))){const name='/'+path.relative(path.join(root,'dist-review'),file).split(path.sep).join('/');if(['/_headers','/_redirects','/_routes.json','/_worker.js'].includes(name))continue;if(name in baseline.files&&!['/404.html','/robots.txt'].includes(name))throw Error('Unexpected preserved asset collision: '+name);const b=fs.readFileSync(file),ext=path.extname(file).slice(1),key=hash(b.toString('base64')+ext).toString('hex').slice(0,32);manifest[name]=key;upload.push({key,value:b.toString('base64'),metadata:{contentType:types[ext]||'application/octet-stream'},base64:true});}
const preserved=Object.entries(baseline.files).filter(([name])=>!['/404.html','/robots.txt'].includes(name));
if(!preserved.every(([name,key])=>manifest[name]===key))throw Error('Preserved asset mismatch');
const headers=fs.readFileSync(path.join(budget,'release/_headers'),'utf8').replace('/*\n','/*\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n')+'\n/brandguide/*\n  Cache-Control: no-cache\n/brandguide/MGI-Brand-Guide.md\n  Content-Disposition: attachment; filename=MGI-Brand-Guide.md\n\n/_astro/*\n  Cache-Control: public, max-age=31536000, immutable\n';
const retainedRedirects=fs.readFileSync(path.join(budget,'release/_redirects'),'utf8').split('\n').filter(l=>!/^\/\s+\/access-recovery\//.test(l)).join('\n')+'\n/brandguide  /brandguide/  308\n';
const migrationRedirects=fs.readFileSync(path.join(root,'dist-review/_redirects'),'utf8');
const redirects=retainedRedirects+'\n'+migrationRedirects;
const redirectSources=new Set();
for(const line of redirects.split('\n').map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'))){const [source,target,status]=line.split(/\s+/);if(redirectSources.has(source))throw Error('Duplicate redirect source: '+source);redirectSources.add(source);if(!target||!['301','302','308'].includes(status))throw Error('Invalid redirect rule: '+line);}
if(!redirects.includes('/marbudget  /marbudget/  308'))throw Error('Budget redirect changed');
const routes=fs.readFileSync(path.join(budget,'release/_routes.json'));
const receipt={baseline:expectedCurrent,legacyAssetBaseline:baseline.deployment_id,project:baseline.project,host:'https://mgi.localnerds.co',mode:'review',preservedAssets:preserved.length,newAssets:upload.length,totalAssets:Object.keys(manifest).length,productionConfigHash:configHash,workerSha256:sha(worker),routesSha256:sha(routes),rootRedirectRemoved:true,redirectRules:redirectSources.size,redirectsSha256:sha(redirects),headersSha256:sha(headers),manifest};save('demo-preflight.json',receipt);fs.writeFileSync(path.join(evidenceDir,'deployed-redirects.txt'),redirects);fs.writeFileSync(path.join(evidenceDir,'deployed-headers.txt'),headers);
console.log(JSON.stringify({...receipt,manifest:undefined}));
if(!process.argv.includes('--publish'))process.exit(0);
const {jwt}=await req(project+'/upload-token');
// Keep upload payloads bounded; the immutable prior asset hashes remain untouched.
for(let i=0;i<upload.length;i+=30)await req('/pages/assets/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(upload.slice(i,i+30))},jwt);
await req('/pages/assets/upsert-hashes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:upload.map(x=>x.key)})},jwt);
const missing=await req('/pages/assets/check-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hashes:Object.values(manifest)})},jwt);
if(missing.length)throw Error('Referenced assets missing; deployment stopped');
const wf=new FormData();wf.append('metadata',JSON.stringify({main_module:'_worker.js'}));wf.append('_worker.js',new File([worker],'_worker.js',{type:'application/javascript+module'}));
const form=new FormData();form.append('manifest',JSON.stringify(manifest));form.append('branch','main');form.append('commit_message','MGI Astro demo: full review site; preserve budget and existing tools');form.append('commit_dirty','true');form.append('_worker.bundle',new File([await new Response(wf).blob()],'_worker.bundle'));
for(const [name,b] of [['_routes.json',routes],['_headers',headers],['_redirects',redirects]])form.append(name,new File([b],name));
const fresh=await req(project);if(fresh.canonical_deployment.id!==expectedCurrent||sha(JSON.stringify(fresh.deployment_configs.production))!==configHash)throw Error('Concurrent deployment or settings change');
const d=await req(project+'/deployments',{method:'POST',body:form});save('demo-deployment-created.json',{id:d.id,url:d.url,created_on:d.created_on,latest_stage:d.latest_stage,rollbackDeployment:expectedCurrent});console.log(JSON.stringify({id:d.id,url:d.url,latest_stage:d.latest_stage}));
