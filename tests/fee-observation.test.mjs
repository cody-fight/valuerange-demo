import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validFeeObservation,loadFeeObservation,feeObservationPanel} from '../dist/fee-observation.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const observed=JSON.parse(await readFile(new URL('../dist/data/fee-observation.json',import.meta.url),'utf8'));
test('observed APR reconciles fees, time-weighted capital and portfolio contribution',()=>{
 assert.ok(validFeeObservation(observed));
 const w=observed.window;
 assert.equal(w.start.slice(0,10),'2026-08-24');
 assert.equal(w.end.slice(0,10),'2026-10-09');
 assert.equal(w.lpAprCalendar.toFixed(1),'35.2');
 assert.equal(w.feeTotal.toFixed(2),'832.57');
 assert.equal(w.portfolioFeeAnnual.toFixed(1),'20.3');
 for(const key of ['feeTotal','lpAprCalendar','avgLpPrincipal','days']){
  const x=structuredClone(observed);x.window[key]*=2;assert.equal(validFeeObservation(x),false,key);
 }
 const x=structuredClone(observed);x.window.roles.active.aprCalendar=100;assert.equal(validFeeObservation(x),false);
});
test('dated metric is optional, cannot leak future observations or imply it updates with a newer NAV',async()=>{
 assert.equal(await loadFeeObservation(async()=>{throw Error('offline');}),null);
 assert.equal(await loadFeeObservation(async()=>({ok:true,json:async()=>({})})),null);
 assert.deepEqual(await loadFeeObservation(async()=>({ok:true,json:async()=>observed})),observed);
 assert.equal(feeObservationPanel(observed,'2026-09-17 12:43:53 +08:00'),'');
 assert.equal(feeObservationPanel(null,observed.window.end),'');
 configureLocale({},'zh');
 const current=feeObservationPanel(observed,observed.window.end),later=feeObservationPanel(observed,'2026-10-10 08:00:00 +08:00');
 assert.match(current,/35.2/);assert.match(current,/等待时间也已计入/);assert.match(current,/2026-08-24 → 2026-10-09/);
 assert.match(later,/不随净值日期自动延长/);
 configureLocale({},'en');assert.match(feeObservationPanel(observed,observed.window.end),/Combined LP fee APR/);
});
