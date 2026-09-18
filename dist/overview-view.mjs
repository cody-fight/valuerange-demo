import {BASE} from './long-term.mjs';
import {historicalAi,solanaFlow} from './research-view.mjs';
const money=(n,d=2)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:d}).format(n);
const band=r=>money(r[0])+'–'+money(r[1]);
const doc=(id,title)=>'<button class="secondary" data-doc="'+id+'">'+title+' ↗</button>';
const sectionTitle=(n,title,sub)=>'<div class="intro-section-title"><span>'+n+'</span><div><h2>'+title+'</h2><p>'+sub+'</p></div></div>';

export const DECISIONS={
  low:{label:'价格偏低',subtitle:'价值判断仍成立',title:'完成积累，把股票留下来。',lead:'先复核公司是否仍值得持有，再决定增加持股。',
    why:'价格相对研究估值更低，但经营逻辑没有被新证据推翻，持股的吸引力可能上升。',
    action:'Active 完成计划中的积累后关闭，持股等待下一次部署条件；Core 继续遵循自己的宽区间规则。',
    tradeoff:'持股仍承担继续下跌的风险。关闭 LP 后停止该仓位的手续费，也不会抹去此前的无常损失。',
    roles:['stock','active'],next:'看一次积累完成后如何等待',jump:'intro-cycle'},
  middle:{label:'适合区间交易',subtitle:'愿意在这些价格转换库存',title:'让部分股票和现金，在区间里工作。',lead:'把愿意买卖的价格带，交给链上的自动做市机制执行。',
    why:'在价值判断仍有效的前提下，愿意随价格上涨卖出一部分、随下跌买回一部分。',
    action:'Core LP 管理较宽范围的库存转换；Active LP 执行阶段买卖；另留直接持股与现金，分担不同职责。',
    tradeoff:'手续费可能不足以抵消相对持有的损失；价格单边上涨时，LP 逐步卖股，可能落后于直接持股。',
    roles:['core','active'],next:'看买卖如何执行',jump:'intro-cycle'},
  high:{label:'价格偏高',subtitle:'增长预期已较充分反映',title:'分批兑现，再给下一次机会留现金。',lead:'明确这部分股票愿意卖到哪里，也明确卖完以后怎么处理。',
    why:'相对当前估值，继续持股的安全边际减小，部分库存进入计划兑现的价格带。',
    action:'Active LP 在退出带内逐步换成现金，触及上沿后关闭。独立持股继续参与上行，Core 按自己的规则运行。',
    tradeoff:'价格可能继续上涨，已兑现的部分会错过后续涨幅；保留持股能缓解卖飞，但不能保证两边收益都拿到。',
    roles:['active','cash','stock'],next:'看兑现后如何等待',jump:'intro-cycle'},
  changed:{label:'公司价值改变',subtitle:'经营假设需要重估',title:'先修正价值，再决定如何持有。',lead:'研究跟踪的是公司变化，持仓也要跟着新的判断调整。',
    why:'新闻、财报或经营数据经过核实，足以改变原来的盈利预期与估值边界。',
    action:'改善时，减少阶段卖出、提高直接持股并上移 Core；恶化时，关闭旧 Core 与 Active、提高现金，等待新依据。',
    tradeoff:'研究可能判断错误或反应滞后。防守后若迅速反弹，现金会错过这段涨幅；不会因为股价跌了就认定更便宜。',
    roles:['stock','cash'],next:'体验一次基本面修正',go:'revise'}
};
const ROLES=[
  ['stock','持股','参与长期增长','保留股票，承担上涨与下跌。'],
  ['core','Core LP','持续库存转换','在较宽价格区间转换股票与现金。'],
  ['active','Active LP','执行阶段买卖','有明确的积累、兑现与停止条件。'],
  ['cash','现金','保存下一次购买力','等待条件，不持续获取 LP 手续费。']
];
export function decisionContent(key='low'){
  const d=DECISIONS[key]||DECISIONS.low;
  return '<div class="decision-copy"><div class="decision-lead"><span class="intro-kicker">持仓思路</span><h3>'+d.title+'</h3><p>'+d.lead+'</p><button class="text-button" '+(d.go?'data-go="'+d.go+'"':'data-intro-jump="'+d.jump+'"')+'>'+d.next+' →</button></div><dl class="decision-reason"><div><dt>为什么</dt><dd>'+d.why+'</dd></div><div><dt>怎么做</dt><dd>'+d.action+'</dd></div><div class="decision-tradeoff"><dt>要接受的代价</dt><dd>'+d.tradeoff+'</dd></div></dl></div><div class="roles-caption">同一组合，可以同时使用这四种持仓方式</div><div class="intro-roles">'+ROLES.map(([id,name,purpose,detail])=>'<article class="'+(d.roles.includes(id)?'emphasized':'')+'"><span class="role-dot '+id+'"></span><h4>'+name+'</h4><b>'+purpose+'</b><p>'+detail+'</p></article>').join('')+'</div>';
}
const b=BASE;
export const CYCLE_STEPS=[
  {label:'持股等待',title:'这一部分，先以股票参与价格变化。',stock:'持有股票',cash:'暂未兑现',fee:false,condition:'在上一轮 '+money(b.buy[0],0)+' 完成积累并关闭后，持股等待；回升至预设 '+money(b.sell[0],0)+' 才重新开启退出带。',
    action:'等待期间，不让这部分股票继续被 LP 自动换成现金。',risk:'股价可能继续下跌，持股等待不等于亏损已经修复。'},
  {label:'分批兑现',title:'价格穿过退出带，股票逐步变成现金。',stock:'逐步减少',cash:'逐步增加',fee:true,condition:'Active LP 在 '+band(b.sell)+' 退出带运行，价格进入区间才产生费用。',
    action:'区间内上涨时分批卖出；若价格在区间内回落，也会反向买回。到上沿才完成这轮兑现。',risk:'价格可能未到上沿就回落；即使完成兑现，也可能继续上涨。'},
  {label:'持现等待',title:'达到卖出上沿，关闭这一轮 LP。',stock:'该段已兑现',cash:'保留现金',fee:false,condition:'触及 '+money(b.sell[1],0)+' 后关闭退出带。已有现金等待回落至预设 '+money(b.buy[1],0)+'。',
    action:'卖出后的资金保持现金，不因价格回到原退出带就自动买回；等待新的积累条件。',risk:'如果价格一直上涨或不再回到买入带，这部分现金会落后于股票。'},
  {label:'分批积累',title:'价格穿过积累带，现金逐步变成股票。',stock:'逐步增加',cash:'逐步减少',fee:true,condition:'回落至 '+money(b.buy[1],0)+'，用已有现金开启 '+band(b.buy)+' 积累带。',
    action:'区间内下跌时逐步买入；若在区间内反弹，也会反向卖出。价格触及下沿后，才完成本轮积累。',risk:'积累区间不是已知的市场底部；公司价值变化时需要重新判断。'},
  {label:'完成积累',title:'达到买入下沿，关闭 LP、留下股票。',stock:'保留所得股票',cash:'已用于积累',fee:false,condition:'触及 '+money(b.buy[0],0)+' 后关闭积累带，回到持股等待；下一轮重新部署需满足预设条件。',
    action:'后续反弹先由股票参与，回到退出带的启用条件后才再次部署。',risk:'关闭改变的是之后的持仓方式，无法消除此前相对持有的损失。'}
];
export function cycleContent(index=0){
  const c=CYCLE_STEPS[index]||CYCLE_STEPS[0];
  return '<div class="cycle-detail"><div class="cycle-inventory"><span class="intro-kicker">这部分 Active 资金</span><div><span class="inventory-token stock">股票<b>'+c.stock+'</b></span><span class="inventory-token cash">现金<b>'+c.cash+'</b></span></div><span class="cycle-fee '+(c.fee?'earning':'waiting')+'">'+(c.fee?'区间内收取手续费':'此阶段不产生新的 LP 手续费')+'</span></div><div class="cycle-explanation"><span class="intro-kicker">步骤 '+(index+1)+' / 5</span><h3>'+c.title+'</h3><p>'+c.condition+'</p><p>'+c.action+'</p><p class="cycle-risk">需要接受：'+c.risk+'</p></div></div><div class="cycle-bottom"><span>可直接点击步骤，也可按顺序继续。</span><button class="text-button" data-intro-cycle="'+((index+1)%CYCLE_STEPS.length)+'">'+(index===4?'回到持股等待':'下一步：'+CYCLE_STEPS[index+1].label)+' →</button></div>';
}
function valuationChart(nodes){
  const max=Math.max(...nodes,...b.core,190)*1.08,x=p=>36+p/max*590;
  return '<div class="intro-chart-scroll"><svg class="valuation-chart" viewBox="0 0 680 240" role="img" aria-label="CIRCLE 历史三情景估值与 LP 区间的对应">'+
  ['悲观','中性','乐观'].map((label,i)=>'<rect x="'+x(nodes[i])+'" y="35" width="'+(x(nodes[i+1])-x(nodes[i]))+'" height="62" rx="5" fill="'+['#e4e9f7','#d5dfff','#dcece6'][i]+'"/><text x="'+((x(nodes[i])+x(nodes[i+1]))/2)+'" y="72" text-anchor="middle" fill="#50617a">'+label+'</text>').join('')+
  nodes.map(v=>'<text x="'+x(v)+'" y="116" text-anchor="middle" fill="#65718b">'+v.toFixed(2)+'</text>').join('')+
  '<path d="M'+x(b.core[0])+' 153H'+x(b.core[1])+'" stroke="#314deb" stroke-width="5"/><text x="'+((x(b.core[0])+x(b.core[1]))/2)+'" y="175" text-anchor="middle" fill="#314deb">Core LP '+band(b.core)+'</text>'+
  '<path d="M'+x(b.sell[0])+' 200H'+x(b.sell[1])+'" stroke="#168477" stroke-width="5"/><text x="'+((x(b.sell[0])+x(b.sell[1]))/2)+'" y="224" text-anchor="middle" fill="#168477">Active LP '+band(b.sell)+'</text></svg></div>';
}
export function overviewPage({data,research,ui}){
  return '<div class="overview-intro"><div class="page-heading"><div><div class="eyebrow">CIRCLE / 从估值到策略</div><h1 tabindex="-1">用 AI，把公司估值变成链上 LP 策略。</h1><p>以 CIRCLE 为例，理解一种结合价值判断、库存管理与手续费的持股方式。</p></div><span class="badge blue">产品导览</span></div>'+
  '<section class="intro-hero"><div class="intro-hero-copy"><div class="eyebrow">THE IDEA</div><h2>先理解公司的价值，<br>再安排手里的股票与现金。</h2><p>根据公司价值，决定何时多持股票、何时通过 LP 分批买卖并收取手续费、何时保留现金等待。</p><p class="intro-definition">LP 是为链上交易提供流动性的仓位。设定价格区间后，自动做市机制（AMM）随价格变化转换股票与现金。</p><div class="intro-hero-actions"><button class="primary" data-intro-jump="intro-decision">先看持仓怎么决定 <span>↓</span></button><button class="text-button" data-journey-start>体验 CIRCLE 经营改善情景 →</button></div></div><div class="intro-route" aria-label="产品工作流程"><div class="intro-kicker">从研究，到持续管理</div><ol><li><span>01</span><div><b>研究公司</b><small>财报、经营数据与新闻</small></div></li><li><span>02</span><div><b>判断价格位置</b><small>把市场价格放回估值中比较</small></div></li><li><span>03</span><div><b>AI 提出持仓与区间</b><small>结合估值、技术面、现有库存与目标</small></div></li><li><span>04</span><div><b>执行，再持续复核</b><small>管理股票与现金，跟踪新的变化</small></div></li></ol></div></section>'+
  '<section class="intro-section">'+sectionTitle('01','先有价值依据，才谈价格贵不贵。','三情景估值，描述同一家公司在不同经营假设下的价值范围。')+
  '<div class="panel intro-value"><div class="value-reason-flow"><div><small>事实底座</small><b>公司怎么赚钱</b><p>财报、业务规模、收入与费用</p></div><span aria-hidden="true">→</span><div><small>金融逻辑</small><b>能留下多少利润</b><p>收入能否转成可持续盈利</p></div><span aria-hidden="true">→</span><div><small>条件判断</small><b>不同经营状态值多少</b><p>形成悲观、中性与乐观估值</p></div></div>'+
  '<div class="intro-scenarios"><div><b>悲观</b><p>较弱的增长与盈利假设</p></div><div><b>中性</b><p>经营预期逐步兑现</p></div><div><b>乐观</b><p>增长与盈利质量共同改善</p></div></div>'+
  '<div class="value-distinction"><b>价格下跌时，先分清是哪一种变化。</b><p>如果价值判断仍成立，较低价格可能更值得持有；如果公司赚钱能力变差，原来的“便宜”就需要重新评估。</p></div>'+
  '<div class="intro-inline-link"><span>每天的新闻与财务跟踪，用来复核这些经营假设。</span><button class="text-button" data-go="revise">看看价值如何修正 →</button></div>'+
  '<details class="method"><summary>展开 CIRCLE 的金融依据与底稿</summary><p>Circle 的研究底座关注 USDC 规模、储备收益率、分润质量与费用。不同经营假设先改变利润，再改变每股估值。</p><div class="formula"><b>平均 USDC × 储备收益率 + 经常性收入</b><br>× 分润后利润率 − 经营费用<br>→ 正常化 EBITDA × 估值倍数<br>→ 加可用净现金，再除稀释股数</div><p>采用 2026 Q2 财务底座、2026.08.22 估值版本；273m 稀释股数、约 $1.612bn 可用净现金。USDC 持有人的储备不计入股东资产。未来经营参数和估值倍数属于研究假设。</p>'+doc('valuation_inputs','查看财务底稿摘录')+doc('valuation','查看估值模型与完整计算')+'</details></div></section>'+
  '<section class="intro-section" id="intro-decision" tabindex="-1">'+sectionTitle('02','有了价值判断，股票与现金怎么安排？','选择一种情况，看看持仓思路、执行动作和需要接受的代价。')+
  '<div class="panel decision-panel"><div class="decision-choices" role="group" aria-label="选择持仓判断情景">'+Object.entries(DECISIONS).map(([key,d])=>'<button data-intro-decision="'+key+'" aria-pressed="'+(ui.decision===key)+'"><b>'+d.label+'</b><span>'+d.subtitle+'</span></button>').join('')+'</div><div id="intro-decision-content" aria-live="polite">'+decisionContent(ui.decision)+'</div><p class="hint decision-boundary">估值提供价格参照；具体区间还要结合技术面、已有库存和持有目标。以上是持仓原则；实际部署需要明确的区间与触发条件。</p></div></section>'+
  '<section class="intro-section" id="intro-cycle" tabindex="-1">'+sectionTitle('03','跟着一轮买卖，理解“带手续费的网格”。','这里拆开演示 Active LP 的一轮生命周期；每一步都有继续或停止的条件。')+
  '<div class="panel cycle-panel"><div class="intro-cycle-nav" role="group" aria-label="查看 Active LP 执行步骤">'+CYCLE_STEPS.map((c,i)=>'<button data-intro-cycle="'+i+'" aria-pressed="'+(ui.cycle===i)+'"><span>0'+(i+1)+'</span><b>'+c.label+'</b></button>').join('')+'</div><div id="intro-cycle-content" aria-live="polite">'+cycleContent(ui.cycle)+'</div>'+
  '<div class="core-parallel"><span class="role-dot core"></span><div><b>并行的 Core LP，承担另一份职责。</b><p>当前示例的 Core LP 在 '+band(b.core)+' 宽区间持续运行。出区间时不计费，重新进入时继续转换；Active 的关闭动作不会一起关闭 Core。重大基本面恶化时，动态方案才会关闭两类 LP。</p></div></div>'+
  '<details class="method"><summary>这轮演示的规则边界与无常损失</summary><p>无常损失，是 LP 相对一直持有入场时股币组合的价值差额。退出 LP 会改变之后持有的资产，不会消除此前相对持有的损失。固定区间内，价格往返本身不会凭空增加本金；本演示的路径差异来自关闭、持有现金或股票、再按条件部署。</p><p>原始实盘 Active 是 '+band(b.sell)+' 退出型方案；'+band(b.buy)+' 积累段与重复部署是长期推演的扩展假设。规则预先设定，不读取未来高低点，也不证明历史上执行过这些轮次。</p><p>本流程展示一个循环：从已完成积累后的持股阶段开始。02 的历史结构起点为 $88.53，Active 退出带已部署、尚未进入计费区间。</p><a href="https://docs.raydium.io/algorithms/impermanent-loss" target="_blank" rel="noopener noreferrer">了解 LP 相对持有的风险 ↗</a></details></div></section>'+
  '<section class="intro-section" id="intro-circle">'+sectionTitle('04','把这些判断，放回当时的 CIRCLE 案例。','先看为什么这样安排，再核对价格、比例与历史 AI 依据。')+
  '<div class="panel intro-case"><div class="intro-case-head"><div><span class="intro-kicker">历史方案 · 2026.08.24</span><h3>参考价 $88.53：保留长期持股，安排部分阶段兑现。</h3><p>当时价格接近中性估值上沿。AI 结合偏热的技术面、$105–115 压力区和已有股票，提出 Active LP 退出带，同时保留 Core 与直接持股。</p></div><span class="badge">预生成历史输出 · 随后人工批准</span></div><div class="intro-case-grid"><div class="intro-case-chart"><div class="row"><b>2027E 三情景估值与历史区间</b><span class="small">估值版本 2026.08.22</span></div>'+valuationChart(data.valuation.nodes)+'<p class="hint">色带是经营估值，横线是具体 LP 方案。Core 与 Active 可以跨越估值区域，并不是将三种情景直接复制为三个交易区间。</p></div><div class="intro-case-allocation"><h4>历史入场时，四份资金分别做什么</h4><div class="table-wrap"><table><thead><tr><th>资金用途</th><th>占比</th><th>安排</th></tr></thead><tbody><tr><td>Core LP</td><td>38.95%</td><td>'+band(b.core)+'</td></tr><tr><td>Active LP</td><td>20.00%</td><td>'+band(b.sell)+'</td></tr><tr><td>直接持股</td><td>37.21%</td><td>参与长期涨跌</td></tr><tr><td>现金储备</td><td>3.84%</td><td>保留资金弹性</td></tr></tbody></table></div><p class="hint">这是历史结构的标准化示例；比例随价格变化，不是每天恢复的目标，也不是当前实盘分配。</p></div></div>'+
  '<div class="proof-links"><button class="secondary" data-proof="valuation">这个估值怎么得到？ ↗</button><button class="secondary" data-proof="ai">AI 如何生成策略？ ↗</button></div><div class="intro-ai-summary"><span class="intro-kicker">AI 在这里做什么</span><p><b>综合估值、技术面、库存和持有目标，提出可解释的区间与仓位方案。</b> AMM 数学计算股币转换，实盘记录核对结果；研究更新后，再复核是否需要新方案。</p></div>'+
  '<details class="method"><summary>展开当时 AI 为什么选择 $90–115</summary>'+historicalAi(research)+'</details></div>'+
  '<details class="method intro-solana"><summary>这套方案如何在 Solana / Raydium 上运行</summary>'+solanaFlow(data)+'</details></section>'+
  '<section class="intro-next"><div><span class="intro-kicker">接下来，亲自验证</span><h2>改变价格或公司判断，看看结果怎样变化。</h2><p>策略的价值，要放在相同本金、相同市场路径下，与持股比较。</p></div><div class="intro-next-links"><button class="primary" data-go="simulate">02 · 看长期持仓与收益 →</button><button class="secondary" data-go="revise">03 · 看基本面变化后的修正 →</button><button class="secondary" data-go="evidence">04 · 看真实仓位与费用 →</button></div></section>'+
  '<footer class="note">CIRCLE 单一案例 · 历史研究、历史 AI 提案、构造情景与实盘证据分别展示。CRCLx 为链上股票敞口；模拟未覆盖原股与代币化资产的全部权利差异。</footer></div>';
}
