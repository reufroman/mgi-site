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
