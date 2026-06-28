/* Final mac simulasyonu: canvas akisi, skor dengesi, final karnesi. */
let sim=null,speedMul=parseFloat(localStorage.getItem("copa_spd")||"1")||1;
function setSpeed(s){speedMul=s;try{localStorage.setItem("copa_spd",s);}catch(e){}document.querySelectorAll(".spd").forEach(b=>b.classList.toggle("on",parseFloat(b.dataset.s)===s));}
function startFinalSim(sp){
 clearTimeout(autoTimer);$("hub").classList.add("hidden");$("result").classList.add("hidden");$("sim").classList.remove("hidden");
 const x=L();$("simA").textContent=clip(teamName||"US",10);$("simB").textContent=clip(opponent.name,10);$("simGoals").innerHTML="";$("simState").textContent=LANG==="tr"?"Dengeli final":"Balanced final";$("momBar").style.background="linear-gradient(90deg,var(--green) 50%,var(--red) 50%)";$("momA").textContent="50%";$("momB").textContent="50%";["statShot","statSave","statDanger"].forEach(id=>{const e=$(id);if(e)e.textContent="0-0";});{const gb=$("goalBurst");if(gb){gb.classList.add("hidden");gb.classList.remove("show");gb.innerHTML="";}}
 window.finalReportHTML="";setSpeed(parseFloat(localStorage.getItem("copa_spd")||"1")||1);buildSim(sp.power,opponent.power);sfxWhistle();crowdStart();
 /* 8 — kart efektlerini göster */
 const _activeCards=cards.filter(k=>{try{const v=cardEff(k,picksBySlot.filter(Boolean),round),pv=cardEff(k,picksBySlot.filter(Boolean),round-1);return cardKind(k)==="final"||v!==pv;}catch(e){return false;}});
 $("simComm").innerHTML=LANG==="tr"?"<b>FINAL</b> başladı!":"<b>FINAL</b> kicks off!";
 if(_activeCards.length){setTimeout(()=>{$("simComm").innerHTML="🃏 "+_activeCards.slice(0,2).map(k=>{const cd=L().cards&&L().cards[k];return cd?"<b>"+cd.n+"</b> aktif":"";}).filter(Boolean).join(" · ");},900);}
 document.querySelectorAll(".shoutbtn").forEach(b=>b.classList.remove("lit"));_simPaused=false;{const pb=$("pauseBtn");if(pb){pb.textContent="⏸";pb.classList.remove("pause");}}
 if(LANG==="en"){const L2={shMore:"Push Up",shPush:"Press High",shCalm:"Slow Tempo",shHold:"Protect Lead"};Object.keys(L2).forEach(id=>{const e=$(id);if(e){const sp=e.querySelector("span");if(sp)sp.textContent=L2[id];}});}
 const rb=$("simRadio");if(rb)rb.textContent="📻 —";sim.run();
}
function buildSim(myPow,oppPow){
 const cv=$("cv"),wrap=Math.max(340,Math.min(860,($("sim")&&$("sim").clientWidth)||860)),W=wrap,H=Math.round(W*0.62),GW=Math.round(W*0.27),GL=(W-GW)/2,GR=(W+GW)/2,PR=Math.max(8,Math.round(W*0.012)),BR=Math.max(5,Math.round(W*0.007)),CTRL=PR+BR+4,ctx=cv.getContext("2d"),x=L();
 const _dpr=Math.min(2,window.devicePixelRatio||1);cv.width=W*_dpr;cv.height=H*_dpr;cv.style.width="100%";cv.style.height="auto";ctx.setTransform(_dpr,0,0,_dpr,0,0);
 function teamFrom(coords,poses,names,side,col,fg,pow,inj=[]){const ps=coords.map((c,i)=>{let hx,hy;if(side==="A"){hx=c[0]/100*W;hy=c[1]/100*H;}else{hx=(1-c[0]/100)*W;hy=(1-c[1]/100)*H;}const pos=poses[i]||"CM",role=groupOf(pos),wide=["LB","RB","WB","LW","RW","LM","RM"].includes(pos);return {hx,hy,x:hx,y:hy,gk:i===0,n:i+1,nm:((names[i]||"").split(" ").pop()||"?"),role,wide,inj:!!inj[i],sideX:hx};});return {side,col,fg,ps,pow,basePow:pow,fwd:side==="A"?-1:1,og:side==="A"?0:H};}
 const myCoords=slots.map(s=>[s[1],s[2]]),myPoses=slots.map(s=>s[0]),myNames=picksBySlot.map(p=>p?p.name:"");
 const f433=FORMATIONS["4-3-3"],oppCoords=f433.map(s=>[s[1],s[2]]),oppPoses=f433.map(s=>s[0]),oNames=oppLineup.length?oppLineup.map(o=>o.name):oppCoords.map(()=>"?");
 const A=teamFrom(myCoords,myPoses,myNames,"A",kit.bg,kit.fg,myPow,picksBySlot.map(p=>p&&p.injured)),B=teamFrom(oppCoords,oppPoses,oNames,"B","#eae2cb","#23332a",oppPow);
 /* state */
 let ball={x:W/2,y:H/2,vx:0,vy:-2.1},frame=0,clock=0,sA=0,sB=0,running=false,raf,lastKick=-12,lastShot=-60,acc=0,poss="A",lastShooter=null,lastShooterSide=null,lastTouch=null,assistNm="",cooldown=0;
 let aShoutTtl=0,aPowBase=null,keeperA=0,keeperB=0,shotsA=0,shotsB=0,dangerA=0,dangerB=0,goalFlash=0,keyMoment="",penaltyNote="";
 const goals=[],scorersA=[],scorersB=[];
 const HGW=20,HGH=15,heatGrid=new Float32Array(HGW*HGH);
 /* 3 — Momentum state variable */
 let momVal=50;
 /* 2 — Stoppage + ET state */
 const stoppage=Math.floor(rand()*4)+2; // 2-5 dk
 let halfDone=false,etDone=false,extraTime=false,etHalf=false,gameOver=false;
 let _paused=false;
 const FULL=90+stoppage,ET1=FULL+15,ET2=FULL+30;

 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function ri(a,b){return Math.floor(rand()*(b-a+1))+a;}
 function scoreDiffFor(t){return t.side==="A"?sA-sB:sB-sA;}
 function attackBrake(t){const lead=scoreDiffFor(t);return lead>=3?0.10:lead>=2?0.26:lead>=1?0.66:1;}
 function scoreSoftCap(){const total=sA+sB;return total>=6?0.18:total>=5?0.30:total>=4?0.48:total>=3?0.72:1;}
 function gameBrake(){return cooldown>0?0.56:1;}
 function closest(t){let bp=null,bd=1e9;t.ps.forEach(p=>{if(p.gk)return;const d=dist(p,ball);if(d<bd){bd=d;bp=p;}});return bp;}
 function mv(p,tx,ty,sp){const a=Math.atan2(ty-p.y,tx-p.x),d=Math.hypot(tx-p.x,ty-p.y);p.vx=p.vx||0;p.vy=p.vy||0;if(d>2){p.vx=p.vx*.62+Math.cos(a)*sp*.38;p.vy=p.vy*.62+Math.sin(a)*sp*.38;}else{p.vx*=.72;p.vy*=.72;}p.x+=p.vx;p.y+=p.vy;p.x=clamp(p.x,PR,W-PR);p.y=clamp(p.y,PR,H-PR);}
 function feedSim(side,txt){const who=side==="A"?clip(teamName||"US",9):clip(opponent.name,8);$("simComm").innerHTML="<b>"+who+"</b> "+txt;}
 function updateStats(){const sh=$("statShot"),sv=$("statSave"),dg=$("statDanger");if(sh)sh.textContent=shotsA+"-"+shotsB;if(sv)sv.textContent=keeperA+"-"+keeperB;if(dg)dg.textContent=dangerA+"-"+dangerB;}
 function addEvent(kind,side,txt){const el=$("simGoals");if(!el)return;const d=document.createElement("div");d.className=(side==="A"?"home":"away")+" "+kind;d.innerHTML=`<b>${clockDisp()}'</b><span>${txt}</span>`;el.prepend(d);while(el.children.length>8)el.removeChild(el.lastChild);}
 function showGoalBurst(min,name,score){const gb=$("goalBurst");if(!gb)return;gb.innerHTML=`<b>${min}' ${name}</b><span>${score}</span>`;gb.classList.remove("hidden","show");void gb.offsetWidth;gb.classList.add("show");setTimeout(()=>gb.classList.add("hidden"),1050);}
 function clockDisp(){const c=Math.floor(clock);if(extraTime){if(c<=ET1)return Math.min(105,91+(c-Math.floor(FULL)));return Math.min(120,106+(c-Math.floor(ET1)));}if(c>90)return "90+"+(c-90);return Math.max(1,c);}

 /* 6 — Formation-aware movement */
 function move(t){const cb=closest(t),attacking=poss===t.side,gy=t.side==="A"?0:H,oy=t.side==="A"?H:0,spF=(0.86+(t.pow-60)/180)*gameBrake();
  t.ps.forEach(p=>{let tx,ty;
   if(p.gk){const danger=t.side==="A"?ball.y>H*0.64:ball.y<H*0.36;tx=clamp(ball.x,GL+8,GR-8);ty=t.side==="A"?(danger?H-42:H-13):(danger?42:13);mv(p,tx,ty,1.82*spF);return;}
   if(attacking){
    if(p===cb){tx=ball.x;ty=ball.y;}
    else if(p.role==="FWD"){if(p.wide){tx=p.sideX<W/2?28:W-28;ty=gy-t.fwd*74;}else{tx=W/2+(p.sideX-W/2)*0.28;ty=gy-t.fwd*58;}}
    else if(p.role==="MID"){tx=p.sideX*0.55+ball.x*0.45;ty=p.hy+(gy-p.hy)*0.45;}
    else if(p.role==="DEF"){tx=p.sideX*0.80+ball.x*0.20;ty=p.hy+(gy-p.hy)*0.18;}
    else{tx=p.sideX;ty=p.hy+(gy-p.hy)*0.12;}
   }else{
    if(p===cb){tx=ball.x;ty=ball.y;}
    else{tx=p.sideX*0.72+ball.x*0.28;ty=p.hy+(oy-p.hy)*0.16+(ball.y-p.hy)*0.10;}
   }
   mv(p,tx,ty,(p.role==="DEF"?1.05:1.18)*spF);
  });
 }
 function sep(){const all=[...A.ps,...B.ps];for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],b=all[j],d=dist(a,b);if(d>0&&d<PR*2-1){const o=(PR*2-d)/2,an=Math.atan2(b.y-a.y,b.x-a.x);a.x-=Math.cos(an)*o;a.y-=Math.sin(an)*o;b.x+=Math.cos(an)*o;b.y+=Math.sin(an)*o;}}}
 function shotProfile(t,shooter,defTeam){
  const gy=t.side==="A"?0:H,distGoal=Math.abs(ball.y-gy),central=1-Math.min(1,Math.abs(ball.x-W/2)/(GW*.72));
  const close=distGoal<H*.115,box=distGoal<H*.22&&ball.x>GL-8&&ball.x<GR+8,outside=distGoal<H*.38;
  let gate=close?0.36:box?0.18:outside?0.035:0;
  const pressure=defTeam.ps.filter(p=>!p.gk&&dist(p,shooter)<PR*4.2).length;
  const gk=defTeam.ps[0],gkCover=1-Math.min(1,Math.abs(gk.x-ball.x)/(GW*.55));
  let q=0.28+(close?.34:0)+(box?.20:0)+central*.20+(t.pow-defTeam.pow)/110-pressure*.08-gkCover*.14;
  if(scoreDiffFor(t)<0){gate*=1.15;q+=0.04;}
  if(clock>78&&scoreDiffFor(t)<0){gate*=1.12;}
  gate*=attackBrake(t)*scoreSoftCap();
  return {gate:clamp(gate,0,0.48),q:clamp(q,0.18,0.88),pressure,gkCover};
 }
 function kick(){let ow=null,od=1e9,t=null;[A,B].forEach(T=>T.ps.forEach(p=>{const d=dist(p,ball);if(d<od){od=d;ow=p;t=T;}}));if(od>CTRL||frame-lastKick<16)return;lastKick=frame;poss=t.side;
  const gy=t.side==="A"?0:H,defTeam=t.side==="A"?B:A,baseNoise=(96-t.pow)/96*0.42,finalThird=t.side==="A"?ball.y<H*0.40:ball.y>H*0.60;
  const wideDeep=finalThird&&(ball.x<GL+16||ball.x>GR-16),sp=shotProfile(t,ow,defTeam),canShoot=frame-lastShot>34;
  let ang,pow;
  if(canShoot&&!ow.gk&&rand()<sp.gate){const cx=GL+GW*(rand()<0.5?0.20:0.80),noise=baseNoise+(1-sp.q)*0.70;ang=Math.atan2(gy-ball.y,cx-ball.x)+(rand()-.5)*noise;pow=2.85+sp.q*1.35;assistNm=(lastTouch&&lastTouch.side===t.side&&lastTouch.p!==ow)?lastTouch.p.nm:"";lastShooter=ow;lastShooterSide=t.side;lastShot=frame;if(t.side==="A")shotsA++;else shotsB++;if(t.side==="A")dangerA++;else dangerB++;updateStats();addEvent("danger",t.side,(LANG==="tr"?(sp.q>.58?"Net şut: ":"Zor şut: "):(sp.q>.58?"Clear shot: ":"Low-quality shot: "))+ow.nm);sfxKick(pow);feedSim(t.side,LANG==="tr"?"şutu çekti!":"shoots!");}
  else if(wideDeep&&!ow.gk&&rand()<0.28*attackBrake(t)*scoreSoftCap()){ang=Math.atan2((gy-t.fwd*46)-ball.y,W/2-ball.x)+(rand()-.5)*(baseNoise+.22);pow=3.30;if(t.side==="A")dangerA++;else dangerB++;updateStats();addEvent("danger",t.side,LANG==="tr"?"Kanattan tehlike":"Wide danger");sfxKick(pow);feedSim(t.side,LANG==="tr"?"kanattan ortaladı!":"crosses in!");}
  else{const mates=t.ps.filter(m=>m!==ow&&!m.gk&&(t.side==="A"?m.y<ball.y-10:m.y>ball.y+10));mates.sort((a,b)=>t.side==="A"?a.y-b.y:b.y-a.y);const wm=mates.filter(m=>m.wide),tg=(wm.length&&rand()<0.42)?wm[0]:(mates.length?mates[0]:null);
   if(tg&&rand()>0.10){ang=Math.atan2(tg.y-ball.y,tg.x-ball.x)+(rand()-.5)*baseNoise;pow=3.35;}
   else{ang=(t.side==="A"?-Math.PI/2:Math.PI/2)+(rand()-.5)*0.42;pow=3.05;}sfxPass();}
  ball.vx=Math.cos(ang)*pow;ball.vy=Math.sin(ang)*pow;lastTouch={p:ow,side:t.side};
 }
 function saveChance(defTeam,attTeam){const gap=(defTeam.pow-attTeam.pow)/125;const shotSpeed=Math.min(1,Math.hypot(ball.vx,ball.vy)/5);return clamp(0.78+gap-shotSpeed*0.09,0.62,0.89);}
 function saveMsg(def){const who=def==="A"?clip(teamName||"US",8):clip(opponent.name,8);$("simComm").innerHTML="🧤 "+(LANG==="tr"?"<b>"+who+"</b> kalecisi kurtardı!":"<b>"+who+"</b> keeper saves!");if(def==="A")keeperA++;else keeperB++;updateStats();addEvent("save",def,LANG==="tr"?"Kaleci kurtardı":"Keeper save");sfxSave();if(!keyMoment)keyMoment=LANG==="tr"?"kaleci oyunda tuttu":"keeper kept it alive";}

 /* 7 — Köşe vuruşu */
 function cornerKick(attackSide){const cornerX=ball.x<W/2?8:W-8;ball.x=cornerX;ball.y=attackSide==="A"?BR+2:H-BR-2;const cx=GL+GW*(0.2+rand()*0.6),cy=attackSide==="A"?H*0.22:H*0.78;ball.vx=(cx-ball.x)*0.07+(rand()-.5)*0.4;ball.vy=(cy-ball.y)*0.07+(rand()-.5)*0.3;lastKick=frame+22;poss=attackSide;addEvent("corner",attackSide,LANG==="tr"?"Köşe vuruşu":"Corner kick");sfxPass();}

 function phys(){ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=0.976;ball.vy*=0.976;if(ball.x<BR){ball.x=BR;ball.vx*=-.58;}if(ball.x>W-BR){ball.x=W-BR;ball.vx*=-.58;}
  if(ball.y<BR){if(ball.x>GL&&ball.x<GR){const gk=B.ps[0];if(Math.abs(gk.x-ball.x)<38&&rand()<saveChance(B,A)){ball.y=BR+5;ball.vy=2.35+rand()*0.75;ball.vx=(ball.x<W/2?-1:1)*(1.55+rand()*1.2);lastKick=frame+18;lastShot=frame;saveMsg("B");}else{goal("A");return;}}else{/* 7 — köşe */if(rand()<0.55&&frame-lastKick>20){cornerKick("A");}else{ball.y=BR;ball.vy*=-.58;}}}
  if(ball.y>H-BR){if(ball.x>GL&&ball.x<GR){const gk=A.ps[0];if(Math.abs(gk.x-ball.x)<38&&rand()<saveChance(A,B)){ball.y=H-BR-5;ball.vy=-(2.35+rand()*0.75);ball.vx=(ball.x<W/2?-1:1)*(1.55+rand()*1.2);lastKick=frame+18;lastShot=frame;saveMsg("A");}else{goal("B");return;}}else{/* 7 — köşe */if(rand()<0.55&&frame-lastKick>20){cornerKick("B");}else{ball.y=H-BR;ball.vy*=-.58;}}}
  [...A.ps,...B.ps].forEach(p=>{const d=dist(p,ball);if(d<PR+BR&&frame-lastKick>4){const an=Math.atan2(ball.y-p.y,ball.x-p.x);ball.x=p.x+Math.cos(an)*(PR+BR);ball.y=p.y+Math.sin(an)*(PR+BR);const s2=Math.hypot(ball.vx,ball.vy)*0.43;ball.vx=Math.cos(an)*s2+(rand()-.45);ball.vy=Math.sin(an)*s2+(rand()-.45);}});
 }
 function updateGoals(){const el=$("simGoals");if(!el)return;el.innerHTML=goals.map(g=>`<div class="${g.side==="A"?"home":"away"}"><b>${g.m}'</b><span>${g.side==="A"?"⚽":"🥅"} ${clip(g.name,18)}</span></div>`).join("");}
 function goal(sc){if(sc==="A")sA++;else sB++;cooldown=760;goalFlash=60;$("simScore").textContent=sA+"–"+sB;sfxWhistle();crowdSwell();
  /* 3 — momentum kayması */
  momVal=clamp(momVal+(sc==="A"?14:-14),18,82);
  if(lastShooter&&lastShooterSide===sc){if(sc==="A")scorersA.push(lastShooter.nm);else scorersB.push(lastShooter.nm);}
  const x2=L(),mn=clockDisp(),who=sc==="A"?(clip(teamName||"US",9)):(clip(opponent.name,8)),sn=(lastShooter&&lastShooterSide===sc)?lastShooter.nm:"";const asst=(sn&&assistNm)?(" <small>"+x2.assistLbl+" "+assistNm+"</small>"):"";
  $("simComm").innerHTML="⚽ <b>"+mn+"'</b> "+(sn?"<b>"+sn+"</b>":"<b>"+who+"</b>")+asst+" — "+sA+"–"+sB;pushFeed("⚽ "+mn+"' <b>"+(sn||who)+"</b>"+(sn&&assistNm?" ("+assistNm+")":"")+" "+sA+"–"+sB,"goal");goals.push({m:mn,side:sc,name:sn||who});addEvent("goal",sc,"⚽ "+(sn||who)+" "+sA+"–"+sB);showGoalBurst(mn,sn||who,sA+"–"+sB);if(!keyMoment)keyMoment=(sn||who)+" "+mn+"'";
  assistNm="";A.ps.forEach(p=>{p.x=p.hx;p.y=p.hy;p.vx=0;p.vy=0;});B.ps.forEach(p=>{p.x=p.hx;p.y=p.hy;p.vx=0;p.vy=0;});ball={x:W/2,y:H/2,vx:0,vy:(sc==="A"?1.8:-1.8)};lastKick=frame;lastShooter=null;poss=sc==="A"?"B":"A";
  /* kritik an dramatizasyonu */
  const _isEq=sA===sB,_isLate=clock>78,_isVeryLate=clock>86,_wrap=document.querySelector(".simwrap");
  if(_wrap&&(_isEq||_isLate)){_wrap.classList.remove("shake","equalize");void _wrap.offsetWidth;_wrap.classList.add(_isEq?"equalize":"shake");setTimeout(()=>_wrap.classList.remove("equalize","shake"),_isEq?900:450);}
  if(_isVeryLate||(_isEq&&_isLate)){
   const _tr=LANG==="tr",_sn=sn||who;
   let _dm="";
   if(_isEq&&_isVeryLate)_dm=_tr?`⚡ <b style="font-size:1.15em">SON DAKİKA EŞİTLEMESİ!</b> ${_sn}`:`⚡ <b style="font-size:1.15em">LATE EQUALIZER!</b> ${_sn}`;
   else if(_isEq)_dm=_tr?`⚡ <b>EŞİTLEDİ!</b> ${_sn} — ${sA}–${sB}`:`⚡ <b>EQUALIZER!</b> ${_sn} — ${sA}–${sB}`;
   else if(sc==="A"&&_isVeryLate)_dm=_tr?`🔥 <b>GEÇ GOL!</b> ${_sn} — ${sA}–${sB}`:`🔥 <b>LATE GOAL!</b> ${_sn} — ${sA}–${sB}`;
   else if(sc==="B"&&_isVeryLate)_dm=_tr?`💥 <b>RAKİP GEÇ GOL!</b> — ${sA}–${sB}`:`💥 <b>LATE GOAL — OPPONENT!</b> — ${sA}–${sB}`;
   if(_dm)setTimeout(()=>{if(!gameOver)$("simComm").innerHTML=_dm;},320);
  }
 }
 function statusText(){const tr=LANG==="tr",diff=Math.abs(sA-sB);
  if(extraTime)return tr?"Uzatmalar":"Extra Time";
  if(clock>90)return tr?"Uzatma dakikası":"Stoppage Time";
  if(clock>78)return tr?"Son dakikalar":"Final minutes";
  if(diff>=3)return tr?"Fark açıldı, tempo düştü":"Gap opened, tempo cooled";
  if(diff>=2)return tr?"Kontrol oyunu":"Game management";
  if(keeperA+keeperB>=3)return tr?"Kaleciler öne çıktı":"Keepers on top";
  if(Math.abs(myPow-oppPow)<=3)return tr?"Dengeli final":"Balanced final";
  return (myPow>oppPow)?(tr?"Favori baskı kuruyor":"Favourite applying pressure"):(tr?"Rakip baskıyı artırdı":"Opponent raising pressure");}
 /* 3 — Gerçek momentum güncelleme */
 function updateMomentum(){
  momVal+=(poss==="A"?0.25:-0.25);
  const base=50+(A.pow-B.pow)*0.45;
  momVal=momVal*0.97+base*0.03;
  momVal=clamp(momVal,18,82);
  const a=Math.round(momVal),b=100-a;
  $("momA").textContent=a+"%";$("momB").textContent=b+"%";$("momBar").style.background=`linear-gradient(90deg,var(--green) ${a}%,var(--red) ${a}%)`;$("simState").textContent=statusText();}
 function drawHeatmap(){
  const sm=new Float32Array(HGW*HGH);
  const kn=[0.0625,0.125,0.0625,0.125,0.25,0.125,0.0625,0.125,0.0625];
  for(let r=0;r<HGH;r++)for(let c=0;c<HGW;c++){let v=0,w=0;for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr>=0&&rr<HGH&&cc>=0&&cc<HGW){const ki=(dr+1)*3+(dc+1);v+=heatGrid[rr*HGW+cc]*kn[ki];w+=kn[ki];}}sm[r*HGW+c]=v/w;}
  const mx=Math.max(1,...Array.from(sm));
  const cw=W/HGW,ch=H/HGH;
  for(let r=0;r<HGH;r++)for(let c=0;c<HGW;c++){const v=sm[r*HGW+c]/mx;if(v<0.04)continue;const hue=v<0.3?220-v/0.3*80:v<0.6?140-(v-0.3)/0.3*100:v<0.85?40-(v-0.6)/0.25*40:0;const sat=v<0.15?70:85;const lit=v<0.2?55:48-v*4;const alpha=Math.min(0.88,v<0.15?v/0.15*0.35:0.35+v*0.55);ctx.fillStyle=`hsla(${hue},${sat}%,${lit}%,${alpha})`;ctx.fillRect(c*cw,r*ch,cw,ch);}
  const lblW=158;ctx.fillStyle="rgba(0,0,0,0.58)";ctx.fillRect((W-lblW)/2,H-22,lblW,17);ctx.fillStyle="#fff";ctx.font="bold 8px 'Inter',sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("🔥 "+(LANG==="tr"?"TOP YOĞUNLUK HARİTASI":"BALL HEAT MAP"),W/2,H-13);
 }
 function radioLine(pos,sa,sb,min){
  const tr=LANG==="tr",diff=sa-sb,atHome=pos==="A";
  const myN=clip(teamName||"US",8),oppN=clip(opponent.name,8);
  const lastScorer=scorersA.length?scorersA[scorersA.length-1]:"";
  const p=(a)=>a[frame%a.length];
  /* Uzatma */
  if(extraTime&&min>FULL+20){return "📻 "+(tr?p(["⏱ Penaltılar kapıda!","Her şut kupa!","Nefesler tutuluyor..."])
   :p(["⏱ Penalties are coming!","Every shot could be the cup!","Nobody's breathing out there..."]));}
  if(extraTime){return "📻 "+(tr?p(["Uzatmalarda bir gol yeter!","Uzatma, stad ayakta!","30 dakika, bir bilet!"])
   :p(["One goal wins it in extra time!","Extra time — stadium on its feet!","30 minutes, one ticket home!"]));}
  /* Son dakikalar */
  if(min>86&&diff===0){return "📻 <b>"+(tr?p(["Berabere, penaltılar geliyor!","Kimse kazanamıyor, uzatma kapıda!","Kupa finalinde dram tavan!"])
   :p(["Level — it's going to extra time!","Nobody can separate them!","Cup final drama at the death!"]))+"</b>";}
  if(min>86&&diff>0){return "📻 "+(tr?"<b>"+myN+"</b> "+p(["skoru koruyor, sayım başladı!","mutlu son yakın, def duruyor!","kupa ellerinde, son anlar!"])
   :"<b>"+myN+"</b> "+p(["holding on for glory!","the cup is theirs to lose!","counting down the seconds!"]));}
  if(min>86&&diff<0){return "📻 "+(tr?"<b>"+myN+"</b> "+p(["son umut, forvet önde!","bir mucize gerek!","son atakta gol lazım!"])
   :"<b>"+myN+"</b> "+p(["chasing a miracle!","everything forward now!","one last chance for glory!"]));}
  if(min>78&&diff===0){return "📻 "+(tr?p(["Son dakikalar, skor berabere!","Kim kazanacak, stad biliyor mu?","Final gerginliği tavan yaptı!"])
   :p(["Final minutes — still level!","Who wants this cup more?","The tension is unbearable!"]));}
  if(min>78&&diff>0&&lastScorer){return "📻 "+(tr?"<b>"+lastScorer+"</b>'nin golü "+myN+"'i öne geçirdi, dakikalar akıyor..."
   :"<b>"+lastScorer+"</b>'s goal has "+myN+" in front — clock ticking...");}
  if(min>78&&diff<0){return "📻 "+(tr?p(["Rakip önde, "+myN+" cevap arıyor","Zor durum, golü bul!"])
   :p([oppN+" ahead — "+myN+" need a response","Trailing late, this is now or never!"]));}
  /* İlk devre / orta bölüm */
  if(min<20){return "📻 "+(tr?p(["Final başladı, her iki takım da dikkatli","Açılış dakikaları, zemin kuruluyor","Kupa finalinin ilk nabzı atıyor"])
   :p(["Cup final underway — both teams cautious","Early stages, feeling each other out","First minutes of the cup final"]));}
  if(min<45&&atHome&&lastScorer){return "📻 "+(tr?"<b>"+lastScorer+"</b> golünün ardından "+myN+" iyi görünüyor"
   :"<b>"+lastScorer+"</b>'s goal has "+myN+" looking confident");}
  if(atHome){return "📻 "+(tr?p(["Kontrol "+myN+"'de",""+myN+" baskı kuruyor",""+myN+" saha hakimiyetini aldı","Top "+myN+"'de, atak çıkışı bekleniyor"])
   :p(["Control with "+myN,""+myN+" on the front foot",""+myN+" dominating possession",""+myN+" building another attack"]));}
  if(diff>=2){return "📻 "+(tr?oppN+" fark açtı, "+myN+" geri dönebilir mi?":oppN+" two clear — can "+myN+" come back?");}
  return "📻 "+(tr?p([oppN+" topa hükmediyor",oppN+" maça hakim","İki takım eşit, sıkı final"])
   :p([oppN+" controlling the ball",oppN+" on top now","Tight final — both teams level"]));
 }
 function draw(){ctx.clearRect(0,0,W,H);for(let i=0;i<9;i++){ctx.fillStyle=i%2?"#79ad5c":"#6fa052";ctx.fillRect(0,i*H/9,W,H/9);}
  ctx.strokeStyle="rgba(255,255,255,.6)";ctx.lineWidth=2;ctx.strokeRect(7,7,W-14,H-14);ctx.beginPath();ctx.moveTo(7,H/2);ctx.lineTo(W-7,H/2);ctx.stroke();ctx.beginPath();ctx.arc(W/2,H/2,38,0,7);ctx.stroke();
  ctx.strokeStyle="#fff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(GL,7);ctx.lineTo(GR,7);ctx.stroke();ctx.beginPath();ctx.moveTo(GL,H-7);ctx.lineTo(GR,H-7);ctx.stroke();
  [A,B].forEach(t=>t.ps.forEach(p=>{const r=p.gk?8:9.5,bx=Math.sin((frame+p.n*9)*0.16)*1.1,by=Math.cos((frame+p.n*5)*0.14)*1.1,cx=p.x+bx,cy=p.y+by;ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fillStyle=p.gk?"#e6ad2e":t.col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=(t.side==="A"&&!p.gk)?kit.sec:"#fff";ctx.stroke();ctx.fillStyle=p.gk?"#23332a":t.fg;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font="bold 9px 'Inter',sans-serif";ctx.fillText(p.n,cx,cy);ctx.fillStyle="#f3ead2";ctx.font="6px 'Inter',sans-serif";ctx.fillText((p.nm||"").slice(0,7).toUpperCase(),cx,cy+r+5);if(p.inj){ctx.fillStyle="#d6543a";ctx.fillRect(cx+r-4,cy-r-4,8,8);ctx.fillStyle="#fff";ctx.font="bold 7px 'Inter',sans-serif";ctx.fillText("!",cx+r,cy-r+1);}}));
  ctx.beginPath();ctx.arc(ball.x,ball.y,BR,0,7);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle="#23332a";ctx.stroke();
 }
 function tick(){frame++;clock+=90/(68*60);if(cooldown>0)cooldown--;if(aShoutTtl>0){aShoutTtl--;if(aShoutTtl<=0&&aPowBase!=null){A.pow=aPowBase;aPowBase=null;}}move(A);move(B);sep();kick();phys();
  const _hx=Math.min(HGW-1,Math.floor(ball.x/W*HGW)),_hy=Math.min(HGH-1,Math.floor(ball.y/H*HGH));heatGrid[_hy*HGW+_hx]++;if(frame%4===0){[...A.ps,...B.ps].forEach(p=>{if(!p.gk){const wx=Math.min(HGW-1,Math.floor(p.x/W*HGW)),wy=Math.min(HGH-1,Math.floor(p.y/H*HGH));heatGrid[wy*HGW+wx]+=0.22;}});}
 }

 /* 1 — Penaltı serisi */
 function doShootout(){
  gameOver=true;running=false;cancelAnimationFrame(raf);
  $("simState").textContent=LANG==="tr"?"Penaltılar":"Penalties";
  $("simComm").innerHTML="🎯 "+(LANG==="tr"?"Penaltı serisine gidiliyor...":"Going to penalties...");
  const boost=hasCard("sogukkanli_penaltici")?0.08:0,diff=(myPow-oppPow)/200;
  const pA=clamp(0.75+diff+boost,0.42,0.93),pB=clamp(0.75-diff,0.42,0.93);
  let kA=0,kB=0;const results=[];
  for(let i=0;i<5;i++){const a=rand()<pA,b=rand()<pB;if(a)kA++;if(b)kB++;results.push({a,b,kA,kB});}
  // Eğer berabere, sudden death (1 tekme daha)
  let wonA=kA>kB;
  if(kA===kB){const a=rand()<pA,b=rand()<pB;if(a&&!b){wonA=true;kA++;}else if(b&&!a){wonA=false;kB++;}else{wonA=rand()<0.5;if(wonA)kA++;else kB++;}results.push({a:wonA,b:!wonA,kA,kB,sd:true});}
  let delay=300;
  results.forEach((r,i)=>{
   delay+=750;
   setTimeout(()=>{
    const mA=r.a?"✅":"❌",mB=r.b?"✅":"❌";
    $("simComm").innerHTML=`🎯 ${r.sd?"SD":i+1}. ${mA} <b>${clip(teamName||"US",7)}</b> <span style="opacity:.5">${r.kA}–${r.kB}</span> <b>${clip(opponent.name,7)}</b> ${mB}`;
    $("simState").textContent=(r.kA===r.kB?"":`${r.kA}–${r.kB} `)+`(${LANG==="tr"?"penaltı":"pen."})`;
    sfxKick(3);
   },delay);
  });
  delay+=900;
  setTimeout(()=>{
   penaltyNote=wonA?(LANG==="tr"?"penaltılarda kazandın":"won on penalties"):(LANG==="tr"?"penaltılarda kaybettin":"lost on penalties");
   if(wonA)sA++;else sB++;
   $("simScore").textContent=sA+"–"+sB;
   $("simComm").innerHTML="🏆 "+penaltyNote;
   $("simClk").textContent="90'";
   sfxWhistle();
   draw();drawHeatmap();try{window._heatmapImg=cv.toDataURL('image/png');}catch(e){}motm=pickMOTM();makeReport(sA>sB);
   setTimeout(()=>endRun(sA>sB,sA+"–"+sB),900);
  },delay);
 }

 /* 4 — Devre arası */
 function doHalfTime(isET){
  running=false;cancelAnimationFrame(raf);
  const lbl=isET?(LANG==="tr"?"ET Devresi":"ET Half-Time"):(LANG==="tr"?"DEVRE ARASI":"HALF TIME");
  $("simState").textContent=lbl+" — "+sA+"–"+sB;
  $("simComm").innerHTML="🔔 <b>"+lbl+"</b> · "+sA+"–"+sB;
  sfxWhistle();
  /* hafif momentum reset */
  momVal=momVal*0.7+50*0.3;
  setTimeout(()=>{if(!gameOver&&!_paused){running=true;raf=requestAnimationFrame(frameStep);}},2400);
 }

 function frameStep(){if(!running)return;acc+=goalFlash>0?speedMul*0.35:speedMul;if(goalFlash>0)goalFlash--;let n=0;
  while(acc>=1&&n<8){tick();acc--;n++;
   /* 4 — Devre arası */
   if(!halfDone&&!extraTime&&clock>=45){halfDone=true;doHalfTime(false);return;}
   /* 2 — Normal süre bitiş */
   if(!extraTime&&clock>=FULL){
    if(sA===sB){extraTime=true;$("simState").textContent=LANG==="tr"?"Uzatmalar başlıyor":"Extra Time begins";$("simComm").innerHTML="⏱ "+(LANG==="tr"?"30 dakika uzatma!":"30 minutes of extra time!");sfxWhistle();setTimeout(()=>{if(!gameOver&&!_paused){running=true;raf=requestAnimationFrame(frameStep);}},1800);running=false;cancelAnimationFrame(raf);return;}
    else{finishSim();return;}
   }
   /* 4 — ET devre arası */
   if(extraTime&&!etHalf&&clock>=FULL+15){etHalf=true;doHalfTime(true);return;}
   /* 2 — ET bitiş */
   if(extraTime&&clock>=ET2){
    if(sA===sB){doShootout();return;}
    else{finishSim();return;}
   }
  }
  const cd=clockDisp();$("simClk").textContent=cd+"'";{const tv=$("tvover");if(tv)tv.innerHTML=(round>=6?"🏆 "+L().cupTitle:"🔴 TRT SPOR")+" · "+cd+"' · "+sA+"–"+sB;}
  if(frame%110<2){const rb=$("simRadio");if(rb)rb.innerHTML=radioLine(poss,sA,sB,Math.floor(clock));updateMomentum();}draw();raf=requestAnimationFrame(frameStep);}

 function pickMOTM(){if(scorersA.length){const f={};scorersA.forEach(n=>f[n]=(f[n]||0)+1);let best=scorersA[0],bc=0;Object.keys(f).forEach(n=>{if(f[n]>bc){bc=f[n];best=n;}});return best;}const out=picksBySlot.filter(p=>p&&p.pos!=="GK");const p=out.length?rnd(out):picksBySlot[0];return p?p.name.split(" ").pop():"?";}
 function makeReport(won){const tr=LANG==="tr",cardsTxt=finalCardSummary().replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();const rows=[[tr?"Maçın kırılma anı":"Key moment",keyMoment||goals[0]?.name||"-"],[tr?"Şutlar":"Shots",shotsA+"-"+shotsB],[tr?"Final kart etkisi":"Final card effect",cardsTxt||"0"]];if(penaltyNote)rows.push([tr?"Penaltılar":"Penalties",penaltyNote]);const _fNotes_won_tr=["Kupa sandığa girdi. Bu kadroya saygı duruşu.","Rüya sezon. Final sahnesi, şampiyonluk sarhoşluğu.","Son düdüğe kadar didindi. Hak edilmiş bir zafer.","Bu takım birlikte büyüdü. Kupa onları bekliyordu.","Rakip daha güçlüydü; ama bugün sahada yürüyen kupayı kazandı.","İnançla kurulmuş bir kadro, inançla kaldırdı kupayı."];const _fNotes_won_en=["The cup comes home. This squad earned every inch.","A dream run. Final glory sealed.","Fought until the last whistle. Perfectly deserved.","Built to win, and they did exactly that.","The underdog story that wrote its own final chapter.","One trophy, one squad, one unforgettable run."];const _fNotes_lost_tr=["Finale geldi, yetmedi. Bir sonraki run daha güçlü.","Son adımda tökezledi. Ama bu ruh devam edecek.","Kupa yakındı — bir gol, bir karar, bir an. Sıradaki.","Bu kadro çok şey gördü. Ama şampiyonluk başka birini seçti.","Rakip daha hazırdı. Sıfırdan başla, bu sefer fark yat.","Finaller böyle. Bir hata, bir ömür. Bir sonraki run."];const _fNotes_lost_en=["So close. Build something stronger next time.","Fell at the final hurdle. The run had real quality.","One moment decided it. Come back harder.","Almost isn't enough in a final. Try again.","The squad gave everything. The cup found another home.","Fine margins. One more piece next run."];const _ni=Math.floor(Math.random()*6);rows.push([tr?"Final yorumu":"Final note",won?(tr?_fNotes_won_tr[_ni]:_fNotes_won_en[_ni]):(tr?_fNotes_lost_tr[_ni]:_fNotes_lost_en[_ni])]);window.finalReportHTML=`<h4>${tr?"Final Karnesi":"Final Report"}</h4>`+rows.map(r=>`<div class="frrow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join("");}
 function finishSim(){gameOver=true;running=false;cancelAnimationFrame(raf);crowdStop();const cd=clockDisp();$("simClk").textContent=cd+"'";
  draw();drawHeatmap();try{window._heatmapImg=cv.toDataURL('image/png');}catch(e){}motm=pickMOTM();makeReport(sA>sB);setTimeout(()=>endRun(sA>sB,sA+"–"+sB),1000);
 }
 sim={
  run:()=>{_paused=false;running=true;draw();raf=requestAnimationFrame(frameStep);},
  pause:()=>{_paused=true;running=false;cancelAnimationFrame(raf);},
  resume:()=>{_paused=false;if(!running&&!gameOver){running=true;raf=requestAnimationFrame(frameStep);}},
  shout:(t)=>{
   if(aPowBase==null)aPowBase=A.pow;
   const mp={more:{d:6,t:"yüklen!",e:"push up!"},push:{d:4,t:"önde bas!",e:"press high!"},calm:{d:2,t:"tempoyu düşür",e:"slow tempo"},hold:{d:-4,t:"skoru koru",e:"protect lead"}};
   const c=mp[t]||mp.more;A.pow=aPowBase+c.d;aShoutTtl=780;playUiSample("click",.18);
   const rb=$("simRadio");if(rb)rb.innerHTML="📻 <b>"+clip(teamName||"US",9)+"</b> "+(LANG==="tr"?c.t:c.e);
  },
  /* 9 — Skip: hedefler sıralı gösterilir */
  skip:()=>{
   gameOver=true;running=false;cancelAnimationFrame(raf);crowdStop();
   while(clock<90){
    clock+=4;
    const e=(myPow-oppPow)/150,lead=sA-sB;
    const total=sA+sB,cap=total>=6?0.20:total>=5?0.32:total>=4?0.50:total>=3?0.72:1;
    if(rand()<(0.010+Math.max(0,e)*0.70-(lead>=2?0.008:0))*cap){
     sA++;const fw=picksBySlot.filter(p=>p&&FWDP.includes(p.pos));
     if(fw.length){const n=rnd(fw).name.split(" ").pop();scorersA.push(n);goals.push({m:Math.min(90,Math.floor(clock)),side:"A",name:n});}
    }
    if(rand()<(0.010+Math.max(0,-e)*0.70-((-lead)>=2?0.008:0))*cap){
     sB++;goals.push({m:Math.min(90,Math.floor(clock)),side:"B",name:opponent.name});
    }
   }
   if(sA===sB){
    const boost=hasCard("sogukkanli_penaltici")?0.15:0;
    if(rand()<0.5+boost+(myPow-oppPow)/60){sA++;penaltyNote=LANG==="tr"?"penaltılarda kazandın":"won on penalties";}
    else{sB++;penaltyNote=LANG==="tr"?"penaltılarda kaybettin":"lost on penalties";}
   }
   $("simScore").textContent=sA+"–"+sB;
   /* 9 — Hedefleri 200ms arayla göster */
   let d=0;
   let rA=0,rB=0;
   goals.forEach(g=>{
    d+=200;
    setTimeout(()=>{
     if(g.side==="A")rA++;else rB++;
     $("simScore").textContent=rA+"–"+rB;
     showGoalBurst(g.m,g.name,rA+"–"+rB);
     updateGoals();
    },d);
   });
   setTimeout(()=>{
    $("simScore").textContent=sA+"–"+sB;updateGoals();
    motm=pickMOTM();makeReport(sA>sB);endRun(sA>sB,sA+"–"+sB);
   },d+500);
  }
 };
}
function simSkip(){if(sim)sim.skip();}
