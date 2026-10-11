import {dailyBridge} from './daily-prices.mjs';
import {HORIZONS,reviewYears,reviewDay} from './timeline.mjs';
import {runLifecycle} from './lifecycle-engine.mjs';
// Frictionless CLMM illustration. USD, CRCLx, 365-day years; no leverage.
import {AI_POLICIES} from './ai-policies.mjs';
export const START_PRICE=88.53, CAPITAL=10000;
export const BASE={core:[58,172.95],sell:[90,115],buy:[58,75]};
export const FACTORS=[
  {usdc:78,yield:.025,other:.170,margin:.36,opex:.640,multiple:12},
  {usdc:95,yield:.029,other:.220,margin:.39,opex:.650,multiple:16},
  {usdc:125,yield:.032,other:.330,margin:.425,opex:.710,multiple:20},
  {usdc:160,yield:.035,other:.480,margin:.45,opex:.780,multiple:24}
];
// Hypothetical financial assumptions; revised Core bands are archived AI outputs.
// Goal weights are given demo constraints, not an AI optimizer; no live AI call.
export const CASES={
  unchanged:{name:'估值基本稳定',usdc:1,yield:0,margin:0,other:1,multiple:1,...BASE},
  improve:{name:'估值中枢大幅上移',usdc:1.5,yield:0,margin:.04,other:1.4,multiple:1},
  pressure:{name:'估值中枢大幅下移',usdc:.9,yield:-.001,margin:-.005,other:1,multiple:.55}
};
export function valuation(key='unchanged') {
  const c=CASES[key];if(!c)throw new Error('Unknown valuation case');
  return FACTORS.map(f=>{const usdc=f.usdc*c.usdc,y=f.yield+c.yield,other=f.other*c.other,margin=f.margin+c.margin;
    const ebitda=(usdc*y+other)*margin-f.opex;
    const multiple=f.multiple*c.multiple;
    return {...f,usdc,yield:y,other,margin,multiple,ebitda,value:(ebitda*multiple+1.611883)/.273};});
}
// New price bands derive from revised financial boundaries; inactive bands are references only.
for(const key of ['improve','pressure']){const n=valuation(key).map(n=>n.value);Object.assign(CASES[key],{core:[...AI_POLICIES[key].core],sell:[n[2],n[3]],buy:[n[0],n[1]]});}
export function pricePosition(price,key='unchanged') {
  const nodes=valuation(key).map(n=>n.value);
  if(!Number.isFinite(price)||price<=0)throw new Error('Invalid price');
  const index=price<nodes[0]?0:price<nodes[1]?1:price<nodes[2]?2:price<=nodes[3]?3:4;
  return {index,nodes,label:['低于悲观下界','悲观估值区间','中性估值区间','乐观估值区间','高于乐观上界'][index],
    description:['极端折价 · 需重审经营风险','接近保守经营假设','处于中性经营假设范围','包含较强的增长预期','极端溢价 · 超出当前模型覆盖'][index]};
}
// Explicit demonstration allocation rules, evaluated using only the event price.
export function allocationPlan(key,price) {
  if(key==='improve')return {weights:[...AI_POLICIES.improve.weights],reentry:false,reason:'关闭旧 Active LP，提高直接持股至 70%；25% 投入新的 Core LP，5% 留存现金，减少过早卖出。'};
  if(key==='pressure')return {weights:[...AI_POLICIES.pressure.weights],reentry:false,reason:'关闭旧 Core LP 与 Active LP，降低直接持股至 10%，90% 留存现金；先停止按旧估值继续积累。'};
  return {weights:[.389545,.2,.372095,.03836],reentry:true,reason:'维持原区间与生命周期，不强制恢复初始比例。'};
}
export function inventory(L,p,lo,hi) {
  if(![L,p,lo,hi].every(Number.isFinite)||L<0||p<=0||lo<=0||hi<=lo)throw new Error('Invalid CLMM input');
  const a=Math.sqrt(lo),b=Math.sqrt(hi),s=Math.sqrt(Math.min(hi,Math.max(lo,p)));
  return {stock:L*(1/s-1/b),cash:L*(s-a)};
}
const value=(q,p)=>q.stock*p+q.cash;
const add=(a,b)=>({stock:a.stock+b.stock,cash:a.cash+b.cash});
function seeded(budget,p,range,phase){const u=inventory(1,p,...range);return {L:budget/value(u,p),range:[...range],stock:0,cash:0,phase};}
function assets(s,p){return add({stock:s.stock,cash:s.cash},inventory(s.L,p,...s.range));}
function fit(s,p,range){const q=assets(s,p),u=inventory(1,p,...range),limits=[];
  if(u.stock>1e-12)limits.push(q.stock/u.stock);if(u.cash>1e-12)limits.push(q.cash/u.cash);
  s.L=Math.max(0,Math.min(...limits));s.range=[...range];s.stock=Math.max(0,q.stock-u.stock*s.L);s.cash=Math.max(0,q.cash-u.cash*s.L);}
