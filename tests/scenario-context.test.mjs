import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,pathKnots,priceAt,validate} from '../dist/long-term.mjs';
import {journeyStart,updateExperiment,beginReview,chooseDecision,applyReview} from '../dist/experiment.mjs';
import {MARKET_EXAMPLES,marketExample,comparisonContext} from '../dist/scenario-context.mjs';
import {comparisonAt} from '../dist/comparison.mjs';
import {demoDefaults,replaceState} from '../dist/demo-reset.mjs';
import {scenarioExplanation,comparisonControls} from '../dist/scenario-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('examples preserve every pre-review price and use a common path for all portfolios',()=>{
  for(const years of [3,5])for(const shape of ['cycles3','growthStory','bull'])for(const key of Object.keys(MARKET_EXAMPLES)){
    const original=updateExperiment(journeyStart(),{years,shape,end:150}),prior=simulate(original),next=marketExample(original,key),after=simulate(next),base=simulate({...next,revision:'unchanged'});
    for(let day=0;day<=after.eventDay;day++){close(prior.points[day].price,after.points[day].price);close(prior.points[day].nav,after.points[day].nav);}
    assert.deepEqual(after.points.map(x=>x.price),base.points.map(x=>x.price));
    for(const p of after.points){close(p.nav,p.stock*p.price+p.cash);close(p.pure,10000*p.price/next.startPrice);}
    assert.equal(next.coreApr,original.coreApr);assert.equal(next.reinvest,original.reinvest);assert.equal(next.years,original.years);
  }
});

test('loading another example or changing endpoint cannot rewrite the preserved market prefix',()=>{
  const original=marketExample(journeyStart(),'growth'),changed=marketExample(original,'pressure');
  const a=pathKnots(original),b=pathKnots(changed),c=pathKnots(updateExperiment(changed,{end:400}));
  for(let day=0;day<=original.eventYear*365;day++){close(priceAt(a,day),priceAt(b,day));close(priceAt(a,day),priceAt(c,day));}
  assert.notEqual(a.at(-1).price,b.at(-1).price);
  assert.equal(c.at(-1).price,400);assert.equal(pathKnots(changed).at(-1).price,changed.end);
});

test('valuation and review-date changes keep market independent; explicit whole-path changes replace it',()=>{
  const state=marketExample(journeyStart(),'growth'),draft=chooseDecision(beginReview(state),'pressure');
  const applied=applyReview(state,draft),moved=updateExperiment(applied,{eventYear:2});
  assert.deepEqual(pathKnots(state),pathKnots(applied));assert.deepEqual(pathKnots(state),pathKnots(moved));
  assert.equal(updateExperiment(state,{shape:'cycles3'}).marketPath,null);
  assert.equal(updateExperiment(state,{years:3}).marketPath,null);
  assert.equal(validate(moved).eventYear,2);
});

test('example-path validation rejects malformed or out-of-bounds market data',()=>{
  const state=marketExample(journeyStart(),'growth');
  for(const change of [m=>m.knots[1].price=NaN,m=>m.knots[1].day=0,m=>m.knots.at(-1).day=9999,m=>m.fromDay=1825,m=>m.knots[0].price=10]){
    const bad=structuredClone(state);change(bad.marketPath);assert.throws(()=>validate(bad));
  }
  assert.throws(()=>marketExample(state,'unknown'));
});

test('the reported shortfall is distinguished from absolute profit in both languages',()=>{
  const o={...journeyStart(),revision:'pressure',eventYear:3,end:150},r=simulate(o),b=simulate({...o,revision:'unchanged'}),q=comparisonAt(r,b),facts=comparisonContext(r,b,q);
  close(q.totalDelta,-38449.271797629735);close(facts.pnl,14142.882091169766);assert.ok(facts.priceChange>90);close(facts.high,181);
  for(const lang of ['zh','en']){
    configureLocale({},lang);const markup=scenarioExplanation(r,b,q);
    assert.match(markup,/38,449.27/);assert.match(markup,/14,142.88/);assert.match(markup,lang==='zh'?/方案自身盈利/:/plan itself is up/);
    assert.match(markup,lang==='zh'?/不能证明/:/does not by itself prove/);
  }
});

test('explanations reveal only observed market facts and support actual loss states',()=>{
  const state=marketExample(journeyStart(),'growth'),r=simulate(state),b=simulate({...state,revision:'unchanged'});
  configureLocale({},'en');
  for(const day of [0,1459,1460]){
    const q=comparisonAt(r,b,day),html=scenarioExplanation(r,b,q);
    assert.doesNotMatch(html,/Move since review|Low \/ high so far/);
    assert.match(html,day<1460?/has not taken effect/:/no return difference yet/);
  }
  const day=1500,c=comparisonContext(r,b,comparisonAt(r,b,day));
  close(c.high,Math.max(...r.points.slice(1460,1501).map(p=>p.price)));
  const loss=simulate({...state,end:1}),base=simulate({...state,end:1,revision:'unchanged'});
  assert.ok(loss.final.nav<10000);assert.match(scenarioExplanation(loss,base,comparisonAt(loss,base)),/plan itself is down/);
  for(const lang of ['zh','en']){configureLocale({},lang);assert.doesNotMatch(comparisonControls(state),/NaN|undefined/);}
});

test('reset clears all simulation, draft and preview state without retaining obsolete inputs',()=>{
  const current=demoDefaults('2026-09-17'),pristine=structuredClone(current);
  Object.assign(current.state,marketExample({...current.state,apr:45,eventYear:3},'pressure'));
  current.draft.end=399;current.draft.unknown=true;current.flowUi.comparisonDay=500;current.flowUi.documentMarkup='old';
  current.conceptUi.agent.authorized=true;current.conceptUi.vault.amount=300000;current.proofUi.caseKey='pressure';
  const fresh=demoDefaults('2026-09-17');
  for(const key of Object.keys(current))replaceState(current[key],fresh[key]);
  assert.deepEqual(current,pristine);assert.equal(current.state.end,85);assert.equal(current.state.eventYear,4);assert.equal(current.state.view,'overview');
  assert.equal(current.state.apr,undefined);assert.equal(current.state.marketPath,undefined);assert.equal(current.draft.unknown,undefined);
  assert.deepEqual([current.state.coreApr,current.state.activeApr,current.state.buyApr],[14,37.3,14]);
  current.draft.end=2;assert.equal(current.state.end,85);assert.equal(demoDefaults().draft.end,85);
});
