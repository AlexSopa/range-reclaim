(function (root) {
  'use strict';
  const round = n => Math.round(n * 100) / 100;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function seeded(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function outcomeFor(completed, largeReversals, rng = Math.random) {
    return largeReversals < Math.ceil((completed + 1) * .75) || rng() < .35;
  }
  function pivots(bars, end) {
    const result = [];
    let previousHigh = null, previousLow = null;
    for (let i = 2; i <= Math.min(end, bars.length - 1) - 2; i++) {
      const b = bars[i];
      // Earliest point on a plateau wins. Two CLOSED candles confirm every pivot.
      const high = b.high > bars[i-1].high && b.high > bars[i-2].high && b.high >= bars[i+1].high && b.high >= bars[i+2].high;
      const low = b.low < bars[i-1].low && b.low < bars[i-2].low && b.low <= bars[i+1].low && b.low <= bars[i+2].low;
      if (high) {
        result.push({type:'high', index:i, confirmedAt:i+2, price:b.high, label:previousHigh === null ? 'H' : b.high > previousHigh ? 'HH' : b.high < previousHigh ? 'LH' : 'EH'});
        previousHigh = b.high;
      }
      if (low) {
        result.push({type:'low', index:i, confirmedAt:i+2, price:b.low, label:previousLow === null ? 'L' : b.low < previousLow ? 'LL' : b.low > previousLow ? 'HL' : 'EL'});
        previousLow = b.low;
      }
    }
    return result;
  }
  function swings(bars, end) {
    let high = null, low = null;
    for (const pivot of pivots(bars, end)) { if (pivot.type === 'high') high = pivot; else low = pivot; }
    return {high, low};
  }
  function makeDrill({seed, direction = 'high', large = true, variant}) {
    const rng = seeded(seed), sign = direction === 'high' ? 1 : -1;
    const range = (a,b) => a + rng() * (b-a), integer = (a,b) => Math.floor(range(a,b+1));
    const normal = () => Math.sqrt(-2*Math.log(Math.max(rng(), 1e-9))) * Math.cos(2*Math.PI*rng());
    const base = round(range(75,650)), unit = base * range(.0015,.006);
    let bars = [], close = range(-6,-3), vol = range(.38,.75);
    function leg(target, length, noise = .22, floor = -Infinity, ceiling = Infinity) {
      const count = length * 6, start = close, walk = [0];
      let turbulence = 1;
      for (let k=1; k<=count; k++) {
        turbulence = clamp(turbulence * range(.84,1.16), .5, 1.8);
        walk.push(walk[k-1] + normal() * noise * turbulence / Math.sqrt(6));
      }
      const path = [start];
      for (let k=1; k<=count; k++) {
        const t=k/count;
        path.push(clamp(start + (target-start)*t + walk[k] - t*walk[count], floor, ceiling));
      }
      for (let j=0; j<length; j++) {
        const ticks = path.slice(j*6,j*6+7), open=ticks[0];
        close=ticks[6];
        bars.push({open,close,high:Math.max(...ticks),low:Math.min(...ticks)});
      }
    }
    // A noisy history with different swing spacing and volatility on each run.
    const cycles = integer(3,5);
    for (let j=0;j<cycles;j++) {
      leg(range(-2.8,-.5), integer(4,9), vol*range(.8,1.7));
      leg(range(-5,-3), integer(4,9), vol*range(.8,1.7));
    }
    leg(range(.1,.8), integer(5,10), vol);
    leg(-1.8, 6, .12);
    let reference = swings(bars, bars.length-1).high;
    if (!reference) throw new Error('History must contain a confirmed swing');
    const rawLevel = reference.price;
    bars = bars.map(b => ({open:b.open-rawLevel,close:b.close-rawLevel,high:b.high-rawLevel,low:b.low-rawLevel}));
    close -= rawLevel;
    const startIndex = bars.length-1;
    // Setup and first breakout are generated before outcome branching. Their
    // OHLC and timing are identical for every outcome with the same seed.
    leg(-.18, integer(4,11), vol*range(.9,1.5), -Infinity, -.025);
    leg(range(.15,.5), 1, vol*.7);
    const breakIndex = bars.findIndex((b,i) => i>startIndex && b.high>0);
    const prefixEnd = bars.length-1;
    const resolvedVariant = large ? ['sweep','retest','grind'][integer(0,2)] : (variant || (rng()<.5?'continuation':'failed-reclaim'));
    // The initial break can extend for an unknown number of candles.
    leg(range(.7,2.4), integer(3,12), vol*range(.8,2), .04);
    if (resolvedVariant === 'continuation') {
      leg(range(.12,.5), integer(3,7), vol, .035);
      leg(range(2.6,4.6), integer(6,14), vol*1.5, .035);
    } else {
      const initialPeak = Math.max(...bars.slice(startIndex+1).map(b=>b.high));
      leg(-Math.min(range(.2,.55),initialPeak*.55), integer(2,7), vol*1.2, -initialPeak*.85, initialPeak*.9);
      const peak = Math.max(...bars.slice(startIndex+1).map(b=>b.high));
      if (resolvedVariant === 'failed-reclaim') {
        leg(-peak*range(.35,.7), integer(3,7), vol, -peak*.9, peak*.5);
        leg(peak*range(1.6,2.4), integer(6,12), vol*1.5, -peak*.9);
        leg(peak*range(1.25,1.6), integer(2,5), vol, .025);
      } else {
        if (resolvedVariant === 'retest') {
          leg(peak*range(-.08,.22), integer(2,6), vol*.75, -Infinity, peak*.55);
        }
        if (resolvedVariant !== 'sweep') {
          leg(-peak*range(.85,1.4), integer(5,10), vol*1.5, -Infinity, peak*.55);
          leg(-peak*range(.3,.65), integer(3,7), vol, -Infinity, peak*.55);
        }
        leg(-peak*range(2.15,3.8), integer(resolvedVariant==='sweep'?7:10,18), vol*1.8, -Infinity, peak*.55);
      }
    }
    const mapped = bars.map(b => {
      const open=round(base+sign*b.open*unit), close=round(base+sign*b.close*unit);
      return {open,close,high:Math.max(open,close,round(base+sign*b.high*unit),round(base+sign*b.low*unit)),low:Math.min(open,close,round(base+sign*b.high*unit),round(base+sign*b.low*unit))};
    });
    // Round the reference with the same tick precision as the displayed candles.
    const level = base;
    return {seed,direction,sign,level,unit,large,variant:resolvedVariant,bars:mapped,startIndex,breakIndex,prefixEnd,referenceIndex:reference.index};
  }
  function measure(drill, end) {
    let excursion=0,rejection=0,reclaimIndex=null,breakIndex=null,extremeIndex=null;
    let frozenExcursion=null;
    for(let i=drill.startIndex+1;i<=Math.min(end,drill.bars.length-1);i++) {
      const b=drill.bars[i], outside=drill.sign*((drill.sign===1?b.high:b.low)-drill.level);
      if(breakIndex===null && outside>0) breakIndex=i;
      if(breakIndex===null) continue;
      // Once reclaimed, retain the excursion that actually preceded that reclaim.
      // Later failed-reclaim extensions are separate from the measured initial break.
      if(reclaimIndex===null && outside>excursion) {excursion=outside;extremeIndex=i;}
      if(i>breakIndex && reclaimIndex===null && drill.sign*(b.close-drill.level)<0) {
        reclaimIndex=i;frozenExcursion=excursion;
      }
      // Reclaim candle wicks cannot establish follow-through: intrabar ordering
      // is unknown from OHLC. Its close and subsequent lows/highs can.
      if(reclaimIndex!==null) {
        const inside=i===reclaimIndex?b.close:(drill.sign===1?b.low:b.high);
        rejection=Math.max(rejection,-drill.sign*(inside-drill.level));
      }
    }
    return {excursion:round(frozenExcursion??excursion),rejection:round(rejection),breakIndex,reclaimIndex,extremeIndex};
  }
  const api={makeDrill,pivots,swings,measure,outcomeFor,seeded};
  if(typeof module!=='undefined' && module.exports)module.exports=api;else root.RangeEngine=api;
})(typeof window!=='undefined'?window:this);