function close(s,p){const q=assets(s,p);s.L=0;s.stock=q.stock;s.cash=q.cash;}
export const DEFAULTS={startPrice:START_PRICE,years:5,shape:'cycles3',end:100,coreApr:14,activeApr:37.3,buyApr:14,cycles:true,reinvest:true,revision:'unchanged',eventYear:2,allocation:'inventory',recovery:false};
export function validate(input={}){
  const o={...DEFAULTS,...input};
  if(input.eventYear===undefined&&HORIZONS.includes(o.years))o.eventYear=reviewYears(o.years).includes(o.eventYear)?o.eventYear:reviewYears(o.years).at(-1);
  // Legacy uniform APR is only retained for analytical tests; the UI uses three explicit rates.
  if(input.apr!==undefined){o.coreApr=input.apr;o.activeApr=input.apr;o.buyApr=input.apr;}
  if(!Number.isFinite(o.startPrice)||o.startPrice<=0||o.startPrice>400||!HORIZONS.includes(o.years)||!['cycles2','cycles3','bull','decline','growthStory','pressureStory','stableStory'].includes(o.shape)||!Number.isFinite(o.end)||o.end<1||o.end>400||!['coreApr','activeApr','buyApr'].every(k=>Number.isFinite(o[k])&&o[k]>=0&&o[k]<=120)||(input.apr!==undefined&&input.apr>60)||typeof o.cycles!=='boolean'||typeof o.reinvest!=='boolean'||typeof o.recovery!=='boolean'||!Object.hasOwn(CASES,o.revision)||!reviewYears(o.years).includes(o.eventYear)||!['ranges','inventory'].includes(o.allocation))throw new Error('模拟参数超出允许范围');
  if(o.marketPath!=null){
    const m=o.marketPath,k=m.knots,days=o.years*365;
    if(!['growth','pressure','divergence'].includes(m.key)||!Number.isInteger(m.fromDay)||m.fromDay<1||m.fromDay>=days||!Array.isArray(k)||k.length<3||k.length>1826||k[0]?.day!==0||k[0]?.price!==o.startPrice||k.at(-1)?.day!==days||!k.some(x=>x.day===m.fromDay)||k.some((x,i)=>!Number.isInteger(x.day)||!Number.isFinite(x.price)||x.price<=0||x.price>400||(i>0&&x.day<=k[i-1].day)))throw new Error('Invalid example market path');
  }
  return o;
}
function anchorKnots(input={}){const o=validate(input),days=o.years*365;let values;
  if(o.marketPath)return o.marketPath.knots.map((x,i)=>({...x,price:i===o.marketPath.knots.length-1?o.end:x.price}));
  if(o.shape.endsWith('Story')){
    const day=reviewDay(o.eventYear),after={growthStory:[145,130,215,190,o.end],pressureStory:[75,50,32,40,o.end],stableStory:[165,52,173,52,o.end]}[o.shape];
    return [{day:0,price:o.startPrice},{day:Math.round(day*.5),price:110},{day:Math.round(day*.75),price:95},{day,price:100},...after.map((price,i)=>({day:Math.round(day+(days-day)*(i+1)/5),price}))];
  }
  if(o.shape==='bull')values=Array.from({length:6},(_,i)=>o.startPrice*(o.end/o.startPrice)**(i/5));
  else if(o.shape==='decline')values=[o.startPrice,100,75,65,48,o.end];
  else {values=[o.startPrice];for(let i=0;i<(o.shape==='cycles2'?2:3);i++)values.push(165+i*8,52);values.push(o.end);}
  return values.map((price,i)=>({day:Math.round(days*i/(values.length-1)),price}));}
export function pathKnots(input={}){const knots=anchorKnots(input);return input.priceModel==='daily-v1'&&!input.marketPath?dailyBridge(knots):knots;}
export function priceAt(knots,day){if(day<=0)return knots[0].price;if(Number.isInteger(day)&&knots[day]?.day===day)return knots[day].price;for(let i=1;i<knots.length;i++)if(day<=knots[i].day){const a=knots[i-1],b=knots[i];return a.price+(b.price-a.price)*(day-a.day)/(b.day-a.day);}return knots.at(-1).price;}
export function simulate(input={}){return runLifecycle(validate(input),{inventory,valuation,CASES,BASE,CAPITAL,allocationPlan,pathKnots,priceAt});}
