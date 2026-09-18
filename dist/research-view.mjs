import {CASES} from './long-term.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const doc=(id,text)=>'<button class="secondary" data-doc="'+esc(id)+'">'+text+' ↗</button>';
const percent=n=>(n>0?'+':'')+Number(n.toFixed(2))+'%';
const pp=n=>(n>0?'+':'')+Number((n*100).toFixed(2))+' 个百分点';
export function researchPanel(research,selectedDate){
  if(!research?.records?.length)return '<section class="panel"><h2>持续研究记录</h2><p>暂无已收录的研究副本。</p></section>';
  const record=research.records.find(r=>r.date===selectedDate)||research.records.at(-1);
  return '<section class="panel research-monitor" aria-label="新闻与经营数据持续跟踪"><div class="row"><div><div class="eyebrow">持续研究 · 真实运行回放</div><h2>每天跟踪，重要变化才修正策略。</h2></div><span class="badge">最近收录 '+esc(research.latestDate)+'</span></div><p>跟踪公司披露、经营数据与监管变化，复核它们是否改变公司的盈利能力和风险。</p><div class="research-coverage"><span>财报与公告</span><span>USDC 与经营数据</span><span>监管与市场异动</span><small>历史副本 · 非实时扫描</small></div><div class="research-dates" role="group" aria-label="选择真实研究日期">'+research.records.map(r=>'<button data-research-date="'+esc(r.date)+'" aria-pressed="'+(r.date===record.date)+'"><time>'+esc(r.date.slice(5).replace('-','.'))+'</time><strong>'+esc(r.title)+'</strong><span>'+esc(r.decision)+'</span></button>').join('')+'</div><div class="research-trace" aria-live="polite"><article><span class="trace-label">01 / 捕捉信息</span><h3>'+esc(record.title)+'</h3><p>'+esc(record.discovery)+'</p></article><article><span class="trace-label">02 / 连接经营因子</span><h3>'+esc(record.factors)+'</h3><p>'+esc(record.verification)+'</p></article><article class="research-verdict"><span class="trace-label">03 / 形成研究结论</span><h3>'+esc(record.decision)+'</h3><p>'+esc(record.action)+'</p></article></div><div class="research-outcome"><span><b>三情景估值维持</b> · 沿用 2026.08.22 版本</span><span>本条信息未形成调整 LP 的新依据</span></div><div class="research-foot"><span>当前展示 '+esc(record.date)+' 记录；来源与核验限制保留在副本中。</span>'+doc(record.documentId,'查看这次研究依据')+'</div></section>';
}
export function factorBridge(key){
  const c=CASES[key];
  const rows=key==='improve'?[
    ['USDC 规模','年度平均规模 '+percent((c.usdc-1)*100),'扩大储备收入基础'],
    ['分润质量','分润后利润率 '+pp(c.margin),'更多收入转成公司利润'],
    ['经常性收入','非储备收入 '+percent((c.other-1)*100),'提高可持续盈利预期']
  ]:key==='pressure'?[
    ['储备利润池','USDC '+percent((c.usdc-1)*100)+'；收益率 '+pp(c.yield),'规模与收益率共同承压'],
    ['盈利转化','分润后利润率 '+pp(c.margin),'收入留存能力减弱'],
    ['长期预期','EV / EBITDA 倍数 '+percent((c.multiple-1)*100),'成长与风险重新定价']
  ]:[
    ['规模与收益','经营假设维持','新信息尚不足以修正盈利预测'],
    ['商业化能力','经常性收入维持','等待可核验的收入与毛利'],
    ['价值判断','三情景边界维持','价格波动继续由原区间管理']
  ];
  return '<div class="factor-bridge" data-factor-case="'+key+'"><div class="row"><b>新信息如何进入估值？</b><span class="small">以下为模拟经营假设</span></div><div class="factor-cards">'+rows.map(([label,value,effect])=>'<article><span>'+label+'</span><strong>'+value+'</strong><p>→ '+effect+'</p></article>').join('')+'</div><p class="hint">经营因子先进入盈利与估值公式，再分别重算悲观、中性、乐观边界；新闻标题不直接决定 LP 区间。</p></div>';
}
export function historicalAi(research){
  if(!research?.historicalAi)return '';
  const a=research.historicalAi;
  return '<section class="panel historical-decision"><div class="row"><div><div class="eyebrow">真实 AI 提案 · '+esc(a.date)+'</div><h3>为什么当时是 $90–115，而不是卖出全部股票？</h3></div><span class="badge">业务摘录 · 随后人工批准</span></div><div class="ai-decisions"><article><span>价值依据</span><b>价值判断仍成立</b><p>参考价 $88.53 接近中性上沿 $88.71，继续保留宽 Core LP 和长期股票敞口。</p></article><article><span>技术判断</span><b>选择阶段退出区间</b><p>RSI 69.46、短线扩张偏热，并有 $105–115 压力区；用 $90–115 建立退出型 Active LP。</p></article><article><span>库存约束</span><b>用部分已有股票部署</b><p>Active 占 20%，使用钱包已有 CRCLx；保留 Core 和直接持股，不要求先卖股票凑现金。</p></article></div><div class="research-foot"><span>技术资料截至 '+esc(a.technicalAsOf)+'。这是历史实际输出的摘要，当前情景切换不调用实时 AI。</span>'+doc(a.documentId,'核对真实 AI 输入与输出')+'</div></section>';
}
export function solanaFlow(data){
  const pool=data?.prices?.primaryPoolId;
  return '<section class="panel solana-explainer"><div class="row"><div><div class="eyebrow">研究如何落到 SOLANA</div><h2>让股票的价值判断，进入链上的流动性。</h2></div><span class="badge">CIRCLE · Raydium</span></div><div class="solana-stages"><article><span>01</span><h3>公司估值与 AI 方案</h3><p>确定在哪些价格管理库存，以及保留多少长期持股。</p></article><article><span>02</span><h3>CRCLx / USDC LP</h3><p>通过 Raydium 集中流动性，在区间内逐步转换股票与现金，并累积手续费。</p></article><article><span>03</span><h3>仓位与结果可核对</h3><p>研究在链下完成，仓位在 Solana 上运行；由链上账户和 NAV / PNL 记录核验。</p></article></div><div class="research-foot"><span>本 Demo 使用历史方案与仓位快照；实盘证据与假设推演分别标注。</span><div><button class="secondary" data-go="evidence">查看真实运行证据 →</button>'+(pool?'<a class="source-link" href="https://solscan.io/account/'+esc(pool)+'" target="_blank" rel="noopener noreferrer">核对 Raydium 池账户 ↗</a>':'')+'</div></div></section>';
}
