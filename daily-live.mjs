import {getLanguage} from './locales/locale.mjs';
const t=(zh,en)=>getLanguage()==='en'?en:zh;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n);
const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<.01;
export function validLive(x){
  try{
    const d=x.case,h=x.history,points=h.nav,f=h.feeHistory,p=d.pnl;
    return x.schemaVersion===1 && /^\d{4}-\d{2}-\d{2}$/.test(x.asOfDate) &&
      d.snapshotAt.slice(0,10)===x.asOfDate && points.length>1 &&
      points[0].timestamp===p.startAt && points.at(-1).timestamp===d.snapshotAt &&
      f.start===p.startAt && f.end===d.snapshotAt &&
      points.every((r,i)=>Number.isFinite(r.nav)&&Number.isFinite(r.pure)&&Number.isFinite(r.day)&&(i===0||r.day>points[i-1].day)) &&
      close(points.at(-1).nav*p.initialNav/100,d.nav.totalUsd) &&
      close(d.nav.totalUsd-p.pureEnd,p.excessPure) &&
      close(d.nav.totalUsd-p.initialNav,p.pnl) &&
      close(f.total,f.roles.core.value+f.roles.active.value) &&
      close(d.positions.reduce((s,p)=>s+p.totalUsd,0)+d.wallet.pureCrclxUsd+d.wallet.usdcUsd+d.wallet.jlusdcUsd,d.nav.totalUsd) &&
      d.positions.every(p=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.positionPda)&&['Core','Active'].includes(p.role)&&close(p.principalUsd+p.unclaimedFeeUsd,p.totalUsd)) &&
      ['inception','current_period'].every(k=>x.comparisons[k].end===d.snapshotAt);
  }catch{return false;}
}
export async function loadLive(fetcher=fetch){
  try{
    const response=await fetcher('data/live-evidence.json',{cache:'no-store',signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    const x=await response.json();return validLive(x)?x:null;
  }catch{return null;}
}
export function liveStatus(x,now=new Date()){
  if(!x)return `<p class="flow-caption">${t('日更数据暂不可用，当前显示带日期的历史归档。','Daily data is unavailable; showing the dated archive.')}</p>`;
  const expected=new Date(now.getTime()+8*3600000-86400000).toISOString().slice(0,10);
  return `<p class="flow-caption">${t('每日更新一次 · 北京时间 09:30 · 展示前一日最新正式快照，不是日终收盘或实时行情。','Updated daily at 09:30 Beijing time · The previous day’s latest official snapshot, not a closing price or live quote.')}${x.asOfDate<expected?' '+t('昨天的数据尚未发布，暂保留最近一次成功更新。','Yesterday’s update is not available; the last successful snapshot is retained.'):''}</p>`;
}
export function liveDetails(x){
  const labels={strategy:t('实盘策略','Live strategy'),pure_underlying:t('纯 CRCLx','Pure CRCLx'),initial_hodl:t('期初股币组合持有','Initial share/cash mix'),cash:'USDC'};
  return `<p>${t('数据截至','Data as of')} ${esc(x.case.snapshotAt)}</p>${liveStatus(x)}${['inception','current_period'].map(k=>{const w=x.comparisons[k];return `<h3>${k==='inception'?t('从策略起点累计','Since inception'):t('最近两个快照之间','Between the latest two snapshots')}</h3><p>${esc(w.start)} → ${esc(w.end)}</p><div class="table-wrap"><table><thead><tr><th>${t('比较对象','Portfolio')}</th><th>${t('期末净值','Ending NAV')}</th><th>${t('盈亏','P&L')}</th><th>${t('回报','Return')}</th></tr></thead><tbody>${w.rows.map(r=>`<tr><td>${labels[r.key]??esc(r.key)}</td><td>${money(r.ending_usd)}</td><td>${money(r.pnl_usd)}</td><td>${Number(r.return_pct).toFixed(2)}%</td></tr>`).join('')}</tbody></table></div>`;}).join('')}<p>${t('纯持股以相同起始本金买入 CRCLx。净值已含待领取手续费；历史领取不能再次加到净值上。历史跨越取价方式变更，未单独剥离其影响。','Pure holding starts with the same capital invested in CRCLx. NAV already includes unclaimed fees; historical claims must not be added to NAV again. Historical pricing-method changes have not been separately isolated.')}</p><h3>${t('本次数据来源','This update’s sources')}</h3><p>${t('从 Google Drive 已完成的 DAILY 归档生成，并与正式盈亏报告、持仓快照和历史记录核对。研究资料中的旧报表仍保留原日期。','Generated from the completed DAILY archive in Google Drive and reconciled against the official P&L, positions and historical records. Older research reports retain their original dates.')}</p><p>${esc(x.runId)}</p><details><summary>${t('查看来源校验值','Source checksums')}</summary>${x.sources.map(s=>`<p>${esc(s.name)}<br><code>${esc(s.sha256)}</code></p>`).join('')}</details>`;
}
