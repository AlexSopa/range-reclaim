const assert=require('node:assert/strict');
const E=require('./engine.js');
const lengths=new Set(), breaks=new Set(), histories=new Set(), variants=new Set();
let mixed=0,total=0;
for(let seed=1;seed<=1000;seed++) for(const direction of ['high','low']) for(const kind of ['large','continuation','failed-reclaim']) {
 const d=E.makeDrill({seed,direction,large:kind==='large',variant:kind}),end=d.bars.length-1,m=E.measure(d,end);
 const tag=`seed ${seed}, ${direction}, ${kind}`;
 lengths.add(d.bars.length);breaks.add(d.breakIndex-d.startIndex);histories.add(d.startIndex);variants.add(d.variant);
 assert.ok(m.breakIndex>d.startIndex,tag);
 assert.equal(m.breakIndex,d.breakIndex,tag);
 assert.equal(E.measure(d,d.startIndex).excursion,0,tag);
 assert.equal(E.measure(d,d.breakIndex-1).breakIndex,null,tag);
 assert.equal(E.measure(d,d.breakIndex).reclaimIndex,null,tag);
 assert.ok(d.bars[d.breakIndex].high>d.level || d.bars[d.breakIndex].low<d.level);
 for(let i=0;i<d.bars.length;i++){
  const b=d.bars[i];assert.ok(b.high>=Math.max(b.open,b.close),tag);assert.ok(b.low<=Math.min(b.open,b.close),tag);assert.ok(Object.values(b).every(Number.isFinite),tag);
  if(i) {assert.equal(b.open,d.bars[i-1].close,tag);total++;if(Math.sign(b.close-b.open)!==Math.sign(d.bars[i-1].close-d.bars[i-1].open))mixed++;}
 }
 if(kind==='large') {assert.ok(m.rejection>=2*m.excursion-.001,`${tag}: ratio ${m.rejection/m.excursion}`);assert.ok(m.reclaimIndex>d.breakIndex,tag);}
 else if(kind==='continuation'){assert.equal(m.reclaimIndex,null,tag);assert.equal(m.rejection,0,tag);}
 else {assert.ok(m.reclaimIndex>d.breakIndex,tag);assert.ok(m.rejection<2*m.excursion,`${tag}: false reclaim accidentally 2x`);assert.ok(d.sign*(d.bars[end].close-d.level)>0,tag);}
 const actual=E.swings(d.bars,d.startIndex)[direction];
 assert.equal(actual.price,d.level,`${tag}: setup reference must be latest confirmed pivot`);
 assert.deepEqual(E.swings(d.bars.slice(0,d.startIndex+1),d.startIndex),E.swings(d.bars,d.startIndex),tag);
 for(const p of E.pivots(d.bars,end)){assert.ok(p.confirmedAt<=end);assert.ok(p.index+2===p.confirmedAt);}
}
for(let seed=1;seed<=300;seed++) {
 const options={seed,direction:seed%2?'high':'low'},a=E.makeDrill({...options,large:true}),b=E.makeDrill({...options,large:false});
 assert.equal(a.breakIndex,b.breakIndex);
 assert.deepEqual(a.bars.slice(0,a.prefixEnd+1),b.bars.slice(0,b.prefixEnd+1),'Outcome must not change history or breakout candle');
}
for(let seed=1;seed<100;seed++){const rng=E.seeded(seed);let count=0;for(let n=0;n<1000;n++){if(E.outcomeFor(n,count,rng))count++;assert.ok(count>=Math.ceil((n+1)*.75));}}
assert.ok(lengths.size>30);assert.ok(breaks.size>5);assert.ok(histories.size>30);assert.equal(variants.size,5);assert.ok(mixed/total>.2,'Need overlapping mixed-color candles');
const plateau=[1,2,4,4,3,2].map(high=>({open:0,close:0,high,low:-1}));
assert.equal(E.swings(plateau,3).high,null,'No future-confirmed pivots');
assert.equal(E.swings(plateau,5).high.index,2,'Earliest equal high wins');
console.log(`PASS: 6,000 scenarios, 300 identical outcome-blind prefixes, 99,000 frequency checks. ${lengths.size} durations; ${histories.size} histories; ${(100*mixed/total).toFixed(1)}% candle-color changes.`);

const fixture={startIndex:0,sign:1,level:100,bars:[
 {open:99,close:99,high:99.5,low:98.5},
 {open:99,close:101,high:102,low:99},
 {open:101,close:100,high:101,low:99.4},
 {open:100,close:99.6,high:100.4,low:98.6},
 {open:99.6,close:104,high:105,low:99.5},
 {open:104,close:99.2,high:104,low:98.9}
]};
assert.equal(E.measure(fixture,1).breakIndex,1);
assert.equal(E.measure(fixture,2).reclaimIndex,null,'An exact touch is not a close inside');
assert.equal(E.measure(fixture,3).reclaimIndex,3);
assert.equal(E.measure(fixture,3).rejection,.4,'Reclaim wick ordering is unknown: use its close');
assert.equal(E.measure(fixture,5).excursion,2,'Later outward extension cannot rewrite initial break');
assert.equal(E.measure(fixture,5).rejection,1.1,'Subsequent wick counts as observed follow-through');
const causal=E.makeDrill({seed:74291,direction:'low',large:true});
for(let end=0;end<causal.bars.length;end++)assert.deepEqual(E.pivots(causal.bars,end),E.pivots(causal.bars.slice(0,end+1),end));
console.log('PASS: independent OHLC measurement fixtures and every-prefix pivot causality.');
