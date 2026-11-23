// English to Spanish parity record.
// Each Spanish page pairs with an English page. This records a fingerprint of the English
// page's visible main content at the moment the Spanish page was last brought in line with it.
// tests/es-pages.test.mjs fails when an English paired page changes and this record was not
// updated, so English changes cannot ship without the Spanish page being reviewed and updated.
//
//   npm run build && npm run es:parity            # report which pairs changed
//   npm run build && npm run es:parity -- --record # after updating the Spanish copy
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {esPages} from '../src/data/es.mjs';

const recordFile = 'src/data/es-parity.json';
const out = `dist-${process.env.MGI_BUILD_MODE || 'review'}`;

export function englishMainText(html) {
  const m = html.match(/<main[^>]*>([\s\S]*)<\/main>/);
  if (!m) throw Error('No <main> element');
  return m[1]
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

export function currentFingerprints(dist = out) {
  return Object.fromEntries(esPages.map((p) => {
    const html = fs.readFileSync(`${dist}${p.enRoute}index.html`, 'utf8');
    return [p.pageId, {enRoute: p.enRoute, esRoute: p.esRoute, enSha256: createHash('sha256').update(englishMainText(html)).digest('hex')}];
  }));
}

export function parityDrift(dist = out) {
  const recorded = JSON.parse(fs.readFileSync(recordFile, 'utf8')).pairs;
  const now = currentFingerprints(dist);
  return Object.entries(now).filter(([id, v]) => recorded[id]?.enSha256 !== v.enSha256).map(([id, v]) => ({pageId: id, ...v}));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--record')) {
    const pairs = currentFingerprints();
    fs.writeFileSync(recordFile, JSON.stringify({note: 'English main-content fingerprints the Spanish pages were last synced against. Update only after the Spanish page matches the English page. See scripts/es-parity.mjs.', recordedAt: new Date().toISOString().slice(0, 10), pairs}, null, 2) + '\n');
    console.log(`Recorded ${Object.keys(pairs).length} English to Spanish pairs in ${recordFile}`);
  } else {
    const drift = parityDrift();
    if (!drift.length) console.log('All Spanish pages are in sync with their English pairs.');
    for (const d of drift) console.log(`English changed: ${d.enRoute} -> update ${d.esRoute}`);
    process.exitCode = drift.length ? 1 : 0;
  }
}
