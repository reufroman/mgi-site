import {test} from 'node:test';
import assert from 'node:assert/strict';
import {productionOrigin,canonicalUrl,robotsDirective,sitemapXml,pageSchema,assertReleaseLinkClosure,assertRenderDependencies,breadcrumbSchemaFromHtml} from '../src/data/seo-policy.mjs';
import {allRoutes,contentFor} from '../src/data/catalog.mjs';
import {pageMetadata} from '../src/data/page-metadata.mjs';
import site from '../src/data/site.json' with {type:'json'};
const origin='https://www.mgimechanicalservices.com';
test('production origin rejects review, malformed, and non-HTTPS configurations',()=>{
 for(const value of [undefined,'http://www.mgimechanicalservices.com','https://mgi.localnerds.co','https://mgi-review.invalid','https://localhost','https://127.0.0.1','https://foo.test','https://user:pass@example.com','https://example.com:443/path','https://example.com:8443','https://example.com/?town=X','https://example.com/#review','https://example.com/subpath/'])assert.throws(()=>productionOrigin(value),undefined,String(value));
 assert.equal(productionOrigin(origin+'/'),origin);
});
test('all canonical URLs, production directives, and sitemap entries agree',()=>{
 const xml=sitemapXml(allRoutes,origin,false);
 const locations=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 const expectedCount=allRoutes.filter(r=>!robotsDirective(r,false).startsWith('noindex')).length;
 assert.equal(locations.length,expectedCount);assert.equal(new Set(locations).size,expectedCount);
 for(const route of allRoutes){const canonical=canonicalUrl(route,origin);assert.equal(new URL(canonical).origin,origin);assert.equal(new URL(canonical).pathname,route.canonical_route);assert.equal(locations.includes(canonical),!robotsDirective(route,false).startsWith('noindex'));assert.equal(robotsDirective(route,true),'noindex, nofollow');}
 assert.ok(!sitemapXml(allRoutes,origin,true).includes('<loc>'));
 const subset=allRoutes.filter(r=>['ST-001','ST-018','ST-019'].includes(r.page_id));assert.deepEqual([...sitemapXml(subset,origin,false).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]),[origin+'/']);
});
test('canonical paths cannot escape their origin or preserve tracking parameters',()=>{
 for(const canonical_route of ['//other.com/','/path/?town=Greeley','/path/#main','/path','/a/../b/','/a//b/','/a\\b/'])assert.throws(()=>canonicalUrl({page_id:'fixture',canonical_route},origin));
});
test('partial approval cannot emit links to omitted governed pages',()=>{
 const home=allRoutes.find(r=>r.page_id==='ST-001'),service=allRoutes.find(r=>r.page_id==='ST-061');
 const html=`<a href="${service.canonical_route}?town=Windsor&amp;need=repair">AC repair</a><a href="https://external.example/">Source</a>`;
 assert.throws(()=>assertReleaseLinkClosure([[home.page_id,html]],allRoutes,[home]),/omitted route/);
 assert.doesNotThrow(()=>assertReleaseLinkClosure([[home.page_id,html]],allRoutes,[home,service]));
});
test('every schema graph identifies the actual page without unsupported review or date claims',()=>{
 for(const route of allRoutes){const metadata=pageMetadata(route,contentFor(route));const schema=pageSchema(route,metadata,origin,site);assert.equal(schema['@graph'][0].url,canonicalUrl(route,origin));assert.equal(schema['@graph'][0].name,metadata.title);assert.equal(schema['@graph'][0].description,metadata.description);const raw=JSON.stringify(schema);for(const field of ['aggregateRating','openingHours','areaServed','datePublished','dateModified','author'])assert.ok(!raw.includes('"'+field+'"'),route.page_id+' '+field);if(route.family==='Article')assert.ok(schema['@graph'].some(s=>['Article','BlogPosting'].includes(s['@type'])));}
 const home=allRoutes.find(r=>r.page_id==='ST-001');const schema=pageSchema(home,pageMetadata(home,contentFor(home)),origin,site);const business=schema['@graph'].find(s=>s['@type']==='HVACBusiness');assert.equal(business.address.streetAddress,'266 Basher Dr Unit 1');assert.equal(business.telephone,undefined);assert.ok(schema['@graph'].some(s=>s['@type']==='WebSite'));
});

test('render dependencies fail before a partial Home build can crash',()=>{
 assert.throws(()=>assertRenderDependencies(allRoutes.filter(r=>['ST-001','ST-004'].includes(r.page_id))),/Home rendering needs/);
 assert.doesNotThrow(()=>assertRenderDependencies(allRoutes));
});
test('breadcrumb markup follows the actual visible trail and escapes HTML safely',()=>{
 const route={page_id:'fixture',canonical_route:'/blog/topic/'};
 const html='<nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/blog/">Homeowner guides</a><span aria-current="page">Heat &amp; cooling</span></nav>';
 const schema=breadcrumbSchemaFromHtml(html,route,origin);
 assert.deepEqual(schema.itemListElement.map(i=>[i.position,i.name,i.item]),[[1,'Home',origin+'/'],[2,'Homeowner guides',origin+'/blog/'],[3,'Heat & cooling',origin+'/blog/topic/']]);
 assert.equal(breadcrumbSchemaFromHtml('<main>No trail</main>',route,origin),null);
});
