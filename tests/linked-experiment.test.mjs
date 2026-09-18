import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate,valuation,pricePosition,allocationPlan,validate} from '../dist/long-term.mjs';
import {experimentDefaults,updateExperiment,applyProposal,storyDefaults} from '../dist/experiment.mjs';
import {priceBand,historyPanels,performanceHeadline,createLab} from '../dist/lab.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const load=async name=>JSON.parse(await readFile(new URL(`../dist/data/${name}.json`,import.meta.url),'utf8'));

test('historical short sample remains auditable but no longer sets the split defaults',async()=>{
  const d=await load('documents'),initial=experimentDefaults();
  const f=d.feeObservation;
  close(f.quantityAccrualEndPriceUsd/f.averageLpPrincipalUsd/(f.hours/24)*365*100,f.lpSimpleAnnualPct);
  assert.equal(initial.apr,undefined);
  assert.deepEqual([initial.coreApr,initial.activeApr,initial.buyApr],[14,37.3,14]);
});
test('scenario boundaries include both extremes and respond to changed fundamentals',()=>{
  for(const key of ['unchanged','improve','pressure']){
    const n=valuation(key).map(n=>n.value);
    for(const [price,index] of [[n[0]-.01,0],[n[0],1],[n[1],2],[n[2],3],[n[3],3],[n[3]+.01,4]])assert.equal(pricePosition(price,key).index,index);
    assert.match(priceBand(1,key),/低于悲观下界/);assert.match(priceBand(400,key),/高于乐观上界/);
  }
  assert.equal(pricePosition(100).index,3);assert.equal(pricePosition(100,'improve').index,2);
  assert.throws(()=>validate({end:0}));assert.throws(()=>validate({end:401}));
});
test('candidate application preserves price path, horizon, APR and observation time',async()=>{
  const initial=updateExperiment(experimentDefaults((await load('documents')).feeObservation),{end:222,day:500,apr:15});
  const draft={revision:'improve',eventYear:3,allocation:'ranges'};
  const applied=applyProposal(initial,draft);
  assert.equal(initial.revision,'unchanged');
  for(const key of ['end','shape','years','apr','day','cycles'])assert.equal(applied[key],initial[key]);
  assert.equal(applied.revision,'improve');assert.equal(applied.eventYear,3);
  const shorter=updateExperiment(applied,{years:3});assert.equal(shorter.eventYear,2);assert.equal(shorter.day,1095);
});
test('all selectable event years and adjustment modes conserve capital with a causal prefix',()=>{
  for(const years of [3,5])for(let eventYear=1;eventYear<years;eventYear++)for(const allocation of ['ranges','inventory'])for(const revision of ['improve','pressure']){
    const options={years,eventYear,allocation,revision,apr:40.9},base=simulate({...options,revision:'unchanged'}),r=simulate(options),day=eventYear*365;
    assert.deepEqual(r.points.slice(0,day),base.points.slice(0,day));
    assert.deepEqual(r.points.map(p=>p.price),base.points.map(p=>p.price));
    const e=r.events.find(e=>e.type==='revision');assert.equal(e.day,day);close(e.beforeNav,e.afterNav);close(e.stockDelta*e.price+e.cashDelta,0);
    close(r.points[day].fees,base.points[day].fees);
    for(const p of r.points){close(p.sleeves.reduce((a,b)=>a+b,0),p.principal);close(p.holdingPnl+p.il+p.management+p.fees,p.nav-10000);assert.ok(p.stock>=0&&p.cash>=0);}
    if(allocation==='ranges'){close(e.stockDelta,0);close(e.cashDelta,0);}
    else {const target=allocationPlan(revision,e.price),weights=[...target.weights];if(revision==='pressure'){weights[2]=Math.min(.1,e.beforeStock*e.price/e.beforePrincipal);weights[3]=1-weights[2];}e.afterSleeves.forEach((v,i)=>close(v/e.afterPrincipal,weights[i]));}
    if(allocation==='inventory'&&revision==='pressure')assert.equal(r.events.filter(e=>e.day>day&&e.type==='buy-open').length,0);
  }
});
test('initial HODL and static LP baselines never change after a rebalance',()=>{
  const a=simulate(),b=simulate({revision:'pressure'});
  for(let i=0;i<a.points.length;i++){close(a.points[i].holdingPnl,b.points[i].holdingPnl);close(a.points[i].il,b.points[i].il);}
});
test('evidence charts use actual dates, final NAV tie-out, and unclaimed balances without adding to PNL',async()=>{
  const h=await load('history'),c=await load('circle-case');assert.equal(h.fees.length,26);
  assert.equal(new Set(h.fees.map(p=>p.date)).size,26);
  assert.equal(h.fees[0].date,'2026-08-24');assert.equal(h.fees.at(-1).timestamp,c.snapshotAt);
  assert.equal(h.nav.at(-1).timestamp,c.snapshotAt);assert.equal(h.nav.at(-2).timestamp,c.pnl.latestStart);
  close(h.nav.at(-1).nav/100*h.initialCapitalUsd,c.nav.totalUsd);
  close(h.nav.at(-1).pure/100*h.initialCapitalUsd,c.pnl.pureEnd,.005); // PNL JSON rounds to cents.
  close(h.fees.at(-1).core+h.fees.at(-1).active,c.positions.reduce((s,p)=>s+p.unclaimedFeeUsd,0));
  assert.ok(h.fees[0].core>0);assert.ok(h.fees.some((p,i)=>i>0&&p.core<h.fees[i-1].core));
  assert.match(historyPanels(h,c.pnl),/不是每日新增收入/);
  assert.ok(!/wallet|private|G:\\|10_系统技能/.test(JSON.stringify(h)));
});

