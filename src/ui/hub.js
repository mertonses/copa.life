/* Hub ekrani: kadro/guc/kimya/koleksiyon/pazar render, kart aktif/pasif, oto-oyna. */
var collFilter="all";

function _breakdownValueClass(raw,neutralBase=false){
  const s=String(raw).trim();
  const n=Number(s.replace(/[+€M\s]/g,"").replace("/","."));
  if(neutralBase||s.includes("/"))return "bd-value-neutral";
  if(!Number.isFinite(n)||n===0)return "bd-value-neutral";
  return n>0?"bd-value-positive":"bd-value-negative";
}
function _breakdownRow(label,value,{icon="",tone="",total=false,neutral=false}={}){
  const cls=total?" bd-total":"";
  const toneCls=tone||_breakdownValueClass(value,neutral);
  return `<div class="bd-row${cls}"><span class="bd-label">${icon?`<span class="bd-icon">${icon}</span>`:""}${label}</span><b class="bd-value ${toneCls}">${value}</b></div>`;
}
function _breakdownModal(title,meta,rows,{label=""}={}){
  const close=LT("Kapat","Close","Cerrar","Schließen","Chiudi");
  const html=`<div class="breakdown-modal"><div class="bd-head"><div class="bd-title">${title}</div><div class="bd-head-actions"><span class="bd-meta">${meta||""}</span><button class="bd-close" onclick="closeModal()" aria-label="${close}">&times;</button></div></div><div class="bd-list">${rows.join("")}</div></div>`;
  showModal(html,{dismissOnOverlay:true,label:label||title});
}

function _fixHubVisibleText(){
  const fh=$("feedHdr");if(fh){const label=(typeof L==="function"&&L().feedHdr)||"GELİŞMELER";fh.innerHTML=`<span class="tclive">●</span> <span>${label}</span>`;}
  const ph=$("powHdr");if(ph)ph.textContent=L().powHdr;
  const tv=typeof chairTrust!=="undefined"?chairTrust:3;
  const trustV=$("trustV"),trustHint=$("trustHint");
  if(trustV)trustV.textContent="●".repeat(tv)+"○".repeat(Math.max(0,3-tv));
  if(trustHint)trustHint.textContent=tv>=3?LT("güvende","secure","seguro","sicher","sicuro"):tv>=2?LT("dengede","steady","estable","stabil","stabile"):tv>=1?LT("kırılgan","fragile","frágil","fragil","fragile"):LT("tehlikede","at risk","en riesgo","gefährdet","a rischio");
}

