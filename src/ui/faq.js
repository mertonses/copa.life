(function(global){
  "use strict";

  const SUPPORTED=["tr","en","es","de","it"];
  const COPY={
    tr:{
      short:"SSS",eyebrow:"OYUN REHBERİ",title:"Sık Sorulan Sorular",
      intro:"Oyunun temel akışı, kayıt sistemi ve önemli mekanikler için kısa yanıtlar.",
      all:"TÜM SSS",close:"KAPAT",back:"OYUNA DÖN",language:"DİL",
      pageDescription:"copa.life oynanışı, kayıt sistemi, DARK kartlar ve Başkan Güveni hakkında sık sorulan sorular.",
      items:[
        ["free","copa.life ücretsiz mi?","Evet. Oyunu ücretsiz oynayabilir ve zorunlu bir hesap oluşturmadan koşuya başlayabilirsin."],
        ["account","Oynamak için hesap gerekiyor mu?","Hayır. Temel oyun, koşular ve kalıcı açılımlar hesap gerektirmez."],
        ["run","Bir koşu nasıl ilerliyor?","Ülke, diziliş ve başkanını seç; zarla açılan mevkilerden kadronu kur. Kura sonunda dört takımlı grubunda üç maç oynarsın; ilk ikiye girersen çeyrek final, yarı final ve finale ilerlersin."],
        ["groups","Grup sıralaması nasıl belirleniyor?","Galibiyet 3, beraberlik 1, yenilgi 0 puandır. Eşitlikte sırasıyla puan, genel averaj, atılan gol, eşit takımların kendi aralarındaki sonuç, fair-play ve kura ölçütleri uygulanır."],
        ["trust","Başkan Güveni ne işe yarıyor?","Güven 0–3 arasında değişir. Normal maç galibiyeti güveni artırabilir; bazı kararlar ve DARK kartlar azaltabilir. Güncel güven, başkanın aktif borç eşiğini etkiler."],
        ["dark","DARK kartlar nedir?","DARK kartlar, standart kartların daha güçlü varyantlarıdır. Bu güç daha yüksek ücret, güven kaybı, kimya bedeli veya sonraki turlara taşınan bir sonuçla dengelenir."],
        ["save","İlerlemem nasıl kaydediliyor?","Koşu kontrol noktaları ve kalıcı açılımlar kullandığın tarayıcıda ya da cihazda yerel olarak saklanır. Site veya uygulama verilerini temizlemek ilerlemeyi silebilir."],
        ["ratings","Oyuncu gücü ve maç sonuçları neyi ifade ediyor?","Oyuncu güçleri, etkinlik değerleri ve maç sonuçları copa.life oyun modelinin simülasyon çıktılarıdır. Eğlence ve oyun dengesi için hazırlanır; gerçek dünya performansı hakkında nesnel bir iddia değildir."],
        ["mobile","Mobilde oynayabilir miyim?","Evet. Oyun mobil tarayıcıya uyumludur ve desteklenen tarayıcılarda ana ekrana eklenebilir. Sunulduğu platformlarda native uygulama paketi de aynı temel oynanışı kullanır."],
        ["support","Bir hata veya öneriyi nasıl iletebilirim?","Web sürümündeki İletişim veya Hata Raporu bağlantısını kullanabilirsin. Ekran görüntüsü, cihaz ve sorunu yeniden oluşturma adımları çözümü hızlandırır."]
      ]
    },
    en:{
      short:"FAQ",eyebrow:"GAME GUIDE",title:"Frequently Asked Questions",
      intro:"Quick answers about the core loop, saving and the game’s key systems.",
      all:"VIEW ALL FAQ",close:"CLOSE",back:"BACK TO GAME",language:"LANGUAGE",
      pageDescription:"Frequently asked questions about copa.life gameplay, saving, DARK cards and Chairman Trust.",
      items:[
        ["free","Is copa.life free?","Yes. You can play for free and start a run without creating a mandatory account."],
        ["account","Do I need an account to play?","No. The core game, runs and permanent unlocks do not require an account."],
        ["run","How does a run work?","Choose a country, formation and chairman, then build your squad from positions opened by the dice. After the draw, play three matches in a four-team group; finish in the top two to reach the quarter-final, semi-final and final."],
        ["groups","How are group standings decided?","A win earns 3 points, a draw 1 and a loss 0. Ties are resolved by points, overall goal difference, goals scored, head-to-head results, fair play and finally a seeded lot."],
        ["trust","What does Chairman Trust do?","Trust ranges from 0–3. A normal-match win may raise it, while some decisions and DARK cards may lower it. Current trust changes the chairman’s active debt threshold."],
        ["dark","What are DARK cards?","DARK cards are stronger variants of standard cards. Their extra power is balanced by a higher fee, trust loss, chemistry cost or a consequence that carries into later rounds."],
        ["save","How is my progress saved?","Run checkpoints and permanent unlocks are stored locally in the browser or on your device. Clearing site or app data can remove that progress."],
        ["ratings","What do player power and match results represent?","Player power, effectiveness values and match results are simulation outputs from the copa.life game model. They are made for entertainment and balance, not as objective claims about real-world performance."],
        ["mobile","Can I play on mobile?","Yes. The game is designed for mobile browsers and can be added to the home screen in supported browsers. Where offered, native app packages use the same core gameplay."],
        ["support","How can I report a bug or share an idea?","Use the Contact or Bug Report link in the web version. A screenshot, device details and reproduction steps help resolve issues faster."]
      ]
    },
    es:{
      short:"FAQ",eyebrow:"GUÍA DEL JUEGO",title:"Preguntas frecuentes",
      intro:"Respuestas rápidas sobre la partida, el guardado y los sistemas principales.",
      all:"VER TODAS",close:"CERRAR",back:"VOLVER AL JUEGO",language:"IDIOMA",
      pageDescription:"Preguntas frecuentes sobre la jugabilidad de copa.life, el guardado, las cartas DARK y la confianza del presidente.",
      items:[
        ["free","¿copa.life es gratis?","Sí. Puedes jugar gratis y empezar una partida sin crear una cuenta obligatoria."],
        ["account","¿Necesito una cuenta para jugar?","No. El juego principal, las partidas y los desbloqueos permanentes no requieren una cuenta."],
        ["run","¿Cómo funciona una partida?","Elige país, formación y presidente y crea la plantilla. Tras el sorteo juegas tres partidos en un grupo de cuatro; termina entre los dos primeros para avanzar a cuartos, semifinal y final."],
        ["groups","¿Cómo se decide la clasificación del grupo?","Una victoria da 3 puntos, un empate 1 y una derrota 0. Los empates se resuelven por puntos, diferencia de goles, goles a favor, enfrentamientos directos, juego limpio y, al final, sorteo con semilla."],
        ["trust","¿Para qué sirve la confianza del presidente?","La confianza va de 0 a 3. Una victoria normal puede aumentarla; algunas decisiones y cartas DARK pueden reducirla. La confianza actual modifica el umbral de deuda activo del presidente."],
        ["dark","¿Qué son las cartas DARK?","Son variantes más potentes de las cartas estándar. Su fuerza extra se compensa con un precio mayor, pérdida de confianza, coste de química o una consecuencia para rondas posteriores."],
        ["save","¿Cómo se guarda mi progreso?","Los puntos de control y los desbloqueos permanentes se guardan localmente en el navegador o dispositivo. Borrar los datos del sitio o de la app puede eliminar el progreso."],
        ["ratings","¿Qué representan la fuerza y los resultados?","La fuerza, la efectividad y los resultados son salidas de simulación del modelo de copa.life. Están pensados para el entretenimiento y el equilibrio, no como afirmaciones objetivas sobre el rendimiento real."],
        ["mobile","¿Puedo jugar en el móvil?","Sí. El juego está adaptado a navegadores móviles y puede añadirse a la pantalla de inicio en navegadores compatibles. Donde estén disponibles, las apps nativas usan la misma jugabilidad base."],
        ["support","¿Cómo comunico un error o una idea?","Usa los enlaces Contacto o Informe de error de la versión web. Una captura, el dispositivo y los pasos para reproducirlo ayudan a resolverlo antes."]
      ]
    },
    de:{
      short:"FAQ",eyebrow:"SPIELHILFE",title:"Häufig gestellte Fragen",
      intro:"Kurze Antworten zum Spielablauf, Speichern und den wichtigsten Systemen.",
      all:"ALLE FAQ",close:"SCHLIESSEN",back:"ZURÜCK ZUM SPIEL",language:"SPRACHE",
      pageDescription:"Häufig gestellte Fragen zu copa.life, Spielständen, DARK-Karten und Präsidentenvertrauen.",
      items:[
        ["free","Ist copa.life kostenlos?","Ja. Du kannst kostenlos spielen und einen Lauf ohne verpflichtendes Konto starten."],
        ["account","Brauche ich ein Konto?","Nein. Das Hauptspiel, Läufe und dauerhafte Freischaltungen benötigen kein Konto."],
        ["run","Wie läuft ein Durchgang ab?","Wähle Land, Formation und Präsident und baue deinen Kader. Nach der Auslosung spielst du drei Partien in einer Vierergruppe; als Erster oder Zweiter erreichst du Viertelfinale, Halbfinale und Finale."],
        ["groups","Wie wird die Gruppentabelle entschieden?","Ein Sieg bringt 3 Punkte, ein Remis 1 und eine Niederlage 0. Bei Gleichstand zählen Punkte, Tordifferenz, erzielte Tore, direkter Vergleich, Fairplay und zuletzt ein gesetztes Los."],
        ["trust","Was bewirkt Präsidentenvertrauen?","Das Vertrauen reicht von 0 bis 3. Ein Sieg in einem normalen Spiel kann es erhöhen; manche Entscheidungen und DARK-Karten können es senken. Der aktuelle Wert verändert die aktive Schuldengrenze des Präsidenten."],
        ["dark","Was sind DARK-Karten?","DARK-Karten sind stärkere Varianten normaler Karten. Die zusätzliche Stärke wird durch höhere Kosten, Vertrauensverlust, Chemiekosten oder Folgen für spätere Runden ausgeglichen."],
        ["save","Wie wird mein Fortschritt gespeichert?","Kontrollpunkte und dauerhafte Freischaltungen werden lokal im Browser oder auf dem Gerät gespeichert. Das Löschen von Website- oder App-Daten kann den Fortschritt entfernen."],
        ["ratings","Was bedeuten Spielerstärke und Ergebnisse?","Spielerstärke, Effektivitätswerte und Ergebnisse sind Simulationen des copa.life-Spielmodells. Sie dienen Unterhaltung und Balance und sind keine objektiven Aussagen über reale Leistungen."],
        ["mobile","Kann ich mobil spielen?","Ja. Das Spiel ist für mobile Browser optimiert und kann in unterstützten Browsern zum Startbildschirm hinzugefügt werden. Wo angeboten, verwenden native App-Pakete dasselbe Kernspiel."],
        ["support","Wie melde ich einen Fehler oder eine Idee?","Nutze Kontakt oder Fehlerbericht in der Webversion. Screenshot, Gerätedaten und Schritte zur Reproduktion helfen bei einer schnelleren Lösung."]
      ]
    },
    it:{
      short:"FAQ",eyebrow:"GUIDA AL GIOCO",title:"Domande frequenti",
      intro:"Risposte rapide sul ciclo di gioco, i salvataggi e i sistemi principali.",
      all:"TUTTE LE FAQ",close:"CHIUDI",back:"TORNA AL GIOCO",language:"LINGUA",
      pageDescription:"Domande frequenti sul gameplay di copa.life, i salvataggi, le carte DARK e la fiducia del presidente.",
      items:[
        ["free","copa.life è gratuito?","Sì. Puoi giocare gratis e iniziare una partita senza creare un account obbligatorio."],
        ["account","Serve un account per giocare?","No. Il gioco principale, le partite e gli sblocchi permanenti non richiedono un account."],
        ["run","Come funziona una partita?","Scegli paese, modulo e presidente e crea la rosa. Dopo il sorteggio giochi tre gare in un gruppo da quattro; chiudi tra le prime due per raggiungere quarti, semifinale e finale."],
        ["groups","Come viene decisa la classifica del gruppo?","Una vittoria vale 3 punti, un pareggio 1 e una sconfitta 0. Le parità si risolvono con punti, differenza reti, gol segnati, scontri diretti, fair play e infine sorteggio con seed."],
        ["trust","A cosa serve la fiducia del presidente?","La fiducia va da 0 a 3. Una vittoria normale può aumentarla; alcune decisioni e carte DARK possono ridurla. Il valore attuale modifica la soglia di debito attiva del presidente."],
        ["dark","Cosa sono le carte DARK?","Sono varianti più potenti delle carte standard. La forza extra è bilanciata da un costo maggiore, perdita di fiducia, costo d’intesa o una conseguenza nei turni successivi."],
        ["save","Come viene salvato il progresso?","I checkpoint e gli sblocchi permanenti sono salvati localmente nel browser o sul dispositivo. Cancellare i dati del sito o dell’app può rimuovere il progresso."],
        ["ratings","Cosa rappresentano forza e risultati?","Forza, efficacia e risultati sono output di simulazione del modello di gioco copa.life. Servono a intrattenimento e bilanciamento, non sono valutazioni oggettive delle prestazioni reali."],
        ["mobile","Posso giocare su mobile?","Sì. Il gioco è ottimizzato per browser mobili e può essere aggiunto alla schermata Home nei browser supportati. Dove disponibili, i pacchetti nativi usano lo stesso gameplay di base."],
        ["support","Come segnalo un errore o un’idea?","Usa Contatti o Segnala errore nella versione web. Uno screenshot, il dispositivo e i passaggi per riprodurre il problema aiutano a risolverlo più rapidamente."]
      ]
    }
  };
  const QUICK_IDS=new Set(["free","run","trust","dark","save","ratings"]);

  function locale(value){
    const raw=String(value||"").toLowerCase().split("-")[0];
    return SUPPORTED.includes(raw)?raw:"en";
  }

  function activeLocale(){
    if(typeof global.LANG==="string"&&SUPPORTED.includes(global.LANG))return global.LANG;
    const query=typeof location!=="undefined"?new URLSearchParams(location.search).get("lang"):"";
    if(query&&SUPPORTED.includes(query))return query;
    try{
      const saved=localStorage.getItem("copa.language");
      if(SUPPORTED.includes(saved))return saved;
    }catch(_){}
    return locale(global.navigator&&global.navigator.language);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  }

  function detailsMarkup(items,{quick=false}={}){
    return items.map((item,index)=>{
      const [id,question,answer]=item;
      return `<details class="faq-item" data-faq-id="${id}"${quick&&index===0?" open":""}><summary><span>${escapeHtml(question)}</span><i aria-hidden="true"></i></summary><div class="faq-answer"><p>${escapeHtml(answer)}</p></div></details>`;
    }).join("");
  }

  function makeExclusive(scope){
    const details=[...scope.querySelectorAll(".faq-item")];
    details.forEach(item=>{
      const summary=item.querySelector("summary");
      if(summary)summary.setAttribute("aria-expanded",String(item.open));
      item.addEventListener("toggle",()=>{
        if(summary)summary.setAttribute("aria-expanded",String(item.open));
        if(!item.open)return;
        details.forEach(other=>{if(other!==item)other.open=false;});
      });
    });
  }

  function refreshFooter(language=activeLocale()){
    const button=document.getElementById("footerFaqBtn");
    if(!button)return;
    button.textContent=COPY[locale(language)].short;
    button.setAttribute("aria-label",COPY[locale(language)].title);
  }

  function openFaq(){
    const language=activeLocale();
    const copy=COPY[language];
    const items=copy.items.filter(item=>QUICK_IDS.has(item[0]));
    const html=`<div class="faq-modal"><button class="modal-x" type="button" onclick="closeModal()" aria-label="${escapeHtml(copy.close)}">&times;</button><header class="faq-modal-head"><span>${escapeHtml(copy.eyebrow)}</span><h2 id="_mdlttl">${escapeHtml(copy.title)}</h2><p>${escapeHtml(copy.intro)}</p></header><div class="faq-list">${detailsMarkup(items,{quick:true})}</div><div class="faq-modal-actions"><a class="btn btn-ghost" href="faq.html?lang=${language}" target="_blank" rel="noopener">${escapeHtml(copy.all)}</a><button class="btn btn-primary" type="button" onclick="closeModal()">${escapeHtml(copy.close)}</button></div></div>`;
    if(typeof global.showModal!=="function")return;
    global.showModal(html,{dismissOnOverlay:true,label:copy.title,sheetClass:"faq-sheet"});
    const root=document.querySelector("#modal .faq-modal");
    if(root)makeExclusive(root);
  }

  function setPageLocale(language,{replace=false}={}){
    const code=locale(language);
    const copy=COPY[code];
    const root=document.getElementById("faqPage");
    if(!root)return;
    document.documentElement.lang=code;
    document.title=`${copy.title} · copa.life`;
    const description=document.querySelector('meta[name="description"]');
    if(description)description.content=copy.pageDescription;
    root.innerHTML=`<header class="faq-page-head"><a class="faq-brand" href="index.html" aria-label="copa.life"><span>copa</span><b>•</b><span>life</span></a><div class="faq-lang" aria-label="${escapeHtml(copy.language)}">${SUPPORTED.map(lang=>`<button type="button" data-lang="${lang}" aria-pressed="${lang===code}">${lang.toUpperCase()}</button>`).join("")}</div><span class="faq-eyebrow">${escapeHtml(copy.eyebrow)}</span><h1>${escapeHtml(copy.title)}</h1><p>${escapeHtml(copy.intro)}</p></header><main class="faq-page-main"><div class="faq-list">${detailsMarkup(copy.items)}</div></main><footer class="faq-page-foot"><a class="faq-back" href="index.html">← ${escapeHtml(copy.back)}</a><nav><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></nav></footer>`;
    root.querySelectorAll("[data-lang]").forEach(button=>button.addEventListener("click",()=>setPageLocale(button.dataset.lang)));
    makeExclusive(root);
    const hash=location.hash.slice(1);
    const selected=hash&&root.querySelector(`[data-faq-id="${CSS.escape(hash)}"]`);
    if(selected){selected.open=true;selected.scrollIntoView({block:"center"});}
    try{localStorage.setItem("copa.language",code);}catch(_){}
    const url=new URL(location.href);
    url.searchParams.set("lang",code);
    if(replace)history.replaceState(null,"",url);
    else history.pushState(null,"",url);
  }

  function initPage(){
    if(!document.getElementById("faqPage"))return;
    setPageLocale(activeLocale(),{replace:true});
  }

  global.CopaFaq=Object.freeze({COPY,SUPPORTED,activeLocale,open:openFaq,refreshFooter,setPageLocale});
  global.openFaq=openFaq;
  refreshFooter();
  function ready(){refreshFooter();initPage();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});
  else ready();
})(window);
