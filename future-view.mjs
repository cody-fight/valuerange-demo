// Concept-only presets. No research ingestion, model calls, simulation or trading.
export const FUTURE_STEPS = [
  ['提供研究材料', '留下事实与来源'],
  ['建立公司估值', '选择适合的金融逻辑'],
  ['设置持有目标', '形成个人策略方案'],
  ['开启持续跟踪', '让判断随事实更新']
];
export const FUTURE_GOALS = {
  growth: {name:'偏长期持股', description:'保留更多股票，参与公司长期增长；以较小 LP 仓位补充费用收入。', weights:[20,5,70,5]},
  income: {name:'偏手续费现金流', description:'增加区间内的 LP 配置；接受更多股币转换，也可能在持续上涨时落后于持股。', weights:[35,20,35,10]}
};
const roles = ['Core LP','Active LP','独立持股','现金'];
const classes = ['core','active','stock','cash'];
const label = text => `<span class="future-label">${text}</span>`;

function sourcePreview(ui){
  const investor=ui.entry==='investor';
  return `<div class="future-preview-head">${label('01 / RESEARCH')}<span class="future-chip">预置材料 · 示例公司</span></div>
    <h3>${investor?'选用一份有依据的资产研究档案。':'从你信任的材料，建立公司研究档案。'}</h3>
    <p>${investor?'未来可查看研究者整理的来源与假设，再选择适合自己的资产。这里用一家虚构芯片公司预览流程。':'未来可提供财报、研报或电话会议资料。系统整理事实、登记来源，把研究判断与已披露数字分开。'}</p>
    <div class="future-materials">
      <article><span class="future-file">01</span><div><b>季度财报</b><p>收入、毛利、研发投入</p></div><small>示例 Q2</small></article>
      <article><span class="future-file">02</span><div><b>业绩电话会议</b><p>订单趋势、产能与经营指引</p></div><small>示例 Q2</small></article>
      <article><span class="future-file">03</span><div><b>行业研究报告</b><p>行业需求、竞争与估值参照</p></div><small>示例版本 01</small></article>
    </div>
    <div class="future-artifact"><span>形成的结果</span><b>示例芯片公司 · 资产研究档案 v1</b><p>每条关键事实保留来源、期间和计量单位；有冲突或缺失的资料进入待核实清单。</p></div>
    <div class="future-gap"><span aria-hidden="true">○</span><p><b>仍需核实：</b>订单是否已转为收入。经营指引与已实现业绩分别记录。</p></div>`;
}

function valuationPreview(){
  return `<div class="future-preview-head">${label('02 / VALUATION')}<span class="future-chip">金融逻辑示意</span></div>
    <h3>理解公司怎样赚钱，再选择估值方法。</h3>
    <p>示例芯片公司以收入、利润率与现金流为线索。研究者复核关键假设，形成带版本的悲观、中性、乐观估值。</p>
    <div class="future-model"><span>示例公司的建模思路</span><div><b>收入 × 利润率</b><i aria-hidden="true">→</i><b>利润与现金流</b><i aria-hidden="true">→</i><b>估值区间</b></div><p>结合研发、资本开支、估值倍数、净现金与股数，检查不同经营结果对应的每股价值。</p></div>
    <div class="future-scenarios"><article><span>悲观</span><b>需求承压</b><p>收入放缓，利润率下降</p></article><article><span>中性</span><b>按计划兑现</b><p>订单与产能逐步转为收入</p></article><article><span>乐观</span><b>增长超出预期</b><p>需求与盈利能力同步改善</p></article></div>
    <div class="future-artifact"><span>形成的结果</span><b>三情景估值 v1 + 关键跟踪因子</b><p>估值上下界、假设、来源与复核状态一起保留，供后续 AI 区间生成使用。</p></div>
    <p class="future-callout">公司模型需要逐家适配。CIRCLE 的储备收益逻辑，可在 <button class="text-button" data-go="overview">01 的实际案例中查看 ↗</button>。</p>`;
}

