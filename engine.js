(function (root) {
  'use strict';
  const round = n => Math.round(n * 100) / 100;
  function seeded(seed) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Outcome scheduling advances only on completion. Skipping cannot consume a reversal.
  function outcomeFor(completed, largeReversals, rng = Math.random) {
    return largeReversals < Math.ceil((completed + 1) * .75) || rng() < .35;
  }
  function makeDrill({ seed, direction = 'high', large = true }) {
    const rng = seeded(seed), sign = direction === 'high' ? 1 : -1;
    const level = round(450 + rng() * 150), breakout = round(2 + rng() * 16), scale = breakout / 10;
    const magnitude = round(20 + rng() * 16);
    const anchors = [[0,-32],[7,-12],[14,-26],[24,0],[31,-23],[38,-9],[46,10]];
    if (large) anchors.push([52,-3],[57,-magnitude*.62],[60,-magnitude*.44],[64,-magnitude]);
    else anchors.push([52,3],[58,17],[61,13],[64,24]);
    const normalized = [];
    for (let a = 0; a < anchors.length - 1; a++) {
      const [start, from] = anchors[a], [end, to] = anchors[a+1];
      const weights = Array.from({length:end-start}, () => .65 + rng() * .7), total = weights.reduce((x,y)=>x+y,0);
      let sum = 0; normalized[start] = from;
      for (let i=1; i<=end-start; i++) { sum += weights[i-1]; normalized[start+i] = from + (to-from) * sum / total; }
    }
    const bars = normalized.map((v, i) => {
      const prev = i ? normalized[i-1] : v-1;
      // Wicks stay inside the current leg's endpoints, preserving the chosen breakout size.
      const segment = anchors.findIndex(([idx]) => idx >= i);
      const a = Math.max(1, segment), lo = Math.min(anchors[a-1][1], anchors[a][1]), hi = Math.max(anchors[a-1][1], anchors[a][1]);
      const nHigh = Math.min(hi, Math.max(prev,v) + rng() * .7), nLow = Math.max(lo, Math.min(prev,v) - rng() * .7);
      const open = round(level + sign*prev*scale), close = round(level + sign*v*scale);
      return {open,close,high:Math.max(open,close,round(level+sign*nHigh*scale),round(level+sign*nLow*scale)),low:Math.min(open,close,round(level+sign*nHigh*scale),round(level+sign*nLow*scale))};
    });
    return {seed,direction,sign,level,large,breakout,magnitude:round(magnitude*scale),bars,breakIndex:46,startIndex:38};
  }
  function swings(bars, end) {
    let high = null, low = null;
    // Only confirm after two candles to the right have actually appeared.
    for (let i=2; i<=end-2; i++) {
      const b=bars[i], neighbors=[bars[i-2],bars[i-1],bars[i+1],bars[i+2]];
      if(neighbors.every(n=>b.high>=n.high) && neighbors.some(n=>b.high>n.high)) high={index:i,price:b.high};
      if(neighbors.every(n=>b.low<=n.low) && neighbors.some(n=>b.low<n.low)) low={index:i,price:b.low};
    }
    return {high,low};
  }
  function measure(drill,end) {
    let excursion=0,rejection=0,reclaimIndex=null;
    for(let i=39;i<=end;i++) {
      const b=drill.bars[i];
      excursion=Math.max(excursion,drill.sign*((drill.sign===1?b.high:b.low)-drill.level));
      if(i>drill.breakIndex && drill.sign*(b.close-drill.level)<0) {
        if(reclaimIndex===null) reclaimIndex=i;
        rejection=Math.max(rejection,-drill.sign*((drill.sign===1?b.low:b.high)-drill.level));
      }
    }
    return {excursion:round(excursion),rejection:round(rejection),reclaimIndex};
  }
  const api={makeDrill,swings,measure,outcomeFor,seeded};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.RangeEngine=api;
})(typeof window!=='undefined'?window:this);
