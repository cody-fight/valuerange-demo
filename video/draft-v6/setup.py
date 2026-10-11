from pathlib import Path
import json, shutil
R=Path(__file__).resolve().parent
V5=R.parent/'draft-v5'
for d in ['audio','assets','preview','frozen']: (R/d).mkdir(exist_ok=True)
scenes=[]
def scene(id,title,pairs):
 scenes.append(dict(id=id,title=title,rate='+5%',en=' '.join(a for a,b in pairs),cues=[dict(en=a,zh=b) for a,b in pairs]))
scene(1,'Stocks are moving onchain',[
 ('Tokenized stocks and ETFs now represent over three billion dollars onchain worldwide.','全球代币化股票与 ETF 的链上规模已超过三十亿美元。'),
 ('In September alone, Solana processed around four point four billion dollars in tokenized stock trades.','仅九月，Solana 上的代币化股票交易量就达到约四十四亿美元。'),
 ('How can long-term holders participate in that activity?','长期持有者，怎样参与这些交易？')])
scene(2,'Put part of your holding to work',[
 ('Meet ValueRange. AI turns company valuation into a plan for tokenized stocks on Solana.','认识 ValueRange：用 AI，把公司估值变成 Solana 股票代币的持仓策略。'),
 ('Keep shares for growth. Put part of the portfolio into AMM liquidity to convert shares and cash, and earn trading fees.','保留股票参与上涨，用部分资金提供 AMM 流动性，转换股票与现金，赚取交易手续费。'),
 ('The challenge: which ranges, how much capital, and when to adjust?','难点是：区间怎么定，资金怎么配，什么时候调整？')])
scene(3,'Company value becomes a strategy',[
 ('Every company creates value differently. Financial reports and research become a model built around its business.','每家公司的价值创造方式不同。财报与研究，转化为贴合公司业务的估值模型。'),
 ('AI combines that valuation with market data, current holdings, and your goals.','AI 将估值与市场数据、现有仓位和持有目标结合。'),
 ('Core manages a broad range. Active converts shares in stages. Cash preserves flexibility. Code checks the numbers; you review the plan.','Core 管理宽区间，Active 分段换仓，现金保留灵活性。程序核算，你来复核。')])
scene(6,'Five years. One connected journey.',[
 ('Follow a five-year simulation, starting with ten thousand dollars and a share price of ninety-two dollars and two cents.','看一段五年模拟：本金一万美元，起始股价九十二点零二美元。'),
 ('On the rallies, the strategy converts shares into cash. On the pullbacks, available cash rebuilds inventory.','上涨时，策略逐步把股票转为现金；回落时，可用现金重新积累股票。'),
 ('Across two market cycles, the mix of shares, cash, and liquidity changes. In-range trading earns fees along the way.','经历两轮上涨与回落，股票、现金与流动性的比例持续变化，区间内成交累积手续费。'),
 ('This exchanges some upside exposure for fees and range management.','策略让出部分上涨敞口，换取手续费与区间管理的机会。')])
scene(7,'New facts. An updated plan.',[
 ('At the end of year four, positive business news supports stronger growth and profitability.','第四年末，新的经营利好支持更强的增长与盈利。'),
 ('AI reviews the evidence, updates the valuation, and proposes new liquidity ranges.','AI 复核依据，更新估值中枢，并提出新的流动性区间。'),
 ('Core moves higher. Seventy percent of strategy principal goes to direct shares, and the old Active position is paused.','Core 区间上移，策略本金的百分之七十配置为直接持股，并暂停原有 Active 仓位。'),
 ('The plan responds to the company, instead of keeping yesterday’s ranges forever.','策略跟随公司变化，不再始终沿用过去的区间。')])
scene(8,'Same market. Different decisions.',[
 ('Five years later, the share price reaches two hundred and fifty-one dollars.','五年结束，股价来到二百五十一美元。'),
 ('The revised portfolio reaches about sixty-six thousand nine hundred dollars, versus twenty-seven thousand three hundred from simply holding shares.','修正后的组合约六万六千九百美元，纯持股约两万七千三百美元。'),
 ('That is about thirty-nine thousand six hundred dollars more, on the same price path.','在同一条价格路径上，组合比纯持股多约三万九千六百美元。'),
 ('Nearly four thousand dollars in trading fees are already included. The rest reflects holdings and range decisions.','其中已包含近四千美元交易手续费，其余差额来自持仓与区间决策。'),
 ('Keeping the original strategy finishes at about forty-one thousand five hundred dollars.','维持原策略，期末资产约四万一千五百美元。')])
scene(11,'Learn from every iteration',[
 ('The workflow keeps reviewing news, financial reports, and portfolio records.','工作流持续复核新闻、财报与仓位记录。'),
 ('Track asset value. Explain the return. Feed the findings into the next strategy review.','记录净值，拆解收益，把发现反馈到下一轮策略复核。'),
 ('Research, decisions, and revisions remain traceable.','研究、决策与修正，都保留可追溯的依据。')])
scene(9,'Two ways to use the strategy',[
 ('Next, bring this strategy to more people.','下一步，让更多人用上这套策略。'),
 ('Deposit into a managed vault, with the strategy run for you.','通过策略金库存入资金，由金库代为管理策略。'),
 ('Or keep custody, with an agent helping you trade within limits you set.','也可以保留自托管，让 Agent 在你设定的权限内协助交易。'),
 ('Research. Allocate. Adapt.','研究，配置，持续修正。')])
scene(10,'ValueRange', [('ValueRange. A plan for how you hold.','ValueRange，让持有更有章法。')])
P=dict(title='ValueRange — A plan for how you hold',version='draft-v6',voice='en-US-AndrewMultilingualNeural',width=1920,height=1080,fps=30,scenes=scenes)
(R/'project.json').write_text(json.dumps(P,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'voiceover-en.txt').write_text('\n\n'.join(s['en'] for s in scenes),encoding='utf-8')
for name in ['prepare_audio.py','export_webm.py']:
 txt=(V5/name).read_text(encoding='utf-8').replace('Draft-v5','Draft-v6')
 (R/name).write_text(txt,encoding='utf-8')
# Retain the original voice and music design, with all new scenes in their own files.
for id in [9,10]:
 for ext in ['mp3','words.json']: shutil.copy2(V5/f'audio/scene-{id:02d}.{ext}',R/f'audio/scene-{id:02d}.{ext}')
print('Scenes:',len(scenes),'Words:',sum(len(s['en'].split()) for s in scenes))
