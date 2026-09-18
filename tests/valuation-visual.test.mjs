import test from 'node:test';
import assert from 'node:assert/strict';
import {valuation,pricePosition,simulate,CAPITAL} from '../dist/long-term.mjs';
import {valuationPaint,valuationZones,valuationMap,valuationZonePrice} from '../dist/valuation-visual.mjs';
import {configureLocale} from '../dist/locales/locale.mjs';
import {journeyStart,updateExperiment} from '../dist/experiment.mjs';

test('price visuals follow exact financial boundaries, extremes and revised valuations',()=>{
  configureLocale({},'en');
  for(const key of ['unchanged','improve','pressure']){
    const nodes=valuation(key).map(v=>v.value);
    for(const price of [1,400,...nodes.flatMap(n=>[n-.00001,n,n+.00001])]){
      const actual=valuationPaint(price,key);
      assert.equal(actual.index,pricePosition(price,key).index);
      assert.ok(Number.isFinite(actual.percent)&&actual.percent>=0&&actual.percent<=100);
      const markup=valuationZones(price,key);
      assert.equal((markup.match(/aria-current="true"/g)||[]).length,1);
      assert.ok(markup.includes(`data-zone="${actual.index}" aria-current="true"`));
      assert.match(markup,/Extreme discount/);assert.match(markup,/Extreme premium/);
    }
    assert.equal(valuationPaint(1,key).percent,0);
    assert.equal(valuationPaint(400,key).percent,100);
  }
  assert.notEqual(valuationPaint(192,'unchanged').index,valuationPaint(192,'improve').index);
  const map=valuationMap(88.53,'unchanged',true);
  assert.match(map,/Core LP/);assert.match(map,/Active LP/);
  assert.match(map,/linear price scale/);assert.match(map,/not scenario probabilities/);
});

test('quick prices stay inside the selected zone for each applied valuation',()=>{
  for(const key of ['unchanged','improve','pressure'])for(let i=0;i<5;i++){
    const target=valuationZonePrice(i,key);
    assert.ok(Number.isInteger(target)&&target>=1&&target<=400);
    assert.equal(pricePosition(target,key).index,i,`${key}, zone ${i}, price ${target}`);
  }
  assert.deepEqual([0,1,2,3,4].map(i=>valuationZonePrice(i)),[6,24,62,133,222]);
  assert.equal(valuationZonePrice(4,'improve'),400); // Preserve the valid slider range.
  for(const invalid of [-1,5,1.5,NaN])assert.throws(()=>valuationZonePrice(invalid));
});

test('only simulation cards are controls; manual prices highlight their containing zone',()=>{
  for(const lang of ['en','zh']){
    configureLocale({},lang);
    for(const price of [6,24,73,133,222]){
      const markup=valuationZones(price,'unchanged',{interactive:true});
      assert.equal((markup.match(/type="button"/g)||[]).length,5);
      assert.equal((markup.match(/aria-pressed="true"/g)||[]).length,1);
      assert.match(markup,new RegExp(`data-end-zone="${pricePosition(price).index}" aria-pressed="true"`));
      assert.ok(markup.includes(lang==='en'?'Set ending target price to':'将到期目标价设为'));
    }
    assert.doesNotMatch(valuationMap(92.02,'unchanged',true),/data-end-zone/);
  }
});

test('zone selection changes only ending price and recalculates the existing portfolio model',()=>{
  for(const revision of ['unchanged','improve','pressure']){
    const before=updateExperiment(journeyStart(),{revision,shape:'pressureStory',end:73});
    const original=simulate(before);
    for(let i=0;i<5;i++){
      const target=valuationZonePrice(i,revision);
      const next=updateExperiment(before,{end:target});
      assert.deepEqual(next,{...before,end:target});
      const result=simulate(next),p=result.final;
      assert.equal(p.price,target);
      assert.notEqual(p.nav,original.final.nav);
      assert.ok(Math.abs(p.holdingPnl+p.il+p.management+p.fees-(p.nav-CAPITAL))<1e-6);
    }
  }
});
