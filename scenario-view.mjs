import {reviewYears,reviewDay,reviewLabel} from './timeline.mjs';
import {getLanguage} from './locales/locale.mjs';
import {pricePosition} from './long-term.mjs';
import {pathOptions} from './market-paths.mjs';
import {valuationPaint} from './valuation-visual.mjs';
import {MARKET_EXAMPLES,marketExample,comparisonContext} from './scenario-context.mjs';

const t=(zh,en)=>getLanguage()==='en'?en:zh;
const money=(n,d=0)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(n);
const signed=n=>(n>=0?'+':'−')+money(Math.abs(n),2);
const label=key=>MARKET_EXAMPLES[key].label[getLanguage()==='en'?1:0];
export const thesisLabel=key=>({improve:t('估值中枢上移','Valuation moves up'),pressure:t('估值中枢下移','Valuation moves down'),unchanged:t('估值保持不变','Valuation unchanged')})[key];
const thesis=thesisLabel;
const zone=(price,key)=>t(['极端折价','悲观区间','中性区间','乐观区间','极端溢价'][pricePosition(price,key).index],['Extreme discount','Bear range','Base range','Bull range','Extreme premium'][pricePosition(price,key).index]);

export function scenarioExamples(state,useDraft=false){
  return `<details class="scenario-examples"><summary>${t('加载配套价格示例','Load a matching price example')}</summary><p>${t('明确选择一组公司判断与市场假设；不是价格预测，也不保证调整更优。','Explicitly choose a business thesis and market assumption. These are not forecasts and do not guarantee a better result.')}</p><div class="scenario-example-list">${Object.keys(MARKET_EXAMPLES).map(key=>{
    const example=marketExample(state,key),direction=key==='pressure'?t('下跌中反复','Decline with rebounds'):key==='divergence'?t('先承压，后明显反弹','Initial weakness, then a rebound'):t('上涨中回撤','Rally with pullbacks');
    return `<button data-market-example="${key}" ${useDraft?'data-example-draft':''}><b>${label(key)}</b><span>${thesis(example.revision)} · ${direction}</span><small>${t('到期目标价','Ending target')} ${money(example.end)} · ${state.eventYear<1?t('保留前 6 个月的走势','Keep the first 6 months'):t(`保留第 ${state.eventYear} 年及以前的走势`,`Keep the path through year ${state.eventYear}`)}</small><i>${t('加载示例','Load example')} →</i></button>`;
  }).join('')}</div><small>${t('只替换复核后的走势；费用、周期保持不变。三套策略使用同一价格路径。','Only the post-review path is replaced. Rates and horizon stay unchanged; all three portfolios use the same path.')}</small></details>`;
}

export function scenarioStatus(state){
  const paint=valuationPaint(state.end,state.revision),nodes=pricePosition(state.end,state.revision).nodes;
  const custom=state.marketPath&&(state.end!==state.marketPath.knots.at(-1).price||state.revision!==MARKET_EXAMPLES[state.marketPath.key].revision||reviewDay(state.eventYear)!==state.marketPath.fromDay);
  const assumption=state.revision==='pressure'?t('你假设估值下移','You assume a lower valuation'):state.revision==='improve'?t('你假设估值上移','You assume a higher valuation'):t('你保留原估值','You retain the original valuation');
  return `<div class="scenario-positions"><span>${t('按原估值','Original valuation')} <b>${zone(state.end,'unchanged')}</b></span><span style="--zone-ink:${paint.color}">${t('按本次估值','Selected valuation')} <b>${zone(state.end,state.revision)}</b></span></div><p class="scenario-assumption">${assumption}${t('；','; ')}${t('你设定的到期目标价为','your assumed ending target is')} <b>${money(state.end)}</b>${t('，',', ')}${t('本次估值覆盖','selected valuation spans')} ${money(nodes[0],2)}–${money(nodes[3],2)}${t('。','.')}</p>${custom?`<p class="flow-caption">${t('已自定义：当前价格、判断或复核时间与所加载示例不同。','Customized: the current price, thesis or review date differs from the loaded example.')}</p>`:''}`;
}

