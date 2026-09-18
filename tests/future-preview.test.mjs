import test from 'node:test';
import assert from 'node:assert/strict';
import {conceptDefaults,submitConcept,conceptAction,vaultReport,agentDecision,conceptPage} from '../dist/future-preview.mjs';
import {journeyStart} from '../dist/experiment.mjs';
import {simulate} from '../dist/long-term.mjs';
import {setLanguage} from '../dist/locales/locale.mjs';

test('vault report reconciles with the unchanged simulator and scales by capital',()=>{
  const original=journeyStart(),copy=structuredClone(original),p=simulate(original).points[365];
  for(const amount of [100,12345.67,1000000]){
    const r=vaultReport(amount),sum=r.holding+r.il+r.management+r.fees;
    assert.ok(Math.abs(r.nav-amount-sum)<1e-7);
    assert.ok(Math.abs(r.nav-p.nav*amount/10000)<1e-7);
    assert.ok(Math.abs(r.nav-r.sleeves.reduce((a,b)=>a+b,0)-r.feeCash)<1e-7);
  }
  assert.deepEqual(original,copy);
});
test('setup validates inputs, preserves independent states and clears superseded permission previews',()=>{
  const seed=conceptDefaults(),before=structuredClone(seed);
  for(const amount of ['',0,99,-500,1000001,NaN,Infinity,100.001])assert.throws(()=>submitConcept(seed,'vault','setup',{amount}));
  assert.equal(conceptAction(seed,'vault','step',2).vault.step,0);
  let u=submitConcept(seed,'vault','setup',{amount:'25000.50'});
  assert.equal(u.vault.amount,25000.5);assert.deepEqual(u.agent,seed.agent);assert.deepEqual(seed,before);
  for(const asset of ['', '<img>', 'A/B', 'X'.repeat(13)])assert.throws(()=>submitConcept(seed,'agent','setup',{asset,amount:10000,goal:'growth'}));
  u=submitConcept(u,'agent','setup',{asset:'nvda',amount:10000,goal:'growth'});
  u=submitConcept(u,'agent','permissions',{mode:'agent',limit:10});assert.equal(agentDecision(u.agent),'needs-research');
  setLanguage('en');const custom=conceptPage('agent',conceptAction(u,'agent','step',1));
  assert.doesNotMatch(custom,/\$58|\$90|<img>/);assert.match(custom,/Research setup needed/);
  u=submitConcept(u,'agent','setup',{asset:'CIRCLE',amount:20000,goal:'income'});
  assert.equal(u.agent.authorized,false);assert.equal(conceptAction(u,'agent','step',2).agent.step,1);
  assert.equal(u.vault.amount,25000.5);
});
test('agent preview respects mode, cap, research, material changes, pause and revocation',()=>{
  let u=submitConcept(conceptDefaults(),'agent','setup',{asset:'CIRCLE',amount:10000,goal:'growth'});
  assert.equal(agentDecision(u.agent),'not-authorized');
  u=submitConcept(u,'agent','permissions',{mode:'manual',limit:5});assert.equal(agentDecision(u.agent),'manual');
  u=submitConcept(u,'agent','permissions',{mode:'agent',limit:5});assert.equal(agentDecision(u.agent),'over-limit');
  u=submitConcept(u,'agent','permissions',{mode:'agent',limit:10});assert.equal(agentDecision(u.agent),'within-limit');
  u=conceptAction(u,'agent','event','fundamental');assert.equal(agentDecision(u.agent),'review');
  u=conceptAction(u,'agent','event','unverified');assert.equal(agentDecision(u.agent),'watch');
  u=conceptAction(u,'agent','pause','');assert.equal(agentDecision(u.agent),'paused');
  u=conceptAction(u,'agent','revoke','');assert.equal(agentDecision(u.agent),'not-authorized');
  assert.equal(u.agent.step,1);
});
