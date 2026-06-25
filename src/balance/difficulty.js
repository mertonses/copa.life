/* Risk/odul draftlari ve tur ici zorluk carpanlari. */
function maybeDraftEvent(){if(round<2||round>5||eventSeen[round]||runEnded)return;eventSeen[round]=1;if(rand()>0.75)return;setTimeout(showDraftEvent,260);}
function showDraftEvent(){
 if($("hub").classList.contains("hidden"))return;const tr=LANG==="tr";const opts=[
  {i:"\u26a1",n:tr?"Y\u00fcksek Tempo":"High Tempo",d:tr?"Bu tur +6 g\u00fc\u00e7, -\u20ac8M, sonraki tur -2 g\u00fc\u00e7":"This round +6 power, -\u20ac8M, next round -2 power",go:()=>{riskPowerMod+=6;spend(8,"spent");talkMod.all-=2;pushFeed("\u26a1 +6 / -\u20ac8 / -2","pres");}},
  {i:"\u{1f4bc}",n:tr?"Kumarbaz Sponsor":"Gambler Sponsor",d:tr?"+\u20ac14M, bu tur -2 g\u00fc\u00e7, %25 ihtimal -\u20ac10M, finalde -4 g\u00fc\u00e7":"+\u20ac14M, this round -2 power, 25% chance -\u20ac10M, final -4 power",go:()=>{earn(14,"earned");riskPowerMod-=2;finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+4);let msg="\u{1f4bc} +\u20ac14 / -2 / final -"+finalPenalty;if(rand()<0.25){spend(10,"spent");msg+=" / -\u20ac10";}pushFeed(msg,"buy");}},
  {i:"\u{1f3b2}",n:tr?"Finale Yaz":"Write It To Final",d:tr?"\u015eimdi +\u20ac8M ve +3 g\u00fc\u00e7, finalde -8 g\u00fc\u00e7":"Now +\u20ac8M and +3 power, final -8 power",go:()=>{earn(8,"earned");riskPowerMod+=3;finalPenalty=Math.min(FINAL_DEBT_CAP,finalPenalty+8);pushFeed("\u{1f3b2} "+(tr?"finalde eksi g\u00fc\u00e7":"final power loss")+" -"+finalPenalty,"pres");}},
  {i:"\u{1fa79}",n:tr?"Sakat Oynat":"Play Through Pain",d:tr?"Bu tur +5 g\u00fc\u00e7, maç sonu %35 sakatlık riski":"This round +5 power, 35% post-match injury risk",go:()=>{riskPowerMod+=5;if(rand()<0.35){const p=applyRandomInjury(1);if(p)pushFeed("\u{1fa79} <b>"+shortName(p)+"</b> "+(tr?"zorlamadan sakatland\u0131":"was injured by the gamble"),"lose");}pushFeed("\u{1fa79} +5","pres");}}
 ];
 let h="<div><div class=\"kithdr\">"+(tr?"Risk/\u00d6d\u00fcl Draft\u0131":"Risk/Reward Draft")+"</div><div class=\"kitsub\">"+(tr?"G\u00fc\u00e7l\u00fc \u00f6d\u00fcl, ger\u00e7ek bedel. Gerek yoksa pas ge\u00e7.":"Strong reward, real cost. Skip if you do not need it.")+"</div><div class=\"stylelist\">";
 opts.forEach((o,i)=>{h+="<div class=\"stylebtn\" onclick=\"pickDraftEvent("+i+")\"><div class=\"ssi\">"+o.i+"</div><div class=\"ssm\"><div class=\"sst\">"+o.n+"</div><div class=\"ssd\">"+o.d+"</div></div></div>";});
 h+="<div class=\"stylebtn\" onclick=\"pickDraftEvent(-1)\"><div class=\"ssi\">\u270b</div><div class=\"ssm\"><div class=\"sst\">"+(tr?"Pas ge\u00e7":"Skip")+"</div><div class=\"ssd\">"+(tr?"Risk alma, mevcut planla devam et.":"Take no risk and continue.")+"</div></div></div></div></div>";
 window._draftEvents=opts;showModal(h);
}
function pickDraftEvent(i){if(i<0){closeModal();return;}const o=window._draftEvents&&window._draftEvents[i];if(!o)return;closeModal();o.go();sfxStamp();setBudget();renderHub();}
