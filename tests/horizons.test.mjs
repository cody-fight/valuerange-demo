import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,validate,pathKnots} from '../dist/long-term.mjs';
import {journeyStart,updateSimulationControls,beginReview,reviewSelection} from '../dist/experiment.mjs';
import {HORIZONS,reviewYears,reviewDay} from '../dist/timeline.mjs';
import {marketExample} from '../dist/scenario-context.mjs';
import {comparisonAt} from '../dist/comparison.mjs';
import {nextMilestone} from '../dist/journey-view.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('all five horizons use valid integer-day reviews and preserve independent inputs',()=>{
  let current={...journeyStart(),end:154,day:1500};
  for(const years of [1,2,3,4,5,1,5]){
    current=updateSimulationControls(current,{years});
    const draft=beginReview(current);
    assert.equal(current.end,154);assert.equal(current.day,years*365);
    assert.ok(reviewYears(years).includes(current.eventYear));assert.equal(draft.day,reviewDay(current.eventYear));
    assert.ok(Number.isInteger(draft.day)&&draft.day>0&&draft.day<years*365);
    const reviewed=reviewSelection(current,{revision:'improve'});
    assert.equal(reviewed.draft.day,draft.day);assert.equal(reviewed.state.end,154);
    const next=nextMilestone({...current,day:draft.day-1});assert.ok(Number.isInteger(next)&&next<=draft.day);
  }
  for(const years of HORIZONS)assert.equal(validate({years}).years,years);
  for(const years of [0,6,1.5,NaN])assert.throws(()=>validate({years}));
  assert.throws(()=>validate({years:1,eventYear:1}));
  assert.throws(()=>validate({years:5,eventYear:.5}));
});

test('one-, two- and four-year scenarios preserve fee accounting and causal review snapshots',()=>{
  for(const years of [1,2,4])for(const shape of ['cycles3','growthStory','pressureStory'])for(const revision of ['unchanged','improve','pressure']){
    const state={...updateSimulationControls(journeyStart(),{years,shape,end:133}),revision};
    const r=simulate(state),base=simulate({...state,revision:'unchanged'});
    assert.equal(r.points.length,years*365+1);assert.equal(r.final.price,133);
    assert.equal(r.eventDay,years===1?183:reviewDay(state.eventYear));
    close(r.reviewSnapshot.nav,r.revisionSnapshot.nav);
    close(r.reviewSnapshot.fees,r.revisionSnapshot.fees);
    assert.equal(comparisonAt(r,base,r.eventDay).totalDelta,0);
    for(const p of r.points){
      close(p.nav,p.stock*p.price+p.cash);
      close(p.nav-10000,p.holdingPnl+p.il+p.management+p.fees);
      if(p.day<r.eventDay)close(p.nav,base.points[p.day].nav);
    }
  }
});

test('one-year matching examples retain the first six months and compare at day 183',()=>{
  const state=updateSimulationControls(journeyStart(),{years:1});
  for(const key of ['growth','pressure','divergence']){
    const example=marketExample(state,key),r=simulate(example),base=simulate({...example,revision:'unchanged'});
    assert.equal(example.marketPath.fromDay,183);
    const knots=pathKnots(example);assert.equal(knots.at(-1).day,365);
    assert.ok(knots.every((p,i)=>i===0||p.day>knots[i-1].day));
    assert.equal(comparisonAt(r,base,183).phase,'review');
    assert.equal(comparisonAt(r,base,184).phase,'after');
    close(r.final.nav-r.final.fees, r.final.principal-r.final.reinvestedFees);
  }
});
