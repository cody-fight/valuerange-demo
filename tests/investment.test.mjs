import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAmount,performanceReport,createAccount,syncAccount,accountMetrics,withdrawAll} from '../dist/investment-model.mjs';
import {simulate} from '../dist/long-term.mjs';
import {journeyStart,updateSimulationControls} from '../dist/experiment.mjs';
import {signed} from '../dist/investment-view.mjs';
test('amount bounds and decimal precision reject malformed deposits',()=>{
 for(const value of ['', ' ',0,-100,99.99,1000000.01,'100.001','1e3','NaN','Infinity','1,000','<script>'])assert.throws(()=>parseAmount(value));
 for(const value of ['100','100.01','1000000',' 1000.50 '])assert.equal(parseAmount(value),Math.round(Number(value)*100));
});
const currentState=()=>updateSimulationControls(journeyStart(),{years:5,shape:'bull'});
test('deposit uses the chart result at every observation, scaled to the deposit',()=>{
 const engine=simulate(currentState());
 for(const day of [0,183,365,1095,1825])for(const amount of [100,1000.01,10000,1000000]){
  const r=performanceReport(amount,engine,day),p=engine.points[day],scale=amount/10000;
  for(const [field,key] of [['ending','nav'],['pure','pure'],['fees','fees'],['feeCash','feeCash'],['reinvestedFees','reinvestedFees']])assert.equal(r[field],Math.round((p[key]*scale+Number.EPSILON)*100));
  assert.ok(Math.abs(r.holding+r.il+r.management+r.fees-(r.ending-r.initial))<=2);
  assert.ok(Math.abs(r.fees-r.feeCash-r.reinvestedFees)<=1);
  assert.ok(Math.abs(r.excess-(r.ending-r.pure))<=1);
  assert.ok(Math.abs(r.excessPct-(r.returnPct-r.pureReturnPct))<1e-10);
 }
 assert.throws(()=>performanceReport(10000,engine,1826));
});
test('account follows time, market and fee changes without adding transactions',()=>{
 let a=createAccount(performanceReport(10000,simulate(currentState()),1825));
 for(const patch of [{day:0},{years:3,shape:'decline',reinvest:false},{years:5,shape:'bull',coreApr:0,activeApr:0,buyApr:0}]){
  const s=updateSimulationControls(currentState(),patch),r=performanceReport(10000,simulate(s),s.day);
  a=syncAccount(a,r);assert.equal(a.balance,r.ending);assert.equal(a.transactions.length,2);
  assert.equal(a.transactions[1].amount,accountMetrics(a).pnl);
  if(!s.reinvest)assert.equal(r.reinvestedFees,0);
  if(s.coreApr===0)assert.equal(r.fees,0);
  if(s.day===0){assert.equal(accountMetrics(a).pnl,0);assert.equal(r.excess,0);}
 }
 assert.throws(()=>syncAccount(a,{initial:100}));
});
test('withdrawal freezes the selected time, benchmark, fees and receipt',()=>{
 const original=createAccount(performanceReport(10000,simulate(currentState()),1095)),pnl=accountMetrics(original).pnl;
 const a=withdrawAll(original);
 assert.equal(a.balance,0);assert.equal(a.realized,pnl);assert.equal(accountMetrics(a).pnl,pnl);
 assert.equal(a.deposits,1000000);assert.equal(a.withdrawn,original.balance);assert.equal(a.report,original.report);
 assert.equal(a.transactions.at(-1).amount,original.balance);assert.equal(withdrawAll(a),a);
 assert.equal(syncAccount(a,performanceReport(10000,simulate(currentState()),1825)),a);
 assert.equal(original.transactions.length,2);assert.equal(original.withdrawn,0);
});
test('loss accounting and formatting remain negative after withdrawal',()=>{
 const report={initial:1000000,ending:700000,points:[]};let a=createAccount(report);
 assert.equal(accountMetrics(a).returnPct,-30.000000000000004);assert.equal(signed(-300000),'−$3,000.00');
 a=withdrawAll(a);assert.equal(accountMetrics(a).pnl,-300000);assert.equal(a.realized,-300000);
});
