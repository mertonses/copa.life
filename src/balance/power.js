/* Takim gucu, kimya ve bonus tavan hesaplari. */
function chemBonus(s){
 let total=0,parts=[],byc={};
 s.forEach(p=>{if(p.club)byc[p.club]=(byc[p.club]||0)+1;});
 let best="",bn=0,cp=0;
 Object.keys(byc).forEach(c=>{if(byc[c]>=2){cp+=Math.min(3,byc[c]-1);if(byc[c]>bn){bn=byc[c];best=c;}}});
 if(cp>0){total+=cp;parts.push(["🏟️",best+" x"+bn,cp]);}
 const yn=s.filter(p=>p.age<=21).length;
 if(yn>=2){const pt=yn>=4?2:1;total+=pt;parts.push(["🌱",yn+" "+L().chem.young,pt]);}
 const tn=s.filter(p=>p.tr).length;
 if(tn>=5){const leydiBonus=(typeof chairman!=="undefined"&&chairman&&chairman.id==="leydi")?1:0;const pt=Math.min(4,(tn>=8?3:2)+leydiBonus);total+=pt;parts.push(["TR",tn+" "+L().chem.tr,pt]);}
 if(s.filter(p=>p.age>=32).length>=2){total+=1;parts.push(["VET",L().chem.vet,1]);}
 return {total:Math.min(6,total),parts};
}
function powerBreakdown(r){
 const s=picksBySlot.filter(Boolean),avg=s.length?s.reduce((a,p)=>a+effOf(p),0)/s.length:0;
 const styleBonus=STYLES[style].eff(s);
 let cardBonus=0;cards.forEach(k=>cardBonus+=cardEff(k,s,r));
 const matchup=matchupBonus;
 const risk=riskPowerMod+tempPrimePenalty+shortCampPenalty-(r>=6?finalPenalty:0);
 let trait=0;s.forEach(p=>{if(p.trait&&TRAITS[p.trait])trait+=TRAITS[p.trait].pw();});
 const moral=talkMod.all+talkMod.def*Math.min(2,cnt(s,DEFP)/4)+talkMod.atk*Math.min(2,cnt(s,FWDP)/3);
 const wxBonus=typeof weatherPowerBonus==="function"?weatherPowerBonus():0;
 const cap=typeof captainIdx!=="undefined"&&captainIdx>=0?picksBySlot[captainIdx]:null;
 const capBonus=cap?(cap.injured?-3:(cap.trait==="lider"?3:cap.trait==="wonderkid"?2:cap.age>=32?2:1)):0;
 const cappedRaw=styleBonus+cardBonus+matchup+risk+trait;
 const rawBonus=cappedRaw+moral+wxBonus+capBonus,bonus=rawBonus,chem=Math.min(3,chemBonus(s).total);
 return {avg,styleBonus,cardBonus,matchup,risk,trait,moral,rawBonus,bonus,capLoss:0,chem,fan:0,power:Math.round(avg+bonus+chem)};
}
function squadPower(r){return powerBreakdown(r);}
