const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=a=>'<ul>'+a.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
const MODULES={
  research:{title:'新闻与经营事实',input:'公司披露、经营数据、新闻候选和来源质量。',role:'Skill 规定哪些事实值得核验；AI 判断影响哪个经营因子；程序记录覆盖范围与失败来源。',output:'事实桥、观察结论，以及是否需要重新审查估值。',check:'只有标题、缺少原文或关键来源失败时，不把线索自动变成盈利预测。',doc:'bridge'},
  valuation:{title:'公司估值',input:'有日期的财务底稿、公司类型、经营假设与估值方法。',role:'Skill 规定估值口径；AI 组织研究假设；确定性公式重算三情景边界。',output:'带版本的估值依据和悲观／中性／乐观区间。',check:'原股价格和短期技术指标不能直接改写公司价值；新估值需独立复核。',doc:'valuation'},
  ai:{title:'AI 区间与持仓候选',input:'获确认的估值、当时价格和技术资料、现有库存、持有目标。',role:'Skill 约束 LP 的角色；AI 提出保留、关闭或迁移的候选，并说明资金与股票敞口的取舍。',output:'Core／Active 区间、配置、迁移通道、生命周期与理由。',check:'候选不等于执行事实。实际操作还需批准、执行预检和链上确认。',doc:'ai_decision'},
  math:{title:'计算与结果核对',input:'LP 区间、流动性、价格、分仓费用假设或真实费用数量、执行记录。',role:'程序计算股币库存与 NAV／PNL；AI 根据事实解释结果，不能覆盖底层数值。',output:'持仓、累计费用、复投去向和同口径基准。',check:'检查资金守恒、费用不重复入账、区间外不计费；假设收益和实盘收益分别展示。',doc:'pnl_latest'},
  execution:{title:'执行与持续复核',input:'已批准的策略意图、当前仓位、执行计划与链上证据。',role:'程序核对计划与事实；状态机识别运行阶段和复核需求。',output:'已确认仓位、生命周期、维持或复核的结论。',check:'NAV 变化不能直接证明发生交易；证据不充分时保留待确认状态。',doc:'monitor'}
};
export function proofView(key,{workflow,ai,caseKey='improve'}){
  const tabs=[['map','系统如何分工'],['runs','真实运行回放'],['candidates','AI 情景候选']];
  const tab=key==='runs'||key==='candidates'?key:'map';
  let body='';
  if(tab==='map'){
    const selected=MODULES[key]?key:'ai',m=MODULES[selected];
    body=`<p class="proof-lead">研究有方法，AI 有约束，运行有记录。</p><p>Skill 定义专业方法，AI 提出判断；确定性程序负责计算，Harness 负责依赖顺序、版本与运行状态。</p><div class="proof-map">${Object.entries(MODULES).map(([id,n])=>`<button data-proof="${id}" aria-pressed="${selected===id}">${n.title}</button>`).join('')}</div><section class="proof-node"><h3>${m.title}</h3><dl><dt>本模块读取</dt><dd>${m.input}</dd><dt>怎样处理</dt><dd>${m.role}</dd><dt>交付结果</dt><dd>${m.output}</dd><dt>进入下一步前</dt><dd>${m.check}</dd></dl><button class="secondary" data-doc="${m.doc}">查看已有业务产物 ↗</button></section><p class="hint">这是能力关系图，不表示每个节点每天都会运行。新信息触发复核，复核不一定改变估值；日常监控、估值重建和区间生成是不同流程。完整 Skill 与内部提示词保留私有。</p>`;
  }else if(tab==='runs'){
    body=`<span class="badge">真实历史运行 · 只读副本</span><h3>${esc(workflow.id)}</h3><p>${esc(workflow.startedAt)} → ${esc(workflow.completedAt)}</p><div class="proof-verdict"><b>程序完成；研究覆盖降级。</b><p>${esc(workflow.conclusion)}</p></div><ol class="run-list">${workflow.modules.map(n=>`<li><div><b>${esc(n.title)}</b><span class="badge ${n.degraded?'warning':''}">${n.degraded?'完成 · 覆盖降级':esc(n.status)}</span></div><p>${esc(n.result)}</p></li>`).join('')}</ol><p class="hint">该批次没有生成新 LP 区间、没有修订正式估值、没有执行交易。8 月历史 AI 提案与本次日常监控分属不同日期。</p><button class="secondary" data-doc="monitor">打开本批运行摘要 ↗</button><details class="method"><summary>运行版本与来源核验</summary><p>记录来源：${esc(workflow.source)}</p><p>SHA-256：<code>${esc(workflow.sourceSha256)}</code></p><p>请求模型：${esc(workflow.model)}。模型元数据来自运行记录，不是独立审计。摘要哈希用于检查版本一致性。</p></details>`;
  }else{
    const selected=['improve','pressure'].includes(caseKey)?caseKey:'improve';
    const run=ai?.runs?.find(r=>r.case===selected),p=run?.candidate;
    body=`<div class="proof-case-picker"><button data-proof-case="improve" aria-pressed="${selected==='improve'}">经营改善</button><button data-proof-case="pressure" aria-pressed="${selected==='pressure'}">经营承压</button></div>`;
    if(!p)body+='<p>本次隔离生成尚未归档；现有情景仍是预置模拟规则，不冒充实时 AI 输出。</p>';
    else body+=`<span class="badge">假设输入 · 实际 AI 生成 · 未执行交易</span><h3>${esc(p.title)}</h3><p class="hint">归档案例的复核价为 $100。这里展示当时的固定输入与输出，不随当前模拟控件变化。</p><p>${esc(p.valuationPosition)}</p><dl><dt>本次输入</dt><dd>第 2 年复核前的合成持仓、截至当时的价格节点、独立重算的估值边界、演示持有目标。未提供之后价格与收益。</dd><dt>谁决定比例</dt><dd>Core / Active / 持股 / 现金：${p.weights.map(w=>(w*100).toFixed(0)+'%').join(' / ')}。比例是给定的演示目标；AI 生成区间、迁移判断、理由和例外审查，未宣称优化这些比例。</dd><dt>AI 提出的 Core 参考带</dt><dd>$${p.coreRange[0].toFixed(2)}–$${p.coreRange[1].toFixed(2)} · ${esc(p.coreAction)}</dd><dt>Active 处理</dt><dd>${esc(p.activeAction)}</dd></dl><h4>为什么这样安排</h4>${list(p.rationale)}<details class="method"><summary>展开约束、资金与迁移审查</summary>${list(p.constraints)}<p>${esc(p.fundingReview)}</p><p>${esc(p.directSwapReason)}</p></details><h4>手续费与股票敞口的取舍</h4><p>${esc(p.feesTradeoff)}</p><p>${esc(p.betaReview)}</p><h4>这份结果的边界</h4>${list(p.limitations)}<div class="proof-verdict"><b>已归档并完成演示数值校验，仍是候选。</b><p>切换情景加载这份既有结果；拖动价格只重算数学，不会重新调用 AI。改变案例输入后属于使用该候选的模拟模板，不能视为 AI 对新输入的重新判断。</p></div><details class="method"><summary>生成记录与校验</summary><p>生成时间：${esc(run.completedAt)}</p><p>模型：${esc(run.model)} · ${esc(run.modelSemantics)}</p>${list(run.checks??[])}<p>输入摘要：<code>${esc(run.inputSha256)}</code></p><p>输出摘要：<code>${esc(run.rawOutputSha256)}</code></p></details>`;
  }
  return `<header class="proof-head"><div><div class="eyebrow">STRATEGY / EVIDENCE</div><h2 id="proof-title">策略依据与运行记录</h2></div><button class="close-button" data-proof-close aria-label="关闭策略依据">×</button></header><nav class="proof-tabs" aria-label="证据分类">${tabs.map(([id,title])=>`<button data-proof="${id}" aria-pressed="${tab===id}">${title}</button>`).join('')}</nav><div class="proof-body">${body}</div>`;
}
