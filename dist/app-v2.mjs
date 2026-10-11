import {performanceReport} from './investment-model.mjs';
import {initWallet} from './wallet.mjs';
import {investmentHome,investmentShell,investmentResearchLinks,initInvestment,resetInvestment,refreshInvestmentDialog} from './investment-view.mjs';
import {markdown} from './document-markdown.mjs';
import {pnlReportSummary} from './pnl-report-view.mjs';
import {loadFeeObservation} from './fee-observation.mjs';
import {loadLive} from './daily-live.mjs';
import {pathPreview,MARKET_PATHS} from './market-paths.mjs';
import {HORIZONS} from './timeline.mjs';
import {configureLocale,getLanguage,setLanguage,translate,localizeMarkup as html} from './locales/locale.mjs';
import {feeReferenceDetails} from './fee-view.mjs';
import {overviewPage,decisionContent,cycleContent,DECISIONS,CYCLE_STEPS} from './overview-view.mjs';
import {futurePage,futureWorkbench,FUTURE_STEPS,FUTURE_GOALS} from './future-view.mjs';
import {marketExample,eventScenario} from './scenario-context.mjs';
import {scenarioStatus,scenarioExamples} from './scenario-view.mjs';
import {demoDefaults,replaceState} from './demo-reset.mjs';
import {simulate,CASES} from './long-term.mjs';
import {experimentDefaults,updateExperiment,updateSimulationControls,applyProposal,storyDefaults,beginReview,reviewSelection,applyReview,journeyStart,FEE_KEYS,FEE_PROFILES,feePatch} from './experiment.mjs';
import {proofView} from './proof-view.mjs';
import {reviewContext} from './journey-view.mjs';
import {createLab,priceBand,historyPanels,SHAPES} from './lab.mjs';
import {createFlow,flowSteps,FLOW_ROUTES} from './flow-view.mjs';
import {valuationPaint,valuationZonePrice} from './valuation-visual.mjs';
import {conceptDefaults,conceptPage,submitConcept,conceptAction} from './future-preview.mjs';
const app=document.querySelector('#app');
let data,documents,proposals,historyData,research,feeReference,workflow,aiEvidence,lab,defaults,flow;
const flowUi={comparisonDay:null,started:false,detail:null,detailDraft:false,documentMarkup:'',readingFrom:'library'};
let detailTrigger=null;
const proofUi={key:'map',caseKey:'improve'};
let proofTrigger=null,openedDocument=null;
let englishDocuments={};
const shellSources=[...document.querySelectorAll('.topbar,.sidebar,noscript')].map(el=>[el,el.innerHTML]);
const originalDescription=document.querySelector('meta[name=description]').content;
function renderShell(){
  document.documentElement.lang=getLanguage()==='en'?'en':'zh-CN';
  document.querySelector('meta[name=description]').content=translate(originalDescription);
  for(const [el,source] of shellSources)el.innerHTML=html(source);
  investmentShell();
  document.querySelector('.topbar').style.visibility='';
  document.querySelectorAll('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===getLanguage())));
}
function switchLanguage(lang){
  if(!['en','zh'].includes(lang)||lang===getLanguage())return;
  const scroll=scrollY,details=[...app.querySelectorAll('details')].map(d=>d.open);
  const proofScroll=document.querySelector('#proof-dialog').scrollTop,docScroll=document.querySelector('#document-dialog').scrollTop;
  setLanguage(lang);try{localStorage.setItem('circle-lab-language',lang);}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
  renderShell();render();refreshInvestmentDialog();
  [...app.querySelectorAll('details')].forEach((d,i)=>d.open=details[i]??false);
  if(document.querySelector('#proof-dialog').open){openProof(proofUi.key);document.querySelector('#proof-dialog').scrollTop=proofScroll;}
  if(state.view==='document'&&openedDocument)openDoc(openedDocument);
  if(document.querySelector('#detail-dialog').open)renderDetail();
  window.scrollTo({top:scroll,behavior:'instant'});
  document.querySelector(`[data-language="${lang}"]`)?.focus({preventScroll:true});
}
const researchUi={date:null};
const introUi={decision:'low',cycle:0};
const futureUi={entry:'investor',step:0,goal:'growth',event:false};
const VIEWS=['overview','account','learn','plan','simulate','revise','result','evidence','library','document','future','vault','agent'];
let conceptUi=conceptDefaults();
const state={view:'overview'};
const draft={};
const money=(n,d=0)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(n);
const number=(n,d=2)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(n);
const signed=(n,d=0)=>(n>=0?'+':'−')+money(Math.abs(n),d);
const pct=n=>(n>=0?'+':'')+n.toFixed(1)+'%';
const time=d=>d===0?'起点':`${Math.floor(d/365)} 年 ${Math.floor((d%365)/365*12)} 个月`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tone=n=>n>=0?'positive':'negative';
const signedPct=n=>(n>=0?'+':'−')+Math.abs(n).toFixed(2)+'%';
const displayDate=s=>s.slice(0,10).replaceAll('-','.');
const range=r=>`${money(r[0],2)}–${money(r[1],2)}`;
const metric=(title,value,sub='',cls='')=>`<div class="metric"><span>${title}</span><strong class="${cls}">${value}</strong><small>${sub}</small></div>`;
const heading=(n,title,sub,badge)=>`<div class="page-heading"><div><div class="eyebrow">CIRCLE / CASE STUDY ${n}</div><h1 tabindex="-1">${title}</h1><p>${sub}</p></div><span class="badge blue">${badge}</span></div>`;
const docButton=(id,text)=>`<button class="secondary" data-doc="${id}">${text} <span aria-hidden="true">↗</span></button>`;
const foot=()=>`<footer class="note">CIRCLE 单一案例 · CRCL 为原股，CRCLx 为链上代币化敞口；不包含发行者的股东权利差异模拟。历史实盘、历史 AI 输出与假设推演分别标注。</footer>`;
function overview(){return overviewPage({data,research,ui:introUi});}

function evidence(){const d=data,p=d.pnl,fees=d.positions.reduce((s,x)=>s+x.unclaimedFeeUsd,0),observed=historyData.feeReference,w=observed.windows.at(-1);
  return heading('04','让真实仓位，为策略提供证据。','从估值、区间到每天的股票、现金与手续费，结果可以回到记录中核对。','正式记录 · 历史快照')+`
    <div class="proof-links"><button class="secondary" data-proof="runs">这些记录如何产生？ ↗</button><button class="text-button" data-proof="math">如何核对收益与费用？ ↗</button></div><div class="snapshot-banner"><span>最新案例快照 <b>${d.snapshotAt}</b></span><span>CRCL 估值取价 <b>${money(d.prices.fairPrice,4)}</b></span><span>CRCLx 池价 <b>${money(d.prices.poolPrice,4)}</b></span></div>
    <div class="metrics-grid evidence-metrics">${metric('成立以来 · 相对纯 CRCLx',signed(p.excessPure,2),`${displayDate(p.startAt)} → ${displayDate(d.snapshotAt)}`,tone(p.excessPure))}${metric('成立以来 · 策略总盈亏',signed(p.pnl,2),`本金 ${money(p.initialNav,2)} · ${signedPct(p.returnPct)}`,tone(p.pnl))}${metric('当前待领取手续费',money(fees,2),'已包含在总资产中，不重复相加','positive')}</div>
    ${historyPanels(historyData,p)}
    <div class="fee-observation-panel"><section class="panel"><div class="eyebrow">FEE OBSERVATION · ${displayDate(observed.start)}—${displayDate(observed.end)}</div><h2>从约 ${Math.round(observed.days)} 天实盘观察，分开估计两类 LP 的费用。</h2><div class="evidence-highlight">${money(w.feeTotal,2)} <small>/ 观察期新增手续费估值</small></div><p>Core LP 观察年化 <b>${w.roles.core.aprCalendar.toFixed(1)}%</b>，Active LP 观察年化 <b>${w.roles.active.aprCalendar.toFixed(1)}%</b>。用逐日费用数量增量和各自本金时间积分计算，包含区间外等待。</p><p>02 的模拟默认值仍以 ${displayDate(feeReference.start)}—${displayDate(feeReference.end)} 的固定样本校准：Core <b>${defaults.coreApr.toFixed(1)}%</b>、Active 退出段 <b>${defaults.activeApr.toFixed(1)}%</b>；积累段 <b>${defaults.buyApr.toFixed(1)}%</b> 为演示假设。最新观察数据与模拟假设分别标注；费用还须按仓位占比和区间内时间折算，不能直接当作组合 ROI。</p><button class="secondary" data-use-fee>使用分仓默认值推演 →</button>${feeReferenceDetails(observed,{simulation:false})}</section></div>
    <div class="section-head"><h2>实盘里，股票与现金放在哪里？</h2><span class="small">总资产 ${money(d.nav.totalUsd,2)} · 包含待领取费用</span></div><div class="strategy-grid real-positions">${[...d.positions].sort((a,b)=>a.role==='Core'?-1:1).map(x=>`<article class="strategy-card"><div class="row"><h3>${x.role} LP</h3><span class="badge">${d.prices.poolPrice<x.rangeLowerUsdcPerCrclx?'下沿外 · 股票库存':d.prices.poolPrice>x.rangeUpperUsdcPerCrclx?'上沿外 · USDC 库存':'区间内'}</span></div><div class="range-number">${range([x.rangeLowerUsdcPerCrclx,x.rangeUpperUsdcPerCrclx])}</div><div class="inventory-row"><span>股票</span><b>${number(x.crclxQty,4)} CRCLx</b></div><div class="inventory-row"><span>USDC</span><b>${money(x.usdcQty,2)}</b></div><div class="inventory-row"><span>待领取费用</span><b class="positive">${money(x.unclaimedFeeUsd,2)}</b></div><div class="inventory-row"><span>仓位总值</span><b>${money(x.totalUsd,2)}</b></div><a class="source-link" href="https://solscan.io/account/${x.positionPda}" target="_blank" rel="noopener noreferrer">查看链上仓位 ↗</a></article>`).join('')}<article class="strategy-card"><h3>独立持股与储备</h3><div class="range-number">保留长期参与</div><div class="inventory-row"><span>钱包股票</span><b>${number(d.wallet.pureCrclxQty,4)} CRCLx</b></div><div class="inventory-row"><span>股票价值</span><b>${money(d.wallet.pureCrclxUsd,2)}</b></div><div class="inventory-row"><span>jlUSDC 储备</span><b>${money(d.wallet.jlusdcUsd,2)}</b></div><p>股票保留增长敞口；稳定类储备提供资金弹性。快照中的分配随价格变化，不是每天恢复的目标比例。</p></article></div>
    <details class="method"><summary>展开完整基准、绝对盈亏与证据边界</summary><h3>成立以来 · ${p.startAt} → ${d.snapshotAt}</h3><div class="table-wrap"><table><thead><tr><th>组合</th><th>期末资产</th><th>盈亏</th><th>策略相对超额</th></tr></thead><tbody>${[['实盘策略',d.nav.totalUsd,p.pnl,null],['纯 CRCLx',p.pureEnd,p.purePnl,p.excessPure],['期初股币组合持有',p.holdEnd,p.holdPnl,p.excessHold],['USDC',p.initialNav,0,p.pnl]].map(([k,v,profit,delta])=>`<tr><td>${k}</td><td>${money(v,2)}</td><td>${signed(profit,2)}</td><td>${delta===null?'—':signed(delta,2)}</td></tr>`).join('')}</tbody></table></div><h3>最近区间 · ${p.latestStart} → ${d.snapshotAt}</h3><div class="table-wrap"><table><thead><tr><th>组合</th><th>区间收益率</th><th>区间盈亏</th><th>策略相对超额</th></tr></thead><tbody>${p.periodComparisons.map(r=>`<tr><td>${esc(r.label)}</td><td>${signedPct(r.returnPct)}</td><td>${signed(r.pnlUsd,2)}</td><td>${r.key==='strategy'?'—':signed(r.excessUsd,2)}</td></tr>`).join('')}</tbody></table></div><p>原股估值价格观测于 ${d.prices.fairPriceAsOfUtc}，池价观测于 ${d.prices.poolPriceObservedAtUtc}，两者并不同步。生产 PNL 成立以来跨越过取价口径调整；外部现金流、历史领取与全成本链路仍有待补齐。这里展示正式监控结果，不宣称是完整审计收益或已验证的长期年化。</p></details>
    <details class="method"><summary>查看本地证据副本与版本</summary><p>证据内容已经复制到本演示。打开以下材料不会访问或修改生产工作区。</p>${docButton('valuation','估值模型')}${docButton('valuation_inputs','财务底稿')}${docButton('ai_candidate','历史 AI 提案')}${docButton('bridge','基本面事实桥')}${docButton('monitor','最新运行摘录')}${docButton('pnl_latest','最新 PNL 核对')}<div class="source-list">${d.sources.map(s=>`<div><b>${esc(s.document)}</b><code>SHA-256 ${s.sha256}</code></div>`).join('')}</div></details><div class="closing-note"><strong>价值判断、库存管理与手续费，可以形成新的持股方式。</strong><p>本案例已验证区间在运行、仓位在转换、费用在累积。长期能否持续跑赢持股，需要更多完整周期的证据；下一步是验证动态修正与多轮部署，再考虑金库产品。</p><div class="evidence-next-actions"><button class="primary" data-go="future">看看未来如何使用 <span>→</span></button><button class="text-button" data-go="simulate">回到长期策略推演 ↗</button></div></div>${foot()}`;
}

function render(){
  const existingAssumptions=document.querySelector('#performance-assumptions');if(existingAssumptions)flowUi.assumptionsOpen=existingAssumptions.open;
  const pages={overview:investmentHome,learn:()=>investmentResearchLinks()+flow.home(),plan:flow.library,simulate:flow.run,revise:flow.review,result:flow.result,evidence:flow.evidence,library:flow.library,future:flow.future,vault:()=>conceptPage('vault',conceptUi),agent:()=>conceptPage('agent',conceptUi),document:()=>flowUi.documentMarkup};
  document.body.classList.toggle('vr-page',['overview','account'].includes(state.view));
  app.innerHTML=html((FLOW_ROUTES.includes(state.view)&&state.view!=='overview'?flowSteps(state.view):'')+pages[state.view]());
  const active=({learn:'library',account:'simulate',revise:'simulate',result:'simulate',document:'library',plan:'library',vault:'future',agent:'future'})[state.view]||state.view;
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===active);b.setAttribute('aria-current',b.dataset.view===active?'page':'false');});
  revealMilestone();
  const selected=document.querySelector('[data-view][aria-current="page"]'),nav=selected?.parentElement;
  if(nav&&nav.scrollWidth>nav.clientWidth){const left=selected.getBoundingClientRect().left-nav.getBoundingClientRect().left+nav.scrollLeft;nav.scrollLeft=Math.max(0,left-(nav.clientWidth-selected.clientWidth)/2);}
}
function revealMilestone(){const list=document.querySelector('.milestone-list'),selected=list?.querySelector('[aria-pressed="true"]');if(!selected)return;list.scrollLeft=Math.max(0,selected.offsetLeft-list.offsetLeft-(list.clientWidth-selected.clientWidth)/2);}
function navigate(view,keepReview=false){if(!VIEWS.includes(view))return;if(view==='account')view='simulate';if(view==='plan'||view==='learn')view='library';closeDetail();if(view==='document'&&!openedDocument)view='library';if(view==='revise'&&state.view!=='revise'&&!keepReview)replaceState(draft,beginReview(state));state.view=view;render();window.scrollTo({top:0,behavior:'instant'});app.querySelector('h1')?.focus({preventScroll:true});if(location.hash!==`#${view}`)history.pushState(null,'',`#${view}`);}
function closeDetail(){document.querySelector('#detail-dialog').close();}
function trimDetailHeadingStops(markup){return markup.replace(/(<h[1-4]\b[^>]*>)([\s\S]*?)(<\/h[1-4]>)/g,(_,open,body,close)=>open+body.replace(/[。.](\s*(?:<\/[^>]+>\s*)*)$/,'$1')+close);}
function renderDetail(){
  const key=flowUi.detail,dialog=document.querySelector('#detail-dialog'),content=document.querySelector('#detail-content');
  const titles={holdings:['仓位与运行明细','Holdings & strategy details'],reviewReason:['为什么这样调仓，手续费会怎样变化？','Why rebalance, and what happens to fees?'],reset:['默认案例配置','Default demo settings'],foundation:['这三个估值区间是怎么算出来的？','How are these valuation ranges calculated?'],settings:['调整目标价与交易设置','Target price & trading settings'],price:['价格与估值','Price & valuation'],plan:['Core LP、Active LP 和持股为什么这样配？','Why this mix of Core LP, Active LP and shares?'],factors:['经营因子与估值计算','Operating factors & valuation'],research:['持续跟踪记录','Ongoing research records'],returns:['收益与交易明细','Return & trade details'],live:['完整实盘记录','Full live records'],lifecycle:['运行规则与资金来源','Lifecycle rules & funding'],guide:['策略原理与生命周期','Strategy & lifecycle guide'],future:['未来使用流程','Future workflow preview']};
  const title=titles[key]?.[getLanguage()==='en'?1:0]??key;
  content.innerHTML=`<header class="detail-heading"><h2 id="detail-title">${title}</h2><button class="close-button" data-detail-close aria-label="${getLanguage()==='en'?'Close details':'关闭明细'}">×</button></header><div class="detail-body">${trimDetailHeadingStops(html(key==='future'?futurePage(futureUi):flow.details(key,flowUi.detailDraft)))}</div>`;
}
function openDetail(key,useDraft=false){detailTrigger=document.activeElement;flowUi.detail=key;flowUi.detailDraft=useDraft;renderDetail();const dialog=document.querySelector('#detail-dialog');if(!dialog.open)dialog.showModal();dialog.scrollTop=0;dialog.querySelector('[data-detail-close]').focus({preventScroll:true});}
function refreshDetail(focusId){const dialog=document.querySelector('#detail-dialog');if(!dialog.open)return;const scroll=dialog.scrollTop;renderDetail();dialog.scrollTop=scroll;if(focusId)dialog.querySelector('#'+focusId)?.focus({preventScroll:true});}
function openProof(key){
  closeDetail();
  proofUi.key=key;const dialog=document.querySelector('#proof-dialog');
  if(!dialog.open){proofTrigger=document.activeElement;proofUi.caseKey=['improve','pressure'].includes(draft.revision)?draft.revision:'improve';}
  document.querySelector('#proof-content').innerHTML=html(proofView(key,{workflow,ai:aiEvidence,caseKey:proofUi.caseKey})).replace('<div class="proof-body">','<div class="proof-body">'+(getLanguage()==='en'?'<p class="translation-note">English presentation of archived evidence. Original dates and hashes refer to the source records; translation does not constitute a new AI run.</p>':''));
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;dialog.querySelector('[data-proof-close]').focus({preventScroll:true});
}
function updateFuture(focusSelector){
  const root=document.querySelector('#future-workbench');if(!root)return;
  root.innerHTML=html(futureWorkbench(futureUi));
  if(focusSelector)root.querySelector(focusSelector)?.focus({preventScroll:true});
}
function updateResults(){
  if(state.view==='simulate'){
    const fresh=document.createElement('template');fresh.innerHTML=html(flow.runResult());
    const root=document.querySelector('#simulation-results');
    for(const selector of ['.metrics-grid','.compact-holdings'])root.querySelector(selector).replaceWith(fresh.content.querySelector(selector));
    const accountPanel=root.querySelector('.vr-inline-account'),nextAccount=fresh.content.querySelector('.vr-inline-account');
    if(accountPanel&&nextAccount){nextAccount.querySelector('.vr-details').open=accountPanel.querySelector('.vr-details').open;accountPanel.replaceWith(nextAccount);}
    root.querySelector('#observation-price').innerHTML=fresh.content.querySelector('#observation-price').innerHTML;
    root.querySelector('#run-chart-content').innerHTML=fresh.content.querySelector('#run-chart-content').innerHTML;
    root.querySelector('[data-next-event]').dataset.observe=fresh.content.querySelector('[data-next-event]').dataset.observe;
    revealMilestone();
    document.querySelector('#day-label').textContent=fresh.content.querySelector('#day-label').textContent;
    document.querySelector('#day').value=state.day;
    const preview=document.querySelector('#market-path-preview');if(preview)preview.innerHTML=html(pathPreview(state));
    syncTargetControls();
    document.querySelectorAll('[data-fee-profile]').forEach(b=>{const selected=FEE_KEYS.every(k=>state[k]===FEE_PROFILES[b.dataset.feeProfile][k]);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  }
  if(state.view==='revise')updateRevision();
}
function syncTargetControls(){
  const paint=valuationPaint(state.end,'unchanged');
  for(const id of ['end','end-number']){const el=document.getElementById(id);if(el){el.value=state.end;el.style.setProperty('--valuation-gradient',paint.gradient);el.style.setProperty('--price-ink',paint.color);}}
  const zones=document.getElementById('end-position');if(zones)zones.innerHTML=html(flow.endingTag());
}
function setComparisonDay(value){
  if(state.view!=='result')return;
  if(!Number.isInteger(value)||value<0||value>state.years*365)return;
  flowUi.comparisonDay=value;
  const fresh=document.createElement('template');fresh.innerHTML=html(flow.resultPanels());
  const root=document.querySelector('#comparison-results');
  const explanationOpen=root.querySelector('.scenario-explanation details')?.open;
  for(const selector of ['#comparison-summary','#comparison-attribution'])root.querySelector(selector).replaceWith(fresh.content.querySelector(selector));
  if(explanationOpen)root.querySelector('.scenario-explanation details').open=true;
  root.querySelector('#comparison-chart-content').innerHTML=fresh.content.querySelector('#comparison-chart-content').innerHTML;
  root.querySelector('#compare-day-label').textContent=fresh.content.querySelector('#compare-day-label').textContent;
  root.querySelector('#compare-day').value=flow.resultDay();
  root.querySelector('[data-comparison-next]').dataset.comparisonObserve=fresh.content.querySelector('[data-comparison-next]').dataset.comparisonObserve;
}
function updateRevision(){
  const root=document.querySelector('#revision-results');
  if(!root)return;
  const opened=[...root.querySelectorAll('details[open]')].map(d=>d.querySelector('summary').textContent);
  const focused=document.activeElement,selector=focused.id?'#'+focused.id:focused.dataset.draft?'[data-draft="'+focused.dataset.draft+'"]':focused.dataset.draftFeeProfile?'[data-draft-fee-profile="'+focused.dataset.draftFeeProfile+'"]':focused.dataset.story?'[data-story="'+focused.dataset.story+'"]':null;
  root.innerHTML=html(flow.reviewResult());
  for(const d of root.querySelectorAll('details'))if(opened.includes(d.querySelector('summary').textContent))d.open=true;
  if(selector)root.querySelector(selector)?.focus({preventScroll:true});
}
function commitReview(patch){
  const next=reviewSelection(state,patch);
  replaceState(state,next.state);
  replaceState(draft,next.draft);
  updateRevision();
}
function setResultInput(key,value,focusId){
  try{Object.assign(state,updateSimulationControls(state,{[key]:value}));}catch{return;}
  replaceState(draft,beginReview(state));
  if(key==='end'){
    const slider=document.querySelector('#result-end'),numberInput=document.querySelector('#result-end-number'),paint=valuationPaint(state.end,state.revision);
    slider.value=numberInput.value=state.end;
    slider.style.setProperty('--valuation-gradient',paint.gradient);slider.style.setProperty('--price-ink',paint.color);
    document.querySelector('#scenario-status').innerHTML=html(scenarioStatus(state));
    const examples=document.querySelector('.scenario-controls .scenario-examples'),opened=examples.open;
    const fresh=document.createElement('template');fresh.innerHTML=html(scenarioExamples(state));examples.replaceWith(fresh.content.firstElementChild);
    document.querySelector('.scenario-controls .scenario-examples').open=opened;
    setComparisonDay(flow.resultDay());
  }else {render();document.getElementById(focusId)?.focus({preventScroll:true});}
}
let resetToastTimer;
function resetDemo(notify=true){
  if(!data)return;
  detailTrigger=proofTrigger=null;openedDocument=null;
  for(const dialog of document.querySelectorAll('dialog'))dialog.close();
  const fresh=demoDefaults(research.latestDate);
  fresh.state=updateSimulationControls(fresh.state,{years:5,shape:'bull'});fresh.draft=beginReview(fresh.state);
  for(const [target,key] of [[state,'state'],[draft,'draft'],[flowUi,'flowUi'],[proofUi,'proofUi'],[researchUi,'researchUi'],[introUi,'introUi'],[futureUi,'futureUi']])replaceState(target,fresh[key]);
  conceptUi=fresh.conceptUi;resetInvestment();
  const assumptions=document.querySelector('#performance-assumptions');if(assumptions)assumptions.open=false;
  flowUi.assumptionsOpen=false;
  setLanguage('en');try{localStorage.setItem('circle-lab-language','en');}catch{}
  const url=new URL(location.href);url.searchParams.set('lang','en');url.hash='overview';history.replaceState(null,'',url);
  renderShell();navigate('overview');
  const toast=document.getElementById('reset-toast');
  clearTimeout(resetToastTimer);toast.hidden=true;
  if(!notify)return;
  toast.textContent=getLanguage()==='en'?'Default demo restored':'已恢复默认案例';toast.hidden=false;
  clearTimeout(resetToastTimer);resetToastTimer=setTimeout(()=>toast.hidden=true,3500);
}
function setInput(key,value){try{Object.assign(state,updateSimulationControls(state,{[key]:value}));}catch{return;}replaceState(draft,beginReview(state));if(['years','shape','reinvest',...FEE_KEYS].includes(key)||state.view!=='simulate'){const focusId=document.activeElement?.id;render();if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});}else updateResults();}
function openDoc(id){
  const original=[...documents.documents,...research.documents].find(d=>d.id===id);if(!original)return;
  if(state.view!=='document'){flowUi.readingFrom=state.view;flowUi.readingScroll=scrollY;}
  closeDetail();document.querySelector('#proof-dialog').close();
  openedDocument=id;
  const translated=getLanguage()==='en'?englishDocuments[id]:null;
  const doc=translated?{...original,...translated}:original;
  const dialog=document.querySelector('#document-dialog');
  flowUi.documentMarkup=html(`<article class="flow-document ${id==='pnl_latest'?'pnl-report':''}"><button class="text-button" data-reading-back>${getLanguage()==='en'?'← Back to demo':'← 返回演示'}</button><div class="flow-heading"><span class="eyebrow">${getLanguage()==='en'?'Translated evidence':'证据副本'} · ${esc(doc.version)}</span><h1 tabindex="-1">${id==='pnl_latest'?(getLanguage()==='en'?'CIRCLE · Daily P&L report':'CIRCLE · PNL 日报'):esc(doc.title)}</h1></div>${id==='pnl_latest'?pnlReportSummary(original):''}<div class="document-body"><p class="copy-note">${translated?'English translation of the archived business excerpt. Dates and calculations are retained. This is not a new research update or AI run.':'以下为已复制的业务摘录，保留日期、计算与假设。'}</p>${markdown(doc.markdown)}<details class="method"><summary>来源、复制范围与摘要</summary><p>${esc(doc.source)}<br>原文件 SHA-256：<code>${original.sourceSha256}</code><br>摘录 SHA-256：<code>${original.excerptSha256}</code>${translated?`<br>English translation SHA-256: <code>${translated.translationSha256}</code><br>Translated: ${esc(translated.translatedAt)}`:''}</p><p>仅复制选定业务章节，省略内部路径与操作元数据；不包含完整 Skill 或私人提示词。</p>${id.startsWith('valuation')?documents.officialSources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></p>`).join(''):''}</details></div><button class="secondary" data-reading-back>${getLanguage()==='en'?'Back to demo':'返回演示'}</button></article>`);
  navigate('document');
}
function revealIntroCycle(){
  const nav=document.querySelector('.intro-cycle-nav'),selected=nav?.querySelector('[aria-pressed="true"]');
  if(!selected)return;
  const left=selected.getBoundingClientRect().left-nav.getBoundingClientRect().left+nav.scrollLeft;
  nav.scrollTo({left:Math.max(0,left-(nav.clientWidth-selected.clientWidth)/2),behavior:'instant'});
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button,a');if(!b)return;
  if(b.dataset.language){switchLanguage(b.dataset.language);return;}
  if(b.hasAttribute('data-reset')){resetDemo();return;}
  if(b.dataset.marketExample){
    const inReview=b.hasAttribute('data-example-draft');
    replaceState(state,marketExample(state,b.dataset.marketExample));
    replaceState(draft,beginReview(state));
    if(inReview)updateRevision();else render();
    app.querySelector(`[data-market-example="${b.dataset.marketExample}"]`)?.closest('details')?.setAttribute('open','');
    app.querySelector(`[data-market-example="${b.dataset.marketExample}"]`)?.focus({preventScroll:true});
    return;
  }
  if(b.dataset.concept){
    const kind=b.dataset.concept,action=b.dataset.conceptAction,value=b.dataset.conceptValue;
    if(state.view!==kind||!['vault','agent'].includes(kind))return;
    e.preventDefault();conceptUi=conceptAction(conceptUi,kind,action,value);render();
    if(action==='step'||action==='revoke'){window.scrollTo({top:0,behavior:'instant'});app.querySelector('[aria-current="step"]')?.focus({preventScroll:true});}
    else app.querySelector(`[data-concept="${kind}"][data-concept-action="${action}"][data-concept-value="${value}"]`)?.focus({preventScroll:true});
    return;
  }
  if(b.hasAttribute('data-flow-start')){if(!flowUi.started){Object.assign(state,updateSimulationControls(journeyStart(state),{years:5,shape:'bull'}));flowUi.started=true;}navigate('simulate');return;}
  if(b.dataset.detail){openDetail(b.dataset.detail,b.hasAttribute('data-detail-draft'));return;}
  if(b.hasAttribute('data-detail-close')){closeDetail();return;}
  if(b.hasAttribute('data-reading-back')){navigate(flowUi.readingFrom,true);window.scrollTo({top:flowUi.readingScroll??0,behavior:'instant'});return;}
  if(b.dataset.endZone!==undefined&&state.view==='simulate'){
    const zone=Number(b.dataset.endZone);
    if(!Number.isInteger(zone)||zone<0||zone>4)return;
    setInput('end',valuationZonePrice(zone,'unchanged'));
    // Results replace the cards; keep keyboard focus on the equivalent button.
    document.querySelector(`[data-end-zone="${zone}"]`)?.focus({preventScroll:true});
    return;
  }
  if(b.dataset.path){setInput('shape',b.dataset.path);return;}
  if(b.dataset.proof)openProof(b.dataset.proof);
  if(b.dataset.proofCase){proofUi.caseKey=b.dataset.proofCase;openProof('candidates');}
  if(b.hasAttribute('data-proof-close'))document.querySelector('#proof-dialog').close();
  if(b.hasAttribute('data-journey-start')){Object.assign(state,updateSimulationControls(journeyStart(state),{years:5,shape:'bull'}));navigate('simulate');}
  if(b.dataset.comparisonObserve!==undefined){setComparisonDay(Number(b.dataset.comparisonObserve));return;}
  if(b.dataset.observe!==undefined){setInput('day',Number(b.dataset.observe));}
  if(b.dataset.view||b.dataset.go){e.preventDefault();navigate(b.dataset.view||b.dataset.go);}
  if(state.view==='future'){
    if(b.hasAttribute('data-future-start')){
      const target=document.querySelector('#future-workbench');target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
      document.querySelector('#future-workbench-title')?.focus({preventScroll:true});
    }
    if(['investor','researcher'].includes(b.dataset.futureEntry)){
      futureUi.entry=b.dataset.futureEntry;futureUi.step=0;updateFuture(`[data-future-entry="${futureUi.entry}"]`);
    }
    const step=b.dataset.futureStep??b.dataset.futureNext;
    if(step!==undefined&&Number.isInteger(Number(step))&&Number(step)>=0&&Number(step)<FUTURE_STEPS.length){
      futureUi.step=Number(step);updateFuture(`[data-future-step="${futureUi.step}"]`);
      if(b.dataset.futureNext!==undefined&&matchMedia('(max-width:760px)').matches)document.querySelector('#future-workbench').scrollIntoView({behavior:'instant',block:'start'});
    }
    if(Object.hasOwn(FUTURE_GOALS,b.dataset.futureGoal??'')){
      futureUi.goal=b.dataset.futureGoal;updateFuture(`[data-future-goal="${futureUi.goal}"]`);
    }
    if(['preview','reset'].includes(b.dataset.futureEvent)){
      futureUi.event=b.dataset.futureEvent==='preview';updateFuture('[data-future-event]');
    }
  }
  if(b.dataset.researchDate&&research.records.some(r=>r.date===b.dataset.researchDate)){researchUi.date=b.dataset.researchDate;document.querySelector('#research-panel').innerHTML=html(lab.researchPanel());document.querySelector('[data-research-date="'+researchUi.date+'"]').focus({preventScroll:true});}
  if(b.dataset.jump&&['scenario-start','story-input','story-valuation','story-allocation','story-result'].includes(b.dataset.jump)){const target=document.getElementById(b.dataset.jump);target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});target?.focus({preventScroll:true});}
  if(b.dataset.introDecision&&Object.hasOwn(DECISIONS,b.dataset.introDecision)){
    introUi.decision=b.dataset.introDecision;
    document.querySelectorAll('[data-intro-decision]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.introDecision===introUi.decision)));
    document.querySelector('#intro-decision-content').innerHTML=html(decisionContent(introUi.decision));
  }
  if(b.dataset.introCycle!==undefined&&Number.isInteger(Number(b.dataset.introCycle))&&Number(b.dataset.introCycle)>=0&&Number(b.dataset.introCycle)<CYCLE_STEPS.length){
    introUi.cycle=Number(b.dataset.introCycle);
    document.querySelectorAll('.intro-cycle-nav [data-intro-cycle]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.introCycle)===introUi.cycle)));
    const fromNext=!b.closest('.intro-cycle-nav');
    document.querySelector('#intro-cycle-content').innerHTML=html(cycleContent(introUi.cycle));
    revealIntroCycle();
    if(fromNext)document.querySelector('.intro-cycle-nav [data-intro-cycle="'+introUi.cycle+'"]')?.focus({preventScroll:true});
  }
  if(b.dataset.introJump&&['intro-decision','intro-cycle'].includes(b.dataset.introJump)){
    if(b.dataset.introJump==='intro-cycle'){
      introUi.cycle={low:4,middle:1,high:2}[introUi.decision]??0;
      document.querySelectorAll('.intro-cycle-nav [data-intro-cycle]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.introCycle)===introUi.cycle)));
      document.querySelector('#intro-cycle-content').innerHTML=html(cycleContent(introUi.cycle));
      revealIntroCycle();
    }
    const target=document.getElementById(b.dataset.introJump);
    target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    target?.focus({preventScroll:true});
  }
  if(b.dataset.doc)openDoc(b.dataset.doc);
  if(b.hasAttribute('data-close'))document.querySelector('#document-dialog').close();
  if(b.dataset.feeProfile){Object.assign(state,updateExperiment(state,feePatch(FEE_PROFILES[b.dataset.feeProfile])));render();refreshDetail();}
  if(b.hasAttribute('data-use-fee')){Object.assign(state,updateExperiment(state,feePatch(defaults)));navigate('simulate');}
  if(b.dataset.story){commitReview({revision:b.dataset.story});}
  if(b.hasAttribute('data-load-story')){commitReview({...storyDefaults(state.revision,state),reinvest:state.reinvest,day:state.day});}
  if(b.dataset.draftFeeProfile){commitReview(feePatch(FEE_PROFILES[b.dataset.draftFeeProfile]));refreshDetail();}
  if(b.hasAttribute('data-review')){replaceState(draft,beginReview(state));navigate('revise');}
  if(b.hasAttribute('data-apply')){Object.assign(state,applyReview(state,draft));navigate('simulate');}
});
document.querySelector('#proof-dialog').addEventListener('close',()=>{if(proofTrigger?.isConnected)proofTrigger.focus({preventScroll:true});});
document.querySelector('#detail-dialog').addEventListener('close',()=>{if(detailTrigger?.isConnected)detailTrigger.focus({preventScroll:true});});
document.addEventListener('submit',e=>{
  const form=e.target.closest('[data-concept-form]');if(!form)return;
  e.preventDefault();if(!form.reportValidity())return;
  try{conceptUi=submitConcept(conceptUi,form.dataset.conceptForm,form.dataset.conceptStage,Object.fromEntries(new FormData(form)));}
  catch{let error=form.querySelector('[role="alert"]');if(!error){error=document.createElement('p');error.setAttribute('role','alert');form.append(error);}error.textContent=getLanguage()==='en'?'Check the amount, asset symbol and selected options.':'请检查金额、资产标识与所选选项';return;}
  render();window.scrollTo({top:0,behavior:'instant'});app.querySelector('[aria-current="step"]')?.focus({preventScroll:true});
});
document.addEventListener('toggle',e=>{if(e.target.id==='performance-assumptions'&&e.target.isConnected)flowUi.assumptionsOpen=e.target.open;},true);
document.addEventListener('input',e=>{
  if(e.target.hasAttribute('data-comparison-day')){setComparisonDay(Number(e.target.value));return;}
  const kind=e.target.dataset.conceptKind,field=e.target.dataset.conceptField;
  if(['vault','agent'].includes(kind)&&['draftAmount','draftAsset','draftGoal','draftMode','draftLimit'].includes(field)){conceptUi[kind][field]=e.target.value;return;}
  if(e.target.dataset.resultInput){
    const field=e.target.dataset.resultInput;
    if(e.target.type==='number'&&(e.target.value===''||!e.target.validity.valid)){e.target.setAttribute('aria-invalid','true');return;}
    e.target.removeAttribute('aria-invalid');
    setResultInput(field,['end','eventYear'].includes(field)?Number(e.target.value):e.target.value,e.target.id);return;
  }
  const key=e.target.dataset.input,dk=e.target.dataset.draft;
  if(dk){if(e.target.type==='number'&&(e.target.value===''||!e.target.validity.valid)){e.target.setAttribute('aria-invalid','true');return;}const value=['recovery','reinvest','cycles'].includes(dk)?e.target.checked:['years','eventYear','end',...FEE_KEYS].includes(dk)?Number(e.target.value):e.target.value;try{commitReview({[dk]:value});}catch{return;}refreshDetail(e.target.id);return;}
  if(!key)return;
  const v=['cycles','reinvest','recovery'].includes(key)?e.target.checked:['years','end','day',...FEE_KEYS].includes(key)?Number(e.target.value):e.target.value;
  if(e.target.type==='number'&&(e.target.value===''||!e.target.validity.valid)){e.target.setAttribute('aria-invalid','true');return;}
  const focusId=e.target.id;
  e.target.removeAttribute('aria-invalid');setInput(key,v);if(key!=='end')refreshDetail(focusId);
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
});
window.addEventListener('hashchange',()=>{if(flow)navigate(VIEWS.includes(location.hash.slice(1))?location.hash.slice(1):'overview');});
// A restored document is a fresh visit too; ordinary in-page steps retain state.
window.addEventListener('pageshow',event=>{if(event.persisted&&flow){navigate(location.hash.slice(1)||'overview',true);webTools();}});
history.scrollRestoration='manual';
function webTools(){if(!document.modelContext?.registerTool)return;
  const lifetime=new AbortController();
  const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch{}};
  register({name:'get_demo_state',description:'Read the shared CIRCLE simulation and its synchronized review snapshot.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected empty object');return {...state,researchDate:researchUi.date,draft:{...draft},simulation:simulate(state.view==='simulate'?{...state,revision:'unchanged'}:eventScenario(state)).points[state.day],...(state.view==='result'?{comparison:flow.comparisonSnapshot()}:{} )};}});
  register({name:'configure_simulation',description:'Set visible educational simulation controls. No chain execution.',inputSchema:{type:'object',properties:{years:{type:'number',enum:HORIZONS},shape:{type:'string',enum:Object.keys(MARKET_PATHS)},end:{type:'number',minimum:1,maximum:400},coreApr:{type:'number',minimum:0.1,maximum:120},activeApr:{type:'number',minimum:0.1,maximum:120},buyApr:{type:'number',minimum:0.1,maximum:120},day:{type:'integer',minimum:0,maximum:1825},cycles:{type:'boolean'},reinvest:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['years','shape','end',...FEE_KEYS,'day','cycles','reinvest'].includes(k)))throw new Error('Invalid input');
    if(FEE_KEYS.some(k=>input[k]!==undefined&&(!Number.isFinite(input[k])||input[k]<.1)))throw new Error('APR must be positive');
    const next=updateSimulationControls(state,input);if(input.day!==undefined)next.day=input.day;
    if(!Number.isInteger(next.day)||next.day<0||next.day>next.years*365)throw new Error('Invalid day');
    Object.assign(state,next);replaceState(draft,beginReview(state));navigate('simulate');return {...state,simulation:simulate(state.view==='simulate'?{...state,revision:'unchanged'}:eventScenario(state)).points[state.day],...(state.view==='result'?{comparison:flow.comparisonSnapshot()}:{} )};
  }});
  window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
}
try{
  const catalog=await (await fetch('locales/en.json')).json();
  // Plain pasted URLs always start in English; explicit language links stay shareable.
  configureLocale(catalog,new URL(location.href).searchParams.get('lang'));
  [data,documents,proposals,historyData,research,feeReference,workflow,aiEvidence]=await Promise.all(['circle-case','documents','prepared-proposals','history','research-trail','fee-reference','workflow-evidence','ai-evidence'].map(async name=>{const r=await fetch(`data/${name}.json`);if(!r.ok)throw new Error(getLanguage()==='en'?`Unable to load ${name}`:`无法读取 ${name}`);return r.json();}));
  const translatedBundle=await (await fetch('data/en/documents.json')).json();
  englishDocuments=translatedBundle.documents;
  for(const original of [...documents.documents,...research.documents]){const translated=englishDocuments[original.id];if(!translated||translated.originalExcerptSha256!==original.excerptSha256)throw new Error('English evidence needs a version refresh: '+original.id);}
  defaults=experimentDefaults();const initial=demoDefaults(research.latestDate);initial.state=updateSimulationControls(initial.state,{years:5,shape:'bull'});initial.draft=beginReview(initial.state);replaceState(state,initial.state);replaceState(draft,initial.draft);
  researchUi.date=research.latestDate;
  lab=createLab({state,draft,data,documents,proposals,defaults,feeReference,research,researchUi});
  const [liveEvidence,feeObservation]=await Promise.all([loadLive(),loadFeeObservation()]);
  flow=createFlow({liveEvidence,feeObservation,state,draft,data,historyData,research,feeReference,documents,ui:flowUi,lab,archiveEvidence:evidence});
  // Fresh accounts reset on reload, while bookmarked research routes remain addressable.
  const requestedView=location.hash.slice(1);
  initInvestment({navigate,render,getPerformance:amount=>performanceReport(amount,simulate({...state,revision:'unchanged'}),state.day)});initWallet();renderShell();navigate(VIEWS.includes(requestedView)?requestedView:'overview');webTools();
}catch(error){app.innerHTML=`<h1>${getLanguage()==='en'?'Unable to load the demo':'案例读取失败'}</h1><p>${esc(error.message)}</p><p>${getLanguage()==='en'?'Open this page through the local server and refresh.':'请通过本地服务打开，并刷新页面。'}</p>`;}

for(const kind of ['pointerover','focusin'])document.addEventListener(kind,e=>{
  const candle=e.target.closest?.('.candle');if(!candle)return;
  const output=candle.closest('.candle-preview')?.querySelector('.candle-readout');
  if(output)output.textContent=candle.getAttribute('aria-label');
});
