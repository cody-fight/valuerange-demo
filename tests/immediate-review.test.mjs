import {journeyStart} from './archived-journey.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewSelection} from '../dist/experiment.mjs';
import {simulate,valuation} from '../dist/long-term.mjs';
import {marketExample} from '../dist/scenario-context.mjs';

test('review selection immediately changes shared results without altering market prices or observation',()=>{
  const initial={...journeyStart(),end:296,day:700,view:'revise'},original=structuredClone(initial),baseline=simulate(initial);
  for(const revision of ['improve','pressure']){
    const {state,draft}=reviewSelection(initial,{revision});
    assert.equal(state.revision,revision);assert.equal(draft.revision,revision);
    assert.equal(state.day,700);assert.equal(draft.day,state.eventYear*365);
    for(const key of ['startPrice','end','shape','years','coreApr','activeApr','buyApr','cycles','reinvest'])assert.equal(state[key],initial[key]);
    const r=simulate(state);
    assert.deepEqual(r.points.map(p=>p.price),baseline.points.map(p=>p.price));
    assert.deepEqual(r.points.slice(0,r.eventDay),baseline.points.slice(0,r.eventDay));
    assert.notEqual(r.final.nav,baseline.final.nav);
    assert.notDeepEqual(valuation(state.revision),valuation(initial.revision));
  }
  assert.deepEqual(initial,original);
});

test('review year, fee edits and restored stable thesis stay synchronized',()=>{
  let state={...journeyStart(),day:600},draft;
  for(const patch of [{revision:'improve'},{eventYear:3},{coreApr:7,reinvest:false},{revision:'unchanged'}]){
    ({state,draft}=reviewSelection(state,patch));
    for(const key of ['revision','eventYear','coreApr','reinvest','end','shape'])assert.equal(draft[key],state[key]);
    assert.equal(state.day,600);assert.equal(draft.day,state.eventYear*365);
  }
  assert.equal(state.revision,'unchanged');assert.equal(state.eventYear,3);
  assert.equal(state.coreApr,7);assert.equal(state.reinvest,false);
});

test('an explicit price example survives subsequent immediate valuation changes',()=>{
  const initial=marketExample({...journeyStart(),day:800},'pressure');
  const {state,draft}=reviewSelection(initial,{revision:'improve',eventYear:3});
  assert.deepEqual(state.marketPath,initial.marketPath);assert.deepEqual(draft.marketPath,initial.marketPath);
  assert.deepEqual(simulate(state).points.map(p=>p.price),simulate(initial).points.map(p=>p.price));
  assert.equal(state.end,initial.end);assert.equal(state.day,initial.day);
});
