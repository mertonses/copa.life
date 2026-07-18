/* Cekirdek kadro matematigi: mevki grubu, uyumsuzluk cezasi, deger, efektif guc.
   balance/ ve cards/ modulleri bu katmanin USTUNE oturur (ters bagimliligi cozer). */
var GORD={GK:-1,DEF:0,MID:1,FWD:2};
var INJ=12;
const groupOf=pos=>pos==="GK"?"GK":["CB","LB","RB","WB"].includes(pos)?"DEF":["ST","LW","RW"].includes(pos)?"FWD":"MID";
const _POSITION_CODES=new Set(["GK","CB","LB","RB","WB","DM","CM","LM","RM","AM","LW","RW","ST"]);
function _positionCode(pos){return _POSITION_CODES.has(pos)?pos:"";}
function _groupMisPen(nat,slot){
 if(nat===slot)return 0;
 if(nat==="GK"||slot==="GK")return 22;
 return Math.abs(GORD[nat]-GORD[slot])===1?9:18;
}
/* Exact role compatibility. Zero means the player is in their natural slot;
   low values are adjacent football roles, while 9+ is a real compromise. */
const _POSITION_PENALTIES={
 "LB|WB":2,"RB|WB":2,
 "LB|RB":4,
 "CB|DM":4,
 "DM|CM":2,"CM|AM":3,"DM|AM":6,
 "LB|LM":3,"RB|RM":3,"WB|LM":3,"WB|RM":3,
 "CM|LM":3,"CM|RM":3,"LM|RM":4,
 "LM|AM":4,"RM|AM":4,
 "LW|LM":2,"RW|RM":2,"LW|RW":3,
 "LW|AM":3,"RW|AM":3,
 "LW|WB":5,"RW|WB":5,
 "ST|AM":4,"ST|LW":4,"ST|RW":4,
 "CB|LB":6,"CB|RB":6,"LB|DM":6,"RB|DM":6,"CB|CM":6,
 "CM|LW":6,"CM|RW":6,"DM|LM":6,"DM|RM":6
};
function positionPenalty(naturalPos,targetPos,naturalGroup){
 const nat=_positionCode(naturalPos),slot=_positionCode(targetPos);
 if(!nat||!slot){
  const natGroup=Object.prototype.hasOwnProperty.call(GORD,naturalGroup)?naturalGroup:groupOf(naturalPos);
  const slotGroup=Object.prototype.hasOwnProperty.call(GORD,targetPos)?targetPos:groupOf(targetPos);
  return _groupMisPen(natGroup,slotGroup);
 }
 if(nat===slot)return 0;
 if(nat==="GK"||slot==="GK")return 22;
 const explicit=_POSITION_PENALTIES[`${nat}|${slot}`]??_POSITION_PENALTIES[`${slot}|${nat}`];
 if(explicit!==undefined)return explicit;
 return _groupMisPen(groupOf(nat),groupOf(slot));
}
function positionPenaltyFor(player,targetPos){
 if(!player)return 0;
 return positionPenalty(player.natPos||player.pos,targetPos,player.natG);
}
/* Kept public for older callers. Exact codes now receive the richer mapping. */
function misPen(nat,slot){return positionPenalty(nat,slot,nat);}
function _valueCurve(ov){
 const anchors=[[50,0.2],[55,0.3],[60,0.5],[65,1],[70,2],[75,4],[80,7],[85,12],[90,20],[95,32],[99,45]];
 ov=Math.max(45,Math.min(99,Number(ov)||60));
 for(let i=1;i<anchors.length;i++){
  if(ov<=anchors[i][0]){const a=anchors[i-1],b=anchors[i],t=(ov-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
 }
 return anchors[anchors.length-1][1];
}
function freeAgentRoundFloor(roundNo){
 const floors=[2,3,4,5,6];
 const index=Math.max(0,Math.min(floors.length-1,(Number(roundNo)||1)-1));
 return floors[index];
}
function freeAgentPriceBand(ov){
 const power=Number(ov)||60;
 if(power<=66)return[2,4];
 if(power<=72)return[4,7];
 if(power<=78)return[7,12];
 if(power<=84)return[12,18];
 return[18,24];
}
function clampFreeAgentFee(ov,roundNo,value){
 const band=freeAgentPriceBand(ov);
 const floor=Math.max(band[0],freeAgentRoundFloor(roundNo));
 return Math.min(24,band[1],Math.max(floor,Math.round(Number(value)||0)));
}
function playerMarketValue(ov,channel,roundNo){
 const mult={draft:1,free_agent:0.90,bench:0.45,loan:0}[channel||"draft"]??1;
 let v=_valueCurve(ov)*mult;
 if(channel==="free_agent"){
  v*=1+Math.max(0,(roundNo||1)-1)*0.10;
  v=Math.max(v,freeAgentRoundFloor(roundNo));
 }
 if(v<1)return Math.max(channel==="draft"?0.3:1,Math.round(v*10)/10);
 return Math.round(v*10)/10;
}
function valueOf(ov){return playerMarketValue(ov,"draft",1);}
function injPen(p){if(!p||!p.injured)return 0;return(p.injuryLevel||2)*6;}
function effOf(p){return p.ov-positionPenaltyFor(p,p.pos)+(p.train||0)+(p.dev||0)+(p.backupBoost||0)-injPen(p);}
