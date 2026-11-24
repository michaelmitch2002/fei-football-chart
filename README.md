# College Football Schedule and Record Strength

Interactive chart of all 138 FBS teams, with schedule strength, record strength, FEI rating, and a weighted FEI + SOR ranking.

## Data snapshot

- FEI data: selectable Week 11 and Week 12 snapshots for 2026, from https://bcftoys.com/2026-fei
- Week 11 is preserved unchanged. The chart defaults to Week 12; the Data through dropdown changes every metric together.
- Logo selection: AP top 12 and teams with FanDuel make-playoff odds shorter than +1000, based on November 22, 2026 snapshots.
- The chart is a saved snapshot; it does not refresh automatically.

## Weighted ranking

Select **FEI + SOR** and use the slider to choose the FEI weight. Choose an elite, good, or average team benchmark for the SOR input. SOR receives the remaining weight, so weights always sum to one. Both inputs are standardized independently across all 138 FBS teams in the selected week using population standard deviations: `z = (value - mean) / SD`. The score is `w * z(FEI) + (1-w) * z(selected-benchmark SOR)`; higher scores rank first. The weighted score is not standardized again. Scores use published numeric values, and equal scores share a competition rank. The benchmark control is hidden for FEI-only mode.

The combined view contains the score plot for all teams, our top 25 table, the CFP committee top 25 table, and a scatter plot of our rank (x) against committee rank (y). Our table shows rank, logo, team, and combined score; the committee table shows rank, logo, and team. The tables have aligned headers and rows, sit side by side, and stack on narrow screens. The comparison plot uses only team logos as marks, with rank 1 on the right and at the top. Teams outside the committee top 25 are omitted from the comparison plot; they are not assigned an invented committee rank. Verified logo paths for all teams support whichever teams enter our top 25 as weights or benchmarks change.

### Fit weights to committee

FEI and SOR weights are displayed as percentages adding to 100%. Only the selected benchmark's fit and restore button are visible. For each benchmark, the fit minimizes `mean((our rank - committee rank)^2 / 2)` across the 25 committee-ranked teams. This is squared perpendicular distance to the equal-rank line in rank coordinates, independent of chart dimensions. Our ranks always use the complete 138-team population. This is a direct rank-error optimization, not ordinary least squares on raw scores.

Because the objective changes only when teams exchange ranks, the optimizer evaluates every pairwise score crossing, all intervals between crossings, and endpoints 0 and 1. Crossings are evaluated separately because tied competition ranks can have a different loss. If several intervals minimize error, the midpoint of the widest is used; a tie-only optimum uses the crossing itself. Each benchmark has a button to apply or restore its full-precision fitted weight. Slider and saved state retain that precision. Fits are cached separately for each week and unavailable when the matching committee rankings are missing. Results describe the committee release used to fit them.

The November 17, 2026 CFP release (games through November 15) matches the Week 11 snapshot: https://collegefootballplayoff.com/news/2026/11/17/rankings. The matching Week 12 release is pending as of November 23 and is scheduled for November 24. Week 12 shows a pending message until that snapshot is added. FEI-only mode shows standardized values, raw FEI ratings, and published FEI ranks.

## Head-to-head criteria

In FEI + SOR mode, **Apply head-to-head criteria** makes one pass from position 1 toward position 138. At each position, if the lower adjacent team beat the higher adjacent team, they swap; the scan then advances one position. A displaced loser can therefore move down repeatedly. Earlier positions are not revisited, and the pass is not repeated. The rule applies regardless of overall record. All earlier completed games in the selected season through the selected week are eligible; later games are excluded.

The raw weighted scores remain unchanged. With head-to-head enabled, the displayed table and comparison plot use adjusted ordinal positions 1–138. Before the pass, equal scores use alphabetical team order. Turning the option off restores the score-based ranking and its original competition ties.

The separate **Use head-to-head fit** button minimizes the same committee-rank MSE after applying this pass for every candidate weight. It sets the fitted weight and turns head-to-head on. The ordinary fit button applies its score-only optimum and turns head-to-head off. Each benchmark has distinct ordinary and head-to-head optima; the UI shows only the selected benchmark. Both modes require matching committee data.

The cumulative Week 11 and Week 12 result snapshots contain 629 and 695 FBS-vs-FBS games respectively. The full 822-game results archive, including FCS opponents, exactly reproduces all 138 teams' overall records in each saved FEI week. Source: https://cfbplanner.com/games/, retrieved November 24, 2026. Detailed frozen results and provenance are saved in `data/head-to-head-results.json`.

## GitHub Pages

Publish the `main` branch from the repository root in Settings → Pages. The entry point is `index.html`, an introduction in Michael's words with a citation to Brian Fremeau's metric definitions. The interactive visualization is `chart.html`; both pages have navigation between them. No server build step is needed.

After refreshing the standalone `FEI Schedule Strength.html` export in the parent directory, run `python3 build-chart.py` to update `chart.html` without replacing the introduction.

The chart library and logos load from external CDNs. School logos belong to their respective owners.

## Personal rankings

`personal.html` lets visitors type or select 25 unique FBS teams using the latest available week automatically (currently Week 12), with no week selector. Drafts stay in browser storage; submission runs locally in a Web Worker. The same chart optimizer fits all three benchmarks in score-only and head-to-head modes against the visitor’s ordered teams, using all 138 FBS teams for standardization and model ranks. All minimum-MSE fits are highlighted; a selector compares each fitted model with the submitted ranking. `personal-data.js` contains frozen copies of the chart’s weekly data and shared mathematical functions. Refresh it whenever the chart’s data or optimizer changes. No server or personal-ranking uploads are used.
