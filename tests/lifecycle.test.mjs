import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,CAPITAL} from '../dist/long-term.mjs';
import {journeyStart} from '../dist/experiment.mjs';
import {currentHoldings,observedPriceChart,lifecycleRules} from '../dist/lifecycle-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('each completed cycle closes Core into wallet shares and waits for the distinct restart threshold',()=>{
  const r=simulate({...journeyStart(),end:157,reinvest:false});
  for(const buy of r.events.filter(e=>e.type==='buy')){
    close(buy.price,58);close(buy.afterSleeves[0],0);close(buy.afterSleeves[1],0);
    const reopen=r.events.find(e=>e.day>buy.day&&e.type==='core-open');
    assert.ok(reopen);close(reopen.price,75);
    for(const p of r.points.filter(p=>p.day>buy.day&&p.day<reopen.day)){
      close(p.coreLiquidity,0);close(p.activeLiquidity,0);close(p.annualFeeRunRate,0);
      close(p.stock,p.free.stock);close(p.fees,r.points[Math.ceil(buy.day)].fees);
    }
  }
  const low=r.points[1566];
  close(low.stock,low.free.stock);close(low.cash,CAPITAL*.03836+low.feeCash);
  close(low.coreLiquidity,0);close(low.activeLiquidity,0);
});

test('two sequential Active exits use existing shares and never spend realized cash',()=>{
  const r=simulate({...journeyStart(),end:157,reinvest:false});
  const opens=r.events.filter(e=>e.type==='sell-open');
  assert.ok(opens.some(e=>e.price===130));
  for(const e of opens){
    close(e.beforeStock,e.stock);close(e.beforeCash,e.cash);close(e.beforeSleeves[1],0);
    assert.ok(e.afterSleeves[1]>0);assert.ok(e.afterSleeves[2]<e.beforeSleeves[2]);
  }
  for(const p of r.points){
    assert.ok(p.free.stock+1e-9>=CAPITAL*.2/r.options.startPrice);
    assert.ok(!['buy','accumulate'].includes(p.phase));
  }
  const exits=r.events.filter(e=>e.type==='sell');
  assert.deepEqual(exits.slice(0,2).map(e=>Math.round(e.price)),[115,160]);
});

test('all asset locations sum to total NAV including fee cash, across decisions and reinvestment',()=>{
  for(const revision of ['unchanged','improve','pressure'])for(const reinvest of [false,true]){
    const r=simulate({...journeyStart(),revision,reinvest,end:157});
    for(const p of r.points){
      const a=p.positions.core,b=p.positions.active;
      close(a.stock+b.stock+p.free.stock,p.stock);
      close(a.cash+b.cash+p.free.cash+p.feeCash,p.cash);
      close(a.value+b.value+p.free.stock*p.price+p.free.cash+p.feeCash,p.nav);
      close(p.stock*p.price/p.nav+p.cash/p.nav,1);
      if(!a.inRange)close(p.feeRunRates.core,0);if(!b.inRange)close(p.feeRunRates.active,0);
    }
    for(const e of r.events){
      close(e.beforeNav,e.afterNav);
      if(!['revision','rebuild','reinvest'].includes(e.type)){close(e.beforeStock,e.stock);close(e.beforeCash,e.cash);}
    }
  }
});

test('price chart uses observation-time valuation; shares and price are not the same unit',()=>{
  configureLocale({},'en');const r=simulate({...journeyStart(),end:157}),p=r.points[1566];
  const price=observedPriceChart(r,p.day),holdings=currentHoldings(p);
  assert.match(price,/\$52\.80/);assert.match(price,/Base/);assert.match(price,/Target after 5 years/);assert.match(price,/\$157/);
  assert.match(holdings,/What you actually hold/);assert.match(holdings,/Closed \/ not deployed/);
  assert.match(holdings,/Retained fee cash/);assert.match(lifecycleRules(),/Preset simulation rules/);
  close(p.pure,CAPITAL*p.price/r.options.startPrice);
  const improved=simulate({...journeyStart(),revision:'improve'});
  assert.equal(improved.points[1000].valuationCase,'unchanged');assert.equal(improved.points[1600].valuationCase,'improve');
});

test('a defensive review never buys shares to meet a 10 percent target',()=>{
  const r=simulate({...journeyStart(),revision:'pressure'}),e=r.events.find(e=>e.type==='revision');
  assert.ok(e.beforeStock*e.price/e.beforePrincipal<.1);
  close(e.stock,e.beforeStock);close(e.cash,e.beforeCash);
  assert.ok(e.afterSleeves[2]/e.afterPrincipal<=.1);
});
