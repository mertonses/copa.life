/* Kart tanimlari. */
var CARDDEFS={
 genc:{price:6,rar:"bronze",kind:"power",mode:"scaling",eff:(s,r)=>r},
 kontra:{price:8,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>cnt(s,FWDP)},
 otobus:{price:8,rar:"silver",kind:"defense",mode:"scaling",eff:(s,r)=>s.filter(p=>p.pos==="CB").length},
 anadolu:{price:7,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(2,Math.floor(s.filter(p=>p.ov<70).length/2))},
 yildiz:{price:12,rar:"gold",kind:"power",mode:"scaling",eff:(s,r)=>s.length?5:0},
 veteran:{price:11,rar:"gold",kind:"squad",mode:"scaling",eff:(s,r)=>Math.max(0,4-1*Math.max(0,r-3))},
 derbi:{price:13,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?8:0},
 temiz_sayfa:{price:7,rar:"bronze",kind:"injury",mode:"scaling",eff:(s,r)=>0},
 kisa_kamp:{price:7,rar:"risk",kind:"temporary",mode:"instant",eff:(s,r)=>0},
 yedek_guvence:{price:9,rar:"silver",kind:"injury",mode:"scaling",eff:(s,r)=>0},
 taksit_transfer:{price:8,rar:"risk",kind:"economy",mode:"instant",eff:(s,r)=>0},

 kara_borsa:{price:7,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 sahte_evrak:{price:10,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>6},
 son_kredi:{price:7,rar:"risk",kind:"economy",mode:"instant",eff:(s,r)=>0},
 altyapi_plani:{price:9,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(4,s.filter(p=>p.age<=21).length)},
 tecrubeli_omurga:{price:8,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(3,s.filter(p=>p.age>=32).length)},
 yerli_blok:{price:9,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>s.filter(p=>p.tr).length>=6?3:0},
 kanat_akini:{price:9,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>Math.min(4,s.filter(p=>["LW","RW","LM","RM","WB"].includes(p.pos)).length)},
 cift_forvet:{price:9,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>s.filter(p=>p.pos==="ST").length>=2?3:0},
 deplasman_kafilesi:{price:8,rar:"risk",kind:"risk",mode:"scaling",eff:(s,r)=>opponent&&opponent.power>squadBasePower()?4:0},
 sosyal_medya:{price:7,rar:"risk",kind:"risk",mode:"scaling",eff:(s,r)=>opponent&&opponent.power>squadBasePower()?3:-2},
 sessiz_kamp:{price:7,rar:"risk",kind:"temporary",mode:"instant",eff:(s,r)=>0},
 final_provasi:{price:11,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?5:0},
 kupaci_kadro:{price:11,rar:"risk",kind:"final",mode:"scaling",eff:(s,r)=>r>=5?3:0},
 sogukkanli_penaltici:{price:9,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>0},
 son_dans:{price:10,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6&&s.some(p=>p.age>=32)?6:0},
 kumarbaz:{price:9,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>0},
 gecici_prim:{price:6,rar:"risk",kind:"temporary",mode:"instant",eff:(s,r)=>0},
 doping:{price:10,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>10},
 kriz:{price:8,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0}};
var CARDKEYS=Object.keys(CARDDEFS);
function cardKind(k){return (CARDDEFS[k]&&CARDDEFS[k].kind)||"power";}
function cardMode(k){return (CARDDEFS[k]&&CARDDEFS[k].mode)||"scaling";}
function isInstantCard(k){return cardMode(k)==="instant";}
function isProgressCard(k){return cardMode(k)==="scaling";}
