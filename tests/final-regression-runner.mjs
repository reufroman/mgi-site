import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const suites=['contact-booking','answer-library','remaining-families','town-hubs','homeowner-journeys'];
const records=[];
for(const suite of suites){
 const file=`tests/${suite}.spec.mjs`,source=fs.readFileSync(file,'utf8');
 const output=`evidence/final-readiness/regressions/${suite}`;fs.mkdirSync(output,{recursive:true});
 const code=source.replaceAll("'../src/","'./src/").replace(/evidence\/(?:contact-booking|answers|remaining-families|town-hubs|homeowner-journeys)/g,output);
 try{const result=execFileSync(process.execPath,['--input-type=module','-'],{input:code,encoding:'utf8',env:{...process.env,MGI_TEST_URL:'http://127.0.0.1:4328'},maxBuffer:8*1024*1024});fs.writeFileSync(output+'/run.log',result);records.push({suite,sourceSHA256:createHash('sha256').update(source).digest('hex'),status:'pass',output});console.log(suite+': pass');}
 catch(e){fs.writeFileSync(output+'/run.log',String(e.stdout||'')+String(e.stderr||e));records.push({suite,status:'fail',output});console.log(suite+': fail');}
 fs.writeFileSync('evidence/final-readiness/regression-summary.json',JSON.stringify(records,null,2));
}
if(records.some(r=>r.status==='fail'))process.exit(1);
