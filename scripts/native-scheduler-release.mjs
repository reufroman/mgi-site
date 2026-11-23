// Native loader overlay over the exact accepted capture artifact.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {api,env,sha} from '../../Website-Astro-Tracking-Release-2026-10-27/scripts/cf.mjs';
const expected='c18fd92c-0b95-455b-85ab-95284f629c91';
const evidence='evidence/native-completion-2026-10-30',candidate='.local-preview/native-scheduler-candidate';
const release='../Website-Astro-Tracking-Release-2026-10-27';
const baseline=JSON.parse(await fs.readFile(release+'/evidence/capture-2026-10-30/build.json','utf8'));
const state=await api(),configHash=sha(JSON.stringify(state.deployment_configs));
if(state.canonical_deployment.id!==expected)throw Error('Production drift: '+state.canonical_deployment.id);
async function inventory(root,prefix=''){let out=[];for(const e of await fs.readdir(root,{withFileTypes:true})){const n=prefix+e.name;if(e.isDirectory())out.push(...await inventory(root+'/'+e.name,n+'/'));else if(e.isFile())out.push(n);else throw Error('Unsupported file');}return out.sort();}
async function verify(root,manifest){if(JSON.stringify(await inventory(root))!==JSON.stringify(Object.keys(manifest).sort()))throw Error('Inventory drift');for(const[n,h]of Object.entries(manifest))if(sha(await fs.readFile(root+'/'+n))!==h)throw Error('Hash drift: '+n);}
if(process.argv[2]==='build'){
 await verify(release+'/'+baseline.candidate,baseline.manifest);
 await fs.rm(candidate,{recursive:true,force:true});await fs.cp(release+'/'+baseline.candidate,candidate,{recursive:true});
 const html=await fs.readFile('dist-review/index.html','utf8');
 const tag=html.match(/<script type="module" src="(\/_astro\/ServiceTitanScheduler[^\"]+\.js)"><\/script>/)?.[0];if(!tag)throw Error('No native entry');
 const additions=[];const manifest={...baseline.manifest};
 async function copy(n){if(additions.includes(n))return;const bytes=await fs.readFile('dist-review/'+n);if(manifest[n]){if(sha(bytes)!==manifest[n])throw Error('Asset collision');return;}additions.push(n);await fs.mkdir(path.dirname(candidate+'/'+n),{recursive:true});await fs.writeFile(candidate+'/'+n,bytes);manifest[n]=sha(bytes);for(const m of bytes.toString().matchAll(/(?:from|import)\s*["'](\.[^"']+\.js)["']/g))await copy(path.posix.normalize(path.posix.join(path.posix.dirname(n),m[1])));}
 await copy(tag.match(/src="([^"]+)"/)[1].slice(1));const changed=[];
 for(const n of Object.keys(baseline.manifest).filter(n=>n.endsWith('.html'))){const s=await fs.readFile(candidate+'/'+n,'utf8');const tags=[...s.matchAll(/<script type="module" src="\/_astro\/ServiceTitanScheduler[^\"]+\.js"><\/script>/g)];if(!tags.length)continue;if(tags.length!==1)throw Error('Ambiguous entry '+n);const next=s.replace(tags[0][0],()=>tag);if(next.replace(tag,()=>tags[0][0])!==s)throw Error('Unexpected diff');await fs.writeFile(candidate+'/'+n,next);manifest[n]=sha(next);changed.push(n);}
 if(changed.length!==741)throw Error('Unexpected route count '+changed.length);
 for(const[n,h]of Object.entries(baseline.manifest))if(!changed.includes(n)&&sha(await fs.readFile(candidate+'/'+n))!==h)throw Error('Unrelated drift');
 await verify(candidate,manifest);
 await fs.writeFile(evidence+'/overlay.json',JSON.stringify({at:new Date().toISOString(),expected,configHash,candidate,changed,additions,manifest,baselineManifest:baseline.manifest,conversionDispatch:'inactive',authorization:'Reu requested completion of native booking conversion integration; no campaign, goal, budget, or contact collection change'},null,2));
 console.log(JSON.stringify({changed:changed.length,additions,files:Object.keys(manifest).length,unrelatedBytesPreserved:true}));
}else if(process.argv[2]==='publish'){
 const b=JSON.parse(await fs.readFile(evidence+'/overlay.json','utf8'));if(configHash!==b.configHash)throw Error('Config drift');await verify(candidate,b.manifest);
 const r=spawnSync('/Users/reubensmith/.npm-global/bin/wrangler',['pages','deploy',path.resolve(candidate),'--project-name=mgi-heating-and-air','--branch=main','--commit-dirty=true'],{cwd:'/tmp',encoding:'utf8',env:{...process.env,CLOUDFLARE_API_TOKEN:env.CLOUDFLARE_PAGES_TOKEN,CLOUDFLARE_ACCOUNT_ID:env.CLOUDFLARE_ACCOUNT_ID},maxBuffer:4e6});
 await fs.writeFile(evidence+'/deploy.log',((r.stdout||'')+(r.stderr||'')).replaceAll(env.CLOUDFLARE_PAGES_TOKEN,'[redacted]'));if(r.status!==0)throw Error('Publish failed');
 const after=await api();const out={at:new Date().toISOString(),previous:expected,deployment:after.canonical_deployment.id,url:after.canonical_deployment.url,configUnchanged:sha(JSON.stringify(after.deployment_configs))===configHash,conversionDispatch:'inactive'};await fs.writeFile(evidence+'/deployment.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(!out.configUnchanged)throw Error('Config changed');
}else throw Error('Use build or publish');
