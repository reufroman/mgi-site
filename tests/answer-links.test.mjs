import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inlineAnswerMarkdown,libraryAnswers} from '../src/data/answer-library.mjs';

test('manual URLs retain balanced parentheses and their complete filenames',()=>{
 const url='https://www.mitsubishitechinfo.ca/sites/default/files/IB_MS(Y)(Z)-GS06_15NA_DG79A04SH01_0.pdf';
 assert.equal(inlineAnswerMarkdown(`[GS instructions](${url}).`),`<a href="${url}" rel="noreferrer">GS instructions</a>.`);
 const affected=libraryAnswers.filter(answer=>answer.sourceMarkdown.includes(url));
 assert.equal(affected.length,4);
 for(const answer of affected){
  assert.ok(answer.bodyHtml.includes(`href="${url}"`),answer.sourceId);
  assert.ok(!answer.bodyHtml.includes('href="https://www.mitsubishitechinfo.ca/sites/default/files/IB_MS(Y"'),answer.sourceId);
 }
});
test('nested and encoded parentheses preserve nearby formatting and separate links',()=>{
 assert.equal(inlineAnswerMarkdown('**Read** [one](https://example.org/a(b(c)).pdf) and [two](https://example.org/a%28b%29.pdf).'),'<strong>Read</strong> <a href="https://example.org/a(b(c)).pdf" rel="noreferrer">one</a> and <a href="https://example.org/a%28b%29.pdf" rel="noreferrer">two</a>.');
});
test('unbalanced or whitespace-containing links remain escaped text; unsafe markup stays escaped',()=>{
 for(const text of ['[x](https://example.org/a(b.pdf)','[x](https://example.org/a b.pdf)','[x](javascript:alert(1))'])assert.equal(inlineAnswerMarkdown(text),text);
 assert.equal(inlineAnswerMarkdown('<script>alert(1)</script> [<img>](https://example.org/?a=1&b=2)'), '&lt;script&gt;alert(1)&lt;/script&gt; <a href="https://example.org/?a=1&amp;b=2" rel="noreferrer">&lt;img&gt;</a>');
});
