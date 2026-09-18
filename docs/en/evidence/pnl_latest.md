# CIRCLE official PNL attribution review (2026-09-18)

## 1. Strategy-effect conclusion

From the fixed formal monitoring start of June 9, 2026 20:19:37, NAV rose from **$30,512.65 to $31,446.71**, a gain of **$934.06 / 3.061%**. Pure CRCLx returned **2.225%**, leaving **$255.09** of strategy excess. The frozen opening mix returned **1.991%**, leaving **$326.44** of strategy excess.

These are as-recorded cumulative results spanning `legacy_unspecified` and `yahoo_pool_v1`. `pricing_bridge_usd` is unavailable, not zero. The opening fee inventory is approximated as equal-value USDC solely for the HODL comparison. Methodology-neutral performance is not established.

From September 17 at 12:43:53 to September 18 at 12:09:17, the strategy gained **3.307%**, versus **4.026%** for pure CRCLx, trailing by **$218.87**. It exceeded the preceding snapshot's frozen mix by **$6.14**. The interval shows weaker upside participation than pure holding; it contains no falling-price phase and cannot establish downside buffering.

## Strategy performance assessment (programmatic comparisons, AI explanation)

### Cumulative comparison since formal monitoring began

2026-06-09 20:19:37 +08:00 → 2026-09-18 12:09:17 +08:00. Return basis: `nav_ratio_no_recorded_external_flow`; benchmark: `equal_capital_estimated_initial_fee`.

| Comparison | Ending value USD | Adjusted P&L USD | Return % | Strategy minus comparison USD |
|---|---:|---:|---:|---:|
| Actual strategy (fees already included in NAV) | 31,446.71 | 934.06 | 3.06 | 0.00 |
| Pure CRCLx | 31,191.62 | 678.97 | 2.23 | 255.09 |
| Initial portfolio HODL (frozen quantities) | 31,120.27 | 607.62 | 1.99 | 326.44 |
| Pure USDC ($1, no interest) | 30,512.65 | 0.00 | 0.00 | 934.06 |

- Raw NAV change before external-flow adjustment: $934.06 / 3.06%.
- Each period uses its recorded marks; marking-method effects have not been isolated.
- The small opening fee balance is approximated as equal-value USDC solely for the HODL comparison.
- Only confirmed ledger events adjust cash flows; missing flows and opening inventory limit conclusions.

### Interval comparisons (equal value at the preceding snapshot)

2026-09-17 12:43:53 +08:00 → 2026-09-18 12:09:17 +08:00. Return basis: `nav_ratio_no_recorded_external_flow`; benchmark: `equal_capital`.

| Comparison | Ending value USD | Adjusted P&L USD | Return % | Strategy minus comparison USD |
|---|---:|---:|---:|---:|
| Actual strategy (fees already included in NAV) | 31,446.71 | 1,006.69 | 3.31 | 0.00 |
| Pure CRCLx | 31,665.58 | 1,225.56 | 4.03 | -218.87 |
| Initial portfolio HODL (frozen quantities) | 31,440.57 | 1,000.55 | 3.29 | 6.14 |
| Pure USDC ($1, no interest) | 30,440.02 | 0.00 | 0.00 | 1,006.69 |

The supplementary August 15–September 18 window returned 18.46%; it is not since inception. Its four benchmarks remain in the source Context.

### Current Core / Active position-cohort HODL comparison

| LP / baseline time | Opening principal held to now USD | Actual principal USD | Curve difference USD | New fees USD (ending marks) | Excess after fees USD | Fee coverage % |
|---|---:|---:|---:|---:|---:|---:|
| Core / 2026-08-12 17:13:54 +08:00 | 12,198.33 | 12,005.78 | -192.55 | 375.46 | 182.90 | 194.99 |
| Active / 2026-08-24 13:48:34 +08:00 | 6,127.14 | 6,127.14 | -0.00 | 298.31 | 298.31 | Not applicable (near-zero difference) |

Both start at their first comparable position snapshot, not transaction-level opening cost. They are curve proxies at consistent NAV marks, not exact IL/LVR or fully costed returns. Core spans marking-method changes. Inventory HODL uses ending marks without resetting the LP baseline. Some intermediate Core snapshots lack PDA evidence; opening/ending PDAs, continuous inventory intervals and ledger reconciliation are used without automatically resetting the baseline.

### LP contribution after fees this interval

| LP / baseline time | Opening principal held to now USD | Actual principal USD | Curve difference USD | New fees USD (ending marks) | Excess after fees USD | Fee coverage % |
|---|---:|---:|---:|---:|---:|---:|
| Core / 2026-09-17 12:43:53 +08:00 | 12,010.05 | 12,005.78 | -4.27 | 10.32 | 6.05 | 241.54 |
| Active / 2026-09-17 12:43:53 +08:00 | 6,127.14 | 6,127.14 | -0.00 | 0.00 | -0.00 | 0.00 |

These are snapshot-based, consistently marked curve proxies, not exact IL/LVR or fully costed returns. A negative curve difference is a cost relative to holding; coverage is not applicable when the difference is nonnegative.

- The account baseline stays at the first formal record. Marking changes, rebalances and LP replacements do not reset it; each LP uses its own verifiable cohort.
- Interval comparisons start at equal value at the prior snapshot; they are not daily increments of cumulative benchmark curves.
- Share benchmarks use the NAV mark. Pool/mark divergence affects the curve proxy; positive differences do not prove arbitrage profit.
- Fee quantities and confirmed claims are valued at ending prices after deducting opening inventory. Fees are already in NAV and are not added again.
- Cash-flow coverage follows the ledger. Uncounted costs, missing operations and valuation basis constrain conclusions. Zero arithmetic residual does not prove complete economic attribution.

The strategy leads pure CRCLx and the frozen mix since inception. This interval it only slightly exceeds the frozen mix and trails pure shares. Core cohort fees cover the proxy curve cost. Active's curve difference is near zero and fees are positive; this does not establish statistical outperformance. The evidence remains limited by marking changes, snapshot baselines and incomplete costs.

Presentation note: Active's near-zero curve-cost denominator makes its cohort fee-coverage ratio economically uninformative, so it is shown as not applicable. The original report is unchanged.
