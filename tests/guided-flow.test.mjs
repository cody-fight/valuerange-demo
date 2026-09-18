import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createFlow} from '../dist/flow-view.mjs';
import {simulate} from '../dist/long-term.mjs';
import {experimentDefaults,storyDefaults,beginReview,chooseDecision,applyReview} from '../dist/experiment.mjs';
import {createLab} from '../dist/lab.mjs';
import {configureLocale,setLanguage} from '../dist/locales/locale.mjs';
const root=new URL('../dist/data/',import.meta.url);
const load=async name=>JSON.parse(await readFile(new URL(name+'.json',root),'utf8'));
const [data,documents,proposals,historyData,research,feeReference]=await Promise.all(['circle-case','documents','prepared-proposals','history','research-trail','fee-reference'].map(load));
const catalog=JSON.parse(await readFile(new URL('../dist/locales/en.json',import.meta.url),'utf8'));
const defaults=experimentDefaults();
function fixture(state,draft){const lab=createLab({state,draft,data,documents,proposals,defaults,historyData,research,feeReference});return createFlow({state,draft,data,documents,historyData,research,feeReference,lab,archiveEvidence:()=>'<p>Archived live detail</p>',ui:{}});}
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

test('guided rendering preserves its inputs and the existing portfolio calculations',()=>{
  configureLocale(catalog,'en');
  for(const revision of ['improve','pressure','unchanged'])for(const reinvest of [false,true]){
    const state={...storyDefaults('unchanged'),view:'simulate',coreApr:12.5,activeApr:31.2,buyApr:9.5,reinvest};
    const draft=chooseDecision(beginReview(state),revision),baseline=structuredClone({state,draft,data});
    const original=simulate(state),flow=fixture(state,draft);
    for(const lang of ['zh','en']){
      setLanguage(lang);
      for(const view of ['home','plan','run','review','result','evidence','library','future'])assert.ok(flow[view]().length>0);
      for(const key of ['settings','price','plan','foundation','reviewReason','factors','returns','research','live'])assert.ok(flow.details(key,['factors','reviewReason'].includes(key)).length>0);
    }
    assert.deepEqual({state,draft,data},baseline);
    assert.deepEqual(simulate(state),original);
    Object.assign(state,applyReview(state,draft),{view:'result'});
    setLanguage('en');
    const outcome=simulate(state),fixed=simulate({...state,revision:'unchanged'}),markup=flow.result();
    for(const value of [outcome.final.nav,fixed.final.nav,outcome.final.pure])assert.ok(markup.includes(usd(value)));
    assert.ok(markup.includes(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(outcome.final.fees)));
    assert.equal(state.shape,baseline.state.shape);
    assert.equal(state.reinvest,reinvest);
    assert.equal(state.coreApr,12.5);
  }
});

test('simplified surface keeps live dates, fee inclusion, benchmark labels and detail access',()=>{
  configureLocale(catalog,'en');
  const state={...defaults,view:'simulate'},draft=beginReview(state),flow=fixture(state,draft);
  assert.match(flow.home(),/Start with company value/);
  assert.doesNotMatch(flow.home(),/data-go="evidence"/);
  assert.match(flow.plan(),/data-detail="foundation"/);
  assert.match(flow.plan(),/Normalized earnings/);
  assert.match(flow.details('foundation'),/EBITDA × valuation multiple/);
  assert.match(flow.run(),/Fees included in assets/);
  assert.match(flow.run(),/Buy-and-hold shares/);
  assert.match(flow.review(),/archived news is separate/i);
  assert.doesNotMatch(flow.review(),/data-flow-apply/);
  assert.match(flow.review(),/Selections update Run it and Compare immediately/);
  assert.match(flow.review(),/data-go="result"/);
  assert.match(flow.evidence(),new RegExp(data.snapshotAt.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(flow.evidence(),/Cumulative marked fee value/);
  assert.match(flow.evidence(),/Excess vs pure CRCLx/);
  assert.match(flow.evidence(),/neither is total portfolio profit/);
  assert.match(flow.evidence(),/data-detail="live"/);
  assert.doesNotMatch(flow.evidence(),/Since-inception P&L|data-go="future"/);
  assert.equal(flow.details('live'),'<p>Archived live detail</p>');
  assert.ok(flow.evidence().includes(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(historyData.feeHistory.total)));
  assert.match(flow.library(),/Skill-defined constraints/);
  assert.match(flow.library(),/do not call AI live/);
  assert.match(flow.future(),/Not yet built/);
  assert.match(flow.details('settings'),/data-input="cycles"/);
});
