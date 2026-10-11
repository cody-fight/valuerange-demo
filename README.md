# ValueRange

AI-assisted valuation and liquidity management for tokenized stocks on Solana.

- [Interactive demo](https://valuerange-demo.netlify.app/)
- [Pitch video](https://valuerange-demo.netlify.app/pitch/) — cut 6, 3:13, English narration with bilingual subtitles
- [GitHub Pages mirror](https://cody-fight.github.io/valuerange-demo/)
- [Source and release downloads](https://github.com/cody-fight/valuerange-demo/releases/latest)

## Local use

Requires Node.js 20 or newer. No build or dependency installation is needed.

```sh
npm start
# http://127.0.0.1:4173/
npm test
```

Default language is English; use `?lang=zh` or the language switch for Chinese. Reset returns to the English home page. Circle supports a one-time simulated deposit and withdrawal; other vaults are previews. Deposits do not transfer real funds. A wallet connection requires the wallet user's approval.

The five-year performance view compares the strategy with holding shares on the same price path. Assumptions are editable inline. Market pool APR is historical 30-day fee APR and does not enter the scenario return calculation. Simulated outcomes are not forecasts or guarantees.

`dist/` contains the complete static app and pitch media. `tests/` contains 119 regression tests. `video/draft-v6/` contains narration, subtitles, render source and frozen scenario inputs. The MP4 and WebM are in `dist/pitch/`. This repository contains the public demo, not production trading logic or private research workflows.

Netlify's daily evidence publisher maintains its current public feed independently. Mirrors contain the snapshot at release time.
