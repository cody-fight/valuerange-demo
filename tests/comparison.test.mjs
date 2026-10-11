import {journeyStart} from './archived-journey.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../dist/long-term.mjs';
import {updateExperiment} from '../dist/experiment.mjs';
import {comparisonAt,comparisonDay} from '../dist/comparison.mjs';
import {createFlow} from '../dist/flow-view.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const money=(n,d=2)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(n);
const example=()=>({...journeyStart(),shape:'growthStory',end:158,revision:'improve',view:'result',day:1460});

test('the reported positive asset difference includes a negative fee income difference',()=>{
  const state=example(),a=simulate(state),b=simulate({...state,revision:'unchanged'}),q=comparisonAt(a,b);
  close(q.totalDelta,4542.12902553544);close(q.feeDelta,-142.2562479208791);close(q.positionDelta,4684.385273456319);
  close(q.positionDelta+q.feeDelta,q.totalDelta);
  close(q.point.fees,9102.75755329647);close(q.original.fees,9245.013801217348);
});

test('comparison decomposition uses one observation point and has no difference before review',()=>{
  for(const revision of ['unchanged','improve','pressure'])for(const reinvest of [false,true]){
    const state={...example(),revision,reinvest},r=simulate(state),base=simulate({...state,revision:'unchanged'});
    for(const day of [0,800,1459,1460,1551,1825]){
      const q=comparisonAt(r,base,day);
      assert.equal(q.point,r.points[day]);assert.equal(q.original,base.points[day]);
      close(q.feeDelta,r.points[day].fees-base.points[day].fees);
      close(q.positionDelta+q.feeDelta,r.points[day].nav-base.points[day].nav);
      close(q.display.positionDelta+q.display.feeDelta,q.display.totalDelta);
      assert.ok(Math.abs(q.display.positionDelta-q.positionDelta)<.010001);
      if(day<=1460||revision==='unchanged'){close(q.totalDelta,0);close(q.feeDelta,0);}
    }
  }
});

test('comparison cursor changes only inspection, including details and both languages',()=>{
  const state=example(),ui={},flow=createFlow({state,draft:state,ui}),before=structuredClone(state);
  assert.equal(flow.resultDay(),1825); // first comparison opens at the end, preserving the existing behavior
  for(const lang of ['zh','en']){
    configureLocale({},lang);
    for(const day of [0,1460,1551,1825]){
      ui.comparisonDay=day;const q=flow.comparisonSnapshot(),markup=flow.resultPanels(),detail=flow.details('returns');
      assert.ok(markup.includes(`value="${day}"`));
      for(const v of [q.point.nav,q.original.nav,q.point.pure])assert.ok(markup.includes(money(v,0)));
      for(const v of [q.point.fees,q.original.fees,Math.abs(q.totalDelta),Math.abs(q.feeDelta)])assert.ok(markup.includes(money(v)));
      assert.ok(detail.includes(money(q.point.fees)));
      assert.doesNotMatch(markup,/NaN|undefined/);
    }
  }
  assert.deepEqual(state,before);
});

test('comparison inspection clamps to the shorter horizon without changing simulation settings',()=>{
  for(const [input,output] of [[null,1095],[undefined,1095],[1825,1095],[-12,0],[NaN,1095],[400.8,401]])assert.equal(comparisonDay(input,1095),output);
  const state=updateExperiment(example(),{years:3}),ui={comparisonDay:1825},flow=createFlow({state,draft:state,ui});
  assert.equal(flow.resultDay(),1095);assert.equal(flow.comparisonSnapshot().day,1095);
});
