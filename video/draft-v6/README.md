# ValueRange 视频第六版

英文旁白、中英字幕、1920×1080、30 fps。2026-10-11 同步发布版本，视频成片位于 `dist/pitch/`。

## 改动

市场开场：全球代币化股票及 ETF 超过 30 亿美元；Solana 2026 年 9 月代币化股票交易量约 44 亿美元。两者为不同统计口径。

来源：
- https://app.rwa.xyz/stocks ，2026-10-11 页面：Distributed Value $3.33B，含股票与 ETF。
- https://solana.com/ja/news/solana-ecosystem-roundup-september-2026 ，2026-10-06 发布：9 月 tokenized-stock trading volume 约 $4.4B。

五年模拟从 $10,000、$92.02 开始，使用两轮上涨回落、第四年末利好、最终 $251。修正方案 $66,882.53，原策略 $41,541.16，纯持股 $27,276.68。修正方案相对持股 +$39,605.85，其中累计手续费 $3,988.76 已计入资产。

文案核对修正：本例事件发生时，股票总量从 281.8160 降至 274.7333，并非立即增持；因此旁白准确说明“策略本金的 70% 配置为直接持股”，而非声称立即增加持股。仓位对比按策略本金计算，费用留现独立保留。

整个市场及 AI 事件段落均为模拟与预设方案演示。费用 APR 是模型假设，非五年实盘验证；忽略税费、滑点与执行成本。没有使用实时 AI 或执行链上交易。归档研究显示 2026-09-16 Watch、估值不变。未来金库与 Agent 仍为概念。

## 编辑与复现

- `project.json` / `timing.json`：双语文案及时间轴；`subtitles-*.srt`：字幕。
- `scenario.json`：冻结参数、每日行情、三套结果、仓位与事件；`frozen/`：计算代码及哈希。
- `render.py` / `base_helpers.py` / `assets/`：画面生成及复用素材。渲染不依赖运行中的 Demo。
- `audio/`：各段英文配音、逐词时序、旁白与 BGM 混音。
- `synthesize.py` 重新生成文案发生变化的段落（联网调用原有 Edge TTS，AndrewMultilingualNeural）；`prepare_audio.py` 重建时间轴、双语字幕、原有风格音乐与混音。
- `render.py --preview` 生成逐句检查图；不带参数导出 MP4。`export_webm.py` 生成浏览器兼容预览。
- `verify_export.py` 检查完整解码、响度、字幕边界、逐句抽帧及计算源码哈希。
- `build_preview.py` / `serve-preview.py`：本地 4190 端口预览与章节跳转。

使用既有 Python 运行时及 `video/.tools/python` 中的依赖。`setup.py` 用于初始建项；不要在人工修改 project.json 后重复运行。`freeze-scenario.mjs` 用于从当前 Demo 初次冻结模型；复现成片直接使用已冻结数据，不重新读取变化中的 Demo。

## 交付边界

只写入 video/draft-v6 与本地工程检查点。第五版、公开站点、每日任务和参赛链接均未改变。该临时实验目录不在工程 Git 备份范围内，单独保存带依赖清单的本地视频检查点；工程备份任务结果独立记录。

## 本轮验收

成片 192.77 秒（约 3:13），1080p / 30 fps，30 条中英双语字幕。完整解码、字幕时序与边界、30 个逐句抽帧、冻结模型哈希与计算一致性通过；综合响度 -16.04 LUFS、真峰值 -1.21 dBTP。

原第五版与提交副本 MP4 哈希一致，未改动：E5BCC936CF962DC9921A988B08DCAB1C0F357B1DAA600FCDFEA2831C1D4F38CE。

公开仓库不包含体积较大的中间 WAV 缓存；保留配音生成脚本和画面源文件。旧版素材复用脚本 `setup.py` 需要旧版工程，完整成片可直接使用 `dist/pitch/` 中的 MP4 / WebM。
