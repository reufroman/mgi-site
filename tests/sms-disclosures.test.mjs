import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';

const read = name => readFileSync(path.join('dist-review', name), 'utf8');
const getDisclosure = (html, kind) => {
 const match = html.match(new RegExp(`<p[^>]*data-mgi-sms-disclosure="${kind}"[^>]*>[\\s\\S]*?<\\/p>`, 'g')) || [];
 assert.equal(match.length, 1, `expected one ${kind} disclosure`);
 return match[0];
};
const checkDisclosure = markup => {
 for (const term of ['Opting in is optional and is not a condition of purchase.', 'Message frequency varies.', 'Msg &amp; data rates may apply.', 'Reply STOP to opt out.', 'Reply HELP for help', 'href="/privacy-policy/#text-messages"', 'href="/terms/#text-messages"']) assert.ok(markup.includes(term), `missing ${term}`);
};

test('SMS disclosures appear in the footer, booking entry, and all nine campaign landings', () => {
 for (const name of ['index.html','about/index.html','privacy-policy/index.html','terms/index.html','schedule-service/index.html','specials/index.html']) checkDisclosure(getDisclosure(read(name),'footer'));
 const schedule=read('schedule-service/index.html');
 checkDisclosure(getDisclosure(schedule,'booking'));
 const schedulerButton=schedule.match(/<button[^>]*data-scheduler-open[^>]*>Open service scheduler/);
 assert.ok(schedulerButton);
 assert.ok(schedule.indexOf('data-mgi-sms-disclosure="booking"') < schedulerButton.index);
 assert.ok(!schedule.includes('Your appointment is pending confirmation.'));
 const landings=readdirSync('dist-review/lp',{withFileTypes:true}).filter(entry=>entry.isDirectory());
 assert.equal(landings.length,9);
 for (const landing of landings) {
  const html=read(`lp/${landing.name}/index.html`);
  checkDisclosure(getDisclosure(html,'footer'));
  checkDisclosure(getDisclosure(html,'lp'));
 }
});

test('privacy and terms link to the corresponding SMS disclosures', () => {
 const privacy=read('privacy-policy/index.html'),terms=read('terms/index.html');
 assert.match(privacy, /id="text-messages"[^>]*><h2[^>]*>Text messages \(SMS\)<\/h2>/);
 assert.ok(privacy.includes('Text message opt-in data and consent will not be sold or shared'));
 assert.match(terms, /id="text-messages"[^>]*><h2[^>]*>Text message terms<\/h2>/);
 assert.ok(terms.includes('Reply STOP to opt out at any time. Reply HELP for help'));
});
