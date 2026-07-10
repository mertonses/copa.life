/* Kart tanimlari — v3 (35 kart, 7 silindi) */
var CARDDEFS={
 /* GÜÇ — GÜÇ */
 taraftar:{price:4,kind:"power",mode:"contract",
   eff:(s,r)=>variantOf("taraftar")===1?10:5},
 genc:{price:6,kind:"power",mode:"scaling",
   eff:(s,r)=>Math.min(6,r)},
 ch_momentum:{price:4,kind:"power",mode:"scaling",
   eff:(s,r)=>{const b=r<=2?2:r<=4?3:4;return variantOf("ch_momentum")===1?b*2:b;}},
 kontra:{price:4,kind:"power",mode:"instant",
   eff:(s,r)=>0},
 buyuk_mac:{price:6,kind:"power",mode:"instant",
   eff:(s,r)=>0},
 yildiz:{price:8,kind:"power",mode:"instant",
   eff:(s,r)=>0},
 /* SAVUNMA */
 otobus:{price:6,kind:"defense",mode:"instant",
   eff:(s,r)=>0},
 kaleci_kalesi:{price:4,kind:"risk",mode:"instant",
   eff:(s,r)=>0},
 /* KADRO */
 anadolu:{price:4,kind:"squad",mode:"scaling",
   eff:(s,r)=>{const v=variantOf("anadolu");const starters=(s||[]).filter(Boolean);const sub70=starters.filter(p=>p.ov<70).length;return Math.min(v===1?5:3,sub70);}},
 altyapi_plani:{price:4,kind:"squad",mode:"scaling",
   eff:(s,r)=>{const n=s.filter(p=>p&&p.age<=23).length;return Math.min(variantOf("altyapi_plani")===1?6:4,n*(variantOf("altyapi_plani")===1?2:1));}},
 tecrubeli_omurga:{price:6,kind:"squad",mode:"scaling",
   eff:(s,r)=>{const n=s.filter(p=>p&&p.age>=32).length;return Math.min(variantOf("tecrubeli_omurga")===1?16:8,n*(variantOf("tecrubeli_omurga")===1?4:2));}},
 yerli_blok:{price:6,kind:"squad",mode:"scaling",
   eff:(s,r)=>{const n=s.filter(p=>p&&p.tr).length;return Math.min(5,n*(variantOf("yerli_blok")===1?2:1));}},
 /* HÜCUM */
kanat_akini:{price:6,kind:"power",mode:"scaling",
   eff:(s,r)=>{const wide=["LW","RW","LM","RM","WB","LB","RB","SLA","SĞA","SGA","SLB","SĞB","SGB","SLK","SĞK","SGK"];const n=s.filter(p=>p&&wide.includes(p.pos)).length;const v=variantOf("kanat_akini")===1;return Math.min(v?6:4,n*(v?2:1));}},
 cift_forvet:{price:6,kind:"power",mode:"scaling",
   eff:(s,r)=>{const n=s.filter(p=>p&&p.pos==="ST").length;return Math.min(variantOf("cift_forvet")===1?8:4,n*(variantOf("cift_forvet")===1?4:2));}},
 /* FİNAL */
 derbi:{price:10,kind:"final",mode:"scaling",
   eff:(s,r)=>{const v=variantOf("derbi");const g=v===1?[6,10,14]:[2,4,8];return r>=6?g[2]:r>=5?g[1]:r>=4?g[0]:0;}},
 final_provasi:{price:6,kind:"final",mode:"scaling",
   eff:(s,r)=>r>=6?(variantOf("final_provasi")===1?12:6):0},
 son_dans:{price:6,kind:"final",mode:"scaling",
   eff:(s,r)=>{if(r<6)return 0;const v=variantOf("son_dans");const healthy=typeof injuredIdx!=="undefined"&&injuredIdx<0;return v===1?(healthy?14:-8):(healthy?8:2);}},
 /* EKONOMİ */
 taksit_transfer:{price:0,kind:"economy",mode:"instant",eff:(s,r)=>0},
 son_kredi:{price:0,kind:"economy",mode:"instant",eff:(s,r)=>0},
 /* RİSK */
 kara_borsa:{price:5,kind:"risk",mode:"instant",eff:(s,r)=>0},
 sahte_evrak:{price:6,kind:"risk",mode:"contract",
   eff:(s,r)=>variantOf("sahte_evrak")===1?10:6},
 deplasman_kafilesi:{price:6,kind:"risk",mode:"instant",eff:(s,r)=>0},
 kumarbaz:{price:5,kind:"economy",mode:"contract",eff:(s,r)=>0},
 gecici_prim:{price:6,kind:"temporary",mode:"instant",eff:(s,r)=>0},
 kisa_kamp:{price:4,kind:"temporary",mode:"instant",eff:(s,r)=>0},
 doping:{price:5,kind:"risk",mode:"contract",
   eff:(s,r)=>variantOf("doping")===1?10:6},
 kriz:{price:15,kind:"final",mode:"instant",eff:(s,r)=>0},
 kurban_belli:{price:6,kind:"risk",mode:"instant",eff:(s,r)=>0},
 primler_yatinca:{price:3,kind:"power",mode:"instant",eff:(s,r)=>0},
 vur_igneyi:{price:4,kind:"risk",mode:"instant",eff:(s,r)=>0},
 bu_adam:{price:6,kind:"power",mode:"instant",eff:(s,r)=>0},
 gec_gec:{price:5,kind:"defense",mode:"scaling",
   eff:(s,r)=>{const avg=s.length?Math.round(s.reduce((a,p)=>a+effOf(p),0)/s.length):0;const stronger=typeof opponent!=="undefined"&&opponent&&opponent.power>avg;const base=stronger?5:2;return variantOf("gec_gec")===1?base+2:base;}},
 nasip_kismet:{price:4,kind:"risk",mode:"instant",eff:(s,r)=>0},
 yildiz_krizi:{price:4,kind:"power",mode:"instant",eff:(s,r)=>0},
 kasiga_para:{price:4,kind:"power",mode:"instant",eff:(s,r)=>0}
};
var CARDKEYS=Object.keys(CARDDEFS);
function cardKind(k){return (CARDDEFS[k]&&CARDDEFS[k].kind)||"power";}
function cardMode(k){return (CARDDEFS[k]&&CARDDEFS[k].mode)||"scaling";}
function isInstantCard(k){return cardMode(k)==="instant";}
function isProgressCard(k){return cardMode(k)==="scaling";}
