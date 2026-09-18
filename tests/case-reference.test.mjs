import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,validate,pricePosition,CAPITAL,START_PRICE} from '../dist/long-term.mjs';
import {DEMO_REFERENCE} from '../dist/demo-reference.mjs';
import {journeyStart,updateExperiment,beginReview,chooseDecision,applyReview,storyDefaults,PATH_ENDS} from '../dist/experiment.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('dated demonstration opening price seeds every sleeve and the equal-capital benchmark',()=>{
  const s=journeyStart(),r=simulate(s),p=r.points[0];
  assert.equal(s.startPrice,DEMO_REFERENCE.close);
  assert.equal(p.price,92.02);assert.equal(r.knots[0].price,p.price);
  close(p.nav,CAPITAL);close(p.pure,CAPITAL);close(p.hold,CAPITAL);
  close(p.feeRunRates.core,CAPITAL*.389545*.14);
  close(p.feeRunRates.active,CAPITAL*.2*.373);
  // At 92.02 Active is in range; its cash component must be funded at inception.
  assert.ok(r.initial.cash>CAPITAL*.03836);
  close(r.initial.stock*p.price+r.initial.cash,CAPITAL);
  close(r.final.pure,CAPITAL*s.end/s.startPrice);
  // Archived analytical defaults are deliberately separate from the new walkthrough.
  assert.equal(START_PRICE,88.53);
  assert.equal(simulate().points[0].price,88.53);
});

test('named path presets reset endpoints and observation time while preserving fee choices',()=>{
  const seed={...journeyStart(),years:3,eventYear:2,day:0,coreApr:9,activeApr:22,buyApr:8,reinvest:false};
  for(const [shape,index] of [['growthStory',3],['cycles3',2],['pressureStory',1]]){
    const s=updateExperiment(seed,{shape});
    assert.equal(s.end,PATH_ENDS[shape]);assert.equal(pricePosition(s.end).index,index);
    assert.equal(s.day,1095);assert.equal(s.years,3);assert.equal(s.eventYear,2);
    assert.equal(s.startPrice,92.02);assert.equal(s.coreApr,9);assert.equal(s.activeApr,22);assert.equal(s.buyApr,8);assert.equal(s.reinvest,false);
    assert.equal(simulate(s).final.price,s.end);
    const custom=updateExperiment(s,{end:199});assert.equal(custom.end,199);
    assert.equal(updateExperiment(custom,{shape}).end,PATH_ENDS[shape]);
    const explicit=updateExperiment(seed,{shape,end:207,day:200});
    assert.equal(explicit.end,207);assert.equal(explicit.day,200);
  }
});

test('review, apply and prepared story loading preserve the demonstration opening price',()=>{
  const s=journeyStart(),original=simulate(s);
  for(const key of ['improve','pressure','unchanged']){
    const draft=chooseDecision(beginReview(s),key),next=applyReview(s,draft),r=simulate(next);
    assert.equal(next.startPrice,s.startPrice);
    assert.deepEqual(r.knots,original.knots);
    assert.deepEqual(r.reviewSnapshot,original.reviewSnapshot);
    close(r.revisionSnapshot.nav,r.reviewSnapshot.nav);
    assert.equal(storyDefaults(key,s).startPrice,s.startPrice);
  }
});

test('new starting price reconciles P&L and fee accounting across paths and decisions',()=>{
  for(const shape of ['growthStory','cycles3','pressureStory'])for(const revision of ['unchanged','improve','pressure'])for(const reinvest of [false,true]){
    const r=simulate({...updateExperiment(journeyStart(),{shape}),revision,reinvest});
    for(const p of [r.points[0],r.reviewSnapshot,r.revisionSnapshot,r.final]){
      close(p.nav-CAPITAL,p.holdingPnl+p.il+p.management+p.fees);
      close(p.fees,p.feeCash+p.reinvestedFees);close(p.nav,p.principal+p.feeCash);
      close(p.pure,CAPITAL*p.price/92.02);
    }
    for(const event of r.events)close(event.beforeNav,event.afterNav);
  }
});

test('opening price validates independently of the ending price',()=>{
  for(const startPrice of [0,-1,Infinity,NaN,401,'92.02',null])assert.throws(()=>validate({startPrice}));
  for(const startPrice of [30,90,92.02,115,200]){
    const r=simulate({startPrice,shape:'bull',end:startPrice,apr:0,reinvest:false});
    close(r.final.nav,CAPITAL);close(r.final.pure,CAPITAL);
  }
});
