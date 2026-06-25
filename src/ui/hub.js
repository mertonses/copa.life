/* Hub ekrani: kadro/guc/kimya/koleksiyon/pazar render, kart aktif/pasif, oto-oyna. */
var collFilter="all";

function enterHub(){clearTimeout(autoTimer);$("ddbanner").classList.add("hidden");$("draft").classList.add("hidden");$("sim").classList.add("hidden");$("result").classList.add("hidden");$("hub").classList.remove("hidden");
  buildPitch($("hubPitch"));slots.forEach((s,i)=>{const p=picksBySlot[i];if(p)renderRoundel("h"+i,p);});
  opponent=bracket[round-1];talkUsed=false;talkMod={all:0,def:0,atk:0};lastTalkResult=null;
  if(typeof pickWeather==="function")pickWeather();
  if(budget<0&&round>1){spend(2,"interest");pushFeed("💸 "+(LANG==="tr"?"Borç faizi: -€2M":"Debt interest: -€2M"),"lose");}
  assignOppChar();genOppLineup();maybeInjure();processRiskCards();if(round>=3&&checkChairmanSack("risk"))return;newShopOffers();renderFixtures();renderHub();maybeDraftEvent();
  if(round===1&&captainIdx<0&&typeof pickCaptain==="function")setTimeout(pickCaptain,500);
  if(autoPlay&&round<6){autoTimer=setTimeout(()=>{if(autoPlay&&!$("hub").classList.contains("hidden"))playMatch();},2200);}}