function allocationBar(weights){
  return `<div class="future-allocation" role="img" aria-label="示意配比：${roles.map((r,i)=>r+' '+weights[i]+'%').join('，')}">${weights.map((w,i)=>`<span class="${classes[i]}" style="width:${w}%"></span>`).join('')}</div><div class="future-allocation-labels">${roles.map((r,i)=>`<div><span><i class="${classes[i]}"></i>${r}</span><b>${weights[i]}%</b></div>`).join('')}</div>`;
}

function goalPreview(ui){
  const goal=FUTURE_GOALS[ui.goal];
  return `<div class="future-preview-head">${label('03 / PERSONAL STRATEGY')}<span class="future-chip">预置配比 · 非新生成方案</span></div>
    <h3>同一份研究，安排不同的股票与现金。</h3>
    <p>用户决定持有目标与资金约束。未来 AI 结合公司估值、技术指标和实际库存，生成带解释的候选方案。</p>
    <div class="future-goals" role="group" aria-label="预览持有目标">${Object.entries(FUTURE_GOALS).map(([id,g])=>`<button data-future-goal="${id}" aria-pressed="${ui.goal===id}">${g.name}</button>`).join('')}</div>
    ${allocationBar(goal.weights)}<p class="future-goal-description">${goal.description}</p>
    <div class="future-artifact"><span>形成的结果</span><b>个人策略候选 · 等待复核</b><p>Core LP 与 Active LP 的区间、占比、退出与重新进入条件，一起进入可检查的行动方案。</p></div>
    <p class="future-callout">这些比例仅演示持有偏好如何影响配置，不关联真实标的，也不计算预期收益。</p>`;
}

function trackingPreview(ui){
  const updated=ui.event;
  return `<div class="future-preview-head">${label('04 / CONTINUOUS RESEARCH')}<span class="future-chip">${updated?'财报更新演示':'未来工作台预览'}</span></div>
    <h3>资料会更新，估值与策略也要跟上。</h3>
    <p>研究 Agent 跟踪事实，策略 Agent 提出调整，程序核验资金与执行条件。每次变化保留依据和版本。</p>
    <div class="future-watch"><div><span class="future-watch-dot" aria-hidden="true"></span><b>示例芯片公司</b><span>跟踪清单</span></div><p>订单兑现 · 利润率 · 研发与资本开支 · LP 区间状态 · 手续费与持股对照</p></div>
    <div class="future-event-title"><b>${updated?'示例 Q3：增长得到财报确认':'下一次财报，可能改变哪些判断？'}</b><button class="${updated?'secondary':'primary'}" data-future-event="${updated?'reset':'preview'}">${updated?'重置更新演示':'预览下一次财报更新'} <span aria-hidden="true">${updated?'↺':'→'}</span></button></div>
    <div class="future-event-cards ${updated?'updated':''}">
      <article><span>研究 Agent · 事实</span><h4>${updated?'订单转为收入':'持续关注订单兑现'}</h4><p>${updated?'示例财报确认收入与利润率改善，提取证据供研究复核。':'先区分经营指引与已实现业绩，避免把预期当作事实。'}</p></article>
      <article><span>估值研究 · 假设</span><h4>${updated?'三情景区间建议上移':'估值 v1 仍为基准'}</h4><p>${updated?'提交 v2 候选与变化理由。复核前，已批准的 v1 保持有效。':'悲观、中性、乐观分别关联核心经营假设与待跟踪因子。'}</p></article>
      <article><span>策略 Agent · 配置</span><h4>${updated?'提高持股，减少 Active LP':'按持有目标安排仓位'}</h4><p>${updated?'展示新估值获批后的一种候选方向：保留更多上行敞口，重估 Core LP 区间。':'用估值、持有目标与实际库存共同约束 LP 配置。'}</p></article>
    </div>
    <div class="future-event-status" role="status"><b>${updated?'当前演示停在「待复核」':'点击按钮，预览从财报到策略的传递'}</b><span>${updated?'尚未替换有效估值，也未执行任何交易。':'这是预置事件，页面没有连接新闻源或后台监控。'}</span></div>
    <div class="future-agent-route"><span>事实更新</span><i>→</i><span>估值复核</span><i>→</i><span>策略提案</span><i>→</i><span>授权与校验</span><i>→</i><span>链上执行</span><i>→</i><span>核对与复盘</span></div>
    <p class="future-callout">未来执行 Agent 在用户授权范围内行动；成交事实进入 NAV／PNL，再反馈到下一轮研究与策略复盘。</p>`;
}

