import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {simulate,inventory,valuation,validate,CAPITAL,START_PRICE} from '../dist/long-term.mjs';
const close=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('analytic CLMM boundaries and a round trip have no invented principal profit',()=>{
  assert.deepEqual(inventory(10,4,1,4),{stock:0,cash:10});
  assert.deepEqual(inventory(10,1,1,4),{stock:5,cash:0});
  close(inventory(10,2.25,1,4).stock,5/3);close(inventory(10,2.25,1,4).cash,5);
  const roundtrip=simulate({shape:'bull',end:START_PRICE,apr:0});
  close(roundtrip.final.nav,CAPITAL);close(roundtrip.final.il,0);close(roundtrip.final.management,0);
});
test('fees use only in-range principal, accrue as cash and do not compound',()=>{
  const r=simulate({shape:'bull',end:START_PRICE,apr:35,reinvest:false});
  close(r.final.fees,CAPITAL*.389545*.35*5,1e-6);
  close(r.final.nav,CAPITAL+r.final.fees,1e-6);
  assert.equal(r.events.length,0); // Active is below its lower bound.
});
test('two and three cycles complete causal exits and reentries at preset boundaries',()=>{
  for(const n of [2,3]){const r=simulate({shape:`cycles${n}`,apr:0});
    assert.equal(r.events.filter(e=>e.type==='sell').length,2*n);assert.equal(r.events.filter(e=>e.type==='buy').length,n);
    for(const e of r.events){if(e.type==='sell')assert.ok([115,160].includes(e.price));if(e.type==='buy')close(e.price,58);if(e.type==='buy-open')close(e.price,75);}
    assert.ok(r.final.management>0);assert.ok(r.final.nav>r.final.pure);
  }
});
test('disabling reentry keeps the first exit in cash without automatic rearming',()=>{
  const r=simulate({cycles:false,apr:0});assert.equal(r.events.filter(e=>e.type==='sell').length,1);
  assert.ok(!r.events.some(e=>['buy','buy-open','sell-open','core-open'].includes(e.type)));
  assert.equal(r.final.activeLiquidity,0);assert.equal(r.final.coreLiquidity,0);
});
test('all operations conserve inventory value, all PNL components reconcile, no negative inventory',()=>{
  for(const revision of ['unchanged','improve','pressure'])for(const shape of ['cycles2','cycles3','bull','decline'])for(const apr of [0,35,60]){
    const r=simulate({revision,shape,apr});close(r.points[0].nav,CAPITAL);
    for(const e of r.events)close(e.beforeNav,e.afterNav,1e-6);
    for(const p of r.points){assert.ok(p.stock>=0&&p.cash>=0);close(p.stock*p.price+p.cash,p.nav,1e-6);close(p.holdingPnl+p.il+p.management+p.fees,p.nav-CAPITAL,1e-6);}
  }
});
test('no lookahead: changing only the final path endpoint leaves the preceding prefix unchanged',()=>{
  const a=simulate({end:40}),b=simulate({end:250});const startLastLeg=a.knots.at(-2).day;
  assert.deepEqual(a.points.slice(0,startLastLeg+1),b.points.slice(0,startLastLeg+1));
  assert.deepEqual(a.events.filter(e=>e.day<startLastLeg),b.events.filter(e=>e.day<startLastLeg));
});
test('fundamental revisions share prices and the first two years; event has zero instant NAV impact',()=>{
  const baseline=simulate();for(const revision of ['improve','pressure']){const r=simulate({revision});
    assert.deepEqual(r.points.slice(0,730),baseline.points.slice(0,730));
    close(r.points[730].nav,baseline.points[730].nav);
    assert.deepEqual(r.points.map(p=>p.price),baseline.points.map(p=>p.price));
    assert.equal(r.events.filter(e=>e.type==='revision').length,1);
  }
});
test('uptrend exposes stock underperformance, even with positive assumed fee APR',()=>{
  const r=simulate({shape:'bull',end:280,apr:35});assert.ok(r.final.nav<r.final.pure);assert.equal(r.events.filter(e=>e.type==='buy').length,0);
});
test('four valuation nodes reproduce the financial formula, not an arbitrary price multiplier',()=>{
  const nodes=valuation();[11.32,35.81,88.71,177.86].forEach((n,i)=>close(nodes[i].value,n,.005));
  close(valuation('improve')[2].ebitda,2.29483,1e-6);
  assert.ok(valuation('pressure')[2].value<nodes[2].value);
  for(const key of ['unchanged','improve','pressure'])assert.ok(valuation(key).every(n=>n.ebitda>0));
  assert.throws(()=>validate({years:0}));assert.throws(()=>validate({apr:61}));assert.throws(()=>validate({end:NaN}));assert.throws(()=>validate({cycles:'true'}));
});
test('formal evidence reconciles and copied documents retain hashes, dates and scope',async()=>{
  const load=async name=>JSON.parse(await readFile(new URL(`../dist/data/${name}.json`,import.meta.url),'utf8'));
  const c=await load('circle-case'),d=await load('documents');
  close(c.positions.reduce((s,p)=>s+p.totalUsd,0)+Object.values(c.wallet).slice(1).reduce((s,n)=>s+n,0),c.nav.totalUsd,1e-6);
  close(c.positions.reduce((s,p)=>s+p.unclaimedFeeUsd,0),682.2577190812);
  close(d.feeObservation.quantityAccrualEndPriceUsd/d.feeObservation.averageLpPrincipalUsd/(d.feeObservation.hours/24)*365*100,d.feeObservation.lpSimpleAnnualPct);
  for(const x of d.documents){assert.equal(createHash('sha256').update(x.markdown).digest('hex'),x.excerptSha256);assert.ok(x.version.includes('2026'));assert.ok(!/[A-Z]:\\|10_系统技能|20_公司资产|40_运行日志/.test(x.markdown));}
});
