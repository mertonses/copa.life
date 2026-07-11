/* Cekirdek kadro matematigi: mevki grubu, uyumsuzluk cezasi, deger, efektif guc.
   balance/ ve cards/ modulleri bu katmanin USTUNE oturur (ters bagimliligi cozer). */
var GORD={GK:-1,DEF:0,MID:1,FWD:2};
var INJ=12;
const groupOf=pos=>pos==="GK"?"GK":["CB","LB","RB","WB"].includes(pos)?"DEF":["ST","LW","RW"].includes(pos)?"FWD":"MID";
function misPen(nat,slot){if(nat===slot)return 0;if(nat==="GK"||slot==="GK")return 22;return Math.abs(GORD[nat]-GORD[slot])===1?9:18;}
function _valueCurve(ov){
 const anchors=[[50,0.2],[55,0.3],[60,0.5],[65,1],[70,2],[75,4],[80,7],[85,12],[90,20],[95,32],[99,45]];
 ov=Math.max(45,Math.min(99,Number(ov)||60));
 for(let i=1;i<anchors.length;i++){
  if(ov<=anchors[i][0]){const a=anchors[i-1],b=anchors[i],t=(ov-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t;}
 }
 return anchors[anchors.length-1][1];
}
function playerMarketValue(ov,channel,roundNo){
 const mult={draft:1,free_agent:0.62,bench:0.45,loan:0}[channel||"draft"]??1;
 let v=_valueCurve(ov)*mult;
 if(channel==="free_agent")v*=1+Math.max(0,(roundNo||1)-1)*0.04;
 if(v<1)return Math.max(channel==="draft"?0.3:1,Math.round(v*10)/10);
 return Math.round(v*10)/10;
}
function valueOf(ov){return playerMarketValue(ov,"draft",1);}
function injPen(p){if(!p||!p.injured)return 0;return(p.injuryLevel||2)*6;}
function effOf(p){return p.ov-misPen(p.natG,groupOf(p.pos))+(p.train||0)+(p.dev||0)+(p.backupBoost||0)-injPen(p);}
