# Range Reclaim

A free, dependency-free synthetic price-action trainer hosted on GitHub Pages.

Open `index.html` or serve this directory with any static web server. No keys, backend, paid services, live feed, account, or build dependencies are needed.

## Practice flow

- The setup marks the most recent confirmed swing high or low before replay starts. Direction is randomized.
- Replay reveals one complete synthetic one-minute candle at a time. History and scenario duration vary; future candle counts and future price ranges are never displayed.
- The **first observed breakout candle** pauses with **Chart looks good!** The breakout can extend after this pause; the pause does not identify the final extreme.
- Choose to wait for a reclaim or take the breakout. This records a practice decision, not an order or simulated fill.
- The first subsequent candle to **close** back inside the setup level pauses with **Back through the range they go!** An exact touch is not a reclaim.
- Continue to observe an immediate rejection, a retest, a choppy reversal, a continuation, or a failed reclaim. A reclaim alone does not promise follow-through.

## Prices and measurement

Prices are generated from noisy intrabar paths with varying volatility, mixed candle colors, asymmetric wicks, and overlapping ranges. Setup history and the first breakout candle are identical across outcomes for a given seed, so future outcomes do not leak into the decision point.

The initial breakout distance is the maximum observed wick excursion outside the setup level **up to the first reclaim**, then it is frozen. The rejection distance measures movement from that same setup level back into the range. The reclaim candle contributes its close, not its wick, because OHLC alone does not reveal whether that wick occurred before or after the reclaim; subsequent candle extremes count normally.

At least 75% of completed drills have a rejection at least twice the initial breakout distance. Remaining drills include continuations and failed reclaims. The completed-session scheduler enforces the minimum after every completion; this necessarily makes the first three completed drills large rejections. Skipping does not consume an outcome, and counters reset on reload. This distribution is deliberately biased for practice, not fitted to market data and not a statement about real-market probabilities.

Swing markers require two subsequent closed candles. Equal-price plateaus retain their earliest eligible pivot. HH/LH and HL/LL labels compare successive confirmed swings. The setup reference remains fixed while recent swing markers update. Chart scaling uses only revealed candles; the viewport rolls as new candles arrive. Hover a candle to inspect its OHLC.

## Checks and hosting

Run `node test-engine.cjs` for 6,000 generated scenarios, outcome-blind prefix checks, frequency checks, independent measurement fixtures, and causal pivot checks. Desktop/mobile replay interactions are also checked in the browser before publishing.

GitHub Pages serves `main` and `/ (root)`, with `.nojekyll` for direct static publishing.