function _applyGhostOpponent(ghost,expectedRound,baseline){
  if(!ghost||runEnded||round!==expectedRound||opponent!==baseline)return;
  if(window._ghostOpponentUsed||(window.GhostClubs&&window.GhostClubs.hasOpponentUsed&&window.GhostClubs.hasOpponentUsed()))return;
  opponent=ghost;
  if(Array.isArray(bracket))bracket[round-1]=ghost;
  const profile=ghost.ghostProfile||{};
  if(Array.isArray(profile.lineup)&&profile.lineup.length){
    oppLineup=profile.lineup.slice(0,11).map((p,i)=>{
      const pos=(p&&p.pos)||"OS";
      return {name:(p&&p.name)||("Player "+(i+1)),ov:Number(p&&(p.ov==null?p.power:p.ov))||ghost.power,pos,grp:typeof groupOf==="function"?groupOf(pos):"CM",side:"C",injured:!!(p&&p.injured)};
    });
    oppXI=oppLineup.map(p=>p.name);
  }
  window._ghostSeenIds=(window._ghostSeenIds||[]).concat(ghost.ghostId).slice(-16);
  window._ghostOpponentUsed=true;
  if(window.GhostClubs&&typeof window.GhostClubs.markOpponentUsed==="function")window.GhostClubs.markOpponentUsed(ghost.ghostId);
  if(Array.isArray(fixtures)&&fixtures[round-1])fixtures[round-1].opp=ghost.name;
  renderFixtures();renderHub();
  if(typeof playUiSample==="function")playUiSample("ghost",.34,1500);
}
function _maybeGhostOpponent(){
  const baseline=opponent,expectedRound=round;
  if(!window.GhostClubs||!window.GhostClubs.enabled()||window._ghostOpponentUsed||(window.GhostClubs.hasOpponentUsed&&window.GhostClubs.hasOpponentUsed()))return;
  const own=typeof squadPower==="function"?squadPower(round):{power:70};
  window.GhostClubs.findOpponent({round:expectedRound,power:own.power,seed:typeof seedNum!=="undefined"?seedNum:Date.now(),excluded:window._ghostSeenIds||[]}).then(ghost=>_applyGhostOpponent(ghost,expectedRound,baseline)).catch(()=>{});
}
function enterHub(restoring=false){if(window._wantFinal){window._wantFinal=false;round=6;opponent=bracket[round-1];setTimeout(()=>playMatch(true),300);return;}if(window._wantSeedResult&&typeof _runSeedResultCheat==="function"){const kind=window._wantSeedResult;window._wantSeedResult="";_runSeedResultCheat(kind);return;}if(window.CopaRunState){const moved=window.CopaRunState.transition("hub",{reason:restoring?"restore":"draft_or_reward_complete"});if(!moved.ok){window.CopaDiagnostics&&window.CopaDiagnostics.capture("state_guard",moved.errors.join(","),"");return;}}clearTimeout(autoTimer);if($("intro"))$("intro").classList.add("hidden");$("ddbanner").classList.add("hidden");$("draft").classList.add("hidden");$("sim").classList.add("hidden");$("result").classList.add("hidden");$("hub").classList.remove("hidden");
  const _tcl=$("tcLines");if(_tcl)_tcl.innerHTML="";
  buildPitch($("hubPitch"));slots.forEach((s,i)=>{const p=picksBySlot[i];if(p)renderRoundel("h"+i,p);});
  opponent=opponent||bracket[round-1]||bracket[0]||{name:"Opponent",power:60};
  if(restoring){
    if(!currentWeather&&typeof pickWeather==="function")pickWeather();
    if(!oppChar&&typeof assignOppChar==="function")assignOppChar();
    if((!Array.isArray(oppLineup)||!oppLineup.length)&&typeof genOppLineup==="function")genOppLineup();
    renderFixtures();renderHub();return;
  }
  opponent=bracket[round-1];talkUsed=false;talkMod={all:0,def:0,atk:0};lastTalkResult=null;cardsBoughtThisTurn=0;freeAgentBoughtThisTurn=0;shopRerolledThisTurn=0;
  if(typeof pickWeather==="function")pickWeather();
  if(typeof applyRiskDraftCarryovers==="function")applyRiskDraftCarryovers();
  /* Borç güven cezası */
  if(budget<-10&&chairTrust>0&&round>1){chairTrust--;pushFeed("📉 "+(LANG==="tr"?"Başkan güveni azaldı ("+chairTrust+"/3)":"Chairman confidence drops ("+chairTrust+"/3)"),"lose");}
  /* Adalet: oyuncu milliyetini ikinci kez saymak yerine toplam kimyayı ödüllendirir. */
if(chairman.id==="leydi"&&round>1){const _chem=chemBonus(picksBySlot.filter(Boolean)).total;if(_chem>=3){riskPowerMod+=1;pushFeed(`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em"><path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v3a9 9 0 0 1 -9 9a9 9 0 0 1 -9 -9v-3z"/><path d="M9 12l2 2l4 -4"/></svg> `+(LANG==="tr"?"Diplomat: uyumlu kadro — bu maç +1 güç":"Diplomat: cohesive squad — +1 power"),"pres");}else if(_chem<0){riskPowerMod-=1;pushFeed(`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em"><path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v3a9 9 0 0 1 -9 9a9 9 0 0 1 -9 -9v-3z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg> `+(LANG==="tr"?"Diplomat: dağınık kadro — bu maç -1 güç":"Diplomat: disjointed squad — -1 power"),"lose");}}
  assignOppChar();genOppLineup();maybeInjure();processRiskCards();if(round>=3&&checkChairmanSack("risk"))return;
  /* Kırmızı kart cezası: askıya alınan oyuncuyu bildir */
  {const _sp=picksBySlot.find(p=>p&&p.suspended);if(_sp){const _sn=typeof shortName==="function"?shortName(_sp):(_sp.name||"?");const _tr=LANG==="tr";setTimeout(()=>{showModal(`<div class="scoutmodal suspended-modal"><h4>🟥 ${_tr?"Cezalı Oyuncu":"Player Suspended"}</h4><p><b>${_sn}</b> ${_tr?"kırmızı kartı nedeniyle bu maçta oynayamaz. Kadrodan çıkarmanız gerekiyor.":"received a red card and cannot play this match. You must remove them from the lineup."}</p><div class="bact"><button class="btn btn-primary" onclick="closeModal()">${_tr?"Anladım":"Got it"}</button></div></div>`);},400);}}
  /* Sansasyoncu spotlight — her iki turda bir */
  if(chairman.id==="sansasyoncu"&&round<6&&round%2===1){setTimeout(showSansSpotlightPicker,700);}
  if(chairman.id==="torpilci"&&round===3&&!eventSeen.torpil_guaranteed){eventSeen.torpil_guaranteed=1;setTimeout(_queueGuaranteedTorpil,760);}
  newShopOffers();_genFreeAgents();renderFixtures();renderHub();_maybeGhostOpponent();maybeDraftEvent();
  if(round===1&&!hasSelectedCaptain()&&typeof pickCaptain==="function")setTimeout(pickCaptain,500);
  if(chairman.id==="cilgin"&&round<6)setTimeout(showKaosOffer,900);
}
function _queueGuaranteedTorpil(){
  const modal=$("modal");
  if(modal&&!modal.classList.contains("hidden")){setTimeout(_queueGuaranteedTorpil,450);return;}
  const oc=typeof POUT!=="undefined"&&POUT.find(o=>o.id==="nephew");
  if(oc&&typeof _torpilNephewChoice==="function")_torpilNephewChoice(oc);
}
const _SPOT_COLORS=["#e6ad2e","#4ade80","#60a5fa","#f472b6","#fb923c","#a78bfa"];
function showSansSpotlightPicker(){
  const modalEl=$("modal");
  if(modalEl&&!modalEl.classList.contains("hidden")){setTimeout(showSansSpotlightPicker,500);return;}
  const tr=LANG==="tr", choices=picksBySlot.map((p,i)=>({p,i})).filter(({p})=>p&&!p.injured);
  if(!choices.length)return;
  const boost=chairTrust>=3?6:chairTrust<=0?3:5;
  const boostColor=boost>=4?"#4ade80":boost>=3?"#e6ad2e":"#fb923c";
  const ratingColor=v=>v>=90?"#15803d":v>=80?"#4ade80":v>=70?"#eab308":v>=60?"#f97316":"#ef4444";
  const cards=choices.map(({p,i},ci)=>{
    const col=_SPOT_COLORS[ci%_SPOT_COLORS.length];
    const before=effOf(p),after=before+boost;
    const pos=(L().abbr[p.pos]||p.pos);
    const label=`${surOf(p)} ${pos}: ${before} -> ${after}. ${tr?"Sakatlan\u0131rsa pazar pahal\u0131la\u015f\u0131r.":"Injury inflates the market."}`;
    return `<button class="spot-card" type="button" role="option" aria-selected="false" aria-label="${label}" data-cidx="${ci}" style="--spot-col:${col}" onclick="closeModal();_pickSansSpotlight(${i},${boost},this)" onmouseenter="_spotHover(this,${ci})" title="${surOf(p)}">
      <span class="spot-card-pos">${pos}</span>
      <span class="spot-card-name">${surOf(p)}</span>
      <span class="spot-card-power"><span class="spot-card-before">${before}</span><span class="spot-arrow">\u2192</span><b style="color:${ratingColor(after)}">${after}</b></span>
    </button>`;
  }).join("");
  showModal(`<div class="spotlight-modal">
    <div class="spotlight-header">
      <div class="spotlight-title">${tr?"SPOTLIGHT OYUNCUSU":"SPOTLIGHT PLAYER"}</div>
      <div class="spotlight-sub">${tr?`Bu ma\u00e7 <b style="color:${boostColor}">+${boost} g\u00fc\u00e7</b> \u00b7 Sakatlan\u0131rsa pazar pahal\u0131la\u015f\u0131r`:`This match <b style="color:${boostColor}">+${boost} power</b> \u00b7 Injury inflates the market`}</div>
    </div>
    <div class="spot-grid" role="listbox" aria-label="${tr?"Spotlight oyuncusu se\u00e7imi":"Spotlight player selection"}">${cards}</div>
  </div>`);
  if(window.PlayerProfiles)document.querySelectorAll(".spot-card").forEach((card,ci)=>{const item=choices[ci];if(item&&item.p)PlayerProfiles.bind(card,item.p,{delayCoarseAction:true});});
}
function _spotHover(el,ci){
  return;
}
function _pickSansSpotlight(idx,pow,cardEl){
  sansSpotlightIdx=idx;riskPowerMod+=pow;
  if(cardEl)cardEl.setAttribute("aria-selected","true");
  const p=picksBySlot[idx];
  const spotIcon=`<svg viewBox="0 0 16 16" width="11" height="11" fill="#e6ad2e" style="vertical-align:-.1em;margin-right:2px"><circle cx="8" cy="5" r="3"/><path d="M8 8L2 14L14 14Z" opacity=".7"/></svg>`;
  if(p){pushFeed(spotIcon+" <b>"+shortName(p)+"</b> "+(LANG==="tr"?"medya spotunda \u2014 bu ma\u00e7 +"+pow+" g\u00fc\u00e7":"in the spotlight \u2014 +"+pow+" power this match"),"pres");
  const roundel=$("h"+idx);if(roundel){let badge=roundel.querySelector(".spot-badge");if(!badge){badge=document.createElement("div");badge.className="spot-badge";roundel.appendChild(badge);}badge.textContent="+"+pow;}}
}
function showPowerGraph(){
  const tr=LANG==="tr";
  const hist=powerHist.slice(0,round);
  const oppH=bracket.slice(0,round).map(b=>b.power);
  const maxV=Math.max(...hist,...oppH,80);
  const W=280,H=100,pad=20;
  const xS=(W-pad*2)/(Math.max(hist.length-1,1));
  const yS=(H-pad*2)/maxV;
  const pts=(arr)=>arr.map((v,i)=>`${pad+i*xS},${H-pad-v*yS}`).join(' ');
  const svg=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">
    <polyline points="${pts(hist)}" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${pts(oppH)}" fill="none" stroke="#f87171" stroke-width="1.5" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round"/>
    ${hist.map((v,i)=>`<circle cx="${pad+i*xS}" cy="${H-pad-v*yS}" r="3" fill="#4ade80"/>`).join('')}
    <text x="4" y="12" font-size="8" fill="#4ade80" font-family="monospace">${tr?"Sen":"You"}</text>
    <text x="4" y="22" font-size="8" fill="#f87171" font-family="monospace">${tr?"Rakip":"Opp"}</text>
  </svg>`;
  showModal(`<div class="bulletin"><div class="bhead"><span>${tr?"GÜÇ TARİHİ":"POWER HISTORY"}</span></div>${svg}<div class="bact"><button class="btn btn-primary" onclick="closeModal()">${tr?"Kapat":"Close"}</button></div></div>`);
}
function showPowerBreak(){const x=L(),tr=LANG==="tr",sp=squadPower(round),sgn=v=>(v>=0?"+":"")+Math.round(v),waste=Math.max(0,Math.round(sp.capLoss));const rows=[_breakdownRow(x.pbPlayers,Math.round(sp.avg),{neutral:true}),_breakdownRow(x.ui.style,sgn(sp.styleBonus)),_breakdownRow(x.ui.cards,sgn(sp.cardBonus)),_breakdownRow(x.ui.matchup||(tr?"Eşleşme":"Matchup"),sgn(sp.matchup)),_breakdownRow(tr?"Risk / Final Borcu":"Risk / Final Debt",sgn(sp.risk)),_breakdownRow(tr?"\u00d6zellik + Moral":"Trait + Morale",sgn(sp.trait+sp.moral)),_breakdownRow(x.ui.bonusEfficiency,`${Math.round(sp.bonus)} / ${Math.round(sp.rawBonus)}`,{tone:"bd-value-positive"})];if(waste)rows.push(_breakdownRow(tr?"Tavan y\u00fcz\u00fcnden bo\u015fa giden bonus":"Bonus wasted by cap",`-${waste}`,{tone:"bd-value-negative"}));rows.push(_breakdownRow(x.pbChem,(sp.chem>=0?"+":"")+sp.chem,{tone:sp.chem<0?"bd-value-negative":undefined}),_breakdownRow(x.pbTotal,sp.power,{total:true,neutral:true}));_breakdownModal(x.powHdr2,x.rounds[round-1],rows,{label:x.powHdr2});}
function ctxLine(o){const x=L();if(o.hidden)return o.scoutHint||x.ctxHidden;if(o.trait==="wonderkid")return x.ctxWonder;if(o.ov>=84)return x.ctxStar;if(o.trait==="buyukmac")return x.ctxBig;if(o.trait==="lider")return x.ctxLead;if(o.age<=20)return x.ctxYoung;if(o.tr)return x.ctxLocal;if(o.age>=32)return x.ctxVet;if(o.ov>=78)return x.ctxForm;return x.ctxSolid;}
function clearRoundel(idx){const r=$("r"+idx);if(!r)return;r.className="roundel";const pos=slots[idx][0];const sil=typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(pos)]||""):"";r.innerHTML=`${sil}<span class="rp">${L().abbr[pos]||""}</span>`;}
function updateUndoBtn(){const b=$("undoBtn");if(!b)return;const show=!!(undoData&&!undoUsed);b.classList.toggle("hidden",!show);if(show&&undoData){const nm=undoData.name?undoData.name.trim().split(" ").slice(-1)[0]:"";b.textContent=nm?(LANG==="tr"?`↩ ${nm} transferini geri al`:`↩ Undo ${nm}`):(LANG==="tr"?"↩ Son hamleyi geri al":"↩ Undo last pick");}}
function undoPick(){if(!undoData||undoUsed)return;const u=undoData;picksBySlot[u.idx]=null;filled[u.idx]=false;remaining++;budget=u.budget;setBudget();if(u.name)usedNames.delete(u.name);clearRoundel(u.idx);undoUsed=true;undoData=null;updateUndoBtn();sfxStamp();loadRollStage();}
function toggleCardActive(k){if(invOf(k)<=0)return;if(hasCard(k)){cards=cards.filter(c=>c!==k);sfxStamp();renderHub();return;}if(cards.length>=activeCardSlots()){pushFeed((LANG==="tr"?"🃏 aktif kart slotu dolu":"🃏 active card slots full"),"ch");renderFeed();return;}cards.push(k);sfxStamp();renderHub();}
function cardArt(k){return "assets/cards/"+k+".png";}
function kindLabel(k){const kind=cardKind(k),m={power:LT("GÜÇ","POWER","POTENCIA","STÄRKE","FORZA"),economy:LT("EKONOMİ","ECONOMY","ECONOMÍA","FINANZEN","ECONOMIA"),risk:LT("ÖZEL","SPECIAL","ESPECIAL","SPEZIAL","SPECIALE"),temporary:LT("ÖZEL","SPECIAL","ESPECIAL","SPEZIAL","SPECIALE"),final:LT("FİNAL","FINAL","FINAL","FINALE","FINALE"),defense:LT("SAVUNMA","DEFENSE","DEFENSA","ABWEHR","DIFESA"),squad:LT("KADRO","SQUAD","PLANTILLA","KADER","ROSA"),injury:LT("SAKATLIK","INJURY","LESIÓN","VERLETZUNG","INFORTUNIO")};const lbl=m[kind]||m.power;if(kind==="defense")return `<svg viewBox="0 0 24 24" fill="currentColor" width="9" height="9" style="vertical-align:-.05em;margin-right:2px;opacity:.8"><path d="M11.884 2.007l.114 -.007l.118 .007l.059 .008l.061 .013l.111 .034a.993 .993 0 0 1 .217 .112l.104 .082l.255 .218a11 11 0 0 0 7.189 2.537l.342 -.01a1 1 0 0 1 1.005 .717a13 13 0 0 1 -9.208 16.25a1 1 0 0 1 -.502 0a13 13 0 0 1 -9.209 -16.25a1 1 0 0 1 1.005 -.717a11 11 0 0 0 7.531 -2.527l.263 -.225l.096 -.075a.993 .993 0 0 1 .217 -.112l.112 -.034a.97 .97 0 0 1 .119 -.021z"/></svg>${lbl}`;return lbl;}
function modeLabel(k){if(isInstantCard(k))return LT("ANINDA ÇALIŞIR","INSTANT","INSTANTÁNEA","SOFORT","IMMEDIATA");if(!isProgressCard(k))return LT("SÖZLEŞME","CONTRACT","CONTRATO","VERTRAG","CONTRATTO");return LT("GELİŞEN","SCALING","PROGRESIVA","SKALIEREND","PROGRESSIVA");}
function cardBadgeHTML(k){return `<span class="kindtag kind-${cardKind(k)}">${kindLabel(k)}</span><span class="modetag">${modeLabel(k)}</span>`;}
function variantBadge(v){const labels=["COMMON","DARK"];return labels[Math.min(v||0,1)]||labels[0];}
function rarLabel(k){return variantBadge(variantOf(k));}

const LOCK_SVG=`<svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M12 2a5 5 0 0 1 5 5v3a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3v-3a5 5 0 0 1 5 -5m0 12a2 2 0 0 0 -1.995 1.85l-.005 .15a2 2 0 1 0 2 -2m0 -10a3 3 0 0 0 -3 3v3h6v-3a3 3 0 0 0 -3 -3"/></svg>`;
const CARD_SVGS={
taraftar:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 10 28;5 10 28;0 10 28;-5 10 28;0 10 28" dur="1.6s" begin="0s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="10" cy="13" r="3"/><path d="M7 34Q10 22 13 34"/><path d="M7 17L4 10M13 17L16 10"/></g><g><animateTransform attributeName="transform" type="rotate" values="0 24 26;-5 24 26;0 24 26;5 24 26;0 24 26" dur="1.6s" begin="0.22s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="24" cy="10" r="3"/><path d="M21 34Q24 20 27 34"/><path d="M21 14L18 7M27 14L30 7"/></g><g><animateTransform attributeName="transform" type="rotate" values="0 38 28;5 38 28;0 38 28;-5 38 28;0 38 28" dur="1.6s" begin="0.44s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="38" cy="13" r="3"/><path d="M35 34Q38 22 41 34"/><path d="M35 17L32 10M41 17L44 10"/></g><path d="M5 40Q24 37 43 40"/></svg>`,
genc:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="9" r="3.5"/><path d="M16 14Q11 20 10 30M16 14Q20 20 20 30"/><path d="M14 20Q9 18 6 22"/><path d="M18 18Q24 18 28 16"/><path d="M10 30Q8 36 12 40M20 30Q23 36 20 40"/><circle cx="34" cy="38" r="5" stroke-width="2"/><path d="M25 33Q29 28 32 33"/><path d="M7 6L9 8M12 4L12 7M17 3L16 6"><animate attributeName="opacity" values="1;0.08;1" dur="1.1s" repeatCount="indefinite"/></path></svg>`,
ch_momentum:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.2s" begin="0s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M5 42L15 30L9 30L19 18L13 18L23 6"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.2s" begin="0.18s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M17 42L27 30L21 30L31 18L25 18L35 6"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1.2s" begin="0.36s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M29 42L39 30L33 30L43 18"/></g></svg>`,
kontra:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M44 12Q44 26 28 26Q12 26 4 40"/><path d="M10 34L4 40L12 42"/><circle cx="38" cy="9" r="3.5"/><path d="M34 9L26 9" stroke-dasharray="3 2"><animate attributeName="stroke-dashoffset" values="0;-10" dur="0.65s" repeatCount="indefinite"/></path><path d="M36 15L40 21M42 15L38 21" stroke-width="1.4"><animate attributeName="opacity" values="0.2;1;0.2" dur="0.5s" repeatCount="indefinite"/></path></svg>`,
buyuk_mac:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 46Q4 22 24 14Q44 22 44 46" fill="currentColor" opacity=".06"/><path d="M4 46Q4 22 24 14Q44 22 44 46"/><circle cx="24" cy="22" r="4.5"/><path d="M20 28L18 42M20 28L28 28L30 42"/><path d="M20 30L12 24M28 30L36 24"/><circle cx="11" cy="8" r="2.5" fill="currentColor" opacity=".4"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" repeatCount="indefinite"/></circle><circle cx="37" cy="8" r="2.5" fill="currentColor" opacity=".4"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.1s" begin="0.3s" repeatCount="indefinite"/></circle><path d="M11 11L18 22" stroke-width="1.2" opacity=".5"/><path d="M37 11L30 22" stroke-width="1.2" opacity=".5"/></svg>`,
yildiz:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 24 20;360 24 20" dur="9s" repeatCount="indefinite"/><path d="M24 5L27.6 16.2L39.6 16.2L30 23L33.4 34.4L24 27.5L14.6 34.4L18 23L8.4 16.2L20.4 16.2Z"/><line x1="24" y1="2" x2="24" y2="5"/><line x1="43" y1="10" x2="40.5" y2="12.5"/><line x1="46" y1="26" x2="42" y2="26"/><line x1="7" y1="10" x2="9.5" y2="12.5"/><line x1="2" y1="26" x2="6" y2="26"/></g></svg>`,
kanat_akini:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="10" r="3.5"/><path d="M30 15Q24 20 24 30M30 15Q36 18 38 26"/><path d="M26 20Q20 20 16 24"/><path d="M24 30Q22 36 26 42M38 26Q40 32 36 40"/><circle cx="40" cy="40" r="4.5" stroke-width="2"><animate attributeName="r" values="4.5;5.6;4.5" dur="0.85s" repeatCount="indefinite"/></circle><path d="M6 22L11 23M5 28L10 28M6 34L11 32"><animate attributeName="opacity" values="0.15;1;0.15" dur="0.55s" repeatCount="indefinite"/></path></svg>`,
cift_forvet:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 13 20;7 13 20;0 13 20" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="13" cy="8" r="3"/><path d="M11 14Q7 20 8 30M11 14Q15 20 13 30"/><path d="M8 20Q4 20 3 24M14 20Q18 20 19 24"/></g><g><animateTransform attributeName="transform" type="rotate" values="0 35 20;-7 35 20;0 35 20" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="35" cy="8" r="3"/><path d="M33 14Q29 20 30 30M33 14Q37 20 35 30"/><path d="M30 20Q26 20 25 24M36 20Q40 20 41 24"/></g><circle cx="24" cy="38" r="5" stroke-width="2"/><path d="M15 34Q19 29 24 31Q29 29 33 34"/></svg>`,
otobus:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 24 20;-4 24 20;0 24 20" dur="1.8s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="7" cy="9" r="2.8"/><path d="M5 15Q4 23 5 33M5 15Q7 23 9 33"/><path d="M5 19L2 21M9 19L12 21"/><circle cx="19" cy="9" r="2.8"/><path d="M17 15Q16 23 17 33M17 15Q19 23 21 33"/><path d="M17 19L14 21M21 19L24 21"/><circle cx="31" cy="9" r="2.8"/><path d="M29 15Q28 23 29 33M29 15Q31 23 33 33"/><path d="M29 19L26 21M33 19L36 21"/><circle cx="43" cy="9" r="2.8"/><path d="M41 15Q40 23 41 33M41 15Q43 23 45 33"/><path d="M41 19L38 21"/></g><line x1="2" y1="37" x2="46" y2="37" stroke-width="2.5"/></svg>`,
kaleci_kalesi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8L4 44M44 8L44 44M4 8L44 8"/><path d="M14 44L14 22M34 44L34 22M14 22L34 22"/><g><animateTransform attributeName="transform" type="translate" values="-3 0;3 0;-3 0" dur="1.8s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="10" cy="22" r="3.5"/><path d="M6 28Q5 22 8 17"/><path d="M14 28Q18 26 22 20Q18 15 12 14"/><path d="M10 32Q8 38 6 44M10 32Q13 38 16 44"/></g><circle cx="37" cy="32" r="4.5" stroke-width="2"/></svg>`,
anadolu:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="22" width="28" height="13" rx="2.5"/><rect x="28" y="16" width="10" height="9" rx="1.5"/><rect x="10" y="14" width="5" height="9" rx="1.2"/><rect x="8" y="12" width="9" height="3" rx="1.5"/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M12 11Q10 7 12 4" stroke-width="1.2" stroke-dasharray="1.5 2"><animate attributeName="opacity" values="1;0.05;1" dur="1.4s" repeatCount="indefinite"/></path><path d="M16 10Q14 6 16 3" stroke-width="1.2" stroke-dasharray="1.5 2"><animate attributeName="opacity" values="1;0.05;1" dur="1.4s" begin="0.38s" repeatCount="indefinite"/></path></g><circle cx="11" cy="35" r="5"/><circle cx="24" cy="35" r="5"/><circle cx="34" cy="35" r="4"/><path d="M6 25L3 29Q2 32 3 35L6 35"/><line x1="2" y1="41" x2="46" y2="41" stroke-width="1.2"/><line x1="7" y1="41" x2="7" y2="43.5"/><line x1="14" y1="41" x2="14" y2="43.5"/><line x1="21" y1="41" x2="21" y2="43.5"/><line x1="28" y1="41" x2="28" y2="43.5"/><line x1="35" y1="41" x2="35" y2="43.5"/><line x1="42" y1="41" x2="42" y2="43.5"/></svg>`,
altyapi_plani:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="22" height="28" rx="2"/><line x1="10" y1="12" x2="24" y2="12"/><line x1="10" y1="17" x2="24" y2="17"/><line x1="10" y1="22" x2="20" y2="22"/><circle cx="36" cy="34" r="3"/><path d="M34 38Q32 43 34 46M36 38Q38 43 36 46" stroke-width="1.5"/><path d="M32 40Q28 40 26 42"/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="1s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M36 30Q34 22 36 16"/><path d="M36 16L40 20M36 16L32 20"/></g></svg>`,
tecrubeli_omurga:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="24" y1="4" x2="24" y2="44"/><ellipse cx="24" cy="11" rx="8.5" ry="4.5"><animate attributeName="rx" values="8.5;11;8.5" dur="2s" begin="0s" repeatCount="indefinite"/></ellipse><ellipse cx="24" cy="20" rx="7.5" ry="4"><animate attributeName="rx" values="7.5;10;7.5" dur="2s" begin="0.28s" repeatCount="indefinite"/></ellipse><ellipse cx="24" cy="29" rx="7.5" ry="4"><animate attributeName="rx" values="7.5;10;7.5" dur="2s" begin="0.56s" repeatCount="indefinite"/></ellipse><ellipse cx="24" cy="38" rx="7.5" ry="4"><animate attributeName="rx" values="7.5;10;7.5" dur="2s" begin="0.84s" repeatCount="indefinite"/></ellipse><line x1="15" y1="7" x2="11" y2="7"/><line x1="33" y1="7" x2="37" y2="7"/></svg>`,
veteran:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4L40 4L28 22L40 44L8 44L20 22Z"/><path d="M10 42L38 42L28 29L20 29Z" fill="currentColor" opacity=".22"/><line x1="22" y1="22" x2="22" y2="26" stroke-dasharray="2 2"/><line x1="26" y1="22" x2="26" y2="26" stroke-dasharray="2 2"/><path d="M24 8L25.5 12H30L26.5 14.4L27.8 18.5L24 16.2L20.2 18.5L21.5 14.4L18 12H22.5Z" fill="currentColor" opacity=".35" stroke-width="0"><animate attributeName="opacity" values="0.35;1;0.35" dur="1.5s" repeatCount="indefinite"/></path></svg>`,
yerli_blok:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 4L42 12V26Q42 38 24 44Q6 38 6 26V12Z" fill="currentColor" opacity=".08"><animate attributeName="opacity" values="0.08;0.22;0.08" dur="1.8s" repeatCount="indefinite"/></path><path d="M24 4L42 12V26Q42 38 24 44Q6 38 6 26V12Z"/><path d="M24 14L26 20H32L27.2 24L29 30L24 26.8L19 30L20.8 24L16 20H22Z" fill="currentColor" opacity=".45" stroke-width="0"><animate attributeName="opacity" values="0.45;1;0.45" dur="1.8s" begin="0.5s" repeatCount="indefinite"/></path></svg>`,
derbi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 26Q4 14 12 12Q18 10 22 16L24 18L26 16Q30 10 36 12Q44 14 44 26Q44 34 38 36Q34 38 28 32Q26 28 24 32Q22 28 20 32Q14 38 10 36Q4 34 4 26Z" fill="currentColor" opacity=".08"><animate attributeName="opacity" values="0.08;0.22;0.08" dur="0.85s" repeatCount="indefinite"/></path><path d="M4 26Q4 14 12 12Q18 10 22 16L24 18L26 16Q30 10 36 12Q44 14 44 26Q44 34 38 36Q34 38 28 32Q26 28 24 32Q22 28 20 32Q14 38 10 36Q4 34 4 26Z"/><path d="M8 21L14 14L22 21L14 30Z"><animate attributeName="opacity" values="1;0.3;1;1;1" dur="0.85s" repeatCount="indefinite"/></path><path d="M26 21L34 14L40 21L34 30Z"><animate attributeName="opacity" values="1;1;1;0.3;1" dur="0.85s" repeatCount="indefinite"/></path><path d="M5 13Q12 6 22 11"/><path d="M26 11Q36 6 43 13"/><line x1="24" y1="4" x2="24" y2="11" stroke-width="2.2"/><path d="M20 7L24 3L28 7"/></svg>`,
ch_final:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 8L34 8Q36 22 30 28Q28 30 24 30Q20 30 18 28Q12 22 14 8Z"/><path d="M18 28Q18 36 16 40M30 28Q30 36 32 40"/><line x1="12" y1="40" x2="36" y2="40"/><path d="M4 8Q6 14 14 14M44 8Q42 14 34 14"/><path d="M20 4L24 2L28 4"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/></path><line x1="20" y1="4" x2="28" y2="4"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" begin="0.15s" repeatCount="indefinite"/></line></svg>`,
final_provasi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="8" width="36" height="28" rx="2"/><line x1="6" y1="36" x2="20" y2="44"/><line x1="42" y1="36" x2="28" y2="44"/><g><animateTransform attributeName="transform" type="translate" values="0 0;2 3;0 0" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="14" cy="18" r="2.5"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;-2 3;0 0" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="34" cy="18" r="2.5"/></g><circle cx="24" cy="28" r="2.5"/><path d="M16.5 18Q20 22 22 28M31.5 18Q28 22 26 28"/><path d="M24 28L24 36L21 32M24 36L27 32"/></svg>`,
kupaci_kadro:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 10 36;-4 10 36;0 10 36;4 10 36;0 10 36" dur="1.8s" begin="0s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="10" cy="28" r="3"/><path d="M8 34Q7 40 9 44M8 34Q10 40 12 44"/><path d="M8 32L5 36M12 32L16 36"/></g><g><animateTransform attributeName="transform" type="rotate" values="0 24 34;4 24 34;0 24 34;-4 24 34;0 24 34" dur="1.8s" begin="0.22s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="24" cy="26" r="3"/><path d="M22 32Q21 38 23 44M22 32Q24 38 26 44"/><path d="M22 30L18 32M26 30L30 32"/></g><g><animateTransform attributeName="transform" type="rotate" values="0 38 36;4 38 36;0 38 36;-4 38 36;0 38 36" dur="1.8s" begin="0.44s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="38" cy="28" r="3"/><path d="M36 34Q35 40 37 44M36 34Q38 40 40 44"/><path d="M36 32L32 36M40 32L44 36"/></g><path d="M18 16L30 16Q31 6 24 4Q17 6 18 16Z"><animate attributeName="opacity" values="1;0.45;1" dur="1.2s" repeatCount="indefinite"/></path><path d="M14 16Q12 12 18 16M34 16Q36 12 30 16"/></svg>`,
sogukkanli_penaltici:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8L4 40M44 8L44 40M4 8L44 8"/><path d="M14 40L14 22M34 40L34 22M14 22L34 22"/><circle cx="24" cy="36" r="4.5" stroke-width="2"/><g><animateTransform attributeName="transform" type="translate" values="-3 0;0 0;-3 0" dur="1.6s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="10" cy="32" r="3"/><path d="M8 36Q7 40 9 44M12 36Q14 40 12 44"/></g><line x1="24" y1="32" x2="24" y2="28" stroke-dasharray="2 2" stroke-width="1.2"/></svg>`,
son_dans:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="-4 18 22;4 18 22;-4 18 22" dur="0.85s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="20" cy="7" r="3.2"/><path d="M20 10Q18 16 18 22"/><path d="M19 14L28 8"/><path d="M19 14L11 19"/><path d="M18 22L10 32L6 36"/><path d="M18 22L22 31L28 36"/></g><circle cx="37" cy="11" r="2.2" fill="currentColor" stroke-width="0"/><line x1="39.2" y1="11" x2="39.2" y2="5" stroke-width="1.4"/><line x1="39.2" y1="5" x2="43" y2="6.5" stroke-width="1.4"/><circle cx="41" cy="19" r="1.7" fill="currentColor" stroke-width="0" opacity=".7"/><line x1="42.7" y1="19" x2="42.7" y2="14" stroke-width="1.2" opacity=".7"/><line x1="42.7" y1="14" x2="45" y2="15" stroke-width="1.2" opacity=".7"/><path d="M8 9L9.5 7.5M10 10.5L8.5 9" stroke-width="1.4" opacity=".45"/><path d="M6 20L7.5 18.5M8 21.5L6.5 20" stroke-width="1.3" opacity=".35"/></svg>`,
temiz_sayfa:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="16" y="16" width="16" height="16" rx="2"><animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite"/></rect><line x1="24" y1="10" x2="24" y2="38"/><line x1="10" y1="24" x2="38" y2="24"/><path d="M10 34Q16 38 24 36Q32 38 38 34" stroke-width="1.4"><animate attributeName="opacity" values="0.35;1;0.35" dur="1.5s" begin="0.3s" repeatCount="indefinite"/></path><path d="M10 14Q16 10 24 12Q32 10 38 14" stroke-width="1.4"><animate attributeName="opacity" values="0.35;1;0.35" dur="1.5s" begin="0.6s" repeatCount="indefinite"/></path></svg>`,
taksit_transfer:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="14" width="36" height="24" rx="3"/><line x1="6" y1="22" x2="42" y2="22"/><rect x="10" y="26" width="8" height="6" rx="1.5"/><line x1="24" y1="29" x2="34" y2="29"/><line x1="24" y1="32" x2="30" y2="32"/><g><animate attributeName="opacity" values="1;0.08;1" dur="0.9s" repeatCount="indefinite"/><line x1="40" y1="6" x2="44" y2="10"/><line x1="44" y1="6" x2="40" y2="10"/><path d="M38 4L46 12" stroke-dasharray="2 2" stroke-width="1.2"/></g></svg>`,
son_kredi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 34Q8 24 10 12L38 12Q40 24 38 34Q38 42 24 44Q10 42 10 34Z"/><path d="M12 20Q12 14 24 14Q36 14 36 20"/><circle cx="24" cy="30" r="6"><animate attributeName="r" values="6;7.5;6" dur="1.4s" repeatCount="indefinite"/></circle><path d="M22 30Q23 27 26 28Q27 30 25 32Q23 32 22 30"/><line x1="24" y1="24" x2="24" y2="26"/><line x1="24" y1="34" x2="24" y2="36"/></svg>`,
kara_borsa:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14Q24 8 38 14"/><path d="M10 14L12 38Q24 44 36 38L38 14"/><line x1="8" y1="14" x2="40" y2="14" stroke-width="2"/><circle cx="24" cy="24" r="5" fill="currentColor" opacity="0.2" stroke-width="1.4"><animate attributeName="opacity" values="0.2;0.55;0.2" dur="1.6s" repeatCount="indefinite"/></circle><g><animateTransform attributeName="transform" type="translate" values="0 0;1 1;0 0;-1 0;0 0" dur="2.2s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><rect x="30" y="28" width="14" height="10" rx="2"/><path d="M32 28L32 26Q32 24 37 24Q42 24 42 26L42 28"/></g></svg>`,
sahte_evrak:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4L38 4L38 44L10 44Z"/><line x1="16" y1="14" x2="32" y2="14"/><line x1="16" y1="20" x2="32" y2="20"/><line x1="16" y1="26" x2="26" y2="26"/><circle cx="30" cy="34" r="8"/><g><animate attributeName="opacity" values="1;0.08;1;0.08;1" dur="1.1s" repeatCount="indefinite"/><line x1="26" y1="30" x2="34" y2="38"/><line x1="34" y1="30" x2="26" y2="38"/></g></svg>`,
deplasman_kafilesi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0;0 1;0 0" dur="0.6s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><rect x="4" y="14" width="40" height="22" rx="4"/><rect x="8" y="18" width="8" height="7" rx="1"/><rect x="20" y="18" width="8" height="7" rx="1"/><rect x="32" y="18" width="8" height="7" rx="1"/><circle cx="14" cy="38" r="4"/><circle cx="34" cy="38" r="4"/><path d="M44 20L46 24Q46 28 44 30"/><path d="M4 22L2 24Q2 28 4 30"/></g></svg>`,
sosyal_medya:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="6" width="20" height="34" rx="3"/><line x1="13" y1="34" x2="27" y2="34"/><circle cx="20" cy="38" r="1.5" fill="currentColor" stroke-width="0"/><path d="M34 10Q40 10 42 14Q44 18 40 22Q38 24 34 24"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="0s" repeatCount="indefinite"/></path><path d="M34 18Q38 18 40 20Q40 24 36 26Q34 28 34 26"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin="0.3s" repeatCount="indefinite"/></path><circle cx="34" cy="8" r="2.5"/></svg>`,
kumarbaz:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="18" width="19" height="19" rx="3"/><circle cx="9" cy="23" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="18" cy="23" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="9" cy="32" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="18" cy="32" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="13.5" cy="27.5" r="1.5" fill="currentColor" stroke-width="0"/><g><animateTransform attributeName="transform" type="rotate" values="0 32.5 19.5;10 32.5 19.5;0 32.5 19.5;-10 32.5 19.5;0 32.5 19.5" dur="1.8s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><rect x="23" y="10" width="19" height="19" rx="3"/><circle cx="28" cy="15" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="37" cy="15" r="1.5" fill="currentColor" stroke-width="0"/><circle cx="37" cy="24" r="1.5" fill="currentColor" stroke-width="0"/></g></svg>`,
gecici_prim:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4L10 24L20 24L14 44L38 18L26 18L34 4Z"><animate attributeName="opacity" values="1;0.25;1;0.55;1" dur="1.7s" repeatCount="indefinite"/></path><circle cx="40" cy="38" r="6"/><line x1="40" y1="34" x2="40" y2="38"/><line x1="40" y1="38" x2="43" y2="40"/></svg>`,
kisa_kamp:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6L6 44L42 44Z"/><path d="M18 44L24 26L30 44"/><line x1="2" y1="44" x2="46" y2="44"/><path d="M34 18Q38 14 42 10"><animate attributeName="opacity" values="1;0.1;1" dur="0.8s" begin="0s" repeatCount="indefinite"/></path><path d="M37 22Q41 18 44 14"><animate attributeName="opacity" values="1;0.1;1" dur="0.8s" begin="0.2s" repeatCount="indefinite"/></path></svg>`,
doping:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;-2 2;0 0" dur="1.2s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><path d="M36 4L40 8L14 34Q12 36 10 34L8 32Q6 30 8 28Z"/><line x1="32" y1="8" x2="36" y2="12"/><path d="M8 32L6 38L4 44L10 42L14 40L12 34"/></g><path d="M14 14Q18 10 22 14Q26 18 22 22" stroke-width="1.4"/></svg>`,
kriz:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6L44 42H4Z" fill="currentColor" opacity=".08"><animate attributeName="opacity" values="0.08;0.3;0.08" dur="0.9s" repeatCount="indefinite"/></path><path d="M24 6L44 42H4Z"><animate attributeName="opacity" values="1;0.4;1" dur="0.9s" repeatCount="indefinite"/></path><line x1="24" y1="18" x2="24" y2="31" stroke-width="3"><animate attributeName="opacity" values="1;0.1;1" dur="0.9s" repeatCount="indefinite"/></line><circle cx="24" cy="37" r="2.8" fill="currentColor" stroke-width="0"><animate attributeName="opacity" values="0.1;1;0.1" dur="0.9s" repeatCount="indefinite"/></circle></svg>`,
cilgin_basin:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="4" width="12" height="20" rx="6"/><path d="M8 18Q8 30 20 30Q32 30 32 18"/><line x1="20" y1="30" x2="20" y2="38"/><line x1="12" y1="38" x2="28" y2="38"/><path d="M36 10Q41 13 41 18Q41 23 36 26"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.1s" repeatCount="indefinite"/></path><path d="M38 7Q45 11 45 18Q45 25 38 29"><animate attributeName="opacity" values="0.1;0.65;0.1" dur="1.1s" begin="0.28s" repeatCount="indefinite"/></path></svg>`,
kurban_belli:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;3 0;0 0" dur="0.45s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="14" cy="7" r="3"/><path d="M14 10Q10 18 11 28"/><path d="M14 14L8 18M14 14L20 18"/><path d="M11 28Q8 36 10 42M11 28Q16 34 18 42"/></g><g><animate attributeName="opacity" values="0;0;1;1;0" dur="1.8s" repeatCount="indefinite"/><line x1="32" y1="16" x2="44" y2="28" stroke-width="2.5"/><line x1="44" y1="16" x2="32" y2="28" stroke-width="2.5"/></g><g><animate attributeName="opacity" values="1;1;0;0;1" dur="1.8s" repeatCount="indefinite"/><path d="M28 10L34 6M28 16L36 16M28 22L34 26"/></g></svg>`,
primler_yatinca:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="26" r="7"/><path d="M16 22v8M13 24h6"/><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -8;0 -8;0 0" dur="1.6s" calcMode="spline" keySplines=".42 0 .58 1;.1 0 .9 1;.42 0 .58 1" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0;0" dur="1.6s" repeatCount="indefinite"/><circle cx="34" cy="34" r="5" stroke-dasharray="1 1.5"/><path d="M32 34h4M34 32v4"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -14;0 -14;0 0" dur="1.6s" begin="0.4s" calcMode="spline" keySplines=".42 0 .58 1;.1 0 .9 1;.42 0 .58 1" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;1;0;0" dur="1.6s" begin="0.4s" repeatCount="indefinite"/><circle cx="40" cy="38" r="4" stroke-dasharray="1 1.5"/></g></svg>`,
vur_igneyi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;2 0;0 0;-1 0;0 0" dur="1.2s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="16" cy="7" r="3"/><path d="M16 10Q14 18 14 30"/><path d="M14 16L9 20M14 16L20 18"/><path d="M14 30Q12 38 14 44M14 30Q18 36 20 44"/></g><g opacity=".7"><line x1="32" y1="10" x2="40" y2="18" stroke-width="1.4"/><line x1="36" y1="8" x2="42" y2="14" stroke-width="1.4"/><rect x="26" y="14" width="6" height="12" rx="1" stroke-width="1.2"/><circle cx="29" cy="14" r="2" fill="currentColor" opacity=".3"/></g><path d="M30 28Q28 34 30 40Q34 38 36 34Q36 28 30 28Z" stroke-width="1.2"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="0.9s" repeatCount="indefinite"/></path></svg>`,
bu_adam:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animate attributeName="opacity" values="0;1;1;1" dur="1.8s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="10 0;0 0;0 0;0 0" dur="1.8s" calcMode="spline" keySplines=".42 0 .58 1;.1 0 .9 1;.1 0 .9 1" repeatCount="indefinite"/><circle cx="24" cy="9" r="3.5"/><path d="M24 13Q20 20 20 32"/><path d="M20 19L14 22M20 19L28 21"/><path d="M20 32Q18 38 20 44M20 32Q24 38 26 44"/></g><path d="M6 10Q6 4 14 6Q14 12 8 14Q6 12 6 10Z" opacity=".3" fill="currentColor" stroke-width="0"><animate attributeName="opacity" values="0.3;0;0;0.3" dur="1.8s" repeatCount="indefinite"/></path><path d="M38 10L44 4M34 8L38 4M42 14L46 10" stroke-width="1.3"><animate attributeName="opacity" values="1;0;0;1" dur="1.8s" repeatCount="indefinite"/></path></svg>`,
gec_gec:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 2;0 0" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><circle cx="8" cy="12" r="2.8"/><path d="M8 15Q6 22 7 34M8 15Q10 22 9 34"/><path d="M7 20L4 22M9 20L12 22"/><circle cx="24" cy="10" r="2.8"/><path d="M24 13Q22 20 23 34M24 13Q26 20 25 34"/><path d="M23 18L20 20M25 18L28 20"/><circle cx="40" cy="12" r="2.8"/><path d="M40 15Q38 22 39 34M40 15Q42 22 41 34"/><path d="M39 20L36 22M41 20L44 22"/><line x1="4" y1="38" x2="44" y2="38" stroke-width="2.5"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;-4 0;-8 0;-8 0;-8 0" dur="2s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.1 0 .9 1;.1 0 .9 1" repeatCount="indefinite"/><circle cx="56" cy="24" r="5.5" stroke-width="2"/></g></svg>`,
nasip_kismet:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="rotate" values="0 24 24;360 24 24" dur="3s" repeatCount="indefinite"/><circle cx="24" cy="24" r="18" stroke-dasharray="4 4" stroke-width="1.2"/><circle cx="24" cy="6" r="3" fill="currentColor" opacity=".8" stroke-width="0"/><circle cx="24" cy="42" r="2" fill="currentColor" opacity=".4" stroke-width="0"/><circle cx="6" cy="24" r="2.5" fill="currentColor" opacity=".6" stroke-width="0"/><circle cx="42" cy="24" r="2.5" fill="currentColor" opacity=".6" stroke-width="0"/></g><path d="M20 22L22 28L24 22L26 28L28 22" stroke-width="1.5"><animate attributeName="opacity" values="0.3;1;0.3" dur="1.2s" repeatCount="indefinite"/></path></svg>`,
yildiz_krizi:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;14 -8;28 -16" dur="1.4s" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.6;0" dur="1.4s" repeatCount="indefinite"/><path d="M18 18L20 24H26L21.5 27.5L23.3 34L18 30.5L12.7 34L14.5 27.5L10 24H16Z" fill="currentColor" opacity=".3" stroke-width="1.4"/></g><circle cx="10" cy="36" r="2.5" fill="currentColor" opacity=".4" stroke-width="0"><animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" begin="0s" repeatCount="indefinite"/></circle><circle cx="20" cy="38" r="2.5" fill="currentColor" opacity=".4" stroke-width="0"><animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" begin="0.2s" repeatCount="indefinite"/></circle><circle cx="30" cy="36" r="2.5" fill="currentColor" opacity=".4" stroke-width="0"><animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" begin="0.4s" repeatCount="indefinite"/></circle><path d="M10 32Q12 28 20 32Q28 28 36 32" stroke-width="1.3" opacity=".5"/></svg>`,
kasiga_para:`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g><animateTransform attributeName="transform" type="translate" values="0 0;-16 8;-16 8;0 0" dur="1.6s" calcMode="spline" keySplines=".42 0 .58 1;.1 0 .9 1;.42 0 .58 1" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0;0" dur="1.6s" repeatCount="indefinite"/><circle cx="34" cy="16" r="6"/><path d="M32 16h4M34 14v4"/></g><g><animateTransform attributeName="transform" type="translate" values="0 0;-16 8;-16 8;0 0" dur="1.6s" begin="0.4s" calcMode="spline" keySplines=".42 0 .58 1;.1 0 .9 1;.42 0 .58 1" repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.8;0;0" dur="1.6s" begin="0.4s" repeatCount="indefinite"/><circle cx="38" cy="10" r="4.5" stroke-dasharray="2 1.5"/></g><rect x="8" y="26" width="16" height="14" rx="2"/><path d="M12 26v-3a4 4 0 0 1 8 0v3"/><path d="M16 31v4M14 33h4"/></svg>`,
};
CARD_SVGS.kanat_akini=`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v36M40 6v36" opacity=".55"/><path d="M12 36Q21 34 27 27Q33 20 36 11"/><path d="M30 12h6v6"/><circle cx="16" cy="34" r="3.2"/><circle cx="34" cy="14" r="3.2"><animate attributeName="r" values="3.2;4;3.2" dur="1s" repeatCount="indefinite"/></circle><path d="M14 22h8M26 22h8" stroke-dasharray="2 3" opacity=".45"><animate attributeName="stroke-dashoffset" values="0;-10" dur=".9s" repeatCount="indefinite"/></path></svg>`;
CARD_SVGS.deplasman_kafilesi=`<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 36C14 29 21 31 25 24C29 17 35 18 40 11" stroke-dasharray="3 3" opacity=".55"><animate attributeName="stroke-dashoffset" values="0;-12" dur="1.2s" repeatCount="indefinite"/></path><path d="M36 8c0 4 4 8 4 8s4-4 4-8a4 4 0 0 0-8 0z"/><circle cx="40" cy="8" r="1.3" fill="currentColor" stroke-width="0"/><g><animateTransform attributeName="transform" type="translate" values="0 0;1 -1;0 0" dur=".8s" repeatCount="indefinite"/><rect x="5" y="20" width="26" height="14" rx="3"/><path d="M9 24h5M18 24h5M27 24h4"/><circle cx="12" cy="35" r="2.7"/><circle cx="26" cy="35" r="2.7"/></g><path d="M7 16h10" opacity=".35"/><path d="M3 12h7" opacity=".25"/></svg>`;
function instantShopPowerDelta(k,variantOverride){
  const v=typeof variantOverride==="number"?variantOverride:variantOf(k);
  const map={
    kurban_belli:v===1?12:6,
    primler_yatinca:v===1?8:4,
    gecici_prim:v===1?12:6,
    kisa_kamp:v===1?6:4,
    buyuk_mac:v===1?10:6
  };
  return Object.prototype.hasOwnProperty.call(map,k)?map[k]:null;
}
function simulateEquipPower(k){const before=squadPower(round).power,instant=instantShopPowerDelta(k);if(instant!==null)return{before,after:before+instant,delta:instant};const oldInv=cardInv[k]||0,oldCards=cards.slice();cardInv[k]=1;if(!oldCards.includes(k)&&!isInstantCard(k)&&cards.length<activeCardSlots())cards=oldCards.concat(k);const after=squadPower(round).power;cardInv[k]=oldInv;cards=oldCards;return{before,after,delta:after-before};}
function simulateCardCopyPower(k){return simulateEquipPower(k);}
/* Shop variant simülasyonu: geçici olarak shopVariants variant'ını ata */
function simulateShopPower(k){const sv=shopVariants[k]||0,old=cardVariant[k]||0;cardVariant[k]=sv;const r=simulateEquipPower(k);cardVariant[k]=old;return r;}
function variantDesc(d,v){
  if(!d)return d;
  const gTag=d.includes("ALTIN:")?"ALTIN:":(d.includes("COMMON:")?"COMMON:":(d.includes("GOLDEN:")?"GOLDEN:":null));
  const dTag=d.includes("KARA:")?"KARA:":(d.includes("DARK:")?"DARK:":null);
  if(!gTag&&!dTag){
    const commonMatch=d.match(/\b(COMMON|GOLDEN|ALTIN)\b/);
    const darkMatch=d.match(/\b(DARK|KARA)\b/);
    if(commonMatch&&darkMatch){
      const gIdx=commonMatch.index,dIdx=darkMatch.index;
      const first=Math.min(gIdx,dIdx);
      const prefix=first>0?d.substring(0,first).trim():"";
      const pre=prefix?prefix+" ":"";
      if(v===0){
        const start=gIdx+commonMatch[0].length,end=dIdx>gIdx?dIdx:d.length;
        return displayCardTerms((pre+d.substring(start,end)).trim().replace(/^[\s:;,.·-]+/,""));
      }
      const start=dIdx+darkMatch[0].length,end=gIdx>dIdx?gIdx:d.length;
      return displayCardTerms((pre+d.substring(start,end)).trim().replace(/^[\s:;,.·-]+/,""));
    }
    return displayCardTerms(d);
  }
  const gIdx=gTag?d.indexOf(gTag):-1;
  const dIdx=dTag?d.indexOf(dTag):-1;
  const prefix=gIdx>0?d.substring(0,gIdx).trim():((gIdx<0&&dIdx>0)?d.substring(0,dIdx).trim():"");
  const pre=prefix?prefix+" ":"";
  if(v===0){
    if(gIdx>=0){const end=dIdx>=0?dIdx:d.length;return displayCardTerms((pre+d.substring(gIdx+(gTag.length),end)).trim());}
    return displayCardTerms(prefix||d);
  } else {
    if(dIdx>=0)return displayCardTerms((pre+d.substring(dIdx+(dTag.length))).trim());
    return displayCardTerms(d);
  }
}
function displayCardTerms(txt){
  if(!txt)return txt;
  return String(txt)
    .replace(/\bGOLDEN\b/g,"COMMON")
    .replace(/\bALTIN\b/g,"COMMON")
    .replace(/\bKARA\b/g,"DARK")
    // Historical copy can contain legacy rating terms. The product-facing
    // label is always Güç / Power, while the underlying numeric stat stays intact.
    .replace(/\bOVR\b/gi,LANG==="tr"?"Güç":"Power")
    .replace(/\bOV\b/gi,LANG==="tr"?"Güç":"Power");
}
function escapeCardText(txt){
  // Use a named apostrophe entity: the numeric form was later matched as a card
  // number and split into markup, leaving a literal &#39; visible in the UI.
  return String(txt||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&apos;"}[ch]));
}
function cardNumberTone(token){
  const t=String(token||"").replace(/\s+/g,"");
  if(/^[+]/.test(t))return "card-num-positive";
  if(/^[-−]/.test(t))return "card-num-negative";
  if(/%/.test(t)){
    const n=Number(t.replace(/[+%€M−-]/g,"").replace(",","."));
    if(Number.isFinite(n)&&n===0)return "card-num-neutral";
    return "card-num-warning";
  }
  return "card-num-neutral";
}
function stripZeroRiskText(txt){
  return String(txt||"")
    .replace(/\s*(?:Ceza riski|Masraf riski|Risk)\s*:?\s*%0\.?/gi,"")
    .replace(/\s*(?:Fine risk|Cost risk|Risk)\s*:?\s*0%\.?/gi,"")
    .replace(/\s{2,}/g," ")
    .replace(/\s+\./g,".")
    .trim();
}
function formatCardDesc(txt){
  const safe=escapeCardText(displayCardTerms(stripZeroRiskText(txt)));
  const re=/\b\d{1,3}\s*-\s*\d{1,3}\b|[+−-]\s*€?\d+(?:[.,]\d+)?M?|[+−-]\s*%\d+(?:[.,]\d+)?|%\d+(?:[.,]\d+)?|[+−-]\s*\d+(?:[.,]\d+)?%|\d+(?:[.,]\d+)?%|€\d+(?:[.,]\d+)?M|\b\d+(?:[.,]\d+)?\b/g;
  return safe.replace(re,m=>`<span class="card-num ${cardNumberTone(m)}">${m}</span>`);
}
function shortCardText(k,activeList){const v=cardEff(k,activeList||picksBySlot.filter(Boolean),round),hint=conditionHint(k);if(v===0&&hint)return hint;return (LANG==="tr"?"Güç":"Power")+": "+(v>=0?"+":"")+v;}
function starCardPowerForVariant(v){
  const s=picksBySlot.filter(Boolean);
  const maxOV=s.length?s.reduce((a,p)=>Math.max(a,p.ov||0),0):0;
  const pow=v===1?(maxOV>=90?14:maxOV>=85?10:maxOV>=80?8:6):(maxOV>=90?10:maxOV>=85?8:maxOV>=80?6:4);
  return {maxOV,pow};
}
function stripCardDrawbacks(text){
 const tr=LANG==="tr";
 const markers=tr?["kimya","g\u00fcven -","finalde -","ihtimal","sonraki ma\u00e7","gelecek pazar","sonraki a\u00e7\u0131k","fiyatlar","sakatl","kovulma","de\u011filse","kart yak"]:["chemistry","trust -","in the final -","chance","next match","next market","next open","prices","injur","sack limit","otherwise","burn one card"];
 const parts=String(text||"").replace(/;/g,".").split(".").map(s=>s.trim()).filter(Boolean);
 const kept=parts.filter(part=>{const low=part.toLocaleLowerCase();return !markers.some(m=>low.includes(m));});
 return (kept.length?kept:parts.slice(0,1)).join(". ")+(kept.length?".":"");
}
function shopCardDesc(k,raw,variantOverride){
  const tr=LANG==="tr";
  const sv=typeof variantOverride==="number"?variantOverride:variantOf(k);
  const specific={
    taraftar:()=>sv===1?(tr?"Taraftar desteği tüm takım gücüne eklenir: 1. tur +3, 2. tur +5, sonraki turlar +6. Satın alırken %25 ihtimalle güven -1; finalde -6 güç.":"Crowd support is added to the whole team: +3 in round 1, +5 in round 2, then +6. 25% chance of trust -1 on purchase; -6 power in the final."):(tr?"Taraftar desteği tüm takım gücüne eklenir: 1. tur +2, 2. tur +3, sonraki turlar +4.":"Crowd support is added to the whole team: +2 in round 1, +3 in round 2, then +4."),
    genc:()=>sv===1?(tr?"Oyuncuları büyütmez; takım gücüne 1. tur +4'ten finalde +9'a kadar artan katkı verir. Finalde -4 güç.":"Does not develop players; adds rising team power from +4 in round 1 to +9 in the final. -4 power in the final."):(tr?"Oyuncuları büyütmez; takım gücüne turun numarası kadar katkı verir: 1. tur +1'den finalde +6'ya.":"Does not develop players; adds the round number to team power: +1 in round 1 through +6 in the final."),
    ch_momentum:()=>sv===1?(tr?"Turnuva ritmini takım gücüne çevirir: 1-2. tur +4, 3-4. tur +6, 5. turdan itibaren +8. Finalde -6 güç.":"Converts tournament rhythm into team power: +4 in rounds 1-2, +6 in rounds 3-4, then +8. -6 power in the final."):(tr?"Turnuva ritmini takım gücüne çevirir: 1-2. tur +2, 3-4. tur +3, 5. turdan itibaren +4.":"Converts tournament rhythm into team power: +2 in rounds 1-2, +3 in rounds 3-4, then +4."),
    altyapi_plani:()=>sv===1?(tr?"İlk 11'deki 23 yaş ve altı oyuncu başına +2 güç (max +6). Finalde -4 güç.":"+2 power per age-23-or-under starter (max +6). -4 in the final."):(tr?"İlk 11'deki 23 yaş ve altı oyuncu başına +1 güç (max +4).":"+1 power per age-23-or-under starter (max +4)."),
    yerli_blok:()=>sv===1?(tr?"İlk 11'deki yerli oyuncu başına +2 güç (max +5). Finalde -3 güç.":"+2 power per local starter (max +5). -3 in the final."):(tr?"İlk 11'deki yerli oyuncu başına +1 güç (max +5).":"+1 power per local starter (max +5)."),
    tecrubeli_omurga:()=>sv===1?(tr?"İlk 11'deki 32 yaş ve üzeri oyuncu başına +2 güç (max +6). Finalde -4 güç.":"+2 power per age-32+ starter (max +6). -4 power in the final."):(tr?"İlk 11'deki 32 yaş ve üzeri oyuncu başına +1 güç (max +4).":"+1 power per age-32+ starter (max +4)."),
    derbi:()=>sv===1?(tr?"İlk 3 tur etkisizdir. Çeyrek final +4, yarı final +7, final +6 güç; satın alırken %25 ihtimalle €7M ek masraf.":"Inactive in the first 3 rounds. +4 in the quarter-final, +7 in the semi-final and +6 in the final; 25% chance of an extra €7M cost on acquisition."):(tr?"İlk 3 tur etkisizdir. Çeyrek final +2, yarı final +4, final +8 verir.":"Inactive in the first 3 rounds. Adds +2 in the quarter-final, +4 in the semi-final and +8 in the final."),
    final_provasi:()=>sv===1?(tr?"Yalnız final maçında +9 takım gücü. Satın alırken %25 ihtimalle €3M ek masraf.":"Final only: +9 team power. 25% chance of an extra €3M cost on acquisition."):(tr?"Yalnız final maçında çalışır ve takım gücüne +5 ekler.":"Works only in the final and adds +5 team power."),
    kanat_akini:()=>sv===1?(tr?"İlk 11'deki kanat/bek başına +2 güç (max +6). Finalde -5 güç.":"+2 power per starting wing/fullback (max +6). -5 in the final."):(tr?"İlk 11'deki kanat/bek başına +1 güç (max +4).":"+1 power per starting wing/fullback (max +4)."),
    anadolu:()=>sv===1?(tr?"Sahadaki 70 altı oyuncu başına +1 güç (max +5). %20 ihtimalle €5M ek masraf.":"+1 power per sub-70 starter (max +5). 20% chance of an extra €5M cost."):(tr?"Sahadaki 70 altı oyuncu başına +1 güç (max +3).":"+1 power per sub-70 starter (max +3)."),
    bu_adam:()=>sv===1?(tr?"Gücü 80-89 olan rastgele bir oyuncuyu yedeğe ekler. %25 ihtimalle €6M ek masraf.":"Adds a random Power 80-89 player to the bench. 25% chance of an extra €6M cost."):(tr?"Gücü 70-79 olan rastgele bir oyuncuyu yedeğe ekler.":"Adds a random Power 70-79 player to the bench."),
    kontra:()=>sv===1?(tr?"Forvet başına +2 güç. %25 ihtimal -€10M ceza.":"Forward +2 each. 25% chance -€10M fine."):(tr?"Forvet başına +1 güç.":"Forward +1 each."),
    buyuk_mac:()=>sv===1?(tr?"Tek maçlık +10 güç. %20 ihtimal -€12M ceza.":"Single-match +10 power. 20% chance -€12M fine."):(tr?"Tek maçlık +6 güç.":"Single-match +6 power."),
    yildiz:()=>{const st=starCardPowerForVariant(sv);return sv===1?(tr?`Gücü ${st.maxOV} olan en iyi oyuncun bu maç +${st.pow} güç verir. %25 ihtimalle -€6M ceza.`:`Your highest-power player (${st.maxOV}) gives +${st.pow} power this match. 25% chance of a -€6M fine.`):(tr?`Gücü ${st.maxOV} olan en iyi oyuncun bu maç +${st.pow} güç verir.`:`Your highest-power player (${st.maxOV}) gives +${st.pow} power this match.`);},
    otobus:()=>sv===1?(tr?"Sahadaki stoper başına +4 güç (max +12). %10 ihtimal -€6M ceza; finalde -3 güç.":"+4 power per starting CB (max +12). 10% chance -€6M fine; -3 in the final."):(tr?"Sahadaki stoper başına +3 güç (max +9).":"+3 power per starting CB (max +9)."),
    kaleci_kalesi:()=>sv===1?(tr?"Kaleci gücü +9. %15 ihtimal -€15M ceza; finalde -8.":"Goalkeeper rating +9. 15% chance -€15M fine; -8 in the final."):(tr?"Kaleci gücü +5.":"Goalkeeper rating +5."),
    deplasman_kafilesi:()=>sv===1?(tr?"Güçlü rakibe karşı +8 güç. Değilse %50 +4 / %50 -4 güç.":"Against stronger opponent: +8 power. Otherwise 50% +4 / 50% -4 power."):(tr?"Güçlü rakibe karşı +4 güç. Değilse +2 güç.":"Against stronger opponent: +4 power. Otherwise +2 power."),
    kisa_kamp:()=>sv===1?(tr?"Bu maç +6 güç. Sonraki maç -4.":"This match +6 power. Next match -4."):(tr?"Bu maç +4 güç. Sonraki maç -2.":"This match +4 power. Next match -2."),
    primler_yatinca:()=>sv===1?(tr?"Şimdi +8 güç. Gelecek tur −€16M.":"Now +8 power. Next round −€16M."):(tr?"Şimdi +4 güç. Gelecek tur −€8M.":"Now +4 power. Next round −€8M."),
    doping:()=>sv===1?(tr?"Her tur +10 güç; güven -1, her tur %25 ihtimal -€25M ve finalde -6 güç.":"+10 power each round; trust -1, 25% chance -€25M each round and -6 in the final."):(tr?"Her tur +6 güç; edinirken %20 güven -1, her tur %35 ihtimal -€15M.":"+6 power each round; 20% trust risk on acquisition and 35% chance -€15M each round."),
    cift_forvet:()=>sv===1?(tr?"İlk 11'deki SNT başına +4 güç (max +8). Finalde -4 güç.":"+4 power per starting ST (max +8). -4 in the final."):(tr?"İlk 11'deki SNT başına +2 güç (max +4).":"+2 power per starting ST (max +4)."),
    gecici_prim:()=>sv===1?(tr?"Bu maç +12 güç. Maç sonu %60 sakatlık riski; sonraki maç -2.":"This match +12 power. 60% injury risk after; next match -2."):(tr?"Bu maç +6 güç. Maç sonu %30 sakatlık riski; sonraki maç -2.":"This match +6 power. 30% injury risk after; next match -2."),
    sahte_evrak:()=>sv===1?(tr?"Her tur +10 güç; güven -1 ve finalde -10 güç.":"+10 power each round; trust -1 and -10 in the final."):(tr?"Her tur +6 güç; edinirken %18 ihtimal güven -1.":"+6 power each round; 18% chance of trust -1 on acquisition."),
    son_kredi:()=>sv===1?(tr?"Kasa -€10M altındaysa +€20M; değilse bekler.":"Below -€10M: +€20M; otherwise waits."):(tr?"Kasa -€10M altındaysa +€15M; değilse bekler.":"Below -€10M: +€15M; otherwise waits."),
    gec_gec:()=>sv===1?(tr?"Rakip güçlüyse +7, değilse +4. Her tur %25 sakatlık riski; finalde -3.":"+7 against a stronger opponent, otherwise +4. 25% injury risk each round; -3 in the final."):(tr?"Rakip güçlüyse +5, değilse +2.":"+5 against a stronger opponent, otherwise +2."),
    kurban_belli:()=>sv===1?(tr?"+12 güç; tur sonunda 2 oyuncu 1 tur sakatlanır. %25 ihtimal -€6M ek ceza.":"+12 power; 2 players injured for 1 round after. 25% chance -€6M extra fine."):(tr?"+6 güç; tur sonunda 1 oyuncu 1 tur sakatlanır.":"+6 power; 1 player injured for 1 round after."),
    kara_borsa:()=>sv===1?(tr?"2 bedava kalıcı kart verir. %40 ihtimal -€10M ceza.":"Grants 2 free persistent cards. 40% chance -€10M fine."):(tr?"1 bedava COMMON kalıcı kart verir.":"Grants 1 free COMMON persistent card."),
    nasip_kismet:()=>sv===1?(tr?"Sonraki tur kart fiyatları -%40. %25 ihtimal -€4M ceza.":"Next-round card prices -40%. 25% chance -€4M fine."):(tr?"Sonraki tur kart fiyatları -%25.":"Next-round card prices -25%."),
    yildiz_krizi:()=>sv===1?(tr?"Medya baskısı bu maç +4 güç verir. %20 ihtimal -€4M ceza.":"Media pressure grants +4 power this match. 20% chance -€4M fine."):(tr?"Medya ilgisi bu maç +3 güç verir.":"Media attention grants +3 power this match."),
    taksit_transfer:()=>sv===1?(tr?"Hemen +€18M. Sonraki 2 tur -€7M; güven -1 ve finalde -6.":"+€18M now. -€7M for the next 2 rounds; trust -1 and -6 in the final."):(tr?"Hemen +€10M. Sonraki 2 tur -€4M.":"+€10M now. -€4M for the next 2 rounds."),
    kriz:()=>sv===1?(tr?"Toplam final cezasının %75'ini telafi eder. %20 ihtimalle €5M ek masraf.":"Offsets 75% of the total final penalty. 20% chance of an extra €5M cost."):(tr?"Toplam final cezasının %50'sini telafi eder.":"Offsets 50% of the total final penalty."),
    vur_igneyi:()=>sv===1?(tr?"2 sakat oyuncuyu iyileştirir. %25 ihtimal -€6M ek masraf. Sakat yoksa kart iade edilir.":"Heals 2 injured players. 25% chance -€6M extra cost. Refunded if no one is injured."):(tr?"1 sakat oyuncuyu iyileştirir. Sakat yoksa kart iade edilir.":"Heals 1 injured player. Refunded if no one is injured."),
    kasiga_para:()=>sv===1?(tr?"Rakip -8 güç. Gelecek pazar kapalı; sonraki açık pazarda fiyatlar +%50, güven -1.":"Opponent -8 power. Next market closes; the next open market has +50% prices, trust -1."):(tr?"Rakip -4 güç. Gelecek pazar kapalı; sonraki açık pazarda fiyatlar +%25.":"Opponent -4 power. Next market closes; the next open market has +25% prices.")
  };
  // These two cards spend team resources as well as applying their match effect.
  // Keep the text here in sync with CARD_COST_META, rather than hiding the price in a tooltip.
  specific.yildiz_krizi=()=>sv===1?(tr?"Bu maç +4 güç. Kimya -2; %20 ihtimal -€4M medya cezası.":"+4 power this match. Chemistry -2; 20% chance of a €4M media fine."):(tr?"Bu maç +3 güç. Kimya -1.":"+3 power this match. Chemistry -1.");
  specific.kasiga_para=()=>sv===1?(tr?"Rakip -8 güç. Kimya -1, güven -1; sonraki açık pazarda fiyatlar +%50.":"Opponent -8 power. Chemistry -1, trust -1; next open market prices +50%."):(tr?"Rakip -4 güç. Kimya -1; sonraki açık pazarda fiyatlar +%25.":"Opponent -4 power. Chemistry -1; next open market prices +25%.");
  specific.kara_borsa=()=>sv===1?(tr?"Bir kart yak; 2 kart al. %35 ihtimal -€10M ceza.":"Burn one card; take 2 cards. 35% chance of a €10M fine."):(tr?"Bir kart yak; 2 kalıcı kart al.":"Burn one card; take 2 persistent cards.");
  if(specific[k])return stripCardDrawbacks(stripZeroRiskText(specific[k]()));
  const txt=(raw||shortCardText(k,picksBySlot.filter(Boolean))||"").replace(/\s+/g," ").trim();
  if(!txt)return"";
  return displayCardTerms(stripZeroRiskText(txt.replace(/; ?/g," · ")));
}
function conditionHint(k){
 const s=picksBySlot.filter(Boolean),tr=LANG==="tr";
 const countPos=arr=>s.filter(p=>p&&arr.includes(p.pos)).length;
 const map={
  yerli_blok:()=>`${tr?"Yerli":"Locals"}: ${s.filter(p=>p.tr).length}/${variantOf("yerli_blok")===1?3:5}`,
  altyapi_plani:()=>`${tr?"U23":"U23"}: ${s.filter(p=>p.age<=23).length}/${variantOf("altyapi_plani")===1?3:4}`,
  tecrubeli_omurga:()=>`${tr?"İlk 11'de 32+":"Age-32+ starters"}: ${s.filter(p=>p.age>=32).length}/${variantOf("tecrubeli_omurga")===1?3:4}`,
  cift_forvet:()=>`${tr?"Santrfor":"Strikers"}: ${s.filter(p=>p.pos==="ST").length}/2`,
  kanat_akini:()=>`${tr?"Kanat/bek":"Wing/WB"}: ${countPos(["LW","RW","LM","RM","WB","LB","RB","SLA","SĞA","SGA","SLB","SĞB","SGB","SLK","SĞK","SGK"])}/${variantOf("kanat_akini")===1?3:4}`,
  otobus:()=>`${tr?"Stoper":"CB"}: ${s.filter(p=>p.pos==="CB").length}/3`,
  kontra:()=>`${tr?"Forvet":"Forwards"}: ${cnt(s,FWDP)}`,
  anadolu:()=>`${tr?"Sahadaki 70 altı":"Sub-70 starters"}: ${s.filter(p=>p&&p.ov<70).length}/${variantOf("anadolu")===1?5:3}`,
  kaleci_kalesi:()=>{const gk=s.find(p=>p.pos==="GK");return `${tr?"Kaleci":"Goalkeeper"}: ${gk?gk.ov+" "+(tr?"GÜÇ":"POWER"):(tr?"yok":"none")}`;},
  buyuk_mac:()=>`${tr?"Aktif tur":"Active round"}: ${round}/4`,
  ch_final:()=>`${tr?"Yarı/Final'de aktif":"Active in Semi/Final"}: ${round>=5?(tr?"hazır":"ready"):(tr?"tur 5'te":"from round 5")}`
 };
 return map[k]?map[k]():"";
}
function cardContractText(k){
  const tr=LANG==="tr",v=cardEff(k,picksBySlot.filter(Boolean),round),plus=(v>=0?"+":"")+v;
  const map={
    taraftar:tr?"Taraftar desteği tüm takıma bu tur "+plus+" güç veriyor.":"Crowd support gives the whole team "+plus+" power this round.",
    genc:tr?"Oyuncular büyümez; kart bu tur takım gücüne "+plus+" ekliyor.":"Players do not grow; the card adds "+plus+" to team power this round.",
    kontra:tr?"Forvet başına +1; şu an "+plus+".":"Forward +1 each; now "+plus+".",
    otobus:variantOf(k)===1?(tr?"Stoper başına +4, max +12; şu an "+plus+".":"CB +4 each, max +12; now "+plus+"."):(tr?"Stoper başına +3, max +9; şu an "+plus+".":"CB +3 each, max +9; now "+plus+"."),
    anadolu:variantOf(k)===1?(tr?"Sahadaki 70 altı başına +1, max +5; şu an "+plus+".":"Sub-70 starter +1 each, max +5; now "+plus+"."):(tr?"Sahadaki 70 altı başına +1, max +3; şu an "+plus+".":"Sub-70 starter +1 each, max +3; now "+plus+"."),
    yildiz:(()=>{const st=starCardPowerForVariant(variantOf("yildiz"));return tr?`Gücü ${st.maxOV} olan en iyi oyuncun: bu maç +${st.pow} güç.`:`Your highest-power player (${st.maxOV}): +${st.pow} power this match.`;})(),
    derbi:round<4?(tr?"İlk 3 tur etkisiz; çeyrek finalde açılır.":"Inactive for the first 3 rounds; activates in the quarter-final."):(tr?"Büyük maç bonusu bu tur "+plus+".":"Big-match bonus is "+plus+" this round."),
    ch_momentum:tr?"Turnuva ritmi bu tur takım gücüne "+plus+" ekliyor.":"Tournament rhythm adds "+plus+" to team power this round.",
    buyuk_mac:variantOf(k)===1?(tr?"Tek maçlık +10 güç; %20 ihtimal -€12M ceza.":"Single-match +10 power; 20% chance -€12M fine."):(tr?"Tek maçlık +6 güç.":"Single-match +6 power."),
    kaleci_kalesi:variantOf(k)===1?(tr?"Kaleci gücü +9; %15 ihtimal -€15M, final -8.":"Goalkeeper +9; 15% chance -€15M, final -8."):(tr?"Kaleci gücü +5.":"Goalkeeper +5."),
    ch_final:tr?"Yarı finalde +3, finalde +6; şu an "+plus+".":"Semi-final +3, final +6; now "+plus+".",
    cilgin_basin:tr?"%60 ihtimal +€15M; %40 ihtimal -€10M; kart kaybolur.":"60% +€15M; 40% -€10M; card expires.",
    temiz_sayfa:tr?"Sakatlık riski -%30; güç +0.":"Injury risk -30%; power +0.",
    kisa_kamp:variantOf(k)===1?(tr?"Bu maç +6 güç; sonraki maç -4; kart kaybolur.":"This match +6 power; next match -4; card expires."):(tr?"Bu maç +4 güç; sonraki maç -2; kart kaybolur.":"This match +4 power; next match -2; card expires."),
    primler_yatinca:variantOf(k)===1?(tr?"Bu tur +8 güç; gelecek tur −€16M.":"This round +8 power; next round −€16M."):(tr?"Bu tur +4 güç; gelecek tur −€8M.":"This round +4 power; next round −€8M."),
    taksit_transfer:variantOf(k)===1?(tr?"Hemen +€18M; sonraki 2 tur -€7M, güven -1.":"+€18M now; -€7M for 2 rounds, trust -1."):(tr?"Hemen +€10M; sonraki 2 tur -€4M.":"+€10M now; -€4M for 2 rounds."),
    kara_borsa:variantOf(k)===1?(tr?"2 bedava kalıcı kart; %40 ihtimal -€10M.":"2 free persistent cards; 40% chance -€10M."):(tr?"1 bedava COMMON kalıcı kart.":"1 free COMMON persistent card."),
    sahte_evrak:variantOf(k)===1?(tr?"Her tur +10 güç; güven -1, finalde -10.":"+10 each round; trust -1, -10 in final."):(tr?"Her tur +6 güç; edinirken %18 güven riski.":"+6 each round; 18% trust risk on acquisition."),
    son_kredi:variantOf(k)===1?(tr?"Kasa -€10M altındaysa +€20M; güven -1, kovulma eşiği €5M daralır.":"Below -€10M: +€20M; trust -1, sack limit tightens €5M."):(tr?"Kasa -€10M altındaysa +€15M; kovulma eşiği €5M daralır.":"Below -€10M: +€15M; sack limit tightens €5M."),
    altyapi_plani:variantOf(k)===1?(tr?"23 yaş ve altı başına +2, max +6; finalde -4; şu an "+plus+".":"Age 23 or under +2 each, max +6, final -4; now "+plus+"."):(tr?"23 yaş ve altı başına +1, max +4; şu an "+plus+".":"Age 23 or under +1 each, max +4; now "+plus+"."),
    tecrubeli_omurga:variantOf(k)===1?(tr?"İlk 11'deki 32+ başına +2, max +6; şu an "+plus+".":"Age-32+ starter +2 each, max +6; now "+plus+"."):(tr?"İlk 11'deki 32+ başına +1, max +4; şu an "+plus+".":"Age-32+ starter +1 each, max +4; now "+plus+"."),
    yerli_blok:variantOf(k)===1?(tr?"Yerli başına +2, max +5; finalde -3; şu an "+plus+".":"Local starter +2 each, max +5, final -3; now "+plus+"."):(tr?"Yerli başına +1, max +5; şu an "+plus+".":"Local starter +1 each, max +5; now "+plus+"."),
    kanat_akini:variantOf(k)===1?(tr?"Kanat/bek başına +2, max +6; finalde -5; şu an "+plus+".":"Wing/fullback +2 each, max +6, final -5; now "+plus+"."):(tr?"Kanat/bek başına +1, max +4; şu an "+plus+".":"Wing/fullback +1 each, max +4; now "+plus+"."),
    cift_forvet:variantOf(k)===1?(tr?"SNT başına +4, max +8; şu an "+plus+".":"ST +4 each, max +8; now "+plus+"."):(tr?"SNT başına +2, max +4; şu an "+plus+".":"ST +2 each, max +4; now "+plus+"."),
    deplasman_kafilesi:tr?"Güçlü rakibe karşı +4; hemen -€3M, şu an "+plus+".":"Against stronger opponent +4; instant -€3M, now "+plus+".",
    sosyal_medya:tr?"Underdog +3; favori -2, şu an "+plus+".":"Underdog +3; favourite -2, now "+plus+".",
    final_provasi:variantOf(k)===1?(tr?"Yalnız finalde çalışır; +9 takım gücü.":"Final only; +9 team power."):(tr?"Yalnız finalde çalışır; +5 takım gücü.":"Final only; +5 team power."),
    kupaci_kadro:tr?"Yarı final/final +4; finalde -2 güç.":"Semi/final +4; final -2 power.",
    sogukkanli_penaltici:tr?"Beraberlikte tur geçme şansı +%15; güç +0.":"Draw advance chance +15%; power +0.",
    son_dans:variantOf(k)===1?(tr?"Yalnızca finalde: ilk 11'de sakat yoksa +14; en az 1 sakat varsa -8 güç.":"Final only: +14 with no injured starter; -8 with at least 1."):(tr?"Yalnızca finalde: ilk 11'de sakat yoksa +8; en az 1 sakat varsa +2 güç.":"Final only: +8 with no injured starter; +2 with at least 1."),
    kumarbaz:variantOf(k)===1?(tr?"Şimdi +€25M; sonraki 2 turda -€10M öde. Güven -1.":"Now +€25M; pay -€10M for the next 2 rounds. Trust -1."):(tr?"Şimdi +€15M; sonraki 2 turda -€5M öde.":"Now +€15M; pay -€5M for the next 2 rounds."),
    gecici_prim:variantOf(k)===1?(tr?"Bu maç +12 güç; maç sonu %60 sakatlık riski; sıradaki maç -2; kart kaybolur.":"This match +12 power; 60% injury risk after; next match -2; card expires."):(tr?"Bu maç +6 güç; maç sonu %30 sakatlık riski; sıradaki maç -2; kart kaybolur.":"This match +6 power; 30% injury risk after; next match -2; card expires."),
    kurban_belli:variantOf(k)===1?(tr?"+12 güç; tur sonunda 2 oyuncu 1 tur sakatlanır; %25 ihtimal -€6M ek ceza.":"+12 power; 2 players injured for 1 round after; 25% chance -€6M extra fine."):(tr?"+6 güç; tur sonunda 1 oyuncu 1 tur sakatlanır.":"+6 power; 1 player injured for 1 round after."),
    doping:variantOf(k)===1?(tr?"Her tur +10 güç; güven -1, %25 ihtimal -€25M, finalde -6.":"+10 each round; trust -1, 25% chance -€25M, final -6."):(tr?"Her tur +6 güç; edinirken %20 güven riski, %35 ihtimal -€15M.":"+6 each round; 20% trust risk on acquisition, 35% chance -€15M."),
    gec_gec:variantOf(k)===1?(tr?"Rakip güçlüyse +7, değilse +4; her tur %25 sakatlık, finalde -3.":"+7 vs stronger, otherwise +4; 25% injury each round, final -3."):(tr?"Rakip güçlüyse +5, değilse +2.":"+5 vs stronger, otherwise +2."),
    bu_adam:variantOf(k)===1?(tr?"Gücü 80-89 olan rastgele bir oyuncuyu yedeğe ekler.":"Adds a random Power 80-89 player to the bench."):(tr?"Gücü 70-79 olan rastgele bir oyuncuyu yedeğe ekler.":"Adds a random Power 70-79 player to the bench."),
    kriz:variantOf(k)===1?(tr?"Toplam final cezasının %75'ini telafi eder.":"Offsets 75% of the total final penalty."):(tr?"Toplam final cezasının %50'sini telafi eder.":"Offsets 50% of the total final penalty."),
    kasiga_para:variantOf(k)===1?(tr?"Rakip -8 güç. Gelecek pazar kapalı; sonraki açık pazarda fiyatlar +%50, başkan güveni -1.":"Opponent -8 power. Next market closes; the next open market has +50% prices, chairman trust -1."):(tr?"Rakip -4 güç. Gelecek pazar kapalı; sonraki açık pazarda fiyatlar +%25.":"Opponent -4 power. Next market closes; the next open market has +25% prices.")
  };
  return map[k]||((tr?"Net güç ":"Net power ")+plus+".");
}
function renderCollectionFilters(){const el=$("collectionFilters");if(!el)return;const items=[["all",LT("Tümü","All","Todas","Alle","Tutte")],["open",LT("Açık","Open","Disponibles","Offen","Disponibili")],["active",LT("Aktif","Active","Activas","Aktiv","Attive")]];if(collFilter==="near")collFilter="all";el.innerHTML=items.map(([id,label])=>`<button class="${collFilter===id?"on":""}" onclick="collFilter='${id}';renderCollection()">${label}</button>`).join("");}
function collectionPass(k){const c=invOf(k),active=hasCard(k);if(collFilter==="open")return c>0;if(collFilter==="active")return active;return true;}
function renderCollection(){const grid=$("collectionGrid");if(!grid)return;const x=L(),s=picksBySlot.filter(Boolean),cap=activeCardSlots();let owned=0,shown=0;grid.innerHTML="";renderCollectionFilters();allCardKeys().forEach(k=>{const cd=x.cards[k];if(!cd||isInstantCard(k))return;const c=invOf(k),open=c>0,active=hasCard(k),cat=CATMAP[k]||"gorev",v=variantOf(k);if(open)owned++;if(!collectionPass(k))return;shown++;const pv=open?simulateEquipPower(k):null,locked=!open;const equipLine=active?(LANG==="tr"?"✓ aktif — çıkarmak için tıkla":"✓ active — click to remove"):(open?(cards.length<cap?(x.ui.clickEquip):(x.ui.slotFull)):(x.ui.unlockFrom));const preview=open&&!active&&cards.length<cap?`<div class="powerpreview cc-preview">${LANG==="tr"?"Takarsan":"Equip"}: ${pv.before} → ${pv.after}</div>`:"";const desc=formatCardDesc(open?(variantDesc(cd.d,v)||shortCardText(k,s)):(LANG==="tr"?"Pazardan açılır":"Unlock in market"));const d=document.createElement("div");d.className="collcard v"+v+" cat-"+cat+(locked?" locked":"")+(active?" active":"");d.title=cd.n+" · "+kindLabel(k)+"\n"+cardContractType(k);d.innerHTML=`<div class="cc-head"><span class="cc-rar var-badge var-${v}">${open?variantBadge(v):(LANG==="tr"?"KİLİTLİ":"LOCKED")}</span><span class="cc-kind">${open?kindLabel(k):""}</span></div><div class="cc-art">${open?(CARD_SVGS[k]||cd.i):LOCK_SVG}</div><div class="cc-body"><div class="cc-name">${open?cd.n:(x.ui.lockedCard)}</div><div class="cc-desc">${desc}</div>${preview}</div><div class="cc-foot"><span class="cc-state">${equipLine}</span>${active?'<span class="cc-dot"></span>':""}</div>`;if(open)d.onclick=()=>toggleCardActive(k);grid.appendChild(d);});const cc=$("collCount");if(cc)cc.textContent=" "+owned+"/"+allCardKeys().filter(k=>!isInstantCard(k)).length+(shown!==allCardKeys().length?" · "+shown:"");}
function renderDebtWarning(){const el=$("debtWarn");if(el){el.className="debtwarn hidden";el.textContent="";}const ps=$("pintiSavingsBar");if(ps)ps.remove();const clash=document.getElementById("cardClashWarn");if(clash)clash.remove();}
function renderHub(){if(typeof _currentCaptainPlayer==="function")_currentCaptainPlayer();try{if(typeof _saveState==="function")_saveState();}catch(e){}const x=L(),sp=squadPower(round),s=picksBySlot.filter(Boolean);
  $("roundtag").textContent=x.rounds[round-1]+" · "+x.vsword+" "+opponent.name;
  {const wm=$("vsMid");if(wm){const we=currentWeather?currentWeather.e:"";const wn=currentWeather?(LANG==="tr"?currentWeather.tr:currentWeather.en):"";const bases=[8000,14000,22000,34000,52000,75000];const b=bases[Math.min(5,round-1)];const aud=Math.round(b*(0.65+Math.min(0.33,Math.max(0,(sp.power-(opponent?opponent.power:0))/100)))/1000)*1000;const _diff=sp.power-(opponent?opponent.power:0);const _sig=_diff>=10?{t:LANG==="tr"?"Favori":"Favourite",c:"#4ade80"}:_diff<=-10?{t:LANG==="tr"?"Dezavantajlı":"Underdog",c:"#f97316"}:{t:LANG==="tr"?"Dengeli":"Even",c:"#e6ad2e"};wm.innerHTML=`<div class="vs-vs">VS</div>${we?`<div class="vsweather">${we} ${wn}</div>`:"<div class='vsweather'></div>"}<div class="vs-sig" style="font-family:var(--mono);font-size:8px;font-weight:700;letter-spacing:1px;color:${_sig.c};text-transform:uppercase;margin:2px 0">${_sig.t}</div><div class="vsaud"><svg viewBox="0 0 20 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" width="13" height="10"><circle cx="6" cy="4.5" r="2.8"/><circle cx="14" cy="4.5" r="2.8"/><path d="M1 13Q1 9 6 9Q11 9 11 13"/><path d="M13 9.5Q17 9 18.5 13" stroke-opacity=".5"/></svg> ${(aud/1000).toFixed(0)}K ${LANG==="tr"?"seyirci":"fans"}</div><div class="vsround">${x.rounds[round-1]}</div>`;}}
  {const mkShield=(bg,border,fg,lbl)=>{const sec=border||fg;return `<svg viewBox="0 0 44 52" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="sc"><path d="M22 2L41 9L41 28Q41 44 22 50Q3 44 3 28L3 9Z"/></clipPath></defs>
    <path d="M22 2L41 9L41 28Q41 44 22 50Q3 44 3 28L3 9Z" fill="${bg}"/>
    <rect x="3" y="18" width="38" height="32" fill="${sec}" opacity="0.18" clip-path="url(#sc)"/>
    <line x1="3" y1="18" x2="41" y2="18" stroke="${fg}" stroke-width="1" opacity="0.3"/>
    <path d="M22 5L38 10.5L38 27Q38 42 22 48Q6 42 6 27L6 10.5Z" fill="none" stroke="${fg}" stroke-width="0.7" opacity="0.28"/>
    <path d="M22 2L41 9L41 28Q41 44 22 50Q3 44 3 28L3 9Z" fill="none" stroke="${border}" stroke-width="2.2"/>
    <path d="M22 2.5L40 9L40 19Q33 23 22 23Q11 23 4 19L4 9Z" fill="rgba(255,255,255,0.07)" clip-path="url(#sc)"/>
    <circle cx="9" cy="10" r="1.2" fill="${fg}" opacity="0.35"/>
    <circle cx="35" cy="10" r="1.2" fill="${fg}" opacity="0.35"/>
    <text x="22" y="37" text-anchor="middle" font-family="monospace" font-size="14" font-weight="900" fill="${fg}" letter-spacing="0.5">${lbl}</text>
  </svg>`;}
  const yc2=$("youCrest");if(yc2){const own=window.CopaClubVisuals&&window.CopaClubVisuals.crestFor(teamName||"XI"),lbl=own?own.code:(teamName||"XI").replace(/\s+/g,"").slice(0,2).toUpperCase();yc2.innerHTML=mkShield(kit.bg,kit.sec||kit.fg,kit.fg,lbl);}const oc2=$("oppCrest");if(oc2&&opponent){const _lm={ENG:typeof CLUB_LOGOS_EN!=="undefined"?CLUB_LOGOS_EN:{},ES:typeof CLUB_LOGOS_ES!=="undefined"?CLUB_LOGOS_ES:{},IT:typeof CLUB_LOGOS_IT!=="undefined"?CLUB_LOGOS_IT:{},DE:typeof CLUB_LOGOS_DE!=="undefined"?CLUB_LOGOS_DE:{},JP:typeof CLUB_LOGOS_JP!=="undefined"?CLUB_LOGOS_JP:{}},_logoMap=_lm[selectedCountry]||(typeof CLUB_LOGOS!=="undefined"?CLUB_LOGOS:{}),logo=window.COPA_PLATFORM!=="android"&&_logoMap[opponent.name];if(logo){oc2.innerHTML=`<img src="${logo}" class="club-logo" alt="${opponent.name}">`;}else{const crest=window.CopaClubVisuals&&window.CopaClubVisuals.crestFor(opponent.name),lbl=crest?crest.code:opponent.name.replace(/\s+/g,"").slice(0,2).toUpperCase(),colors=crest?crest.colors:["#C84B36","#a03025"];oc2.innerHTML=mkShield(colors[0],colors[1],"#f5f0e8",lbl);}}}
  const _pwCol=v=>v>=90?"#15803d":v>=80?"#4ade80":v>=70?"#eab308":v>=60?"#f97316":"#ef4444";
  {const el=$("youPw");if(el){el.textContent=sp.power;el.style.color=_pwCol(sp.power);}}
  $("youNm").textContent=teamName||"XI";$("oppNm").textContent=opponent.name;
  {const el=$("oppPw");if(el){el.textContent=opponent.power;el.style.color=_pwCol(opponent.power);}}
  $("youLbl").textContent=x.youLbl;$("oppLbl").textContent=x.oppLbl;$("shopLbl").innerHTML=`<span style="display:flex;align-items:center;gap:6px"><span><svg viewBox="0 0 18 16" width="12" height="11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.1em;margin-right:4px"><rect x="1" y="5" width="11" height="10" rx="1.5"/><rect x="4" y="2.5" width="11" height="10" rx="1.5" fill="var(--paper2)"/><rect x="6" y="0" width="11" height="10" rx="1.5" fill="var(--paper2)"/></svg>${x.shopLbl}</span><button onclick="event.stopPropagation();shopReroll()" title="${LANG==="tr"?"Yenile":"Reroll"}" style="background:none;border:1px solid var(--border-subtle);border-radius:4px;padding:2px 4px;cursor:pointer;color:var(--color-slate);display:inline-flex;align-items:center;justify-content:center;line-height:1"><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8a6 6 0 1 0 1.5-4"/><path d="M2 4v4h4"/></svg></button></span>`;$("feedHdr").innerHTML=`<span class="tclive">●</span> <span>${x.feedHdr}</span>`;$("powHdr").innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" style="vertical-align:-.1em;margin-right:3px"><path d="M3 12h4.5l1.5 -6l4 12l2 -9l1.5 3h4.5"/></svg>${x.powHdr}`;$("powV").textContent=sp.power;powerHist[round-1]=sp.power;
  {const rb=$("shopLbl")&&$("shopLbl").querySelector("button");if(rb)rb.innerHTML=`<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7a6 6 0 0 0-10.5-2.5L4 6"/><path d="M4 3v3h3"/><path d="M4 13a6 6 0 0 0 10.5 2.5L16 14"/><path d="M16 17v-3h-3"/></svg>`;}
  {const isGhost=!!(opponent&&opponent.ghost),nm=$("oppNm"),metaId="ghostMeta";let meta=$(metaId);if(!meta&&nm&&nm.parentElement){meta=document.createElement("div");meta.id=metaId;meta.className="ghost-meta";nm.parentElement.appendChild(meta);}if(meta){meta.classList.toggle("hidden",!isGhost);meta.textContent="";if(isGhost){const gm=opponent.ghostMeta||{},icon=document.createElement("span"),copy=document.createElement("span"),report=document.createElement("button");icon.setAttribute("aria-hidden","true");icon.innerHTML=window.GhostClubs?window.GhostClubs.ghostIcon():"";copy.textContent=[LANG==="tr"?"Ger\u00e7ek oyuncu run'\u0131":"Real player run",gm.formation,gm.chairman,gm.country,gm.publicId].filter(Boolean).join(" \u00b7 ");report.type="button";report.className="ghost-report-btn";report.textContent=LANG==="tr"?"BU KULÜBÜ BİLDİR":"REPORT CLUB";report.onclick=()=>{window.GhostClubs.reportGhost(gm.publicId).then(result=>{if(result&&result.hidden){if(typeof showToast==="function")showToast(LANG==="tr"?"Kulüp bildirildi ve gizlendi.":"Club reported and hidden.");if(meta)meta.classList.add("hidden");}});};meta.append(icon,copy,report);}}if(isGhost){$("oppLbl").textContent=LANG==="tr"?"HAYALET KUL\u00dcP":"GHOST CLUB";}}
  {$("powHint").textContent=x.powHint;}$("chemHdr").innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" style="vertical-align:-.1em;margin-right:3px"><path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1"/><path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M17 10h2a2 2 0 0 1 2 2v1"/><path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M3 13v-1a2 2 0 0 1 2 -2h2"/></svg>${x.chem.hdr}`;
  {const cb=chemBonus(s);const cvClamped=Math.max(-5,Math.min(5,cb.total));$("chemV").textContent=(cvClamped>=0?"+":"")+cvClamped;$("chemList").innerHTML=x.powHint;const hp=$("hubPitch");if(hp){hp.classList.toggle("chem-high",cvClamped>=3);hp.classList.toggle("chem-low",cvClamped<0);}
   const ct=$("chemTile");if(ct){const cv=cvClamped;const cbg=cv<0?"#ef4444":cv===0?"#f97316":cv<=1?"#eab308":cv<=2?"#4ade80":"#16c96b";const cfg=cv<=1&&cv>=0?"var(--ink)":"#fff";ct.style.background=cbg;[ct.querySelector(".mh"),ct.querySelector(".mv"),ct.querySelector(".ms")].forEach(el=>{if(el)el.style.color=cfg;});}}
  /* Kasa tile — rich finance card */
  {const kt=$("kasaTile");if(kt){
    const bv=budget;
    const tr2=LANG==="tr";
    /* debt limit for active chairman */
    const debtLim=chairman&&typeof chairmanSackLimit==="function"?chairmanSackLimit():DEBT_LIMIT;
    /* background state */
    const nearLimit=debtLim&&bv<0&&(bv<=-18||Math.abs(bv)>=Math.abs(debtLim)*0.62);
    let statusLabel,subText,kasaState;
    if(nearLimit){
      kasaState="kasa-deep-debt";
      statusLabel=tr2?"KASA SINIRDA":"CASH CRITICAL";
      subText=tr2?`Borç limitine €${Math.abs(debtLim)-Math.abs(bv)}M kaldı`:`€${Math.abs(debtLim)-Math.abs(bv)}M to debt limit`;
    }else if(bv<0){
      kasaState="kasa-debt";
      statusLabel=tr2?"KASA BORÇTA":"CASH IN DEBT";subText="";
    }else if(bv<=3){
      kasaState="kasa-zero";
      statusLabel=tr2?"KASA SINIRDA":"CASH LOW";subText="";
    }else if(bv<20){
      kasaState="kasa-positive";
      statusLabel=tr2?"KASA DENGEDE":"CASH BALANCED";subText="";
    }else{
      kasaState="kasa-rich";
      statusLabel=tr2?"KASA RAHAT":"CASH HEALTHY";subText="";
    }
    kt.classList.remove("kasa-deep-debt","kasa-debt","kasa-zero","kasa-positive","kasa-rich");
    kt.classList.add(kasaState);
    kt.style.background="";kt.style.color="";kt.style.borderColor="";
    subText="";
    const vEl=$("kasaV");if(vEl)vEl.textContent=(bv>=0?"+":"−")+"€"+Math.abs(bv)+"M";
    const subEl=$("kasaSub");if(subEl)subEl.textContent=subText;
    const stEl=$("kasaStatus");if(stEl){stEl.textContent=statusLabel;stEl.style.background="";stEl.style.color="";}
    const dEl=$("kasaDebt");if(dEl)dEl.textContent="−€"+Math.abs(debtLim)+"M";
    /* progress bar marker */
    const _total=Math.abs(debtLim)+30;const _pos=Math.max(0,Math.min(1,(bv-debtLim)/_total));
    const marker=$("kasaBarMarker");if(marker)marker.style.left=(_pos*100).toFixed(1)+"%";
    const zero=$("kasaZero");if(zero)zero.style.left=(Math.abs(debtLim)/_total*100).toFixed(1)+"%";
  }}
  /* Başkan Güveni tile */
  {const tt=$("trustTile");if(tt){const tv=typeof chairTrust!=="undefined"?chairTrust:3;const tbg=tv>=3?"#429A73":tv>=2?"#eab308":tv>=1?"#f97316":"#ef4444";const tfg="var(--color-ink)";const tdots="●".repeat(tv)+"○".repeat(Math.max(0,3-tv));tt.classList.add("context-metric");tt.style.setProperty("--metric-accent",tbg);tt.style.background="";const trustV=$("trustV"),trustHint=$("trustHint");if(trustV){trustV.textContent=tdots;trustV.style.color=tbg;trustV.style.fontSize="14px";trustV.style.letterSpacing="4px";}const th=$("trustHdr");if(th)th.style.color=tfg;if(trustHint){trustHint.textContent=tv>=3?(LANG==="tr"?"güvende":"secure"):tv>=2?(LANG==="tr"?"dengede":"steady"):tv>=1?(LANG==="tr"?"kırılgan":"fragile"):(LANG==="tr"?"tehlikede":"at risk");trustHint.style.color=tfg;}}}
  {const info=$("trustInfoBtn");if(info){const label=LT("Başkan güveni nasıl çalışır?","How does chairman trust work?","¿Cómo funciona la confianza del presidente?","Wie funktioniert das Vertrauen des Präsidenten?","Come funziona la fiducia del presidente?");info.title=label;info.setAttribute("aria-label",label);}}
  {const pv=sp.power,oppPv=opponent?opponent.power:0;const pt=$("powTile");if(pt){
    const pbg=pv>=90?"#15803d":pv>=80?"#4ade80":pv>=70?"#eab308":pv>=60?"#f97316":"#ef4444";
    const pfg="var(--color-ink)";
    pt.classList.add("context-metric");
    pt.style.setProperty("--metric-accent",pbg);
    pt.style.background="";
    const _total=Math.max(pv+oppPv,1);const _yPct=Math.round(pv/_total*100);const _oPct=100-_yPct;
    const _oppBarCol=oppPv>=pv?"rgba(255,100,100,.45)":"rgba(0,0,0,.18)";
    const _youBarCol=pfg==="#000"?"rgba(0,0,0,.3)":"rgba(255,255,255,.45)";
    const _bonuses=[{l:LANG==="tr"?"Kart":"Card",v:Math.round(sp.cardBonus||0)},{l:LANG==="tr"?"Stil":"Style",v:Math.round(sp.styleBonus||0)},{l:"Kimya",v:Math.round(sp.chem||0)},{l:LANG==="tr"?"Risk":"Risk",v:Math.round(sp.risk||0)}];
    const _top=_bonuses.filter(b=>b.v!==0).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v))[0];
    const _vsBar=`<div style="display:flex;height:3px;overflow:hidden;margin-top:5px;gap:1px"><div style="flex:${_yPct};background:${_youBarCol}"></div><div style="flex:${_oPct};background:${_oppBarCol}"></div></div>`;
    pt.innerHTML=`<button class="mtile-info" onclick="event.stopPropagation();showPowerInfo()" title="${LANG==="tr"?"Kadro gücü nasıl hesaplanır?":"How is squad power calculated?"}" style="color:${pfg};border-color:${pfg};opacity:.55">?</button><div class="mh" id="powHdr" style="color:${pfg};opacity:.8">${LANG==="tr"?"KADRO GÜCÜ":"SQUAD POWER"}</div><div class="mv" id="powV" style="color:${pfg};font-size:22px;line-height:1.05">${pv}</div><div class="ms" id="powHint" style="color:${pfg};opacity:.75">${x.powHint}</div>${_vsBar}`;
  }}
  {const os=$("oppStars"),oc=$("oppChar"),ys=$("youStars"),yc=$("youChar");if(os)os.textContent="★".repeat(starsOf(opponent.power));if(oc&&oppChar)oc.innerHTML=oppChar.e+" "+oppChar.l;if(ys)ys.textContent="★".repeat(starsOf(sp.power));if(yc){yc.innerHTML=x.styles[style].i+" "+x.styles[style].n;}}
  {const chName=x.chair[chairman.id].n;const pb=$("presBtn");const _tr=LANG==="tr";const presMascot=`<svg class="pres-mascot" viewBox="0 0 38 38" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><g class="pres-mascot-head"><path d="M13 18c0-5 2.7-8 6-8s6 3 6 8v2c0 4-2.7 7-6 7s-6-3-6-7v-2Z"/><path d="M12 17c-1.7-2-2.1-4.1-1.1-6.2 2.8 1.4 5 .9 7.6-1.9 3.1 3.2 5.5 3.7 8.5 1.9 1.1 2.3.6 4.5-1 6.4"/><path d="M16 19h.1M22 19h.1"/><path d="M16.5 23c1.6 1 3.4 1 5 0"/><path d="M9 34c1.3-4.1 4.4-6 10-6s8.7 1.9 10 6"/></g><path class="pres-mascot-tie" d="M18 28l-2 6h6l-2-6"/></svg>`;pb.classList.add("btn-pres-action");pb.innerHTML=`${presMascot}<span>${x.ui.seeChair}</span>`;pb.disabled=false;pb.title=chName;const locked=round<4;pb.classList.toggle("locked",locked);pb.style.opacity=locked?"0.58":"1";pb.onclick=locked?(typeof presBtnLockedClick==="function"?presBtnLockedClick:null):openPresident;const pl=$("presLabel");if(pl){pl.textContent="";pl.setAttribute("aria-hidden","true");}}$("scoutBtn").title=x.scout;
  $("playBtn").innerHTML=round>=6?x.playFinal:x.play;
  {const tb=$("talkBtn");if(tb){const talkIcon=`<svg class="talk-ico" viewBox="0 0 24 18" width="19" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3.5h13a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H10l-5 3v-3H4a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z"/><path class="talk-wave" d="M7 7.5h7"/><path class="talk-wave talk-wave-2" d="M7 10h4"/></svg>`;tb.classList.remove("hidden");tb.disabled=!!talkUsed;tb.classList.toggle("used",!!talkUsed);tb.setAttribute("aria-disabled",talkUsed?"true":"false");tb.title=talkUsed?(LANG==="tr"?"Bu tur konuşma kullanıldı":"Team talk already used this round"):"";tb.innerHTML=talkIcon+`<span>${LANG==="tr"?"TAKIMA KONUŞ":"TEAM TALK"}</span>`;}}
  renderDebtWarning();renderInjbar();
  /* Oyun anlayışı + kaptan → pitch overlay */
  {const po=$("pitchOverlay");if(po){po.innerHTML="";const oe0=document.createElement("div");oe0.className="card style overlay-chip";oe0.innerHTML=`${x.styles[style].i} <b>${x.styles[style].n}</b>`;po.appendChild(oe0);if(captainIdx>=0&&picksBySlot[captainIdx]){const cp=picksBySlot[captainIdx];const injured=cp.injured;const isLider=cp.trait==="lider";const isWonder=cp.trait==="wonderkid";const capBonusVal=injured?-3:(isLider?3:isWonder?2:cp.age>=32?2:1);const capTag=injured?(LANG==="tr"?"SAKAT":"INJ."):(isLider?(LANG==="tr"?"LİDER":"LDR"):"");const dc=document.createElement("div");dc.className="card style cap-chip overlay-chip"+(injured?" cap-inj":"")+(isLider?" cap-lider":"");dc.innerHTML=`<svg viewBox="0 0 12 9" width="11" height="8" fill="currentColor" style="margin-right:3px"><path d="M1 8L11 8L10 3.5L7 6.5L6 1.5L3 6.5L2 3.5Z"/></svg><b>${surOf(cp)}</b>${capTag?`<span class="tier">${capTag}</span>`:""}<span class="v">${capBonusVal>=0?"+":""}${capBonusVal}</span>`;po.appendChild(dc);}}}
  let cr=null;{const po2=$("pitchOverlay");if(po2){cr=document.createElement("div");cr.id="cardrow";cr.className="cardrow";po2.appendChild(cr);}else{cr=$("cardrow");if(!cr){cr=document.createElement("div");cr.id="cardrow";cr.className="cardrow";}}}cr.innerHTML="";
  /* Kiralık chip */
  if(loanPlayer){const lc=document.createElement("div");lc.className="card style loan-chip";const _turnsLeft=typeof loanPlayer.turnsLeft!=="undefined"?` · ${loanPlayer.turnsLeft} tur`:"";lc.innerHTML=`<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.15em;margin-right:1px"><path d="M2 10a6 6 0 0 0 10 2"/><path d="M14 6A6 6 0 0 0 4 4"/><path d="M12 8l2 2-2 2"/><path d="M4 2l-2 2 2 2"/></svg> <b>${surOf(loanPlayer)}</b> <span class="tier">KİRALIK · LOAN</span> <span class="v">${LANG==="tr"?"Güç ":"Power "}${loanPlayer.ov}</span><span class="copy" style="color:var(--color-slate)">${loanPlayer.loanCost>0?"-€"+loanPlayer.loanCost+"M":""}${_turnsLeft}</span>`;cr.appendChild(lc);}
  cards.forEach(k=>{const d=document.createElement("div");const v=variantOf(k);d.className="card v"+v+" cat-"+(CATMAP[k]||"gorev");const cd=x.cards[k],cv=cardEff(k,s,round),stance=variantBadge(v);d.innerHTML=`<span class="card-ico">${CARD_SVGS[k]||cd.i}</span><b>${cd.n}</b><span class="tier">${kindLabel(k)}</span> <span class="v">${cv>=0?"+":""}${cv}</span><span class="copy active-stance stance-${v}">${stance}</span>`;cr.appendChild(d);});
  {const fp=$("finalPills");if(fp){const active=cards.filter(k=>cardEff(k,s,round)!==0);if(active.length){fp.innerHTML=active.slice(0,5).map(k=>{const cd=x.cards[k],v=cardEff(k,s,round),cls=v>0?"fp-bonus":"fp-risk";return `<span class="fpill ${cls}" onclick="showCardPopup('${k}')"><span class="fpico">${CARD_SVGS[k]||cd.i}</span> ${cd.n} <b>${v>=0?"+":""}${v}</b></span>`;}).join("")+(active.length>5?`<span class="fpill fp-none">+${active.length-5}</span>`:"");}else fp.innerHTML="";}}
  function _flashInsufficient(el,msg){
    if(!el)return;
    const notice=el.querySelector(".insufficient-pop");
    if(notice)notice.textContent=msg||(LANG==="tr"?"Kasa yetersiz":"Insufficient funds");
    el.classList.add("show-insufficient");
    clearTimeout(el._insufficientTimer);
    el._insufficientTimer=setTimeout(()=>el.classList.remove("show-insufficient"),1500);
  }
  window._flashInsufficient=_flashInsufficient;
  const sc=$("shopcards");sc.innerHTML="";
  shopOffers.slice(0,2).forEach(k=>{
    const sv=shopVariants[k]||0,oldV=cardVariant[k]||0;
    cardVariant[k]=sv;
    const cd=x.cards[k];
    const _basePr=cardPrice(k);
    const _memDisc=typeof _cardMemDiscount==="function"&&_cardMemDiscount(k);
    const pr=_memDisc?(_basePr<=0?0:Math.max(typeof CARD_PRICE_FLOOR==="number"?CARD_PRICE_FLOOR:2,Math.ceil(_basePr*0.8))):_basePr;
    const cant=!canAffordCost(pr),cat=CATMAP[k]||"gorev",pv=simulateShopPower(k);
    const tradeReady=k!=="kara_borsa"||cards.some(owned=>owned!=="kara_borsa"&&!isInstantCard(owned));
    cardVariant[k]=oldV;
    const d=document.createElement("div");
    d.className="cardtile sv-"+sv+" cat-"+cat+(cant?" cant":"")+(!tradeReady?" trade-missing":"");
    d.title=cd.n+"\n"+cardContractType(k);
    const desc=formatCardDesc(shopCardDesc(k,variantDesc(cd.d,sv)||shortCardText(k,s),sv));
    const priceLabel=pr<=0?(LANG==="tr"?"ÜCRETSİZ":"FREE"):`€${pr}M`;
    /* DARK visual: risk warning badge when this variant carries a final penalty */
    const _darkPen=(sv===1&&typeof KARA_PEN!=="undefined"&&KARA_PEN[k])?KARA_PEN[k]:0;
    if(sv===1)d.classList.add("is-dark");
    const _darkBadge=sv===1?`<span class="ct-darkflag" aria-hidden="true">DARK</span>`:`<span class="ct-rar var-badge var-${sv}">${variantBadge(sv)}</span>`;
    const _darkPenBadge=_darkPen?`<span class="ct-darkpen" title="${LANG==="tr"?"DARK: finalde güç cezası":"DARK: final power penalty"}">${LANG==="tr"?"FİNAL":"FINAL"} −${_darkPen}</span>`:"";
    const _costLines=typeof cardCostLines==="function"?cardCostLines(k,sv):[];
    const _costList=_costLines.length?`<ul class="ct-cost-list">${_costLines.map(line=>`<li>${formatCardDesc(line)}</li>`).join("")}</ul>`:"";
    d.innerHTML=`<div class="ct-head">${_darkBadge}<span class="ct-price ct-head-price ${pr<=0?"ct-price-free":""}">${priceLabel}</span></div><div class="ct-body"><div class="ct-titlegroup"><span class="ct-art" aria-hidden="true">${CARD_SVGS[k]||cd.i}</span><div class="ct-name">${cd.n}</div></div><div class="ct-desc">${desc}</div><div class="ct-contract">${cardContractType(k)}</div></div><div class="ct-foot ct-foot-cost">${_costList}</div><div class="insufficient-pop" aria-hidden="true">${LANG==="tr"?"Kasa yetersiz":"Insufficient funds"}</div>`;
    d.onclick=()=>!tradeReady?_flashInsufficient(d,LANG==="tr"?"Yakacak kart yok":"No card to burn"):cant?_flashInsufficient(d):confirmBuyCard(k,pr);
    sc.appendChild(d);
  });
  if(!shopOffers.length){const e=document.createElement("div");e.className="cardtile-empty";e.style="grid-column:1/-1";e.innerHTML=`<div style="font-family:var(--mono);font-size:10px;color:var(--ink2);text-align:center;padding:16px">— ${x.owned} —</div>`;sc.appendChild(e);}
  /* Bench render */
  {const _tr=LANG==="tr";let _benchEl=document.getElementById("hubBenchSection");
  if(typeof bench!=="undefined"&&bench&&bench.length){
    if(!_benchEl){_benchEl=document.createElement("div");_benchEl.id="hubBenchSection";_benchEl.style="margin-bottom:8px";const _anchor=$("injbar")||$("cardrow");if(_anchor&&_anchor.parentNode)_anchor.parentNode.insertBefore(_benchEl,_anchor);}
    const _benched=bench.filter(p=>p&&!p.used);
    if(_benched.length){
      const _maxBench=4;const _benchHdr=`<div style="font-family:var(--mono);font-size:9px;color:var(--ink2);letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;display:flex;align-items:center;gap:5px"><svg viewBox="0 0 18 14" width="13" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="16" height="10" rx="1.5"/><line x1="1" y1="6" x2="17" y2="6"/><line x1="5" y1="11" x2="5" y2="13"/><line x1="13" y1="11" x2="13" y2="13"/></svg>${_tr?"YEDEKLER":"BENCH"} <span style="opacity:.5;font-weight:600">${_benched.length}/${_maxBench}</span></div>`;
      const _dragHandle=`<svg viewBox="0 0 8 14" width="7" height="12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="1" y1="2" x2="7" y2="2"/><line x1="1" y1="5" x2="7" y2="5"/><line x1="1" y1="8" x2="7" y2="8"/><line x1="1" y1="11" x2="7" y2="11"/></svg>`;
      const _benchCards=_benched.map((p,bi)=>{const _ov=p.ov||0;const _eff=typeof effOf==="function"?effOf(p):_ov;const _pos=(typeof L==="function"?L().abbr[p.pos]:null)||p.pos||"?";const _col=typeof ovCol==="function"?ovCol(_eff):(_eff>=90?"#15803d":_eff>=80?"#4ade80":_eff>=70?"#eab308":_eff>=60?"#f97316":"#ef4444");const _inj=p.injured?`<span style="display:inline-flex;align-items:center;font-size:7px;font-family:var(--mono);font-weight:700;padding:1px 3px;border-radius:2px;background:var(--red);color:#fff;margin-left:2px">${_tr?"SAKAT":"INJ"}</span>`:"";return `<div class="bench-row" data-bench-idx="${bi}"><span style="color:var(--ink2);opacity:.45;flex-shrink:0">${_dragHandle}</span><span style="font-size:8px;font-weight:700;color:var(--ink2);min-width:24px;letter-spacing:.5px;flex-shrink:0">${_pos}</span><span style="flex:1;font-size:10.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${typeof surOf==="function"?surOf(p):(p.name||"?")}</span>${_inj}<span style="font-size:12px;font-weight:700;color:${_col};flex-shrink:0">${_eff}</span></div>`;}).join("");
      _benchEl.innerHTML=_benchHdr+`<div style="display:flex;flex-direction:column;gap:4px">${_benchCards}</div>`;
      if(window.PlayerProfiles)_benchEl.querySelectorAll("[data-bench-idx]").forEach(card=>{const p=_benched[+card.dataset.benchIdx];if(p)PlayerProfiles.bind(card,p);});
    }else{if(_benchEl)_benchEl.innerHTML="";}
  }else if(_benchEl){_benchEl.innerHTML="";}}
  setBudget();_fixHubVisibleText();renderFixtures();renderFeed();_renderFreeAgents();_initHubDragDrop();}

function _initHubDragDrop(){
  let _src=null; /* {type:"slot",idx} or {type:"bench",idx} */
  function _clearOver(){document.querySelectorAll(".h-drag-over").forEach(e=>e.classList.remove("h-drag-over"));}
  /* pitch slots */
  slots.forEach((_,i)=>{
    const el=document.getElementById("h"+i); if(!el)return;
    el.draggable=true;
    el.ondragstart=e=>{_src={type:"slot",idx:i};e.dataTransfer.effectAllowed="move";el.style.opacity=".5";};
    el.ondragend=e=>{el.style.opacity="";_clearOver();};
    el.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect="move";el.classList.add("h-drag-over");};
    el.ondragleave=()=>el.classList.remove("h-drag-over");
    el.ondrop=e=>{e.preventDefault();_clearOver();if(!_src||_src.idx===i)return;
      if(_src.type==="slot"){
        /* GK restriction: GK slot ↔ non-GK slot blocked unless player is injured */
        const _srcIsGK=slots[_src.idx][0]==="GK",_dstIsGK=slots[i][0]==="GK";
        if(_srcIsGK!==_dstIsGK){const _a=picksBySlot[_src.idx],_b=picksBySlot[i];if(!(_a&&_a.injured)&&!(_b&&_b.injured))return;}
        /* swap two pitch players */
        const a=picksBySlot[_src.idx],b=picksBySlot[i];
        picksBySlot[_src.idx]=b; picksBySlot[i]=a;
        if(a){a.pos=slots[i][0];a.eff=typeof effOf==="function"?effOf(a):a.ov;renderRoundel("h"+i,a);}
        else{const r=document.getElementById("h"+i);if(r){r.className="roundel empty";r.style.background="";r.style.color="";r.style.borderColor="";r.innerHTML=(typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(slots[i][0])]||""):"")+"<span class='rp'>"+(L().abbr[slots[i][0]])+"</span>";}}
        if(b){b.pos=slots[_src.idx][0];b.eff=typeof effOf==="function"?effOf(b):b.ov;renderRoundel("h"+_src.idx,b);}
        else{const r=document.getElementById("h"+_src.idx);if(r){r.className="roundel empty";r.style.background="";r.style.color="";r.style.borderColor="";r.innerHTML=(typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(slots[_src.idx][0])]||""):"")+"<span class='rp'>"+(L().abbr[slots[_src.idx][0]])+"</span>";}}
        renderHub();
      } else if(_src.type==="bench"){
        /* bench player → pitch slot */
        const bp=bench&&bench[_src.idx]; if(!bp)return;
        const old=picksBySlot[i];
        bp.used=true;bp.bench=false;
        if(typeof fillSlotReplace==="function")fillSlotReplace(i,bp);
        bench.splice(_src.idx,1);
        if(old){old.bench=true;old.used=false;bench.push(old);}
        if(typeof renderHub==="function")renderHub();
      }
      _src=null;};
  });
  /* bench players: add drag via event delegation on benchEl */
  const _be=document.getElementById("hubBenchSection"); if(!_be)return;
  _be.querySelectorAll("[data-bench-idx]").forEach(card=>{
    card.draggable=true;
    card.ondragstart=e=>{const bi=parseInt(card.dataset.benchIdx);_src={type:"bench",idx:bi};e.dataTransfer.effectAllowed="move";card.style.opacity=".5";};
    card.ondragend=()=>{card.style.opacity="";_clearOver();};
  });
  /* touch drag-drop for mobile */
  let _tEl=null,_tGhost=null,_tSrc=null,_tTimer=null;
  function _cleanupTouchDragGhosts(){
    const _wasDragging=!!_tSrc;
    clearTimeout(_tTimer);
    document.querySelectorAll(".touch-drag-ghost").forEach(el=>el.remove());
    if(_tEl)_tEl.style.opacity="";
    _tEl=null;_tGhost=null;_tSrc=null;_clearOver();
    if(_wasDragging&&window.PlayerProfiles)PlayerProfiles.setDragging(false);
  }
  window.cleanupTouchDragGhosts=_cleanupTouchDragGhosts;
  if(!window._touchDragCleanupHooksReady){
    window._touchDragCleanupHooksReady=true;
    ["resize","orientationchange","pagehide","blur"].forEach(ev=>window.addEventListener(ev,()=>{if(typeof window.cleanupTouchDragGhosts==="function")window.cleanupTouchDragGhosts();},{passive:true}));
    window.addEventListener("visibilitychange",()=>{if(document.hidden&&typeof window.cleanupTouchDragGhosts==="function")window.cleanupTouchDragGhosts();},{passive:true});
    window.addEventListener("scroll",()=>{if(typeof window.cleanupTouchDragGhosts==="function")window.cleanupTouchDragGhosts();},{passive:true,capture:true});
  }
  function _touchDrop(x,y){
    _clearOver();
    const real=_tGhost?_tGhost.style.display="none":null;
    const target=document.elementFromPoint(x,y);
    if(_tGhost)_tGhost.style.display="";
    if(!target||!_tSrc)return;
    const slot=target.closest("[id^='h']");
    const bench=target.closest("[data-bench-idx]");
    if(slot){
      const i=parseInt(slot.id.slice(1));
      if(_tSrc.type==="slot"&&_tSrc.idx!==i){
        const _srcIsGK=slots[_tSrc.idx][0]==="GK",_dstIsGK=slots[i][0]==="GK";
        if(_srcIsGK!==_dstIsGK){const _a=picksBySlot[_tSrc.idx],_b=picksBySlot[i];if(!(_a&&_a.injured)&&!(_b&&_b.injured))return;}
        const a=picksBySlot[_tSrc.idx],b=picksBySlot[i];
        picksBySlot[_tSrc.idx]=b;picksBySlot[i]=a;
        if(a){a.pos=slots[i][0];a.eff=typeof effOf==="function"?effOf(a):a.ov;renderRoundel("h"+i,a);}else{const r=document.getElementById("h"+i);if(r){r.className="roundel empty";r.style.background="";r.style.color="";r.style.borderColor="";r.innerHTML=(typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(slots[i][0])]||""):"")+"<span class='rp'>"+(L().abbr[slots[i][0]])+"</span>";}}
        if(b){b.pos=slots[_tSrc.idx][0];b.eff=typeof effOf==="function"?effOf(b):b.ov;renderRoundel("h"+_tSrc.idx,b);}else{const r=document.getElementById("h"+_tSrc.idx);if(r){r.className="roundel empty";r.style.background="";r.style.color="";r.style.borderColor="";r.innerHTML=(typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(slots[_tSrc.idx][0])]||""):"")+"<span class='rp'>"+(L().abbr[slots[_tSrc.idx][0]])+"</span>";}}
        renderHub();
      } else if(_tSrc.type==="bench"){
        const bp=window.bench&&window.bench[_tSrc.idx];if(!bp)return;
        const old=picksBySlot[i];
        bp.used=true;bp.bench=false;
        if(typeof fillSlotReplace==="function")fillSlotReplace(i,bp);
        window.bench.splice(_tSrc.idx,1);
        if(old){old.bench=true;old.used=false;window.bench.push(old);}
        if(typeof renderHub==="function")renderHub();
      }
    }
  }
  function _addTouchDrag(el,src){
    if(el._touchDragReady)return;
    el._touchDragReady=true;
    el.addEventListener("touchstart",e=>{
      _tTimer=setTimeout(()=>{
        _tSrc=src();if(!_tSrc)return;
        if(window.PlayerProfiles)PlayerProfiles.setDragging(true);
        _tEl=el;
        const t=e.touches[0];
        _tGhost=el.cloneNode(true);
        _tGhost.classList.add("touch-drag-ghost");
        _tGhost.style.cssText="position:fixed;z-index:9999;pointer-events:none;opacity:.7;left:"+(t.clientX-el.offsetWidth/2)+"px;top:"+(t.clientY-el.offsetHeight/2)+"px;width:"+el.offsetWidth+"px;height:"+el.offsetHeight+"px";
        document.body.appendChild(_tGhost);
        el.style.opacity=".4";
      },320);
    },{passive:true});
    el.addEventListener("touchmove",e=>{
      if(!_tSrc)return;e.preventDefault();
      const t=e.touches[0];
      if(_tGhost){_tGhost.style.left=(t.clientX-_tGhost.offsetWidth/2)+"px";_tGhost.style.top=(t.clientY-_tGhost.offsetHeight/2)+"px";}
      _clearOver();
      if(_tGhost)_tGhost.style.display="none";
      const target=document.elementFromPoint(t.clientX,t.clientY);
      if(_tGhost)_tGhost.style.display="";
      if(target){const s=target.closest("[id^='h']");if(s)s.classList.add("h-drag-over");}
    },{passive:false});
    el.addEventListener("touchend",e=>{
      clearTimeout(_tTimer);
      if(!_tSrc){return;}
      const t=e.changedTouches[0];
      _touchDrop(t.clientX,t.clientY);
      _cleanupTouchDragGhosts();
    });
    el.addEventListener("touchcancel",()=>{
      _cleanupTouchDragGhosts();
    });
  }
  slots.forEach((_,i)=>{const el=document.getElementById("h"+i);if(el)_addTouchDrag(el,()=>({type:"slot",idx:i}));});
  _be.querySelectorAll("[data-bench-idx]").forEach(card=>{const bi=parseInt(card.dataset.benchIdx);_addTouchDrag(card,()=>({type:"bench",idx:bi}));});
  _initTapPlacement();
}

