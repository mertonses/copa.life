(function(global){
  "use strict";

  const presentation={
    babacan:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"Geniş borç limitiyle rahat harcama yaparsın. Finalde borcu kontrol etmen gerekir.",en:"A wide debt limit lets you spend freely. You must control debt before the final.",es:"Un límite de deuda amplio permite gastar con libertad. Controla la deuda antes de la final.",de:"Ein hohes Schuldenlimit gibt dir mehr Spielraum. Vor dem Finale musst du die Schulden senken.",it:"Un ampio limite debiti offre più libertà. Controlla il debito prima della finale."}
    },
    leydi:{
      tag:{tr:"Dengeli",en:"Balanced",es:"Equilibrio",de:"Ausgewogen",it:"Equilibrio"},
      style:{tr:"Yerli oyuncular daha sık gelir. Yüksek kimya takımı güçlendirir.",en:"Local players appear more often. Strong chemistry boosts the team.",es:"Aparecen más jugadores locales. Una buena química fortalece al equipo.",de:"Einheimische Spieler erscheinen häufiger. Gute Chemie stärkt das Team.",it:"I giocatori locali appaiono più spesso. Una buona chimica rafforza la squadra."}
    },
    pinti:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"Transferleri ucuza alır ve para biriktirir. Pahalı kartlar ek ücretlidir.",en:"Transfers cost less and savings grow each round. Premium cards cost extra.",es:"Los fichajes cuestan menos y ahorras cada ronda. Las cartas premium cuestan más.",de:"Transfers sind günstiger und du sparst jede Runde. Premiumkarten kosten extra.",it:"I trasferimenti costano meno e risparmi ogni turno. Le carte premium costano di più."}
    },
    sansasyoncu:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Yıldız transferleri hemen güç verir. Pazar daha pahalıdır.",en:"Star signings give immediate power. The market is more expensive.",es:"Los fichajes estrella dan poder inmediato. El mercado es más caro.",de:"Startransfers geben sofort Stärke. Der Markt ist teurer.",it:"Gli acquisti stellari danno forza immediata. Il mercato è più caro."}
    },
    torpilci:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Bazı kadro kararları zorunludur. Destek ve gelişim ödülleri riski dengeler.",en:"Some squad choices are forced. Support and development rewards balance the risk.",es:"Algunas decisiones de plantilla son obligatorias. Las recompensas equilibran el riesgo.",de:"Manche Kaderentscheidungen sind erzwungen. Entwicklung und Hilfe gleichen das Risiko aus.",it:"Alcune scelte di rosa sono obbligate. Crescita e aiuti bilanciano il rischio."}
    },
    cilgin:{
      tag:{tr:"Kaos",en:"Chaos",es:"Caos",de:"Chaos",it:"Caos"},
      style:{tr:"Borç limiti geniştir ama krizler öngörülemez. DARK kartlar daha sık gelir.",en:"The debt limit is wide but crises are unpredictable. DARK cards appear more often.",es:"El límite de deuda es amplio pero las crisis son imprevisibles. Aparecen más cartas DARK.",de:"Das Schuldenlimit ist hoch, Krisen sind aber unberechenbar. DARK-Karten erscheinen häufiger.",it:"Il limite debiti è ampio ma le crisi sono imprevedibili. Le carte DARK appaiono più spesso."}
    }
  };

  const labels={
    prev:{tr:"ÖNCEKİ",en:"PREVIOUS",es:"ANTERIOR",de:"ZURÜCK",it:"PRECEDENTE"},
    next:{tr:"SONRAKİ",en:"NEXT",es:"SIGUIENTE",de:"WEITER",it:"SUCCESSIVO"},
    pros:{tr:"AVANTAJLAR",en:"ADVANTAGES",es:"VENTAJAS",de:"VORTEILE",it:"VANTAGGI"},
    cons:{tr:"DEZAVANTAJ",en:"DISADVANTAGE",es:"DESVENTAJA",de:"NACHTEIL",it:"SVANTAGGIO"},
    play:{tr:"OYUN TARZI",en:"PLAY STYLE",es:"ESTILO DE JUEGO",de:"SPIELSTIL",it:"STILE DI GIOCO"},
    close:{tr:"Kapat",en:"Close",es:"Cerrar",de:"Schließen",it:"Chiudi"},
    select:{tr:"BAŞKANI SEÇ",en:"SELECT CHAIRMAN",es:"ELEGIR PRESIDENTE",de:"PRÄSIDENT WÄHLEN",it:"SCEGLI PRESIDENTE"}
  };

  const read=(values,lang)=>values[lang]||values.en||values.tr||"";
  const highlight=(text,type)=>String(text).replace(/([−-]?€\d+M|[+−-]\d+%|[+−-]\d+|\d+%)/g,`<span class="cp-hl-${type}">$1</span>`);
  function effectGroup(title,type,items,symbol){
    if(!items.length)return"";
    return`<section class="cp-fx-group cp-fx-${type}"><div class="cp-fx-hdr">${title}</div><div class="cp-fx-list">${items.map(item=>`<div class="cp-fx-item cp-${type}"><span class="cp-fx-sym" aria-hidden="true">${symbol}</span><span>${highlight(item,type)}</span></div>`).join("")}</div></section>`;
  }
  function render(model){
    const lang=model.lang||"en",meta=presentation[model.id]||presentation.leydi;
    const prev=model.total>1?`<button class="cp-nav-btn cp-nav-prev" onclick="showChairPopup('${model.prevId}')" aria-label="${read(labels.prev,lang)}"><span aria-hidden="true">←</span><small>${read(labels.prev,lang)}</small></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const next=model.total>1?`<button class="cp-nav-btn cp-nav-next" onclick="showChairPopup('${model.nextId}')" aria-label="${read(labels.next,lang)}"><small>${read(labels.next,lang)}</small><span aria-hidden="true">→</span></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const effects=effectGroup(read(labels.pros,lang),"pro",model.pros.slice(0,1),"✓")+effectGroup(read(labels.cons,lang),"con",model.cons.slice(0,1),"−");
    const image=`<img src="${model.image}" alt="${model.name}" class="cpphoto" loading="eager" decoding="async" onerror="this.style.display='none'">`;
    return`<div class="chairpopup chair-picker-modal" data-chair-id="${model.id}"><div class="cp-top-controls"><span class="cp-counter">${model.index+1} / ${model.total}</span><button class="cp-close" onclick="closeModal()" aria-label="${read(labels.close,lang)}">×</button></div><div class="cp-layout"><section class="cp-persona" aria-label="${model.name}"><div class="cp-portrait-frame">${image}</div><div class="cp-persona-copy"><div class="chairpopup-name">${model.name}</div><div class="cp-persona-role">${model.role}</div></div><strong class="cp-role-badge">${read(meta.tag,lang)}</strong></section><section class="cp-mechanics"><div class="cp-fx">${effects}</div><div class="cp-playstyle"><span class="cp-fx-hdr">${read(labels.play,lang)}</span><p>${read(meta.style,lang)}</p></div></section></div><div class="cp-bot-row">${prev}<div class="cp-action-stack"><button class="cp-sel-btn" onclick="confirmChair('${model.id}')">${read(labels.select,lang)}</button></div>${next}</div></div>`;
  }

  global.CopaChairPicker=Object.freeze({render});
})(window);
