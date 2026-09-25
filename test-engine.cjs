const assert=require('node:assert/strict');
const E=require('./engine.js');
for(let seed=1;seed<=1000;seed++) for(const direction of ['high','low']) for(const large of [true,false]) {
  const d=E.makeDrill({seed,direction,large}),m=E.measure(d,64);
  assert.equal(d.bars.length,65);
  for(const b of d.bars){assert.ok(b.high>=Math.max(b.open,b.close));assert.ok(b.low<=Math.min(b.open,b.close));assert.ok(Object.values(b).every(Number.isFinite));}
  assert.equal(E.measure(d,38).rejection,0);
  assert.equal(E.measure(d,46).excursion,d.breakout);
  assert.equal(E.measure(d,46).reclaimIndex,null);
  if(large){assert.equal(m.excursion,d.breakout);assert.ok(m.rejection>=2*d.breakout-.01);assert.ok(m.reclaimIndex>46);assert.ok(d.sign*(d.bars[m.reclaimIndex-1].close-d.level)>=0);assert.ok(d.sign*(d.bars[m.reclaimIndex].close-d.level)<0);}
  else {assert.equal(m.reclaimIndex,null);assert.equal(m.rejection,0);}
  const pivots=E.swings(d.bars,38);assert.ok(pivots.high&&pivots.low);
  assert.equal((direction==='high'?pivots.high:pivots.low).price,d.level);
  assert.deepEqual(E.swings(d.bars.slice(0,39),38),pivots);
}
for(let seed=1;seed<100;seed++){const rng=E.seeded(seed);let count=0;for(let n=0;n<1000;n++){if(E.outcomeFor(n,count,rng))count++;assert.ok(count>=Math.ceil((n+1)*.75));}}
console.log('PASS: 4,000 scenarios; OHLC, variable breakouts, 2x+ reversals, reclaim timing, causal pivots, and 99,000 frequency checkpoints.');
