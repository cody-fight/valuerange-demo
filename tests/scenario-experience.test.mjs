import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {journeyStart,updateSimulationControls,reviewSelection,beginReview} from '../dist/experiment.mjs';
import {eventScenario} from '../dist/scenario-context.mjs';
import {pathKnots,priceAt,simulate} from '../dist/long-term.mjs';
import {dailyBridge,candleBuckets} from '../dist/daily-prices.mjs';
import {reviewYears,reviewDay} from '../dist/timeline.mjs';
import {MARKET_PATHS,pathPreview} from '../dist/market-paths.mjs';
import {comparisonAt} from '../dist/comparison.mjs';
import {createFlow,FLOW_ROUTES,flowSteps} from '../dist/flow-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('daily bridge preserves anchors and bounded prices independently of ending target outside its last segment',()=>{
 const a=[{day:0,price:92.02},{day:120,price:165},{day:240,price:52},{day:365,price:133}];
 const daily=dailyBridge(a);assert.equal(daily.length,366);assert.deepEqual(daily,dailyBridge(a));
 for(const p of a)assert.equal(daily[p.day].price,p.price);
 for(let i=1;i<a.length;i++)for(let d=a[i-1].day;d<=a[i].day;d++){
  const base=dailyBridge(a,false)[d].price;assert.ok(Math.abs(daily[d].price/base-1)<=.080000001);
 }
 const other=dailyBridge([...a.slice(0,-1),{day:365,price:400}]);assert.deepEqual(daily.slice(0,241),other.slice(0,241));
 assert.ok(daily.some((p,i)=>i>0&&p.day<120&&p.price<daily[i-1].price));
});

test('three scenarios by five horizons share reproducible candle and simulator prices with exact targets',()=>{
 for(const shape of Object.keys(MARKET_PATHS))for(const years of [1,2,3,4,5]){
  const s=updateSimulationControls(journeyStart(),{shape,years}),k=pathKnots(s),r=simulate(s),c=candleBuckets(k);
  assert.equal(s.end,MARKET_PATHS[shape].end);assert.equal(s.eventYear,reviewYears(years).at(-1));
  assert.equal(k.length,years*365+1);assert.equal(k[0].price,92.02);assert.equal(k.at(-1).price,s.end);
  assert.deepEqual(r.points.map(p=>p.price),k.map(p=>p.price));assert.equal(c.length,60);
  for(const b of c){const prices=k.slice(b.from,b.to+1).map(p=>p.price);assert.equal(b.open,prices[0]);assert.equal(b.close,prices.at(-1));assert.equal(b.high,Math.max(...prices));assert.equal(b.low,Math.min(...prices));}
  assert.deepEqual(k,pathKnots({...s,coreApr:8,reinvest:false,day:0,revision:'pressure'}));
 }
});

test('event changes preserve the whole observed prefix, cannot compound, and no-change restores the base market',()=>{
 for(const years of [1,2,3,4,5])for(const shape of Object.keys(MARKET_PATHS)){
  const original=updateSimulationControls(journeyStart(),{years,shape}),copy=structuredClone(original),base=pathKnots(original);
  for(const eventYear of reviewYears(years))for(const revision of ['improve','pressure']){
   const selected=reviewSelection(original,{revision,eventYear}),effective=eventScenario(selected.state),path=pathKnots(effective),day=reviewDay(eventYear);
   assert.deepEqual(path.slice(0,day+1),base.slice(0,day+1));assert.equal(path.at(-1).price,effective.end);
   assert.equal(selected.state.end,original.end);assert.equal(selected.draft.end,effective.end);
   const again=reviewSelection(reviewSelection(selected.state,{revision:revision==='improve'?'pressure':'improve'}).state,{revision});
   assert.deepEqual(eventScenario(again.state),effective);
   const reset=reviewSelection(again.state,{revision:'unchanged'});assert.deepEqual(pathKnots(eventScenario(reset.state)),base);
  }
  assert.deepEqual(original,copy);
 }
});