/* ═══ Tap-to-select placement layer (coarse pointers) ═══
   Primary mobile interaction: tap a bench player or pitch player to select,
   valid targets highlight, tap a target to place/swap. Long-press drag stays
   as a secondary method. Desktop mouse drag/drop is untouched. */
let _tapSel=null;
function _tapCoarse(){return !!(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches);}
function _renderEmptyHubSlot(i){
  const r=document.getElementById("h"+i);if(!r)return;
  r.className="roundel empty";r.style.background="";r.style.color="";r.style.borderColor="";
  r.innerHTML=(typeof _SLOT_SIL!=="undefined"?(_SLOT_SIL[groupOf(slots[i][0])]||""):"")+"<span class='rp'>"+(L().abbr[slots[i][0]])+"</span>";
}
function _tapClearHighlights(){
  document.querySelectorAll(".tap-good,.tap-warn,.tap-off,.tap-no,.tap-selected").forEach(e=>{
    e.classList.remove("tap-good","tap-warn","tap-off","tap-no","tap-selected");
    e.removeAttribute("aria-disabled");e.removeAttribute("aria-pressed");
  });
}
function _tapBarEl(){
  let b=document.getElementById("tapHelperBar");
  if(!b){
    b=document.createElement("div");b.id="tapHelperBar";b.className="tap-helper hidden";
    b.innerHTML='<span id="tapHelperTxt"></span><button type="button" class="tap-cancel" onclick="_tapCancel()">'+(LANG==="tr"?"İptal":"Cancel")+'</button>';
    document.body.appendChild(b);
  }
  return b;
}
function _tapShowBar(msg){const b=_tapBarEl();b.classList.remove("hidden");const t=document.getElementById("tapHelperTxt");if(t)t.innerHTML=msg;}
function _tapHideBar(){const b=document.getElementById("tapHelperBar");if(b)b.classList.add("hidden");}
function _tapToast(msg){_tapShowBar(msg);clearTimeout(window._tapToastT);window._tapToastT=setTimeout(()=>{if(!_tapSel)_tapHideBar();},1500);}
function _tapCancel(){_tapSel=null;_tapClearHighlights();_tapHideBar();}
window._tapCancel=_tapCancel;
function _tapHighlightTargets(){
  _tapClearHighlights();
  if(!_tapSel)return;
  const tr=LANG==="tr";
  if(_tapSel.type==="bench"){
    const _benched=bench.filter(p=>p&&!p.used);
    const bp=_benched[_tapSel.idx];if(!bp)return;
    const card=document.querySelector('[data-bench-idx="'+_tapSel.idx+'"]');
    if(card){card.classList.add("tap-selected");card.setAttribute("aria-pressed","true");}
    slots.forEach((s,i)=>{
      const el=document.getElementById("h"+i);if(!el)return;
      const pen=typeof positionPenaltyFor==="function"?positionPenaltyFor(bp,s[0]):(s[0]===bp.pos?0:9);
      const fit=pen===0;
      el.classList.add(fit?"tap-good":pen<=4?"tap-warn":"tap-off");
      const fitLabel=fit?(tr?"doğal mevki":"natural role"):(pen<=4?(tr?"yakın mevki":"near role"):(tr?"pozisyon dışı":"out of position"));
      el.setAttribute("aria-label",(L().abbr[s[0]]||s[0])+" · "+fitLabel);
    });
  } else if(_tapSel.type==="slot"){
    const src=_tapSel.idx;
    const sEl=document.getElementById("h"+src);
    if(sEl){sEl.classList.add("tap-selected");sEl.setAttribute("aria-pressed","true");}
    const srcIsGK=slots[src][0]==="GK";
    const player=picksBySlot[src];
    slots.forEach((s,i)=>{
      if(i===src)return;
      const el=document.getElementById("h"+i);if(!el)return;
      const dstIsGK=s[0]==="GK";
      if(srcIsGK!==dstIsGK){
        const _a=picksBySlot[src],_b=picksBySlot[i];
        if(!(_a&&_a.injured)&&!(_b&&_b.injured)){el.classList.add("tap-no");el.setAttribute("aria-disabled","true");return;}
      }
      const pen=player&&typeof positionPenaltyFor==="function"?positionPenaltyFor(player,s[0]):(s[0]===slots[src][0]?0:9);
      el.classList.add(pen===0?"tap-good":pen<=4?"tap-warn":"tap-off");
      el.setAttribute("aria-label",(L().abbr[s[0]]||s[0])+" · "+(tr?"yer değiştir":"swap"));
    });
  }
}
function _tapSelectBench(bi){
  const _benched=bench.filter(p=>p&&!p.used);
  const bp=_benched[bi];if(!bp)return;
  if(_tapSel&&_tapSel.type==="bench"&&_tapSel.idx===bi){_tapCancel();return;}
  _tapSel={type:"bench",idx:bi};
  _tapHighlightTargets();
  const nm=typeof surOf==="function"?surOf(bp):(bp.name||"?");
  _tapShowBar("<b>"+nm.toUpperCase()+"</b> "+(LANG==="tr"?"seçildi · hedef pozisyon seç":"selected · tap a position"));
}
function _tapSelectSlot(i){
  if(!picksBySlot[i])return;
  if(_tapSel&&_tapSel.type==="slot"&&_tapSel.idx===i){_tapCancel();return;}
  _tapSel={type:"slot",idx:i};
  _tapHighlightTargets();
  const nm=typeof surOf==="function"?surOf(picksBySlot[i]):(picksBySlot[i].name||"?");
  _tapShowBar("<b>"+nm.toUpperCase()+"</b> "+(LANG==="tr"?"seçildi · yer değiştirmek için hedef seç":"selected · tap a target to swap"));
}
function _tapPlaceOnSlot(i){
  const sel=_tapSel;if(!sel)return false;
  const tr=LANG==="tr";
  if(sel.type==="bench"){
    /* same operation as the drag-drop bench→slot path */
    const _benched=bench.filter(p=>p&&!p.used);
    const bp=_benched[sel.idx];if(!bp){_tapCancel();return true;}
    const bIdx=bench.indexOf(bp);
    const old=picksBySlot[i];
    const posLbl=L().abbr[slots[i][0]]||slots[i][0];
    const nm=typeof surOf==="function"?surOf(bp):(bp.name||"?");
    bp.used=true;bp.bench=false;
    if(typeof fillSlotReplace==="function")fillSlotReplace(i,bp);
    if(bIdx>=0)bench.splice(bIdx,1);
    if(old){old.bench=true;old.used=false;bench.push(old);}
    _tapSel=null;_tapClearHighlights();_tapHideBar();
    if(typeof renderHub==="function")renderHub();
    _tapToast("<b>"+nm+"</b> "+(tr?posLbl+" pozisyonuna geçti":"placed at "+posLbl)+(old?" · "+(typeof surOf==="function"?surOf(old):(old.name||"?"))+" "+(tr?"yedeğe alındı":"benched"):""));
    return true;
  }
  if(sel.type==="slot"){
    const src=sel.idx;
    if(src===i){_tapCancel();return true;}
    /* same GK restriction as drag-drop */
    const srcIsGK=slots[src][0]==="GK",dstIsGK=slots[i][0]==="GK";
    if(srcIsGK!==dstIsGK){
      const _a=picksBySlot[src],_b=picksBySlot[i];
      if(!(_a&&_a.injured)&&!(_b&&_b.injured)){_tapToast(tr?"Kaleci slotu ile değişim yapılamaz":"Cannot swap with the GK slot");return true;}
    }
    const a=picksBySlot[src],b=picksBySlot[i];
    picksBySlot[src]=b;picksBySlot[i]=a;
    if(a){a.pos=slots[i][0];a.eff=typeof effOf==="function"?effOf(a):a.ov;renderRoundel("h"+i,a);}else _renderEmptyHubSlot(i);
    if(b){b.pos=slots[src][0];b.eff=typeof effOf==="function"?effOf(b):b.ov;renderRoundel("h"+src,b);}else _renderEmptyHubSlot(src);
    _tapSel=null;_tapClearHighlights();
    renderHub();
    _tapToast(tr?"Oyuncular yer değiştirdi":"Players swapped");
    return true;
  }
  return false;
}
function _initTapPlacement(){
  if(!_tapCoarse())return;
  slots.forEach((_,i)=>{
    const el=document.getElementById("h"+i);if(!el||el._tapReady)return;el._tapReady=true;
    el.addEventListener("click",e=>{
      if(!_tapCoarse())return;
      e.stopPropagation();
      if(_tapSel)_tapPlaceOnSlot(i);
      else _tapSelectSlot(i);
    });
  });
  const be=document.getElementById("hubBenchSection");
  if(be)be.querySelectorAll("[data-bench-idx]").forEach(card=>{
    if(card._tapReady)return;card._tapReady=true;
    card.setAttribute("role","button");
    card.addEventListener("click",e=>{if(!_tapCoarse())return;e.stopPropagation();_tapSelectBench(parseInt(card.dataset.benchIdx));});
  });
  if(!window._tapGlobalReady){
    window._tapGlobalReady=true;
    document.addEventListener("click",e=>{
      if(!_tapSel)return;
      if(e.target.closest("#tapHelperBar")||e.target.closest("[data-bench-idx]")||e.target.closest(".roundel"))return;
      _tapCancel();
    });
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&_tapSel)_tapCancel();});
  }
}
function showCardPopup(k){const x=L(),cd=x.cards[k];if(!cd)return;const v=cardEff(k,picksBySlot.filter(Boolean),round);const kin=kindLabel(k);const tr=LANG==="tr";
  /* Contract cards pay out on purchase and bill later; surface the outstanding debt */
  let effRow=`<div style="margin-top:10px;font-family:var(--mono);font-size:12px;font-weight:700;color:${v>=0?"var(--good)":"var(--red)"}">${tr?"Bu tur etkisi":"Effect now"}: ${v>=0?"+":""}${v}</div>`;
  if(k==="kumarbaz"){const dark=(variantOf(k)||0)===1,gain=dark?25:15,pay=dark?10:5;const left=typeof kumarbazInstallmentTurns!=="undefined"?kumarbazInstallmentTurns:0;
    effRow=`<div style="margin-top:10px;font-family:var(--mono);font-size:11px;font-weight:700;display:grid;gap:3px"><div style="color:var(--good)">${tr?"Peşin alınan":"Paid upfront"}: +€${gain}M</div><div style="color:var(--red)">${tr?"Tur başına ödeme":"Payment per round"}: -€${pay}M</div><div style="color:${left>0?"var(--red)":"var(--ink2)"}">${tr?"Kalan ödeme":"Payments left"}: ${left>0?left+" "+(tr?"tur":"rounds")+" × -€"+pay+"M = -€"+(left*pay)+"M":(tr?"yok":"none")}</div></div>`;}
  showModal(`<div style="padding:14px 16px"><div class="card-popup-ico">${CARD_SVGS[k]||cd.i}</div><div style="font-family:var(--mono);font-weight:700;font-size:13px;text-align:center">${cd.n}</div><div style="font-family:var(--mono);font-size:9px;color:var(--ink2);text-align:center;letter-spacing:1px;margin:2px 0">${kin}</div><hr style="border:none;border-top:1px solid var(--line);margin:8px 0"><div class="card-desc-rich" style="font-size:11px;line-height:1.55;color:var(--ink)">${formatCardDesc(variantDesc(cd.d,variantOf(k)||0))}</div>${effRow}<div style="margin-top:12px"><button class="btn btn-ghost" onclick="closeModal()" style="width:100%">${x.presClose||"Kapat"}</button></div></div>`);}