export function futureWorkbench(ui){
  const step=ui.step;
  return `<div class="future-workspace-head"><div><span class="future-label">PRODUCT PREVIEW</span><h2 id="future-workbench-title" tabindex="-1">预览接入一只新股票</h2><p>示例芯片公司 · 全部材料与交互为预置概念演示</p></div><div class="future-entry" role="group" aria-label="选择产品入口"><button data-future-entry="investor" aria-pressed="${ui.entry==='investor'}">我是投资者</button><button data-future-entry="researcher" aria-pressed="${ui.entry==='researcher'}">我是研究者</button></div></div>
    <div class="future-workspace-body"><nav class="future-step-nav" aria-label="新股票接入步骤">${FUTURE_STEPS.map(([name,sub],i)=>`<button data-future-step="${i}" aria-pressed="${step===i}" aria-controls="future-step-preview"><span>0${i+1}</span><div><b>${name}</b><small>${sub}</small></div></button>`).join('')}<p>点击任意步骤<br>查看未来产品的输入与结果。</p></nav>
    <div class="future-preview" id="future-step-preview"><div class="future-preview-content">${[sourcePreview,valuationPreview,goalPreview,trackingPreview][step](ui)}</div><div class="future-preview-foot"><span>0${step+1} / 04 · 概念预览</span>${step<3?`<button class="text-button" data-future-next="${step+1}">下一步：${FUTURE_STEPS[step+1][0]} →</button>`:`<button class="text-button" data-future-next="0">回到接入起点 ↺</button>`}</div></div></div>`;
}

