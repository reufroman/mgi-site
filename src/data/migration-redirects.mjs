// Live discovery: evidence/technical-seo-2026-10-09/live-migration.csv.
// These reviewed mappings do not grant public release approval.
export const migrationRedirects = Object.freeze([
 {from:'/contact-us/',to:'/contact/',reason:'Same contact purpose. Customer intake remains disabled in review.'},
 {from:'/terms-and-conditions/',to:'/terms/',reason:'Same legal-policy purpose. Current draft legal approval remains required.'},
 {from:'/blog/category/uncategorized/',to:'/blog/',reason:'Existing article hub retains all four current-live topics, including Manual J and heat pumps.'},
 {from:'/about/rebates/',to:'/rebates/',reason:'Preserves the existing live redirect and rebate-planning purpose.'},
 {from:'/services/heating/',to:'/services/',reason:'Broader equipment hub keeps both furnace and heat-pump paths visible. It is broader than the old heating page, without narrowing to furnaces or restoring unsupported promises.'},
]);
export const blockedMigrationPaths=Object.freeze([{from:'/about/faqs/',reason:'Old business-policy FAQ has no equivalent in the equipment-answer library. Preserve separately until business-policy facts and a relevant destination are approved.'}]);
export function migrationRules(routes, mappings=migrationRedirects){
 const emitted=new Set(routes.map(r=>r.canonical_route));const seen=new Set();const canonical=/^\/(?:[a-z0-9-]+\/)*$/;
 for(const m of mappings){
  if(!canonical.test(m.from)||!canonical.test(m.to)||m.from==='/'||m.from===m.to)throw Error('Invalid migration path: '+m.from);
  if(seen.has(m.from)||emitted.has(m.from))throw Error('Duplicate or existing migration source: '+m.from);
  seen.add(m.from);
  if(!emitted.has(m.to))throw Error('Migration target is not emitted: '+m.to);
 }
 return mappings.flatMap(m=>[`${m.from.slice(0,-1)}  ${m.to}  301`,`${m.from}  ${m.to}  301`]).join('\n')+'\n';
}