test('event comparators share prices, conserve NAV at every action, and attribution reconciles',()=>{
 for(const revision of ['improve','pressure','unchanged'])for(const reinvest of [true,false]){
  const base={...journeyStart(),revision,eventYear:3,reinvest},o=eventScenario(base),r=simulate(o),old=simulate({...o,revision:'unchanged'});
  assert.deepEqual(r.points.map(p=>p.price),old.points.map(p=>p.price));
  for(const e of r.events)close(e.beforeNav,e.afterNav);
  for(const d of [0,500,1095,1300,1825]){
   const q=comparisonAt(r,old,d);close(q.totalDelta,q.positionDelta+q.feeDelta);
   const p=r.points[d];close(p.nav,p.stock*p.price+p.cash);close(p.pure,10000*p.price/base.startPrice);
   assert.ok(p.stock>=0&&p.cash>=0);
   if(d<1095||revision==='unchanged')close(q.totalDelta,0);
  }
 }
});

test('editing the original market preserves the selected event and re-derives its prefix and review date',()=>{
 let s=reviewSelection(journeyStart(),{revision:'pressure'}).state;
 s=updateSimulationControls(s,{years:1,shape:'bull',end:140});
 assert.equal(s.revision,'pressure');assert.equal(s.eventYear,.5);assert.equal(s.end,140);
 assert.deepEqual(pathKnots(eventScenario(s)).slice(0,184),pathKnots(s).slice(0,184));
 assert.equal(beginReview(s).day,183);
});

test('bilingual walkthrough surfaces have only intended controls and tracking follows the result button',async()=>{
 const load=async n=>JSON.parse(await readFile(new URL(`../dist/data/${n}.json`,import.meta.url),'utf8'));
 const [data,documents,historyData,research,feeReference]=await Promise.all(['circle-case','documents','history','research-trail','fee-reference'].map(load));
 assert.deepEqual(FLOW_ROUTES,['simulate','revise','result']);
 for(const lang of ['en','zh']){
  configureLocale({},lang);const state={...updateSimulationControls(journeyStart(),{years:5,shape:'bull'}),revision:'improve',view:'simulate'},draft=beginReview(state);
  const flow=createFlow({state,draft,data,documents,historyData,research,feeReference,ui:{},lab:{},archiveEvidence:()=>''});
  const run=flow.run(),review=flow.review(),result=flow.result();
  assert.doesNotMatch(run,/data-path=|data-input="years"/);assert.match(run,lang==='zh'?/5 年 · 波动上涨/:/5 years · Rally with pullbacks/);assert.match(run,/id="performance-assumptions" >/);assert.ok(run.indexOf('id="run-chart-content"')<run.indexOf('id="performance-assumptions"'));assert.ok(run.indexOf('id="end-number"')>run.indexOf('id="performance-assumptions"'));assert.doesNotMatch(run,/data-detail="settings"/);
  const point=simulate({...state,revision:'unchanged'}).points[state.day];const expected=(Math.abs(point.nav-point.pure)/10000*100).toFixed(2);assert.ok(run.includes(expected+(lang==='zh'?' 个百分点':' pp')));assert.equal((flowSteps('simulate').match(/data-go=/g)||[]).length,3);assert.match(run,/compact-portfolio/);assert.match(run,/data-detail="holdings"/);
  assert.doesNotMatch(run,/position-breakdown|lifecycle-next|class="panel flow-inventory"/);
  assert.match(flow.details('holdings'),/position-breakdown/);assert.match(flow.details('holdings'),/Core LP/);
  assert.match(flow.details('settings'),/id="end-number"/);assert.match(flow.details('settings'),/data-input="reinvest"/);
  assert.equal((pathPreview(state).match(/class="candle (up|down)"/g)||[]).length,120);
  assert.equal((review.match(/data-story=/g)||[]).length,3);assert.doesNotMatch(review,/data-market-example|data-detail="settings"/);
  assert.ok(review.indexOf('tracking-foundation')>review.indexOf('data-go="result"'));
  assert.doesNotMatch(result,/data-result-input|data-market-example|data-detail="settings"/);assert.match(result,/data-go="evidence"/);assert.doesNotMatch(result,/data-go="plan"/);
  assert.equal(flow.plan(),flow.library());assert.match(flow.library(),/STRATEGY \/ VALUERANGE/);assert.equal((flow.library().match(/class="plan-stage-heading"/g)||[]).length,4);assert.doesNotMatch(flowSteps('result'),/data-go="plan"/);assert.match(flowSteps('revise'),/aria-current="step"/);
  assert.doesNotMatch([run,review,result].join(''),/NaN|undefined|Infinity/);
 }
});
