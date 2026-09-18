# ValueRange 演示与源码

[公网 Demo](https://valuerange-demo.netlify.app/) · [最终视频](https://valuerange-demo.netlify.app/pitch/) · [备用站点](https://cody-fight.github.io/valuerange-demo/) · [下载包](https://github.com/cody-fight/valuerange-demo/releases/tag/v0.28.0)

本仓库包含可独立运行的 Demo、计算模块、测试、已公开的精选证据，以及最终第五版视频。没有父生产仓库历史、完整私有 Skill、账户配置或模型密钥。

安装 Node.js 22 或以上版本，下载源码 ZIP 并解压，在项目目录运行 `npm start`，打开 http://127.0.0.1:4173/。不需要 `npm install`，不需要钱包、AI 接口或付费服务。`npm test` 运行计算与交互状态测试。可用 `PORT` 环境变量更换端口。

公网默认英文，顶部可切中文。新打开或刷新恢复默认首页与参数。行情路径为构造情景，前端复用归档 AI 候选并确定性计算；不实时调用模型，不执行交易。实盘证据固定于 2026-09-18 12:09:17 +08:00，与模拟结果分开。未来 Agent / Vault 界面为概念预览。

Netlify 不能访问时，可使用 GitHub Pages 备用站点；两站都不能访问时，下载 Releases 中的源码包在本地运行。视频提供 MP4 下载及 WebM 浏览器版本。详细代码地图、当前限制和复现说明见 [英文 README](README.md)。本次公开便于评审检查与复现，未另行授予开源许可证，见 [NOTICE.md](NOTICE.md)。
