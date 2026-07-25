/* Phaser is intentionally limited to the draw ceremony and penalty shootout. */
(function(root){
  "use strict";
  let loadPromise=null,drawGame=null,penaltyGame=null,drawBusy=false;
  const reduced=()=>document.body.classList.contains("reduced-motion")||root.matchMedia&&root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function load(){
    if(root.Phaser)return Promise.resolve(root.Phaser);
    if(loadPromise)return loadPromise;
    loadPromise=new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src="src/vendor/phaser.min.js?v=3.90.0";script.async=true;
      script.onload=()=>resolve(root.Phaser);script.onerror=()=>reject(new Error("phaser_load_failed"));document.head.appendChild(script);
    });
    return loadPromise;
  }
  function palette(){
    const style=getComputedStyle(document.documentElement);
    const read=(name,fallback)=>style.getPropertyValue(name).trim()||fallback;
    return{ink:read("--color-ink","#101D28"),paper:read("--bg-card","#F3F5F4"),primary:read("--color-primary","#F24A28"),slate:read("--color-slate","#68757C"),success:read("--status-success","#4E9B65")};
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
      g.fillStyle(Phaser.Display.Color.HexStringToColor(colors.ink).color,.92);g.fillRoundedRect(20,18,380,384,24);
      g.lineStyle(1,Phaser.Display.Color.HexStringToColor(colors.slate).color,.45);g.strokeRoundedRect(20,18,380,384,24);
      scene.add.text(40,38,`${copy.pot} ${next?next.pot:4}`,{fontFamily:"monospace",fontSize:"14px",fontStyle:"bold",color:colors.primary});
      scene.add.text(380,38,`${state.draw.revealIndex}/16`,{fontFamily:"monospace",fontSize:"14px",fontStyle:"bold",color:"#ffffff"}).setOrigin(1,0);
      const groupY=94;["A","B","C","D"].forEach((id,index)=>{
        const x=72+index*92,group=state.groups[index],count=revealed.filter(entry=>entry.groupId===id).length;
        const active=group&&group.teamIds.includes("player");
        g.fillStyle(Phaser.Display.Color.HexStringToColor(active?colors.primary:colors.slate).color,active?.28:.16);g.fillRoundedRect(x-35,groupY-18,70,56,12);
        scene.add.text(x,groupY,id,{fontFamily:"Inter, sans-serif",fontSize:"19px",fontStyle:"bold",color:"#ffffff"}).setOrigin(.5);
        scene.add.text(x,groupY+24,`${count}/4`,{fontFamily:"monospace",fontSize:"10px",color:"#BCC2C2"}).setOrigin(.5);
      });
      g.lineStyle(2,0xffffff,.14);g.lineBetween(50,172,370,172);
      const ball=scene.add.circle(210,255,67,Phaser.Display.Color.HexStringToColor(colors.primary).color).setStrokeStyle(3,0xffffff,.72).setInteractive({useHandCursor:true});
      scene.add.circle(187,228,11,0xffffff,.24);scene.add.text(210,252,next?String(next.pot):"✓",{fontFamily:"Inter, sans-serif",fontSize:"34px",fontStyle:"bold",color:"#ffffff"}).setOrigin(.5);
      const hint=scene.add.text(210,344,next?(copy.nextBall||"Next ball"):(copy.drawComplete||"Complete"),{fontFamily:"Inter, sans-serif",fontSize:"13px",color:"#E4E8E7"}).setOrigin(.5);
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
    scene.tweens.add({targets:actor.ball,y:185,scale:1.18,angle:12,duration:330,ease:"Back.easeOut",yoyo:true,hold:240,onComplete:done});
    return true;
  }
  async function mountPenalty(state,reveal){
    const parent=document.getElementById("phaserPenaltyStage");if(!parent)return;
    const Phaser=await load();if(!parent.isConnected)return;destroy(penaltyGame);const colors=palette(),phase=state.phase;if(parent.parentElement)parent.parentElement.classList.add("has-phaser");
    penaltyGame=new Phaser.Game(commonConfig(Phaser,parent,720,390,{create(){
      const scene=this,g=scene.add.graphics();
      g.fillStyle(Phaser.Display.Color.HexStringToColor(colors.ink).color,1);g.fillRect(0,0,720,390);
      g.fillStyle(0x1f6b45,1);g.fillRect(0,220,720,170);
      for(let y=220;y<390;y+=34){g.fillStyle(y%68===16?0x1f6b45:0x27343c,.45);g.fillRect(0,y,720,34);}
      g.lineStyle(8,0xf3f5f4,1);g.strokeRect(80,38,560,235);
      g.lineStyle(1,0xffffff,.18);for(let x=100;x<640;x+=36)g.lineBetween(x,42,x,270);for(let y=70;y<270;y+=32)g.lineBetween(84,y,636,y);
      const xs={L:172,C:360,R:548};
      ["L","C","R"].forEach(dir=>{
        const zone=scene.add.rectangle(xs[dir],155,176,225,0xffffff,.001).setInteractive({useHandCursor:true});
        zone.on("pointerover",()=>zone.setFillStyle(Phaser.Display.Color.HexStringToColor(colors.primary).color,.12));
        zone.on("pointerout",()=>zone.setFillStyle(0xffffff,.001));
        zone.on("pointerup",()=>{if(!reveal&&typeof root._takePenalty==="function")root._takePenalty(dir);});
      });
      const keeperDir=reveal&&reveal.keeper||"C",shotDir=reveal&&reveal.shot||"C";
      const keeper=scene.add.container(xs[keeperDir],210);
      const body=scene.add.rectangle(0,5,30,72,Phaser.Display.Color.HexStringToColor(colors.primary).color);const head=scene.add.circle(0,-40,14,0xd6a21f);const arms=g;
      keeper.add([body,head]);g.lineStyle(13,Phaser.Display.Color.HexStringToColor(colors.primary).color,1);g.lineBetween(xs[keeperDir]-42,190,xs[keeperDir]+42,190);g.lineBetween(xs[keeperDir]-12,238,xs[keeperDir]-38,270);g.lineBetween(xs[keeperDir]+12,238,xs[keeperDir]+38,270);
      const ball=scene.add.circle(reveal?xs[shotDir]:360,reveal?150:330,13,0xffffff).setStrokeStyle(2,0x101d28,1);
      if(reveal&&!reduced()){ball.setPosition(360,330);keeper.setX(360);scene.tweens.add({targets:ball,x:xs[shotDir],y:reveal.type==="post"?94:150,duration:340,ease:"Cubic.easeOut"});scene.tweens.add({targets:keeper,x:xs[keeperDir],y:keeperDir==="C"?210:198,angle:keeperDir==="L"?-18:keeperDir==="R"?18:0,duration:330,ease:"Sine.easeOut"});}
      if(reveal&&reveal.type==="goal")scene.time.delayedCall(reduced()?0:350,()=>scene.cameras.main.flash(120,78,155,101));
      if(reveal&&reveal.type==="save")scene.time.delayedCall(reduced()?0:350,()=>scene.cameras.main.shake(reduced()?0:90,.006));
      scene.add.text(360,365,phase==="shoot"?(root.LANG==="tr"?"ŞUT YÖNÜNÜ SEÇ":"CHOOSE SHOT"):(root.LANG==="tr"?"ATLAYACAĞIN YÖNÜ SEÇ":"CHOOSE DIVE"),{fontFamily:"monospace",fontSize:"13px",fontStyle:"bold",color:"#ffffff"}).setOrigin(.5);
    }}));
  }
  root.CopaPhaserMoments={load,mountDraw,animateDraw,mountPenalty,destroyAll(){destroy(drawGame);destroy(penaltyGame);drawGame=null;penaltyGame=null;}};
})(window);
