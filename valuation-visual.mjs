import {getLanguage} from './locales/locale.mjs';
import {valuation,pricePosition,BASE} from './long-term.mjs';

const t=(zh,en)=>getLanguage()==='en'?en:zh;
const usd=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
export const ZONE_COLORS=['#f4dddd','#e4e9f7','#cddaff','#d8ece1','#f6e4c8'];
const INK=['#a04a5d','#6a719b','#354fd1','#167c68','#a06b22'];

// The rail uses a linear dollar scale. The equal-width labels are a color key,
// not a chart of scenario probabilities or relative valuation widths.
export function valuationPaint(price,key='unchanged',min=1,max=400){
  const {nodes,index}=pricePosition(price,key);
  const at=v=>Math.min(100,Math.max(0,(v-min)/(max-min)*100));
  const stops=[0,...nodes.map(at),100];
  const gradient=`linear-gradient(to right, ${ZONE_COLORS.map((c,i)=>`${c} ${stops[i]}%, ${c} ${stops[i+1]}%`).join(', ')})`;
  return {nodes,index,percent:at(price),color:INK[index],gradient,min,max};
}

// Quick choices illustrate each zone, not forecasts. Keep them on the slider's
// whole-dollar scale and derive them from the currently applied valuation.
export function valuationZonePrice(index,key='unchanged'){
  if(!Number.isInteger(index)||index<0||index>4)throw new Error('Unknown valuation zone');
  const n=valuation(key).map(v=>v.value);
  const price=index===0?n[0]*.5:index===4?n[3]*1.25:(n[index-1]+n[index])/2;
  return Math.max(1,Math.min(400,Math.round(price)));
}

export function valuationZones(price,key='unchanged',options={}){
  const {nodes,index}=pricePosition(price,key);
  const names=t(['极端折价','悲观','中性','乐观','极端溢价'],['Extreme discount','Bear','Base','Bull','Extreme premium']);
  const interactive=options.interactive===true;
  return `<div class="valuation-zones" role="group" aria-label="${t('价格对应的估值分区','Valuation zones for the price')}">${names.map((name,i)=>{
    const tag=interactive?'button':'div';
    const target=interactive?valuationZonePrice(i,key):null;
    const action=interactive?` type="button" data-end-zone="${i}" aria-pressed="${i===index}" aria-label="${name} · ${t('将到期目标价设为','Set ending target price to')} ${usd(target)}"`:'';
    return `<${tag}${action} class="valuation-zone ${i===index?'is-current':''}${interactive?' zone-choice':''}" data-zone="${i}" ${i===index?'aria-current="true"':''} style="--zone-bg:${ZONE_COLORS[i]};--zone-ink:${INK[i]}"><b>${name}</b><small>${i===0?`${t('低于','Below')} ${usd(nodes[0])}`:i===4?`${t('高于','Above')} ${usd(nodes[3])}`:`<span>${usd(nodes[i-1])}</span><span>– ${usd(nodes[i])}</span>`}</small>${interactive?`<span class="zone-choice-price" aria-hidden="true">→ $${target}</span>`:''}${i===index?`<i aria-label="${t('价格所在区间','Zone containing the price')}">●</i>`:''}</${tag}>`;
  }).join('')}</div>`;
}

export function valuationMap(price=88.53,key='unchanged',lp=false,options={}){
  const label=options.label??t('参考价','Reference');
  const n=valuation(key).map(x=>x.value),max=Math.ceil(Math.max(n[3]*1.23,price*1.12)/25)*25;
  const paint=valuationPaint(price,key,0,max),at=v=>v/max*100;
  return `<div class="flow-valuation valuation-map"><div class="row"><b>${t('三情景估值与价格位置','Three valuation scenarios and price')}</b><small>${key==='unchanged'?'2027E · 2026.08.22':t('假设修正后','Hypothetical revision')}</small></div>${valuationZones(price,key)}<div class="valuation-rail" role="img" aria-label="${label} ${usd(price)} · ${t("线性价格刻度","Linear price scale")}" style="background:${paint.gradient};--price-ink:${paint.color}"><span class="valuation-marker" style="left:${paint.percent}%"></span><b class="valuation-price" style="left:clamp(52px,${paint.percent}%,calc(100% - 52px))">${label} ${usd(price)}</b></div><div class="valuation-scale"><span>$0</span><span>${usd(max)}</span></div>${lp?[[BASE.core,'Core LP','#344cec'],[BASE.sell,'Active LP','#008b7c']].map(([range,name,color])=>`<div class="valuation-lp-lane" style="--lp-color:${color}"><span style="left:${at(range[0])}%;width:${at(range[1])-at(range[0])}%"></span><b style="left:clamp(95px,${at((range[0]+range[1])/2)}%,calc(100% - 95px))">${name} · ${usd(range[0])}–${usd(range[1])}</b></div>`).join(''):''}<p class="valuation-map-note">${t('色带按价格刻度绘制；宽度不表示情景概率。两侧极端区域超出当前估值模型。','The rail follows a linear price scale, not scenario probabilities. Both extremes lie outside the current valuation model.')}</p></div>`;
}
