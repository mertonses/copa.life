(function(global){
  "use strict";

  const CONTEXT_KEY="copa.guide.context.v2";
  const SVG={
    path:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6h16v12H4Z"/><path d="M4 12h16M12 6v12"/><circle cx="8" cy="9" r="1"/><circle cx="16" cy="15" r="1"/></svg>',
    dice:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>',
    crown:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 7.5 8 11l4-7 4 7 4.5-3.5-2 10h-13l-2-10Z"/><path d="M6 20h12"/></svg>',
    cup:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v6a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5c0 4 1 6 4 6M16 6h3c0 4-1 6-4 6M12 14v4M8 20h8"/></svg>',
    chair:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M6 20c.7-4 2.7-6 6-6s5.3 2 6 6M12 14v6"/></svg>',
    medical:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/></svg>',
    cards:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="12" height="16" rx="2"/><path d="M5 18H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1M10 10h6M10 14h6"/></svg>'
  };
  const ICONS=[SVG.path,SVG.dice,SVG.cup,SVG.chair,SVG.medical,SVG.cards];

  const COPY={
    tr:{
      title:"COPA REHBERİ",sub:"COPA'YI İKİ DAKİKADA ÖĞREN",quick:"Hızlı Başlangıç",detail:"Detaylı Rehber",
      quickLead:"Üç fikri bil; ilk turunu oynarken gerisini keşfet.",back:"OYUNA DÖN",close:"Kapat",
      quickItems:[
        ["Kadroyu kur","Diziliş ve başkanını seç; her mevki için gelen üç adaydan bütçene uyanı al."],
        ["Gücü doğru oku","Takım gücü temel seviyedir. Kimya, kartlar ve maç koşulları bunun üstüne eklenir."],
        ["Her bedeli gör","Borç limiti, sakatlık ve DARK kart riskleri kısa vadeli gücü pahalılaştırabilir."]
      ],
      examples:[
        "4-3-3 seçimi kanat ve orta saha rollerini zorunlu kılar.",
        "€6M harcadığında yalnız oyuncuyu değil, kalan pozisyon bütçeni de seçersin.",
        "+3 kimya, maç gücüne doğrudan +3 puan ekler.",
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
        setup:["İLK TUR İPUCU","Diziliş, dolduracağın mevkileri belirler. Başkan ise bütçe ve borç alanını değiştirir."],
        draft:["İLK ZAR","Her atış rastgele bir mevkiyi açar ve o mevki için üç aday getirir. Animasyonlar kapalıysa sonuç yine kısa bir titreşim ve zar yüzüyle gösterilir."],
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
        "+3 chemistry adds exactly +3 match power.",
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
        draft:["FIRST ROLL","Each roll opens a random position and presents three candidates for it. Reduced motion still shows the result with a die face and haptic."],
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
      examples:["El 4-3-3 exige bandas y centrocampistas.","Gastar €6M también reduce el presupuesto para los puestos vacíos.","+3 de química añade directamente +3 de fuerza.","Superar el límite de deuda puede acabar en despido.","Un suplente adecuado reduce la pérdida por lesión.","COMMON es estable; DARK ofrece más a cambio de un coste real."],
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
      examples:["Ein 4-3-3 verlangt Flügel- und Mittelfeldrollen.","€6M Ausgaben verkleinern auch das Budget für offene Positionen.","+3 Chemie ergeben direkt +3 Spielstärke.","Unter dem Schuldenlimit droht trotz starkem Kader die Entlassung.","Der richtige Ersatz begrenzt den Verlust durch Verletzungen.","COMMON ist planbar; DARK gibt mehr Wirkung gegen echte Kosten."],
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
      examples:["Il 4-3-3 richiede ali e centrocampisti.","Spendere €6M riduce anche il budget per i ruoli vuoti.","+3 intesa aggiunge direttamente +3 forza.","Sotto il limite debiti rischi l'esonero anche con una rosa forte.","La riserva giusta limita la perdita per infortunio.","COMMON è prevedibile; DARK offre più impatto con un costo reale."],
      glossaryTitle:"Mini glossario",example:"ESEMPIO REALE",learn:"IMPARA PROVANDO",
      terms:{chemistry:["Intesa","Valore da -5 a +5 per legami, nucleo locale, età e leadership; si somma alla forza."],power:["Forza","Undici, ruolo, intesa, carte ed effetti temporanei; aumenta le chance senza garantire."],debt:["Limite debiti","Saldo minimo tollerato dal presidente; superarlo riduce fiducia e può causare l'esonero."],risk:["Rischio carta","Le DARK possono costare forza finale, denaro, fiducia, intesa o il mercato successivo."]},
      actions:{formation:"Vai al modulo",market:"Mostra mercato carte",unavailable:"Disponibile nella schermata di gioco corretta."},
      tips:{setup:["CONSIGLIO INIZIALE","Il modulo definisce i ruoli; il presidente cambia budget e debito."],draft:["CONSIGLIO INIZIALE","Tre candidati significano anche scegliere il budget che resterà."],hub:["CONSIGLIO INIZIALE","Tocca Intesa e controlla sulle carte anche i costi non monetari."]},
      gotIt:"CAPITO",expand:"Apri dettaglio",collapse:"Chiudi dettaglio"
    }
  };

  const STATE_KEY="copa.guide.state.v3";
  const UI={
    tr:{life:"COPA LIFE",arena:"COPA ARENA",products:"Oyun modu",search:"Bir konu ara…",searchLabel:"Rehberde ara",previous:"Önceki",next:"Sonraki",topics:"Konular",noResults:"Bu aramayla eşleşen konu yok.",reset:"İPUÇLARINI SIFIRLA",resetDone:"İPUÇLARI SIFIRLANDI",quickSub:"HIZLI BAŞLANGIÇ",detailSub:"MEKANİK REHBERİ",timerContinues:"SAYAÇ DURMAZ"},
    en:{life:"COPA LIFE",arena:"COPA ARENA",products:"Game mode",search:"Search a topic…",searchLabel:"Search the guide",previous:"Previous",next:"Next",topics:"Topics",noResults:"No topic matches this search.",reset:"RESET TIPS",resetDone:"TIPS RESET",quickSub:"QUICK START",detailSub:"MECHANICS GUIDE",timerContinues:"TIMER KEEPS RUNNING"},
    es:{life:"COPA LIFE",arena:"COPA ARENA",products:"Modo de juego",search:"Buscar un tema…",searchLabel:"Buscar en la guía",previous:"Anterior",next:"Siguiente",topics:"Temas",noResults:"Ningún tema coincide.",reset:"REINICIAR CONSEJOS",resetDone:"CONSEJOS REINICIADOS",quickSub:"INICIO RÁPIDO",detailSub:"GUÍA DE MECÁNICAS",timerContinues:"EL TIEMPO SIGUE"},
    de:{life:"COPA LIFE",arena:"COPA ARENA",products:"Spielmodus",search:"Thema suchen…",searchLabel:"Guide durchsuchen",previous:"Zurück",next:"Weiter",topics:"Themen",noResults:"Kein passendes Thema gefunden.",reset:"TIPPS ZURÜCKSETZEN",resetDone:"TIPPS ZURÜCKGESETZT",quickSub:"SCHNELLSTART",detailSub:"MECHANIK-GUIDE",timerContinues:"TIMER LÄUFT WEITER"},
    it:{life:"COPA LIFE",arena:"COPA ARENA",products:"Modalità",search:"Cerca un argomento…",searchLabel:"Cerca nella guida",previous:"Precedente",next:"Successivo",topics:"Argomenti",noResults:"Nessun argomento corrisponde.",reset:"AZZERA CONSIGLI",resetDone:"CONSIGLI AZZERATI",quickSub:"AVVIO RAPIDO",detailSub:"GUIDA ALLE MECCANICHE",timerContinues:"IL TIMER CONTINUA"}
  };
  const ARENA={
    tr:{
      lead:"Üç kuralı bil; önce antrenman maçında dene, sonra dereceliye çık.",
      quick:[["Modunu seç","Antrenman puanını etkilemez; dereceli maçlar reyting ve sezon ilerlemesi kazandırır."],["Süreyi kaçırma","Hazırlık ve canlı taktik kararlarını sayaç bitmeden kilitle; süre dolarsa sistem otomatik seçim yapar."],["Bağlantıyı koru","Koparsan maç yeniden bağlanmayı dener. Maçtan ayrılmak ise otomatik kararların devreye girmesine yol açabilir."]],
      steps:[
        ["Hesap ve maç modu","Misafir olarak hızlı başlayabilir veya hesabınla devam edebilirsin. <b>Antrenman</b> öğrenmek içindir; <b>dereceli</b> maçlar reytingini ve sezon puanını etkiler."],
        ["Kadronu hazırla","Maç başlamadan dizilişini ve oyun stilini seç. Seçimlerini süre dolmadan kilitle; ikisi birlikte takımının rol dağılımını belirler."],
        ["Draft, pazar ve plan","Oyuncu seçimleri, kart pazarı ve antrenman planı aynı maç planının parçalarıdır. Sadece en yüksek gücü değil, <b>kimya ve bedelleri</b> de karşılaştır."],
        ["Canlı taktik kararları","Maç akarken her karar penceresinde baskı, denge, kontra veya kontrol çağrısı yaparsın. Rakip eğilimini ve momentumu oku; karar kilitlenince değişmez."],
        ["Penaltı bölgeleri","Şut çekerken veya kaleyi savunurken beş bölgeden birini seçersin. Sonuç iki tarafın kilitli bölgeleri karşılaştırılarak açıklanır; seri eşitlik bozulana kadar sürer."],
        ["Bağlantı, sonuç ve rövanş","Kısa kopmalarda yeniden bağlanma devreye girer. Sonuç ekranında reyting, sezon puanı ve kırılma anlarını görür; uygunsa rövanş isteyebilirsin."]
      ],
      examples:["İlk maçınsa Antrenman seç; sistemi öğrenirken reyting kaybetmezsin.","4-3-3 ve baskı stili, geniş rollerle agresif bir plan kurar.","Yüksek güçlü ama düşük kimyalı teklif her zaman en iyi seçim değildir.","Rakip iki kez baskı yaptıysa kontra çağrısı alanı değerlendirebilir.","Sağ üst şut ile sağ üst kurtarış eşleşirse kaleci doğru köşeyi bulur.","Bağlantı geri geldiğinde oda ve süre kaldığı yerden güncellenir."],
      terms:{rating:["Reyting","Dereceli sonuçlarla değişen beceri puanın; bölümünü ve eşleşme seviyeni belirler."],timer:["Sayaç","Her hazırlık ve karar aşamasındaki kalan süre. Süre dolarsa sunucu geçerli bir otomatik seçim yapar."],lock:["Kilitleme","Seçimini sunucuya kesin olarak gönderir. Kilitlenen karar aynı pencerede değiştirilemez."],reconnect:["Yeniden bağlanma","Kısa bağlantı kaybında mevcut maç odasına güvenli biçimde dönme süreci."]},
      actions:["practice",null,null,null,null,"leaderboard"]
    },
    en:{
      lead:"Know three rules; try them in Practice before entering Ranked.",
      quick:[["Choose the mode","Practice does not affect rating; Ranked matches award rating and season progress."],["Beat the timer","Lock setup and live tactics before time expires; the server makes an automatic choice when it does."],["Protect the connection","The match tries to reconnect after a drop. Leaving an active match may hand decisions to the automatic system."]],
      steps:[
        ["Account and match mode","Continue as a guest or with your account. <b>Practice</b> is for learning; <b>Ranked</b> changes rating and season points."],
        ["Prepare the squad","Choose formation and play style before kick-off. Lock both before the timer expires; together they define the team's role distribution."],
        ["Draft, market and plan","Player picks, the card market and training plan form one match strategy. Compare <b>chemistry and costs</b>, not only raw power."],
        ["Live tactical calls","During each live window choose press, balanced, counter or control. Read opponent tendency and momentum; a locked call cannot be changed."],
        ["Penalty zones","When shooting or saving, choose one of five zones. The reveal compares both locked zones and the shootout continues until the tie is broken."],
        ["Connection, result and rematch","Short drops trigger reconnection. The result shows rating, season points and turning points; request a rematch when available."]
      ],
      examples:["Use Practice for the first match so learning does not cost rating.","A 4-3-3 with pressing creates an aggressive plan around wide roles.","A high-power offer with poor chemistry is not automatically best.","If the opponent pressed twice, counter may attack the space left behind.","A top-right shot meets a top-right save when the keeper reads the corner.","When connection returns, the room and remaining time refresh from the server."],
      terms:{rating:["Rating","Skill score changed by Ranked results; it shapes division and matchmaking."],timer:["Timer","Time left in a setup or decision phase. The server makes a valid automatic choice at zero."],lock:["Lock","Sends a final choice to the server. It cannot be changed in the same window."],reconnect:["Reconnect","Safely returning to the current match room after a short connection loss."]},
      actions:["practice",null,null,null,null,"leaderboard"]
    },
    es:{
      lead:"Aprende tres reglas; pruébalas en Entrenamiento antes de jugar Clasificatoria.",
      quick:[["Elige el modo","Entrenamiento no afecta al rating; Clasificatoria da rating y progreso de temporada."],["Vigila el tiempo","Bloquea preparación y táctica antes de que termine el contador; después decide el servidor."],["Cuida la conexión","El partido intenta reconectar tras un corte. Salir puede dejar las decisiones al sistema automático."]],
      steps:[["Cuenta y modo","Entra como invitado o con tu cuenta. <b>Entrenamiento</b> sirve para aprender; <b>Clasificatoria</b> cambia rating y puntos."],["Prepara la plantilla","Elige formación y estilo antes del inicio y bloquea ambos dentro del tiempo."],["Draft, mercado y plan","Jugadores, cartas y entrenamiento forman una estrategia. Compara <b>química y costes</b>, no solo fuerza."],["Táctica en vivo","En cada ventana elige presión, equilibrio, contra o control. Tras bloquear no puedes cambiar."],["Zonas de penalti","Al tirar o parar, elige una de cinco zonas. La revelación compara ambas decisiones."],["Conexión y resultado","Los cortes breves activan reconexión. El resultado muestra rating, puntos y momentos clave; puede haber revancha."]],
      examples:["Empieza en Entrenamiento para aprender sin perder rating.","4-3-3 y presión crean un plan agresivo por bandas.","Más fuerza con poca química no siempre es mejor.","Dos presiones rivales pueden abrir espacio para la contra.","Tiro arriba derecha y parada arriba derecha encuentran la misma esquina.","Al volver la conexión, sala y tiempo se actualizan desde el servidor."],
      terms:{rating:["Rating","Puntuación de habilidad que cambia en Clasificatoria."],timer:["Contador","Tiempo restante; a cero el servidor elige una opción válida."],lock:["Bloqueo","Envía la decisión final y evita cambiarla."],reconnect:["Reconexión","Regreso seguro a la partida tras un corte breve."]},actions:["practice",null,null,null,null,"leaderboard"]
    },
    de:{
      lead:"Drei Regeln genügen; teste sie im Training vor dem Ranglistenspiel.",
      quick:[["Modus wählen","Training ändert das Rating nicht; Rangliste bringt Rating und Saisonfortschritt."],["Zeit beachten","Formation und Live-Taktik vor Ablauf sperren; danach entscheidet das System automatisch."],["Verbindung halten","Nach Abbruch versucht das Spiel die Rückkehr. Verlassen kann automatische Entscheidungen auslösen."]],
      steps:[["Konto und Modus","Spiele als Gast oder mit Konto. <b>Training</b> dient zum Lernen; <b>Rangliste</b> ändert Rating und Saisonpunkte."],["Kader vorbereiten","Wähle Formation und Stil vor dem Anpfiff und sperre beides rechtzeitig."],["Draft, Markt und Plan","Spieler, Karten und Training bilden eine Strategie. Vergleiche <b>Chemie und Kosten</b>, nicht nur Stärke."],["Live-Taktik","Wähle in jedem Fenster Pressing, Balance, Konter oder Kontrolle. Nach dem Sperren ist die Wahl endgültig."],["Elfmeterzonen","Beim Schuss oder Halten wählst du eine von fünf Zonen. Die Auflösung vergleicht beide Entscheidungen."],["Verbindung und Ergebnis","Kurze Ausfälle starten die Wiederverbindung. Das Ergebnis zeigt Rating, Punkte und Wendepunkte; ein Rematch kann folgen."]],
      examples:["Starte im Training, damit Lernen kein Rating kostet.","4-3-3 mit Pressing nutzt Flügelrollen aggressiv.","Hohe Stärke bei schwacher Chemie ist nicht immer besser.","Zweimaliges Pressing kann Raum für einen Konter öffnen.","Schuss und Parade oben rechts treffen dieselbe Ecke.","Nach Rückkehr lädt der Server Raum und Restzeit neu."],
      terms:{rating:["Rating","Fähigkeitswert aus Ranglistenspielen."],timer:["Timer","Restzeit; bei null wählt der Server automatisch gültig."],lock:["Sperren","Sendet die endgültige Wahl an den Server."],reconnect:["Wiederverbindung","Sichere Rückkehr in das laufende Spiel nach kurzem Ausfall."]},actions:["practice",null,null,null,null,"leaderboard"]
    },
    it:{
      lead:"Impara tre regole; provale in Allenamento prima della Classificata.",
      quick:[["Scegli la modalità","Allenamento non cambia il rating; Classificata assegna rating e progresso stagione."],["Rispetta il tempo","Blocca preparazione e tattica prima della scadenza; poi sceglie il sistema."],["Proteggi la connessione","Dopo un'interruzione la partita tenta di riconnettersi. Uscire può attivare scelte automatiche."]],
      steps:[["Account e modalità","Entra come ospite o con l'account. <b>Allenamento</b> serve per imparare; <b>Classificata</b> cambia rating e punti."],["Prepara la rosa","Scegli modulo e stile prima del calcio d'inizio e blocca entrambi in tempo."],["Draft, mercato e piano","Giocatori, carte e allenamento formano una strategia. Confronta <b>intesa e costi</b>, non solo forza."],["Tattica live","In ogni finestra scegli pressing, equilibrio, contropiede o controllo. Dopo il blocco non puoi cambiare."],["Zone dei rigori","Quando tiri o pari scegli una delle cinque zone. La rivelazione confronta le due decisioni."],["Connessione e risultato","Le brevi interruzioni avviano la riconnessione. Il risultato mostra rating, punti e momenti chiave; può esserci rivincita."]],
      examples:["Inizia in Allenamento per imparare senza perdere rating.","4-3-3 e pressing creano un piano aggressivo sulle fasce.","Più forza con poca intesa non è sempre meglio.","Due pressing rivali possono aprire spazio al contropiede.","Tiro e parata in alto a destra scelgono lo stesso angolo.","Al ritorno, server e tempo residuo vengono aggiornati."],
      terms:{rating:["Rating","Punteggio abilità modificato dalle partite Classificate."],timer:["Timer","Tempo residuo; a zero il server sceglie automaticamente."],lock:["Blocco","Invia la decisione finale al server."],reconnect:["Riconnessione","Ritorno sicuro alla partita dopo un breve calo."]},actions:["practice",null,null,null,null,"leaderboard"]
    }
  };
  const LIFE_EXTRA={
    tr:{
      steps:[
        ["Hazırlık ve Taktik",`Maçtan önce hazırlık odağını ve takım konuşmasını seç. Maç içindeki taktik komutları sınırlıdır; rakibe ve skora göre <b>doğru anda</b> kullan.`],
        ["Ödüller ve Serbest Oyuncular",`Tur ödülleri para, kart veya kadro fırsatı sunabilir. Serbest oyuncu ve kart değişimlerinde yalnız anlık gücü değil, <b>kalan yolun ihtiyacını</b> düşün.`],
        ["Penaltı ve Final Akışı",`Eleme beraberlikleri penaltıya gidebilir. Finalde normal süre sonrası <b>Altın Gol</b>, eşitlik sürerse penaltılar uygulanır; şut ve kurtarış yönünü bilinçli seç.`],
        ["Kulüp Kariyeri ve Miras",`Tamamlanan koşular itibar, ustalık ve lisans ilerlemesi sağlar. Kulüp Dosyaları, Müze ve Miras Kasası uzun vadeli hikâyeni ve açılımlarını saklar.`]
      ],
      examples:["Öndeyken skoru koru; gerideyken sınırlı hamleni baskı için sakla.","Final öncesi bir yedek, erken küçük güç artışından daha değerli olabilir.","Kaleci ve şutör yönleri eşleşirse kurtarış ihtimali yükselir.","Şampiyonluk yeni diziliş ve başkan seçeneklerine giden ilerlemeyi hızlandırır."],
      terms:{trust:["Güven","Başkanla ilişkinin göstergesi. Harcamalar, krizler ve kararlar güveni değiştirir; düşük seviye görev riskini büyütür."],legacy:["Miras","Koşular arasında kalan kulüp kariyeri, ustalık, lisans ve müze ilerlemesinin bütünü."]}
    },
    en:{
      steps:[
        ["Preparation and Tactics",`Choose a preparation focus and team talk before the match. In-match tactical calls are limited; use them at the <b>right moment</b> for the opponent and score.`],
        ["Rewards and Free Agents",`Round rewards may offer cash, cards or squad opportunities. For free agents and card swaps, consider <b>what the remaining route needs</b>, not only immediate power.`],
        ["Penalties and the Final",`Knockout draws may go to penalties. The final uses <b>Golden Goal</b> after regulation, then penalties if still level; choose shot and save directions deliberately.`],
        ["Club Career and Legacy",`Completed runs build reputation, mastery and licence progress. Club Files, Museum and Legacy Vault preserve long-term stories and unlocks.`]
      ],
      examples:["Protect a lead; when behind, save a limited call for pressure.","Before the final, a substitute may be worth more than a small early boost.","Matching keeper and shooter directions improves the chance of a save.","A championship accelerates progress toward new formations and chairmen."],
      terms:{trust:["Trust","Your relationship with the chairman. Spending, crises and decisions move it; low trust increases job risk."],legacy:["Legacy","The club career, mastery, licences and museum progress that remain between runs."]}
    },
    es:{
      steps:[["Preparación y táctica",`Elige preparación y charla antes del partido. Las órdenes durante el juego son limitadas; úsalas en el <b>momento correcto</b>.`],["Recompensas y agentes libres",`Las recompensas ofrecen dinero, cartas o plantilla. En agentes libres y cambios piensa en <b>lo que falta del camino</b>.`],["Penaltis y final",`Los empates eliminatorios pueden ir a penaltis. La final usa <b>Gol de Oro</b> y después penaltis si sigue igualada.`],["Carrera y legado",`Las partidas completadas dan reputación, maestría y licencias. Archivos, Museo y Legado guardan el progreso a largo plazo.`]],
      examples:["Protege una ventaja; si pierdes, guarda una orden para presionar.","Antes de la final, un suplente puede valer más que una mejora pequeña.","Si portero y tirador eligen la misma dirección, aumenta la opción de parada.","Ser campeón acelera el acceso a nuevas formaciones y presidentes."],
      terms:{trust:["Confianza","Relación con el presidente; gastos, crisis y decisiones la modifican."],legacy:["Legado","Carrera, maestría, licencias y museo que permanecen entre partidas."]}
    },
    de:{
      steps:[["Vorbereitung und Taktik",`Wähle Fokus und Ansprache vor dem Spiel. Taktische Kommandos sind begrenzt; nutze sie im <b>richtigen Moment</b>.`],["Belohnungen und freie Spieler",`Belohnungen bringen Geld, Karten oder Kaderchancen. Denke bei freien Spielern und Tausch an den <b>restlichen Weg</b>.`],["Elfmeter und Finale",`K.-o.-Remis können ins Elfmeterschießen gehen. Im Finale folgen <b>Golden Goal</b> und bei Gleichstand Elfmeter.`],["Vereinskarriere und Vermächtnis",`Abgeschlossene Läufe bringen Ruf, Meisterschaft und Lizenzen. Akten, Museum und Vermächtnis speichern langfristigen Fortschritt.`]],
      examples:["Schütze eine Führung; spare bei Rückstand ein Kommando für Druck.","Vor dem Finale kann ein Ersatzspieler wertvoller als ein kleiner Bonus sein.","Gleiche Richtung von Schütze und Torwart erhöht die Paradechance.","Ein Titel beschleunigt neue Formationen und Präsidenten."],
      terms:{trust:["Vertrauen","Beziehung zum Präsidenten; Ausgaben, Krisen und Entscheidungen verändern sie."],legacy:["Vermächtnis","Karriere, Meisterschaft, Lizenzen und Museum zwischen den Läufen."]}
    },
    it:{
      steps:[["Preparazione e tattica",`Scegli obiettivo e discorso prima della partita. I comandi tattici sono limitati; usali al <b>momento giusto</b>.`],["Premi e svincolati",`I premi offrono denaro, carte o rosa. Per svincolati e scambi pensa a <b>ciò che resta del percorso</b>.`],["Rigori e finale",`I pareggi a eliminazione possono andare ai rigori. In finale arrivano <b>Golden Goal</b> e poi rigori se resta la parità.`],["Carriera e retaggio",`Le partite completate danno reputazione, maestria e licenze. Archivio, Museo e Retaggio conservano i progressi a lungo termine.`]],
      examples:["Difendi il vantaggio; se perdi conserva un comando per la pressione.","Prima della finale una riserva può valere più di un piccolo bonus.","Se portiere e tiratore scelgono la stessa direzione aumenta la parata.","Un titolo accelera nuove formazioni e presidenti."],
      terms:{trust:["Fiducia","Rapporto con il presidente; spese, crisi e decisioni lo modificano."],legacy:["Retaggio","Carriera, maestria, licenze e museo che restano tra le partite."]}
    }
  };

  let mode="quick",product="life",activeByProduct={life:0,arena:0},searchQuery="",tipObserver=null,tipNode=null,tipTarget=null,tipKey="",tipCooldownUntil=0,tipResizeBound=false;
  const currentLang=()=>typeof LANG!=="undefined"?LANG:"en";
  const lang=()=>COPY[currentLang()]||COPY.en;
  const ui=()=>UI[currentLang()]||UI.en;
  const guideData=()=>typeof _HOWTO!=="undefined"&&(_HOWTO[currentLang()]||_HOWTO.en)||{steps:[]};
  const activeStep=()=>activeByProduct[product]||0;
  const productData=()=>{
    if(product==="arena")return ARENA[currentLang()]||ARENA.en;
    const c=lang(),data=guideData(),extra=LIFE_EXTRA[currentLang()]||LIFE_EXTRA.en;
    return {lead:c.quickLead,quick:c.quickItems,steps:[...(data.steps||[]),...extra.steps],examples:[...c.examples,...extra.examples],terms:Object.assign({},c.terms,extra.terms),actions:["formation",null,null,null,null,"market",null,null,null,null]};
  };
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const visible=node=>!!(node&&node.isConnected&&!node.classList.contains("hidden")&&node.getClientRects().length);
  const viewportMetrics=()=>({width:Number((root.visualViewport&&root.visualViewport.width)||root.innerWidth),height:Number((root.visualViewport&&root.visualViewport.height)||root.innerHeight)});
  const inViewport=node=>{
    if(!visible(node))return false;
    const rect=node.getBoundingClientRect(),viewport=viewportMetrics();
    if(rect.width<1||rect.height<1)return false;
    const visibleWidth=Math.min(rect.right,viewport.width)-Math.max(rect.left,0);
    const visibleHeight=Math.min(rect.bottom,viewport.height)-Math.max(rect.top,0);
    return visibleWidth>=Math.min(24,rect.width*.25)&&visibleHeight>=Math.min(24,rect.height*.25);
  };
  const activeTipTarget=(target,screen)=>inViewport(target)&&inViewport(screen);
  const currentProduct=()=>document.body.classList.contains("arena-active")||document.body.dataset.copaMode==="arena"?"arena":"life";
  const contextualTipsAllowed=()=>!document.body.classList.contains("arena-active");
  const analytics=(event,extra={})=>{try{if(global.CopaAnalytics)global.CopaAnalytics.track(event,Object.assign({guide_product:product,guide_view:mode},extra));}catch(_){}};
  function readGuideState(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}")||{};}catch(_){return{};}}
  function saveGuideState(){try{localStorage.setItem(STATE_KEY,JSON.stringify({product,mode,activeByProduct}));}catch(_){}}

  let styleReady=null;
  function ensureStyle(){
    if(styleReady)return styleReady;
    const existing=document.querySelector("link[data-copa-howto]");
    if(existing&&existing.sheet)return Promise.resolve();
    styleReady=new Promise(resolve=>{
      if(existing){
        existing.addEventListener("load",resolve,{once:true});
        existing.addEventListener("error",resolve,{once:true});
        return;
      }
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href="src/styles/howtoGuide.css?v=20260730-product-themes2";
      link.dataset.copaHowto="1";
      link.addEventListener("load",resolve,{once:true});
      link.addEventListener("error",resolve,{once:true});
      const palette=document.querySelector('link[href*="src/styles/palette.css"]');
      if(palette&&palette.parentNode)palette.parentNode.insertBefore(link,palette);
      else document.head.appendChild(link);
    });
    return styleReady;
  }

  function actionLabel(c,action){
    if(action==="practice")return currentLang()==="tr"?"Antrenman maçını göster":currentLang()==="es"?"Mostrar Entrenamiento":currentLang()==="de"?"Training zeigen":currentLang()==="it"?"Mostra Allenamento":"Show Practice";
    if(action==="leaderboard")return currentLang()==="tr"?"Sıralamayı göster":currentLang()==="es"?"Mostrar clasificación":currentLang()==="de"?"Rangliste zeigen":currentLang()==="it"?"Mostra classifica":"Show leaderboard";
    return c.actions[action]||action;
  }

  function quickPanel(c,data){
    return `<section class="howto-view howto-quick-view" role="tabpanel" aria-label="${esc(c.quick)}">
      <p class="howto-lead">${esc(data.lead)}</p>
      <div class="howto-quick-list">${data.quick.map((item,index)=>`<details class="howto-quick-card" ${matchMedia("(min-width: 721px)").matches?"open":index===0?"open":""}>
        <summary><span>${String(index+1).padStart(2,"0")}</span><b>${esc(item[0])}</b><i aria-hidden="true">+</i></summary>
        <p>${esc(item[1])}</p>
      </details>`).join("")}</div>
      <div class="howto-quick-actions">${(product==="arena"?["practice","leaderboard"]:["formation","market"]).map(action=>`<div class="howto-action-unit"><button type="button" class="howto-learn-btn" data-guide-action="${action}">${esc(actionLabel(c,action))}</button><small data-guide-action-note></small></div>`).join("")}</div>
    </section>`;
  }

  function pathMarkup(data){
    return `<div class="howto-topic-tools"><label><span>${esc(ui().searchLabel)}</span><input type="search" data-guide-search value="${esc(searchQuery)}" placeholder="${esc(ui().search)}"></label></div>
      <div class="howto-topic-grid" role="tablist" aria-label="${esc(ui().topics)}">${data.steps.map((step,index)=>`
        <button type="button" class="howto-topic${index===activeStep()?" is-active":""}" data-guide-step="${index}" role="tab" aria-selected="${index===activeStep()}" aria-controls="howtoStepPanel">
          <span>${String(index+1).padStart(2,"0")}</span><b>${esc(step[0])}</b>
        </button>`).join("")}<p class="howto-no-results" hidden>${esc(ui().noResults)}</p></div>
      <div class="howto-step-nav" aria-label="${esc(ui().topics)}">
        <button type="button" data-guide-nav="-1" aria-label="${esc(ui().previous)}" ${activeStep()===0?"disabled":""}>←</button>
        <label><span>${esc(ui().topics)}</span><select data-guide-step-select>${data.steps.map((step,index)=>`<option value="${index}" ${index===activeStep()?"selected":""}>${index+1}. ${esc(step[0])}</option>`).join("")}</select></label>
        <strong>${activeStep()+1} / ${data.steps.length}</strong>
        <button type="button" data-guide-nav="1" aria-label="${esc(ui().next)}" ${activeStep()===data.steps.length-1?"disabled":""}>→</button>
      </div>`;
  }

  function glossaryMarkup(c,data){
    return `<section class="howto-glossary" aria-label="${esc(c.glossaryTitle)}"><h3>${esc(c.glossaryTitle)}</h3>
      <div class="howto-term-row">${Object.entries(data.terms).map(([key,term])=>`<button type="button" class="howto-term" data-guide-term="${key}" aria-expanded="false">${esc(term[0])}</button>`).join("")}</div>
      <div class="howto-term-detail" data-guide-term-detail aria-live="polite"></div>
    </section>`;
  }

  function stepPanel(c,data){
    const index=activeStep(),step=data.steps[index]||["",""];
    const action=data.actions[index]||"";
    return `<article class="howto-step-panel" id="howtoStepPanel" role="tabpanel">
      <div class="howto-step-icon">${ICONS[index%ICONS.length]||""}</div>
      <div class="howto-step-copy">
        <div class="howto-step-kicker">${String(index+1).padStart(2,"0")} / ${String(data.steps.length).padStart(2,"0")}</div>
        <h3>${esc(step[0])}</h3>
        <details class="howto-step-details" open>
          <summary><span class="howto-detail-open-label">${esc(c.collapse)}</span><span class="howto-detail-closed-label">${esc(c.expand)}</span><i aria-hidden="true">+</i></summary>
          <div class="howto-step-description">${step[1]||""}</div>
        </details>
        <div class="howto-example"><span>${esc(c.example)}</span><p>${esc(data.examples[index]||"")}</p></div>
        ${action?`<div class="howto-do"><span>${esc(c.learn)}</span><button type="button" class="howto-learn-btn" data-guide-action="${action}">${esc(actionLabel(c,action))}</button><small data-guide-action-note></small></div>`:""}
      </div>
    </article>`;
  }

  function detailedPanel(c,data){
    return `<section class="howto-view howto-detail-view" role="tabpanel" aria-label="${esc(c.detail)}">
      ${pathMarkup(data)}
      ${stepPanel(c,data)}
      ${glossaryMarkup(c,data)}
    </section>`;
  }

  function productBrand(kind){
    const isArena=kind==="arena";
    return `<span class="howto-product-brand howto-product-brand-${kind}">${isArena?SVG.crown:SVG.dice}<span>COPA <em>${isArena?"ARENA":"LIFE"}</em></span></span>`;
  }

  function shell(){
    const c=lang(),data=productData(),u=ui();
    return `<div class="howto-modal-shell howto-guide-v2 is-${product}" data-guide-product-theme="${product}">
      <header class="howto-mhdr">
        <div class="howto-mhdr-copy"><span class="howto-mhdr-title">${esc(c.title)}</span><span class="howto-mhdr-sub">${esc(product==="life"?u.life:u.arena)} · ${esc(mode==="quick"?u.quickSub:u.detailSub)}</span></div>
        ${product==="arena"&&document.querySelector("#arena [data-arena-deadline]")?`<span class="howto-live-clock" data-guide-live-clock>${esc(u.timerContinues)}</span>`:""}
        <button class="howto-mhdr-close" type="button" onclick="closeModal()" aria-label="${esc(c.close)}">×</button>
      </header>
      <div class="howto-product-tabs" role="tablist" aria-label="${esc(u.products)}">
        <button type="button" role="tab" data-guide-product="life" aria-label="${esc(u.life)}" aria-selected="${product==="life"}" class="${product==="life"?"is-active":""}">${productBrand("life")}</button>
        <button type="button" role="tab" data-guide-product="arena" aria-label="${esc(u.arena)}" aria-selected="${product==="arena"}" class="${product==="arena"?"is-active":""}">${productBrand("arena")}</button>
      </div>
      <div class="howto-mode-tabs" role="tablist" aria-label="${esc(c.title)}">
        <button type="button" role="tab" data-guide-mode="quick" aria-selected="${mode==="quick"}" class="${mode==="quick"?"is-active":""}">${esc(c.quick)}</button>
        <button type="button" role="tab" data-guide-mode="detail" aria-selected="${mode==="detail"}" class="${mode==="detail"?"is-active":""}">${esc(c.detail)}</button>
      </div>
      <div class="howto-mbody">${mode==="quick"?quickPanel(c,data):detailedPanel(c,data)}</div>
      <footer class="howto-mfoot"><button class="howto-reset-tips" type="button" data-guide-reset>${esc(u.reset)}</button><button class="btn btn-primary" type="button" onclick="closeModal()">${esc(c.back)}</button></footer>
    </div>`;
  }

  function bind(){
    const root=document.querySelector(".howto-guide-v2");
    if(!root)return;
    root.querySelectorAll("[data-guide-product]").forEach(button=>button.addEventListener("click",()=>{
      product=button.dataset.guideProduct==="arena"?"arena":"life";searchQuery="";saveGuideState();analytics("guide_product_selected");render();
    }));
    root.querySelectorAll("[data-guide-mode]").forEach(button=>button.addEventListener("click",()=>{
      mode=button.dataset.guideMode;
      searchQuery="";saveGuideState();analytics("guide_view_selected");render();
    }));
    root.querySelectorAll("[data-guide-step]").forEach(button=>button.addEventListener("click",()=>{
      activeByProduct[product]=Number(button.dataset.guideStep)||0;searchQuery="";saveGuideState();analytics("guide_topic_opened",{guide_topic:activeByProduct[product]});render();
    }));
    root.querySelector("[data-guide-step-select]")?.addEventListener("change",event=>{activeByProduct[product]=Number(event.target.value)||0;saveGuideState();analytics("guide_topic_opened",{guide_topic:activeByProduct[product]});render();});
    root.querySelectorAll("[data-guide-nav]").forEach(button=>button.addEventListener("click",()=>{activeByProduct[product]=Math.max(0,Math.min(productData().steps.length-1,activeStep()+Number(button.dataset.guideNav)));saveGuideState();render();}));
    root.querySelector("[data-guide-search]")?.addEventListener("input",event=>{
      searchQuery=event.target.value;
      const q=searchQuery.trim().toLocaleLowerCase(currentLang()),grid=root.querySelector(".howto-topic-grid");
      let count=0;
      grid?.querySelectorAll(".howto-topic").forEach(button=>{const match=!q||button.textContent.toLocaleLowerCase(currentLang()).includes(q);button.hidden=!match;if(match)count++;});
      grid?.classList.toggle("has-search",!!q);
      const empty=grid?.querySelector(".howto-no-results");if(empty)empty.hidden=count>0;
    });
    root.querySelectorAll("[data-guide-term]").forEach(button=>button.addEventListener("click",()=>{
      const detail=root.querySelector("[data-guide-term-detail]");
      const term=productData().terms[button.dataset.guideTerm];
      const expanded=button.getAttribute("aria-expanded")==="true";
      root.querySelectorAll("[data-guide-term]").forEach(item=>item.setAttribute("aria-expanded","false"));
      if(detail)detail.innerHTML=expanded?"":`<b>${esc(term[0])}</b><p>${esc(term[1])}</p>`;
      button.setAttribute("aria-expanded",String(!expanded));
    }));
    root.querySelectorAll("[data-guide-action]").forEach(button=>{
      const action=button.dataset.guideAction;
      const target=action==="formation"?document.getElementById("intro"):action==="market"?document.getElementById("hub"):document.querySelector(`[data-arena-action="${action}"]`);
      const available=visible(target);
      button.disabled=!available;
      const note=button.parentElement?.querySelector("[data-guide-action-note]");
      if(note&&!available)note.textContent=lang().actions.unavailable;
      button.addEventListener("click",()=>{analytics("guide_action_clicked",{guide_action:action});runAction(action);});
    });
    root.querySelector("[data-guide-reset]")?.addEventListener("click",event=>{resetContext();event.currentTarget.textContent=ui().resetDone;});
    const liveClock=root.querySelector("[data-guide-live-clock]");
    if(liveClock){
      const paint=()=>{if(!liveClock.isConnected)return false;const deadline=document.querySelector("#arena [data-arena-deadline]");liveClock.textContent=deadline?.textContent?.trim()||ui().timerContinues;return true;};
      paint();const timer=setInterval(()=>{if(!paint())clearInterval(timer);},250);
    }
  }

  function render(){
    if(typeof global.showModal!=="function")return;
    global.showModal(shell(),{dismissOnOverlay:true,label:lang().title,bare:true});
    bind();
  }

  function open(initialMode,initialProduct){
    ensureStyle();
    const stored=readGuideState();
    product=initialProduct==="arena"?"arena":initialProduct==="life"?"life":currentProduct();
    mode=initialMode==="detail"||initialMode==="quick"?initialMode:stored.mode==="detail"?"detail":"quick";
    if(stored.activeByProduct)activeByProduct={life:Number(stored.activeByProduct.life)||0,arena:Number(stored.activeByProduct.arena)||0};
    searchQuery="";saveGuideState();analytics("guide_opened");
    ensureStyle().then(render);
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
      return;
    }
    if(action==="practice"||action==="leaderboard"){
      const target=document.querySelector(`[data-arena-action="${action}"]`);
      if(!visible(target))return;
      global.closeModal&&global.closeModal();
      requestAnimationFrame(()=>{target.scrollIntoView({block:"center",behavior:"smooth"});target.classList.add("guide-focus");target.focus({preventScroll:true});setTimeout(()=>target.classList.remove("guide-focus"),1800);});
    }
  }

  function readContext(){
    try{return JSON.parse(localStorage.getItem(CONTEXT_KEY)||"{}")||{};}catch(error){return{};}
  }
  function saveContext(state){
    try{localStorage.setItem(CONTEXT_KEY,JSON.stringify(state));}catch(error){}
  }
  function dismissTip(acknowledged=false){
    if(acknowledged&&tipKey){const state=readContext();state[tipKey]=Date.now();saveContext(state);}
    if(tipNode)tipNode.remove();
    if(tipTarget)tipTarget.classList.remove("guide-focus");
    tipNode=null;tipTarget=null;tipKey="";
    tipCooldownUntil=Date.now()+5000;
  }
  function resetContext(){
    try{localStorage.removeItem(CONTEXT_KEY);}catch(_){}
    dismissTip(false);
    analytics("guide_tips_reset");
  }
  function positionCoachmark(){
    if(!tipNode)return;
    if(!inViewport(tipTarget)){dismissTip();return;}
    const targetRect=tipTarget&&tipTarget.getBoundingClientRect();
    const margin=12,topSafe=Math.max(8,Number((root.visualViewport&&root.visualViewport.offsetTop)||0)+8);
    const tipRect=tipNode.getBoundingClientRect();
    if(!targetRect||targetRect.width<1||targetRect.height<1){dismissTip();return;}
    const {height:viewportHeight,width:viewportWidth}=viewportMetrics();
    let top=targetRect.bottom+margin;
    if(top+tipRect.height>viewportHeight-margin)top=targetRect.top-tipRect.height-margin;
    top=Math.max(topSafe,Math.min(top,viewportHeight-tipRect.height-margin));
    let left=targetRect.left;
    left=Math.max(margin,Math.min(left,viewportWidth-tipRect.width-margin));
    tipNode.style.top=`${Math.round(top)}px`;tipNode.style.left=`${Math.round(left)}px`;tipNode.style.right="auto";tipNode.style.bottom="auto";
    tipNode.dataset.anchored="true";
  }
  function showTip(key,target){
    const c=lang(),tip=c.tips[key];
    if(!contextualTipsAllowed()||!tip||tipNode||!target)return;
    const state=readContext();
    if(state[key])return;
    tipKey=key;tipTarget=target;target.classList.add("guide-focus");
    tipNode=document.createElement("aside");
    tipNode.className="copa-coachmark";
    tipNode.setAttribute("role","status");
    tipNode.innerHTML=`<button type="button" class="copa-coachmark-x" aria-label="${esc(c.close)}">×</button><span>${esc(tip[0])}</span><p>${esc(tip[1])}</p><button type="button" class="copa-coachmark-ok">${esc(c.gotIt)}</button>`;
    document.body.appendChild(tipNode);
    if(!tipResizeBound){root.addEventListener("resize",positionCoachmark,{passive:true});root.addEventListener("scroll",positionCoachmark,{passive:true,capture:true});root.visualViewport?.addEventListener("resize",positionCoachmark,{passive:true});tipResizeBound=true;}
    root.requestAnimationFrame(positionCoachmark);
    tipNode.querySelector(".copa-coachmark-x")?.addEventListener("click",()=>dismissTip(false));
    tipNode.querySelector(".copa-coachmark-ok")?.addEventListener("click",()=>dismissTip(true));
  }
  function scanContext(){
    if(!contextualTipsAllowed()){dismissTip();return;}
    if(Date.now()<tipCooldownUntil)return;
    if(!document.getElementById("modal")?.classList.contains("hidden")){
      if(tipNode)dismissTip();
      return;
    }
    if(tipNode){if(!inViewport(tipTarget))dismissTip();return;}
    const state=readContext();
    const candidates=[
      ["setup",document.getElementById("formpick"),document.getElementById("intro")],
      ["draft",document.getElementById("rollBtn"),document.getElementById("draft")],
      ["hub",document.getElementById("chemTile"),document.getElementById("hub")],
      ["bench",document.getElementById("nativeBenchTrigger"),document.getElementById("hub")],
      ["injury",document.getElementById("injbar"),document.getElementById("hub")],
      ["table",document.querySelector("#tournamentHubPanel .tg-table"),document.getElementById("hub")]
    ];
    const match=candidates.find(([key,target,screen])=>!state[key]&&activeTipTarget(target,screen));
    if(match)showTip(match[0],match[1]);
  }
  function initContextualTips(){
    ensureStyle();
    if(!contextualTipsAllowed()){dismissTip();return;}
    if(tipObserver)return;
    tipObserver=new MutationObserver(()=>setTimeout(scanContext,120));
    tipObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class","data-mobile-route","aria-hidden"]});
    setTimeout(scanContext,600);
  }

  function installResetSetting(){
    const drop=document.getElementById("settingsDrop");
    if(!drop||drop.querySelector("[data-guide-reset-setting]"))return;
    const group=document.createElement("div");
    group.className="sd-group howto-settings-group";
    group.innerHTML=`<button type="button" class="sdbtn sd-full" data-guide-reset-setting>${esc(ui().reset)}</button>`;
    group.querySelector("button").addEventListener("click",event=>{resetContext();event.currentTarget.textContent=ui().resetDone;setTimeout(()=>{if(event.currentTarget.isConnected)event.currentTarget.textContent=ui().reset;},1600);});
    drop.appendChild(group);
  }

  ensureStyle();
  installResetSetting();
  global.CopaHowtoGuide=Object.freeze({open,render,runAction,initContextualTips,resetContext});
})(window);
