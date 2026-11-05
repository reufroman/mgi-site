import fs from 'node:fs/promises';
import {publicationInputs} from './publication-inputs.mjs';
import {assertPublication} from '../src/data/publication.mjs';
// Local authority record: Jesse approval was reported by Reu on October 12.
// This records permission for the selected source, not independent assurance.
const expected=await publicationInputs('https://mgiheatingandair.com');
const unresolvedAssurances=[
 ['request-delivery','pending','Jesse, MGI office, and Local Nerds','One labeled test reached Calls > Bookings at 12:29 PM on October 12, per Handoffs/2026-10-12_MGI-Scheduler-End-to-End-Test.md. Correct the Campaign Id lookup error; confirm office alerts, email delivery, availability, and appointment confirmation ownership; dispose of the pending no-dispatch test.'],
 ['phone-routing','not-tested','MGI office','Confirm the public phone reaches the intended team and check any call attribution separately.'],
 ['technical-review','unverified','MGI qualified service reviewer','Review exact equipment and safety answers and source-dependent recommendations.'],
 ['legal-data-practices','pending','MGI and legal reviewer','Document provider data practices, retention, consent, applicable rights handling, and adopted website policies. Public information pages describe features only.'],
 ['service-coverage-offers','unverified','Jesse and MGI service management','Confirm address-level coverage, fees, prices, hours, membership, financing, and operating promises.'],
 ['proof-permission','unverified','Jesse','Confirm review quotation and credential permissions and source context separately from reported whole-site permission.'],
 ['program-currency','unverified','MGI program owner','Confirm current rebate and financing requirements before using them for a customer project.'],
 ['image-placement-review','unverified','Jesse and Local Nerds','Confirm final crops and placements; retain generated-image origin disclosure.'],
 ['migration-domain','pending','Local Nerds and MGI domain owner','New-domain DNS/TLS has been verified by the release lead. Confirm old-domain access and activate and verify the historical redirects when authorized.'],
 ['measurement','pending','Local Nerds and MGI account owner','Resolve analytics, conversion tracking, call attribution, and account access. Website tracking remains disabled.']
].map(([id,status,owner,nextAction])=>({id,status,owner,nextAction}));
const record={approvedBy:'Jessica Hoeye',reportedBy:'Reu',approvedAt:'2026-10-12',evidenceReference:'Reu human instruction, October 12, 2026: Jesse approved the site; make scheduler work, remove draft banner/noindex, and finish backfill. See current Website-Change-Prompt-Hub and public-release handoff.',canonicalOrigin:expected.canonicalOrigin,renderSourceHash:expected.renderSourceHash,pages:Object.fromEntries(Object.entries(expected.pageHashes).map(([id,contentHash])=>[id,{contentHash}])),images:Object.fromEntries(Object.entries(expected.imageHashes).map(([id,sourceHash])=>[id,{sourceHash}])),scheduler:{requestProvider:'servicetitan-webscheduler',widgetId:expected.site.schedulerWidgetId,websiteUrl:expected.site.schedulerWebsiteUrl,scriptUrl:'https://static.servicetitan.com/webscheduler/shim.js'},unresolvedAssurances};
assertPublication(record,expected);
await fs.writeFile('src/data/publication.json',JSON.stringify(record,null,2)+'\n');
console.log(`Bound publication permission: ${Object.keys(record.pages).length} routes, ${Object.keys(record.images).length} source images; assurances remain unverified.`);
