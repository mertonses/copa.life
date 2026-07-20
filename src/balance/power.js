/* Takim gucu, kimya ve kart bonusu hesaplari. */
/* Kimya: aynı kulüp / uyruk (yerli) / genç çekirdek / veteran pozitif; dağınık kadro negatif.
   Kimya aralığı -5 ile +5'tir. Kartların kendi tavanları korunur; final kartı toplamı ayrıca tavanlanmaz. */
function chemBonus(s){
 let total=0,parts=[],byc={};
 s.forEach(p=>{if(p.club)byc[p.club]=(byc[p.club]||0)+1;});
 let best="",bn=0,cp=0;
 Object.keys(byc).forEach(c=>{if(byc[c]>=2){cp+=Math.min(4,byc[c]-1);if(byc[c]>bn){bn=byc[c];best=c;}}});
 if(cp>0){total+=cp;parts.push(["🏟️",best+" x"+bn,cp]);}
 const yn=s.filter(p=>p.age<=21).length;
 if(yn>=2){const pt=yn>=4?2:1;total+=pt;parts.push(["🌱",yn+" "+L().chem.young,pt]);}
 const tn=s.filter(p=>p.tr).length;
 if(tn>=5){const pt=tn>=8?3:2;total+=pt;parts.push(["TR",tn+" "+L().chem.tr,pt]);}
 if(s.filter(p=>p.age>=32).length>=2){total+=1;parts.push(["VET",L().chem.vet,1]);}
 /* Negatif kimya: neredeyse herkes farklı kulüpten → dağınık kadro cezası */
 const filled=s.length,distinctClubs=Object.keys(byc).length;
 if(filled>=9&&distinctClubs>=filled-1){
  const pen=distinctClubs>=filled?-2:-1;total+=pen;
  parts.push(["⚠",(L().chem&&L().chem.scattered?L().chem.scattered:(LANG==="tr"?"Dağınık kadro":"Scattered squad"))+" ("+distinctClubs+")",pen]);
 }
 /* Ortak yerel çekirdek yoksa saha içi iletişim zayıflar. */
 if(filled>=9&&tn<=2){
  total-=2;
  parts.push(["TR",(L().chem&&L().chem.localGap?L().chem.localGap:(LANG==="tr"?"Yerli çekirdek yok":"No local core"))+" ("+tn+")",-2]);
 }
 /* Tecrübeli oyuncu veya lider özelliği olmayan genç kadro baskıda dağılır. */
 const hasLeader=s.some(p=>p&&(p.trait==="lider"||p.age>=29));
 if(filled>=9&&!hasLeader){
  total-=1;
  parts.push(["VET",L().chem&&L().chem.leaderGap?L().chem.leaderGap:(LANG==="tr"?"Saha içi lider yok":"No on-pitch leader"),-1]);
 }
 const spent=Math.max(0,Number(typeof cardChemDebt!=="undefined"?cardChemDebt:0)||0);
 if(spent>0){total-=spent;parts.push(["CARD",LANG==="tr"?"Kart bedeli":"Card cost",-spent]);}
 return {total:Math.max(-5,Math.min(5,total)),parts};
}
function powerBreakdown(r){
 const s=picksBySlot.filter(Boolean),captainPenalty=typeof captainDecisionPlayerPenaltyForRound==="function"?captainDecisionPlayerPenaltyForRound(r,s):0,avg=s.length?(s.reduce((a,p)=>a+effOf(p),0)+captainPenalty)/s.length:0;
 const starImpact=Math.min(2.5,s.map(effOf).sort((a,b)=>b-a).slice(0,2).reduce((sum,value)=>sum+Math.max(0,value-86)*.16,0));
 const styleBonus=STYLES[style].eff(s);
 const loanBonus=s.reduce((sum,p)=>sum+(p&&p.loan?Math.max(0,Number(p.teamPowerBoost)||0):0),0);
 let cardBonus=0,finalCardRaw=0;
 cards.forEach(k=>{const v=cardEff(k,s,r);if(r>=6&&typeof cardKind==="function"&&cardKind(k)==="final")finalCardRaw+=v;else cardBonus+=v;});
 const finalCardApplied=r>=6?finalCardRaw:0;
 cardBonus+=finalCardApplied;
 const promiseBonus=typeof matchPromisePowerForRound==="function"?matchPromisePowerForRound(r):0;
 cardBonus+=promiseBonus;
 const matchup=matchupBonus;
 const risk=riskPowerMod+tempPrimePenalty+shortCampPenalty-(r>=6?finalPenalty:0);
 let trait=0;s.forEach(p=>{if(p.trait&&TRAITS[p.trait])trait+=TRAITS[p.trait].pw();});
 const moral=talkMod.all+talkMod.def*Math.min(2,cnt(s,DEFP)/4)+talkMod.atk*Math.min(2,cnt(s,FWDP)/3);
 const wxBonus=typeof weatherPowerBonus==="function"?weatherPowerBonus():0;
 const cap=typeof _currentCaptainPlayer==="function"?_currentCaptainPlayer():(typeof captainIdx!=="undefined"&&captainIdx>=0?picksBySlot[captainIdx]:null);
 const capBonus=cap?(cap.injured?-3:(cap.trait==="lider"?3:cap.trait==="wonderkid"?2:cap.age>=32?2:1)):0;
 const uncappedRaw=styleBonus+cardBonus+loanBonus+matchup+risk+trait;
 const captainChem=typeof captainDecisionChemistryForRound==="function"?captainDecisionChemistryForRound(r):0;
 const rawBonus=uncappedRaw+moral+wxBonus+capBonus,bonus=rawBonus,chem=Math.max(-5,Math.min(5,chemBonus(s).total+captainChem));
 return {avg,starImpact,styleBonus,cardBonus,loanBonus,promiseBonus,captainPenalty,captainChem,finalCardRaw,finalCardApplied,finalCardOverflow:0,matchup,risk,trait,moral,rawBonus,bonus,capLoss:0,chem,fan:0,power:Math.round(avg+starImpact+bonus+chem)};
}
function squadPower(r){return powerBreakdown(r);}