function shopReroll(){if(shopRerolledThisTurn>=1){showModal(`<div class="bulletin"><div class="bhead"><span>${LANG==="tr"?"KART PAZARI":"CARD MARKET"}</span></div><div class="bbody">${LANG==="tr"?"Bu turda yenileme hakkın doldu.":"You have used your reroll for this turn."}</div><div class="bact"><button class="btn btn-ghost" onclick="closeModal()">${LANG==="tr"?"TAMAM":"OK"}</button></div></div>`);return;}shopRerolledThisTurn++;newShopOffers();renderHub();sfxTick();}
function buyCard(k,overridePrice){
  if(cardsBoughtThisTurn>=1){showModal(`<div style="padding:18px 16px 14px"><div class="kithdr">${LANG==="tr"?"Bu Turda 1 Kart Alındı":"Card Already Bought This Turn"}</div><div class="kitsub" style="margin:8px 0 16px">${LANG==="tr"?"Bu turda yalnızca 1 kart satın alabilirsiniz.":"You can only buy 1 card per turn."}</div><div><button class="btn btn-ghost" onclick="closeModal()" style="width:100%">${LANG==="tr"?"Tamam":"OK"}</button></div></div>`);return;}
  const sv=shopVariants[k]||0;
  const oldV=cardVariant[k]||0;
  cardVariant[k]=sv;
  const _basePr=cardPrice(k);
  cardVariant[k]=oldV;
  const pr=overridePrice!==undefined?overridePrice:_basePr;
  if(!canAffordCost(pr))return;
  spend(pr,"spent");
  if(typeof chairmanReactToSpend==="function")chairmanReactToSpend(pr,"card",{card:k,variant:sv});
  recordDebt();
  cardsBoughtThisTurn++;
  addCard(k,sv,{silent:true,source:"market",price:pr});
  shopOffers=shopOffers.filter(o=>o!==k);
  delete shopVariants[k];
  sfxStamp();sfxCoin();
  const vl=(L().variantLbl||["COMMON","DARK"])[sv];
  pushFeed("💰 <b>"+L().cards[k].n+"</b> "+L().feedBuy+" (-€"+pr+"M) · "+vl,"buy");
  renderHub();
}
