import {getLanguage} from './locales/locale.mjs';
const t=(zh,en)=>getLanguage()==='en'?en:zh;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Read summary values from the first (since-inception) table in the archived
// source. Never combine a historical report with the current live feed.
export function pnlReportSummary(doc){
 const rows=doc.markdown.split('\n').filter(l=>/^\|/.test(l)).map(l=>l.split('|').slice(1,-1).map(s=>s.trim()));
 const strategy=rows.find(r=>r[0].startsWith('实际策略'));
 const shares=rows.find(r=>r[0]==='纯 CRCLx');
 if(!strategy||!shares)return '';
 const values=[
  [t('期末净值','Ending NAV'),'$'+strategy[1],t('费用已计入净值','Fees included in NAV')],
  [t('成立以来收益','Since-inception P&L'),'$'+strategy[2],strategy[3]+'%'],
  [t('相对纯持股','Versus holding CRCLx'),'$'+shares[4],t('同本金基准','Equal-capital benchmark')]
 ];
 return `<section class="pnl-report-summary" aria-label="${t('日报摘要','Report summary')}">${values.map(([label,value,note])=>`<div><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('')}</section><p class="pnl-report-period">${t('累计观察期：2026-06-09 →','Cumulative observation: 2026-06-09 →')} ${esc(doc.version)} · ${t('历史日报摘录','Archived daily report excerpt')}</p>`;
}
