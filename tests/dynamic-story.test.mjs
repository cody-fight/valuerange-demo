import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,valuation,priceAt,CASES} from '../dist/long-term.mjs';
import {storyDefaults,applyProposal,updateExperiment} from '../dist/experiment.mjs';
const close=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<t,a+' != '+b);
test('material revisions recalculate four asymmetric valuation boundaries',()=>{
  [33.385652,79.716201,174.023747,328.126751].forEach((v,i)=>close(valuation('improve')[i].value,v));
  [6.350474,17.392363,41.900121,83.862663].forEach((v,i)=>close(valuation('pressure')[i].value,v));
  const base=valuation().map(n=>n.value),newNodes=valuation('improve').map(n=>n.value);
  assert.ok(Math.abs(newNodes[0]/base[0]-newNodes[3]/base[3])>.5);
  assert.deepEqual(CASES.improve.core,[Number(newNodes[1].toFixed(2)),Number(newNodes[3].toFixed(2))]);
});
test('growth increases stock exposure, pauses Active and earns fees only on retained Core',()=>{
  const o={...storyDefaults('improve'),reinvest:false},r=simulate(o),baseline=simulate({...o,revision:'unchanged'}),p=r.points[r.eventDay];
  assert.ok(p.stock>baseline.points[r.eventDay].stock);
  p.sleeves.forEach((v,i)=>close(v/p.principal,[.25,0,.7,.05][i]));
  assert.ok(r.points.slice(r.eventDay).every(p=>p.phase==='paused'&&p.activeLiquidity===0));
  assert.ok(!r.events.some(e=>e.day>r.eventDay&&['sell','buy','sell-open','buy-open'].includes(e.type)));
  assert.ok(r.final.fees>p.fees); // Remaining in-range Core is still working.
  close(simulate({...o,apr:0}).final.principal,r.final.principal);
});
test('pressure exits all LP and stops fee accrual without stabilization evidence',()=>{
  const r=simulate(storyDefaults('pressure'));
  assert.ok(r.points.slice(r.eventDay).every(p=>p.coreLiquidity===0&&p.activeLiquidity===0&&p.policy==='defensive'));
  close(r.final.fees,r.points[r.eventDay].fees);
  close(r.points[r.eventDay].sleeves[3]/r.points[r.eventDay].principal,.9);
  assert.equal(r.events.filter(e=>e.type==='rebuild').length,0);
});
test('rebuilding requires both a prior review and price within new neutral band, conserves assets',()=>{
  const o={...storyDefaults('pressure'),recovery:true},r=simulate(o),review=r.events.find(e=>e.type==='review'),rebuild=r.events.find(e=>e.type==='rebuild'),n=valuation('pressure').map(n=>n.value);
  assert.equal(review.day,r.eventDay+365);assert.ok(rebuild.day>review.day);
  assert.ok(rebuild.price>=n[1]&&rebuild.price<=n[2]);
  for(let day=review.day;day<rebuild.day;day++)assert.ok(r.points[day].price>n[2]||r.points[day].price<n[1]);
  assert.equal(r.events.filter(e=>e.type==='rebuild').length,1);
  close(rebuild.beforeNav,rebuild.afterNav);close(rebuild.stockDelta*rebuild.price+rebuild.cashDelta,0);
  const p=r.points[rebuild.day];p.sleeves.forEach((v,i)=>close(v/p.principal,[.2,0,.1,.7][i]));
  assert.ok(r.final.fees>r.points[review.day].fees);
  const outOfRange=simulate({...o,shape:'bull',end:280});
  assert.equal(outOfRange.events.filter(e=>e.type==='rebuild').length,0);
});
test('representative stories share the pre-event market and never read the final price early',()=>{
  const a=simulate(storyDefaults('improve')),b=simulate(storyDefaults('pressure'));
  assert.deepEqual(a.points.slice(0,730),b.points.slice(0,730));
  close(a.points[730].price,100);close(b.points[730].price,100);
  for(const key of ['improve','pressure','unchanged']){
    const o=storyDefaults(key),low=simulate({...o,end:1,recovery:true}),high=simulate({...o,end:400,recovery:true}),lastLeg=low.knots.at(-2).day;
    assert.deepEqual(low.points.slice(0,lastLeg+1),high.points.slice(0,lastLeg+1));
    const fixed=simulate({...o,revision:'unchanged'}),dynamic=simulate(o);
    assert.deepEqual(dynamic.points.map(p=>p.price),fixed.points.map(p=>p.price));
    close(priceAt(dynamic.knots,dynamic.eventDay),100);
  }
});
test('favorable stories show principal-management value, while adverse results remain possible',()=>{
  for(const key of ['improve','pressure']){
    const o=storyDefaults(key,0),r=simulate(o),fixed=simulate({...o,revision:'unchanged'});
    assert.ok(r.final.nav-fixed.final.nav>7000);
  }
  const growth=simulate(storyDefaults('improve',0));assert.ok(growth.final.nav<growth.final.pure);
  const wrongWay={...storyDefaults('improve',0),shape:'decline',end:24},r=simulate(wrongWay),fixed=simulate({...wrongWay,revision:'unchanged'});
  assert.ok(r.final.nav<fixed.final.nav);
});
test('applying transfers the full scenario; preview and later simulations stay independent',()=>{
  const applied=storyDefaults('unchanged',15),draft=updateExperiment(storyDefaults('pressure',0),{years:3,eventYear:1,end:40,recovery:true,day:500});
  const original=structuredClone(applied),next=applyProposal(applied,draft);
  assert.deepEqual(applied,original);
  for(const k of Object.keys(draft))assert.equal(next[k],draft[k]);
  const edited=updateExperiment(next,{years:5,apr:45});
  assert.equal(draft.years,3);assert.equal(draft.apr,0);assert.equal(edited.apr,45);
});
