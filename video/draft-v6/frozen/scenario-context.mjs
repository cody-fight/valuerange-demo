import {dailyBridge} from './daily-prices.mjs';
import {reviewDay} from './timeline.mjs';
// Explicit educational market examples, independent of portfolio outcomes.
// A market path belongs to the experiment and is shared by every comparator.
import {validate,pathKnots,priceAt,valuation,CAPITAL,BASE} from './long-term.mjs';

export const MARKET_EXAMPLES=Object.freeze({
  growth:{revision:'improve',label:['增长兑现','Growth materializes']},
  pressure:{revision:'pressure',label:['经营持续承压','Persistent business pressure']},
  divergence:{revision:'pressure',label:['判断与市场背离','Thesis / market divergence']}
});
const clamp=p=>Math.max(1,Math.min(400,Math.round(p)));
export function marketExample(input,key){
  const spec=MARKET_EXAMPLES[key];if(!spec)throw new Error('Unknown market example');
  const o=validate(input),fromDay=reviewDay(o.eventYear),lastDay=o.years*365,knots=pathKnots(o),price=priceAt(knots,fromDay);
  const up=valuation('improve').map(x=>x.value),down=valuation('pressure').map(x=>x.value),base=valuation().map(x=>x.value);
  const end=clamp(key==='growth'?Math.max(price*1.35,(up[2]+up[3])/2):key==='pressure'?Math.min(price*.6,(down[1]+down[2])/2):Math.max(price*1.5,(base[2]+base[3])/2));
  const prefix=knots.filter(x=>x.day<fromDay).map(x=>({...x}));
  prefix.push({day:fromDay,price});
  const progress=key==='pressure'?[.3,.65,.5,1]:[.25,.55,.45,1];
  // Divergence means initial weakness followed by recovery: this also tests
  // different re-entry decisions when both portfolios start the review in cash.
  const levels=key==='divergence'?[Math.min(price*.65,(BASE.buy[0]+BASE.buy[1])/2),end*.8,end*1.1,end]:progress.map(v=>price+(end-price)*v);
  const future=levels.map((v,i)=>({day:Math.round(fromDay+(lastDay-fromDay)*(i+1)/4),price:Math.max(1,Math.min(400,v))}));
  return {...o,revision:spec.revision,end,marketPath:{key,fromDay,knots:o.priceModel==='daily-v1'?[...prefix,...dailyBridge([{day:fromDay,price},...future]).slice(1)]:[...prefix,...future]},day:o.day??lastDay};
}

// Read only the observed prefix. These facts describe a synthetic experiment,
// not an AI diagnosis or a conclusion about the real company.
export function comparisonContext(revised,baseline,q){
  const p=q.point,start=revised.reviewSnapshot.price;
  const observed=q.day>=revised.eventDay?revised.points.slice(revised.eventDay,q.day+1):[];
  const prices=observed.map(x=>x.price);
  return {phase:q.phase,revision:revised.options.revision,day:q.day,price:p.price,
    reviewPrice:start,priceChange:observed.length?(p.price/start-1)*100:0,
    low:prices.length?Math.min(...prices):null,high:prices.length?Math.max(...prices):null,
    pnl:p.nav-CAPITAL,relative:q.totalDelta,versusShares:p.nav-p.pure,feeDelta:q.feeDelta,
    exposureChange:revised.revisionSnapshot.stock*start/revised.revisionSnapshot.nav-revised.reviewSnapshot.stock*start/revised.reviewSnapshot.nav,
    recovered:observed.some(x=>x.reviewed),baselineNav:baseline.points[q.day].nav};
}

// The UI stores the original scenario. Derive event prices without mutating it.
export function eventScenario(state){
  if(state.priceModel!=='daily-v1'||state.revision==='unchanged')return {...state};
  return marketExample({...state,marketPath:null},state.revision==='improve'?'growth':'pressure');
}
