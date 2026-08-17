/* Phaser is intentionally limited to the draw ceremony and penalty shootout. */
(function(root){
  "use strict";
  let loadPromise=null,drawGame=null,penaltyGame=null,drawBusy=false;
  const reduced=()=>document.body.classList.contains("reduced-motion")||root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function load(){
    if(root.Phaser)return Promise.resolve(root.Phaser);
    if(loadPromise)return loadPromise;
    loadPromise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src="src/vendor/phaser.min.js?v=4.2.1";script.async=true;
      script.onload=()=>resolve(root.Phaser);script.onerror=()=>reject(new Error("phaser_load_failed"));document.head.appendChild(script);
    });
    return loadPromise;
  }
  function palette(){
    const style=getComputedStyle(document.documentElement);
    const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
    return{
      background:read("--surface-dark","#0A1118"),
      panel:read("--surface-bg","#17242D"),
      text:read("--text-primary","#F3F5F4"),
      primary:read("--color-primary","#F24A28"),
      slate:read("--color-slate","#68757C"),
      success:read("--status-success","#4E9B65")
    };
  }
  function destroy(game){if(game&&typeof game.destroy==="function")try{game.destroy(true);}catch(_){}}
  function commonConfig(Phaser,parent,width,height,scene){
    return{type:Phaser.AUTO,parent,width,height,transparent:true,antialias:true,render:{pixelArt:false,roundPixels:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},audio:{noAudio:true},scene};
  }
  async function mountDraw(state,copy){
    const parent=document.getElementById("phaserDrawStage");if(!parent)return;
    const Phaser=await load();if(!parent.isConnected)return;destroy(drawGame);const colors=palette();if(parent.parentElement)parent.parentElement.classList.add("has-phaser");
    const revealed=state.draw.entries.slice(0,state.draw.revealIndex),next=state.draw.entries[state.draw.revealIndex];
    drawGame=new Phaser.Game(commonConfig(Phaser,parent,420,420,{create(){
      const scene=this,g=scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(colors.panel).color,.98);g.fillRoundedRect(20,18,380,384,24);
      g.lineStyle(1,Phaser.Display.Color.HexStringToColor(colors.slate).color,.45);g.strokeRoundedRect(20,18,380,384,24);
      scene.add.text(40,38,`${copy.pot} ${next?next.pot:4}`,{fontFamily:"monospace",fontSize:"14px",fontStyle:"bold",color:colors.primary});
      scene.add.text(380,38,`${state.draw.revealIndex}/${state.draw.entries.length}`,{fontFamily:"monospace",fontSize:"14px",fontStyle:"bold",color:colors.text}).setOrigin(1,0);
      (state.groups||[]).forEach((group,index)=>{
        const id=group.id,column=index%4,row=Math.floor(index/4),x=72+column*92,groupY=88+row*60,count=revealed.filter(entry=>entry.groupId===id).length;
        const active=group&&group.teamIds.includes("player");
        g.fillStyle(Phaser.Display.Color.HexStringToColor(active?colors.primary:colors.slate).color,active?.28:.16);g.fillRoundedRect(x-35,groupY-17,70,52,11);
        scene.add.text(x,groupY-1,id,{fontFamily:"Inter, sans-serif",fontSize:"17px",fontStyle:"bold",color:colors.text}).setOrigin(.5);
        scene.add.text(x,groupY+21,`${count}/4`,{fontFamily:"monospace",fontSize:"9px",color:"#BCC2C2"}).setOrigin(.5);
      });
      g.lineStyle(2,0xffffff,.14);g.lineBetween(50,205,370,205);
      const ball=scene.add.circle(210,278,57,Phaser.Display.Color.HexStringToColor(colors.primary).color).setStrokeStyle(3,0xffffff,.72).setInteractive({useHandCursor:true});
      scene.add.circle(191,256,10,0xffffff,.24);scene.add.text(210,276,next?String(next.pot):"✓",{fontFamily:"Inter, sans-serif",fontSize:"31px",fontStyle:"bold",color:"#ffffff"}).setOrigin(.5);
      const hint=scene.add.text(210,359,next?(copy.nextBall||"Next ball"):(copy.drawComplete||"Complete"),{fontFamily:"Inter, sans-serif",fontSize:"12px",color:"#E4E8E7"}).setOrigin(.5);
      let downY=0;ball.on("pointerdown",pointer=>{downY=pointer.y;});ball.on("pointerup",pointer=>{if(!drawBusy&&next&&(downY-pointer.y>18||Math.abs(downY-pointer.y)<=18))root.revealTournamentBall();});
      if(!reduced()&&next)scene.tweens.add({targets:ball,scale:1.045,duration:800,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      scene.copa={ball,hint};
    }}));
  }
  function animateDraw(entry,callback){
    if(drawBusy)return false;const scene=drawGame&&drawGame.scene&&drawGame.scene.scenes[0],actor=scene&&scene.copa;
    if(!actor){callback();return true;}drawBusy=true;
    const done=()=>{drawBusy=false;callback();};
    actor.hint.setText(entry&&entry.teamId==="player"?(root.LANG==="tr"?"SENİN KULÜBÜN":"YOUR CLUB"):entry&&entry.name||"");
    if(reduced()){setTimeout(done,80);return true;}
    scene.tweens.add({targets:actor.ball,y:220,scale:1.18,angle:12,duration:330,ease:"Back.easeOut",yoyo:true,hold:240,onComplete:done});
    return true;
  }
  async function mountPenalty(state,reveal){
    const parent=document.getElementById("phaserPenaltyStage");if(!parent)return;
    const Phaser=await load();if(!parent.isConnected)return;destroy(penaltyGame);const colors=palette();if(parent.parentElement)parent.parentElement.classList.add("has-phaser");
    penaltyGame=new Phaser.Game(commonConfig(Phaser,parent,720,390,{create(){
      const scene=this,g=scene.add.graphics();
      const bg=Phaser.Display.Color.HexStringToColor(colors.background).color,accent=Phaser.Display.Color.HexStringToColor(colors.primary).color;
      g.fillStyle(bg,1);g.fillRect(0,0,720,390);
      /* Stadium tiers and floodlight bloom. */
      g.fillStyle(0x17242d,1);g.fillRect(0,0,720,112);
      for(let x=18;x<720;x+=34){g.fillStyle(x%68===18?0xf3f5f4:0xaab2b3,.18);g.fillCircle(x,62+(x%3)*5,2.5);}
      g.fillStyle(0xf3f5f4,.055);g.fillTriangle(42,0,168,238,300,238);g.fillTriangle(678,0,552,238,420,238);
      /* Pitch with restrained Copa green stripes. */
      g.fillStyle(0x1f6b45,1);g.fillRect(0,104,720,286);
      for(let x=0;x<720;x+=120){g.fillStyle(0x4e9b65,.10);g.fillRect(x,104,60,286);}
      g.lineStyle(2,0xf3f5f4,.28);g.lineBetween(0,334,720,334);g.strokeEllipse(360,390,320,150);
      /* Goal, net and depth. */
      const goal={left:82,right:638,top:34,bottom:272};
      g.fillStyle(0x0a1118,.34);g.fillRect(goal.left+7,goal.top+7,goal.right-goal.left-14,goal.bottom-goal.top-2);
      g.lineStyle(1,0xf3f5f4,.20);
      for(let x=goal.left+18;x<goal.right;x+=34)g.lineBetween(x,goal.top+5,x,goal.bottom);
      for(let y=goal.top+20;y<goal.bottom;y+=28)g.lineBetween(goal.left+5,y,goal.right-5,y);
      g.lineStyle(8,0xf3f5f4,1);g.lineBetween(goal.left,goal.top,goal.right,goal.top);g.lineBetween(goal.left,goal.top,goal.left,goal.bottom);g.lineBetween(goal.right,goal.top,goal.right,goal.bottom);
      const xs={L:176,C:360,R:544};
      ["L","C","R"].forEach(dir=>{
        const zone=scene.add.rectangle(xs[dir],154,176,224,0xffffff,.001).setInteractive({useHandCursor:true});
        zone.on("pointerover",()=>zone.setFillStyle(accent,.16));
        zone.on("pointerout",()=>zone.setFillStyle(0xffffff,.001));
        zone.on("pointerup",()=>{if(!reveal&&typeof root._takePenalty==="function")root._takePenalty(dir);});
      });
      const keeperDir=reveal&&reveal.keeper||"C",shotDir=reveal&&reveal.shot||"C";
      const keeper=scene.add.container(xs[keeperDir],214);
      const shadow=scene.add.ellipse(0,55,88,14,0x0a1118,.38);
      const legs=scene.add.graphics();
      legs.lineStyle(11,0x101d28,1);
      legs.lineBetween(-10,28,-14,51);
      legs.lineBetween(10,28,14,51);
      const boots=scene.add.graphics();
      boots.fillStyle(0x101d28,1);
      boots.fillRoundedRect(-22,48,17,7,3);
      boots.fillRoundedRect(5,48,17,7,3);
      const shorts=scene.add.graphics();
      shorts.fillStyle(0x101d28,1);
      shorts.fillRoundedRect(-23,16,46,16,5);
      shorts.lineStyle(2,0xf3f5f4,.22);
      shorts.lineBetween(0,18,0,30);
      const arms=scene.add.graphics();
      arms.lineStyle(12,accent,1);
      arms.lineBetween(-16,-18,-51,-3);
      arms.lineBetween(16,-18,51,-3);
      arms.lineStyle(3,0xf3f5f4,.55);
      arms.lineBetween(-20,-16,-25,-14);
      arms.lineBetween(20,-16,25,-14);
      const gloves=scene.add.graphics();
      gloves.fillStyle(0xf3f5f4,1);
      gloves.fillCircle(-54,-2,8);
      gloves.fillCircle(54,-2,8);
      gloves.lineStyle(2,0x101d28,.28);
      gloves.strokeCircle(-54,-2,8);
      gloves.strokeCircle(54,-2,8);
      const torso=scene.add.graphics();
      torso.fillStyle(accent,1);
      torso.fillRoundedRect(-21,-31,42,50,9);
      torso.fillStyle(0xf3f5f4,.92);
      torso.fillRoundedRect(-6,-25,12,22,3);
      torso.lineStyle(3,0xf3f5f4,.78);
      torso.lineBetween(-7,-28,0,-22);
      torso.lineBetween(0,-22,7,-28);
      const neck=scene.add.rectangle(0,-34,10,8,0xd6a21f);
      const hair=scene.add.circle(0,-49,13,0x101d28,.95);
      const head=scene.add.circle(0,-46,11,0xd6a21f).setStrokeStyle(2,0x101d28,.72);
      const lowerBody=scene.add.container(0,0);
      lowerBody.add([legs,boots,shorts]);
      const upperBody=scene.add.container(0,0);
      upperBody.add([arms,gloves,torso,neck,hair,head]);
      keeper.add([shadow,lowerBody,upperBody]);
      const ball=scene.add.circle(reveal?xs[shotDir]:360,reveal?150:342,13,0xf3f5f4).setStrokeStyle(2,bg,1);
      scene.add.circle(reveal?xs[shotDir]-3:357,reveal?147:339,3,0x101d28,.78);
      if(reveal&&!reduced()){
        const diveSide=keeperDir==="L"?-1:keeperDir==="R"?1:0;
        ball.setPosition(360,342);
        keeper.setPosition(360,214);
        scene.tweens.add({targets:ball,x:xs[shotDir],y:reveal.type==="post"?48:142,duration:360,ease:"Cubic.easeOut"});
        scene.tweens.add({targets:keeper,x:xs[keeperDir],y:keeperDir==="C"?208:193,angle:diveSide*8,duration:350,ease:"Sine.easeOut"});
        scene.tweens.add({targets:upperBody,x:diveSide*6,y:-5,angle:diveSide*10,duration:320,ease:"Sine.easeOut"});
      }
      if(reveal&&reveal.type==="goal")scene.time.delayedCall(reduced()?0:350,()=>scene.cameras.main.flash(120,78,155,101));
      if(reveal&&reveal.type==="save")scene.time.delayedCall(reduced()?0:350,()=>scene.cameras.main.shake(reduced()?0:90,.006));
    }}));
  }
  root.CopaPhaserMoments={load,mountDraw,animateDraw,mountPenalty,destroyAll(){destroy(drawGame);destroy(penaltyGame);drawGame=null;penaltyGame=null;}};
})(window);