function showPowerBreak(){const x=L(),sp=squadPower(round),sgn=v=>(v>=0?"+":"")+Math.round(v),waste=Math.max(0,Math.round(sp.capLoss));showModal(`<div class="bulletin"><div class="bhead"><span>${x.powHdr2}</span><span>${x.rounds[round-1]}</span></div><div class="pbreak"><div class="pbr"><span>${x.pbPlayers}</span><b>${Math.round(sp.avg)}</b></div><div class="pbr"><span>${x.ui.style}</span><b>${sgn(sp.styleBonus)}</b></div><div class="pbr"><span>${x.ui.cards}</span><b>${sgn(sp.cardBonus)}</b></div><div class="pbr"><span>${x.ui.comboMatchup}</span><b>${sgn(sp.combo+sp.matchup)}</b></div><div class="pbr"><span>${x.ui.riskDebt}</span><b>${sgn(sp.risk)}</b></div><div class="pbr"><span>${x.ui.traitMorale}</span><b>${sgn(sp.trait+sp.moral)}</b></div><div class="pbr"><span>${x.ui.bonusEfficiency}</span><b>${Math.round(sp.bonus)} / ${Math.round(sp.rawBonus)}</b></div>${waste?`<div class="pbr waste"><span>${LANG==="tr"?"Tavan yüzünden boşa giden bonus":"Bonus wasted by cap"}</span><b>-${waste}</b></div>`:""}<div class="pbr"><span>${x.pbChem}</span><b>+${sp.chem}</b></div><div class="pbr tot"><span>${x.pbTotal}</span><b>${sp.power}</b></div></div><div class="bact"><button class="btn btn-primary" onclick="closeModal()">${x.presClose}</button></div></div>`);}
function ctxLine(o){const x=L();if(o.hidden)return o.scoutHint||x.ctxHidden;if(o.trait==="wonderkid")return x.ctxWonder;if(o.ov>=84)return x.ctxStar;if(o.trait==="buyukmac")return x.ctxBig;if(o.trait==="lider")return x.ctxLead;if(o.age<=20)return x.ctxYoung;if(o.tr)return x.ctxLocal;if(o.age>=32)return x.ctxVet;if(o.ov>=78)return x.ctxForm;return x.ctxSolid;}
function clearRoundel(idx){const r=$("r"+idx);if(!r)return;r.className="roundel";r.innerHTML=`<span class="rp">${L().abbr[slots[idx][0]]||""}</span>`;}
function updateUndoBtn(){const b=$("undoBtn");if(b)b.classList.toggle("hidden",!(undoData&&!undoUsed));}
function undoPick(){if(!undoData||undoUsed)return;const u=undoData;picksBySlot[u.idx]=null;filled[u.idx]=false;remaining++;budget=u.budget;setBudget();if(u.name)usedNames.delete(u.name);clearRoundel(u.idx);undoUsed=true;undoData=null;updateUndoBtn();sfxStamp();loadRollStage();}
function toggleCardActive(k){if(invOf(k)<=0)return;if(hasCard(k)){cards=cards.filter(c=>c!==k);sfxStamp();renderHub();return;}if(cards.length>=activeCardSlots()){pushFeed((LANG==="tr"?"🃏 aktif kart slotu dolu":"🃏 active card slots full"),"ch");renderFeed();return;}cards.push(k);sfxStamp();renderHub();}
function cardArt(k){return "assets/cards/"+k+".png";}
function debtTaxAmount(){return 0;}
function kindLabel(k){const tr=LANG==="tr",m={power:["GÜÇ","POWER"],economy:["EKONOMİ","ECONOMY"],risk:["RİSK","RISK"],temporary:["GEÇİCİ","TEMP"],final:["FİNAL","FINAL"],defense:["SAVUNMA","DEFENSE"],squad:["KADRO","SQUAD"],injury:["SAKATLIK","INJURY"]}[cardKind(k)]||["GÜÇ","POWER"];return tr?m[0]:m[1];}
function modeLabel(k){if(isInstantCard(k))return LANG==="tr"?"ANINDA ÇALIŞIR":"INSTANT";if(!isProgressCard(k))return LANG==="tr"?"SÖZLEŞME":"CONTRACT";return LANG==="tr"?"GELİŞEN":"SCALING";}
function cardBadgeHTML(k){return `<span class="kindtag kind-${cardKind(k)}">${kindLabel(k)}</span><span class="modetag">${modeLabel(k)}</span>`;}
function simulateCardCopyPower(k){const before=squadPower(round).power,oldInv=cardInv[k]||0,oldTier=cardTier[k]||0,oldCards=cards.slice();if(isProgressCard(k)){cardInv[k]=Math.min(MAX_CARD_COPIES,oldInv+1);cardTier[k]=tierFromCopies(cardInv[k]);}else cardInv[k]=1;if(!oldCards.includes(k)&&!isInstantCard(k)&&cards.length<activeCardSlots())cards=oldCards.concat(k);const after=squadPower(round).power;cardInv[k]=oldInv;cardTier[k]=oldTier;cards=oldCards;return{before,after,delta:after-before};}
function simulateEquipPower(k){const before=squadPower(round).power,oldCards=cards.slice();if(!hasCard(k)&&cards.length<activeCardSlots())cards=oldCards.concat(k);const after=squadPower(round).power;cards=oldCards;return{before,after,delta:after-before};}
function shortCardText(k,activeList){const v=cardEff(k,activeList||picksBySlot.filter(Boolean),round),hint=conditionHint(k);if(v===0&&hint)return hint;return (LANG==="tr"?"Güç":"Power")+": "+(v>=0?"+":"")+v;}
function conditionHint(k){
 const s=picksBySlot.filter(Boolean),tr=LANG==="tr";
 const countPos=arr=>s.filter(p=>arr.includes(p.pos)).length;
 const map={
  yerli_blok:()=>`${tr?"Yerli":"Locals"}: ${s.filter(p=>p.tr).length}/4`,
  altyapi_plani:()=>`${tr?"U21":"U21"}: ${s.filter(p=>p.age<=21).length}/4`,
  tecrubeli_omurga:()=>`${tr?"32+":"32+"}: ${s.filter(p=>p.age>=32).length}/3`,
  cift_forvet:()=>`${tr?"Santrfor":"Strikers"}: ${s.filter(p=>p.pos==="ST").length}`,
  kanat_akini:()=>`${tr?"Kanat/bek":"Wing/WB"}: ${countPos(["LW","RW","LM","RM","WB"])}/4`,
  otobus:()=>`${tr?"Stoper":"CB"}: ${s.filter(p=>p.pos==="CB").length}`,
  kontra:()=>`${tr?"Forvet":"Forwards"}: ${cnt(s,FWDP)}`,
  anadolu:()=>`${tr?"70 altı":"Sub-70"}: ${s.filter(p=>p.ov<70).length}`,
  kaleci_kalesi:()=>{const gk=s.find(p=>p.pos==="GK");return `GK: ${gk?gk.ov+" OVR":(tr?"yok":"none")}`;},
  buyuk_mac:()=>`${tr?"Aktif tur":"Active round"}: ${round}/4`,
  ch_final:()=>`${tr?"Yarı/Final'de aktif":"Active in Semi/Final"}: ${round>=5?(tr?"hazır":"ready"):(tr?"tur 5'te":"from round 5")}`
 };
 return map[k]?map[k]():"";
}
function shopPreviewText(k,pv){
 const tr=LANG==="tr",b=budget,fp=finalPenalty,arrow=" → ";
 const money=(from,to)=>`${tr?"Kasa":"Funds"}: €${from}M${arrow}€${to}M`;
 const finalLoss=(from,to)=>`${tr?"Finalde eksi güç":"Final power loss"}: -${from}${arrow}-${to}`;
 const map={
  taksit_transfer:()=>money(b,b+10)+" · "+(tr?"2 tur -€4M":"2 rounds -€4M"),
  son_kredi:()=>b<-10?money(b,b+15)+" · "+(tr?"başkan eşiği sertleşir":"chairman limit tightens"):(tr?"Kasa -€10M altına düşerse +€15M":"Triggers below -€10M for +€15M"),
  kara_borsa:()=>tr?"Bedava kart · %30 ihtimal -€12M":"Free card · 30% chance -€12M",

  kriz:()=>finalLoss(fp,Math.max(0,fp-6)),
  kisa_kamp:()=>tr?"Bu maç +2 güç · sonra -1":"This match +2 power · then -1",
  gecici_prim:()=>tr?"Bu maç +8 güç · %35 sakatlık riski":"This match +8 power · 35% injury risk",
  kumarbaz:()=>money(b,b+16)+" · "+finalLoss(fp,Math.min(FINAL_DEBT_CAP,fp+8)),
  sahte_evrak:()=>`+6 ${tr?"güç":"power"} · `+finalLoss(fp,Math.min(FINAL_DEBT_CAP,fp+6)),
  final_provasi:()=>money(b,b-8)+" · "+(tr?"finalde +5 güç":"final +5 power"),
  kupaci_kadro:()=>`${tr?"Yarı final/final +3":"Semi/final +3"} · `+finalLoss(fp,Math.min(FINAL_DEBT_CAP,fp+4)),
  deplasman_kafilesi:()=>money(b,b-3)+" · "+(cardEff(k,picksBySlot.filter(Boolean),round)>0?"+4":"0"),
  sogukkanli_penaltici:()=>tr?"Beraberlikte tur şansı +%15":"Draw advance chance +15%",
  temiz_sayfa:()=>tr?"Sakatlık riski -%30":"Injury risk -30%",
  cilgin_basin:()=>tr?"€12M kazanmak ya da €8M kaybetmek (%65/%35)":"Win €12M or lose €8M (65%/35%)",
  ch_final:()=>`${tr?"YF: +3":"SF: +3"} · ${tr?"Final: +6":"Final: +6"}`,
  kaleci_kalesi:()=>{const gk=picksBySlot.filter(Boolean).find(p=>p.pos==="GK");return gk?`GK ${gk.ov} OVR → +${gk.ov>=80?4:gk.ov>=70?2:0}`:(tr?"Kaleci gerekli":"Need a GK");}
 };
 if(map[k])return map[k]();
 const hint=conditionHint(k);
 if(pv.delta===0&&hint)return hint+" · "+(tr?"koşul tamamlanınca güç verir":"gives power when condition is met");
 return `${tr?"Alırsan":"Buy"}: ${pv.before}${arrow}${pv.after}${pv.delta?` (${pv.delta>0?"+":""}${pv.delta})`:""}`;
}
function cardContractText(k){
  const tr=LANG==="tr",v=cardEff(k,picksBySlot.filter(Boolean),round),plus=(v>=0?"+":"")+v;
  const map={
    taraftar:tr?"Garanti güç "+plus+"; götürü yok.":"Guaranteed power "+plus+"; no downside.",
    genc:tr?"Bu tur güç "+plus+"; her yeni tur +1 büyür.":"Power this round "+plus+"; grows +1 each round.",
    kontra:tr?"Forvet başına +1; şu an "+plus+".":"Forward +1 each; now "+plus+".",
    otobus:tr?"Stoper başına +1; şu an "+plus+".":"Centre-back +1 each; now "+plus+".",
    anadolu:tr?"70 altı oyunculardan güç; şu an "+plus+".":"Sub-70 players add power; now "+plus+".",
    yildiz:tr?"En iyi oyuncudan +5; şu an "+plus+".":"Best player gives +5; now "+plus+".",
    veteran:tr?"Erken güç "+plus+"; ilerleyen turlarda azalır.":"Early power "+plus+"; fades later.",
    derbi:tr?"Bu tur +0; finalde +8 güç.":"Now +0; final +8 power.",
    taraftar:tr?"Garanti +2 güç; götürü yok.":"Guaranteed +2 power; no downside.",
    ch_momentum:tr?"Sabit +3 güç; götürü yok.":"Flat +3 power; no downside.",
    buyuk_mac:tr?"4. turdan itibaren +2 güç; şu an "+plus+".":"From round 4: +2 power; now "+plus+".",
    kaleci_kalesi:tr?"Kaleci OVR 80+: +4, 70-79: +2; şu an "+plus+".":"GK OVR 80+: +4, 70-79: +2; now "+plus+".",
    ch_final:tr?"Yarı finalde +3, finalde +6; şu an "+plus+".":"Semi-final +3, final +6; now "+plus+".",
    cilgin_basin:tr?"%65 ihtimal +€12M; %35 ihtimal -€8M; kart kaybolur.":"65% +€12M; 35% -€8M; card expires.",
    temiz_sayfa:tr?"Sakatlık riski -%30; güç +0.":"Injury risk -30%; power +0.",
    kisa_kamp:tr?"Bu maç +2; sonraki maç -1; kart kaybolur.":"This match +2; next match -1; card expires.",
    taksit_transfer:tr?"Hemen +€10M; sonraki 2 tur -€4M.":"Instant +€10M; next 2 rounds -€4M.",
    kara_borsa:tr?"Bedava 1 kart; %40 ihtimal -€12M.":"Free 1 card; 40% chance -€12M.",
    sahte_evrak:tr?"Güç +6; finalde -6 güç.":"Power +6; final -6 power.",
    son_kredi:tr?"Kasa -€10M altındaysa +€15M; başkan eşiği 5M sertleşir.":"If below -€10M: +€15M; chairman limit tightens 5M.",
    altyapi_plani:tr?"21 yaş altı başına +1; max +4, şu an "+plus+".":"U21 +1 each; max +4, now "+plus+".",
    tecrubeli_omurga:tr?"32+ yaş başına +1; max +3, şu an "+plus+".":"32+ +1 each; max +3, now "+plus+".",
    yerli_blok:tr?"4+ yerli varsa +3; şu an "+plus+".":"4+ locals gives +3; now "+plus+".",
    kanat_akini:tr?"Kanat/bek başına +1; max +4, şu an "+plus+".":"Wing/wingback +1; max +4, now "+plus+".",
    cift_forvet:tr?"1 ST: +1, 2+ ST: +3; şu an "+plus+".":"1 ST: +1, 2+ ST: +3; now "+plus+".",
    deplasman_kafilesi:tr?"Güçlü rakibe +4; hemen -€3M, şu an "+plus+".":"Vs stronger opponent +4; instant -€3M, now "+plus+".",
    sosyal_medya:tr?"Underdog +3; favori -2, şu an "+plus+".":"Underdog +3; favourite -2, now "+plus+".",
    final_provasi:tr?"Şimdi -€8M; finalde +5.":"Now -€8M; final +5.",
    kupaci_kadro:tr?"Yarı final/final +3; finalde -4 güç.":"Semi/final +3; final -4 power.",
    sogukkanli_penaltici:tr?"Beraberlikte tur geçme şansı +%15; güç +0.":"Draw advance chance +15%; power +0.",
    son_dans:tr?"Finalde +4 güç.":"Final +4 power.",
    kumarbaz:tr?"Hemen +€16M; finalde -8 güç; her tur %20 ihtimal -€24M.":"Instant +€16M; final -8 power; 20% each round -€24M.",
    gecici_prim:tr?"Bu maç +8; sonra %35 sakatlık, sıradaki maç -2, kart kaybolur.":"This match +8; then 35% injury, next match -2, card expires.",
    doping:tr?"+8 güç; her tur %35 ihtimal -€15M ceza.":"+8 power; 35% each round -€15M fine.",
    kriz:tr?"Finaldeki eksi gücü en fazla 6 azaltır.":"Reduces final power loss by up to 6."
  };
  return map[k]||((tr?"Net güç ":"Net power ")+plus+".");
}
function renderCollectionFilters(){const el=$("collectionFilters");if(!el)return;const tr=LANG==="tr",items=[["all",tr?"Tümü":"All"],["open",tr?"Açık":"Open"],["active",tr?"Aktif":"Active"]];if(collFilter==="near")collFilter="all";el.innerHTML=items.map(([id,label])=>`<button class="${collFilter===id?"on":""}" onclick="collFilter='${id}';renderCollection()">${label}</button>`).join("");}
function collectionPass(k){const c=invOf(k),active=hasCard(k);if(collFilter==="open")return c>0;if(collFilter==="active")return active;return true;}
function renderCollection(){const grid=$("collectionGrid");if(!grid)return;const x=L(),s=picksBySlot.filter(Boolean),cap=activeCardSlots();let owned=0,shown=0;grid.innerHTML="";renderCollectionFilters();allCardKeys().forEach(k=>{const cd=x.cards[k];if(!cd||isInstantCard(k))return;const c=invOf(k),open=c>0,active=hasCard(k),cat=CATMAP[k]||"gorev";if(open)owned++;if(!collectionPass(k))return;shown++;const pv=open?simulateEquipPower(k):null,locked=!open;const equipLine=active?(LANG==="tr"?"aktif · çıkarmak için tıkla":"active · click to remove"):(open?(cards.length<cap?(x.ui.clickEquip):(x.ui.slotFull)):(x.ui.unlockFrom));const preview=open&&!active&&cards.length<cap?`<div class="powerpreview">${LANG==="tr"?"Takarsan":"Equip"}: ${pv.before} → ${pv.after}</div>`:"";const d=document.createElement("div");d.className="ccard tier-"+tierOf(k)+" cat-"+cat+(locked?" locked":"")+(active?" active":"");d.title=cd.n+" · "+kindLabel(k)+" · "+modeLabel(k)+"\n"+cardContractText(k)+"\n"+progressText(k)+" · "+shortCardText(k,s);d.innerHTML=`<div class="cardart" style="background-image:url('${cardArt(k)}')"><span>${cd.i}</span></div><div class="ctop"><span>${open?cd.n:(x.ui.lockedCard)}</span></div><div class="ctier">${open?cardBadgeHTML(k):(x.ui.lockedCaps)}</div><div class="cardshort">${open?shortCardText(k,s):(LANG==="tr"?"Pazardan açılır":"Unlock in market")}</div>${preview}<div class="cprog">${progressBarHTML(k)}</div><div class="cact">${equipLine}</div>`;if(open)d.onclick=()=>toggleCardActive(k);grid.appendChild(d);});const cc=$("collCount");if(cc)cc.textContent=" "+owned+"/"+allCardKeys().filter(k=>!isInstantCard(k)).length+(shown!==allCardKeys().length?" · "+shown:"");}
function renderDebtWarning(){const el=$("debtWarn");if(!el)return;const tr=LANG==="tr",lim=chairmanSackLimit();let msg="",cls="";if(budget<lim){msg=tr?"Yönetim alarmda: borç sınırı aşıldı.":"Board alarm: debt limit exceeded.";cls="danger";}else if(round>=3&&budget<=lim+3){msg=tr?"Koltuğun sallanıyor: yönetimin eşiği €"+lim+"M.":"Your job is at risk: board limit €"+lim+"M.";cls="danger";}else if(budget<=-10){msg=tr?"Borç büyüdü: yönetim baskısı arttı, bazı pazar teklifleri kapanabilir.":"Debt is growing: board pressure rose, some offers may close.";cls="warn";}else if(budget<0){msg=tr?"Kasa ekside: bu kadro krediyle dönüyor.":"Funds below zero: this squad is running on credit.";cls="soft";}el.className="debtwarn "+cls+(msg?"":" hidden");el.textContent=msg;}
function renderHub(){const x=L(),sp=squadPower(round),s=picksBySlot.filter(Boolean);
  $("roundtag").textContent=x.rounds[round-1]+" · "+x.vsword+" "+opponent.name;
  {const wm=$("vsMid");if(wm){const we=currentWeather?currentWeather.e:"";const wn=currentWeather?(LANG==="tr"?currentWeather.tr:currentWeather.en):"";const bases=[8000,14000,22000,34000,52000,75000];const b=bases[Math.min(5,round-1)];const aud=Math.round(b*(0.65+Math.min(0.33,Math.max(0,(sp.power-(opponent?opponent.power:0))/100)))/1000)*1000;wm.innerHTML=`<div class="vs-vs">VS</div>${we?`<div class="vsweather">${we} ${wn}</div>`:"<div class='vsweather'></div>"}<div class="vsaud">👥 ${(aud/1000).toFixed(0)}K ${LANG==="tr"?"seyirci":"fans"}</div><div class="vsround">${x.rounds[round-1]}</div>`;}}
  {const mkShield=(bg,border,fg,lbl)=>`<svg viewBox="0 0 44 52" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><path d="M22 2L41 9L41 29Q41 44 22 50Q3 44 3 29L3 9Z" fill="${bg}" stroke="${border}" stroke-width="2"/><text x="22" y="31" text-anchor="middle" font-family="monospace" font-size="14" font-weight="900" fill="${fg}">${lbl}</text></svg>`;const yc2=$("youCrest");if(yc2){const lbl=(teamName||"XI").replace(/\s+/g,"").slice(0,2).toUpperCase();yc2.innerHTML=mkShield(kit.bg,kit.sec||kit.fg,kit.fg,lbl);}const oc2=$("oppCrest");if(oc2&&opponent){const _lm={ENG:CLUB_LOGOS_EN,ES:CLUB_LOGOS_ES,IT:CLUB_LOGOS_IT,DE:CLUB_LOGOS_DE};const _logoMap=_lm[selectedCountry]||CLUB_LOGOS;const logo=typeof _logoMap!=="undefined"&&_logoMap[opponent.name];if(logo){oc2.innerHTML=`<img src="${logo}" class="club-logo" alt="${opponent.name}">`;}else{const lbl=opponent.name.replace(/\s+/g,"").slice(0,2).toUpperCase();oc2.innerHTML=mkShield("#8e2d20","#bf4329","#f5f0e8",lbl);}}}
  const _pwCol=v=>v>=90?"#16c96b":v>=80?"#4ade80":v>=70?"#eab308":v>=60?"#f97316":"#ef4444";
  {const el=$("youPw");if(el){el.textContent=sp.power;el.style.color=_pwCol(sp.power);}}
  $("youNm").textContent=teamName||"XI";$("oppNm").textContent=opponent.name;
  {const el=$("oppPw");if(el){el.textContent=opponent.power;el.style.color=_pwCol(opponent.power);}}
  $("youLbl").textContent=x.youLbl;$("oppLbl").textContent=x.oppLbl;$("shopLbl").textContent=x.shopLbl;$("feedHdr").innerHTML=`<span class="tclive">●</span> <span>${x.feedHdr}</span>`;$("powHdr").textContent=x.powHdr;$("powV").textContent=sp.power;powerHist[round-1]=sp.power;
  {const sk=sparkPow();$("powHint").textContent=sk||x.powHint;}$("chemHdr").textContent=x.chem.hdr;
  {const cb=chemBonus(s);$("chemV").textContent="+"+Math.min(3,cb.total);$("chemList").textContent=cb.parts.length?cb.parts.map(p=>p[0]+p[2]).join(" "):x.chem.none;const hp=$("hubPitch");if(hp){hp.classList.toggle("chem-high",cb.total>=3);hp.classList.toggle("chem-low",cb.total<0);}
   const ct=$("chemTile");if(ct){const cv=cb.total;const cbg=cv<0?"#ef4444":cv===0?"#f97316":cv<=1?"#eab308":cv<=2?"#4ade80":"#16c96b";const cfg=cv<=1&&cv>=0?"var(--ink)":"#fff";ct.style.background=cbg;[ct.querySelector(".mh"),ct.querySelector(".mv"),ct.querySelector(".ms")].forEach(el=>{if(el)el.style.color=cfg;});}}
  {const pv=sp.power;const pt=$("powTile");if(pt){const pbg=pv>=90?"#16c96b":pv>=80?"#4ade80":pv>=70?"#eab308":pv>=60?"#f97316":"#ef4444";const pfg=(pv>=70&&pv<80)||(pv>=80&&pv<90)?"var(--ink)":"#fff";pt.style.background=pbg;[pt.querySelector(".mh"),pt.querySelector(".mv"),pt.querySelector(".ms")].forEach(el=>{if(el)el.style.color=pfg;});}}
  {const os=$("oppStars"),oc=$("oppChar"),ys=$("youStars"),yc=$("youChar");if(os)os.textContent="★".repeat(starsOf(opponent.power));if(oc&&oppChar)oc.innerHTML=oppChar.e+" "+oppChar.l;if(ys)ys.textContent="★".repeat(starsOf(sp.power));if(yc){yc.innerHTML=x.styles[style].i+" "+x.styles[style].n;}}
  {const chName=x.chair[chairman.id].n;const src=typeof chairSrc==="function"?chairSrc(chairman.id):`assets/chairs/${chairman.id}.png`;const pb=$("presBtn");pb.innerHTML=`<img src="${src}" class="presbtnphoto" alt="" onerror="this.style.display='none'">`;pb.disabled=false;pb.title=chName;const locked=round<4;pb.style.opacity=locked?"0.42":"1";pb.onclick=locked?(typeof presBtnLockedClick==="function"?presBtnLockedClick:null):openPresident;const pl=$("presLabel");if(pl)pl.textContent=x.ui.seeChair;}$("scoutBtn").title=x.scout;
  $("playBtn").innerHTML=round>=6?x.playFinal:x.play;$("autoLbl").textContent=autoPlay?x.autoOn:x.autoOff;$("autoTog").classList.toggle("on",autoPlay);
  $("talkBtn").classList.toggle("hidden",talkUsed);$("talkBtn").innerHTML=x.talk;renderDebtWarning();renderInjbar();
  const cr=$("cardrow");cr.innerHTML="";const e0=document.createElement("div");e0.className="card style";e0.innerHTML=`${x.styles[style].i} <b>${x.styles[style].n}</b>`;cr.appendChild(e0);
  {let activePower=0,activeRisk=0;cards.forEach(k=>{activePower+=cardEff(k,s,round);if(["risk","temporary","final"].includes(cardKind(k)))activeRisk+=cardEff(k,s,round);});const sum=document.createElement("div");sum.className="card buildsum";sum.innerHTML=`<b>${LANG==="tr"?"Aktif kart":"Active cards"}</b><span class="copy">${LANG==="tr"?"Güç":"Power"} ${activePower>=0?"+":""}${activePower} · ${LANG==="tr"?"Finalde eksi":"Final loss"} -${finalPenalty}</span>`;cr.appendChild(sum);}
  cards.forEach(k=>{const d=document.createElement("div");d.className="card tier-"+tierOf(k)+" cat-"+(CATMAP[k]||"gorev")+(isProgressCard(k)&&tierFromCopies(invOf(k)+1)>tierOf(k)?" ready":"");const cd=x.cards[k],cv=cardEff(k,s,round);d.onclick=()=>toggleCardActive(k);d.innerHTML=`${cd.i} <b>${cd.n}</b><span class="tier">${kindLabel(k)}</span> <span class="v">${cv>=0?"+":""}${cv}</span><span class="copy">${progressText(k)} · ${x.ui.activeRemove}</span>`;cr.appendChild(d);});
  activeCombos().forEach(c=>{const d=document.createElement("div");d.className="card combo";d.innerHTML=`✨ <b>${x.combos[c.k]||L().combos[c.k]||c.k}</b> <span class="v">+${c.b}</span>`;cr.appendChild(d);});
  renderCollection();
  const sc=$("shopcards");sc.innerHTML="";shopOffers.forEach(k=>{const cd=x.cards[k],pr=cardPrice(k),cant=!canAffordCost(pr),near=isProgressCard(k)&&tierFromCopies(invOf(k)+1)>tierOf(k),cat=CATMAP[k]||"gorev",pv=simulateCardCopyPower(k);const d=document.createElement("div");d.className="shopcard tier-"+tierOf(k)+" cat-"+cat+(cant?" cant":"")+(near?" upgrade":"");d.title=cd.n+"\n"+cardContractText(k);d.innerHTML=`<div class="cardart shopart" style="background-image:url('${cardArt(k)}')"><span>${cd.i}</span></div><div class="sm"><div class="st">${cd.n}</div><div class="cat">${cardBadgeHTML(k)}</div><div class="sd">${shortCardText(k,s)}</div><div class="cardcontract">${cardContractText(k)}</div><div class="powerpreview">${shopPreviewText(k,pv)}</div>${progressBarHTML(k)}</div><div class="sp">€${pr}M<small>${near?(LANG==="tr"?"UPGRADE":"UP"):""}</small></div>`;if(!cant)d.onclick=()=>confirmBuyCard(k);sc.appendChild(d);});
  if(!shopOffers.length){const e=document.createElement("div");e.className="shopcard owned";e.innerHTML=`<div class="sm"><div class="sd">— ${x.owned} —</div></div>`;sc.appendChild(e);}
  setBudget();renderFixtures();renderFeed();}
function buyCard(k){const pr=cardPrice(k);if(!canAffordCost(pr))return;spend(pr,"spent");recordDebt();addCardCopy(k,{silent:true});shopOffers=shopOffers.filter(o=>o!==k);sfxStamp();sfxCoin();pushFeed("💰 <b>"+L().cards[k].n+"</b> "+L().feedBuy+" (-€"+pr+"M)","buy");renderHub();}
function renderChallenges(){}
function toggleAuto(){autoPlay=!autoPlay;const x=L();$("autoTog").classList.toggle("on",autoPlay);$("autoLbl").textContent=autoPlay?x.autoOn:x.autoOff;if(autoPlay&&round<6&&!$("hub").classList.contains("hidden")){clearTimeout(autoTimer);autoTimer=setTimeout(()=>{if(autoPlay&&!$("hub").classList.contains("hidden"))playMatch();},2000);}else clearTimeout(autoTimer);}
