/* Run-end editorial story and economy renderer. Loaded only after a completed run. */
function narrativeTerminalFixture(){
  const played=(fixtures||[]).filter(f=>f&&f.res);
  return played.length?played[played.length-1]:null;
}
function narrativeCriticalGoal(fixture){
  if(!fixture||fixture.res!=="L"||!Array.isArray(fixture.events))return null;
  const goals=fixture.events.filter(event=>{
    if(!event||event.type!=="goal")return false;
    return event.home===false||event.side==="away"||event.side==="B";
  });
  if(!goals.length)return null;
  return goals.sort((a,b)=>(Number(a.m??a.minute)||0)-(Number(b.m??b.minute)||0)).pop();
}
function selectNarrativeEvents(candidates){
  const unique=[],seen=new Set();
  candidates.filter(Boolean).forEach(item=>{
    const key=item.kind+"|"+storyTextKey(item.d);
    if(seen.has(key))return;
    seen.add(key);
    unique.push(item);
  });
  const ending=unique.find(item=>item.ending);
  const chosen=unique.filter(item=>!item.ending).sort((a,b)=>(b.importance||0)-(a.importance||0)).slice(0,ending?3:4);
  if(ending)chosen.push(ending);
  return chosen.sort((a,b)=>(a.order||0)-(b.order||0)).slice(0,4);
}
function genStoryNarrative(){
  const r=lastResult||{},e=r.econ||econStats||{},sq=picksBySlot.filter(Boolean),x=L();
  const expensive=sq.length?sq.reduce((a,b)=>(Number(b.price)||0)>(Number(a.price)||0)?b:a):null;
  let storyCard="",storyCardVal=0;
  cards.forEach(card=>{
    const value=cardEff(card,sq,round);
    if(value>storyCardVal){storyCardVal=value;storyCard=(x.cards[card]&&x.cards[card].n)||card;}
  });
  const fixture=narrativeTerminalFixture(),critical=narrativeCriticalGoal(fixture),items=[];
  if(expensive&&(Number(expensive.price)||0)>0)items.push({
    kind:"transfer",order:10,importance:55+(Number(expensive.price)||0),
    t:LT("Sezonun transferi","The defining transfer","El fichaje del run","Der Transfer des Runs","Il trasferimento del run"),
    d:LT(
      `${shortName(expensive)}, ${runMoney(expensive.price)} bedelle kadronun en pahalı hamlesi oldu.`,
      `${shortName(expensive)} was the biggest outlay of the run at ${runMoney(expensive.price)}.`,
      `${shortName(expensive)} fue la mayor inversión del run por ${runMoney(expensive.price)}.`,
      `${shortName(expensive)} war mit ${runMoney(expensive.price)} der teuerste Schritt des Runs.`,
      `${shortName(expensive)} è stato l'acquisto più costoso del run a ${runMoney(expensive.price)}.`
    )
  });
  if(storyCard&&storyCardVal>0)items.push({
    kind:"card",order:30,importance:42+storyCardVal,
    t:LT("Kartın etkisi","Card impact","Impacto de carta","Karteneffekt","Impatto carta"),
    d:LT(
      `${storyCard}, ${storyCardVal} güçlük katkıyla en etkili kart oldu.`,
      `${storyCard} was the most effective card with a ${storyCardVal}-point boost.`,
      `${storyCard} fue la carta más efectiva con ${storyCardVal} puntos de aporte.`,
      `${storyCard} war mit ${storyCardVal} Punkten die wirkungsvollste Karte.`,
      `${storyCard} è stata la carta più efficace con un contributo di ${storyCardVal} punti.`
    )
  });
  if((e.injuries||0)>0)items.push({
    kind:"injury",order:40,importance:52+(e.injuries||0)*4,
    t:LT("Plan değişti","The plan changed","El plan cambió","Der Plan änderte sich","Il piano è cambiato"),
    d:(benchUsed||0)>0
      ?LT(
        `${e.injuries} sakatlık sonrası yedek kulübesi ${benchUsed} kez devreye girdi.`,
        `${e.injuries} injur${e.injuries===1?"y":"ies"} forced the bench into action ${benchUsed} time${benchUsed===1?"":"s"}.`,
        `${e.injuries} lesión${e.injuries===1?"":"es"} obligaron a usar el banquillo ${benchUsed} veces.`,
        `${e.injuries} Verletzung${e.injuries===1?"":"en"} brachten die Bank ${benchUsed}-mal ins Spiel.`,
        `${e.injuries} infortun${e.injuries===1?"io":"i"} hanno richiesto ${benchUsed} interventi dalla panchina.`
      )
      :LT(
        `${e.injuries} sakatlık sezon planını bozdu.`,
        `${e.injuries} injur${e.injuries===1?"y":"ies"} disrupted the season plan.`,
        `${e.injuries} lesión${e.injuries===1?"":"es"} alteraron el plan del run.`,
        `${e.injuries} Verletzung${e.injuries===1?"":"en"} störten den Plan des Runs.`,
        `${e.injuries} infortun${e.injuries===1?"io":"i"} hanno cambiato il piano del run.`
      )
  });
  if(wkDevName)items.push({
    kind:"star",order:50,importance:60,
    t:LT("Yükselen isim","Breakout name","Nombre revelación","Durchstarter","Nome emergente"),
    d:LT(
      `${wkDevName}, turnuva ilerledikçe güçlendi.`,
      `${wkDevName} grew stronger as the tournament progressed.`,
      `${wkDevName} creció a medida que avanzó el torneo.`,
      `${wkDevName} wurde im Verlauf des Turniers stärker.`,
      `${wkDevName} è cresciuto con il procedere del torneo.`
    )
  });
  if((e.finalDebt||finalPenalty||0)>0)items.push({
    kind:"risk",order:70,importance:58+(e.finalDebt||finalPenalty||0),
    t:LT("Riskin bedeli","The cost of risk","El coste del riesgo","Preis des Risikos","Il costo del rischio"),
    d:LT(
      `Riskli hamleler son maç hesabında ${e.finalDebt||finalPenalty} güç kaybettirdi.`,
      `Risky calls cost ${e.finalDebt||finalPenalty} power in the final calculation.`,
      `Las decisiones arriesgadas costaron ${e.finalDebt||finalPenalty} puntos de fuerza en el cálculo final.`,
      `Riskante Entscheidungen kosteten in der Schlussrechnung ${e.finalDebt||finalPenalty} Stärke.`,
      `Le scelte rischiose sono costate ${e.finalDebt||finalPenalty} punti forza nel calcolo finale.`
    )
  });
  if(critical){
    const minute=Number(critical.m??critical.minute)||0,name=critical.name||critical.scorer||fixture.opp;
    items.push({
      kind:"critical",order:90,importance:92,
      t:LT("Kırılma anı","Turning point","Momento decisivo","Wendepunkt","Momento decisivo"),
      d:LT(
        `${minute}. dakikadaki ${name} golü kupa umutlarını bitirdi.`,
        `${name}'s ${minute}th-minute goal ended the cup hopes.`,
        `El gol de ${name} en el minuto ${minute} acabó con las opciones de copa.`,
        `${name}s Tor in der ${minute}. Minute beendete die Pokalhoffnung.`,
        `Il gol di ${name} al ${minute}' ha spento le speranze di coppa.`
      )
    });
  }
  const roundLabel=x.rounds&&x.rounds[Math.max(0,(r.won?6:r.round)-1)]||String(r.round||"");
  const opponent=fixture&&fixture.opp,score=r.score||(fixture&&fixture.gf!=null?`${fixture.gf}-${fixture.ga}`:"");
  const chairId=r.chairmanId||(chairman&&chairman.id),chairName=chairId&&x.chair&&x.chair[chairId]?x.chair[chairId].n:"Başkan";
  let endingTitle,endingText;
  if(r.endType==="sacked"){
    endingTitle=LT("Başkanın kararı","The chairman's call","La decisión presidencial","Entscheidung des Präsidenten","La decisione del presidente");
    endingText=LT(
      `Kasa ${runMoney(r.budgetAtEnd)} seviyesine düşünce ${chairName} run'ı sona erdirdi.`,
      `${chairName} ended the run when funds fell to ${runMoney(r.budgetAtEnd)}.`,
      `${chairName} terminó el run cuando la caja cayó a ${runMoney(r.budgetAtEnd)}.`,
      `${chairName} beendete den Run, als die Kasse auf ${runMoney(r.budgetAtEnd)} fiel.`,
      `${chairName} ha chiuso il run quando la cassa è scesa a ${runMoney(r.budgetAtEnd)}.`
    );
  }else if(r.won){
    endingTitle=LT("Kupa senin","The cup is yours","La copa es tuya","Der Pokal gehört dir","La coppa è tua");
    endingText=opponent&&score
      ?LT(
        `Finalde ${opponent} karşısında ${score} kazanıp kupayı kaldırdın.`,
        `You beat ${opponent} ${score} in the final and lifted the cup.`,
        `Venciste a ${opponent} ${score} en la final y levantaste la copa.`,
        `Du hast ${opponent} im Finale mit ${score} besiegt und den Pokal geholt.`,
        `Hai battuto ${opponent} ${score} in finale e alzato la coppa.`
      )
      :LT("Finali kazanıp kupayı kaldırdın.","You won the final and lifted the cup.","Ganaste la final y levantaste la copa.","Du hast das Finale gewonnen und den Pokal geholt.","Hai vinto la finale e alzato la coppa.");
  }else{
    endingTitle=LT("Turnuvaya veda","Cup exit","Despedida del torneo","Pokalaus","Uscita dalla coppa");
    endingText=opponent&&score
      ?LT(
        `${roundLabel} aşamasında ${opponent} karşısında ${score} kaybederek turnuvaya veda ettin.`,
        `The run ended with a ${score} defeat to ${opponent} in ${roundLabel}.`,
        `El run terminó con una derrota ${score} ante ${opponent} en ${roundLabel}.`,
        `Der Run endete in ${roundLabel} mit einer ${score}-Niederlage gegen ${opponent}.`,
        `Il run si è chiuso in ${roundLabel} con la sconfitta ${score} contro ${opponent}.`
      )
      :LT(
        `${roundLabel} aşamasında turnuvaya veda ettin.`,
        `The cup run ended in ${roundLabel}.`,
        `El recorrido terminó en ${roundLabel}.`,
        `Der Pokallauf endete in ${roundLabel}.`,
        `Il percorso in coppa è finito in ${roundLabel}.`
      );
  }
  items.push({kind:r.won?"win":r.endType==="sacked"?"chair":"exit",order:100,importance:100,ending:true,t:endingTitle,d:endingText});
  return storyFlowHTML(selectNarrativeEvents(items));
}
function financeNarrative(e,endCash){
  const spent=Number(e.spent)||0,earned=Number(e.earned)||0;
  if(spent>earned+25)return LT("Transfer ve kart harcamaları run boyunca bütçeyi zorladı.","Transfer and card spending strained the budget throughout the run.","Los fichajes y las cartas presionaron el presupuesto durante todo el run.","Transfers und Karten belasteten das Budget über den gesamten Run.","Trasferimenti e carte hanno messo sotto pressione il budget per tutto il run.");
  if(endCash<0&&spent>earned)return LT("Turnuva gelirleri harcamaları karşılamaya yetmedi.","Tournament income was not enough to cover the spending.","Los ingresos del torneo no bastaron para cubrir los gastos.","Die Turniereinnahmen reichten nicht für die Ausgaben.","I ricavi del torneo non sono bastati a coprire le spese.");
  if(spent>earned&&endCash>=0)return LT("Agresif yatırımlara rağmen kasayı ayakta tuttun.","The club stayed afloat despite aggressive investment.","El club se mantuvo a flote pese a las inversiones agresivas.","Trotz aggressiver Investitionen blieb der Club zahlungsfähig.","Il club è rimasto in piedi nonostante gli investimenti aggressivi.");
  if(earned>=spent&&endCash>=0)return LT("Dengeli ekonomi sayesinde ayakta kaldın.","A balanced economy kept the club standing.","Una economía equilibrada mantuvo al club en pie.","Eine ausgeglichene Wirtschaft hielt den Club stabil.","Un'economia equilibrata ha tenuto in piedi il club.");
  return LT("Gelir ve harcamalar birbirine yakın kapandı.","Income and spending finished close to balance.","Ingresos y gastos terminaron casi equilibrados.","Einnahmen und Ausgaben lagen am Ende nah beieinander.","Entrate e spese hanno chiuso quasi in equilibrio.");
}
function econSummaryNarrativeHTML(){
  const r=lastResult||{},e=r.econ||econStats||{},s=picksBySlot.filter(Boolean);
  const expensive=s.length?s.reduce((a,b)=>(Number(b.price)||0)>(Number(a.price)||0)?b:a):null;
  let bestCard="",bestVal=0;
  cards.forEach(card=>{const value=cardEff(card,s,round);if(value>bestVal){bestVal=value;bestCard=(L().cards[card]&&L().cards[card].n)||card;}});
  const endCash=typeof r.budgetAtEnd!=="undefined"?Number(r.budgetAtEnd)||0:Number(budget)||0;
  const cashClass=endCash<0?"neg":endCash>0?"pos":"neutral",rows=[];
  if((e.earned||0)>0)rows.push({l:LT("Kazanılan","Earned","Ingresado","Eingenommen","Guadagnato"),v:signedRunMoney(e.earned),c:"pos"});
  if((e.spent||0)>0)rows.push({l:LT("Harcanan","Spent","Gastado","Ausgegeben","Speso"),v:runMoney(-e.spent),c:"neg"});
  if((e.president||0)>0)rows.push({l:LT("Başkan maliyeti","Chairman cost","Coste presidencial","Präsidentenkosten","Costo presidente"),v:runMoney(-e.president),c:"neg"});
  if((e.worstDebt||0)<0)rows.push({l:LT("En düşük kasa","Lowest funds","Caja mínima","Niedrigster Kassenstand","Cassa minima"),v:runMoney(e.worstDebt),c:"neg"});
  if(expensive&&(Number(expensive.price)||0)>0)rows.push({l:LT("En pahalı oyuncu","Most expensive player","Jugador más caro","Teuerster Spieler","Giocatore più costoso"),v:`${shortName(expensive)} ${runMoney(expensive.price)}`,c:"neutral"});
  if(bestCard&&bestVal>0)rows.push({l:LT("En etkili kart","Most effective card","Carta más efectiva","Effektivste Karte","Carta più efficace"),v:`${bestCard} +${bestVal}`,c:"pos"});
  if((e.injuries||0)>0||(benchUsed||0)>0)rows.push({l:LT("Sakatlık / yedek","Injuries / bench","Lesiones / banquillo","Verletzungen / Bank","Infortuni / panchina"),v:`${e.injuries||0} / ${benchUsed||0}`,c:"neutral"});
  if((e.finalDebt||0)>0)rows.push({l:LT("Son maç güç kaybı","Final-match power loss","Pérdida de fuerza final","Stärkeverlust im letzten Spiel","Perdita forza finale"),v:"-"+e.finalDebt,c:"neg"});
  const rowHtml=rows.length?rows.map(row=>`<div class="pbr"><span>${row.l}</span><b class="money ${row.c}">${row.v}</b></div>`).join(""):`<div class="econ-empty">${LT("Kayda değer ek maliyet oluşmadı.","No notable extra cost was recorded.","No hubo costes extra relevantes.","Keine nennenswerten Zusatzkosten.","Nessun costo extra rilevante.")}</div>`;
  return `<div class="econsum"><div class="sth" id="econSumTitle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="13" height="13" style="vertical-align:-.15em;margin-right:4px"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 17l0 -5"/><path d="M12 17l0 -1"/><path d="M15 17l0 -3"/></svg><span id="econSumText">${LT("EKONOMİ ÖZETİ","ECONOMY SUMMARY","RESUMEN ECONÓMICO","FINANZÜBERSICHT","RIEPILOGO ECONOMICO")}</span></div><div class="econ-hero"><span>${LT("FİNANS SONUCU","FINANCE RESULT","RESULTADO FINANCIERO","FINANZERGEBNIS","RISULTATO FINANZIARIO")}</span><b class="money ${cashClass}">${runMoney(endCash)}</b><p>${financeNarrative(e,endCash)}</p></div><div class="pbreak">${rowHtml}</div></div>`;
}
genStory=genStoryNarrative;
econSummaryHTML=econSummaryNarrativeHTML;
window.CopaRunNarrativeReady=true;
