import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

test('dated research links to intact business excerpts without internal system paths',async()=>{
  const r=JSON.parse(await readFile(new URL('../dist/data/research-trail.json',import.meta.url),'utf8'));
  assert.equal(r.identity,'archived-production-research');
  assert.equal(r.latestDate,r.records.at(-1).date);
  assert.ok(r.latestDate<=r.copiedAt);
  const ids=r.documents.map(d=>d.id);
  assert.equal(ids.length,new Set(ids).size);
  for(const d of r.documents){
    assert.match(d.sourceSha256,/^[a-f0-9]{64}$/);
    assert.equal(createHash('sha256').update(d.markdown).digest('hex'),d.excerptSha256);
    assert.ok(!/[A-Z]:[\\/]|10_系统技能|20_公司资产|40_运行日志|\.env|system_prompt/.test(d.markdown));
  }
  for(const record of r.records){
    const d=r.documents.find(d=>d.id===record.documentId);
    assert.ok(d,'A visible research record must have a source excerpt');
    assert.equal(record.sourceSha256,d.sourceSha256);
    assert.ok(d.version.includes(record.date));
    assert.ok(record.valuationVersion.startsWith('2026-08-22'));
    assert.equal(record.valuationChanged,false,'These archived observations did not approve a revision');
  }
  const ai=r.documents.find(d=>d.id===r.historicalAi.documentId);
  assert.equal(ai.sourceSha256,r.historicalAi.sourceSha256);
  assert.ok(r.historicalAi.technicalAsOf<=r.historicalAi.date);
});
