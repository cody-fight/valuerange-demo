## 0. Candidate outcome

| Item | New candidate |
|---|---|
| Valuation anchor | `2026-08-22-full-rebuild`; L0/L1/L2/L3 = **11.32 / 35.81 / 88.71 / 177.86 USD** |
| Current valuation position | CRCL regular close and after-hours price remain near the **base upper bound**; the latest CRCLx pool price has just entered the **lower bull range**, at the L2 boundary |
| Existing Core | **keep**; no close, migration or resizing solely to restore static weights |
| New Active | **open 20%**; `90.00–115.00`, `armed_stock_inventory`, using only existing wallet CRCLx |
| Post-migration allocation | **Direct shares 37.2095% / Core 38.9545% / Active 20% / independent available stable-value assets 3.8360%** |
| Conversion route | **`lp_only`**; `direct_swap_required=false` |
| Funding gap | **0 on the planning basis**; deployable share inventory is sufficient and Active initially requires no USDC |
| Candidate outcome | **`strategy_change_migration_proposed`** |
| Recommend promoting to current | **Yes**, for strategy intent only; independent Execution Preflight requires human approval first |

**Keep the effective wide Core and use some existing wallet CRCLx to open a distribution Active at 90–115. Stablecoins form progressively along the LP curve as prices rise. Unlike the earlier candidate, do not first sell shares directly to fill an independent stablecoin target. Retain roughly half the economic equity beta at L3.**

## 1. Valuation anchor, company type and boundaries

The valuation constitution supplies continuous, mutually exclusive, gap-free canonical ranges:

```text
Bear: [11.32, 35.81)
Base: [35.81, 88.71)
Bull: [88.71, 177.86]
```

Circle is currently rate-sensitive infrastructure, with reserve income as its primary profit pool and compliance and distribution as its moat, evolving toward payments and financial networks. It combines platform, network and strong narrative-optionality characteristics. Execution should not prematurely exhaust equity beta on top of conservative valuation assumptions.

Price had not crossed L0/L3, and no Thesis Break requiring AMM generation to stop was found in the specified inputs. Market and technical data inform execution ranges without changing the valuation anchor.

### 2.2 Daily data (through 2026-08-21)

| Indicator | Value | Execution interpretation |
|---|---:|---|
| OHLC / volume | **87.98 / 92.97 / 86.36 / 87.98; approximately 25.82–26.02 million shares** | Yahoo and iFinD volume definitions differ slightly but agree on direction |
| MA5 / MA10 / MA20 | **79.31 / 75.30 / 69.40** | Bullish short-term structure with a steep slope |
| MA50 / MA100 | **69.48 / 86.11** | Above MA50 and slightly above MA100 |
| Bollinger(20,2) | **54.59 / 69.40 / 84.22** | Close about 4.47% above the upper band; short-term expansion is hot |
| ATR(14) | **About 5.5–5.6 USD** | Approximately 6.3% of the close; normal volatility remains substantial |
| RSI(14, Wilder) | **69.46** | Near overbought, but not a standalone sell signal |
| MACD / Signal / Hist | **3.48 / 0.97 / +2.51** | Momentum strengthened materially |
| 5-day / 20-day / 60-day return | **+22.88% / +41.08% / -14.28%** | Sharp rebound confirmed; medium-term losses not fully recovered |
| 20-day average volume | **About 13 million shares** | Daily volume was about twice the 20-day average |
