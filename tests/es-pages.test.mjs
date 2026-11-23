// Spanish page set: structure, language, hreflang pairing and copy guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import esPages from '../src/data/es-pages.json' with {type:'json'};

const out = `dist-${process.env.MGI_BUILD_MODE || 'review'}`;
const file = (route) => `${out}${route}index.html`;
const read = (route) => fs.readFileSync(file(route), 'utf8');

test('every Spanish page builds with lang="es", es_US locale and a self canonical', () => {
  assert.equal(esPages.length, 10);
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
    assert.doesNotMatch(html, /4115|4155|\b0% APR|\bAPR\b/, page.esRoute);
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
