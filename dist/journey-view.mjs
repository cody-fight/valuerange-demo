import {reviewDay,reviewLabel} from './timeline.mjs';
import {comparisonAt} from './comparison.mjs';
import {simulate,CASES} from './long-term.mjs';
const money=(v,d=0)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(v);
const signed=v=>(v>=0?'+':'−')+money(Math.abs(v),2);
const time=d=>d===0?'起点':`${Math.floor(d/365)} 年 ${Math.floor(d%365/365*12)} 个月`;
export function nextMilestone(options){
  const r=simulate(options),days=[...r.events.map(e=>Math.ceil(e.day)),r.eventDay,options.years*365];
  return [...new Set(days)].sort((a,b)=>a-b).find(d=>d>options.day)??options.years*365;
}
export function journeyBanner(s){
  const day=reviewDay(s.eventYear),applied=s.revision!=='unchanged';
  return `<section class="plan-status journey-banner"><div><div class="journey-steps"><span class="current">持仓运行</span><i>→</i><span>复核公司变化</span><i>→</i><span>继续观察</span></div><b>${applied?CASES[s.revision].name+'：'+reviewLabel(s.eventYear)+'调整':'同一份 CIRCLE 持仓，先运行，再复核。'}</b><p>${applied?'图中同时保留「继续原方案」对照；调整前的本金、价格与费用完全相同。':'在'+reviewLabel(s.eventYear)+'设置一次经营复核，比较继续原方案与调整持仓。'}</p></div><div class="journey-actions"><button class="primary" ${!applied&&s.day<day?'data-observe="'+day+'"':'data-review'}>${!applied&&s.day<day?'前往'+reviewLabel(s.eventYear)+'复核点':applied?'查看或修改这次决策':'复核公司变化'} →</button><button class="text-button" data-proof="map">策略背后的系统 ↗</button></div></section>`;
}
export function journeyTimeline(s,r){
  const items=new Map([[0,'起始配置'],[r.eventDay,s.revision==='unchanged'?'经营复核点':'估值与持仓调整'],[s.years*365,'期末结果']]);
  for(const e of r.events){const d=Math.ceil(e.day);if(!items.has(d))items.set(d,{sell:'兑现留现',buy:'积累持股','buy-open':'开启积累','sell-open':'重新退出',reinvest:'年度费用复投',review:'企稳复核',rebuild:'重建 Core LP'}[e.type]??'策略事件');}
  return `<section class="panel journey-timeline"><div class="row"><div><h3>跟着持仓，走过这一段时间。</h3><p class="hint">当前 ${time(s.day)} · 点击节点查看股票、现金与手续费。</p></div><button class="secondary" data-observe="${nextMilestone(s)}" ${s.day===s.years*365?'disabled':''}>下一节点 →</button></div><div class="milestone-list">${[...items].sort((a,b)=>a[0]-b[0]).map(([d,label])=>`<button data-observe="${d}" aria-pressed="${s.day===d}" class="${d===r.eventDay?'review-milestone':''}"><small>${time(d)}</small><b>${label}</b></button>`).join('')}</div>${s.day===r.eventDay?`<div class="checkpoint-callout"><span>${s.revision==='unchanged'?'到了经营复核点。看看新信息是否需要改变估值与持仓。':'调整已在这个时点生效；尚未产生未来的调仓收益。'}</span><button class="text-button" data-review>${s.revision==='unchanged'?'复核这份持仓':'查看调整依据'} →</button></div>`:''}</section>`;
}
export function reviewContext(draft){
  const r=simulate(draft),p=r.reviewSnapshot;
  return `<section class="panel review-context"><div class="row"><div><div class="eyebrow">持仓运行 → 策略复核</div><h2>${reviewLabel(draft.eventYear)}：处理手里的这份持仓。</h2></div><button class="text-button" data-go="simulate">返回持仓运行 →</button></div><div class="review-values"><span>调整前总资产<b>${money(p.nav,2)}</b></span><span>股票库存<b>${p.stock.toFixed(2)} CRCLx</b></span><span>现金（含费用留现）<b>${money(p.cash,2)}</b></span><span>累计产生手续费<b>${money(p.fees,2)}</b></span></div><p class="hint">假设股价 ${money(p.price,2)} · ${draft.years} 年周期 · 费用${draft.reinvest?'按年复投':'留现'}。这是当日策略复核前、年度复投前的状态；已有本金与费用继续保留。下方选择经营判断不会改变市场路径。</p></section>`;
}
export function feeDecisionBridge(r,old,day=r.final.day){
  const comparison=comparisonAt(r,old,day),point=comparison.point,original=comparison.original;
  if(comparison.day<r.eventDay)return '<p>尚未到调整日期；此刻两套策略的资产与手续费相同，尚无调整差额。</p>';
  const before=r.reviewSnapshot,after=r.revisionSnapshot;
  const rows=[['Core LP',before.feeRunRates.core,after.feeRunRates.core],['Active LP',before.feeRunRates.active,after.feeRunRates.active]];
  const feeDelta=comparison.display.feeDelta,otherDelta=comparison.display.positionDelta;
  return `<section class="fee-decision-bridge"><h3>调整持仓，也会改变手续费来源。</h3><p>对比时点：${time(comparison.day)}</p><div class="table-wrap"><table><thead><tr><th>费用来源</th><th>调整前</th><th>调整后</th></tr></thead><tbody>${rows.map(([name,a,b])=>`<tr><td>${name}</td><td>${money(a,2)} / 年</td><td>${money(b,2)} / 年${b===0?' · 此刻不计费':''}</td></tr>`).join('')}</tbody></table></div><p class="hint">按复核日区间内资金 × 既定 APR 折算的计费速度，不是全年预测。调整前后累计费用均为 ${money(before.fees,2)}；未复投费用 ${money(after.feeCash,2)} 继续留现。关闭 LP 只停止新的计费，不抹去已有费用。</p><div class="fee-tradeoff"><b>用同一条市场路径检验这次取舍</b><span>观察时点资产差额 <strong>${signed(comparison.display.totalDelta)}</strong></span><span>其中：累计产生费用差额 <strong>${signed(feeDelta)}</strong></span><span>其余持仓与管理损益差额 <strong>${signed(otherDelta)}</strong></span></div><p class="hint">后两项加总为观察时点资产差额。其余项含复投后资产涨跌，不能全部归因于 AI 或基本面修正；这里是构造情景比较。</p><button class="text-button" data-proof="math">查看计费与校验依据 ↗</button></section>`;
}
