# ValueRange

Turn company valuations into AI-assisted liquidity strategies for tokenized stocks on Solana.

[Live demo](https://valuerange-demo.netlify.app/) · [Final pitch (2:53)](https://valuerange-demo.netlify.app/pitch/) · [Backup demo](https://cody-fight.github.io/valuerange-demo/) · [Downloads](https://github.com/cody-fight/valuerange-demo/releases/tag/v0.28.0)

English by default, with Chinese available in the header.

ValueRange connects fundamental valuation to the choice between direct token holdings, concentrated liquidity and cash. The CIRCLE / CRCLx case lets users inspect an archived plan, choose a hypothetical price path, review a changed valuation and compare three portfolios on the same capital and path. A separate evidence view contains dated real Raydium positions and financial records.

## Run locally

Node.js 22 or later. No npm dependencies, API credentials, wallet or paid service are required. Clone this repository, or download and extract the source ZIP from Releases. Open a terminal in the extracted project folder before running the commands below.

```sh
npm start
```

Open http://127.0.0.1:4173/. The final pitch is at http://127.0.0.1:4173/pitch/. Set the `PORT` environment variable if port 4173 is already in use. Use the header to choose English or Chinese. A fresh visit restores the overview and default inputs. The server serves only `dist/` and binds to localhost.

```sh
npm test
```

## Review the code

| Area | Files |
|---|---|
| Walkthrough reference and shared inputs | `dist/demo-reference.mjs`, `dist/experiment.mjs`, `dist/timeline.mjs` |
| Valuation and inventory calculations | `dist/long-term.mjs` |
| Core/Active close, wait and restart rules | `dist/lifecycle-engine.mjs` |
| Same-time comparison and decomposition | `dist/comparison.mjs`, `dist/scenario-context.mjs` |
| Product UI | `dist/flow-view.mjs`, `dist/plan-visual.mjs`, related views and CSS |
| Archived AI candidates and financial evidence | `dist/data/`, `docs/en/evidence/` |
| Bilingual UI and evidence provenance | `dist/locales/`, `docs/localization/manifest.json` |
| Calculation and behavior checks | `tests/` |

The public walkthrough opening price is $92.02 from `demo-reference.mjs`; the calculation library also retains a legacy reference for explicit legacy test cases. Application state supplies the walkthrough reference.

## Current release

Version 0.28.0, September 18, 2026. Live evidence is a snapshot at 12:09:17 UTC+8: portfolio NAV $31,446.71; excess over pure CRCLx $255.09; cumulative marked fees $937.26, including $682.26 unclaimed. Fees are already included in accounting, not extra money to add to NAV. The history spans marking-method changes. The separate simulation APR calibration is unchanged.

## What is and is not implemented

The frontend performs deterministic illustrative calculations and reads prepared records. It neither calls AI live nor signs transactions. Archived AI outputs distinguish actual historical work from hypothetical cases; supplied allocation targets are not model-optimized weights. Synthetic outcomes are not backtests. Execution is frictionless in the illustration; realized fees and costs can differ.

The private research, monitoring and real-position workflow predates this demo. The submission adds the interactive product, public calculations, bilingual evidence reader and deployment around that foundation. Full private Skills, prompts, account configuration and production orchestration are outside this export. Agent and Vault screens are concept previews.

## Source and third-party scope

This isolated review package has no parent repository history. It contains the reviewed static release, standalone tests and selected evidence already included in the demo. It includes no complete broker reports, private production notebooks or credentials. The runnable frontend uses browser APIs and Node built-ins, without third-party npm dependencies. Referenced protocols, token names and quoted source identities do not imply affiliation. Publication permits inspection; no additional open-source license has been selected. See [NOTICE.md](NOTICE.md) for code, evidence and media scope.

For static hosting, publish `dist/`. The included Netlify headers preserve module MIME types and revalidation. No build step is needed.

## If a link is unavailable

1. Try the [GitHub Pages mirror](https://cody-fight.github.io/valuerange-demo/), which contains the same demo and final pitch.
2. Download the standalone source ZIP from [Releases](https://github.com/cody-fight/valuerange-demo/releases/tag/v0.28.0), extract it and run `npm start`. All case data is bundled; calculation and document reading do not depend on a live AI service.
3. Download the final MP4 from Releases and play it in a local player. The website also supplies WebM for browser compatibility.

The production research workflow is not needed to run this export. Outbound blockchain/source links still need internet access. The website is a dated demonstration, not a continuous market feed.

## Deployment copies

`main` contains the source and tests. `codex/pages` publishes the `dist/` subtree as a static backup via GitHub Pages. Netlify remains the primary demo address. Video assets are the final fifth cut (173.33 seconds), not the older fourth-cut review file. The public frontend remains v0.28; the pitch page is an added submission asset.