test('latest evidence keeps fee revaluation, benchmark periods and calibration distinct',async()=>{
  const c=await load('circle-case'),h=await load('history'),calibration=await load('fee-reference'),p=c.pnl,f=p.feePeriod,w=h.feeReference.windows.at(-1);
  assert.equal(c.snapshotAt,'2026-09-18 12:09:17 +08:00');
  close(p.pnl,c.nav.totalUsd-p.initialNav);assert.ok(p.pnl>0);assert.ok(p.excessPure>0);
  for(const r of p.periodComparisons){
    close(r.endingUsd-p.latestInitialNav,r.pnlUsd);close(c.nav.totalUsd-r.endingUsd,r.excessUsd);
    close(r.pnlUsd/p.latestInitialNav*100,r.returnPct);
  }
  close(f.quantityAccrualUsd+f.revaluationUsd-f.claimedUsd,f.balanceChangeUsd);
  close(f.byRole.reduce((s,r)=>s+r.accrualUsd,0),f.quantityAccrualUsd);
  close(f.balanceChangeUsd,h.fees.at(-1).core+h.fees.at(-1).active-h.fees.at(-2).core-h.fees.at(-2).active);
  assert.ok(f.revaluationUsd>0);assert.equal(f.byRole.find(r=>r.role==='active').accrualUsd,0);
  assert.equal(w.end,c.snapshotAt);assert.equal(w.observations,h.fees.length);
  for(const role of Object.values(w.roles))close(role.aprCalendar,role.feesDailyMark/role.capitalDays*36500);
  close(w.feeTotal,w.roles.core.feesDailyMark+w.roles.active.feesDailyMark);
  assert.equal(calibration.end.slice(0,10),'2026-09-16');
  assert.match(historyPanels(h,p),/09.17—09.18/);assert.doesNotMatch(historyPanels(h,p),/09.15—09.16/);
});

test('evidence headlines reflect both outperformance and underperformance',()=>{
  assert.match(performanceHeadline(-3.109,-3.877),/少跌 0.77/);
  assert.match(performanceHeadline(-5,-2),/落后 3.00/);
  assert.match(performanceHeadline(2,4),/落后 2.00/);
  assert.match(performanceHeadline(5,3),/领先 2.00/);
  assert.match(performanceHeadline(2,2),/收益接近/);
});
test('rendered lab names baselines consistently and keeps a complete scenario preview separate',async()=>{
  const [data,documents,proposals,feeReference]=await Promise.all(['circle-case','documents','prepared-proposals','fee-reference'].map(load));
  const defaults=experimentDefaults(documents.feeObservation),state={...defaults,view:'simulate'},draft=storyDefaults('improve',defaults.apr);
  const lab=createLab({state,draft,data,documents,proposals,defaults,feeReference});
  assert.ok(lab.simulation().includes('固定估值 LP 策略'));assert.ok(lab.revision().includes('预览中'));
  Object.assign(state,applyProposal(state,draft));assert.ok(lab.simulation().includes('估值中枢大幅上移'));assert.ok(lab.simulation().includes('乐观估值区间'));
  assert.match(lab.revision(),/已应用/);
  for(const end of [1,400]){Object.assign(state,updateExperiment(state,{end}));assert.doesNotMatch(lab.simulation()+lab.revision(),/NaN|Infinity|undefined/);}
});
