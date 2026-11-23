import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  HEADLINE_REBATE_DOLLARS,
  activeRebateTotal,
  activeRebateLines,
  finePrint,
  holidayHeadline,
  offers,
  pending,
} from '../src/data/holiday-specials.mjs';

test('headline number is the single switch for Nov 21', () => {
  assert.ok([5133, 3033].includes(HEADLINE_REBATE_DOLLARS));
  assert.equal(holidayHeadline(5133), 'Up to $5,133 in Rebates + 0% Financing for 72 Months');
  assert.equal(holidayHeadline(3033), 'Up to $3,033 in Rebates + 0% Financing for 72 Months');
  assert.equal(activeRebateTotal(5133), 5133);
  assert.equal(activeRebateTotal(3033), 3033);
  for (const total of [5133, 3033]) {
    assert.equal(activeRebateLines(total).find(line => line.id === 'colorado-credit').amount, 333);
    assert.equal(activeRebateLines(total).some(line => line.id === 'cool-cash'), total === 5133);
  }
});

test('seven offers and the one open item are present', () => {
  assert.equal(offers.length, 7);
  assert.deepEqual(Object.keys(pending), ['C']);
  const notes = finePrint().join('\n');
  for (const item of Object.values(pending)) assert.ok(notes.includes(item), item);
  assert.equal(new Set(offers.map(offer => offer.id)).size, 7);
  assert.ok(!offers.some(offer => offer.id === 'santa-paws'));
  assert.equal(pending.C, 'Ask us whether offers can be combined.');
  assert.doesNotMatch(pending.C, /can be combined with 0%|they combine|free first year of VIP can be combined/i);
  for (const id of ['tune-up', 'humidifier']) assert.match(offers.find(offer => offer.id === id).body, /can be combined/i);
  assert.match(offers.find(offer => offer.id === 'referral').body, /signs.*installed.*pay in full.*no set payout timeline/i);
  assert.ok(!/cannot be combined|santa paws/i.test(notes));
});

test('published copy leaves out dealer cost columns and no-payment claims', () => {
  const files = [
    'src/data/holiday-specials.mjs',
    'src/components/HolidaySpecials.astro',
    'src/layouts/SpecialsFrame.astro',
    'src/pages/specials/index.astro',
  ];
  const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  assert.equal(source.includes('\u2014'), false);
  assert.equal(/FAD Cost|Promotion Rebate|Final FAD/i.test(source), false);
  assert.equal(/20\.22%|14\.22%|13\.71%|18\.03%|6\.68%/.test(source), false);
  assert.equal(/0 payments|no payments/i.test(source), false);
  assert.match(source, /Equal monthly payments are required/);
  assert.match(source, /\(970\) 287-1673|site\.phone/);
  assert.match(source, /Carrier Authorized Dealer/);
  assert.doesNotMatch(source, /Carrier Factory Authorized Dealer|\$1,000|\$5,800|\$3,700/i);
  assert.match(source, /const robots = 'noindex, nofollow'/);
  assert.match(source, /excludeCarrierFactoryMark/);
});
