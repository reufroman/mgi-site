// Fill only the newest approval fingerprint from the full render tree.
// publication.json is excluded from that tree, so writing the hash does not change it.
import {readFileSync, writeFileSync} from 'node:fs';
import {renderFingerprint} from '../src/data/render-fingerprint.mjs';

const file = new URL('../src/data/publication.json', import.meta.url);
const raw = readFileSync(file, 'utf8');
const marker = '"holidaySpecialsRelease"';
const start = raw.lastIndexOf(marker);
if (start < 0) throw new Error('holidaySpecialsRelease is missing');
const hash = renderFingerprint().hash;
if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Full-tree fingerprint missing');
const head = raw.slice(0, start);
let tail = raw.slice(start);
const replaced = tail.replace(/"renderSourceHash": "[^"]+"/, `"renderSourceHash": "${hash}"`);
if (replaced === tail) throw new Error('Could not write the holiday fingerprint');
tail = replaced;
writeFileSync(file, head + tail);
console.log(hash);
