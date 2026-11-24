// Spanish page set: structure, language, hreflang pairing and copy guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {esPages,esFacts} from '../src/data/es.mjs';
import {lenders} from '../src/data/lenders.mjs';
import {parityDrift} from '../scripts/es-parity.mjs';

const out = `dist-${process.env.MGI_BUILD_MODE || 'review'}`;
const file = (route) => `${out}${route}index.html`;
const read = (route) => fs.readFileSync(file(route), 'utf8');

test('every Spanish page builds with lang="es", es_US locale and a self canonical', () => {
  assert.equal(esPages.length, fs.readdirSync('content/es/side-by-side').filter((f) => /^\d\d_.*\.md$/.test(f)).length);
  for (const page of esPages) {
    const html = read(page.esRoute);
    assert.match(html, /<html lang="es"[ >]/, page.esRoute);
    assert.match(html, /og:locale" content="es_US"/, page.esRoute);
    assert.match(html, new RegExp(`rel="canonical" href="[^"]*${page.esRoute.replace(/\//g, '\\/')}"`), page.esRoute);
    assert.match(html, /"inLanguage":"es"/, page.esRoute);
  }
});

test('Spanish and English pages point at each other with hreflang', () => {
  for (const page of esPages) {
    const es = read(page.esRoute), en = read(page.enRoute);
    assert.match(es, new RegExp(`hreflang="en" href="[^"]*${page.enRoute.replace(/\//g, '\\/')}"`), page.esRoute);
    assert.match(es, /hreflang="x-default"/, page.esRoute);
    assert.match(en, new RegExp(`hreflang="es" href="[^"]*${page.esRoute.replace(/\//g, '\\/')}"`), page.enRoute);
    assert.match(en, new RegExp(`class="lang-switch[^"]*" href="${page.esRoute}"`), page.enRoute);
    assert.match(es, new RegExp(`class="lang-switch[^"]*" href="${page.enRoute}"`), page.esRoute);
  }
});

test('Spanish pages stay out of search until the Spanish release is approved', () => {
  for (const page of esPages) assert.match(read(page.esRoute), /name="robots" content="noindex, nofollow"/, page.esRoute);
});

test('approved vocabulary: calentón for the furnace, no "horno" or "puesta a punto"', () => {
  const all = esPages.map((p) => read(p.esRoute)).join('\n');
  assert.doesNotMatch(all, /\bhorno\b/i);
  assert.doesNotMatch(all, /puesta a punto/i);
  assert.match(read('/es/servicios/reparacion-de-calefaccion/'), /<h1[^>]*>Reparación de calentón<\/h1>/);
  assert.match(read('/es/'), /Más vida en casa, menos preocupaciones\./);
});

test('no working notes, dealer financing numbers or English placeholders reach Spanish pages', () => {
  for (const page of esPages) {
    const html = read(page.esRoute);
    assert.doesNotMatch(html, /INTERNAL|UNREVIEWED|PLACEHOLDER|\bNone\b/, page.esRoute);
    assert.doesNotMatch(html, /4115|4155/, page.esRoute);
    // Only the Specials page states a rate, because only the English Specials page does.
    if (page.esRoute !== '/es/ofertas/') assert.doesNotMatch(html, /\b0% APR|\bAPR\b/, page.esRoute);
  }
});

test('Spanish Specials states the same financing plan and disclosure as English Specials', () => {
  const en = read('/specials/'), es = read('/es/ofertas/');
  assert.match(en, /0% APR for 72 months/);
  assert.match(es, /0% APR por 72 meses/);
  assert.match(es, new RegExp(`plan ${esFacts.financePlan} de Wells Fargo`));
  assert.match(es, /Sujeto a aprobación de crédito\. Se requieren pagos mensuales iguales\./);
  assert.match(es, new RegExp(`Hasta \\${esFacts.rebateTotal} en reembolsos`));
});

test('Spanish copy has no dashes as punctuation and uses the approved product words', () => {
  for (const page of esPages) {
    const main = read(page.esRoute).match(/<main[^>]*>([\s\S]*)<\/main>/)[1].replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(main, /[\u2013\u2014]/, `${page.esRoute} has an en or em dash`);
    assert.doesNotMatch(main, /\bductless\b/i, page.esRoute);
  }
});

test('internal links on Spanish pages lead to pages that exist', () => {
  for (const page of esPages) {
    const main = read(page.esRoute).match(/<main[^>]*>([\s\S]*)<\/main>/)[1];
    for (const [, href] of main.matchAll(/href="(\/[^"#?]*)/g)) {
      assert.ok(fs.existsSync(`${out}${href}${href.endsWith('/') ? 'index.html' : ''}`), `${page.esRoute} links to missing ${href}`);
    }
  }
});

test('phone number is exact and Spanish office-hours note is present', () => {
  for (const page of esPages) {
    const html = read(page.esRoute);
    assert.match(html, /\(970\) 287-1673/, page.esRoute);
    assert.match(html, /href="tel:\+19702871673"/, page.esRoute);
    assert.match(html, /Atención en español en horario de oficina\./, page.esRoute);
  }
});

test('Spanish pages load no Tag Manager, call-number swap or scheduler script', () => {
  for (const page of esPages) {
    const html = read(page.esRoute);
    assert.doesNotMatch(html, /googletagmanager|data-google-call-measurement|STWidgetManager|webscheduler/, page.esRoute);
  }
});

test('offers and VIP prices match the live English Specials page', () => {
  const all = esPages.map((p) => read(p.esRoute)).join('\n');
  assert.doesNotMatch(all, /No se combina|no se combinan|\$128|\$65\b/);
  assert.match(read('/es/servicios/mantenimiento-hvac/'), /Se puede combinar con la oferta de \$150/);
  assert.match(read('/es/membresia-vip/'), /VIP para minisplits: \$12 al mes/);
});

test('every paired English page is unchanged since the Spanish page was last synced', () => {
  const drift = parityDrift(out);
  assert.deepEqual(drift.map((d) => `${d.enRoute} changed: update ${d.esRoute}, then npm run es:parity -- --record`), []);
});

test('shared facts come from the English data and leave no unfilled tokens', () => {
  const all = esPages.map((p) => read(p.esRoute)).join('\n');
  assert.doesNotMatch(all, /\{\{/);
  assert.match(read('/es/servicios/mantenimiento-hvac/'), new RegExp(`por \\${esFacts.tuneUp}\\.`));
  assert.match(read('/es/servicios/mantenimiento-hvac/'), new RegExp(esFacts.offerEnd));
});

test('Spanish financing lists the same lender links as the English financing page', () => {
  const en = read('/financing/').replace(/&amp;/g, '&');
  const es = read('/es/financiamiento/').replace(/&amp;/g, '&');
  for (const lender of lenders) {
    assert.ok(en.includes(lender.apply), `${lender.name} apply link missing from English /financing/`);
    assert.ok(es.includes(lender.apply), `${lender.name} apply link missing from Spanish /es/financiamiento/`);
  }
  const englishApplyLinks = [...en.matchAll(/href="(https:\/\/[^"]*(?:mysynchrony|init-app|apply\.svcfin)[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(englishApplyLinks)].sort(), lenders.map((l) => l.apply).sort());
});
