(function(global){
"use strict";

function render(){
  if(!document.getElementById("seasonStatsStyles")){
    const style=document.createElement("link");
    style.id="seasonStatsStyles";
    style.rel="stylesheet";
    style.href="src/styles/seasonStats.css?v=20260721-season-recap2";
    const palette=document.querySelector('link[href*="src/styles/palette.css"]');
    if(palette&&palette.parentNode)palette.parentNode.insertBefore(style,palette);
    else document.head.appendChild(style);
  }

  const r=lastResult||{},e=r.econ||econStats||{},s=picksBySlot.filter(Boolean);
  const tournamentState=r.tournament&&r.tournament.format==="groups16_v1"?r.tournament:null;
  const playerGroup=tournamentState&&tournamentState.groups.find(group=>group.id===tournamentState.group.playerGroupId);
  const playerGroupRow=playerGroup&&playerGroup.table.find(row=>row.teamId==="player");
  const safe=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const playedFixtures=fixtures.filter(f=>f&&f.res);
  const played=playedFixtures.length;
  const goals=playedFixtures.reduce((sum,f)=>sum+(Number(f.gf)||0),0);
  const conceded=playedFixtures.reduce((sum,f)=>sum+(Number(f.ga)||0),0);
  const wins=playedFixtures.filter(f=>f.res==="W").length;
  const draws=playedFixtures.filter(f=>f.res==="D").length;
  const losses=playedFixtures.filter(f=>f.res==="L").length;
  const gd=goals-conceded,power=Number(r.power)||0;
  const report=window.lastMatchReportData||null;
  const penaltyExit=!!(report&&report.penalty&&!report.homeWon);
  const topScorers={};
  playedFixtures.forEach(f=>(f.events||[]).filter(ev=>ev.home&&ev.type==="goal").forEach(ev=>{
    const name=ev.name||LT("Bilinmeyen","Unknown","Desconocido","Unbekannt","Sconosciuto");
    topScorers[name]=(topScorers[name]||0)+1;
  }));
  const topList=Object.entries(topScorers).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]))).slice(0,3);
  const mvpMem=_mvpLoad(),runMVP=window._finalMVPName||(topList[0]&&topList[0][0])||"—";
  let bestCard="—",bestVal=-999;
  cards.forEach(k=>{
    const value=cardEff(k,s,round);
    if(value>bestVal){bestVal=value;bestCard=(L().cards[k]&&L().cards[k].n)||k;}
  });
  const expensive=s.length?s.reduce((a,b)=>(Number(b.price)||0)>(Number(a.price)||0)?b:a):null;
  const earned=Number(e.earned)||0,spent=Number(e.spent)||0,president=Number(e.president)||0;
  const net=earned-spent-president,endCash=Number(r&&r.budgetAtEnd!==undefined?r.budgetAtEnd:budget)||0,startCash=endCash-net;
  const reached=r&&r.round?((L().rounds&&L().rounds[Math.max(0,r.round-1)])||String(r.round)):"—";
  const money=value=>typeof runMoney==="function"?runMoney(value):((value<0?"-€"+Math.abs(value):"€"+value)+"M");
  const signed=value=>(value>0?"+":"")+money(value);
  const moneyTone=value=>value>0?"stat-positive":value<0?"stat-negative":"stat-neutral";
  const ratingTone=value=>value>=85?"stat-positive":value>=75?"stat-info":value>=60?"stat-neutral":"stat-negative";
  const resultTone=r&&r.won?"stat-positive":"stat-negative";
  const heroTitle=r&&r.endType==="sacked"
    ?LT("KOVULDUN","SACKED","DESTITUIDO","ENTLASSEN","ESONERATO")
    :r&&r.won
      ?LT("KUPAYI ALDIN","CUP WON","CAMPEÓN","POKALSIEGER","CAMPIONE")
      :LT("ELENDİN","RUN ENDED","ELIMINADO","AUSGESCHIEDEN","ELIMINATO");
  let heroDetail=penaltyExit
    ?LT(`${reached} · Penaltılar ${report.penalty[0]}-${report.penalty[1]}`,`${reached} · Penalties ${report.penalty[0]}-${report.penalty[1]}`,`${reached} · Penaltis ${report.penalty[0]}-${report.penalty[1]}`,`${reached} · Elfmeterschießen ${report.penalty[0]}-${report.penalty[1]}`,`${reached} · Rigori ${report.penalty[0]}-${report.penalty[1]}`)
    :r&&r.won
      ?LT("Grup ve eleme yolculuğu kupayla tamamlandı.","The group and knockout journey ended with the trophy.","El camino por grupos y eliminatorias terminó con el trofeo.","Die Reise durch Gruppen- und K.-o.-Phase endete mit dem Pokal.","Il percorso tra girone ed eliminazione diretta si è concluso con il trofeo.")
      :r&&r.endType==="sacked"
        ?LT("Başkan güveni tükendi.","Board trust ran out.","La confianza de la directiva se agotó.","Das Vertrauen des Vorstands war aufgebraucht.","La fiducia della dirigenza si è esaurita.")
        :LT(`${reached} aşamasında run sona erdi.`,`The run ended in ${reached}.`,`El recorrido terminó en ${reached}.`,`Der Run endete in ${reached}.`,`Il percorso si è concluso in ${reached}.`);
  if(r&&r.endType==="group_eliminated"&&playerGroupRow)heroDetail=LT(`Grup ${playerGroup.id} · ${playerGroupRow.rank}. sıra · ${playerGroupRow.points} puan · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} averaj`,`Group ${playerGroup.id} · rank ${playerGroupRow.rank} · ${playerGroupRow.points} points · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} goal difference`,`Grupo ${playerGroup.id} · ${playerGroupRow.rank}.º · ${playerGroupRow.points} puntos · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} de diferencia`,`Gruppe ${playerGroup.id} · Platz ${playerGroupRow.rank} · ${playerGroupRow.points} Punkte · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} Tordifferenz`,`Gruppo ${playerGroup.id} · ${playerGroupRow.rank}º · ${playerGroupRow.points} punti · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} differenza reti`);
  const resultCopy={
    W:LT("Galibiyet","Win","Victoria","Sieg","Vittoria"),
    D:LT("Beraberlik","Draw","Empate","Remis","Pareggio"),
    L:LT("Mağlubiyet","Loss","Derrota","Niederlage","Sconfitta")
  };
  const outcomeLabel=r&&r.won
    ?LT("ŞAMPİYON","CHAMPION","CAMPEÓN","SIEGER","CAMPIONE")
    :r&&r.endType==="sacked"
      ?LT("YÖNETİM KARARI","BOARD DECISION","DECISIÓN DIRECTIVA","VORSTANDSENTSCHEIDUNG","DECISIONE DIRIGENZIALE")
      :LT("TURNUVA SONUCU","TOURNAMENT RESULT","RESULTADO DEL TORNEO","TURNIERERGEBNIS","RISULTATO DEL TORNEO");

  const lastPlayedIndex=Math.max(0,played-1);
  const journey=fixtures.map((f,index)=>{
    const playedNow=!!(f&&f.res),type=f&&f.res==="W"?"win":f&&f.res==="D"?"draw":f&&f.res==="L"?"loss":"none";
    const isLast=playedNow&&index===lastPlayedIndex,penalty=isLast&&report&&report.penalty;
    const roundLabel=(L().rounds&&L().rounds[index])||`${LT("Tur","Round","Ronda","Runde","Turno")} ${index+1}`;
    const score=playedNow?`${f.gf}-${f.ga}`:"";
    const opponent=playedNow&&f.opp?f.opp:LT("Oynanmadı","Unplayed","No jugado","Nicht gespielt","Non giocato");
    const status=playedNow?(resultCopy[f.res]||"") : LT("Oynanmadı","Unplayed","No jugado","Nicht gespielt","Non giocato");
    const penaltyText=penalty?`${LT("Pen.","Pens","Pen.","Elf.","Rig.")} ${report.penalty[0]}-${report.penalty[1]}`:"";
    const label=playedNow
      ?safe(`${roundLabel}, ${opponent}, ${score}${penaltyText?" · "+penaltyText:""}, ${status}`)
      :safe(`${roundLabel}, ${status}`);
    return `<button type="button" class="ss-journey-node ${type}${isLast?" is-last":""}" data-ss-journey data-fixture-index="${index}" data-round="${safe(roundLabel)}" data-opponent="${safe(opponent)}" data-score="${safe(score)}" data-penalty="${safe(penaltyText)}" data-status="${safe(status)}" aria-label="${label}"${playedNow?"":" disabled"}><small>${safe(roundLabel)}</small><i aria-hidden="true">${index+1}</i><b>${playedNow?safe(score):"·"}</b></button>`;
  }).join("");

  const topScorer=topList[0]||null;
  const hasPlayerStory=played>=3&&runMVP!=="—";
  const playerStory=hasPlayerStory?`<button type="button" class="ss-player-spotlight" id="ssPlayerSpotlight">
    <span aria-hidden="true">★</span>
    <div><small>${LT("ÖNE ÇIKAN OYUNCU","PLAYER SPOTLIGHT","JUGADOR DESTACADO","SPIELER-FOKUS","GIOCATORE IN EVIDENZA")}</small><b>${safe(runMVP)}</b><em>${topScorer&&topScorer[0]===runMVP?LT(`${topScorer[1]} gol · Run yıldızı`,`${topScorer[1]} goals · Run star`,`${topScorer[1]} goles · Estrella`,`${topScorer[1]} Tore · Run-Star`,`${topScorer[1]} gol · Stella del percorso`):LT("Run yıldızı","Run star","Estrella del recorrido","Star des Runs","Stella del percorso")}</em></div>
  </button>`:"";

  const insightPrimary=penaltyExit
    ?LT("Normal sürede ayakta kaldın; penaltılar run’ı bitirdi.","You held on in regulation; penalties ended the run.","Resististe en el tiempo reglamentario; los penaltis terminaron el recorrido.","In der regulären Spielzeit gehalten; das Elfmeterschießen beendete den Run.","Hai retto nei tempi regolamentari; i rigori hanno chiuso il percorso.")
    :r&&r.won
      ?LT("Altı turu geçtin ve kupayı tamamladın.","You cleared all six rounds and completed the cup run.","Superaste las seis rondas y conquistaste la copa.","Du hast alle sechs Runden überstanden und den Pokal gewonnen.","Hai superato tutti i sei turni e conquistato la coppa.")
      :r&&r.endType==="sacked"
        ?LT("Run’ı saha sonucu değil, başkan güveni bitirdi.","Board trust, not a match result, ended the run.","La confianza de la directiva, no un partido, terminó el recorrido.","Das Vorstandsvertrauen, nicht ein Spielergebnis, beendete den Run.","La fiducia della dirigenza, non una partita, ha chiuso il percorso.")
        :played<=2
          ?LT("Erken elenme, bir sonraki denemede daha güvenli başlangıç değerini öne çıkarıyor.","The early exit makes a safer opening setup the priority next time.","La eliminación temprana prioriza un inicio más seguro en el próximo intento.","Das frühe Aus macht einen sichereren Start im nächsten Run zur Priorität.","L'uscita precoce rende prioritario un avvio più sicuro nel prossimo tentativo.")
          :gd<0
            ?LT("Run boyunca yenilen goller hücum üretimini aştı.","Goals conceded outpaced your attacking output.","Los goles recibidos superaron tu producción ofensiva.","Die Gegentore übertrafen deine Offensivleistung.","I gol subiti hanno superato la produzione offensiva.")
            :LT("Run sonucu dar farklarla şekillendi; ana yapı rekabetçi kaldı.","Fine margins shaped the run; the core setup stayed competitive.","Los pequeños márgenes definieron el recorrido; la base siguió siendo competitiva.","Kleine Unterschiede entschieden den Run; die Grundstruktur blieb konkurrenzfähig.","I piccoli margini hanno deciso il percorso; la struttura è rimasta competitiva.");
  const insightAction=net<0
    ?LT(`En açık gelişim alanı ${money(Math.abs(spent+president))} toplam harcama.`,`The clearest improvement area is ${money(Math.abs(spent+president))} in total spending.`,`La mejora más clara está en los ${money(Math.abs(spent+president))} de gasto total.`,`Das klarste Verbesserungspotenzial liegt bei ${money(Math.abs(spent+president))} Gesamtausgaben.`,`L'area di miglioramento più chiara sono i ${money(Math.abs(spent+president))} di spesa totale.`)
    :(e.injuries||0)===0
      ?LT("Sakatlıksız kadro yönetimi korunmaya değer.","The injury-free squad management is worth preserving.","Vale la pena mantener la gestión sin lesiones.","Das verletzungsfreie Kadermanagement sollte beibehalten werden.","Vale la pena mantenere la gestione senza infortuni.")
      :gd>0
        ?LT(`${gd>0?"+":""}${gd} gol farkı hücum dengesinin çalıştığını gösteriyor.`,`A ${gd>0?"+":""}${gd} goal difference shows the attacking balance worked.`,`La diferencia de ${gd>0?"+":""}${gd} muestra que el equilibrio ofensivo funcionó.`,`Die Tordifferenz von ${gd>0?"+":""}${gd} zeigt eine funktionierende Offensivbalance.`,`La differenza reti di ${gd>0?"+":""}${gd} mostra che l'equilibrio offensivo ha funzionato.`)
        :LT("Sonraki run’da kadro gücü ile harcama dengesini birlikte izle.","Track squad power and spending together in the next run.","Controla juntos la fuerza de plantilla y el gasto en el próximo intento.","Behalte im nächsten Run Kaderstärke und Ausgaben gemeinsam im Blick.","Nel prossimo percorso osserva insieme forza della rosa e spesa.");

  const allFlowValues=[0,startCash,startCash+earned,endCash];
  const flowMin=Math.min(...allFlowValues),flowMax=Math.max(...allFlowValues);
  const flowRange=Math.max(1,flowMax-flowMin);
  const chartTop=28,chartBottom=132,chartHeight=chartBottom-chartTop;
  const flowY=value=>chartTop+(flowMax-value)/flowRange*chartHeight;
  const flowBar=(x,from,to,kind,delay)=>{
    const y=Math.min(flowY(from),flowY(to)),height=Math.max(3,Math.abs(flowY(from)-flowY(to)));
    return `<rect class="ss-waterfall-bar ${kind}" x="${x}" y="${y.toFixed(1)}" width="105" height="${height.toFixed(1)}" rx="4" style="--ss-delay:${delay}ms"></rect>`;
  };
  const afterEarn=startCash+earned;
  const totalCost=spent+president;
  const waterfall=`<svg class="ss-waterfall" viewBox="0 0 680 180" role="img" aria-labelledby="ssWaterfallTitle ssWaterfallDesc">
    <title id="ssWaterfallTitle">${LT("Run ekonomisi şelale grafiği","Run economy waterfall chart","Gráfico de cascada de la economía","Wasserfalldiagramm der Run-Wirtschaft","Grafico a cascata dell'economia")}</title>
    <desc id="ssWaterfallDesc">${safe(LT(`Başlangıç ${money(startCash)}, gelir ${signed(earned)}, harcama ${money(-totalCost)}, kapanış ${money(endCash)}.`,`Starting cash ${money(startCash)}, income ${signed(earned)}, spending ${money(-totalCost)}, ending cash ${money(endCash)}.`,`Caja inicial ${money(startCash)}, ingresos ${signed(earned)}, gastos ${money(-totalCost)}, caja final ${money(endCash)}.`,`Startkasse ${money(startCash)}, Einnahmen ${signed(earned)}, Ausgaben ${money(-totalCost)}, Endkasse ${money(endCash)}.`,`Cassa iniziale ${money(startCash)}, entrate ${signed(earned)}, spese ${money(-totalCost)}, cassa finale ${money(endCash)}.`))}</desc>
    <line class="ss-waterfall-zero" x1="24" y1="${flowY(0).toFixed(1)}" x2="656" y2="${flowY(0).toFixed(1)}"></line>
    ${flowBar(38,0,startCash,"start",0)}
    ${flowBar(196,startCash,afterEarn,"gain",90)}
    ${flowBar(354,afterEarn,endCash,"cost",180)}
    ${flowBar(512,0,endCash,`end ${endCash<0?"negative":endCash>0?"positive":"neutral"}`,270)}
    <line class="ss-waterfall-link" x1="143" y1="${flowY(startCash).toFixed(1)}" x2="196" y2="${flowY(startCash).toFixed(1)}"></line>
    <line class="ss-waterfall-link" x1="301" y1="${flowY(afterEarn).toFixed(1)}" x2="354" y2="${flowY(afterEarn).toFixed(1)}"></line>
    <text x="90" y="18" text-anchor="middle">${safe(money(startCash))}</text>
    <text x="248" y="18" text-anchor="middle">${safe(signed(earned))}</text>
    <text x="406" y="18" text-anchor="middle">${safe(money(-totalCost))}</text>
    <text x="564" y="18" text-anchor="middle">${safe(money(endCash))}</text>
    <text class="muted" x="90" y="163" text-anchor="middle">${LT("Başlangıç","Start","Inicio","Start","Inizio")}</text>
    <text class="muted" x="248" y="163" text-anchor="middle">${LT("Gelir","Income","Ingresos","Einnahmen","Entrate")}</text>
    <text class="muted" x="406" y="163" text-anchor="middle">${LT("Harcama","Spending","Gastos","Ausgaben","Spese")}</text>
    <text class="muted" x="564" y="163" text-anchor="middle">${LT("Kapanış","End","Final","Ende","Finale")}</text>
  </svg>`;

  const groupRecap=played>=3&&tournamentState&&playerGroup&&window.CopaTournamentUI&&window.CopaTournamentRuntime?`<details class="ss-group-recap"><summary><span>${LT("GRUP AŞAMASI","GROUP STAGE","FASE DE GRUPOS","GRUPPENPHASE","FASE A GIRONI")}</span><b>${playerGroupRow?`${playerGroupRow.rank}. · ${playerGroupRow.points} ${window.CopaTournamentRuntime.copy().points} · ${playerGroupRow.gd>0?"+":""}${playerGroupRow.gd} ${window.CopaTournamentRuntime.copy().gd}`:""}</b></summary><div class="ss-group-table">${window.CopaTournamentUI.tableMarkup(tournamentState,playerGroup,window.CopaTournamentRuntime.copy(),true)}</div></details>`:"";
  const html=`<div class="season-stats-modal ${played<=2?"is-short-run":played>=5?"is-deep-run":"is-mid-run"}">
    <header class="ss-head">
      <div><span class="ss-kicker">${LT("SEZON İSTATİSTİKLERİ","SEASON STATISTICS","ESTADÍSTICAS DE TEMPORADA","SAISONSTATISTIK","STATISTICHE STAGIONALI")}</span><h3>${safe(teamName||"XI")} <small>${safe(formName)}</small></h3><p>${LT("Run","Run","Recorrido","Run","Percorso")} #${String(seedNum).padStart(4,"0")}</p></div>
      <button class="ss-close" type="button" onclick="closeModal()" aria-label="${LT("Kapat","Close","Cerrar","Schließen","Chiudi")}">×</button>
    </header>
    <div class="ss-body">
      <section class="ss-hero ${resultTone}">
        <div><span>${outcomeLabel}</span><h4>${heroTitle}</h4><p>${safe(heroDetail)}</p></div>
        <b class="ss-progress-badge">${played}<small>/6</small></b>
      </section>
      ${groupRecap}

      <div class="ss-summary-metrics" role="list" aria-label="${LT("Ana sonuçlar","Key outcomes","Resultados clave","Kernergebnisse","Risultati chiave")}">
        <div role="listitem"><span>${LT("KADRO","SQUAD","PLANTILLA","KADER","ROSA")}</span><strong class="${ratingTone(power)}">${power}</strong></div>
        <div role="listitem"><span>${LT("KAPANIŞ","ENDING CASH","CAJA FINAL","ENDKASSE","CASSA FINALE")}</span><strong class="${moneyTone(endCash)}">${money(endCash)}</strong></div>
        <div role="listitem"><span>${LT("DERECE","RECORD","BALANCE","BILANZ","BILANCIO")}</span><strong class="ss-record"><i class="stat-positive">${wins}${LT("G","W","V","S","V")}</i><i class="stat-neutral">${draws}${LT("B","D","E","U","P")}</i><i class="stat-negative">${losses}${LT("M","L","D","N","S")}</i></strong></div>
      </div>

      <div class="ss-tabs" role="tablist" aria-label="${LT("Sezon özeti görünümü","Season recap view","Vista del resumen","Saisonrückblick","Vista riepilogo")}">
        <button type="button" class="ss-tab is-active" id="ssTabSummary" role="tab" aria-selected="true" aria-controls="ssPanelSummary" data-ss-tab="summary">${LT("ÖZET","SUMMARY","RESUMEN","ÜBERSICHT","SINTESI")}</button>
        <button type="button" class="ss-tab" id="ssTabMatch" role="tab" aria-selected="false" aria-controls="ssPanelMatch" data-ss-tab="match">${LT("MAÇ","MATCH","PARTIDO","SPIEL","PARTITA")}</button>
        <button type="button" class="ss-tab" id="ssTabEconomy" role="tab" aria-selected="false" aria-controls="ssPanelEconomy" data-ss-tab="economy">${LT("EKONOMİ","ECONOMY","ECONOMÍA","FINANZEN","ECONOMIA")}</button>
      </div>

      <div class="ss-panels">
        <section class="ss-panel is-active" id="ssPanelSummary" role="tabpanel" aria-labelledby="ssTabSummary" data-ss-panel="summary">
          <div class="ss-journey-track" style="--ss-progress:${played>1?Math.round((played-1)/5*100):0}%">${journey}</div>
          <div class="ss-journey-detail" id="ssJourneyDetail" aria-live="polite"></div>
        </section>

        <section class="ss-panel" id="ssPanelMatch" role="tabpanel" aria-labelledby="ssTabMatch" data-ss-panel="match" hidden>
          <div class="ss-scoreboard">
            <span>${safe(teamName||"XI")}</span>
            <strong id="ssMatchScore">—</strong>
            <span id="ssMatchOpponent">—</span>
          </div>
          <p class="ss-match-caption" id="ssMatchCaption"></p>
          <div class="ss-goal-balance" aria-label="${LT("Run gol dengesi","Run goal balance","Balance de goles","Torbilanz","Bilancio gol")}">
            <div><span>${LT("ATILAN","FOR","A FAVOR","TORE","FATTI")}</span><i><em class="for" data-ss-goal-width="${Math.round(goals/Math.max(goals,conceded,1)*100)}"></em></i><b>${goals}</b></div>
            <div><span>${LT("YENİLEN","AGAINST","EN CONTRA","GEGENTORE","SUBITI")}</span><i><em class="against" data-ss-goal-width="${Math.round(conceded/Math.max(goals,conceded,1)*100)}"></em></i><b>${conceded}</b></div>
          </div>
          <div class="ss-match-meta">
            <span>${LT("Gol farkı","Goal difference","Diferencia","Tordifferenz","Differenza reti")} <b class="${gd>0?"stat-positive":gd<0?"stat-negative":"stat-neutral"}">${gd>0?"+":""}${gd}</b></span>
            <span>${LT("Sakatlık","Injuries","Lesiones","Verletzungen","Infortuni")} <b>${e.injuries||0}</b></span>
            <span>${LT("En güçlü kart","Best card","Mejor carta","Beste Karte","Carta migliore")} <b>${bestVal>0?safe(bestCard)+" +"+bestVal:"—"}</b></span>
          </div>
          ${playerStory}
        </section>

        <section class="ss-panel" id="ssPanelEconomy" role="tabpanel" aria-labelledby="ssTabEconomy" data-ss-panel="economy" hidden>
          ${waterfall}
          <div class="ss-economy-meta">
            <span>${LT("Transfer + kart","Transfers + cards","Traspasos + cartas","Transfers + Karten","Trasferimenti + carte")} <b class="${spent>0?"stat-negative":"stat-neutral"}">${money(-spent)}</b></span>
            <span>${LT("Başkan","Chairman","Presidente","Präsident","Presidente")} <b class="${president>0?"stat-negative":"stat-neutral"}">${money(-president)}</b></span>
            <span>${LT("En pahalı","Costliest","Más caro","Teuerster","Più costoso")} <b>${expensive?safe(shortName(expensive))+" "+money(expensive.price||0):"—"}</b></span>
          </div>
        </section>
      </div>

      <div class="ss-takeaway ${net<0||penaltyExit?"negative":"positive"}">
        <i aria-hidden="true"></i><p><b>${LT("RUN ÖZETİ","RUN TAKEAWAY","CLAVE DEL RECORRIDO","RUN-FAZIT","SINTESI DEL PERCORSO")}</b> ${safe(insightPrimary)} ${safe(insightAction)}</p>
      </div>
    </div>
  </div>`;

  showModal(html,{dismissOnOverlay:true,label:LT("Sezon İstatistikleri","Season Statistics","Estadísticas de temporada","Saisonstatistik","Statistiche stagionali"),bare:true});

  const modal=document.querySelector(".season-stats-modal");
  const tabs=Array.from(modal.querySelectorAll("[data-ss-tab]"));
  const panels=Array.from(modal.querySelectorAll("[data-ss-panel]"));
  const journeyNodes=Array.from(modal.querySelectorAll("[data-ss-journey]"));
  const journeyDetail=document.getElementById("ssJourneyDetail");
  const matchScore=document.getElementById("ssMatchScore");
  const matchOpponent=document.getElementById("ssMatchOpponent");
  const matchCaption=document.getElementById("ssMatchCaption");
  const reduced=(typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches)||document.body.classList.contains("reduced-motion");

  const updateSelectedMatch=node=>{
    if(!node||node.disabled)return;
    journeyNodes.forEach(item=>item.classList.toggle("is-selected",item===node));
    const detailScore=node.dataset.penalty?`${node.dataset.score} · ${node.dataset.penalty}`:node.dataset.score;
    if(journeyDetail)journeyDetail.innerHTML=`<b>${safe(node.dataset.round)}</b><span>${safe(node.dataset.opponent)}</span><strong>${safe(detailScore)}</strong><em>${safe(node.dataset.status)}</em>`;
    if(matchScore)matchScore.textContent=node.dataset.score||"—";
    if(matchOpponent)matchOpponent.textContent=node.dataset.opponent||"—";
    if(matchCaption)matchCaption.textContent=[node.dataset.round,node.dataset.status,node.dataset.penalty].filter(Boolean).join(" · ");
  };
  journeyNodes.forEach(node=>node.addEventListener("click",()=>updateSelectedMatch(node)));
  const initialJourney=journeyNodes[lastPlayedIndex]||journeyNodes.find(node=>!node.disabled);
  if(initialJourney)updateSelectedMatch(initialJourney);

  const drawPanel=panel=>{
    if(panel.dataset.ssPanel==="match"){
      panel.querySelectorAll("[data-ss-goal-width]").forEach(node=>node.style.width=(node.dataset.ssGoalWidth||0)+"%");
    }
    if(panel.dataset.ssPanel==="economy"){
      panel.classList.remove("is-drawn");
      if(reduced)panel.classList.add("is-drawn");
      else requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.add("is-drawn")));
    }
  };
  const selectTab=tab=>{
    tabs.forEach(item=>{
      const active=item===tab;
      item.classList.toggle("is-active",active);
      item.setAttribute("aria-selected",String(active));
    });
    panels.forEach(panel=>{
      const active=panel.dataset.ssPanel===tab.dataset.ssTab;
      panel.hidden=!active;
      panel.classList.toggle("is-active",active);
      if(active)drawPanel(panel);
    });
  };
  tabs.forEach((tab,index)=>{
    tab.addEventListener("click",()=>selectTab(tab));
    tab.addEventListener("keydown",event=>{
      if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
      event.preventDefault();
      const offset=event.key==="ArrowRight"?1:-1;
      const next=tabs[(index+offset+tabs.length)%tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  const findProfilePlayer=name=>s.find(p=>p&&(p.name===name||surOf(p)===name||(typeof shortName==="function"&&shortName(p)===name)));
  const playerSpotlight=document.getElementById("ssPlayerSpotlight");
  const spotlightPlayer=findProfilePlayer(runMVP);
  if(playerSpotlight&&spotlightPlayer&&window.PlayerProfiles)PlayerProfiles.bind(playerSpotlight,spotlightPlayer);

  requestAnimationFrame(()=>requestAnimationFrame(()=>modal.classList.add("is-ready")));
}

global.CopaSeasonStats={render};
})(window);
