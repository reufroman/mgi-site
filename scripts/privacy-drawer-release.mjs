import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {transform} from 'esbuild';
import {api,sha} from './privacy-drawer-api.mjs';
const evidence='evidence/privacy-drawer-2026-11-02',candidate='.local-preview/privacy-drawer-candidate';
const baseline=JSON.parse(await fs.readFile('evidence/native-completion-2026-10-30/activation-overlay.json','utf8'));
const expected='d9d897b1-d6d7-48ec-8cae-aca265d904cc';
const oldEntries=['_astro/mgi-measurement-3376c45e1678d3c8.js','_astro/mgi-measurement-8fe1f31bb0370bb3.js'];
async function inventory(root){const out=[];async function walk(dir){for(const f of await fs.readdir(root+'/'+dir,{withFileTypes:true})){const n=path.posix.join(dir,f.name);if(f.isDirectory())await walk(n);else if(f.isFile())out.push(n);else throw Error('Unsupported file');}}await walk('');return out.sort();}
async function verify(root,manifest){if(JSON.stringify(await inventory(root))!==JSON.stringify(Object.keys(manifest).sort()))throw Error('Inventory drift');for(const[n,h]of Object.entries(manifest))if(sha(await fs.readFile(root+'/'+n))!==h)throw Error('Hash drift '+n);}
const state=await api();if(state.canonical_deployment.id!==expected)throw Error('Production drift');
const configHash=sha(JSON.stringify(state.deployment_configs));
if(process.argv[2]==='build'){
 await verify(baseline.candidate,baseline.manifest);
 await fs.rm(candidate,{recursive:true,force:true});await fs.cp(baseline.candidate,candidate,{recursive:true,errorOnExist:true,force:false});
 const source=await fs.readFile('src/components/LandingCallMeasurement.astro','utf8');
 const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
 const cssName=`_astro/privacy-drawer-${sha(css).slice(0,16)}.css`;
 await fs.writeFile(candidate+'/'+cssName,css);
 const variants=[];
 for(const [idx,oldEntry] of oldEntries.entries()){
  const old=await fs.readFile(baseline.candidate+'/'+oldEntry,'utf8');
  const boundary=old.search(/var [a-z]=document\.querySelector\(`/);
  if(boundary<0)throw Error('Missing UI boundary');
  const prefix=old.slice(0,boundary);
  const ui=source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^\s*import .*;\s*$/gm,'').replaceAll('installCallMeasurement(', idx===0?'f(':'i(').replaceAll('installTagManager(', idx===0?'m(':'o(');
  const js=prefix+'\n'+(await transform(ui,{loader:'ts',target:'es2022'})).code;
  const jsName=`_astro/privacy-drawer-${sha(js).slice(0,16)}.js`;
  await fs.writeFile(candidate+'/'+jsName,js);
  variants.push({oldEntry,jsName,hash:sha(js),prefixHash:sha(prefix)});
 }
 const inside=source.slice(source.indexOf('<div class="measurement-inner">'),source.indexOf('</aside>'));
 if(!inside.includes('data-call-measurement-grant'))throw Error('Missing markup');
 const changed=[],manifest={...baseline.manifest,[cssName]:sha(css)}; for(const v of variants)manifest[v.jsName]=v.hash;
 for(const n of Object.keys(baseline.manifest).filter(n=>n.endsWith('.html'))){
  const s=await fs.readFile(candidate+'/'+n,'utf8');const matches=[...s.matchAll(/<aside[^>]*data-google-call-measurement[\s\S]*?<\/aside>/g)];if(!matches.length)continue;if(matches.length!==1)throw Error('Ambiguous panel '+n);
  const oldAside=matches[0][0],opening=oldAside.slice(0,oldAside.indexOf('>')+1),choices=opening.includes('data-choices-only="true"');
  const newOpening=opening.replace(/ style="[^"]*"/,'').replace('<aside',`<aside class="measurement-panel${choices?'':' measurement-drawer'}"${choices?'':' hidden'}`);
  const newAside=newOpening+inside+'</aside>';
  const variant=variants.find(v=>s.includes('/'+v.oldEntry));if(!variant)throw Error('Unexpected module '+n);const {oldEntry,jsName}=variant;
  const next=s.replace(oldAside,()=>newAside).replace('/'+oldEntry,'/'+jsName).replace('</head>',`<link rel="stylesheet" href="/${cssName}"></head>`);
  const reversed=next.replace(newAside,()=>oldAside).replace('/'+jsName,'/'+oldEntry).replace(`<link rel="stylesheet" href="/${cssName}">`,'');if(reversed!==s)throw Error('Unrelated HTML change');
  await fs.writeFile(candidate+'/'+n,next);manifest[n]=sha(next);changed.push(n);
 }
 if(changed.length<700)throw Error('Unexpected route count');await verify(candidate,manifest);
 const out={at:new Date().toISOString(),expected,configHash,candidate,baseline:baseline.candidate,changed,additions:[...variants.map(v=>v.jsName),cssName],manifest,variants,authorization:'Reu: Yep, deploy the privacy drawer update to the live site.',policy:'Live measurement-policy and provider prefix preserved byte-for-byte; UI suffix only replaced.'};
 await fs.writeFile(evidence+'/release-overlay.json',JSON.stringify(out,null,2));console.log(JSON.stringify({changed:changed.length,additions:out.additions,files:Object.keys(manifest).length}));
}else if(process.argv[2]==='publish'){
 const b=JSON.parse(await fs.readFile(evidence+'/release-overlay.json','utf8'));if(configHash!==b.configHash)throw Error('Config drift');await verify(candidate,b.manifest);
 const r=spawnSync('/Users/reubensmith/.npm-global/bin/wrangler',['pages','deploy',path.resolve(candidate),'--project-name=mgi-heating-and-air','--branch=main','--commit-dirty=true','--commit-message=Privacy drawer UI only'],{cwd:'/tmp',env:{...process.env,CLOUDFLARE_ACCOUNT_ID:'363702344e039dfa71c7fbf1dd130d84'},encoding:'utf8',maxBuffer:4e6});
 await fs.writeFile(evidence+'/deployment.log',(r.stdout||'')+(r.stderr||''));if(r.status!==0)throw Error('Publish failed, see deployment.log');
 const after=await api();const out={at:new Date().toISOString(),previous:expected,deployment:after.canonical_deployment.id,url:after.canonical_deployment.url,configUnchanged:sha(JSON.stringify(after.deployment_configs))===configHash};await fs.writeFile(evidence+'/deployment.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(!out.configUnchanged)throw Error('Config drift');
}else throw Error('Use build or publish');
