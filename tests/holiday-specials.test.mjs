import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HEADLINE_REBATE_DOLLARS,
  activeRebateTotal,
  finePrint,
  holidayHeadline,
  offers,
  pending,
} from '../src/data/holiday-specials.mjs';

test('headline number is the single switch for Nov 21', () => {
  assert.equal(HEADLINE_REBATE_DOLLARS, 5800);
  assert.equal(holidayHeadline(5800), 'Up to $5,800 in Rebates + 0% Financing for 72 Months');
  assert.equal(holidayHeadline(3700), 'Up to $3,700 in Rebates');
  assert.equal(activeRebateTotal(5800), 5800);
  assert.equal(activeRebateTotal(3700), 3700);
});

test('eight offers and the five open items are present', () => {
  assert.equal(offers.length, 8);
  assert.deepEqual(Object.keys(pending), ['A', 'B', 'C', 'D', 'E']);
  const notes = finePrint().join('\n');
  for (const item of Object.values(pending)) assert.ok(notes.includes(item), item);
  assert.equal(new Set(offers.map(offer => offer.id)).size, 8);
});

test('published copy leaves out dealer cost columns and no-payment claims', () => {
  const files = [
    'src/data/holiday-specials.mjs',
    'src/components/HolidaySpecials.astro',
    'src/pages/specials/index.astro',
  ];
  const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.equal(source.includes('\u2014'), false);
  assert.equal(/FAD Cost|Promotion Rebate|Final FAD/i.test(source), false);
  assert.equal(/20\.22%|14\.22%|13\.71%|18\.03%|6\.68%/.test(source), false);
  assert.equal(/0 payments|no payments/i.test(source), false);
  assert.match(source, /Equal monthly payments are required/);
  assert.match(source, /\(970\) 287-1673|site\.phone/);
});
