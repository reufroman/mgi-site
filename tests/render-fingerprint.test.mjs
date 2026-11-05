import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {renderFingerprint,renderInputRoots,hashRenderManifest,assertRenderApproval} from '../src/data/render-fingerprint.mjs';

function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'mgi-render-review-'));
 const write=(path,body)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),body);};
 try{
  for(const input of renderInputRoots){
   if(['src','public'].includes(input))mkdirSync(join(root,input),{recursive:true});
   else write(input,'initial');
  }
  write('src/components/Example.astro','<h1>Approved hardcoded copy</h1>');
  write('src/layouts/Base.astro','<slot/>');write('src/styles/site.css','h1{color:teal}');
  write('src/data/editorial.json','{"title":"unchanged page content"}');
  write('src/data/approvals.json','{}');write('public/photo.webp','approved picture bytes');
  run(root,write);
 }finally{rmSync(root,{recursive:true,force:true});}
}

test('hardcoded component changes invalidate approval even when editorial content is unchanged',()=>fixture((root,write)=>{
 const approved=renderFingerprint(root).hash;
 assert.doesNotThrow(()=>assertRenderApproval({renderSourceHash:approved},approved,'ST-001'));
 write('src/components/Example.astro','<h1>New unreviewed operating promise</h1>');
 assert.throws(()=>assertRenderApproval({renderSourceHash:approved},renderFingerprint(root).hash,'ST-001'),/Rendered source changed/);
}));
test('layout, styling, shipped assets, and build configuration are approval inputs',()=>{
 for(const file of ['src/layouts/Base.astro','src/styles/site.css','public/photo.webp','astro.config.mjs','package-lock.json'])fixture((root,write)=>{
  const before=renderFingerprint(root).hash;write(file,'changed');assert.notEqual(renderFingerprint(root).hash,before,file);
 });
});
test('approval records, generated output, and evidence do not create circular or transient fingerprints',()=>fixture((root,write)=>{
 const before=renderFingerprint(root).hash;
 write('src/data/approvals.json',JSON.stringify({renderSourceHash:before}));
 write('src/data/publication.json',JSON.stringify({renderSourceHash:before}));
 write('dist-review/index.html','rendered output');write('evidence/report.json','review evidence');
 assert.equal(renderFingerprint(root).hash,before);
}));
test('manifest hash is stable across enumeration order and rejects duplicate paths',()=>{
 const files=[{path:'b',bytes:1,sha256:'b'},{path:'a',bytes:1,sha256:'a'}];
 assert.equal(hashRenderManifest(files),hashRenderManifest([...files].reverse()));
 assert.throws(()=>hashRenderManifest([files[0],files[0]]),/Duplicate/);
});
test('missing exact render approval fails closed',()=>{
 for(const approval of [undefined,{}, {renderSourceHash:''},{renderSourceHash:'stale'}])assert.throws(()=>assertRenderApproval(approval,'current','ST-001'),/approval missing/);
});
test('adding or deleting a rendering input changes the fingerprint; symlinks fail closed',()=>fixture((root,write)=>{
 const before=renderFingerprint(root).hash;write('src/components/Added.astro','new');
 assert.notEqual(renderFingerprint(root).hash,before);rmSync(join(root,'src/components/Added.astro'));
 assert.equal(renderFingerprint(root).hash,before);
 symlinkSync(join(root,'package.json'),join(root,'public/linked.json'));
 assert.throws(()=>renderFingerprint(root),/cannot be a symlink/);
}));
