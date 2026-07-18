(function(global){
"use strict";

function render(){
  if(!document.getElementById("seasonStatsStyles")){
    const style=document.createElement("link");style.id="seasonStatsStyles";style.rel="stylesheet";style.href="src/styles/seasonStats.css?v=20260718-season-visual1";document.head.appendChild(style);
  }
  const r=lastResult||{},e=r.econ||econStats||{},s=picksBySlot.filter(Boolean);
  const safe=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const playedFixtures=fixtures.filter(f=>f&&f.res);
  const goals=playedFixtures.reduce((sum,f)=>sum+(Number(f.gf)||0),0);
  const conceded=playedFixtures.reduce((sum,f)=>sum+(Number(f.ga)||0),0);
  const wins=playedFixtures.filter(f=>f.res==="W").length;
  const draws=playedFixtures.filter(f=>f.res==="D").length;
  const losses=playedFixtures.filter(f=>f.res==="L").length;
  const played=playedFixtures.length,gd=goals-conceded,winPct=played?Math.round(wins/played*100):0;
  const goalsPer=played?(goals/played).toFixed(1):"0.0",power=Number(r.power)||0;
  const topScorers={};
  playedFixtures.forEach(f=>(f.events||[]).filter(ev=>ev.home&&ev.type==="goal").forEach(ev=>{const name=ev.name||LT("Bilinmeyen","Unknown","Desconocido","Unbekannt","Sconosciuto");topScorers[name]=(topScorers[name]||0)+1;}));
  const topList=Object.entries(topScorers).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,3);
  const mvpMem=_mvpLoad(),runMVP=window._finalMVPName||(topList[0]&&topList[0][0])||"—";
  const report=window.lastMatchReportData||null,penaltyExit=!!(report&&report.penalty&&!report.homeWon);
  let bestCard="—",bestVal=-999;
  cards.forEach(k=>{const value=cardEff(k,s,round);if(value>bestVal){bestVal=value;bestCard=(L().cards[k]&&L().cards[k].n)||k;}});
  const expensive=s.length?s.reduce((a,b)=>(Number(b.price)||0)>(Number(a.price)||0)?b:a):null;
  const earned=Number(e.earned)||0,spent=Number(e.spent)||0,president=Number(e.president)||0;
  const net=earned-spent-president,endCash=Number(r&&r.budgetAtEnd!==undefined?r.budgetAtEnd:budget)||0,startCash=endCash-net;
  const reached=r&&r.round?((L().rounds&&L().rounds[Math.max(0,r.round-1)])||String(r.round)):"—";
  const money=value=>typeof runMoney==="function"?runMoney(value):((value<0?"-€"+Math.abs(value):"€"+value)+"M");
  const signed=value=>(value>0?"+":"")+money(value);
  const moneyTone=value=>value>0?"stat-positive":value<0?"stat-negative":"stat-neutral";
  const ratingTone=value=>value>=80?"stat-elite":value>=70?"stat-positive":value>=60?"stat-warning":"stat-negative";
  const resultTone=r&&r.endType==="sacked"?"stat-negative":r&&r.won?"stat-elite":r&&r.round>=5?"stat-positive":"stat-neutral";
  const heroTitle=r&&r.endType==="sacked"?LT("KOVULDUN","SACKED","DESTITUIDO","ENTLASSEN","ESONERATO"):r&&r.won?LT("KUPAYI ALDIN","CUP WON","CAMPEÓN","POKALSIEGER","CAMPIONE"):LT("ELENDİN","RUN ENDED","ELIMINADO","AUSGESCHIEDEN","ELIMINATO");
  const heroDetail=penaltyExit?LT(`${reached} · Penaltılarla elendin`,`${reached} · Lost on penalties`,`${reached} · Eliminado en penaltis`,`${reached} · Im Elfmeterschießen ausgeschieden`,`${reached} · Eliminato ai rigori`):r&&r.won?LT("Altı turluk yolculuk kupayla tamamlandı.","The six-round journey ended with the trophy.","El camino de seis rondas terminó con el trofeo.","Die Reise über sechs Runden endete mit dem Pokal.","Il percorso di sei turni si è concluso con il trofeo."):r&&r.endType==="sacked"?LT("Başkan güveni tükendi ve run sona erdi.","Board trust ran out and ended the run.","La confianza de la directiva se agotó.","Das Vertrauen des Vorstands war aufgebraucht.","La fiducia della dirigenza si è esaurita."):LT(`${reached} aşamasına kadar ilerledin.`, `You reached ${reached}.`, `Llegaste a ${reached}.`, `Du hast ${reached} erreicht.`, `Hai raggiunto ${reached}.`);
  const outcomeLabel=r&&r.won?LT("ŞAMPİYON","CHAMPION","CAMPEÓN","SIEGER","CAMPIONE"):r&&r.endType==="sacked"?LT("YÖNETİM KARARI","BOARD DECISION","DECISIÓN DIRECTIVA","VORSTANDSENTSCHEIDUNG","DECISIONE DIRIGENZIALE"):LT("TURNUVA SONUCU","TOURNAMENT RESULT","RESULTADO DEL TORNEO","TURNIERERGEBNIS","RISULTATO DEL TORNEO");
  const resultCopy={W:LT("Galibiyet","Win","Victoria","Sieg","Vittoria"),D:LT("Beraberlik","Draw","Empate","Remis","Pareggio"),L:LT("Mağlubiyet","Loss","Derrota","Niederlage","Sconfitta")};
  const journey=fixtures.map((f,index)=>{
    const playedNow=!!(f&&f.res),type=f&&f.res==="W"?"win":f&&f.res==="D"?"draw":f&&f.res==="L"?"loss":"none";
    const isLast=playedNow&&index===played-1,penalty=isLast&&report&&report.penalty;
    const roundLabel=(L().rounds&&L().rounds[index])||`${LT("Tur","Round","Ronda","Runde","Turno")} ${index+1}`;
    const score=playedNow?`${f.gf}-${f.ga}`:"?";
    const opponent=playedNow&&f.opp?f.opp:LT("Bekleniyor","Pending","Pendiente","Ausstehend","In attesa");
    const status=playedNow?(resultCopy[f.res]||"") : LT("Oynanmadı","Unplayed","No jugado","Nicht gespielt","Non giocato");
    const penaltyText=penalty?` · ${LT("Pen.","Pens","Pen.","Elf.","Rig.")} ${report.penalty[0]}-${report.penalty[1]}`:"";
    return `<button type="button" class="ss-journey-node ${type}${isLast?" is-last":""}" data-ss-journey data-round="${safe(roundLabel)}" data-opponent="${safe(opponent)}" data-score="${safe(score+penaltyText)}" data-status="${safe(status)}" aria-label="${safe(roundLabel+", "+status+", "+score+penaltyText)}"><small>${safe(roundLabel)}</small><i aria-hidden="true">${index+1}</i><b>${safe(score)}</b><span>${safe(opponent)}</span>${penalty?`<em>${safe(LT("Penaltılar","Penalties","Penaltis","Elfmeterschießen","Rigori"))} ${report.penalty[0]}-${report.penalty[1]}</em>`:""}</button>`;
  }).join("");
  const kpi=(label,value,id,cls="",sub="")=>`<div class="ss-kpi ${cls}"><span>${label}</span><strong${id?` id="${id}"`:""}>${value}</strong>${sub?`<small>${sub}</small>`:""}</div>`;
  const compareMax=Math.max(goals,conceded,1);
  const economyMax=Math.max(Math.abs(startCash),Math.abs(earned),Math.abs(spent),Math.abs(president),Math.abs(endCash),1);
  const flow=(label,value,kind)=>`<div class="ss-flow-step ${kind}"><span>${label}</span><div><i data-ss-width="${Math.max(5,Math.round(Math.abs(value)/economyMax*100))}"></i></div><b>${kind==="start"||kind==="end"?money(value):signed(value)}</b></div>`;
  const scorerPodium=topList.length?`<div class="ss-podium">${topList.map(([name,total],index)=>`<button type="button" class="ss-scorer rank-${index+1}" data-scorer-index="${index}"><span>${index+1}</span><b>${safe(name)}</b><em>${total} ${LT("gol","goals","goles","Tore","gol")}</em></button>`).join("")}</div>`:`<div class="ss-empty">${LT("Gol kaydı yok","No scorers recorded","Sin goleadores","Keine Torschützen","Nessun marcatore")}</div>`;
  const mvpHtml=runMVP!=="—"?`<button type="button" class="ss-mvp-card"><div class="ss-mvp-icon" aria-hidden="true">★</div><div class="ss-mvp-copy"><b>${safe(runMVP)}</b><span>${(mvpMem[runMVP]||0)>=2?LT("Efsane MVP","Legendary MVP","MVP legendario","Legendärer MVP","MVP leggendario"):LT("Run yıldızı","Run star","Estrella del recorrido","Star des Runs","Stella del percorso")}</span><div class="ss-mvp-dims" id="ssMvpDims"><i>${LT("COPA boyutları yükleniyor…","Loading COPA dimensions…","Cargando dimensiones COPA…","COPA-Werte werden geladen…","Caricamento dimensioni COPA…")}</i></div></div></button>`:`<div class="ss-empty">${LT("MVP kaydı yok","No MVP recorded","Sin MVP","Kein MVP","Nessun MVP")}</div>`;
  const insights=[];
  if(penaltyExit)insights.push(["warning",LT("Tur normal sürede değil, penaltı serisinde sona erdi.","The run ended in the shootout, not in regulation.","La eliminación llegó en los penaltis, no en el tiempo reglamentario.","Das Aus kam im Elfmeterschießen, nicht in der regulären Spielzeit.","L'eliminazione è arrivata ai rigori, non nei tempi regolamentari.")]);
  if((e.injuries||0)===0)insights.push(["positive",LT("Turnuva boyunca sakatlık kaydı oluşmadı.","No injuries were recorded during the tournament.","No hubo lesiones durante el torneo.","Im Turnier gab es keine Verletzungen.","Nessun infortunio registrato nel torneo.")]);
  if(cards.length===0)insights.push(["neutral",LT("Run kart kullanmadan tamamlandı; güç artışı tamamen kadro ve kimyadan geldi.","The run used no cards; power came entirely from the squad and chemistry.","No se usaron cartas; la fuerza llegó de plantilla y química.","Keine Karten: Die Stärke kam vollständig aus Kader und Chemie.","Nessuna carta: la forza è arrivata da rosa e chimica.")]);
  if(net<0)insights.push(["warning",LT(`Run net ${money(net)} ile kapandı; harcama verimliliği geliştirilebilir.`,`The run closed at ${money(net)} net; spending efficiency can improve.`,`El balance neto fue ${money(net)}; se puede mejorar la eficiencia del gasto.`,`Der Run endete netto bei ${money(net)}; die Ausgabeneffizienz kann steigen.`,`Il saldo netto è stato ${money(net)}; l'efficienza di spesa può migliorare.`)]);
  if(gd>0)insights.push(["positive",LT(`Takım ${gd>0?"+":""}${gd} gol farkı üretti.`,`The team produced a ${gd>0?"+":""}${gd} goal difference.`,`El equipo logró una diferencia de ${gd>0?"+":""}${gd}.`,`Das Team erreichte eine Tordifferenz von ${gd>0?"+":""}${gd}.`,`La squadra ha ottenuto una differenza reti di ${gd>0?"+":""}${gd}.`)]);
  if(!insights.length)insights.push(["neutral",LT("Sonraki run için kadro, ekonomi ve maç verilerini birlikte değerlendir.","Use squad, economy and match data together for the next run.","Combina plantilla, economía y partidos en el próximo intento.","Nutze im nächsten Run Kader-, Wirtschafts- und Spieldaten gemeinsam.","Nel prossimo percorso valuta insieme rosa, economia e partite.")]);
  const insightHtml=insights.slice(0,4).map(([tone,text])=>`<li class="${tone}"><i aria-hidden="true"></i><span>${safe(text)}</span></li>`).join("");
  const html=`<div class="season-stats-modal">
    <header class="ss-head">
      <div><span class="ss-kicker">${LT("SEZON İSTATİSTİKLERİ","SEASON STATISTICS","ESTADÍSTICAS DE TEMPORADA","SAISONSTATISTIK","STATISTICHE STAGIONALI")}</span><h3>${safe(teamName||"XI")} <small>${safe(formName)}</small></h3><p><span class="ss-run-meta">${LT("Run Kimliği","Run ID","ID del recorrido","Run-ID","ID percorso")} #${String(seedNum).padStart(4,"0")}</span><span class="ss-result-meta ${resultTone}">${safe(reached)}</span></p></div>
      <button class="ss-close" type="button" onclick="closeModal()" aria-label="${LT("Kapat","Close","Cerrar","Schließen","Chiudi")}">×</button>
    </header>
    <div class="ss-body">
      <section class="ss-outcome ${resultTone}">
        <div><span>${outcomeLabel}</span><h4>${heroTitle}</h4><p>${safe(heroDetail)}</p></div>
        <div class="ss-outcome-progress" aria-label="${LT("Turnuva ilerlemesi","Tournament progress","Progreso del torneo","Turnierfortschritt","Avanzamento torneo")}"><b>${played}<small>/6</small></b><i><em data-ss-width="${Math.round(played/6*100)}"></em></i></div>
      </section>
      <div class="ss-kpis">
        <div class="ss-kpi ss-kpi-rate"><span>${LT("GALİBİYET ORANI","WIN RATE","PORCENTAJE DE VICTORIAS","SIEGQUOTE","PERCENTUALE VITTORIE")}</span><div class="ss-rate-ring" id="ssRateRing"><strong id="ss_p">0%</strong></div><small>${wins}/${played||0}</small></div>
        ${kpi(LT("KADRO GÜCÜ","SQUAD POWER","FUERZA DE PLANTILLA","KADERSTÄRKE","FORZA ROSA"),power,"ss_power",ratingTone(power),LT(`${cards.length} kart · ${benchUsed||0} yedek`,`${cards.length} cards · ${benchUsed||0} subs`,`${cards.length} cartas · ${benchUsed||0} suplentes`,`${cards.length} Karten · ${benchUsed||0} Wechsel`,`${cards.length} carte · ${benchUsed||0} riserve`))}
        ${kpi(LT("GOL FARKI","GOAL DIFFERENCE","DIFERENCIA DE GOLES","TORDIFFERENZ","DIFFERENZA RETI"),`${gd>0?"+":""}${gd}`,"ss_gd",gd>0?"stat-positive":gd<0?"stat-negative":"stat-neutral",`${goals}-${conceded}`)}
        ${kpi(LT("KAPANIŞ KASASI","ENDING CASH","CAJA FINAL","ENDKASSE","CASSA FINALE"),money(endCash),"",moneyTone(endCash),LT(`Net ${signed(net)}`,`Net ${signed(net)}`,`Neto ${signed(net)}`,`Netto ${signed(net)}`,`Netto ${signed(net)}`))}
      </div>
      <section class="ss-section ss-journey">
        <div class="ss-section-head"><div><span>${LT("TURNUVA YOLCULUĞU","TOURNAMENT JOURNEY","RECORRIDO DEL TORNEO","TURNIERWEG","PERCORSO DEL TORNEO")}</span><p>${LT("Bir tur seçerek maç özetini gör.","Select a round to inspect the match.","Selecciona una ronda para ver el partido.","Wähle eine Runde für die Spielübersicht.","Seleziona un turno per vedere la partita.")}</p></div><b>${wins}W · ${draws}D · ${losses}L</b></div>
        <div class="ss-journey-track">${journey}</div>
        <div class="ss-journey-detail" id="ssJourneyDetail" aria-live="polite"></div>
      </section>
      <div class="ss-grid ss-grid-main">
        <section class="ss-section ss-performance">
          <div class="ss-section-head"><div><span>${LT("MAÇ PERFORMANSI","MATCH PERFORMANCE","RENDIMIENTO","SPIELLEISTUNG","PRESTAZIONE")}</span><p>${LT("Atılan ve yenilen goller aynı ölçekte.","Goals for and against share one scale.","Goles a favor y en contra en la misma escala.","Tore und Gegentore auf derselben Skala.","Gol fatti e subiti sulla stessa scala.")}</p></div><b>${goalsPer} / ${LT("maç","game","partido","Spiel","partita")}</b></div>
          <div class="ss-wdl"><span class="win"><b>${wins}</b>${LT("Galibiyet","Wins","Victorias","Siege","Vittorie")}</span><span class="draw"><b>${draws}</b>${LT("Beraberlik","Draws","Empates","Remis","Pareggi")}</span><span class="loss"><b>${losses}</b>${LT("Mağlubiyet","Losses","Derrotas","Niederlagen","Sconfitte")}</span></div>
          <div class="ss-compare"><div><span>${LT("Atılan gol","Goals for","Goles a favor","Tore","Gol fatti")}</span><i><em class="positive" data-ss-width="${Math.round(goals/compareMax*100)}"></em></i><b id="ss_g">0</b></div><div><span>${LT("Yenilen gol","Goals against","Goles en contra","Gegentore","Gol subiti")}</span><i><em class="negative" data-ss-width="${Math.round(conceded/compareMax*100)}"></em></i><b id="ss_c">0</b></div></div>
          <div class="ss-performance-meta"><span>${LT("Sakatlık","Injuries","Lesiones","Verletzungen","Infortuni")} <b>${e.injuries||0}</b></span><span>${LT("En güçlü kart","Best card","Mejor carta","Beste Karte","Carta migliore")} <b>${bestVal>0?safe(bestCard)+" +"+bestVal:"—"}</b></span></div>
        </section>
        <section class="ss-section ss-economy">
          <div class="ss-section-head"><div><span>${LT("NAKİT AKIŞI","CASH FLOW","FLUJO DE CAJA","GELDFLUSS","FLUSSO DI CASSA")}</span><p>${LT("Başlangıçtan kapanışa run ekonomisi.","Run economy from start to finish.","Economía del recorrido de inicio a fin.","Run-Wirtschaft von Start bis Ende.","Economia del percorso dall'inizio alla fine.")}</p></div><b class="${moneyTone(net)}">${signed(net)}</b></div>
          <div class="ss-flow">${flow(LT("Başlangıç","Starting cash","Caja inicial","Startkasse","Cassa iniziale"),startCash,"start")}${flow(LT("Kazanılan","Earned","Ingresos","Einnahmen","Entrate"),earned,"gain")}${flow(LT("Transfer ve kart","Transfers & cards","Traspasos y cartas","Transfers & Karten","Trasferimenti e carte"),-spent,"cost")}${flow(LT("Başkan etkisi","Chairman impact","Impacto del presidente","Präsidenteneffekt","Impatto presidente"),-president,"cost")}${flow(LT("Kapanış","Ending cash","Caja final","Endkasse","Cassa finale"),endCash,"end")}</div>
          <div class="ss-economy-meta"><span>${LT("En pahalı oyuncu","Costliest player","Jugador más caro","Teuerster Spieler","Giocatore più costoso")}</span><b>${expensive?safe(shortName(expensive))+" "+money(expensive.price||0):"—"}</b></div>
        </section>
      </div>
      <div class="ss-grid ss-grid-detail">
        <section class="ss-section ss-scorers"><div class="ss-section-head"><div><span>${LT("GOLCÜLER","SCORERS","GOLEADORES","TORSCHÜTZEN","MARCATORI")}</span><p>${LT("Run gol sıralaması","Run scoring chart","Goleadores del recorrido","Torschützen des Runs","Classifica marcatori")}</p></div><b>${goals} ${LT("gol","goals","goles","Tore","gol")}</b></div>${scorerPodium}</section>
        <section class="ss-section ss-section-mvp"><div class="ss-section-head"><div><span>MVP</span><p>${LT("Run'ın öne çıkan oyuncusu","Standout player of the run","Jugador destacado","Spieler des Runs","Giocatore del percorso")}</p></div></div>${mvpHtml}</section>
      </div>
      <section class="ss-section ss-insights"><div class="ss-section-head"><div><span>${LT("RUN İÇGÖRÜLERİ","RUN INSIGHTS","CLAVES DEL RECORRIDO","RUN-ERKENNTNISSE","INDICAZIONI DEL PERCORSO")}</span><p>${LT("Sonraki deneme için veriye dayalı notlar.","Data-led notes for the next attempt.","Notas basadas en datos para el próximo intento.","Datenbasierte Hinweise für den nächsten Run.","Note basate sui dati per il prossimo tentativo.")}</p></div></div><ul>${insightHtml}</ul></section>
    </div>
    <footer class="ss-foot"><button class="btn btn-primary" type="button" onclick="closeModal()">${LT("KAPAT","CLOSE","CERRAR","SCHLIESSEN","CHIUDI")}</button></footer>
  </div>`;
  showModal(html,{dismissOnOverlay:true,label:LT("Sezon İstatistikleri","Season Statistics","Estadísticas de temporada","Saisonstatistik","Statistiche stagionali"),bare:true});
  const findProfilePlayer=name=>s.find(p=>p&&(p.name===name||surOf(p)===name||(typeof shortName==="function"&&shortName(p)===name)));
  const modal=document.querySelector(".season-stats-modal");
  if(window.PlayerProfiles){
    document.querySelectorAll(".ss-scorer").forEach((node,index)=>{const entry=topList[index],player=entry&&findProfilePlayer(entry[0]);if(player)PlayerProfiles.bind(node,player);});
    const mvpCard=document.querySelector(".ss-mvp-card"),mvpPlayer=findProfilePlayer(runMVP);
    if(mvpCard&&mvpPlayer){
      PlayerProfiles.bind(mvpCard,mvpPlayer);
      if(typeof playerProfileForPlayerAsync==="function"&&PlayerProfiles._normalizeForTest){
        playerProfileForPlayerAsync(mvpPlayer,selectedCountry).then(profile=>{
          const host=document.getElementById("ssMvpDims");if(!host)return;
          const data=PlayerProfiles._normalizeForTest(mvpPlayer,profile),top=(data.radar||[]).slice().sort((a,b)=>b.value-a.value).slice(0,3);
          host.innerHTML=top.length?top.map(item=>`<span><i>${safe(item.label)}</i><b>${item.value}</b></span>`).join(""):`<i>${LT("Boyut verisi yok","No dimension data","Sin datos de dimensiones","Keine Wertedaten","Dati dimensioni non disponibili")}</i>`;
        }).catch(()=>{const host=document.getElementById("ssMvpDims");if(host)host.innerHTML=`<i>${LT("Boyut verisi yüklenemedi","Dimensions unavailable","Dimensiones no disponibles","Werte nicht verfügbar","Dimensioni non disponibili")}</i>`;});
      }
    }
  }
  const journeyNodes=Array.from(document.querySelectorAll("[data-ss-journey]")),journeyDetail=document.getElementById("ssJourneyDetail");
  const selectJourney=node=>{
    journeyNodes.forEach(item=>item.classList.toggle("is-selected",item===node));
    if(journeyDetail)journeyDetail.innerHTML=`<b>${safe(node.dataset.round)}</b><span>${safe(node.dataset.opponent)}</span><strong>${safe(node.dataset.score)}</strong><em>${safe(node.dataset.status)}</em>`;
  };
  journeyNodes.forEach(node=>node.addEventListener("click",()=>selectJourney(node)));
  const initialJourney=journeyNodes[Math.max(0,played-1)]||journeyNodes[0];if(initialJourney)selectJourney(initialJourney);
  const reduced=matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("reduced-motion");
  let visualFallback=0;
  const setVisuals=()=>{
    if(visualFallback){clearTimeout(visualFallback);visualFallback=0;}
    document.querySelectorAll("[data-ss-width]").forEach(node=>node.style.width=(node.dataset.ssWidth||0)+"%");
    const ring=document.getElementById("ssRateRing");if(ring)ring.style.setProperty("--ss-rate",winPct);
    if(modal)modal.classList.add("is-ready");
  };
  if(reduced){setVisuals();document.getElementById("ss_p").textContent=winPct+"%";document.getElementById("ss_g").textContent=goals;document.getElementById("ss_c").textContent=conceded;}
  else{
    visualFallback=setTimeout(setVisuals,250);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      setVisuals();
      [["ss_p",winPct,"%"],["ss_g",goals,""],["ss_c",conceded,""],["ss_power",power,""],["ss_gd",gd,gd>0?"+":""]].forEach(([id,value,suffix])=>{
        const node=document.getElementById(id);if(!node)return;let start=null;
        (function tick(ts){if(start===null)start=ts;const progress=Math.min((ts-start)/760,1),ease=1-Math.pow(1-progress,3),shown=Math.round(Math.abs(value)*ease);node.textContent=(value<0?"-":suffix==="+"?"+":"")+shown+(suffix==="%"?"%":"");if(progress<1)requestAnimationFrame(tick);})(performance.now());
      });
    }));
  }
}

global.CopaSeasonStats={render};
})(window);
