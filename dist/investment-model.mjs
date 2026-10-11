import {CAPITAL} from './long-term.mjs';
const cents=n=>Math.round((n+Number.EPSILON)*100);
export function parseAmount(value){const s=String(value).trim(),n=Number(s);if(!/^\d+(?:\.\d{1,2})?$/.test(s)||!Number.isFinite(n)||n<100||n>1000000)throw new Error('amount');return cents(n);}
// Consume the chart's simulation result, never a separate scenario or cached path.
export function performanceReport(amount,result,day){
 const initial=parseAmount(amount),p=result.points[day];
 if(!p)throw new Error('observation day');
 const scale=initial/100/CAPITAL,scaled=n=>cents(n*scale);
 return {initial,day,years:result.options.years,reinvest:result.options.reinvest,
  ending:scaled(p.nav),pure:scaled(p.pure),fees:scaled(p.fees),feeCash:scaled(p.feeCash),reinvestedFees:scaled(p.reinvestedFees),
  holding:scaled(p.holdingPnl),il:scaled(p.il),management:scaled(p.management),
  returnPct:(p.nav/CAPITAL-1)*100,pureReturnPct:(p.pure/CAPITAL-1)*100,
  excess:scaled(p.nav-p.pure),excessPct:(p.nav-p.pure)/CAPITAL*100,
  earningRoles:Object.entries(p.feeRunRates).filter(([,rate])=>rate>0).map(([role])=>role)};
}
export function createAccount(report){return {report,closed:false,balance:report.ending,deposits:report.initial,withdrawn:0,costBasis:report.initial,realized:0,transactions:[{kind:'initial',amount:report.initial},{kind:'growth',amount:report.ending-report.initial}]};}
export function syncAccount(a,report){
 if(a.closed)return a;
 if(report.initial!==a.deposits)throw new Error('deposit mismatch');
 return {...a,report,balance:report.ending,transactions:a.transactions.map(x=>x.kind==='growth'?{...x,amount:report.ending-report.initial}:x)};
}
export function accountMetrics(a){return {pnl:a.balance+a.withdrawn-a.deposits,unrealized:a.balance-a.costBasis,returnPct:a.report.returnPct??(a.report.ending/a.report.initial-1)*100};}
export function withdrawAll(a){if(a.closed||a.balance<=0)return a;const profit=a.balance-a.costBasis;return {...a,closed:true,balance:0,costBasis:0,withdrawn:a.withdrawn+a.balance,realized:a.realized+profit,transactions:[...a.transactions,{kind:'withdraw',amount:a.balance,profit}]};}
