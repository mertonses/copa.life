/* Positional chemistry graph with line scores, adaptation and continuity. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.CopaChemistry=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const continuity={};
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const idOf=p=>String(p&&((p.id||p.name)||"")).trim();
  function lineOf(pos){
    const p=String(pos||"");
    if(/^(KL|STP|SLB|SĞB|SGB|LB|RB|CB|GK)/.test(p))return"defence";
    if(/^(SNT|SLA|SĞA|SGA|FW|ST|LW|RW)/.test(p))return"attack";
    return"midfield";
  }
  function countryAffinity(a,b,selectedCountry){
    const ac=a&&String(a.country||a.nation||""),bc=b&&String(b.country||b.nation||"");
    if(ac&&bc&&ac===bc)return 5;
    if(a&&b&&a.tr&&b.tr)return 5;
    if(selectedCountry==="TR"&&a&&b&&a.tr&&b.tr)return 5;
    return 0;
  }
  function roleFit(player,slot){
    if(!player||!slot)return 0;
    const wanted=String(slot[0]||""),actual=String(player.pos||"");
    if(wanted===actual)return 4;
    return lineOf(wanted)===lineOf(actual)?1:-4;
  }
  function pairKey(a,b){return[idOf(a),idOf(b)].sort().join("|");}
  function slotPoint(slot,index){
    const x=Number(slot&&slot[1]),y=Number(slot&&slot[2]);
    return{x:Number.isFinite(x)?x:20+(index%4)*20,y:Number.isFinite(y)?y:15+Math.floor(index/4)*25};
  }
  function calculate(players,slotDefs,context){
    const squad=Array.isArray(players)?players.filter(Boolean):[],slots=Array.isArray(slotDefs)?slotDefs:[],ctx=context||{};
    if(!squad.length)return{score:50,total:0,variance:0.9,parts:[],lines:{defence:50,midfield:50,attack:50},links:[]};
    const indexed=squad.map((player,index)=>({player,index,slot:slots[index]||[player.pos],point:slotPoint(slots[index],index),line:lineOf((slots[index]||[])[0]||player.pos)}));
    const links=[];
    indexed.forEach((a,index)=>{
      const nearest=indexed.filter((_,other)=>other!==index).map(b=>({b,d:Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y)})).sort((x,y)=>x.d-y.d).slice(0,2);
      nearest.forEach(({b,d})=>{
        if(a.index>b.index||d>48)return;
        let value=50;
        if(a.player.club&&a.player.club===b.player.club)value+=14;
        value+=countryAffinity(a.player,b.player,ctx.country);
        value+=roleFit(a.player,a.slot)+roleFit(b.player,b.slot);
        if(ctx.style==="gegen"&&(a.line==="midfield"||b.line==="midfield"))value+=2;
        if(ctx.style==="blok"&&(a.line==="defence"||b.line==="defence"))value+=2;
        const cap=Number(ctx.captainIdx);
        if(a.index===cap||b.index===cap)value+=4;
        const appearances=continuity[pairKey(a.player,b.player)]||0;
        value+=Math.min(8,appearances*2);
        const currentRound=Math.max(1,Number(ctx.round)||1);
        for(const player of [a.player,b.player]){
          const joined=Math.max(1,Number(player.joinedRound)||1);
          if(currentRound-joined<2)value-=currentRound===joined?7:3;
        }
        links.push({from:a.index,to:b.index,line:a.line===b.line?a.line:"midfield",score:Math.round(clamp(value,20,95)),reasons:{
          club:!!(a.player.club&&a.player.club===b.player.club),
          local:countryAffinity(a.player,b.player,ctx.country)>0,
          continuity:appearances
        }});
      });
    });
    const average=list=>list.length?list.reduce((sum,item)=>sum+item.score,0)/list.length:50;
    const lineScores={};
    ["defence","midfield","attack"].forEach(line=>{lineScores[line]=Math.round(average(links.filter(link=>link.line===line)));});
    const score=Math.round(clamp(average(links),0,100));
    const bonus=Math.round(clamp((score-50)/15,-3,4));
    const total=Math.round(clamp(bonus,-5,5));
    const variance=clamp(1.15-score/200,0.85,1.15);
    const parts=[
      ["LINK",ctx.lang==="tr"?"Bağlantı kalitesi":"Link quality",total],
      ["DEF",ctx.lang==="tr"?"Savunma hattı":"Defensive line",lineScores.defence],
      ["MID",ctx.lang==="tr"?"Orta saha":"Midfield",lineScores.midfield],
      ["ATK",ctx.lang==="tr"?"Hücum hattı":"Attack line",lineScores.attack]
    ];
    return{score,total,variance,parts,lines:lineScores,links};
  }
  function completeMatch(players,slotDefs){
    const squad=Array.isArray(players)?players.filter(Boolean):[],slots=Array.isArray(slotDefs)?slotDefs:[];
    squad.forEach((a,index)=>{
      squad.forEach((b,other)=>{
        if(other<=index)return;
        const ap=slotPoint(slots[index],index),bp=slotPoint(slots[other],other);
        if(Math.hypot(ap.x-bp.x,ap.y-bp.y)<=48){const key=pairKey(a,b);continuity[key]=Math.min(6,(continuity[key]||0)+1);}
      });
    });
  }
  function snapshot(){return{continuity:{...continuity}};}
  function restore(value){Object.keys(continuity).forEach(key=>delete continuity[key]);const source=value&&value.continuity||{};Object.keys(source).slice(0,80).forEach(key=>{continuity[key]=clamp(source[key],0,6);});}
  function reset(){restore(null);}
  return{calculate,completeMatch,snapshot,restore,reset,lineOf};
});
