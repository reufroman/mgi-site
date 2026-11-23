import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {api,env,sha} from '../../Website-Astro-Tracking-Release-2026-10-27/scripts/cf.mjs';
const evidence='evidence/completed-flow-2026-10-30',candidate='.local-preview/completed-flow-candidate';
const baseline='.local-preview/booking-thank-you-candidate';
const expected='2ec76ffe-2175-40a4-81a7-4aeb187d2149';
const before=await api();
if(before.canonical_deployment.id!==expected)throw Error('Production changed: '+before.canonical_deployment.id);
const configHash=sha(JSON.stringify(before.deployment_configs));
const previous=JSON.parse(await fs.readFile('evidence/thank-you-2026-10-29/overlay.json','utf8'));
if(process.argv[2]==='build'){
 for(const [n,h]of Object.entries(previous.manifest))if(sha(await fs.readFile(baseline+'/'+n))!==h)throw Error('Baseline drift '+n);
 await fs.rm(candidate,{recursive:true,force:true});await fs.cp(baseline,candidate,{recursive:true});
 const tag=(await fs.readFile('dist-review/index.html','utf8')).match(/<script type="module" src="(\/_astro\/ServiceTitanScheduler[^\"]+\.js)"><\/script>/)?.[0];
 if(!tag)throw Error('Scheduler build entry missing');
 const additions=[];
 async function copy(n){if(additions.includes(n))return;const bytes=await fs.readFile('dist-review/'+n);if(previous.manifest[n]){if(sha(bytes)!==previous.manifest[n])throw Error('Asset collision '+n);return;}additions.push(n);await fs.mkdir(path.dirname(candidate+'/'+n),{recursive:true});await fs.writeFile(candidate+'/'+n,bytes);for(const m of bytes.toString().matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g))await copy(path.posix.normalize(path.posix.join(path.posix.dirname(n),m[1])));}
 await copy(tag.match(/src="([^"]+)"/)[1].slice(1));
 const changed=[];
 for(const n of Object.keys(previous.manifest).filter(n=>n.endsWith('.html'))){const html=await fs.readFile(candidate+'/'+n,'utf8');const matches=[...html.matchAll(/<script type="module" src="\/_astro\/ServiceTitanScheduler[^\"]+\.js"><\/script>/g)];if(!matches.length)continue;if(matches.length!==1)throw Error('Ambiguous scheduler '+n);const old=matches[0][0],updated=html.replace(old,()=>tag);if(updated.replace(tag,()=>old)!==html)throw Error('Unexpected HTML diff '+n);await fs.writeFile(candidate+'/'+n,updated);changed.push(n);}
 if(changed.length!==741)throw Error('Unexpected scheduler routes '+changed.length);
 const manifest={...previous.manifest};for(const n of [...changed,...additions])manifest[n]=sha(await fs.readFile(candidate+'/'+n));
 for(const [n,h]of Object.entries(previous.manifest))if(!changed.includes(n)&&sha(await fs.readFile(candidate+'/'+n))!==h)throw Error('Unrelated drift '+n);
 const result={at:new Date().toISOString(),expected,configHash,candidate,changed,additions,manifest,baselineManifest:previous.manifest,conversionDispatch:'unchanged/inactive',authorization:'Reu requested connection and verification of completed-request flow, provided test details; narrow continuity repair only'};
 await fs.writeFile(evidence+'/build.json',JSON.stringify(result,null,2));console.log(JSON.stringify({changed:changed.length,additions,unrelatedBytesPreserved:true}));
}else if(process.argv[2]==='publish'){
 const b=JSON.parse(await fs.readFile(evidence+'/build.json','utf8'));if(configHash!==b.configHash)throw Error('Hosting config drift');
 for(const [n,h]of Object.entries(b.manifest))if(sha(await fs.readFile(candidate+'/'+n))!==h)throw Error('Candidate drift '+n);
 const r=spawnSync('/Users/reubensmith/.npm-global/bin/wrangler',['pages','deploy',path.resolve(candidate),'--project-name=mgi-heating-and-air','--branch=main','--commit-dirty=true'],{cwd:'/tmp',encoding:'utf8',env:{...process.env,CLOUDFLARE_API_TOKEN:env.CLOUDFLARE_PAGES_TOKEN,CLOUDFLARE_ACCOUNT_ID:env.CLOUDFLARE_ACCOUNT_ID},maxBuffer:4e6});
 await fs.writeFile(evidence+'/deploy.log',((r.stdout||'')+(r.stderr||'')).replaceAll(env.CLOUDFLARE_PAGES_TOKEN,'[redacted]'));if(r.status!==0)throw Error('Deployment failed');
 const after=await api();const out={at:new Date().toISOString(),deployment:after.canonical_deployment.id,previous:expected,url:after.canonical_deployment.url,configUnchanged:sha(JSON.stringify(after.deployment_configs))===configHash,changed:741,additions:b.additions,conversionDispatch:'unchanged/inactive'};await fs.writeFile(evidence+'/deployment.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(!out.configUnchanged)throw Error('Hosting config changed');
}else throw Error('Use build or publish');
