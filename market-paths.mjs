import {getLanguage} from './locales/locale.mjs';
import {pathKnots} from './long-term.mjs';

const t=(zh,en)=>getLanguage()==='en'?en:zh;
// One option catalog for the run page, comparison page and legacy readers.
export const MARKET_PATHS=Object.freeze({
  cycles3:{label:['三轮上涨与回落','Three rallies and pullbacks'],description:['经历三轮上涨和回落，再到达目标价，观察资金能否反复参与。','Three rallies and pullbacks before the ending target: explore repeated use of the portfolio.']},
  cycles2:{label:['两轮上涨与回落','Two rallies and pullbacks'],description:['经历两轮上涨和回落，再到达目标价，与三轮波动比较。','Two rallies and pullbacks before the ending target: compare with the three-cycle path.']},
  bull:{label:['平滑到达目标价','Smooth move to the target'],description:['从起价平滑走向目标价，不加入中途反弹或回撤，观察单边行情。','Move smoothly from the opening price to the target, without intervening reversals.']},
  growthStory:{label:['盘整后冲高回落','Consolidation, then a rally'],description:['先盘整，随后冲高并回撤，最后到达目标价；这只设定价格，不代表公司估值上调。','Consolidate, then rally with pullbacks before the target. This sets prices, not a higher company valuation.']},
  pressureStory:{label:['盘整后下探反弹','Consolidation, then a selloff'],description:['先盘整，随后下探并反弹，最后到达目标价；这只设定价格，不代表公司估值下调。','Consolidate, then decline and rebound before the target. This sets prices, not a lower company valuation.']},
  stableStory:{label:['盘整后反复涨跌','Consolidation, then swings'],description:['前段先盘整，后段多次涨跌，再到达目标价，观察波动发生的时机。','Consolidate first, then swing repeatedly before the target: explore when volatility occurs.']},
  decline:{label:['逐步回落，再到目标价','Gradual decline, then the target'],description:['途中逐步走低，最后一段回到你设定的目标价；目标越高，末段反弹越明显。','Decline along the way, then reach your target. A higher target creates a stronger final rebound.']}
});
export const SHAPES=Object.fromEntries(Object.entries(MARKET_PATHS).map(([key,p])=>[key,p.label[0]]));
export const pathLabel=key=>t(...MARKET_PATHS[key].label);
const exampleLabel=key=>({growth:t('改善后的价格示例','Post-review growth example'),pressure:t('承压后的价格示例','Post-review pressure example'),divergence:t('估值与价格背离示例','Price/valuation divergence example')})[key];
export function pathOptions(state){return (state.marketPath?`<option value="example" selected disabled>${exampleLabel(state.marketPath.key)}</option>`:'')+Object.keys(MARKET_PATHS).map(key=>`<option value="${key}" ${!state.marketPath&&state.shape===key?'selected':''}>${pathLabel(key)}</option>`).join('');}
export function pathPreview(state){
  // Draw the very same knots used by the simulator, including a loaded example.
  const knots=pathKnots(state),prices=knots.map(p=>p.price),lo=Math.min(...prices),hi=Math.max(...prices);
  const x=d=>8+d/(state.years*365)*444,y=p=>70-(p-lo)/Math.max(1,hi-lo)*58;
  const points=knots.map(p=>`${x(p.day).toFixed(2)},${y(p.price).toFixed(2)}`).join(' ');
  const title=state.marketPath?exampleLabel(state.marketPath.key):pathLabel(state.shape);
  const description=state.marketPath?t('保留复核前的价格，展示复核后的配套走势。选择其他走势将替换整段示例。','Prices before review are preserved. Choosing another path replaces this whole example.'):t(...MARKET_PATHS[state.shape].description);
  return `<div class="market-path-preview"><div class="path-preview-title"><b>${title}</b><span>${t('模拟走势预览','Simulated path preview')}</span></div><svg viewBox="0 0 460 82" preserveAspectRatio="none" role="img" aria-label="${title}"><path d="M8 76H452" fill="none" stroke="#dbe2ef"/><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle cx="452" cy="${y(state.end).toFixed(2)}" r="4" fill="currentColor"/></svg><div class="path-preview-scale"><span>${t('起价','Start')} $${state.startPrice.toFixed(2)}</span><span>${state.years} ${t('年后','year'+(state.years===1?'':'s'))} · $${state.end}</span></div><p>${description}</p></div>`;
}
