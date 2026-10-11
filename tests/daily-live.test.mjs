import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validLive,loadLive,liveDetails,liveStatus} from '../dist/daily-live.mjs';
import {setLanguage} from '../dist/locales/locale.mjs';
const fixture=JSON.parse(readFileSync(new URL('../dist/data/live-evidence.json',import.meta.url)));
test('daily evidence reconciles NAV, full history and fee balances',()=>{
  assert.equal(validLive(fixture),true);
  assert.equal(fixture.history.nav[0].date,'2026-06-09');
  const f=fixture.history.feeHistory;
  assert.ok(Math.abs(f.total-Object.values(f.roles).reduce((s,r)=>s+r.recordedClaims+r.unclaimedBalance-r.openingBalance,0))<1e-8);
  for(const mutate of [x=>x.history.nav.pop(),x=>x.case.nav.totalUsd++,x=>x.case.pnl.excessPure++,x=>x.history.nav.reverse(),x=>x.case.positions[0].positionPda='" onclick="bad']){
    const broken=structuredClone(fixture);mutate(broken);assert.equal(validLive(broken),false);
  }
});
test('missing, corrupt and failing daily feed never prevents archive loading',async()=>{
  for(const fetcher of [async()=>{throw Error('offline')},async()=>({ok:false}),async()=>({ok:true,json:async()=>({})})])assert.equal(await loadLive(fetcher),null);
  assert.deepEqual(await loadLive(async()=>({ok:true,json:async()=>fixture})),fixture);
});
test('daily details are dated and bilingual; stale data never pretends to be yesterday',()=>{
  setLanguage('en');const en=liveDetails(fixture);assert.match(en,/Since inception/);assert.ok(en.includes(new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(fixture.case.nav.totalUsd)));assert.ok(en.includes(fixture.case.snapshotAt.slice(0,10)));
  assert.match(liveStatus(fixture,new Date('2030-01-01T03:00:00Z')),/last successful/);
  setLanguage('zh');assert.match(liveDetails(fixture),/从策略起点累计/);
  assert.match(liveStatus(null),/历史归档/);
});