export function comparisonControls(state){
  const paint=valuationPaint(state.end,state.revision);
  return `<section class="panel scenario-controls"><div class="row"><h2>${t('本次模拟设定','This simulation’s assumptions')}</h2><small>${t('公司判断与价格分别设置','Thesis and price are separate inputs')}</small></div><div class="scenario-selects"><label>${t('公司判断 · 修改即应用','Business thesis · Applied on change')}<select id="result-revision" data-result-input="revision">${['unchanged','improve','pressure'].map(key=>`<option value="${key}" ${state.revision===key?'selected':''}>${thesis(key)}</option>`).join('')}</select></label><label>${t('复核时点','Review date')}<select id="result-event" data-result-input="eventYear">${reviewYears(state.years).map(y=>`<option value="${y}" ${state.eventYear===y?'selected':''}>${reviewLabel(y,getLanguage())}</option>`).join('')}</select></label><label>${t('期间波动走势','Price movement along the way')}<select id="result-shape" data-result-input="shape">${pathOptions(state)}</select></label></div><div class="scenario-price"><label for="result-end">${t(`${state.years} 年后的目标价`,`Target price after ${state.years} ${state.years===1?'year':'years'}`)}</label><div class="scenario-price-number"><span>$</span><input id="result-end-number" type="number" min="1" max="400" step="1" value="${state.end}" data-result-input="end" aria-label="${t('输入到期目标价','Enter an ending target price')}"></div></div><div class="valuation-slider"><input id="result-end" data-result-input="end" type="range" min="1" max="400" step="1" value="${state.end}" aria-label="${t(`${state.years} 年后的目标价`,`Target price after ${state.years} ${state.years===1?'year':'years'}`)}" style="--valuation-gradient:${paint.gradient};--price-ink:${paint.color}"></div><div class="valuation-scale"><span>$1</span><span>$400</span></div><div id="scenario-status">${scenarioStatus(state)}</div><p class="flow-caption">${state.marketPath?t(`已固定复核前 ${Math.round(state.marketPath.fromDay/365*12)} 个月的市场历史；改复核时间仅移动决策，重新加载示例才重建后续走势。`,`Market history is fixed through month ${Math.round(state.marketPath.fromDay/365*12)}. Changing the review date moves only the decision; reload an example to rebuild the later path.`):t('市场路径来自“模拟运行”；这里的修改也会同步回去。','The market path comes from Run it. Changes here are shared with that page.')} ${t('切换走势会保留周期与目标价，重新构造中间的波动。','Changing the path keeps your duration and target and rebuilds the swings in between.')}</p>${scenarioExamples(state)}</section>`;
}

export function scenarioExplanation(revised,baseline,q){
  const c=comparisonContext(revised,baseline,q);
  let title,body;
  if(c.phase==='before'){
    title=t('调整尚未生效','The decision has not taken effect');
    body=t('截至观察时点，两套策略采用相同规则；后续市场假设尚未成为此刻的模拟结果。','At this observation time both strategies use the same rules. Later price assumptions are not outcomes observed yet.');
  }else if(c.phase==='review'){
    title=t('换仓发生，差额尚未形成','Rebalanced, with no return difference yet');
    body=t('换仓只改变股票、LP 与现金的安排，不凭空产生收益。向后移动时间，观察不同敞口如何影响资产。','Rebalancing changes shares, LPs and cash without creating value. Move forward to see the effect of the new exposure.');
  }else if(c.phase==='unchanged'){
    title=t('当前没有估值修正','No valuation revision selected');
    body=t('两套策略使用相同估值与运行规则，因此资产一致。可在上方选择公司变化，或加载配套示例。','Both portfolios use the same valuation and rules, so their asset values match. Select a business change or load an example above.');
  }else if(c.revision==='pressure'){
    title=c.relative<0?(c.priceChange>0?t('防守后错过了后续行情','Defense missed part of the later market move'):t('降低敞口仍落后于原策略','Lower exposure still trails the original strategy')):t('降低敞口后的资产表现','The result of reducing exposure');
    body=t('本次下调估值后，规则关闭旧 LP、减少持股并留存现金；原策略继续参与价格波动与 LP 计费。差距取决于复核后的整段走势、再入场条件与费用。','The lower-valuation rule closes old LPs, reduces shares and retains cash. The original strategy keeps participating in price swings and LP fees. The gap depends on the whole post-review path, re-entry conditions and fees.');
    if(Math.abs(c.exposureChange)<1e-6)body=t('复核时原组合已偏向现金，本次没有进一步减少持股；新规则暂停旧估值下的 LP 与重新积累。此后的差距取决于两套策略是否再入场，以及沿途价格与费用。','The portfolio was already cash-heavy at review, so this decision did not reduce shares further. The revised rules pause old-valuation LPs and accumulation. Later differences depend on re-entry, prices along the path and fees.');
    if(c.recovered)body+=' '+t('本次还触发了设定的恢复部署条件。','The configured recovery deployment condition also triggered.');
  }else{
    title=c.relative>=0?t('这次持仓调整带来的结果','The result of the new allocation'):(c.priceChange>0?t('股价涨了，为什么仍跑输原方案？','Why trail the original plan even though the price rose?'):t('这次持仓调整尚未带来优势','The new allocation has not produced an advantage yet'));
    body=t('上调估值后，重新安排股票、Core LP 与现金，并暂停旧 Active LP。股价涨到哪里、途中怎样反复、少做了哪些换仓和少收了多少费用，都会影响结果；只看股价最终上涨多少还不够。','The higher valuation rearranges shares, Core LP and cash and pauses the old Active LP. The ending price, swings along the way, inventory decisions and fees all affect the result; the final price gain alone does not explain it.');
  }
  if(c.phase==='after'&&Math.abs(c.relative)<.005)title=t('这次调整尚未拉开差距','This decision has not created a gap yet');
  if(c.phase==='after'&&revised.options.allocation==='ranges'){
    title=t('区间调整后的资产表现','The result of changing ranges');
    body=t('当前选择仅调整区间的分析模式，复核时不主动兑换股票与现金。后续差额来自不同区间的库存转换、生命周期与手续费。','The selected range-only analytical mode does not exchange shares and cash at review. Later differences come from inventory conversion, lifecycle rules and fees in different ranges.');
  }
  const relative=Math.abs(c.relative)<.005?t('与估值不变策略持平','Matches the original-valuation strategy'):c.relative<0?t(`比估值不变策略少 ${money(-c.relative,2)}`,`${money(-c.relative,2)} below the original-valuation strategy`):t(`比估值不变策略多 ${money(c.relative,2)}`,`${money(c.relative,2)} above the original-valuation strategy`);
  const pnl=Math.abs(c.pnl)<.005?t('相对初始本金持平','Unchanged versus initial capital'):c.pnl>0?t(`方案自身盈利 ${money(c.pnl,2)}`,`The plan itself is up ${money(c.pnl,2)}`):t(`方案自身亏损 ${money(-c.pnl,2)}`,`The plan itself is down ${money(-c.pnl,2)}`);
  return `<div class="scenario-explanation" data-phase="${c.phase}"><div class="scenario-outcome"><b>${relative}</b><span>${pnl} · ${t('相对纯持股','Versus shares')} ${signed(c.versusShares)}</span></div><h3>${title}</h3><p>${body}</p>${c.phase==='after'?`<div class="scenario-observed-facts"><span>${t('复核时股价','Price at review')} <b>${money(c.reviewPrice,2)}</b></span><span>${t('截至此刻涨跌','Move since review')} <b>${c.priceChange>=0?'+':''}${c.priceChange.toFixed(1)}%</b></span><span>${t('期间低 / 高','Low / high so far')} <b>${money(c.low,2)} / ${money(c.high,2)}</b></span></div>`:''}${reviewChecks(c)}</div>`;
}

