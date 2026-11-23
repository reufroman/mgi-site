import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {publicationErrors} from '../src/data/publication.mjs';

test('Oct 12 record and prior releases are byte-for-byte unchanged', () => {
 const main = execFileSync('git', ['show', 'main:src/data/publication.json']);
 const current = readFileSync('src/data/publication.json');
 const marker = Buffer.from(',\n  "holidaySpecialsRelease":');
 const start = current.indexOf(marker);
 assert.ok(start > 0);
 const historical = Buffer.concat([current.subarray(0, start), Buffer.from('\n}\n')]);
 assert.ok(historical.equals(main));
});

test('newest approval must match the current fingerprint', () => {
 const record = JSON.parse(readFileSync('src/data/publication.json', 'utf8'));
 const expected = {
  canonicalOrigin: 'https://mgiheatingandair.com',
  renderSourceHash: 'b'.repeat(64),
  now: '2026-11-23T20:00:00Z',
  pageHashes: Object.fromEntries(Object.entries(record.pages).map(([id, page]) => [id, page.contentHash])),
  imageHashes: Object.fromEntries(Object.entries(record.images).map(([id, image]) => [id, image.sourceHash])),
  site: {schedulerWidgetId: record.scheduler.widgetId, schedulerWebsiteUrl: 'https://mgiheatingandair.com'}
 };
 record.holidaySpecialsRelease.renderSourceHash = 'a'.repeat(64);
 assert.ok(publicationErrors(record, expected).some(error => error.includes('current fingerprint')));
 record.holidaySpecialsRelease.renderSourceHash = expected.renderSourceHash;
 assert.deepEqual(publicationErrors(record, expected), []);
});

test('holiday approval retains exact previously authorized landing pages', () => {
 const record = JSON.parse(readFileSync('src/data/publication.json', 'utf8'));
 const expected = {
  canonicalOrigin: 'https://mgiheatingandair.com',
  renderSourceHash: record.holidaySpecialsRelease.renderSourceHash,
  now: '2026-11-23T20:00:00Z',
  pageHashes: Object.fromEntries(Object.entries(record.pages).map(([id, page]) => [id, page.contentHash])),
  imageHashes: Object.fromEntries(Object.entries(record.images).map(([id, image]) => [id, image.sourceHash])),
  site: {schedulerWidgetId: record.scheduler.widgetId, schedulerWebsiteUrl: 'https://mgiheatingandair.com'}
 };
 for (let n = 1; n <= 9; n++) {
  const id = `LP-00${n}`;
  expected.pageHashes[id] = record.measurementRelease.pages[id].contentHash;
 }
 assert.deepEqual(publicationErrors(record, expected), []);
 expected.pageHashes['LP-001'] = 'f'.repeat(64);
 assert.ok(publicationErrors(record, expected).some(error => error.includes('publication.pages.LP-001.contentHash')));
});
