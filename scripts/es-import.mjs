// Build src/data/es-pages.json from the reviewed Spanish side-by-side files.
// Source: content/es/side-by-side/*.md (copied from Dropbox
// 02_Strategy/Proposals-&-Planning/Espanol/side-by-side, Nov 17 review fixes).
// Overrides below apply MGI's Nov 20 answers (Jesse, Cinthia) on top of that copy.
// Run: node scripts/es-import.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = 'content/es/side-by-side';
const out = 'src/data/es-pages.json';

// Nov 20, 2026 (Jesse, from Cinthia): customers say "calentón" for the furnace.
// Applied where the copy means the furnace itself. "Calefacción" stays where it means heating in general.
const overrides = {
  'ST-059': {
    esRoute: '/es/servicios/reparacion-de-calefaccion/',
    metaTitle: 'Reparación de calentón en el norte de Colorado',
    metaDescription: '¿El calentón no prende o hace ruido? Reparación de calefacción con MGI Heating & Air. Llame al (970) 287-1673.',
    eyebrow: 'Reparación de calentón',
    title: 'Reparación de calentón',
    summary: '¿Su calentón (furnace) no calienta, prende y se apaga seguido o hace un ruido nuevo? Solicite una evaluación para entender la causa antes de decidir el trabajo.',
    answer: 'El síntoma nos dice por dónde empezar, pero por sí solo no indica qué pieza falló. Un técnico de MGI revisa su calentón de gas u otro sistema y le explica las opciones.',
    faqQuestion: { 0: '¿Puedo seguir usando el calentón si hace ruido?' },
  },
};
const replaceAll = [
  // $99 furnace tune-up offer: furnace-specific.
  ['mantenimiento de calefacción por $99', 'mantenimiento del calentón por $99'],
  ['ya incluya el mantenimiento de calefacción', 'ya incluya el mantenimiento del calentón'],
  // Nov 23, 2026 (Reu): follow the live English Specials page (src/data/holiday-specials.mjs).
  // The $99 tune-up and the $150 humidifier offer can be combined; both run through Dec 30, 2026.
  ['Una por cliente. No se combina con otras ofertas. El trabajo debe completarse a más tardar el 30 de diciembre.',
   'Una por cliente. Se puede combinar con la oferta de $150 de descuento en un humidificador instalado. Válida hasta el 30 de diciembre de 2026.'],
  ['Las ofertas de $99 y $150 no se combinan con otras ofertas. Confirme con la oficina si el financiamiento aplica en el mismo trabajo.',
   'Las ofertas de $99 y $150 se pueden combinar entre sí. Pregunte en la oficina si se combinan con el financiamiento en el mismo trabajo.'],
  ['Las ofertas de temporada no se combinan con otras ofertas. Si ya es miembro VIP,',
   'La oferta de $99 se puede combinar con la oferta de $150 en un humidificador. Pregunte en la oficina si se combina con su plan VIP. Si ya es miembro VIP,'],
  // VIP prices as stated on the live English Specials page.
  ['más $89 al año por cada equipo adicional. VIP para minisplits: $128 al año con una unidad interior incluida y $65 por cada unidad adicional.',
   'más $89 por cada equipo adicional. VIP para minisplits: $12 al mes; el precio se ajusta si tiene unidades interiores adicionales.'],
];

const tokens = [
  ['$225 al año o $20 al mes, más $89', '{{vipStandard}}'],
  ['VIP para minisplits: $12 al mes', 'VIP para minisplits: {{vipDuctless}}'],
  ['Válida hasta el 30 de diciembre de 2026', 'Válida hasta el {{offerEnd}}'],
  ['mantenimiento del calentón por $99', 'mantenimiento del calentón por {{tuneUp}}'],
  ['La oferta de $99 ', 'La oferta de {{tuneUp}} '],
  ['la oferta de $99?', 'la oferta de {{tuneUp}}?'],
  ['Las ofertas de $99 y $150', 'Las ofertas de {{tuneUp}} y {{humidifier}}'],
  ['la oferta de $150 ', 'la oferta de {{humidifier}} '],
  ['(970) 287-1673', '{{phone}}'],
];

const clean = (s) => s.replace(/\*\*/g, '').trim();
const usable = (s) => s && s !== 'None' && !/^INTERNAL\b/.test(s) && !/UNREVIEWED|PLACEHOLDER/.test(s);

function parse(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  const meta = (label) => {
    const m = text.match(new RegExp(`^${label}[^:]*:\\s*(.+)$`, 'm'));
    return m ? clean(m[1].replace(/`/g, '')) : '';
  };
  const pageId = (text.match(/Page ID: `([^`]+)`/) || [])[1];
  const enRoute = meta('EN route');
  const esRoute = meta('ES route').split(' ')[0];
  const rows = {};
  for (const line of text.split('\n')) {
    if (!line.startsWith('| ') || line.startsWith('| Field') || line.startsWith('|---')) continue;
    const cells = line.split('|').map((c) => c.trim());
    rows[cells[1]] = cells[3];
  }
  const page = {
    pageId, enRoute, esRoute,
    schema: meta('Schema type'),
    metaTitle: meta('Meta title ES'),
    metaDescription: meta('Meta description ES'),
    eyebrow: rows['Eyebrow'], title: rows['H1 / title'], summary: rows['Summary'],
    answer: rows['Answer lead'], cta: rows['CTA'], sections: [], faqs: [],
  };
  for (let i = 1; i <= 9; i++) {
    const heading = rows[`Section ${i} heading`], body = rows[`Section ${i} body`];
    if (usable(heading) && usable(body)) page.sections.push({ heading, body });
  }
  for (let i = 1; i <= 9; i++) {
    const question = rows[`FAQ ${i} Q`], answer = rows[`FAQ ${i} A`];
    if (usable(question) && usable(answer)) page.faqs.push({ question, answer });
  }
  const o = overrides[pageId];
  if (o) {
    const { faqQuestion, ...fields } = o;
    Object.assign(page, fields);
    for (const [i, q] of Object.entries(faqQuestion || {})) page.faqs[i].question = q;
  }
  let json = JSON.stringify(page);
  for (const [from, to] of replaceAll) json = json.split(from).join(to);
  if (/No se combina|no se combinan|\$128|\$65/.test(json)) throw Error(`${pageId}: offer or VIP wording does not match the English Specials page`);
  // Facts shared with English: the copy keeps tokens and src/data/es.mjs fills them from
  // site.json and src/data/holiday-specials.mjs, so a price, date or phone change in English
  // changes Spanish too.
  for (const [from, to] of tokens) json = json.split(from).join(to);
  return JSON.parse(json);
}

const files = fs.readdirSync(dir).filter((f) => /^\d\d_.*\.md$/.test(f)).sort();
const pages = files.map(parse);
for (const p of pages) {
  for (const k of ['pageId', 'enRoute', 'esRoute', 'metaTitle', 'metaDescription', 'title', 'summary']) {
    if (!p[k]) throw Error(`${p.pageId || '?'} missing ${k}`);
  }
}
fs.writeFileSync(out, JSON.stringify(pages, null, 2) + '\n');
console.log(`Wrote ${pages.length} Spanish pages to ${out}`);