export function futurePage(ui){
  return `<div class="future-page"><div class="page-heading"><div><div class="eyebrow">BEYOND CIRCLE / 05</div><h1 tabindex="-1"><span>从一个案例，</span><span>到更多人的链上策略。</span></h1><p>CIRCLE 展示了运行方式。下一步，让投资者、研究者与 Agent 都能使用这套能力。</p></div></div>
    <section class="future-hero"><div><span class="future-concept-badge">未来产品概念 · 待开发</span><h2>让每一份股票研究，<br>成为持续运行的链上策略。</h2><p>从财报与研究建立公司估值，用 AI 安排 LP、股票与现金，再让基本面跟踪和仓位复盘持续修正判断。</p><button class="primary" data-future-start>预览未来的使用方式 <span aria-hidden="true">↘</span></button></div><div class="future-vision"><span class="future-label">从个人运行，到共同使用</span><ol><li><span>01</span><div><b>一只股票，验证闭环</b><p>CIRCLE 的研究、配置与实盘记录</p></div></li><li><span>02</span><div><b>更多资产，适配公司模型</b><p>复用流程，逐家建立金融依据</p></div></li><li><span>03</span><div><b>更多用户与 Agent</b><p>共享研究版本，独立管理策略与资金</p></div></li></ol></div></section>
    <section class="future-workspace" id="future-workbench" aria-labelledby="future-workbench-title">${futureWorkbench(ui)}</section>
    <section class="future-section"><div class="future-section-head"><span class="future-label">HOW IT SCALES</span><h2>一份研究可以复用，每个人的资金独立安排。</h2><p>未来平台按资产维护研究版本，按用户管理目标与仓位，再通过标准接口连接 Solana。</p></div>
      <div class="future-layers"><article><span class="future-layer-number">01 / 资产研究层</span><h3>有来源的公司判断</h3><p>财务底稿、公司估值模型、跟踪因子与历史版本。经审核的公共研究可以复用，私人材料按权限隔离。</p><div><span>投资者选用</span><span>研究者维护</span></div></article><article><span class="future-layer-number">02 / 个人策略层</span><h3>受目标约束的 AI 提案</h3><p>同一研究版本结合不同持有目标，生成个人 LP 与库存方案。程序检查资金、区间与行动条件。</p><div><span>个人工作台</span><span>Agent 接口 · 规划</span></div></article><article><span class="future-layer-number">03 / Solana 执行层</span><h3>可核对的仓位与结果</h3><p>未来通过钱包授权执行策略，以交易和仓位事实完成记账与复盘，再逐步探索策略金库。</p><div><span>钱包授权 · 规划</span><span>策略金库 · 规划</span></div></article></div>
      <div class="future-loop"><span aria-hidden="true">↶</span><p><b>结果回到研究与策略：</b>收益来自股价、手续费还是库存转换？复盘帮助定位问题，再提出下一次调整。</p></div>
      <details class="method"><summary>哪些能力已有工程基础？难点在哪里？</summary><div class="future-foundations"><article><b>资料能否进入金融模型</b><p>已有底稿、来源登记与版本管理流程。扩展时仍需适配公司模型，检查数据质量及资料使用权限。</p></article><article><b>AI 判断能否对应实际结果</b><p>已有候选策略、执行预检、NAV／PNL 与核对接口。当前 CIRCLE 实盘由用户执行，钱包自动执行仍待研发。</p></article><article><b>一套流程能否服务更多用户</b><p>已有新公司 Setup 与通用 Daily 编排框架。多用户隔离、并发任务、成本控制和服务可靠性需要继续建设。</p></article></div><p>研究与 AI 计算在链下进行；未来拟开放策略数据标准、执行接口与必要合约，具体研究服务可按权限提供。</p></details>
    </section>
    <section class="future-section"><div class="future-section-head"><span class="future-label">DEVELOPMENT ROADMAP</span><h2>从可复核的案例，走向可参与的协议。</h2><p>先验证多资产与多用户的运行，再逐步开放执行能力。</p></div><div class="future-roadmap">
      <article class="present"><span class="future-road-status">已有基础</span><h3>CIRCLE 运行闭环</h3><p>私有研究与实盘流程、公开演示，以及新公司接入的工程框架。</p><button class="text-button" data-go="evidence">查看真实运行证据 ↗</button></article>
      <article><span class="future-road-status">下一阶段</span><h3>多资产个人工作台</h3><p>研究档案、公司模型适配、个人策略目标与持续跟踪。</p><small>重点：数据质量、用户隔离、任务调度</small></article>
      <article><span class="future-road-status">后续研发</span><h3>钱包授权与 Agent</h3><p>在授权范围内执行，并提供可供外部 Agent 使用的接口。</p><small>重点：权限约束、可靠执行、成交核对</small></article>
      <article><span class="future-road-status">长期方向</span><h3>链上策略金库</h3><p>探索让用户通过金库份额参与有明确规则的策略。</p><small>重点：合约审计、份额与申赎、风险控制</small></article>
    </div><p class="future-scope">新资产优先选择资料可靠、链上标的与流动性条件合适的公司。图中路线代表研发方向，不代表已支持所有股票或已开放自动投资。</p></section>
    <section class="future-closing"><div><span class="future-label">VALUATION → AI → LP → REVIEW</span><h2>从理解公司，到持续管理链上仓位。</h2><p>用 CIRCLE 验证逻辑，把可复用的部分逐步变成产品。</p></div><button class="secondary" data-go="overview">回到 CIRCLE 案例 <span aria-hidden="true">↗</span></button></section>
    <footer class="note">未来产品概念 · 预置示例，不接收真实材料、不调用在线 AI、不签名或执行交易。当前可体验的模拟与实盘证据分别位于 02／03 与 04。</footer></div>`;
}
