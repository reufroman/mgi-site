import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,lstatSync} from 'node:fs';
import {dirname,resolve,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Review approvals must cover hardcoded copy, presentation, and shipped assets,
// as well as contentFor(). Shared changes conservatively reopen every page.
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const renderInputRoots=Object.freeze([
 'src','public','astro.config.mjs','package.json','package-lock.json',
 'scripts/validate-content.mjs','scripts/finalize-build.mjs','scripts/publication-inputs.mjs'
]);
const excluded=new Set(['src/data/approvals.json','src/data/publication.json']);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function hashRenderManifest(entries){
 const ordered=entries.map(entry=>({path:entry.path,bytes:entry.bytes,sha256:entry.sha256}))
  .sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(new Set(ordered.map(entry=>entry.path)).size!==ordered.length)throw Error('Duplicate render input');
 return sha256(JSON.stringify({version:1,files:ordered}));
}

export function renderFingerprint(root=projectRoot){
 const entries=[];
 const visit=file=>{
  const name=relative(root,file).split(sep).join('/');
  if(excluded.has(name))return;
  const stat=lstatSync(file);
  // Never hash mutable targets outside the declared source tree.
  if(stat.isSymbolicLink())throw Error(`Render input cannot be a symlink: ${name}`);
  if(stat.isDirectory())for(const child of readdirSync(file))visit(resolve(file,child));
  else if(stat.isFile()){
   const bytes=readFileSync(file);
   entries.push({path:name,bytes:bytes.length,sha256:sha256(bytes)});
  }else throw Error(`Unsupported render input: ${name}`);
 };
 for(const input of renderInputRoots)visit(resolve(root,input));
 return {hash:hashRenderManifest(entries),files:entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)};
}

export function assertRenderApproval(approval,currentHash,pageId){
 if(!approval?.renderSourceHash||approval.renderSourceHash!==currentHash){
  throw Error(`Rendered source changed or exact source approval missing: ${pageId}`);
 }
}
