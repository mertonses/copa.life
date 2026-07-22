(function(global){
  "use strict";

  const CONTEXT_KEY="copa.guide.context.v2";
  const SVG={
    path:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6h16v12H4Z"/><path d="M4 12h16M12 6v12"/><circle cx="8" cy="9" r="1"/><circle cx="16" cy="15" r="1"/></svg>',
    dice:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
    cup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v6a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5c0 4 1 6 4 6M16 6h3c0 4-1 6-4 6M12 14v4M8 20h8"/></svg>',
    chair:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M6 20c.7-4 2.7-6 6-6s5.3 2 6 6M12 14v6"/></svg>',
    medical:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/></svg>',
    cards:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="12" height="16" rx="2"/><path d="M5 18H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1M10 10h6M10 14h6"/></svg>'
  };
  const ICONS=[SVG.path,SVG.dice,SVG.cup,SVG.chair,SVG.medical,SVG.cards];

  const COPY={
    tr:{
      title:"COPA REHBERİ",sub:"COPA'YI İKİ DAKİKADA ÖĞREN",quick:"Hızlı Başlangıç",detail:"Detaylı Rehber",
      quickLead:"Üç fikri bil; ilk run'ını oynarken gerisini keşfet.",back:"OYUNA DÖN",close:"Kapat",
      quickItems:[
        ["Kadroyu kur","Diziliş ve başkanını seç; her mevki için gelen üç adaydan bütçene uyanı al."],
        ["Gücü doğru oku","Takım gücü temel seviyedir. Kimya, kartlar ve maç koşulları bunun üstüne eklenir."],
        ["Her bedeli gör","Borç limiti, sakatlık ve DARK kart riskleri kısa vadeli gücü pahalılaştırabilir."]
      ],
      examples:[
        "4-3-3 seçimi kanat ve orta saha rollerini zorunlu kılar.",
        "€6M harcadığında yalnız oyuncuyu değil, kalan pozisyon bütçeni de seçersin.",
        "+3 kimya, maç gücüne yaklaşık +3 puan ekler.",
        "Borç limitinin altı, güçlü kadroyu bile görevden alınma riskine sokar.",
        "Sakat oyuncu güç kaybeder; doğru yedek kaybı sınırlar.",
        "COMMON daha öngörülebilir; DARK daha yüksek etkiyi gerçek bir bedelle verir."
      ],
      glossaryTitle:"Mini sözlük",example:"GERÇEK ÖRNEK",learn:"DENEYEREK ÖĞREN",
      terms:{
        chemistry:["Kimya","Kulüp bağı, yerli çekirdek, yaş dengesi ve liderlikten doğan -5 ile +5 arası uyum. Maç gücüne doğrudan eklenir."],
        power:["Güç","İlk 11, mevki uyumu, kimya, kartlar ve geçici maç etkilerinin birleşik karşılığıdır; galibiyeti artırır ama garanti etmez."],
        debt:["Borç limiti","Başkanın tolere ettiği alt kasa sınırı. Limitin altında kalmak güven kaybı ve kovulma riski yaratır."],
        risk:["Kart riski","Özellikle DARK kartların final gücü, para, güven, kimya veya gelecek pazar üzerinde açık bedelleri olabilir."]
      },
      actions:{formation:"Diziliş ekranına git",market:"Kart pazarını göster",unavailable:"Bu aksiyon ilgili oyun ekranında açılır."},
      tips:{
        setup:["İLK RUN İPUCU","Diziliş, dolduracağın mevkileri belirler. Başkan ise bütçe ve borç alanını değiştirir."],
        draft:["İLK ZAR","Her atış bir mevkiyi belirler ve 2 saat harcar. Animasyonlar kapalıysa sonuç yine kısa bir titreşim ve zar yüzüyle gösterilir."],
        hub:["MAÇ MERKEZİ","Kimya kutusuna dokunarak güç katkısını; kartlarda ise para dışındaki riskleri görebilirsin."],
        bench:["YEDEK KULÜBESİ","Yedekler düğmesi kadroyu alt panelde açar. Android geri tuşu paneli kapatır."],
        injury:["SAKATLIK KARARI","Güç kaybını karşılaştır; yedek, ücretli tedavi veya opsiyonel ücretsiz reklam tedavisinden birini seç."],
        table:["GRUP TABLOSU","İlk iki sıra tur atlar. O: oynanan, G/B/M: galibiyet/beraberlik/mağlubiyet, AV: averaj, P: puan."]
      },
      gotIt:"ANLADIM",expand:"Detayı aç",collapse:"Detayı kapat"
    },
    en:{
      title:"COPA GUIDE",sub:"LEARN COPA IN TWO MINUTES",quick:"Quick Start",detail:"Detailed Guide",
      quickLead:"Know three ideas; discover the rest during your first run.",back:"BACK TO GAME",close:"Close",
      quickItems:[
        ["Build the squad","Pick a formation and chairman, then choose one of three candidates for each role."],
        ["Read power correctly","Squad power is the base. Chemistry, cards and match conditions are added on top."],
        ["See every cost","Debt, injuries and DARK card risks can make short-term power expensive."]
      ],
      examples:[
        "A 4-3-3 makes wide and midfield roles mandatory.",
        "Spending €6M also decides the budget left for every empty role.",
        "+3 chemistry adds roughly +3 match power.",
        "Going below the debt limit can put even a strong squad at risk of dismissal.",
        "An injured player loses power; the right substitute limits the loss.",
        "COMMON is predictable; DARK offers more impact with a real cost."
      ],
      glossaryTitle:"Mini glossary",example:"REAL EXAMPLE",learn:"LEARN BY DOING",
      terms:{
        chemistry:["Chemistry","A -5 to +5 link score from club ties, local core, age balance and leadership. It is added directly to match power."],
        power:["Power","The combined result of the XI, position fit, chemistry, cards and temporary match effects. It improves odds but never guarantees a win."],
        debt:["Debt limit","The lowest balance your chairman tolerates. Staying below it can reduce trust and trigger dismissal."],
        risk:["Card risk","DARK cards may carry visible costs to final power, cash, trust, chemistry or the next market."]
      },
      actions:{formation:"Go to formation",market:"Show card market",unavailable:"This action becomes available on the relevant game screen."},
      tips:{
        setup:["FIRST-RUN TIP","Formation sets the roles you must fill. The chairman changes your budget and debt room."],
        draft:["FIRST ROLL","Each roll chooses a role and costs 2 hours. Reduced motion still shows the result with a die face and haptic."],
        hub:["MATCH HUB","Tap Chemistry to inspect its power contribution; check every non-cash cost on cards."],
        bench:["BENCH","The Bench button opens your substitutes in a bottom sheet. Android Back closes it."],
        injury:["INJURY DECISION","Compare the power loss, then choose a substitute, paid treatment, or the optional rewarded treatment."],
        table:["GROUP TABLE","The top two advance. P: played, W/D/L: results, GD: goal difference, Pts: points."]
      },
      gotIt:"GOT IT",expand:"Expand details",collapse:"Collapse details"
    },
    es:{
      title:"GUÍA COPA",sub:"APRENDE COPA EN DOS MINUTOS",quick:"Inicio rápido",detail:"Guía detallada",
      quickLead:"Aprende tres ideas y descubre el resto en tu primera partida.",back:"VOLVER AL JUEGO",close:"Cerrar",
      quickItems:[["Forma la plantilla","Elige formación y presidente; después ficha uno de tres candidatos por puesto."],["Lee bien la fuerza","La fuerza base recibe química, cartas y condiciones del partido."],["Mira cada coste","Deuda, lesiones y riesgos DARK pueden encarecer la fuerza inmediata."]],
      examples:["El 4-3-3 exige bandas y centrocampistas.","Gastar €6M también reduce el presupuesto para los puestos vacíos.","+3 de química añade aproximadamente +3 de fuerza.","Superar el límite de deuda puede acabar en despido.","Un suplente adecuado reduce la pérdida por lesión.","COMMON es estable; DARK ofrece más a cambio de un coste real."],
      glossaryTitle:"Mini glosario",example:"EJEMPLO REAL",learn:"APRENDE JUGANDO",
      terms:{chemistry:["Química","Valor de -5 a +5 por vínculos, núcleo local, edades y liderazgo; se suma a la fuerza."],power:["Fuerza","Once, ajuste de puesto, química, cartas y efectos temporales; mejora las opciones, no garantiza."],debt:["Límite de deuda","Saldo mínimo tolerado por el presidente; rebasarlo reduce confianza y puede causar despido."],risk:["Riesgo de carta","Las DARK pueden costar fuerza final, dinero, confianza, química o el siguiente mercado."]},
      actions:{formation:"Ir a la formación",market:"Mostrar mercado",unavailable:"Disponible en la pantalla correspondiente."},
      tips:{setup:["CONSEJO INICIAL","La formación fija los puestos; el presidente cambia presupuesto y deuda."],draft:["CONSEJO INICIAL","Cada tirada ofrece tres candidatos y compromete el presupuesto restante."],hub:["CONSEJO INICIAL","Toca Química para ver su aporte y revisa los costes no monetarios de las cartas."]},
      gotIt:"ENTENDIDO",expand:"Abrir detalle",collapse:"Cerrar detalle"
    },
    de:{
      title:"COPA-GUIDE",sub:"COPA IN ZWEI MINUTEN",quick:"Schnellstart",detail:"Ausführliche Anleitung",
      quickLead:"Drei Grundideen reichen; den Rest lernst du im ersten Lauf.",back:"ZURÜCK ZUM SPIEL",close:"Schließen",
      quickItems:[["Kader bauen","Wähle Formation und Präsident, dann einen von drei Kandidaten pro Position."],["Stärke richtig lesen","Zur Grundstärke kommen Chemie, Karten und Spielbedingungen."],["Jeden Preis sehen","Schulden, Verletzungen und DARK-Risiken können kurzfristige Stärke verteuern."]],
      examples:["Ein 4-3-3 verlangt Flügel- und Mittelfeldrollen.","€6M Ausgaben verkleinern auch das Budget für offene Positionen.","+3 Chemie ergeben ungefähr +3 Spielstärke.","Unter dem Schuldenlimit droht trotz starkem Kader die Entlassung.","Der richtige Ersatz begrenzt den Verlust durch Verletzungen.","COMMON ist planbar; DARK gibt mehr Wirkung gegen echte Kosten."],
      glossaryTitle:"Mini-Lexikon",example:"ECHTES BEISPIEL",learn:"DURCH AUSPROBIEREN",
      terms:{chemistry:["Chemie","Wert von -5 bis +5 aus Verbindungen, lokalem Kern, Alter und Führung; wird zur Stärke addiert."],power:["Stärke","Startelf, Positionspassung, Chemie, Karten und temporäre Effekte; verbessert Chancen ohne Garantie."],debt:["Schuldenlimit","Tiefster tolerierter Kontostand; darunter sinkt Vertrauen und eine Entlassung ist möglich."],risk:["Kartenrisiko","DARK kann Finalstärke, Geld, Vertrauen, Chemie oder den nächsten Markt kosten."]},
      actions:{formation:"Zur Formation",market:"Kartenmarkt zeigen",unavailable:"Auf dem passenden Spielbildschirm verfügbar."},
      tips:{setup:["TIPP FÜR DEN ERSTEN LAUF","Formation bestimmt die Rollen, der Präsident Budget und Schuldenraum."],draft:["TIPP FÜR DEN ERSTEN LAUF","Drei Kandidaten bedeuten zugleich eine Entscheidung über das Restbudget."],hub:["TIPP FÜR DEN ERSTEN LAUF","Tippe auf Chemie und prüfe bei Karten auch die nicht finanziellen Kosten."]},
      gotIt:"VERSTANDEN",expand:"Details öffnen",collapse:"Details schließen"
    },
    it:{
      title:"GUIDA COPA",sub:"IMPARA COPA IN DUE MINUTI",quick:"Avvio rapido",detail:"Guida dettagliata",
      quickLead:"Bastano tre idee; scopri il resto nella prima partita.",back:"TORNA AL GIOCO",close:"Chiudi",
      quickItems:[["Crea la rosa","Scegli modulo e presidente, poi uno dei tre candidati per ogni ruolo."],["Leggi bene la forza","Alla forza base si aggiungono intesa, carte e condizioni partita."],["Valuta ogni costo","Debito, infortuni e rischi DARK possono rendere cara la forza immediata."]],
      examples:["Il 4-3-3 richiede ali e centrocampisti.","Spendere €6M riduce anche il budget per i ruoli vuoti.","+3 intesa aggiunge circa +3 forza.","Sotto il limite debiti rischi l'esonero anche con una rosa forte.","La riserva giusta limita la perdita per infortunio.","COMMON è prevedibile; DARK offre più impatto con un costo reale."],
      glossaryTitle:"Mini glossario",example:"ESEMPIO REALE",learn:"IMPARA PROVANDO",
      terms:{chemistry:["Intesa","Valore da -5 a +5 per legami, nucleo locale, età e leadership; si somma alla forza."],power:["Forza","Undici, ruolo, intesa, carte ed effetti temporanei; aumenta le chance senza garantire."],debt:["Limite debiti","Saldo minimo tollerato dal presidente; superarlo riduce fiducia e può causare l'esonero."],risk:["Rischio carta","Le DARK possono costare forza finale, denaro, fiducia, intesa o il mercato successivo."]},
      actions:{formation:"Vai al modulo",market:"Mostra mercato carte",unavailable:"Disponibile nella schermata di gioco corretta."},
      tips:{setup:["CONSIGLIO INIZIALE","Il modulo definisce i ruoli; il presidente cambia budget e debito."],draft:["CONSIGLIO INIZIALE","Tre candidati significano anche scegliere il budget che resterà."],hub:["CONSIGLIO INIZIALE","Tocca Intesa e controlla sulle carte anche i costi non monetari."]},
      gotIt:"CAPITO",expand:"Apri dettaglio",collapse:"Chiudi dettaglio"
    }
  };

  let mode="quick",activeStep=0,tipObserver=null,tipNode=null,tipTarget=null,tipCooldownUntil=0;
  const currentLang=()=>typeof LANG!=="undefined"?LANG:"en";
  const lang=()=>COPY[currentLang()]||COPY.en;
  const guideData=()=>typeof _HOWTO!=="undefined"&&(_HOWTO[currentLang()]||_HOWTO.en)||{steps:[]};
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const visible=node=>!!(node&&node.isConnected&&!node.classList.contains("hidden")&&node.getClientRects().length);
  const contextualTipsAllowed=()=>true;

  function ensureStyle(){
    if(document.querySelector("link[data-copa-howto]"))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="src/styles/howtoGuide.css?v=20260720-mobile-tip1";
    link.dataset.copaHowto="1";
    const palette=document.querySelector('link[href*="src/styles/palette.css"]');
    if(palette&&palette.parentNode)palette.parentNode.insertBefore(link,palette);
    else document.head.appendChild(link);
  }

  function quickPanel(c){
    return `<section class="howto-view howto-quick-view" role="tabpanel" aria-label="${esc(c.quick)}">
      <p class="howto-lead">${esc(c.quickLead)}</p>
      <div class="howto-quick-list">${c.quickItems.map((item,index)=>`<details class="howto-quick-card" ${matchMedia("(min-width: 721px)").matches?"open":index===0?"open":""}>
        <summary><span>${String(index+1).padStart(2,"0")}</span><b>${esc(item[0])}</b><i aria-hidden="true">+</i></summary>
        <p>${esc(item[1])}</p>
      </details>`).join("")}</div>
      <div class="howto-quick-actions">
        <button type="button" class="howto-learn-btn" data-guide-action="formation">${esc(c.actions.formation)}</button>
        <button type="button" class="howto-learn-btn" data-guide-action="market">${esc(c.actions.market)}</button>
      </div>
    </section>`;
  }

  function pathMarkup(data){
    return `<div class="howto-path-wrap"><div class="howto-path" role="tablist" aria-label="${esc(lang().detail)}">${data.steps.map((step,index)=>`
      <button type="button" class="howto-path-step${index===activeStep?" is-active":""}${index<activeStep?" is-past":""}" data-guide-step="${index}" role="tab" aria-selected="${index===activeStep}" aria-controls="howtoStepPanel">
        <span class="howto-path-node">${index+1}</span><span class="howto-path-label">${esc(step[0])}</span>
      </button>`).join("")}</div></div>`;
  }

  function glossaryMarkup(c){
    return `<section class="howto-glossary" aria-label="${esc(c.glossaryTitle)}"><h3>${esc(c.glossaryTitle)}</h3>
      <div class="howto-term-row">${Object.entries(c.terms).map(([key,term])=>`<button type="button" class="howto-term" data-guide-term="${key}" aria-expanded="false">${esc(term[0])}</button>`).join("")}</div>
      <div class="howto-term-detail" data-guide-term-detail aria-live="polite"></div>
    </section>`;
  }

  function stepPanel(c,data){
    const step=data.steps[activeStep]||["",""];
    const action=activeStep===0?"formation":activeStep===5?"market":"";
    return `<article class="howto-step-panel" id="howtoStepPanel" role="tabpanel">
      <div class="howto-step-icon">${ICONS[activeStep]||""}</div>
      <div class="howto-step-copy">
        <div class="howto-step-kicker">${String(activeStep+1).padStart(2,"0")} / 06</div>
        <h3>${esc(step[0])}</h3>
        <details class="howto-step-details" open>
          <summary><span>${esc(step[0])}</span><i aria-hidden="true">+</i></summary>
          <div class="howto-step-description">${step[1]||""}</div>
        </details>
        <div class="howto-example"><span>${esc(c.example)}</span><p>${esc(c.examples[activeStep]||"")}</p></div>
        ${action?`<div class="howto-do"><span>${esc(c.learn)}</span><button type="button" class="howto-learn-btn" data-guide-action="${action}">${esc(c.actions[action])}</button><small data-guide-action-note></small></div>`:""}
      </div>
    </article>`;
  }

  function detailedPanel(c,data){
    return `<section class="howto-view howto-detail-view" role="tabpanel" aria-label="${esc(c.detail)}">
      ${pathMarkup(data)}
      ${stepPanel(c,data)}
      ${glossaryMarkup(c)}
    </section>`;
  }

  function shell(){
    const c=lang(),data=guideData();
    return `<div class="howto-modal-shell howto-guide-v2">
      <header class="howto-mhdr">
        <div class="howto-mhdr-copy"><span class="howto-mhdr-title">${esc(c.title)}</span><span class="howto-mhdr-sub">${esc(c.sub)}</span></div>
        <button class="howto-mhdr-close" type="button" onclick="closeModal()" aria-label="${esc(c.close)}">×</button>
      </header>
      <div class="howto-mode-tabs" role="tablist" aria-label="${esc(c.title)}">
        <button type="button" role="tab" data-guide-mode="quick" aria-selected="${mode==="quick"}" class="${mode==="quick"?"is-active":""}">${esc(c.quick)}</button>
        <button type="button" role="tab" data-guide-mode="detail" aria-selected="${mode==="detail"}" class="${mode==="detail"?"is-active":""}">${esc(c.detail)}</button>
      </div>
      <div class="howto-mbody">${mode==="quick"?quickPanel(c):detailedPanel(c,data)}</div>
      <footer class="howto-mfoot"><button class="btn btn-primary" type="button" onclick="closeModal()">${esc(c.back)}</button></footer>
    </div>`;
  }

  function bind(){
    const root=document.querySelector(".howto-guide-v2");
    if(!root)return;
    root.querySelectorAll("[data-guide-mode]").forEach(button=>button.addEventListener("click",()=>{
      mode=button.dataset.guideMode;
      render();
    }));
    root.querySelectorAll("[data-guide-step]").forEach(button=>button.addEventListener("click",()=>{
      activeStep=Number(button.dataset.guideStep)||0;
      render();
      requestAnimationFrame(()=>{
        const active=document.querySelector(".howto-path-step.is-active");
        if(active)active.scrollIntoView({block:"nearest",inline:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
      });
    }));
    root.querySelectorAll("[data-guide-term]").forEach(button=>button.addEventListener("click",()=>{
      const detail=root.querySelector("[data-guide-term-detail]");
      const term=lang().terms[button.dataset.guideTerm];
      const expanded=button.getAttribute("aria-expanded")==="true";
      root.querySelectorAll("[data-guide-term]").forEach(item=>item.setAttribute("aria-expanded","false"));
      if(detail)detail.innerHTML=expanded?"":`<b>${esc(term[0])}</b><p>${esc(term[1])}</p>`;
      button.setAttribute("aria-expanded",String(!expanded));
    }));
    root.querySelectorAll("[data-guide-action]").forEach(button=>{
      const action=button.dataset.guideAction;
      const available=action==="formation"?visible(document.getElementById("intro")):visible(document.getElementById("hub"));
      button.disabled=!available;
      const note=button.parentElement&&button.parentElement.querySelector("[data-guide-action-note]");
      if(note&&!available)note.textContent=lang().actions.unavailable;
      button.addEventListener("click",()=>runAction(action));
    });
  }

  function render(){
    if(typeof global.showModal!=="function")return;
    global.showModal(shell(),{dismissOnOverlay:true,label:lang().title,bare:true});
    bind();
  }

  function open(initialMode){
    ensureStyle();
    mode=initialMode==="detail"?"detail":"quick";
    activeStep=0;
    render();
  }

  function runAction(action){
    if(action==="formation"){
      if(!visible(document.getElementById("intro")))return;
      if(typeof global.goSetup==="function")global.goSetup();
      global.closeModal&&global.closeModal();
      requestAnimationFrame(()=>{
        const target=document.getElementById("formpick");
        if(target){target.scrollIntoView({block:"center",behavior:"smooth"});target.classList.add("guide-focus");setTimeout(()=>target.classList.remove("guide-focus"),1800);}
      });
      return;
    }
    if(action==="market"){
      if(!visible(document.getElementById("hub")))return;
      global.closeModal&&global.closeModal();
      requestAnimationFrame(()=>{
        const target=document.getElementById("shopcards");
        if(target){target.scrollIntoView({block:"center",behavior:"smooth"});target.classList.add("guide-focus");setTimeout(()=>target.classList.remove("guide-focus"),1800);}
      });
    }
  }

  function readContext(){
    try{return JSON.parse(localStorage.getItem(CONTEXT_KEY)||"{}")||{};}catch(error){return{};}
  }
  function saveContext(state){
    try{localStorage.setItem(CONTEXT_KEY,JSON.stringify(state));}catch(error){}
  }
  function dismissTip(){
    if(tipNode)tipNode.remove();
    if(tipTarget)tipTarget.classList.remove("guide-focus");
    tipNode=null;tipTarget=null;
    tipCooldownUntil=Date.now()+5000;
  }
  function showTip(key,target){
    const c=lang(),tip=c.tips[key];
    if(!contextualTipsAllowed()||!tip||tipNode||!target)return;
    const state=readContext();
    if(state[key])return;
    state[key]=Date.now();saveContext(state);
    tipTarget=target;target.classList.add("guide-focus");
    tipNode=document.createElement("aside");
    tipNode.className="copa-coachmark";
    tipNode.setAttribute("role","status");
    tipNode.innerHTML=`<button type="button" class="copa-coachmark-x" aria-label="${esc(c.close)}">×</button><span>${esc(tip[0])}</span><p>${esc(tip[1])}</p><button type="button" class="copa-coachmark-ok">${esc(c.gotIt)}</button>`;
    document.body.appendChild(tipNode);
    tipNode.querySelectorAll("button").forEach(button=>button.addEventListener("click",dismissTip));
  }
  function scanContext(){
    if(!contextualTipsAllowed()){dismissTip();return;}
    if(Date.now()<tipCooldownUntil)return;
    if(!document.getElementById("modal")?.classList.contains("hidden")){
      if(tipNode)dismissTip();
      return;
    }
    if(tipNode)return;
    const state=readContext();
    const candidates=[
      ["setup",document.getElementById("formpick"),document.getElementById("intro")],
      ["draft",document.getElementById("rollBtn"),document.getElementById("draft")],
      ["hub",document.getElementById("chemTile"),document.getElementById("hub")],
      ["bench",document.getElementById("nativeBenchTrigger"),document.getElementById("hub")],
      ["injury",document.getElementById("injbar"),document.getElementById("hub")],
      ["table",document.querySelector("#tournamentHubPanel .tg-table"),document.getElementById("hub")]
    ];
    const match=candidates.find(([key,target,screen])=>!state[key]&&visible(target)&&visible(screen));
    if(match)showTip(match[0],match[1]);
  }
  function initContextualTips(){
    ensureStyle();
    if(!contextualTipsAllowed()){dismissTip();return;}
    if(tipObserver)return;
    tipObserver=new MutationObserver(()=>setTimeout(scanContext,120));
    tipObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
    setTimeout(scanContext,600);
  }

  ensureStyle();
  global.CopaHowtoGuide=Object.freeze({open,render,runAction,initContextualTips});
})(window);
