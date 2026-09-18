import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate,CAPITAL,START_PRICE,validate} from '../dist/long-term.mjs';
import {experimentDefaults,storyDefaults,updateExperiment,applyProposal,feePatch,FEE_PROFILES} from '../dist/experiment.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
test('long-window fee reference reconciles role income, capital-time APR and portfolio contribution',async()=>{
  const f=JSON.parse(await readFile(new URL('../dist/data/fee-reference.json',import.meta.url),'utf8')),w=f.windows.at(-1);
  assert.equal(w.observations,24);assert.ok(w.days>22&&w.days<24);
  close(w.feeTotal,w.roles.core.feesDailyMark+w.roles.active.feesDailyMark);
  for(const role of Object.values(w.roles))close(role.feesDailyMark/role.capitalDays*365*100,role.aprCalendar);
  close(w.feeTotal/(w.avgLpPrincipal*w.days)*365*100,w.lpAprCalendar);
  close(w.feeTotal/(w.avgPortfolioNav*w.days)*365*100,w.portfolioFeeAnnual);
  assert.ok(w.portfolioFeeAnnual<w.lpAprCalendar);
  close(f.defaultRates.coreApr,Math.round(w.roles.core.aprCalendar*.5*10)/10);
  close(f.defaultRates.activeApr,Math.round(w.roles.active.aprCalendar*.5*10)/10);
  assert.deepEqual(f.defaultRates,feePatch(experimentDefaults()));
});
test('each fee rate affects only its Core, exit or accumulation phase when no fees are reinvested',()=>{
  const base={reinvest:false,coreApr:0,activeApr:0,buyApr:0};
  const c=simulate({...base,coreApr:14}),s=simulate({...base,activeApr:37.3}),b=simulate({...base,buyApr:14});
  const all=simulate({...base,coreApr:14,activeApr:37.3,buyApr:14});
  close(all.final.fees,c.final.fees+s.final.fees+b.final.fees);
  close(c.final.feeLedger.active.earned,0);close(s.final.feeLedger.core.earned,0);
  close(s.final.feeStats.buy.earned,0);close(b.final.feeStats.sell.earned,0);
  close(all.final.feeStats.sell.earned,all.final.feeLedger.active.earned);
  close(all.final.feeStats.core.earned+all.final.feeStats.buy.earned,all.final.feeLedger.core.earned);
  for(const [key,apr] of [['core',14],['sell',37.3],['buy',14]]){
    const f=all.final.feeStats[key];assert.ok(f.days>0);close(f.capitalDays*apr/36500,f.earned);
  }
  assert.equal(all.events.filter(e=>e.type==='sell').length,6);
  assert.equal(all.events.filter(e=>e.type==='buy').length,3);
  for(const r of [c,s,b])close(r.final.principal,all.final.principal);
});
test('portfolio contribution uses active LP share; ROI includes price and management losses',()=>{
  const r=simulate({shape:'bull',end:START_PRICE,reinvest:false});
  close(r.points[0].annualFeeRunRate,CAPITAL*.389545*.14);
  close(r.points[0].feeAnnualContributionPct,.389545*14);
  close(r.final.feeStats.sell.days,0);close(r.final.feeStats.buy.days,0);
  close(r.final.feeContributionPct,r.final.fees/CAPITAL*100);
  close(r.final.roiPct,(r.final.nav/CAPITAL-1)*100);
  const loss=simulate({shape:'decline',end:1,reinvest:false});
  assert.ok(loss.final.feeContributionPct>0);assert.ok(loss.final.roiPct<0);
  const exited=simulate(storyDefaults('pressure')),atExit=exited.points[exited.eventDay];
  close(exited.final.fees,atExit.fees);
  for(const p of exited.points.slice(exited.eventDay))close(p.annualFeeRunRate,0);
});
test('different fee rates survive preview, apply, profiles and year changes without a stale uniform APR',()=>{
  const draft=updateExperiment(storyDefaults('improve'),{coreApr:11.1,activeApr:44.4,buyApr:6.6,reinvest:false});
  const applied=applyProposal(experimentDefaults(),draft);
  assert.deepEqual(feePatch(applied),feePatch(draft));assert.equal(applied.reinvest,false);
  const profile=updateExperiment(applied,feePatch(FEE_PROFILES.observed));
  assert.deepEqual(feePatch(profile),{coreApr:28,activeApr:74.6,buyApr:14});
  assert.deepEqual(feePatch(updateExperiment(profile,{years:3})),feePatch(profile));
  for(const value of [-1,121,NaN,Infinity])assert.throws(()=>validate({coreApr:value}));
});
