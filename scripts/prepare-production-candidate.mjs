// Prepare a local, non-public candidate without inventing approval evidence.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {productionOrigin} from '../src/data/seo-policy.mjs';
import {renderFingerprint} from '../src/data/render-fingerprint.mjs';
import {productionIntegrationErrors} from '../src/data/production-integrations.mjs';
import {allRoutes,contentFor} from '../src/data/catalog.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const origin=productionOrigin(process.env.MGI_SITE_URL||'https://mgiheatingandair.com');
const output=path.resolve(root,process.env.MGI_CANDIDATE_DIR||'evidence/production-candidate-2026-10-12');
const reserved=['artifact','readiness.json','artifact-manifest.json','render-source-manifest.json','Page-Approval-Inputs.csv','Image-Approval-Inputs.json','candidate-build.log','release-gate.log'];
if(reserved.some(name=>fs.existsSync(path.join(output,name))))throw Error('Candidate output already contains frozen evidence; use a new MGI_CANDIDATE_DIR');
if(!process.argv.includes('--build'))throw Error('Candidate preparation requires --build to bind output to the current source');
fs.mkdirSync(output,{recursive:true});
const read=name=>JSON.parse(fs.readFileSync(`src/data/${name}.json`,'utf8'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const save=(name,value)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const csv=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const registryBefore=sha(fs.readFileSync('src/data/approvals.json'));
const sourceBefore=renderFingerprint();
if(process.argv.includes('--build')){
 const build=spawnSync('npm',['run','build'],{encoding:'utf8',env:{...process.env,MGI_BUILD_MODE:'review',MGI_SITE_URL:origin}});
 fs.writeFileSync(path.join(output,'candidate-build.log'),(build.stdout||'')+(build.stderr||''));
 if(build.status!==0)throw Error('Candidate build failed; inspect candidate-build.log');
}
const fingerprint=renderFingerprint();
if(sourceBefore.hash!==fingerprint.hash)throw Error('Source changed during candidate build; prepare again in a new directory');
save('render-source-manifest.json',fingerprint);
const site=read('site'),approvals=read('approvals'),images=read('image-manifest');
const rows=allRoutes.map(route=>({page_id:route.page_id,path:route.canonical_route,family:route.family,
 contentHash:sha(JSON.stringify(contentFor(route))),renderSourceHash:fingerprint.hash,
 selected:approvals.pages[route.page_id]?.selected===true,sourceAnswer:route.source_answer_id||'',
 approvalRecorded:approvals.pages[route.page_id]?.approvedBy==='Jessica Hoeye'}));
const columns=Object.keys(rows[0]);
fs.writeFileSync(path.join(output,'Page-Approval-Inputs.csv'),[columns.join(','),...rows.map(row=>columns.map(key=>csv(row[key])).join(','))].join('\n')+'\n');
save('Image-Approval-Inputs.json',images.map(image=>({picture_id:image.picture_id,sourceHash:sha(fs.readFileSync(image.source_file)),approvalRecorded:approvals.images[image.picture_id]?.approvedBy==='Jessica Hoeye'})));
const blockers=productionIntegrationErrors(site,approvals.integrations);
if(!site.phoneApproval)blockers.push('Approved displayed phone and routing confirmation missing');
if(approvals.integrations.domainVerified!==true)blockers.push('Client domain, hosting attachment, DNS and HTTPS verification missing');
if(approvals.integrations.canonicalOrigin!==origin||approvals.integrations.seoMigrationReviewed!==true)blockers.push('Exact production-origin and migration evidence missing');
if(!rows.some(row=>row.selected))blockers.push('Public route selection and exact supporting approvals not yet recorded');
const release=spawnSync(process.execPath,['scripts/validate-content.mjs'],{encoding:'utf8',env:{...process.env,MGI_BUILD_MODE:'release',MGI_SITE_URL:origin}});
fs.writeFileSync(path.join(output,'release-gate.log'),(release.stdout||'')+(release.stderr||''));
const artifact=path.join(output,'artifact');
const buildManifest=JSON.parse(fs.readFileSync('evidence/build-manifest.json','utf8'));
if(buildManifest.mode!=='review'||buildManifest.counts.total!==allRoutes.length)throw Error('Candidate must come from the complete protected review build');
const headers=fs.readFileSync('dist-review/_headers','utf8');
const robots=fs.readFileSync('dist-review/robots.txt','utf8');
const sitemap=fs.readFileSync('dist-review/sitemap.xml','utf8');
if(!headers.includes('X-Robots-Tag: noindex, nofollow')||!robots.includes('Disallow: /')||sitemap.includes('<loc>'))throw Error('Candidate protection missing');
for(const route of allRoutes){
 const html=fs.readFileSync(path.join('dist-review',route.canonical_route.slice(1),'index.html'),'utf8');
 if(!html.includes(`href="${new URL(route.canonical_route,origin).href}"`)||!html.includes('content="noindex, nofollow"'))throw Error('Wrong candidate canonical or protection '+route.page_id);
}
fs.cpSync('dist-review',artifact,{recursive:true});
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else{const bytes=fs.readFileSync(file);files.push({path:path.relative(artifact,file).split(path.sep).join('/'),bytes:bytes.length,sha256:sha(bytes)});}}}
walk(artifact);files.sort((a,b)=>a.path.localeCompare(b.path));save('artifact-manifest.json',{origin,files,manifestHash:sha(JSON.stringify(files))});
if(registryBefore!==sha(fs.readFileSync('src/data/approvals.json')))throw Error('Approval registry changed during preparation');
if(fingerprint.hash!==renderFingerprint().hash)throw Error('Source changed during candidate freeze; artifact is not ready');
const report={preparedAt:new Date().toISOString(),origin,status:release.status===0?'RELEASE_GATES_PASS_SEPARATE_PUBLIC_BUILD_REQUIRED':'CANDIDATE_PREPARED_PUBLIC_RELEASE_BLOCKED',
 artifact:'artifact/',routes:rows.length,artifactFiles:files.length,renderSourceHash:fingerprint.hash,
 approvalRegistryUnchanged:true,sourceStableDuringBuild:true,publicDeployable:false,indexing:'noindex, robots disallow, empty sitemap',
 formInspectionOrTests:false,releaseGateExit:release.status,blockers,
 limitation:'This is a protected preview with production-origin canonicals, not the approved dist-release artifact. No DNS, hosting, or provider setting was changed.'};
save('readiness.json',report);console.log(JSON.stringify({...report,blockers:report.blockers.length},null,2));
