/* Kart tanimlari. */
var CARDDEFS={
 /* GÜÇ */
 taraftar:{price:6,rar:"bronze",kind:"power",mode:"scaling",eff:(s,r)=>Math.min(r+1,4)},
 genc:{price:6,rar:"bronze",kind:"power",mode:"scaling",eff:(s,r)=>Math.min(6,r)},
 ch_momentum:{price:6,rar:"bronze",kind:"power",mode:"scaling",eff:(s,r)=>r<=2?2:r<=4?3:4},
 kontra:{price:8,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>Math.max(1,cnt(s,FWDP))},
 buyuk_mac:{price:9,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>r>=3?3:1},
 yildiz:{price:12,rar:"gold",kind:"power",mode:"scaling",eff:(s,r)=>{const ov=s.length?s.reduce((a,p)=>Math.max(a,p.ov),0):0;return ov>=90?7:ov>=85?6:ov>=80?5:2;}},
 /* SAVUNMA */
 otobus:{price:8,rar:"silver",kind:"defense",mode:"scaling",eff:(s,r)=>s.filter(p=>p.pos==="CB").length},
 kaleci_kalesi:{price:9,rar:"silver",kind:"defense",mode:"scaling",eff:(s,r)=>{const gk=s.find(p=>p.pos==="GK");return gk&&gk.ov>=75?4:gk&&gk.ov>=68?2:gk?1:0;}},
 /* KADRO */
 anadolu:{price:7,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(3,s.filter(p=>p.ov<70).length)},
 altyapi_plani:{price:9,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(4,s.filter(p=>p.age<=23).length)},
 tecrubeli_omurga:{price:8,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>Math.min(3,s.filter(p=>p.age>=32).length)},
 veteran:{price:11,rar:"gold",kind:"squad",mode:"scaling",eff:(s,r)=>Math.max(2,4-Math.max(0,r-4))},
 yerli_blok:{price:9,rar:"silver",kind:"squad",mode:"scaling",eff:(s,r)=>{const t=s.filter(p=>p.tr).length;return t>=6?5:t>=4?3:t>=2?1:0;}},
 /* HÜCUM */
 kanat_akini:{price:9,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>Math.min(4,s.filter(p=>["LW","RW","LM","RM","WB"].includes(p.pos)).length)},
 cift_forvet:{price:9,rar:"silver",kind:"power",mode:"scaling",eff:(s,r)=>{const st=s.filter(p=>p.pos==="ST").length;return st>=2?3:st>=1?1:0;}},
 /* FİNAL */
 derbi:{price:13,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?8:r>=5?4:r>=4?2:0},
 ch_final:{price:11,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?6:r>=5?3:0},
 final_provasi:{price:11,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?5:r>=5?3:0},
 kupaci_kadro:{price:11,rar:"risk",kind:"final",mode:"scaling",eff:(s,r)=>r>=5?4:0},
 son_dans:{price:10,rar:"gold",kind:"final",mode:"scaling",eff:(s,r)=>r>=6?(typeof injuredIdx!=="undefined"&&injuredIdx===-1?6:4):0},
 /* EKONOMİ */
 taksit_transfer:{price:8,rar:"risk",kind:"economy",mode:"instant",eff:(s,r)=>0},
 son_kredi:{price:9,rar:"risk",kind:"economy",mode:"instant",eff:(s,r)=>0},
 /* RİSK */
 kara_borsa:{price:7,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 sahte_evrak:{price:10,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>6},
 deplasman_kafilesi:{price:8,rar:"risk",kind:"risk",mode:"scaling",eff:(s,r)=>opponent&&opponent.power>squadBasePower()?4:1},
 sosyal_medya:{price:7,rar:"risk",kind:"risk",mode:"scaling",eff:(s,r)=>{const under=opponent&&opponent.power>squadBasePower();return under?3:-2;}},
 kumarbaz:{price:9,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>0},
 gecici_prim:{price:8,rar:"risk",kind:"temporary",mode:"instant",eff:(s,r)=>0},
 kisa_kamp:{price:7,rar:"risk",kind:"temporary",mode:"instant",eff:(s,r)=>0},
 doping:{price:10,rar:"risk",kind:"risk",mode:"contract",eff:(s,r)=>8},
 kriz:{price:8,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 cilgin_basin:{price:7,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 /* YENİ KARTLAR */
 kurban_belli:{price:8,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 primler_yatinca:{price:9,rar:"risk",kind:"power",mode:"instant",eff:(s,r)=>0},
 kaynasma:{price:7,rar:"bronze",kind:"power",mode:"scaling",eff:(s,r)=>{const avg=s.length?s.reduce((a,p)=>a+p.age,0)/s.length:30;return avg<=29?5:3;}},
 vur_igneyi:{price:6,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 bu_adam:{price:12,rar:"gold",kind:"power",mode:"instant",eff:(s,r)=>0},
 gec_gec:{price:5,rar:"risk",kind:"defense",mode:"scaling",eff:(s,r)=>opponent&&opponent.power>squadBasePower()?5:2},
 eski_kurt:{price:9,rar:"risk",kind:"power",mode:"instant",eff:(s,r)=>0},
 nasip_kismet:{price:8,rar:"risk",kind:"risk",mode:"instant",eff:(s,r)=>0},
 yildiz_krizi:{price:6,rar:"risk",kind:"power",mode:"instant",eff:(s,r)=>0},
 kasiga_para:{price:9,rar:"silver",kind:"power",mode:"instant",eff:(s,r)=>0}};
var CARDKEYS=Object.keys(CARDDEFS);
function cardKind(k){return (CARDDEFS[k]&&CARDDEFS[k].kind)||"power";}
function cardMode(k){return (CARDDEFS[k]&&CARDDEFS[k].mode)||"scaling";}
function isInstantCard(k){return cardMode(k)==="instant";}
function isProgressCard(k){return cardMode(k)==="scaling";}
