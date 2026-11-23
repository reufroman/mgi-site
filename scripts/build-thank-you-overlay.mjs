// Build a reviewable additive artifact. Never deploy the full source build.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const evidence = 'evidence/thank-you-2026-10-29';
const prior = '../Website-Astro-Tracking-Release-2026-10-27';
const receipt = JSON.parse(await fs.readFile(prior + '/evidence/tracking-2026-10-27/build.json', 'utf8'));
const initial = JSON.parse(await fs.readFile(evidence + '/initial-overlay.json', 'utf8'));
receipt.manifest = { ...receipt.manifest, ...initial.additionsManifest };
const baseline = '.local-preview/thank-you-candidate';
const candidate = '.local-preview/booking-thank-you-candidate';
for (const [file, hash] of Object.entries(receipt.manifest)) {
  if (sha(await fs.readFile(baseline + '/' + file)) !== hash) throw Error('Baseline drift: ' + file);
}
await fs.mkdir(evidence, { recursive: true });
await fs.rm(candidate, { recursive: true, force: true });
await fs.cp(baseline, candidate, { recursive: true });
const additions = [];
async function copy(file) {
  if (additions.includes(file)) return;
  const bytes = await fs.readFile('dist-review/' + file);
  if (receipt.manifest[file]) {
    if (sha(bytes) !== receipt.manifest[file]) throw Error('Asset collision: ' + file);
    return;
  }
  additions.push(file);
  await fs.mkdir(path.dirname(candidate + '/' + file), { recursive: true });
  await fs.writeFile(candidate + '/' + file, bytes);
  for (const match of bytes.toString().matchAll(/["']((?:\/_astro\/|\.\/)[^"']+\.(?:js|css))["']/g)) {
    const dependency = match[1].startsWith('/') ? match[1].slice(1) : path.posix.join(path.posix.dirname(file), match[1]);
    await copy(dependency);
  }
}
await copy('booking-thank-you/index.html');
await fs.rm(candidate + '/thank-you', { recursive: true, force: true });
const redirectBody = '/thank-you  /booking-thank-you/  301\n/thank-you/  /booking-thank-you/  301\n' + await fs.readFile(baseline + '/_redirects', 'utf8');
await fs.writeFile(candidate + '/_redirects', redirectBody);
for (const [file, hash] of Object.entries(receipt.manifest)) {
  if (['_redirects', 'thank-you/index.html'].includes(file)) continue;
  if (sha(await fs.readFile(candidate + '/' + file)) !== hash) throw Error('Unrelated drift: ' + file);
}
const additionsManifest = Object.fromEntries(await Promise.all(additions.map(async file => [file, sha(await fs.readFile(candidate + '/' + file))])));
const manifest = { ...receipt.manifest, ...additionsManifest, _redirects: sha(redirectBody) };
delete manifest['thank-you/index.html'];
const result = { at: new Date().toISOString(), candidate, expectedProduction: 'c3604b42-5bae-4fcb-96e5-de5cd498aa51', baselineFilesPreserved: Object.keys(receipt.manifest).length - 2, additions, additionsManifest, manifest, changed: ['_redirects'], removed: ['thank-you/index.html'], conversionDispatch: 'disabled: provider receipt and intended conversion action unverified', authorization: 'Reu instructed deploy and then requested booking-thank-you URL in this chat' };
await fs.writeFile(evidence + '/overlay.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, manifest: '(recorded in overlay.json)' }));
