import {getLanguage} from './locales/locale.mjs';
import {pricePosition,valuation} from './long-term.mjs';
import {chart} from './lab.mjs';
import {valuationPaint} from './valuation-visual.mjs';
const t=(zh,en)=>getLanguage()==='en'?en:zh;
const usd=(v,d=0)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(v);
const period=d=>t(`第 ${Math.floor(d/365)} 年 ${Math.floor(d%365/365*12)} 个月`,`${Math.floor(d/365)}y ${Math.floor(d%365/365*12)}m`);
const bands=['Extreme discount','Bear','Base','Bull','Extreme premium'];
const zone=p=>t(['极端折价','悲观区间','中性区间','乐观区间','极端溢价'][pricePosition(p.price,p.valuationCase).index],bands[pricePosition(p.price,p.valuationCase).index]);
export function observedPriceChart(r,day){
  const p=r.points[day],paint=valuationPaint(p.price,p.valuationCase),changed=r.options.revision!=='unchanged';
  return `<div class="observed-price"><div class="observed-price-heading"><div><small>${t('观察此刻','OBSERVING NOW')} · ${period(day)}</small><b>${usd(p.price,2)} <span style="color:${paint.color}">${zone(p)}</span></b></div><small>${t(`${r.options.years} 年后目标价`,`Target after ${r.options.years} ${r.options.years===1?'year':'years'}`)} ${usd(r.options.end)}</small></div>${chart([{points:r.points,key:'price',name:t('模拟股价','Simulated share price'),color:'#506890'}],{price:true,cursor:day,eventDay:changed?r.eventDay:null,events:r.events.filter(e=>e.day<=day),bands:{before:valuation().map(n=>n.value),after:valuation(r.options.revision).map(n=>n.value)}})}<small class="event-dot-key">${t('蓝点：积累完成 · 绿点：兑现完成；仅标出观察时点前的动作','Blue: accumulation completed · Green: exit completed. Only actions up to the cursor are marked.')}</small></div>`;
}
export function lifecycleStatus(p){
  const c=p.positions.core,a=p.positions.active;
  let title,body,next;
  if(p.policy==='defensive'){
    title=t('估值下修，持现防守','Lower valuation: hold cash defensively');
    body=t('旧 LP 已关闭；股票最多为复核时本金的 10%，不为凑比例补买','Old LPs are closed; shares are capped at 10% of principal at review, without buying up to the cap');
    next=t('等待经营复核；仅在启用企稳假设且进入新中性区间后重建','Wait for review; rebuilding requires enabled stabilization and the revised Base range');
  }else if(c.phase==='accumulate'&&c.inRange){
    title=t('Core 分批积累股票','Core is accumulating shares');body=t('使用已兑现的现金；Active 只承担退出','Uses realized cash; Active remains an exit-only role');
    next=t('跌至 $58 完成积累并关闭；回升至 $75 则按可用库存复核重启','At $58, close into shares; at a recovery to $75, review available inventory for restarting');
  }else if(a.inRange){
    title=t(`Active 第 ${p.activeStage} 段兑现`,`Active stage ${p.activeStage}: distributing`);
    body=t('上涨逐步转为现金，区间内回撤也会反向转换','Rises convert shares to cash; pullbacks within the range also reverse the conversion');
    next=t(`达到 $${a.range[1]}，关闭这段 Active 并保留现金`,`At $${a.range[1]}, close this Active stage and retain cash`);
  }else if(c.inRange){
    title=t('Core 在区间内运行','Core is working in range');body=t('股票与现金随价格转换，仅有效区间内计费','Shares and cash convert with price; fees accrue only in range');
    next=p.reentry?t('回落至 $75 复核积累；上涨至 Core 上沿则兑现关闭','At a pullback to $75, review accumulation; at the Core upper boundary, close into cash'):t('到达 Core 边界后关闭，等待下一次复核','Close at the Core boundary and wait for another review');
    if(p.reentry&&a.liquidity===0&&p.activeStage===1&&p.price<90)next+=t('；$90 可用剩余股票开启第一段 Active','; at $90, remaining eligible shares may fund Active stage 1');
    if(p.reentry&&a.liquidity===0&&p.activeStage===2&&p.price<130)next+=t('；$130 可用剩余股票开启第二段 Active','; at $130, remaining eligible shares may fund Active stage 2');
  }else if((p.policy==='initial'&&p.price<=75&&p.stock>0)||p.stock*p.price>p.cash){
    title=t('持股等待，不继续自动卖出','Hold shares and wait');body=t('此刻没有正在计费的 LP，股票继续参与涨跌','No LP is earning now; shares still participate in price changes');
    next=p.reentry?t('回升至 $75，用可部署股票重启部分 Core；$90 复核第一段 Active','At $75, restart part of Core with eligible shares; at $90, review Active stage 1'):t('自动重启已暂停，等待新的策略复核','Automatic restarting is paused; wait for a new strategy review');
  }else{
    title=t('兑现后持现等待','Hold realized cash and wait');body=t('已关闭 LP 的现金不会在原区间自动买回','Cash from closed LPs cannot automatically buy back in the old range');
    next=p.reentry?t('回落至 $75，用储备之外的可用现金开启 Core 积累','At a pullback to $75, start Core accumulation with available cash above the reserve'):t('保持当前资产，等待新的策略复核','Keep current assets and wait for a new strategy review');
    if(p.reentry&&p.activeStage===2&&p.price<130)next+=t('；$130 仅可用剩余股票开启第二段 Active','; at $130, stage 2 may use remaining eligible shares only');
  }
  const last=p.lastAction;
  return `<section class="lifecycle-status"><div class="row"><span class="eyebrow">${t('策略正在做什么','WHAT THE STRATEGY IS DOING')}</span><button class="text-button" data-detail="lifecycle">${t('规则与触发条件','Rules & triggers')} ↗</button></div><h3>${title}</h3><p>${body}</p><div class="lifecycle-next"><b>${t('下一条件','Next condition')}</b><span>${next}</span></div>${last?`<details class="lifecycle-last"><summary>${t('最近动作','Latest action')} · ${period(last.day)} · ${usd(last.price,2)}</summary><p>${getLanguage()==='en'?last.textEn:last.text}</p></details>`:''}</section>`;
}
export function currentHoldings(p){
  const stockValue=p.stock*p.price,stockPct=stockValue/p.nav*100,cashPct=p.cash/p.nav*100;
  const status=s=>s.liquidity===0?t('已关闭 / 尚未部署','Closed / not deployed'):s.inRange?t('运行中 · 计费','In range · earning'):t('区间外 · 不计费','Out of range · no fees');
  return `<section class="panel flow-inventory">${lifecycleStatus(p)}<div class="row"><h2>${t('此刻实际持有什么','What you actually hold')}</h2><small>${t('按总资产计算，含费用留现','Based on total assets, including fee cash')}</small></div><div class="exposure-bar" role="img" aria-label="${t('股票','Shares')} ${stockPct.toFixed(1)}%, ${t('现金','Cash')} ${cashPct.toFixed(1)}%"><span style="width:${stockPct}%;background:#344cec"></span><span style="width:${cashPct}%;background:#b79b61"></span></div><div class="exposure-key"><div><span>${t('股票敞口','Share exposure')}</span><b>${stockPct.toFixed(1)}%</b><strong>${p.stock.toFixed(2)} CRCLx</strong><small>${usd(stockValue,2)}</small></div><div><span>${t('现金敞口','Cash exposure')}</span><b>${cashPct.toFixed(1)}%</b><strong>${usd(p.cash,2)}</strong><small>${t('含 LP 内现金与留存手续费','Includes cash inside LPs and retained fees')}</small></div></div><details class="position-breakdown"><summary>${t('资产在哪里？钱包与 LP 明细','Where are the assets? Wallet & LP details')}</summary><div class="table-wrap"><table><thead><tr><th>${t('位置 / 状态','Location / status')}</th><th>CRCLx</th><th>${t('现金','Cash')}</th><th>${t('价值','Value')}</th></tr></thead><tbody>${Object.entries(p.positions).map(([key,s])=>`<tr><td>${key==='core'?'Core LP':'Active LP'}<small>${status(s)}${s.liquidity>0?` · ${usd(s.range[0],2)}–${usd(s.range[1],2)}`:''}</small></td><td>${s.stock.toFixed(2)}</td><td>${usd(s.cash,2)}</td><td>${usd(s.value,2)}</td></tr>`).join('')}<tr><td>${t('钱包可用资产','Wallet assets')}</td><td>${p.free.stock.toFixed(2)}</td><td>${usd(p.free.cash,2)}</td><td>${usd(p.free.stock*p.price+p.free.cash,2)}</td></tr><tr><td>${t('手续费留现','Retained fee cash')}</td><td>—</td><td>${usd(p.feeCash,2)}</td><td>${usd(p.feeCash,2)}</td></tr><tr><th>${t('合计','Total')}</th><th>${p.stock.toFixed(2)}</th><th>${usd(p.cash,2)}</th><th>${usd(p.nav,2)}</th></tr></tbody></table></div><p>${t('已关闭 LP 的资产归入钱包；现金敞口不等于全部可自由部署。累计手续费包含已经复投的部分，不能再次加到总资产上。','Assets from closed LPs appear in the wallet. Cash exposure is not all freely deployable. Cumulative fees include reinvested amounts and must not be added to assets again.')}</p></details><div class="flow-status-row"><span>${t('当前计费','Earning now')} · Core ${p.feeRunRates.core>0?'●':'○'} · Active ${p.feeRunRates.active>0?'●':'○'}</span><button class="text-button" data-detail="returns">${t('收益与交易明细','Return & trade details')} ↗</button></div></section>`;
}
export function lifecycleRules(){
  const rows=[
    [t('起始方案','Initial plan'),'Core $58–172.95 · Active $90–115',t('沿用历史区间与比例，按演示收盘价重建数量','Historical ranges and weights, quantities rebuilt at the demo opening close')],
    [t('下一段兑现','Next exit stage'),'Active $130–160',t('第一段关闭后，只使用剩余可部署股票；不使用已兑现现金','After stage 1 closes, use remaining eligible shares only; never realized cash')],
    [t('回落积累','Pullback accumulation'),'Core $58–75',t('向下经过 $75，撤回原 LP；保留股票，用储备之外的现金积累','On a downward crossing of $75, withdraw old LPs; keep shares and accumulate with cash above reserve')],
    [t('积累后等待','Hold after accumulation'),'$58 → $75',t('到 $58 关闭并持股；回升到 $75 前不重新开仓','Close at $58 into shares; do not restart before recovery to $75')],
    [t('回升重启','Recovery restart'),'Core $75–172.95',t('使用可部署股票的 60%；第一段 Active 在 $90 使用余下可部署股票的一半','Use 60% of eligible shares; at $90, Active stage 1 uses half the remaining eligible shares')],
    [t('长期尾仓与储备','Tail shares and reserve'),'20% · $383.60',t('尾仓股数等于起始本金 20% 买入的股数，储备保持起始现金；并非每日目标比例','Tail shares equal shares bought with 20% of starting capital; keep the initial cash reserve. These are not daily target weights')],
    [t('基本面修正','Fundamental revision'),t('在设定年份复核','Review in the selected year'),t('先关闭旧仓，再应用修正配置；原循环暂停，按新区间管理和等待','Close old positions, apply the revised allocation, and pause the original cycle; manage or wait under the revised ranges')]
  ];
  return `<p class="model-scope">${t('生命周期 v1 · 预先设定的模拟规则，不是新的实时 AI 提案，也不是实盘交易记录。','Lifecycle v1 · Preset simulation rules, not a new live AI proposal or a live trade record.')}</p><div class="table-wrap"><table><thead><tr><th>${t('阶段','Stage')}</th><th>${t('示例条件','Illustrative condition')}</th><th>${t('资金与动作','Funding & action')}</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p>${t('同一时刻最多一个 Core 和一个 Active。LP 区间内仍可双向转换；只有移除流动性后，所得股票或现金才停止在旧区间反向转换。价格越过估值最外边界提示重新审视，不额外自动买卖。','At most one Core and one Active exist at a time. Conversion remains two-way within a range; removing liquidity stops reverse conversion in that old range. Crossing the outer valuation bounds calls for review, not an additional automatic trade.')}</p><p>${t('防守复核将股票控制在本金的 10% 以内；已有持股更少时不补买。常规重启只用现有股币，不凭空补资产。年度费用复投和明确的基本面换仓可按当时价格模拟股币兑换，并记录前后库存；没有新增资金、杠杆或摩擦成本。','A defensive review caps shares at 10% of principal and never buys up to the cap. Routine redeployment uses existing assets. Annual reinvestment and explicit fundamental rebalances may exchange assets at the current simulated price, recording before/after inventory. There is no external funding, leverage or friction cost.')}</p><p>${t('关闭不抹去之前的相对持有损益；持股仍可能下跌，兑现后仍可能卖早。手续费仅在有效区间内产生。','Closing does not erase prior differences versus holding. Shares can fall and realized exits can miss further rallies. Fees accrue only in range.')}</p>`;
}
