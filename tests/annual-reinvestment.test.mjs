import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,validate,CAPITAL,START_PRICE} from '../dist/long-term.mjs';
import {storyDefaults,updateExperiment,applyProposal} from '../dist/experiment.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('annual reinvestment matches the closed-form return at a fixed in-range price',()=>{
  const options={shape:'bull',end:START_PRICE,apr:15},r=simulate(options),cash=simulate({...options,reinvest:false}),core=CAPITAL*.389545;
  assert.equal(r.options.reinvest,true);
  close(r.final.nav,CAPITAL-core+core*1.15**5);
  close(cash.final.nav,CAPITAL+core*.15*5);
  close(r.final.fees,core*(1.15**5-1));
  close(r.final.feeCash,0);close(cash.final.reinvestedFees,0);
  assert.equal(r.final.feeLedger.active.earned,0);
  assert.deepEqual(r.events.map(e=>e.day),[365,730,1095,1460,1825]);
  assert.deepEqual(r.points.slice(0,365),cash.points.slice(0,365));
  for(const e of r.events){
    close(e.beforeNav,e.afterNav);
    close(e.afterPrincipal-e.beforePrincipal,e.reinvestedUsd);
    close(e.beforeFeeCash-e.afterFeeCash,e.reinvestedUsd);
    close(e.stockDelta*e.price+e.cashDelta,0);
  }
});

test('fee cash waits with its own inactive sleeve and is never diverted to another LP',()=>{
  const r=simulate({apr:15}),yearOne=r.points[365];
  assert.equal(yearOne.phase,'cash');
  assert.ok(yearOne.feeLedger.active.cash>0);
  close(yearOne.feeLedger.active.reinvested,0);
  assert.ok(yearOne.feeLedger.core.reinvested>0);
  assert.ok(!r.events.some(e=>e.type==='reinvest'&&e.day===365&&e.feeRole==='active'));
  const later=r.events.find(e=>e.type==='reinvest'&&e.feeRole==='active');
  assert.ok(later&&later.day>365);
  assert.ok(later.reinvestedUsd>=yearOne.feeLedger.active.cash);
});

test('same-day strategy changes are applied before deciding which fees can be reinvested',()=>{
  const pressure=simulate({...storyDefaults('pressure'),eventYear:1});
  assert.ok(pressure.final.fees>0);close(pressure.final.reinvestedFees,0);
  assert.ok(!pressure.events.some(e=>e.type==='reinvest'));
  const growth=simulate(storyDefaults('improve')),day=growth.eventDay,revision=growth.events.find(e=>e.type==='revision');
  revision.afterSleeves.forEach((v,i)=>close(v/revision.afterPrincipal,[.25,0,.7,.05][i]));
  const compounds=growth.events.filter(e=>e.day===day&&e.type==='reinvest');
  assert.equal(compounds.length,1);assert.equal(compounds[0].feeRole,'core');
  assert.ok(growth.events.indexOf(revision)<growth.events.indexOf(compounds[0]));
  assert.ok(growth.points[day].feeLedger.active.cash>0);
  assert.ok(!growth.events.some(e=>e.day>=day&&e.type==='reinvest'&&e.feeRole==='active'));
});

test('fee totals, cash, positions and PNL reconcile through reentries and fundamental changes',()=>{
  for(const reinvest of [false,true])for(const revision of ['unchanged','improve','pressure'])for(const shape of ['cycles3','growthStory','pressureStory']){
    const r=simulate({reinvest,revision,shape,recovery:true,apr:15});
    for(const p of r.points){
      close(p.fees,p.reinvestedFees+p.feeCash);
      close(p.nav,p.principal+p.feeCash);
      close(p.nav,p.stock*p.price+p.cash);
      close(p.nav-CAPITAL,p.holdingPnl+p.il+p.management+p.fees);
      close(p.fees,p.feeLedger.core.earned+p.feeLedger.active.earned);
      for(const f of Object.values(p.feeLedger)){
        assert.ok(f.cash>=0&&f.reinvested>=0&&f.earned>=0);close(f.earned,f.cash+f.reinvested);
      }
    }
    for(const e of r.events){close(e.beforeNav,e.afterNav);close(e.stockDelta*e.price+e.cashDelta,0);}
  }
});

test('reinvesting fee cash can underperform holding it as cash when the stock declines',()=>{
  const options={shape:'decline',end:1,apr:15};
  const r=simulate({...options,reinvest:true}),cash=simulate({...options,reinvest:false});
  assert.ok(r.final.fees>0&&cash.final.fees>0);
  assert.ok(r.final.nav<cash.final.nav);
});

test('the reinvestment choice transfers with a scenario and rejects non-boolean values',()=>{
  const applied=storyDefaults('unchanged'),draft=updateExperiment(storyDefaults('improve'),{reinvest:false});
  const next=applyProposal(applied,draft);
  assert.equal(next.reinvest,false);assert.equal(applied.reinvest,true);
  assert.equal(updateExperiment(next,{years:3}).reinvest,false);
  assert.throws(()=>validate({reinvest:'false'}));
  assert.throws(()=>validate({reinvest:0}));
});
