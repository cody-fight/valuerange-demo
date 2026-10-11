import {getLanguage} from './locales/locale.mjs';
const t=(zh,en)=>getLanguage()==='en'?en:zh;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b));
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+08:00$/.test(s);
export function validFeeObservation(x){
 try{
  const w=x.window,r=Object.values(w.roles),fees=r.reduce((s,p)=>s+p.feesDailyMark,0),capital=r.reduce((s,p)=>s+p.capitalDays,0);
  return x.schemaVersion===1&&x.method==='daily-token-increments/capital-days'&&
   date(w.start)&&date(w.end)&&w.end>w.start&&w.days>0&&w.observations>=2&&
   near(w.days,(Date.parse(w.end.replace(' ','T').replace(' +','+'))-Date.parse(w.start.replace(' ','T').replace(' +','+')))/86400000)&&
   r.length===2&&!!w.roles.core&&!!w.roles.active&&r.every(p=>
    p.feesDailyMark>=0&&p.capitalDays>0&&near(p.averagePrincipal,p.capitalDays/w.days)&&near(p.aprCalendar,p.feesDailyMark/p.capitalDays*365*100))&&
   near(w.feeTotal,fees)&&near(w.avgLpPrincipal,capital/w.days)&&near(w.lpAprCalendar,fees/capital*365*100)&&
   w.avgPortfolioNav>0&&near(w.portfolioFeeAnnual,fees/(w.avgPortfolioNav*w.days)*365*100);
 }catch{return false;}
}
export async function loadFeeObservation(fetcher=fetch){
 try{
  const response=await fetcher('data/fee-observation.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)return null;
  const x=await response.json();return validFeeObservation(x)?x:null;
 }catch{return null;}
}
export function feeObservationPanel(x,snapshotAt){
 if(!validFeeObservation(x)||!date(snapshotAt)||x.window.end>snapshotAt)return '';
 const w=x.window,period=`${w.start.slice(0,10)} → ${w.end.slice(0,10)}`;
 return `<section class="panel observed-fee-panel"><div class="observed-fee-summary"><div><h2>${t('LP 综合手续费年化','Combined LP fee APR')}</h2><p>${t('按 Core + Active 的投入金额与持续时间加权','Weighted by Core + Active capital and time')}</p><small>${t('本轮 LP 观察期','Current LP observation window')} · ${period}</small></div><div class="observed-fee-number"><strong>${w.lpAprCalendar.toFixed(1)}<span>%</span></strong><small>${t('观察年化 · 非收益承诺','Observed APR · not a forecast')}</small></div></div><p class="observed-fee-note">${t('只衡量放在 LP 中的资金。Active 暂时离开区间、不赚手续费的等待时间也已计入。','Measures capital held in LPs. Time spent out of range, including Active’s fee-free waiting periods, remains in the calculation.')}</p><details><summary>${t('这个年化怎样算？','How is this APR calculated?')}</summary><p>${t('每日新增手续费 ÷ 两个 LP 的本金时间积分 × 365。不是把两个年化直接取平均，也没有用全组合净值作为分母。','New fees ÷ the two LPs’ capital-days × 365. This is not a simple average of two APRs; the denominator excludes the rest of the portfolio.')}</p><div class="table-wrap"><table><thead><tr><th>LP</th><th>${t('新增手续费','New fees')}</th><th>${t('平均本金','Average principal')}</th><th>${t('观察年化','Observed APR')}</th></tr></thead><tbody>${['core','active'].map(key=>{const p=w.roles[key];return `<tr><td>${key==='core'?'Core':'Active'}</td><td>${money(p.feesDailyMark)}</td><td>${money(p.averagePrincipal)}</td><td>${p.aprCalendar.toFixed(1)}%</td></tr>`;}).join('')}<tr><td>${t('合计','Combined')}</td><td>${money(w.feeTotal)}</td><td>${money(w.avgLpPrincipal)}</td><td>${w.lpAprCalendar.toFixed(1)}%</td></tr></tbody></table></div><p>${t(`覆盖 ${w.observations} 个快照、约 ${w.days.toFixed(1)} 天。逐日费用代币增量按当次快照价格计价，剔除旧手续费的价格重估；本金以相邻快照均值乘以实际间隔天数加总。`,`Covers ${w.observations} snapshots over ${w.days.toFixed(1)} days. Fee-token increments are marked at each new snapshot, excluding repricing of previously earned fees. Capital-days sum the average principal between snapshots times the elapsed days.`)}</p><p>${t(`若把钱包股票和现金也计入资金规模，同期手续费对全组合的年化贡献约 ${w.portfolioFeeAnnual.toFixed(1)}%；它仍不是组合总收益或实际期间 ROI。`,`Including wallet shares and cash, the same fees contribute an annualized ${w.portfolioFeeAnnual.toFixed(1)}% on average portfolio NAV. That is not total portfolio return or realized period ROI.`)}</p><p>${t('本轮统计从 8 月 24 日的 LP 配置开始；上方累计手续费从策略起点计算，日期和计价口径不同。这里按实际持有时间统计，没有推算日内在区间中的精确时长。短期观察年化不代表未来可持续，也不替换模拟中的费率假设。','This window starts with the August 24 LP configuration. The cumulative fee value above starts at strategy inception and uses a different marking method. This measures capital over elapsed time, without reconstructing exact intraday in-range duration. Short-window annualization is not a forecast and does not replace simulation fee assumptions.')}</p>${w.end<snapshotAt?`<p>${t('此项保留上述已核对的观察期；不随净值日期自动延长。','This metric retains the audited window shown above; a newer NAV date does not extend it automatically.')}</p>`:''}</details></section>`;
}
