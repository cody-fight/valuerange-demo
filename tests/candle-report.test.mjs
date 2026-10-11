import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {journeyStart,updateSimulationControls} from '../dist/experiment.mjs';
import {pathKnots} from '../dist/long-term.mjs';
import {candleBuckets} from '../dist/daily-prices.mjs';
import {pnlReportSummary} from '../dist/pnl-report-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';

test('displayed candles retain actual daily extrema across scenarios and horizons',()=>{
 for(const shape of ['bull','cycles2','decline'])for(const years of [1,2,3,4,5]){
  const prices=pathKnots(updateSimulationControls(journeyStart(),{shape,years}));
  const candles=candleBuckets(prices,120);
  for(const c of candles){
   const actual=prices.slice(c.from,c.to+1).map(p=>p.price);
   assert.equal(c.high,Math.max(...actual));assert.equal(c.low,Math.min(...actual));
   assert.equal(c.open,actual[0]);assert.equal(c.close,actual.at(-1));
  }
 }
 // Natural daily paths contain a mixture of directional candles and shadows.
 // Do not enforce a quota of two-sided wicks or manufacture display extrema.
 for(const shape of ['bull','cycles2','decline']){
  const candles=candleBuckets(pathKnots(updateSimulationControls(journeyStart(),{shape})),120);
  const counts=[0,0,0];
  for(const c of candles)counts[Number(c.high>Math.max(c.open,c.close))+Number(c.low<Math.min(c.open,c.close))]++;
  assert.ok(counts.every(n=>n>0),`${shape}: expected a mixture of shadow types`);
 }
});

test('PNL summary reads the archived cumulative table, never the later period table',async()=>{
 const docs=JSON.parse(await readFile(new URL('../dist/data/documents.json',import.meta.url),'utf8'));
 const doc=docs.documents.find(d=>d.id==='pnl_latest');
 for(const lang of ['zh','en']){
  configureLocale({},lang);const html=pnlReportSummary(doc);
  for(const value of ['$31,446.71','$934.06','$255.09','2026-09-18'])assert.ok(html.includes(value));
  assert.ok(!html.includes('$1,006.69')); // latest-interval P&L is not cumulative
 }
 assert.equal(pnlReportSummary({markdown:'No supported table',version:'2026-09-18'}),'');
});