function reviewChecks(c){
  if(c.phase!=='after')return '';
  const checks=[
    [t('经营判断需要更新吗？','Do the business assumptions need an update?'),t('重新核对新闻、财报和盈利假设，检查估值是否使用了过时或偏乐观、偏悲观的资料。','Recheck news, filings and earnings assumptions for stale inputs or an overly optimistic or pessimistic valuation.')],
    [t('价格暂时偏离了价值吗？','Could market price be diverging from value?'),t('情绪、资金流和市场整体涨跌都可能造成偏离；需要更多证据区分暂时波动与公司价值的变化。','Sentiment, flows and broader markets can create a gap. More evidence is needed to distinguish temporary moves from changes in company value.')],
    [t('调仓时机与规则合适吗？','Were the timing and trading rules suitable?'),c.revision==='pressure'?t('检查是否减仓过早、等待再入场过久，或错过了反弹中的 LP 与手续费机会。','Check whether exposure was cut too early, re-entry took too long, or LP and fee opportunities were missed during a rebound.'):t('检查 LP 比例、卖出区间和再次入场条件，是否让这段反复波动中的换仓与收费机会减少。','Review LP weights, exit ranges and re-entry conditions for opportunities lost during repeated swings.')]
  ];
  return `<section class="result-review-checks"><h3>${c.relative<-.005?t('出现差距，下一步查什么？','What should you check when the plan falls behind?'):t('这次结果，下一步怎样验证？','How should this result be tested next?')}</h3><p class="review-hypothesis-note">${t('以下是待核对的可能原因。一次模拟结果不能证明市场不理性，也不能直接判定估值或 AI 出错。','These are possibilities to investigate. One simulation result does not by itself prove irrational pricing or an error in the valuation or AI.')}</p><ol>${checks.map(([title,body])=>`<li><b>${title}</b><span>${body}</span></li>`).join('')}</ol><div class="iteration-path"><b>${t('把复盘结论带回下一轮','Feed the findings into the next review')}</b><span>${t('更新资料 → 复核估值 → 调整规则 → 再次验证','Refresh evidence → Review valuation → Refine rules → Test again')}</span><small>${t('AI 持续跟踪新闻与财报；有依据的修正经复核后进入新方案，再用后续记录检验。','AI follows news and filings. Evidence-based revisions are reviewed before entering a new plan, then checked against later records.')}</small><button class="text-button" data-go="library">${t('了解持续跟踪与修正','Explore ongoing research and review')} ↗</button></div></section>`;
}

export function resetSummary(){return `<div class="reset-summary"><p>${t('恢复后返回首页，清除本次模拟、调整草稿、观察时间与未来产品预览；保留当前语言和真实记录。','Return to the overview and clear simulation edits, review drafts, cursors and future-product previews. Keep the language and real records.')}</p><ul><li>$10,000 · ${t('起始价','Opening price')} $92.02</li><li>${t('5 年 · 反复涨跌 · 期末 $85','5 years · Repeated swings · Ending price $85')}</li><li>${t('估值不变 · 第 4 年末复核','Valuation unchanged · Review at year 4')}</li><li>Core 14% · Active 37.3% · ${t('Core 积累','Core accumulation')} 14% APR</li><li>${t('开启按年复投、多轮运行；观察期末','Annual reinvestment and repeated cycles on; observe the end')}</li></ul><button class="primary" data-reset>${t('恢复默认案例','Reset to the default demo')}</button></div>`;}
