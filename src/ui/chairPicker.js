(function(global){
  "use strict";

  const presentation={
    babacan:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"Geniş borç limitiyle rahat harcama yaparsın. Finalde borcu kontrol etmen gerekir.",en:"A wide debt limit lets you spend freely. You must control debt before the final.",es:"Un límite de deuda amplio permite gastar con libertad. Controla la deuda antes de la final.",de:"Ein hohes Schuldenlimit gibt dir mehr Spielraum. Vor dem Finale musst du die Schulden senken.",it:"Un ampio limite debiti offre più libertà. Controlla il debito prima della finale."},
      contract:{adv:{tr:"En geniş borç alanı: −€28M.",en:"Widest debt margin: −€28M."},trigger:{tr:"Güven 3/3: danışma €1M.",en:"Trust 3/3: consultation costs €1M."},red:{tr:"Kartlar +€1M. Borç disiplinini koru.",en:"Cards cost +€1M; keep debt under control."}}
    },
    leydi:{
      tag:{tr:"Dengeli",en:"Balanced",es:"Equilibrio",de:"Ausgewogen",it:"Equilibrio"},
      style:{tr:"Yerli oyuncular daha sık gelir. Yüksek kimya takımı güçlendirir.",en:"Local players appear more often. Strong chemistry boosts the team.",es:"Aparecen más jugadores locales. Una buena química fortalece al equipo.",de:"Einheimische Spieler erscheinen häufiger. Gute Chemie stärkt das Team.",it:"I giocatori locali appaiono più spesso. Una buona chimica rafforza la squadra."},
      contract:{adv:{tr:"Yerli adaylar daha sık gelir.",en:"Local candidates appear more often."},trigger:{tr:"Kimya +3: bu maç +1 güç ve güven.",en:"Chemistry +3: +1 power and trust this match."},red:{tr:"Negatif kimya: −1 güç ve güven.",en:"Negative chemistry: −1 power and trust."}}
    },
    pinti:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"Transferleri ucuza alır ve para biriktirir. Pahalı kartlar ek ücretlidir.",en:"Transfers cost less and savings grow each round. Premium cards cost extra.",es:"Los fichajes cuestan menos y ahorras cada ronda. Las cartas premium cuestan más.",de:"Transfers sind günstiger und du sparst jede Runde. Premiumkarten kosten extra.",it:"I trasferimenti costano meno e risparmi ogni turno. Le carte premium costano di più."},
      contract:{adv:{tr:"Transferler %10 ucuz.",en:"Transfers cost 10% less."},trigger:{tr:"Pozitif kasayla bitir: €2M biriktir.",en:"Finish in the black: save €2M."},red:{tr:"Aktif limit −€14M. Büyük harcama güven düşürür.",en:"Active limit −€14M; big spending costs trust."}}
    },
    sansasyoncu:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Yıldız transferleri hemen güç verir. Pazar daha pahalıdır.",en:"Star signings give immediate power. The market is more expensive.",es:"Los fichajes estrella dan poder inmediato. El mercado es más caro.",de:"Startransfers geben sofort Stärke. Der Markt ist teurer.",it:"Gli acquisti stellari danno forza immediata. Il mercato è più caro."},
      contract:{adv:{tr:"85+ transfer: turda bir kez +2/+3 güç.",en:"85+ signing: +2/+3 power once per round."},trigger:{tr:"Grup ve eleme açılışında Spotlight.",en:"Spotlight at the group and knockout openers."},red:{tr:"Pazar +€2M. Sıkıcı transfer güven düşürür.",en:"Market +€2M; a dull signing costs trust."}}
    },
    torpilci:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Bazı kadro kararları zorunludur. Destek ve gelişim ödülleri riski dengeler.",en:"Some squad choices are forced. Support and development rewards balance the risk.",es:"Algunas decisiones de plantilla son obligadas. Las recompensas equilibran el riesgo.",de:"Manche Kaderentscheidungen sind erzwungen. Entwicklung und Hilfe gleichen das Risiko aus.",it:"Alcune scelte di rosa sono obbligate. Crescita e aiuti bilanciano il rischio."},
      contract:{adv:{tr:"Kartlar −€1M. Yeğen her tur +3 gelişir.",en:"Cards −€1M; the nephew grows +3 each round."},trigger:{tr:"3. tur: tek zorunlu yeğen kararı.",en:"Round 3: one mandatory nephew decision."},red:{tr:"Kabul finalde −1 güç. Ret limiti €3M daraltır.",en:"Accept: −1 final power; decline tightens debt by €3M."}}
    },
    cilgin:{
      tag:{tr:"Kaos",en:"Chaos",es:"Caos",de:"Chaos",it:"Caos"},
      style:{tr:"Borç limiti geniştir ama krizler öngörülemez. DARK kartlar daha sık gelir.",en:"The debt limit is wide but crises are unpredictable. DARK cards appear more often.",es:"El límite de deuda es amplio pero las crisis son imprevisibles. Aparecen más cartas DARK.",de:"Das Schuldenlimit ist hoch, Krisen sind aber unberechenbar. DARK-Karten erscheinen häufiger.",it:"Il limite debiti è ampio ma le crisi sono imprevedibili. Le carte DARK appaiono più spesso."},
      contract:{adv:{tr:"En geniş limit: −€29M. DARK daha sık.",en:"Widest limit: −€29M; DARK appears more often."},trigger:{tr:"Run başına en fazla 2 isteğe bağlı kaos zarı.",en:"Up to 2 optional chaos dice per run."},red:{tr:"Güven 0: zar zorunlu. En fazla 1 bütçe krizi.",en:"Trust 0: roll is mandatory; at most 1 budget crisis."}}
    }
  };

  const labels={
    prev:{tr:"ÖNCEKİ",en:"PREVIOUS",es:"ANTERIOR",de:"ZURÜCK",it:"PRECEDENTE"},
    next:{tr:"SONRAKİ",en:"NEXT",es:"SIGUIENTE",de:"WEITER",it:"SUCCESSIVO"},
    advantage:{tr:"ANA AVANTAJ",en:"MAIN ADVANTAGE",es:"VENTAJA PRINCIPAL",de:"HAUPTVORTEIL",it:"VANTAGGIO PRINCIPALE"},
    trigger:{tr:"TETİKLEYİCİ",en:"TRIGGER",es:"ACTIVADOR",de:"AUSLÖSER",it:"ATTIVATORE"},
    redline:{tr:"KIRMIZI ÇİZGİ",en:"RED LINE",es:"LÍNEA ROJA",de:"ROTE LINIE",it:"LINEA ROSSA"},
    play:{tr:"OYUN TARZI",en:"PLAY STYLE",es:"ESTILO DE JUEGO",de:"SPIELSTIL",it:"STILE DI GIOCO"},
    close:{tr:"Kapat",en:"Close",es:"Cerrar",de:"Schließen",it:"Chiudi"},
    select:{tr:"BAŞKANI SEÇ",en:"SELECT CHAIRMAN",es:"ELEGIR PRESIDENTE",de:"PRÄSIDENT WÄHLEN",it:"SCEGLI PRESIDENTE"}
  };

  const read=(values,lang)=>values[lang]||values.en||values.tr||"";
  const numericTones={
    babacan:{adv:["positive"],trigger:["positive","negative"],red:["negative"]},
    leydi:{adv:[],trigger:["positive","positive"],red:["negative"]},
    pinti:{adv:["positive"],trigger:["positive"],red:["negative"]},
    sansasyoncu:{adv:["positive","positive"],trigger:[],red:["negative"]},
    torpilci:{adv:["positive","positive"],trigger:["neutral"],red:["negative","negative"]},
    cilgin:{adv:["positive"],trigger:["neutral"],red:["negative","warning"]}
  };
  const numericPattern=/(?:[+−-]?€\d+(?:[.,]\d+)?M|%\d+(?:[.,]\d+)?|[+−-]?\d+(?:\/[+−-]?\d+)+(?:%|M)?|[+−-]?\d+(?:[.,]\d+)?\+?)/g;
  function renderContractValue(values,lang,tones){
    let index=0;
    return read(values,lang).replace(numericPattern,value=>{
      const tone=tones[index++]||"neutral";
      return`<span class="cp-context-number is-${tone}">${value}</span>`;
    });
  }
  function render(model){
    const lang=model.lang||"en",meta=presentation[model.id]||presentation.leydi;
    const prev=model.total>1?`<button class="cp-nav-btn cp-nav-prev" onclick="showChairPopup('${model.prevId}')" aria-label="${read(labels.prev,lang)}"><span aria-hidden="true">←</span><small>${read(labels.prev,lang)}</small></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const next=model.total>1?`<button class="cp-nav-btn cp-nav-next" onclick="showChairPopup('${model.nextId}')" aria-label="${read(labels.next,lang)}"><small>${read(labels.next,lang)}</small><span aria-hidden="true">→</span></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const contract=meta.contract||presentation.leydi.contract;
    const contractRows=[
      ["advantage","adv",contract.adv],
      ["trigger","trigger",contract.trigger],
      ["redline","red",contract.red]
    ].map(([label,tone,value])=>`<div class="cp-contract-row cp-contract-${tone}"><span class="cp-fx-hdr">${read(labels[label],lang)}</span><p>${renderContractValue(value,lang,(numericTones[model.id]&&numericTones[model.id][tone])||[])}</p></div>`).join("");
    const image=`<img src="${model.image}" alt="${model.name}" class="cpphoto" loading="eager" decoding="async" onerror="this.style.display='none'">`;
    const cash=Number.isFinite(Number(model.cash))?`€${model.cash}M`:`€30M`,debt=Number.isFinite(Number(model.debt))?`−€${model.debt}M`:"—";
    return`<div class="chairpopup chair-picker-modal" data-chair-id="${model.id}"><div class="cp-top-controls"><span class="cp-counter">${model.index+1} / ${model.total}</span><button class="cp-close" onclick="closeModal()" aria-label="${read(labels.close,lang)}">×</button></div><div class="cp-layout"><section class="cp-persona" aria-label="${model.name}"><div class="cp-portrait-frame">${image}</div><div class="cp-persona-copy"><div class="chairpopup-name">${model.name}</div><div class="cp-persona-role">${model.role}</div></div><strong class="cp-role-badge">${read(meta.tag,lang)}</strong></section><section class="cp-mechanics"><div class="cp-contract">${contractRows}</div><div class="cp-playstyle"><span class="cp-fx-hdr">${read(labels.play,lang)}</span><p>${read(meta.style,lang)}</p></div></section></div><div class="cp-bot-row">${prev}<div class="cp-action-stack"><button class="cp-sel-btn" onclick="confirmChair('${model.id}')">${read(labels.select,lang)}</button></div>${next}</div></div>`;
  }

  global.CopaChairPicker=Object.freeze({render});
})(window);
