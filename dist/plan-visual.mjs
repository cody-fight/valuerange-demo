// Read-only figures for the prepared plan; simulation controls remain separate.
import {getLanguage} from './locales/locale.mjs';
import {valuation,BASE} from './long-term.mjs';
const t=(zh,en)=>getLanguage()==='en'?en:zh;
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
const limit=225;
const at=n=>n/limit*100;

function rangesFigure(price,rows,label){
  return `<figure class="plan-ranges" aria-label="${label}" style="--reference-at:${at(price)}%">
    <div class="plan-range-reference"><span>${t('统一股价刻度','Shared price scale')}</span><div><b style="left:${at(price)}%">${t('起点','Start')} ${usd(price)}</b></div></div>
    <div class="plan-range-rows">${rows.map(([name,range,color,note])=>`<div class="plan-range-row"><div class="plan-range-label"><b>${name}</b><span>${usd(range[0])}–${usd(range[1])}</span></div><div class="plan-range-track"><span style="left:${at(range[0])}%;width:${at(range[1]-range[0])}%;background:${color}"></span></div>${note?`<p>${note}</p>`:''}</div>`).join('')}</div>
    <div class="plan-range-axis"><span></span><div><span>$0</span><span>$225</span></div></div>
    <figcaption>${t('横向长度表示价格跨度；虚线标出模拟起点。','Horizontal lengths show price spans; the dashed line marks the simulation start.')}</figcaption>
  </figure>`;
}

export function planValuation(price){
  const n=valuation('unchanged').map(v=>v.value);
  return `<div class="plan-valuation-figure"><div class="plan-figure-title"><h3>${t('三种经营情景，对应三个价值区间','Three business scenarios, three value ranges')}</h3><small>2027E · 2026.08.22</small></div>
    ${rangesFigure(price,[[t('悲观','Bear'),[n[0],n[1]],'#b8c4dd'],[t('中性','Base'),[n[1],n[2]],'#91a9f6'],[t('乐观','Bull'),[n[2],n[3]],'#6cb6a2']],t('三情景估值与收盘价的静态对照','Read-only comparison of valuation ranges and the closing price'))}
    <p class="plan-model-boundary">${t(`低于 ${usd(n[0])} 或高于 ${usd(n[3])}，属于本模型三情景之外。区间不是发生概率，也不是价格保证。`,`Prices below ${usd(n[0])} or above ${usd(n[3])} fall outside these scenarios. The ranges are not probabilities or price guarantees.`)}</p></div>`;
}

export function planRanges(price){
  return `<div class="plan-lp-figure"><div class="plan-figure-title"><h3>${t('先定区间：在哪里转换股票与现金','First, set the trading ranges')}</h3></div>
    ${rangesFigure(price,[['Core LP',BASE.core,'#344cec',t('覆盖较宽的价格范围，随涨跌转换股票与现金。','A broad range converts between shares and cash as prices move.')],['Active LP',BASE.sell,'#008b7c',t('用一部分股票分段兑现；涨过上沿后，按规则关闭并留存现金。','Distribute a portion of shares in stages; above the upper boundary, close under the rules and retain cash.')]],t('AI 提案的 Core 和 Active LP 区间','Core and Active LP ranges from the AI proposal'))}
    <p class="plan-lp-context">${t('案例起点位于两个 LP 区间内；价格在区间内变化时，股票与现金逐步转换，并按模拟假设计收手续费。','The case starts inside both LP ranges. Price moves within a range convert shares and cash and accrue fees under the simulation assumptions.')}</p></div>`;
}

export function valuationModelRoute(){
  return `<ol class="plan-model-route">${[
    [t('经营数据','Business drivers'),t('USDC 规模 · 储备收益率 · 成本','USDC supply · reserve yield · costs')],
    [t('盈利与定价','Earnings & valuation'),t('正常化盈利 × 倍数 + 净现金','Normalized earnings × multiple + net cash')],
    [t('每股价值','Per-share value'),t('÷ 稀释股数，得到三情景区间','÷ diluted shares → three scenario ranges')]
  ].map(([name,note])=>`<li><b>${name}</b><span>${note}</span></li>`).join('')}</ol>`;
}
