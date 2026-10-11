import {eventScenario} from '../dist/scenario-context.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyStart,updateSimulationControls,reviewSelection} from '../dist/experiment.mjs';
import {marketExample} from '../dist/scenario-context.mjs';
import {simulate} from '../dist/long-term.mjs';
import {comparisonAt} from '../dist/comparison.mjs';
import {scenarioExplanation} from '../dist/scenario-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
import {MARKET_PATHS,pathOptions,pathPreview} from '../dist/market-paths.mjs';

test('visible scenarios load their default target while retaining horizon and fees',()=>{
  const current={...marketExample(journeyStart(),'growth'),end:154,coreApr:9.1,reinvest:false};
  const saved=structuredClone(current);
  for(const shape of Object.keys(MARKET_PATHS)){
    const next=updateSimulationControls(current,{shape});
    assert.equal(next.end,MARKET_PATHS[shape].end);assert.equal(next.years,5);assert.equal(next.marketPath,null);
    assert.equal(next.coreApr,9.1);assert.equal(next.reinvest,false);
    assert.equal(simulate(next).final.price,MARKET_PATHS[shape].end);
    const review=reviewSelection(current,{shape});
    assert.equal(review.state.end,MARKET_PATHS[shape].end);assert.equal(review.draft.end,eventScenario(review.state).end);
  }
  assert.deepEqual(current,saved);
  const shorter=updateSimulationControls(current,{years:3});
  assert.equal(shorter.end,154);assert.equal(shorter.eventYear,2);assert.equal(shorter.day,1095);
  assert.equal(updateSimulationControls(current,{shape:'pressureStory',end:30}).end,30);
});

test('every selectable price path has an unambiguous selected option and a preview of its actual endpoints',()=>{
  for(const lang of ['zh','en']){
    configureLocale({},lang);
    for(const shape of Object.keys(MARKET_PATHS)){
      const state=updateSimulationControls(journeyStart(),{shape,end:154,years:1});
      const options=pathOptions(state),preview=pathPreview(state);
      assert.equal((options.match(/selected/g)||[]).length,1);
      assert.ok(options.includes(`value="${shape}" selected`));
      assert.match(preview,/\$92\.02/);assert.match(preview,/\$154/);
      assert.doesNotMatch(preview,/NaN|undefined|Infinity/);
    }
    const state=marketExample(journeyStart(),'growth');
    const options=pathOptions(state);
    assert.equal((options.match(/selected/g)||[]).length,1);
    assert.match(options,/value="example" selected disabled/);
    assert.doesNotMatch(pathPreview(state),/NaN|undefined|Infinity/);
  }
});

test('review explanations cannot use an unobserved endpoint to diagnose a valuation error',()=>{
  const state={...journeyStart(),revision:'improve',eventYear:3};
  const low=simulate({...state,end:1}),high=simulate({...state,end:400});
  const lowBase=simulate({...state,end:1,revision:'unchanged'}),highBase=simulate({...state,end:400,revision:'unchanged'});
  for(const lang of ['zh','en']){
    configureLocale({},lang);
    const day=1200,html=scenarioExplanation(low,lowBase,comparisonAt(low,lowBase,day));
    assert.equal(html,scenarioExplanation(high,highBase,comparisonAt(high,highBase,day)));
    assert.match(html,lang==='zh'?/待核对的可能原因/:/possibilities to investigate/);
    assert.match(html,/data-go="library"/);
    assert.doesNotMatch(scenarioExplanation(low,lowBase,comparisonAt(low,lowBase,1095)),/result-review-checks/);
  }
});
