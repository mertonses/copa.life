/* Cekirdek kadro matematigi: mevki grubu, uyumsuzluk cezasi, deger, efektif guc.
   balance/ ve cards/ modulleri bu katmanin USTUNE oturur (ters bagimliligi cozer). */
var GORD={GK:-1,DEF:0,MID:1,FWD:2};
var INJ=12;
const groupOf=pos=>pos==="GK"?"GK":["CB","LB","RB","WB"].includes(pos)?"DEF":["ST","LW","RW"].includes(pos)?"FWD":"MID";
function misPen(nat,slot){if(nat===slot)return 0;if(nat==="GK"||slot==="GK")return 22;return Math.abs(GORD[nat]-GORD[slot])===1?9:18;}
function valueOf(ov){const v=0.25*Math.exp(0.205*(ov-60));if(v<1)return Math.max(0.3,Math.round(v*10)/10);if(v<20)return Math.round(v*10)/10;return Math.round(v);}
function effOf(p){return p.ov-misPen(p.natG,groupOf(p.pos))+(p.train||0)+(p.dev||0)+(p.backupBoost||0)-(p.injured?INJ:0);}
