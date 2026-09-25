(() => {
  'use strict';
  const $ = id => document.getElementById(id), E = window.RangeEngine;
  const canvas=$('chart'), ctx=canvas.getContext('2d');
  let drill, index, playing=false, timer=null, checkpoint=null, decision=null, completed=0, reversals=0, finished=false, breakoutSeen=false,reclaimSeen=false;
  const money=n=>'$'+n.toFixed(2), pad=n=>String(n).padStart(2,'0');
  function stop(){playing=false;clearTimeout(timer);timer=null;}
  function coach(label,message,explanation){$('stage-label').textContent=label;$('message').textContent=message;$('explanation').textContent=explanation;}
  function newDrill(){
    stop(); const direction=completed%2===0?'high':'low';
    drill=E.makeDrill({seed:crypto.getRandomValues(new Uint32Array(1))[0],direction,large:E.outcomeFor(completed,reversals)});
    index=drill.startIndex;checkpoint=null;decision=null;finished=false;breakoutSeen=false;reclaimSeen=false;
    $('result').hidden=true;$('choices').hidden=true;$('continue').hidden=true;
    $('direction').textContent=direction==='high'?'Higher-high setup':'Lower-low setup';
    $('ref-label').textContent='Previous swing '+direction;$('reference').textContent=money(drill.level);$('drill-number').textContent=pad(completed+1);
    coach('THE SETUP','A swing is in sight.',`Price is approaching a previous swing ${direction}. Watch what happens once it trades ${direction==='high'?'above':'below'} that level.`);
    render();
  }
  function advance(){
    if(checkpoint || finished) return;
    index=Math.min(index+1,drill.bars.length-1);
    const m=E.measure(drill,index);
    if(index===drill.breakIndex && !breakoutSeen){
      breakoutSeen=true;checkpoint='break';stop();
      coach('PAUSED AT THE BREAKOUT','Chart looks good!',`A ${drill.direction==='high'?'higher high':'lower low'} is printing ${money(drill.breakout)} beyond the previous swing. Will price hold outside, or cross back through the level?`);
      $('choices').hidden=false;if(innerWidth<=800)$('coach').scrollIntoView({block:'start'});
    }else if(m.reclaimIndex!==null && !reclaimSeen){
      reclaimSeen=true;checkpoint='reclaim';stop();
      coach('THE LEVEL IS RECLAIMED','Back through the range they go!',`Price closed back ${drill.direction==='high'?'below the previous swing high':'above the previous swing low'}. The breakout has rejected. Watch how far it travels inside the range.`);
      $('continue').hidden=false;if(innerWidth<=800)$('coach').scrollIntoView({block:'start'});
    }else if(index===drill.bars.length-1){
      stop();finished=true;completed++;if(m.rejection>=2*m.excursion)reversals++;
      $('completed').textContent=pad(completed);$('result').hidden=false;
      if(m.rejection>=2*m.excursion){
        coach('DRILL COMPLETE','The rejection went further.',`${money(m.excursion)} beyond the swing. ${money(m.rejection)} back inside the range. A ${(m.rejection/m.excursion).toFixed(2)}× move, measured from the reclaimed level.`);
        $('result').textContent=decision==='chase'?'You chose the breakout. This time it failed. The close back inside the range was the reversal signal.':'You waited for the reclaim. This time, the close back inside the range was followed by the larger reversal.';
      }else{
        coach('DRILL COMPLETE','This breakout held.', 'Price stayed outside the previous swing and continued. There was no reclaim signal in this drill.');
        $('result').textContent=decision==='chase'?'You chose the breakout, and this one continued. Not every higher high or lower low reverses.':'You waited. No reclaim means no reversal signal. A missed continuation is part of this exercise.';
      }
      $('next').textContent='Next drill ↗';
    }
    render();
  }
  function schedule(){clearTimeout(timer);if(!playing)return;timer=setTimeout(()=>{advance();if(playing)schedule();},Number($('speed').value));}
  function play(){if(finished){newDrill();}if(checkpoint)return;playing=!playing;if(playing)schedule();else stop();render();}
  function choose(value){decision=value;$('choices').hidden=true;checkpoint=null;coach('WATCH THE LEVEL', 'Let the price confirm it.',`Your choice: ${value==='wait'?'wait for the reclaim':'take the breakout'}. Watch the next candles at the previous swing ${drill.direction}.`);playing=true;render();schedule();}
  function render(){
    const m=E.measure(drill,index), b=drill.bars[index];
    $('price').textContent=money(b.close);$('excursion').textContent=money(m.excursion);$('rejection').textContent=money(m.rejection);$('ratio').textContent=m.excursion>0?(m.rejection/m.excursion).toFixed(2)+'×':'—';
    $('bar-count').textContent=`BAR ${index+1} / ${drill.bars.length}`;
    $('status').textContent=finished?'Drill complete':checkpoint?'Paused · read the reaction':playing?'Replay running':'Replay paused';
    $('play').textContent=finished?'▶ Next replay':playing?'Ⅱ Pause':index===38?'▶ Start replay':'▶ Resume';
    $('play').disabled=!!checkpoint;$('step').disabled=!!checkpoint||finished;
    $('next').textContent=finished?'Next drill ↗':'New drill ↗';
    const phase=finished||reclaimSeen?2:breakoutSeen?1:0;
    [0,1,2].forEach(i=>$('phase-'+i).classList.toggle('active',i<=phase));
    canvas.setAttribute('aria-label',`Synthetic ${drill.direction==='high'?'higher-high':'lower-low'} chart. Current price ${money(b.close)}. Previous swing ${money(drill.level)}. Breakout ${money(m.excursion)}. Rejection ${money(m.rejection)}. ${$('message').textContent}`);
    draw();
  }
  function draw(){
    if(!drill)return;
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=window.devicePixelRatio||1;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const left=18,right=72,top=34,bottom=30,pw=w-left-right,ph=h-top-bottom;
    const visible=drill.bars.slice(0,index+1), min=Math.min(...visible.map(b=>b.low),drill.level)-drill.breakout*.7, max=Math.max(...visible.map(b=>b.high),drill.level)+drill.breakout*.9;
    const y=p=>top+(max-p)/(max-min)*ph, dx=pw/68, x=i=>left+(i+1)*dx;
    ctx.font='11px ui-monospace, monospace';ctx.textBaseline='middle';
    for(let i=0;i<=5;i++){const p=min+(max-min)*i/5,yy=y(p);ctx.strokeStyle='#1b3042';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(w-right+5,yy);ctx.stroke();ctx.fillStyle='#92a9bc';ctx.fillText(p.toFixed(2),w-right+12,yy);}
    for(let i=0;i<65;i+=10){ctx.strokeStyle='#172b3c';ctx.beginPath();ctx.moveTo(x(i),top);ctx.lineTo(x(i),h-bottom);ctx.stroke();ctx.fillStyle='#839db3';ctx.fillText(String(i+1).padStart(2,'0'),x(i)-6,h-12);}
    const insideY=drill.sign===1?y(drill.level):top;
    ctx.fillStyle='rgba(93,226,237,.035)';ctx.fillRect(left,insideY,pw,drill.sign===1?h-bottom-insideY:y(drill.level)-top);
    const swings=E.swings(drill.bars,index);
    function levelLine(p,label,color,start=left){const yy=y(p);ctx.save();ctx.setLineDash([5,5]);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(start,yy);ctx.lineTo(w-right+5,yy);ctx.stroke();ctx.restore();ctx.font='11px ui-monospace, monospace';const tw=ctx.measureText(label).width;ctx.fillStyle='#0c1d2e';ctx.fillRect(left,yy-18,tw+10,15);ctx.fillStyle=color;ctx.fillText(label,left+3,yy-10);}
    const opposite=drill.direction==='high'?swings.low:swings.high;
    if(opposite&&Math.abs(opposite.price-drill.level)>drill.breakout*.2)levelLine(opposite.price,'SWING '+(drill.direction==='high'?'LOW':'HIGH'),'#8a9fb1',x(opposite.index));
    const same=drill.direction==='high'?swings.high:swings.low;
    if(same&&Math.abs(same.price-drill.level)>drill.breakout*.2)levelLine(same.price,'NEW '+(drill.direction==='high'?'HH':'LL'),'#a9becc',x(same.index));
    levelLine(drill.level,'PREVIOUS '+(drill.direction==='high'?'HIGH':'LOW')+'  '+money(drill.level),'#5de2ed');
    visible.forEach((b,i)=>{const color=b.close>=b.open?'#70d8b0':'#fa8194';ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x(i),y(b.high));ctx.lineTo(x(i),y(b.low));ctx.stroke();ctx.fillRect(x(i)-Math.max(1.3,dx*.29),Math.min(y(b.open),y(b.close)),Math.max(2.6,dx*.58),Math.max(1.4,Math.abs(y(b.open)-y(b.close))));});
    const last=visible[visible.length-1],yy=y(last.close);ctx.setLineDash([2,4]);ctx.strokeStyle='#8eb6c7';ctx.beginPath();ctx.moveTo(x(index)+dx,yy);ctx.lineTo(w-right+7,yy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#5de2ed';ctx.fillRect(w-right+5,yy-10,right-8,20);ctx.fillStyle='#08222d';ctx.font='11px ui-monospace, monospace';ctx.fillText(last.close.toFixed(2),w-right+10,yy);
    if(breakoutSeen){const bx=x(drill.breakIndex),by=y(drill.bars[drill.breakIndex][drill.sign===1?'high':'low']);ctx.fillStyle='#5de2ed';ctx.font='bold 12px ui-monospace,monospace';ctx.fillText(drill.sign===1?'HH':'LL',bx-8,by+(drill.sign===1?-16:18));}
  }
  $('play').onclick=play;$('step').onclick=()=>{stop();advance();};$('next').onclick=newDrill;
  $('wait-choice').onclick=()=>choose('wait');$('chase-choice').onclick=()=>choose('chase');
  $('continue').onclick=()=>{$('continue').hidden=true;checkpoint=null;playing=true;render();schedule();};
  $('speed').onchange=()=>{if(playing)schedule();};
  new ResizeObserver(draw).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();render();}});
  newDrill();
})();
