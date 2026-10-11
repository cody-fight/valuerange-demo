import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {markdown} from '../dist/document-markdown.mjs';
import {valuationShift} from '../dist/revision-view.mjs';
import {configureLocale,translate} from '../dist/locales/locale.mjs';
const catalog=JSON.parse(await readFile(new URL('../dist/locales/en.json',import.meta.url),'utf8'));

test('all valuation zone transitions translate independently of the event price',()=>{
  configureLocale(catalog,'en');
  for(const event of ['unchanged','improve','pressure'])for(const price of [1,12,36,52,89,178,400]){
    const svg=valuationShift(event,price);
    const texts=[...svg.matchAll(/>([^<>]+)</g)].map(m=>translate(m[1]));
    assert.ok(texts.every(s=>!/[\u3400-\u9fff]/u.test(s)),event+' '+price);
  }
  configureLocale(catalog,'zh');
  assert.ok(valuationShift('unchanged',52).includes('事件时股价 $52'));
});

test('archived report renderer preserves values, renders lists and escapes untrusted HTML',()=>{
  const html=markdown('# Report\n- **$255.09** excess\n- `<script>alert(1)</script>`\n\n1. Verify\n2. Review\n\n| Value |\n|---:|\n| -218.87 |\n```text\n<img src=x onerror=alert(1)>\n```');
  assert.match(html,/<h2>Report<\/h2>/);
  assert.match(html,/<ul><li><strong>\$255.09<\/strong> excess<\/li>/);
  assert.match(html,/<ol><li>Verify<\/li><li>Review<\/li><\/ol>/);
  assert.match(html,/<td>-218.87<\/td>/);
  assert.ok(!html.includes('<script>')&&!html.includes('<img'));
});
