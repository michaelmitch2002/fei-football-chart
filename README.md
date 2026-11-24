# College Football Schedule and Record Strength

Interactive chart of all 138 FBS teams, with schedule strength, record strength, FEI rating, and a weighted SOR + FEI ranking.

## Data snapshot

- FEI data: selectable Week 11 and Week 12 snapshots for 2026, from https://bcftoys.com/2026-fei
- Week 11 is preserved unchanged. The chart defaults to Week 12; the Data through dropdown changes every metric together.
- Logo selection: AP top 12 and teams with FanDuel make-playoff odds shorter than +1000, based on November 22, 2026 snapshots.
- The chart is a saved snapshot; it does not refresh automatically.

## Weighted ranking

Select **SOR + FEI** and use the slider to choose the SOR weight. Choose an elite, good, or average team benchmark for the SOR input. FEI receives the remaining weight, so weights always sum to one. Both inputs are standardized independently across all 138 FBS teams in the selected week using population standard deviations: `z = (value - mean) / SD`. The score is `w * z(selected-benchmark SOR) + (1-w) * z(FEI)`; higher scores rank first. The weighted score is not standardized again. Scores use published numeric values, and equal scores share a competition rank. The benchmark control is hidden for FEI-only mode.

The combined view contains the score plot for all teams, our top 25 table, the CFP committee top 25 table, and a scatter plot of our rank (x) against committee rank (y). Our table shows rank, logo, team, and combined score; the committee table shows rank, logo, and team. The tables have aligned headers and rows, sit side by side, and stack on narrow screens. The comparison plot uses only team logos as marks, with rank 1 on the right and at the top. Teams outside the committee top 25 are omitted from the comparison plot; they are not assigned an invented committee rank. Verified logo paths for all teams support whichever teams enter our top 25 as weights or benchmarks change.

### Fit weights to committee

SOR and FEI weights are displayed as percentages adding to 100%. Only the selected benchmark's fit and restore button are visible. For each benchmark, the fit minimizes `mean((our rank - committee rank)^2 / 2)` across the 25 committee-ranked teams. This is squared perpendicular distance to the equal-rank line in rank coordinates, independent of chart dimensions. Our ranks always use the complete 138-team population. This is a direct rank-error optimization, not ordinary least squares on raw scores.

Because the objective changes only when teams exchange ranks, the optimizer evaluates every pairwise score crossing, all intervals between crossings, and endpoints 0 and 1. Crossings are evaluated separately because tied competition ranks can have a different loss. If several intervals minimize error, the midpoint of the widest is used; a tie-only optimum uses the crossing itself. Each benchmark has a button to apply or restore its full-precision fitted weight. Slider and saved state retain that precision. Fits are cached separately for each week and unavailable when the matching committee rankings are missing. Results describe the committee release used to fit them.

The November 17, 2026 CFP release (games through November 15) matches the Week 11 snapshot: https://collegefootballplayoff.com/news/2026/11/17/rankings. The matching Week 12 release is pending as of November 23 and is scheduled for November 24. Week 12 shows a pending message until that snapshot is added. FEI-only mode shows standardized values, raw FEI ratings, and published FEI ranks.

## GitHub Pages

Publish the `main` branch from the repository root in Settings → Pages. The entry point is `index.html`. No build step is needed.

The chart library and logos load from external CDNs. School logos belong to their respective owners.
