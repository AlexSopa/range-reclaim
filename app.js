(() => {
  'use strict';
  const $=id=>document.getElementById(id), E=window.RangeEngine;
  const canvas=$('chart'), ctx=canvas.getContext('2d');
  const money=n=>'$'+n.toFixed(2), pad=n=>String(n).padStart(2,'0');
  let drill,index,playing=false,timer=null,checkpoint=null,decision=null,completed=0,reversals=0;
  let finished=false,breakoutSeen=false,reclaimSeen=false,hover=null,view=null,geometry=null;
  function stop(){playing=false;clearTimeout(timer);timer=null;}
  function coach(label,message,explanation){$('stage-label').textContent=label;$('message').textContent=message;$('explanation').textContent=explanation;}
  function revealCoach(){if(innerWidth<=800)$('coach').scrollIntoView({block:'nearest'});}
  function newDrill(){
    stop();const seed=crypto.getRandomValues(new Uint32Array(1))[0],direction=seed%2?'high':'low';
    drill=E.makeDrill({seed,direction,large:E.outcomeFor(completed,reversals)});
    index=drill.startIndex;checkpoint=null;decision=null;finished=false;breakoutSeen=false;reclaimSeen=false;hover=null;view=null;
    $('result').hidden=true;$('choices').hidden=true;$('continue').hidden=true;
    $('direction').textContent='1 MIN · CLOSED CANDLES';
    $('ref-label').textContent='Setup swing '+direction;$('reference').textContent=money(drill.level);$('drill-number').textContent=pad(completed+1);
    coach('THE SETUP','Read the approach.',`The marked swing ${direction} is already confirmed. Watch how price behaves when it trades ${direction==='high'?'above':'below'} the level.`);
    render();
  }
  function complete(m){
    stop();finished=true;completed++;
    const large=m.excursion>0 && m.rejection+.001>=2*m.excursion;
    if(large)reversals++;
    $('completed').textContent=pad(completed);$('result').hidden=false;
    const ratio=m.excursion?m.rejection/m.excursion:0;
    if(large){
      coach('DRILL COMPLETE','The rejection went further.',`${money(m.excursion)} outside. ${money(m.rejection)} back inside. The rejection reached ${ratio.toFixed(2)}× the initial breakout distance, measured from the setup level.`);
      $('result').textContent=decision==='chase'?'You chose the breakout. Price later closed back inside and moved further the other way. The reclaim was the first warning; subsequent candles added evidence.':'You waited for a reclaim. This one followed through. Notice the path between the cross back inside and the larger move—not just the final candle.';
    }else if(m.reclaimIndex!==null){
      coach('DRILL COMPLETE','The reclaim did not hold.',`Price closed inside the range, but the rejection reached only ${ratio.toFixed(2)}× the initial break before price returned outside.`);
      $('result').textContent='A reclaim is an event, not a guarantee. This one failed to follow through. Watch whether subsequent candles hold inside the old range before assuming a larger reversal.';
    }else{
      coach('DRILL COMPLETE','This breakout held.','Pullbacks stayed outside the setup swing. No candle closed back inside, so there was no confirmed reclaim in this drill.');
      $('result').textContent=decision==='chase'?'You chose the breakout, and this one continued. The important distinction: price held outside the old range.':'You waited. No confirmed reclaim appeared. Recognizing when the reversal setup is absent is part of the practice.';
    }
    $('session-result').textContent=`Session: ${reversals} of ${completed} completed drills made a 2× or greater rejection.`;
  }
  function advance(){
    if(checkpoint||finished)return;
    index=Math.min(index+1,drill.bars.length-1);hover=null;
    const m=E.measure(drill,index);
    if(m.breakIndex!==null&&!breakoutSeen){
      breakoutSeen=true;checkpoint='break';stop();
      coach('FIRST BREAKOUT CANDLE','Chart looks good!',`Price has traded ${money(m.excursion)} ${drill.direction==='high'?'above':'below'} the setup swing. This is the first break—not necessarily the extreme. It may extend, hold, or return inside.`);
      $('choices').hidden=false;revealCoach();
    }else if(m.reclaimIndex!==null&&!reclaimSeen){
      reclaimSeen=true;checkpoint='reclaim';stop();
      coach('CLOSED BACK INSIDE','Back through the range they go!',`Price closed ${drill.direction==='high'?'below the old high':'above the old low'}. The initial break measured ${money(m.excursion)}. Now watch whether this reclaim holds through a retest or fails.`);
      $('continue').hidden=false;revealCoach();
    }else if(index===drill.bars.length-1)complete(m);
    render();
  }
  function schedule(){clearTimeout(timer);if(playing)timer=setTimeout(()=>{advance();if(playing)schedule();},Number($('speed').value));}
  function play(){if(finished)newDrill();if(checkpoint)return;playing=!playing;if(playing)schedule();else stop();render();}
  function choose(value){decision=value;$('choices').hidden=true;checkpoint=null;coach('WATCH THE REACTION','Let the next candles speak.',`Your choice: ${value==='wait'?'wait for a reclaim':'take the breakout'}. Watch whether price holds outside the level or closes back inside.`);playing=true;render();schedule();}
  function render(){
    const m=E.measure(drill,index),b=drill.bars[index];
    $('price').textContent=money(b.close);$('excursion').textContent=money(m.excursion);$('rejection').textContent=money(m.rejection);$('ratio').textContent=m.excursion>0?(m.rejection/m.excursion).toFixed(2)+'×':'—';
    $('measurement-note').textContent=m.reclaimIndex!==null?'Initial breakout distance is locked at the first reclaim. Rejection is measured from the same setup level.':'The breakout distance can still grow. A reclaim is confirmed by a candle closing back inside.';
    $('bar-count').textContent=`CANDLE ${index+1}`;
    $('status').textContent=finished?'Drill complete':checkpoint?'Paused · read the reaction':playing?'Replay running':'Replay paused';
    $('play').textContent=finished?'▶ Next replay':playing?'Ⅱ Pause':index===drill.startIndex?'▶ Start replay':'▶ Resume';
    $('play').disabled=!!checkpoint;$('step').disabled=!!checkpoint||finished;$('next').textContent=finished?'Next drill ↗':'New drill ↗';
    const phase=finished||reclaimSeen?2:breakoutSeen?1:0;
    [0,1,2].forEach(i=>$('phase-'+i).classList.toggle('active',i<=phase));
    canvas.setAttribute('aria-label',`Synthetic one-minute candlestick chart. Current ${money(b.close)}. Setup swing ${drill.direction} ${money(drill.level)}. Initial breakout ${money(m.excursion)}. Rejection ${money(m.rejection)}. ${$('message').textContent}`);
    draw();
  }
  function draw(){
    if(!drill)return;
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const left=16,right=72,top=30,bottom=30,pw=w-left-right,ph=h-top-bottom,capacity=w<600?42:74;
    const start=Math.max(0,index-capacity+7),visible=drill.bars.slice(start,index+1),dx=pw/capacity;
    const observedLow=Math.min(...visible.map(b=>b.low),drill.level),observedHigh=Math.max(...visible.map(b=>b.high),drill.level);
    const padValue=Math.max((observedHigh-observedLow)*.13,drill.unit*.5);
    if(!view||view.capacity!==capacity)view={low:observedLow-padValue,high:observedHigh+padValue,capacity};
    if(observedLow<view.low+padValue*.15)view.low=observedLow-padValue;
    if(observedHigh>view.high-padValue*.15)view.high=observedHigh+padValue;
    const y=p=>top+(view.high-p)/(view.high-view.low)*ph,x=i=>left+(i-start+1)*dx;
    geometry={left,right,top,bottom,dx,start,w,h};
    ctx.font='11px ui-monospace,monospace';ctx.textBaseline='middle';
    const rawStep=(view.high-view.low)/5,unit=10**Math.floor(Math.log10(rawStep)),step=[1,2,2.5,5,10].find(n=>n*unit>=rawStep)*unit;
    for(let p=Math.ceil(view.low/step)*step;p<view.high;p+=step){const yy=y(p);ctx.strokeStyle='#1b3042';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right+5,yy);ctx.stroke();ctx.fillStyle='#9db2c4';ctx.fillText(p.toFixed(2),w-right+12,yy);}
    for(let i=Math.ceil(start/10)*10;i<=index;i+=10){ctx.strokeStyle='#172b3c';ctx.beginPath();ctx.moveTo(x(i),top);ctx.lineTo(x(i),h-bottom);ctx.stroke();ctx.fillStyle='#839db3';ctx.fillText(String(i+1),x(i)-6,h-12);}
    const refY=y(drill.level),insideY=drill.sign===1?refY:top;
    ctx.fillStyle='rgba(93,226,237,.035)';ctx.fillRect(left,insideY,pw,drill.sign===1?h-bottom-insideY:refY-top);
    const usedLabels=[];
    function levelLine(p,label,color,startAt=left){
      const yy=y(p);ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(Math.max(left,startAt),yy);ctx.lineTo(w-right+5,yy);ctx.stroke();ctx.restore();
      let ly=yy-11;if(usedLabels.some(old=>Math.abs(old-ly)<17))ly=yy+12;if(usedLabels.some(old=>Math.abs(old-ly)<17))return;usedLabels.push(ly);
      ctx.font='11px ui-monospace,monospace';const tw=ctx.measureText(label).width;
      ctx.fillStyle='#0c1d2e';ctx.fillRect(left,ly-8,tw+10,16);ctx.fillStyle=color;ctx.fillText(label,left+3,ly);
    }
    levelLine(drill.level,'SETUP '+(drill.direction==='high'?'HIGH':'LOW')+'  '+money(drill.level),'#5de2ed');
    const swings=E.swings(drill.bars,index);
    for(const type of ['high','low']){
      const p=swings[type];if(p&&Math.abs(p.price-drill.level)>.02)levelLine(p.price,`${p.label} · CONFIRMED ${type.toUpperCase()}`,'#8a9fb1',x(p.index));
    }
    visible.forEach((b,j)=>{const i=start+j,color=b.close>=b.open?'#70d8b0':'#fa8194';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(i),y(b.high));ctx.lineTo(x(i),y(b.low));ctx.stroke();ctx.fillRect(x(i)-Math.max(1.4,dx*.3),Math.min(y(b.open),y(b.close)),Math.max(2.8,dx*.6),Math.max(1.3,Math.abs(y(b.open)-y(b.close))));});
    const m=E.measure(drill,index);
    function marker(i,text,color){if(i===null||i<start||i>index)return;const b=drill.bars[i],yy=y(drill.sign===1?b.high:b.low)+(drill.sign===1?-14:16);ctx.fillStyle=color;ctx.font='bold 11px ui-monospace,monospace';ctx.fillText(text,Math.min(x(i)-10,w-right-48),yy);}
    if(breakoutSeen)marker(m.breakIndex,'BREAK','#5de2ed');
    if(reclaimSeen)marker(m.reclaimIndex,'RECLAIM','#f3cf7a');
    const last=drill.bars[index],yy=y(last.close);ctx.setLineDash([2,4]);ctx.strokeStyle='#8eb6c7';ctx.beginPath();ctx.moveTo(x(index)+dx,yy);ctx.lineTo(w-right+7,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#5de2ed';ctx.fillRect(w-right+5,yy-10,right-8,20);ctx.fillStyle='#08222d';ctx.font='11px ui-monospace,monospace';ctx.fillText(last.close.toFixed(2),w-right+10,yy);
    const selected=hover!==null&&hover>=start&&hover<=index?hover:index,b=drill.bars[selected];
    $('ohlc').textContent=`O ${b.open.toFixed(2)}   H ${b.high.toFixed(2)}   L ${b.low.toFixed(2)}   C ${b.close.toFixed(2)}`;
    if(hover!==null&&selected===hover){ctx.strokeStyle='#b9cddc';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x(selected),top);ctx.lineTo(x(selected),h-bottom);ctx.moveTo(left,y(b.close));ctx.lineTo(w-right,y(b.close));ctx.stroke();ctx.setLineDash([]);}
  }
  canvas.addEventListener('pointermove',event=>{if(!geometry)return;const r=canvas.getBoundingClientRect();hover=Math.max(geometry.start,Math.min(index,Math.round((event.clientX-r.left-geometry.left)/geometry.dx)-1+geometry.start));draw();});
  canvas.addEventListener('pointerleave',()=>{hover=null;draw();});
  $('play').onclick=play;$('step').onclick=()=>{stop();advance();};$('next').onclick=newDrill;
  $('wait-choice').onclick=()=>choose('wait');$('chase-choice').onclick=()=>choose('chase');
  $('continue').onclick=()=>{$('continue').hidden=true;checkpoint=null;playing=true;render();schedule();};
  $('speed').onchange=()=>{if(playing)schedule();};
  new ResizeObserver(draw).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
  newDrill();
})();
