# Range Reclaim

A free, dependency-free synthetic price-action trainer built for GitHub Pages.

Open `index.html` or serve this directory with any static web server. No keys, backend, paid services, live market feed, or sign-in are needed.

Replay a higher-high or lower-low setup. At the breakout the chart pauses with **Chart looks good!** Choose to wait for a reclaim or take the breakout. When a candle closes back across the previous swing, the chart pauses with **Back through the range they go!** Continue to see the outcome.

Reversal distance is measured **from the old swing level into the range**, not from the breakout extreme. Large reversals move $20–$36 inside after a $10 excursion. At least 75% of completed drills produce that outcome. The scheduler enforces that minimum for every completed-session prefix, so skipping a drill does not spend a scheduled reversal. Remaining drills may continue outside the range. High and low drills alternate on completion.

Recent swings are confirmed only after two subsequent candles appear. During a breakout, the prior reference level stays marked while newly confirmed swings update independently. Future candles are not used to scale the displayed chart.

The distribution is deliberately biased for pattern practice and does not describe real-market probabilities. Choices provide descriptive feedback, not trading performance or profit estimates. Session counters reset on reload.

## Checks

Run `node test-engine.cjs` for the price geometry, causal swing tracking, reclaim timing, mirroring, and frequency checks. There are no build dependencies.

## Hosting

Publish this repository with GitHub Pages using `main` and `/ (root)`. The `.nojekyll` file allows direct static publishing.
