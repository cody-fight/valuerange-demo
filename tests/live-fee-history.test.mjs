import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {feeHistoryPanel} from '../dist/live-fees-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const load=async name=>JSON.parse(await readFile(new URL(`../dist/data/${name}.json`,import.meta.url),'utf8'));
const history=await load('history'),data=await load('circle-case'),f=history.feeHistory;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('live fee history uses the NAV window and reconciles claims and fee balances by role',()=>{
  assert.equal(f.start,history.nav[0].timestamp);assert.equal(f.end,history.nav.at(-1).timestamp);
  assert.equal(f.end,data.snapshotAt);assert.equal(f.points.length,102);assert.equal(f.points[0].total,0);
  for(const p of f.points){
    close(p.total,p.core+p.active);
    for(const role of ['core','active'])close(p[role],p[role+'Claims']+p[role+'Balance']-f.openingByRole[role]);
  }
  close(f.total,937.260624120421);close(f.recordedClaims,255.9528450820538);
  close(f.roles.core.value,617.8148281759745);close(f.roles.active.value,319.44579594444644);
  close(f.total,f.recordedClaims+f.unclaimedBalance-f.openingBalance);
  close(f.unclaimedBalance,data.positions.reduce((a,p)=>a+p.unclaimedFeeUsd,0));
  close(f.claimVerification.confirmedAmount,f.recordedClaims);
});

test('stock-only observations keep cumulative collected fees without repeatedly summing them',()=>{
  const points=f.points.filter(p=>p.coreCount===0&&p.activeCount===0);
  assert.equal(points.length,49);
  for(const p of points)close(p.total,f.recordedClaims-f.openingBalance);
  assert.ok(points.at(-1).day>points[0].day);
});

test('the full-period presentation labels marked value and avoids a pending claim warning',()=>{
  configureLocale({},'en');
  const markup=feeHistoryPanel(f);
  assert.match(markup,/2026-06-09 → 2026-09-18/);
  assert.match(markup,/Cumulative marked fee value/);assert.match(markup,/This measure includes repricing/);
  assert.match(markup,/\$937\.26/);assert.match(markup,/\$617\.81/);assert.match(markup,/\$319\.45/);
  assert.match(markup,/confirmed by the owner/);assert.doesNotMatch(markup,/pending|待核实|NaN|Infinity/i);
  const zero=structuredClone(f);zero.total=0;zero.roles.core.value=zero.roles.active.value=0;
  assert.doesNotMatch(feeHistoryPanel(zero),/NaN|Infinity/);
});
