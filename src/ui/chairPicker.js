(function(global){
  "use strict";

  const presentation={
    babacan:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"Kasayı rahatlatır; geniş borç marjıyla ilerleyip final riskini yönetmek isteyenlere uygundur.",en:"Relieves the budget; suits players who want a wide debt margin and can manage the final risk.",es:"Alivia la economía; ideal para quien aprovecha un amplio margen de deuda y controla el riesgo de la final.",de:"Entlastet die Finanzen; passend für breite Kreditspielräume und kontrolliertes Finalrisiko.",it:"Alleggerisce il bilancio; ideale per chi sfrutta un ampio margine di debito e gestisce il rischio finale."}
    },
    leydi:{
      tag:{tr:"Dengeli",en:"Balanced",es:"Equilibrio",de:"Ausgewogen",it:"Equilibrio"},
      style:{tr:"Yerli oyuncu ve pozitif kimya üzerine kurulan dengeli kadroları ödüllendirir.",en:"Rewards balanced squads built around local players and positive chemistry.",es:"Premia las plantillas equilibradas basadas en jugadores locales y química positiva.",de:"Belohnt ausgewogene Kader mit einheimischen Spielern und positiver Chemie.",it:"Premia le rose equilibrate costruite su giocatori locali e chimica positiva."}
    },
    pinti:{
      tag:{tr:"Ekonomi",en:"Economy",es:"Economía",de:"Finanzen",it:"Economia"},
      style:{tr:"İndirim ve pozitif kasa disipliniyle düşük maliyetli, kontrollü bir run ister.",en:"Favors a controlled, low-cost run built on discounts and keeping the books in the black.",es:"Favorece una partida controlada y barata basada en descuentos y caja positiva.",de:"Fördert einen kontrollierten, günstigen Run mit Rabatten und positiver Kasse.",it:"Favorisce una run controllata e a basso costo, basata su sconti e cassa positiva."}
    },
    sansasyoncu:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Yıldız transferlerinden kısa vadeli güç üretir; pahalı pazarı yönetebilenlere uygundur.",en:"Turns star signings into short-term power; suits players who can manage an expensive market.",es:"Convierte los fichajes estrella en poder inmediato; exige controlar un mercado caro.",de:"Macht Startransfers zu kurzfristiger Stärke und verlangt Kontrolle über einen teuren Markt.",it:"Trasforma gli acquisti stellari in potenza immediata e richiede di gestire un mercato costoso."}
    },
    torpilci:{
      tag:{tr:"Risk",en:"Risk",es:"Riesgo",de:"Risiko",it:"Rischio"},
      style:{tr:"Zorunlu kadro kararlarını gelişim ve destekle dengeleyen yüksek riskli bir yol sunar.",en:"Offers a high-risk route that balances forced squad choices with development and support.",es:"Ofrece una vía de alto riesgo que compensa decisiones forzadas con desarrollo y apoyo.",de:"Bietet einen riskanten Weg, der erzwungene Kaderentscheidungen mit Entwicklung und Hilfe ausgleicht.",it:"Offre una strada ad alto rischio che bilancia scelte forzate, crescita e sostegno."}
    },
    cilgin:{
      tag:{tr:"Kaos",en:"Chaos",es:"Caos",de:"Chaos",it:"Caos"},
      style:{tr:"Geniş borç marjını öngörülemez krizlerle takas eden kaos odaklı bir oyun sunar.",en:"Offers a chaos-first game that trades a wide debt margin for unpredictable crises.",es:"Propone un juego caótico que cambia un amplio margen de deuda por crisis imprevisibles.",de:"Tauscht einen breiten Kreditspielraum gegen unvorhersehbare Krisen und maximales Chaos.",it:"Scambia un ampio margine di debito con crisi imprevedibili e una gestione caotica."}
    }
  };

  const labels={
    prev:{tr:"ÖNCEKİ",en:"PREVIOUS",es:"ANTERIOR",de:"ZURÜCK",it:"PRECEDENTE"},
    next:{tr:"SONRAKİ",en:"NEXT",es:"SIGUIENTE",de:"WEITER",it:"SUCCESSIVO"},
    pros:{tr:"AVANTAJLAR",en:"ADVANTAGES",es:"VENTAJAS",de:"VORTEILE",it:"VANTAGGI"},
    cons:{tr:"DEZAVANTAJ",en:"DISADVANTAGE",es:"DESVENTAJA",de:"NACHTEIL",it:"SVANTAGGIO"},
    play:{tr:"OYUN TARZI",en:"PLAY STYLE",es:"ESTILO DE JUEGO",de:"SPIELSTIL",it:"STILE DI GIOCO"},
    mechanics:{tr:"MEKANİK PROFİL",en:"MECHANICAL PROFILE",es:"PERFIL MECÁNICO",de:"MECHANISCHES PROFIL",it:"PROFILO MECCANICO"},
    close:{tr:"Kapat",en:"Close",es:"Cerrar",de:"Schließen",it:"Chiudi"},
    select:{tr:"BAŞKANI SEÇ",en:"SELECT CHAIRMAN",es:"ELEGIR PRESIDENTE",de:"PRÄSIDENT WÄHLEN",it:"SCEGLI PRESIDENTE"}
  };

  const read=(values,lang)=>values[lang]||values.en||values.tr||"";
  const highlight=(text,type)=>String(text).replace(/(€\d+M|[+]\d+%|\+\d+|−\d+|\d+%)/g,`<span class="cp-hl-${type}">$1</span>`);
  function effectGroup(title,type,items,symbol){
    if(!items.length)return"";
    return`<section class="cp-fx-group cp-fx-${type}"><div class="cp-fx-hdr">${title}</div><div class="cp-fx-list">${items.map(item=>`<div class="cp-fx-item cp-${type}"><span class="cp-fx-sym" aria-hidden="true">${symbol}</span><span>${highlight(item,type)}</span></div>`).join("")}</div></section>`;
  }
  function render(model){
    const lang=model.lang||"en",meta=presentation[model.id]||presentation.leydi;
    const prev=model.total>1?`<button class="cp-nav-btn cp-nav-prev" onclick="showChairPopup('${model.prevId}')" aria-label="${read(labels.prev,lang)}"><span aria-hidden="true">←</span><small>${read(labels.prev,lang)}</small></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const next=model.total>1?`<button class="cp-nav-btn cp-nav-next" onclick="showChairPopup('${model.nextId}')" aria-label="${read(labels.next,lang)}"><small>${read(labels.next,lang)}</small><span aria-hidden="true">→</span></button>`:`<span class="cp-nav-spacer" aria-hidden="true"></span>`;
    const effects=effectGroup(read(labels.pros,lang),"pro",model.pros,"✓")+effectGroup(read(labels.cons,lang),"con",model.cons,"−");
    const image=`<img src="${model.image}" alt="${model.name}" class="cpphoto" loading="eager" decoding="async" onerror="this.style.display='none'">`;
    return`<div class="chairpopup chair-picker-modal" data-chair-id="${model.id}"><button class="cp-close" onclick="closeModal()" aria-label="${read(labels.close,lang)}">×</button><div class="cp-layout"><section class="cp-persona" aria-label="${model.name}"><div class="cp-portrait-frame">${image}</div><div class="cp-persona-copy"><div class="chairpopup-name">${model.name}</div><div class="cp-persona-role">${model.role}</div><div class="chairpopup-desc">${model.desc}</div></div></section><section class="cp-mechanics"><div class="cp-mechanics-head"><span>${read(labels.mechanics,lang)}</span><strong class="cp-role-badge">${read(meta.tag,lang)}</strong></div><div class="cp-fx">${effects}</div><section class="cp-playstyle"><div class="cp-fx-hdr">${read(labels.play,lang)}</div><p>${read(meta.style,lang)}</p></section></section></div><div class="cp-bot-row">${prev}<div class="cp-action-stack"><span class="cp-counter">${model.index+1} / ${model.total}</span><button class="cp-sel-btn" onclick="confirmChair('${model.id}')">${read(labels.select,lang)}</button></div>${next}</div></div>`;
  }

  global.CopaChairPicker=Object.freeze({render});
})(window);
