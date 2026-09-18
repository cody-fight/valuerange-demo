import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {simulate,CASES,allocationPlan} from '../dist/long-term.mjs';
import {experimentDefaults,updateExperiment,beginReview,chooseDecision,applyReview,journeyStart} from '../dist/experiment.mjs';
import {nextMilestone,feeDecisionBridge} from '../dist/journey-view.mjs';
import {AI_POLICIES} from '../dist/ai-policies.mjs';
import {proofView} from '../dist/proof-view.mjs';
const load=name=>readFile(new URL('../dist/data/'+name+'.json',import.meta.url),'utf8').then(JSON.parse);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('review changes a decision without substituting market, fees or holding horizon',()=>{
  const initial=updateExperiment(experimentDefaults(),{years:3,eventYear:1,shape:'bull',end:193,coreApr:8,activeApr:22,buyApr:9,reinvest:false,cycles:false});
  const source=structuredClone(initial);
  for(const revision of ['improve','pressure','unchanged']){
    const draft=chooseDecision(beginReview(initial),revision);
    for(const k of ['years','eventYear','shape','end','coreApr','activeApr','buyApr','reinvest','cycles'])assert.equal(draft[k],initial[k]);
    const next=applyReview(initial,draft);
    assert.equal(next.day,365);assert.equal(next.revision,revision);
    assert.deepEqual(initial,source);
    const a=simulate(initial),b=simulate(next);
    assert.deepEqual(a.knots,b.knots);
    assert.deepEqual(a.points.slice(0,365),b.points.slice(0,365));
    assert.deepEqual(a.reviewSnapshot,b.reviewSnapshot);
  }
});

test('five-year apply returns to the decision point and milestone navigation reaches the end',()=>{
  const s=applyReview(experimentDefaults(),chooseDecision(beginReview(experimentDefaults()),'pressure'));
  assert.equal(s.day,730);
  let day=0; // Visitors can still scrub back from the default end-of-year view.
  const guided=journeyStart({...s,coreApr:9,reinvest:false});
  assert.equal(guided.shape,'cycles3');assert.equal(guided.end,85);assert.equal(guided.revision,'unchanged');
  assert.equal(guided.years,5);assert.equal(guided.day,1825);assert.equal(guided.eventYear,4);
  assert.equal(guided.coreApr,9);assert.equal(guided.reinvest,false);
  assert.equal(beginReview(guided).day,1460);
  assert.equal(updateExperiment(guided,{years:3}).eventYear,2);
  assert.deepEqual(simulate(guided).knots,simulate({...guided,eventYear:2}).knots);
  for(let i=0;day<1825;i++){
    assert.ok(i<60);const next=nextMilestone({...s,day});assert.ok(next>day&&next<=1825);day=next;
  }
  assert.equal(nextMilestone({...s,day}),1825);
});

test('review snapshot preserves accrued fees and capital before same-day compounding',()=>{
  for(const revision of ['improve','pressure','unchanged']){
    const r=simulate({revision,shape:'growthStory',end:280,reinvest:true});
    const a=r.reviewSnapshot,b=r.revisionSnapshot;
    close(a.nav,b.nav);close(a.fees,b.fees);close(a.feeCash,b.feeCash);
    close(a.reinvestedFees,b.reinvestedFees);
    assert.equal(a.day,730);assert.equal(b.day,730);
    if(revision==='pressure'){
      close(b.feeRunRates.core,0);close(b.feeRunRates.active,0);
      close(r.final.fees,a.fees);
    }
    if(revision==='improve'){
      assert.ok(b.feeRunRates.core>0);close(b.feeRunRates.active,0);
      assert.ok(r.points[730].reinvestedFees>b.reinvestedFees);
    }
  }
});

test('fee tradeoff reconciles total delta with and without reinvestment',()=>{
  for(const reinvest of [false,true])for(const revision of ['improve','pressure']){
    const settings={reinvest,revision,shape:'growthStory',end:280};
    const r=simulate(settings),fixed=simulate({...settings,revision:'unchanged'});
    const fees=r.final.fees-fixed.final.fees;
    const rest=(r.final.nav-r.final.fees)-(fixed.final.nav-fixed.final.fees);
    close(fees+rest,r.final.nav-fixed.final.nav);
    const view=feeDecisionBridge(r,fixed);
    assert.ok(!view.includes('NaN')&&!view.includes('undefined'));
    assert.match(view,/其余项含复投后资产涨跌/);
  }
});

test('simulation uses archived candidate bands and given goals with bounded inputs',async()=>{
  const ai=await load('ai-evidence');assert.equal(ai.runs.length,2);
  for(const run of ai.runs){
    const input=await load('ai-input-'+run.case),p=run.candidate;
    assert.equal(p.decision,'candidate_only');
    assert.deepEqual(p.coreRange,CASES[run.case].core);
    assert.deepEqual(p.weights,allocationPlan(run.case,100).weights);
    assert.deepEqual(p.weights,input.caseInput.goalWeights);
    assert.equal(AI_POLICIES[run.case].sourceId,ai.id+'-'+run.case);
    assert.ok(input.priceHistory.every(k=>k.day<=input.existingAtReview.day));
    assert.equal(input.existingAtReview.day,730);
    assert.ok(!Object.hasOwn(input,'end')&&!Object.hasOwn(input,'futurePrices'));
    assert.match(run.inputSha256,/^[a-f0-9]{64}$/);assert.match(run.rawOutputSha256,/^[a-f0-9]{64}$/);
    const encoded=JSON.stringify({run,input});
    assert.doesNotMatch(encoded,/PRIVATE SKILL|PRIVATE PROMPT|G:\\|C:\\Users|SKILL\.md/);
  }
});

test('daily run retains actual degraded status and never substitutes candidate generation for monitoring',async()=>{
  const workflow=await load('workflow-evidence'),ai=await load('ai-evidence');
  assert.equal(workflow.status,'degraded');assert.equal(workflow.modules.length,10);
  assert.deepEqual(workflow.modules.slice(0,4).map(n=>n.id),['preflight','nav_snapshot','execution_reconcile','pnl_review']);
  assert.ok(workflow.modules.find(n=>n.id==='news_candidates').degraded);
  assert.ok(!workflow.modules.some(n=>n.id==='amm_generation'));
  const page=proofView('runs',{workflow,ai});
  assert.match(page,/没有生成新 LP 区间/);assert.match(page,/覆盖降级/);
  for(const caseKey of ['improve','pressure']){
    const candidate=proofView('candidates',{workflow,ai,caseKey});
    assert.match(candidate,/比例是给定的演示目标/);
    assert.match(candidate,/改变案例输入后/);
    assert.ok(!candidate.includes('undefined')&&!candidate.includes('NaN'));
  }
});
