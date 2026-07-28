(function(root){
  "use strict";
  const TOKEN_KEY="copa_arena_token_v1";
  const TERMS_KEY="copa_arena_terms_v1";
  const CLUB_KEY="copa_arena_club_v1";
  const ROOM_KEY="copa_arena_room_v1";
  const API_META="meta[name='copa-arena-api']";
  const TERMS_VERSION="arena-terms-v1";
  const REWARDS=[
    {at:5,id:"arena_badge_rookie",tr:"Çaylak Rozeti",en:"Rookie Badge"},
    {at:12,id:"arena_frame_floodlights",tr:"Projektör Çerçevesi",en:"Floodlights Frame"},
    {at:20,id:"arena_kit_nocturne",tr:"Gece Forması",en:"Nocturne Kit"},
    {at:35,id:"arena_title_unbroken",tr:"Yıkılmayan Ünvanı",en:"Unbroken Title"}
  ];
  const COPY={
    tr:{
      arena:"COPA ARENA",subtitle:"Canlı rakiplere karşı kulübünü kur, kararını ver, yüksel.",
      ranked:"DERECELİ YOLCULUK",play:"EŞLEŞME BUL",back:"COPA LIFE'A DÖN",loading:"ARENA YÜKLENİYOR",
      candidate:"ADAY",bronze:"BRONZ",silver:"GÜMÜŞ",gold:"ALTIN",diamond:"ELMAS",legend:"EFSANE",
      rating:"RATING",season:"SEZON YOLU",record:"KARİYER",history:"SON MAÇLAR",leaderboard:"SIRALAMA",
      queue:"RAKİP ARANIYOR",queueCopy:"Benzer seviyedeki canlı bir kulüp aranıyor.",cancel:"ARAMAYI İPTAL ET",
      ready:"HAZIRIM",waiting:"RAKİP BEKLENİYOR",setup:"KULÜP KİMLİĞİ",draft:"KADRO KUR",market:"SON DOKUNUŞ",
      training:"MAÇ PLANI",live:"CANLI MAÇ",result:"MAÇ SONU",formation:"DİZİLİŞ",style:"OYUN ANLAYIŞI",
      chairman:"BAŞKAN",budget:"KALAN KASA",chemistry:"KİMYA",power:"GÜÇ",choose:"SEÇ",
      reconnecting:"BAĞLANTI YENİDEN KURULUYOR",retry:"TEKRAR DENE",home:"ARENA MERKEZİ",
      win:"GALİBİYET",loss:"MAĞLUBİYET",draw:"BERABERLİK",forfeitWin:"HÜKMEN GALİBİYET",forfeitLoss:"HÜKMEN MAĞLUBİYET",voided:"HÜKÜMSÜZ MAÇ",voidedCopy:"İki taraf da yeterli sayıda karar vermediği için sıralama ve sezon ilerlemesi değişmedi.",searchAgain:"YENİ EŞLEŞME",
      consentTitle:"ARENA'YA GİR",consent:"Copa Arena canlı ve dereceli bir moddur. Kulüp adın, skorun ve rating'in herkese açık sıralamada görünür. Kişisel bilgi ve serbest sohbet yoktur.",
      accept:"KABUL ET VE GİR",club:"ARENA KULÜP ADI",network:"Arena servisine ulaşılamadı.",empty:"Henüz tamamlanmış maç yok.",
      authentic:"GERÇEK OYUNCU",noBots:"Bot veya Ghost Club kullanılmaz.",fair:"EŞİT TEKLİF",fairCopy:"Hız değil karar kalitesi kazandırır.",
      server:"SUNUCU OTORİTELİ",serverCopy:"Sonuç bir kez üretilir ve değiştirilemez.",
      deleteData:"ARENA VERİLERİMİ SİL",deleteConfirm:"Arena kulübün, derecen ve maç geçmişin kalıcı olarak silinecek. Devam edilsin mi?",
      you:"SEN",opponent:"RAKİP",goal:"GOL",cardEvent:"KART",tacticDecision:"TAKTİK KARARI",pass:"PAS",marketCard:"KART",
      selected:"SEÇİLDİ",startingXI:"İLK 11",babacan:"BABACAN BAŞKAN"
    },
    en:{
      arena:"COPA ARENA",subtitle:"Build your club live, make the call, climb the table.",
      ranked:"RANKED JOURNEY",play:"FIND A MATCH",back:"BACK TO COPA LIFE",loading:"LOADING ARENA",
      candidate:"CANDIDATE",bronze:"BRONZE",silver:"SILVER",gold:"GOLD",diamond:"DIAMOND",legend:"LEGEND",
      rating:"RATING",season:"SEASON TRACK",record:"CAREER",history:"RECENT MATCHES",leaderboard:"LEADERBOARD",
      queue:"FINDING OPPONENT",queueCopy:"Looking for a live club near your level.",cancel:"CANCEL SEARCH",
      ready:"I'M READY",waiting:"WAITING FOR OPPONENT",setup:"CLUB IDENTITY",draft:"BUILD YOUR XI",market:"FINAL TOUCH",
      training:"MATCH PLAN",live:"LIVE MATCH",result:"FULL TIME",formation:"FORMATION",style:"PLAY STYLE",
      chairman:"CHAIRMAN",budget:"CASH LEFT",chemistry:"CHEMISTRY",power:"POWER",choose:"CHOOSE",
      reconnecting:"RECONNECTING",retry:"TRY AGAIN",home:"ARENA HUB",
      win:"VICTORY",loss:"DEFEAT",draw:"DRAW",forfeitWin:"FORFEIT VICTORY",forfeitLoss:"FORFEIT DEFEAT",voided:"VOID MATCH",voidedCopy:"Neither side made enough decisions, so rating and season progress were unchanged.",searchAgain:"NEW MATCH",
      consentTitle:"ENTER THE ARENA",consent:"Copa Arena is live and ranked. Your club name, scores and rating appear on the public table. There is no personal data or free chat.",
      accept:"ACCEPT AND ENTER",club:"ARENA CLUB NAME",network:"Arena service is unavailable.",empty:"No completed matches yet.",
      authentic:"REAL OPPONENTS",noBots:"No bots or Ghost Clubs.",fair:"MIRRORED OFFERS",fairCopy:"Decision quality matters, not click speed.",
      server:"SERVER AUTHORITATIVE",serverCopy:"The result is generated once and cannot be rerolled.",
      deleteData:"DELETE MY ARENA DATA",deleteConfirm:"Your Arena club, rating and match history will be permanently deleted. Continue?",
      you:"YOU",opponent:"OPPONENT",goal:"GOAL",cardEvent:"CARD",tacticDecision:"TACTIC DECISION",pass:"PASS",marketCard:"CARD",
      selected:"SELECTED",startingXI:"STARTING XI",babacan:"BABACAN CHAIRMAN"
    }
  };
  COPY.es={...COPY.en,subtitle:"Construye tu club en directo, decide y sube en la tabla.",ranked:"CAMINO CLASIFICATORIO",play:"BUSCAR PARTIDA",back:"VOLVER A COPA LIFE",loading:"CARGANDO ARENA",rating:"PUNTUACIÓN",season:"RUTA DE TEMPORADA",record:"CARRERA",history:"ÚLTIMOS PARTIDOS",leaderboard:"CLASIFICACIÓN",queue:"BUSCANDO RIVAL",queueCopy:"Buscando un club real de nivel similar.",cancel:"CANCELAR BÚSQUEDA",ready:"ESTOY LISTO",waiting:"ESPERANDO AL RIVAL",setup:"IDENTIDAD DEL CLUB",draft:"CREA TU ONCE",market:"TOQUE FINAL",training:"PLAN DE PARTIDO",live:"PARTIDO EN VIVO",result:"FINAL",formation:"FORMACIÓN",style:"ESTILO DE JUEGO",chairman:"PRESIDENTE",budget:"CAJA RESTANTE",chemistry:"QUÍMICA",power:"FUERZA",choose:"ELEGIR",reconnecting:"RECONECTANDO",retry:"REINTENTAR",home:"CENTRO ARENA",win:"VICTORIA",loss:"DERROTA",draw:"EMPATE",searchAgain:"NUEVO PARTIDO",consentTitle:"ENTRAR EN LA ARENA",consent:"Copa Arena es un modo en vivo y clasificatorio. El nombre del club, los resultados y la puntuación aparecen en la tabla pública. No hay datos personales ni chat libre.",accept:"ACEPTAR Y ENTRAR",club:"NOMBRE DEL CLUB ARENA",network:"No se puede acceder al servicio Arena.",empty:"Aún no hay partidos completados.",authentic:"RIVALES REALES",noBots:"Sin bots ni Ghost Clubs.",fair:"OFERTAS ESPEJO",fairCopy:"Decide mejor, no más rápido.",server:"SERVIDOR AUTORITATIVO",serverCopy:"El resultado se genera una vez y no puede repetirse.",deleteData:"BORRAR MIS DATOS DE ARENA",deleteConfirm:"Tu club Arena, puntuación e historial se borrarán de forma permanente. ¿Continuar?",you:"TÚ",opponent:"RIVAL",goal:"GOL",cardEvent:"TARJETA",tacticDecision:"DECISIÓN TÁCTICA",pass:"PASAR",marketCard:"CARTA"};
  COPY.de={...COPY.en,subtitle:"Baue deinen Club live auf, entscheide und steige auf.",ranked:"RANGLISTENREISE",play:"MATCH FINDEN",back:"ZURÜCK ZU COPA LIFE",loading:"ARENA LÄDT",rating:"WERTUNG",season:"SAISONPFAD",record:"KARRIERE",history:"LETZTE SPIELE",leaderboard:"RANGLISTE",queue:"GEGNER WIRD GESUCHT",queueCopy:"Ein echter Club auf ähnlichem Niveau wird gesucht.",cancel:"SUCHE ABBRECHEN",ready:"BEREIT",waiting:"WARTE AUF GEGNER",setup:"CLUBIDENTITÄT",draft:"BAUE DEINE ELF",market:"LETZTER SCHLIFF",training:"SPIELPLAN",live:"LIVE-SPIEL",result:"ABPFIFF",formation:"FORMATION",style:"SPIELSTIL",chairman:"PRÄSIDENT",budget:"RESTBUDGET",chemistry:"CHEMIE",power:"STÄRKE",choose:"WÄHLEN",reconnecting:"VERBINDUNG WIRD WIEDERHERGESTELLT",retry:"ERNEUT VERSUCHEN",home:"ARENA-ZENTRALE",win:"SIEG",loss:"NIEDERLAGE",draw:"UNENTSCHIEDEN",searchAgain:"NEUES MATCH",consentTitle:"ARENA BETRETEN",consent:"Copa Arena ist live und gewertet. Clubname, Ergebnisse und Wertung erscheinen öffentlich. Es gibt keine persönlichen Daten und keinen freien Chat.",accept:"AKZEPTIEREN UND STARTEN",club:"ARENA-CLUBNAME",network:"Arena-Dienst ist nicht erreichbar.",empty:"Noch keine abgeschlossenen Spiele.",authentic:"ECHTE GEGNER",noBots:"Keine Bots oder Ghost Clubs.",fair:"GESPIEGELTE ANGEBOTE",fairCopy:"Entscheidungsqualität zählt, nicht Tempo.",server:"SERVER-AUTORITATIV",serverCopy:"Das Ergebnis wird einmal erzeugt und kann nicht neu gewürfelt werden.",deleteData:"MEINE ARENA-DATEN LÖSCHEN",deleteConfirm:"Arena-Club, Wertung und Verlauf werden dauerhaft gelöscht. Fortfahren?",you:"DU",opponent:"GEGNER",goal:"TOR",cardEvent:"KARTE",tacticDecision:"TAKTISCHE ENTSCHEIDUNG",pass:"AUSLASSEN",marketCard:"KARTE"};
  COPY.it={...COPY.en,subtitle:"Costruisci il club dal vivo, scegli e scala la classifica.",ranked:"VIAGGIO CLASSIFICATO",play:"TROVA PARTITA",back:"TORNA A COPA LIFE",loading:"CARICAMENTO ARENA",rating:"PUNTEGGIO",season:"PERCORSO STAGIONE",record:"CARRIERA",history:"ULTIME PARTITE",leaderboard:"CLASSIFICA",queue:"RICERCA AVVERSARIO",queueCopy:"Cerchiamo un club reale di livello simile.",cancel:"ANNULLA RICERCA",ready:"SONO PRONTO",waiting:"IN ATTESA DELL'AVVERSARIO",setup:"IDENTITÀ DEL CLUB",draft:"CREA L'UNDICI",market:"TOCCO FINALE",training:"PIANO PARTITA",live:"PARTITA LIVE",result:"FINE PARTITA",formation:"MODULO",style:"STILE DI GIOCO",chairman:"PRESIDENTE",budget:"CASSA RESTANTE",chemistry:"INTESA",power:"FORZA",choose:"SCEGLI",reconnecting:"RICONNESSIONE",retry:"RIPROVA",home:"CENTRO ARENA",win:"VITTORIA",loss:"SCONFITTA",draw:"PAREGGIO",searchAgain:"NUOVA PARTITA",consentTitle:"ENTRA NELL'ARENA",consent:"Copa Arena è una modalità live e classificata. Nome del club, risultati e punteggio compaiono nella classifica pubblica. Non ci sono dati personali né chat libera.",accept:"ACCETTA ED ENTRA",club:"NOME CLUB ARENA",network:"Servizio Arena non disponibile.",empty:"Nessuna partita completata.",authentic:"AVVERSARI REALI",noBots:"Niente bot o Ghost Club.",fair:"OFFERTE SPECULARI",fairCopy:"Conta la qualità delle scelte, non la velocità.",server:"SERVER AUTORITATIVO",serverCopy:"Il risultato viene generato una volta e non può essere rilanciato.",deleteData:"ELIMINA I MIEI DATI ARENA",deleteConfirm:"Club Arena, punteggio e cronologia verranno eliminati definitivamente. Continuare?",you:"TU",opponent:"AVVERSARIO",goal:"GOL",cardEvent:"CARTELLINO",tacticDecision:"DECISIONE TATTICA",pass:"PASSA",marketCard:"CARTA"};
  Object.assign(COPY.es,{forfeitWin:"VICTORIA POR ABANDONO",forfeitLoss:"DERROTA POR ABANDONO",voided:"PARTIDO ANULADO",voidedCopy:"Ningún equipo tomó suficientes decisiones. La puntuación y el progreso de temporada no cambiaron."});
  Object.assign(COPY.de,{forfeitWin:"SIEG DURCH AUFGABE",forfeitLoss:"NIEDERLAGE DURCH AUFGABE",voided:"MATCH ANNULLIERT",voidedCopy:"Keine Seite traf genug Entscheidungen. Wertung und Saisonfortschritt blieben unverändert."});
  Object.assign(COPY.it,{forfeitWin:"VITTORIA A TAVOLINO",forfeitLoss:"SCONFITTA A TAVOLINO",voided:"PARTITA ANNULLATA",voidedCopy:"Nessuna squadra ha preso abbastanza decisioni. Punteggio e progresso stagionale non sono cambiati."});
  const state={screen:"closed",profile:null,history:[],leaderboard:[],socket:null,room:null,queueStarted:0,timer:null,heartbeat:null,deadlineTimer:null,retries:0,lastError:"",lastResultSound:""};
  const text=key=>(COPY[root.LANG]||COPY.en)[key]||key;
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const api=()=>String((document.querySelector(API_META)||{}).content||root.COPA_ARENA_API||"").trim().replace(/\/$/,"");
  const wsBase=()=>api().replace(/^http:/,"ws:").replace(/^https:/,"wss:");
  const storage=root.CopaPlatform&&root.CopaPlatform.storage||localStorage;
  const get=(key,fallback="")=>{try{const value=storage.getItem(key);return value==null?fallback:value;}catch(_){return fallback;}};
  const set=(key,value)=>{try{storage.setItem(key,value);return true;}catch(_){return false;}};
  const remove=key=>{try{storage.removeItem(key);}catch(_){}};
  const uuid=()=>root.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,""):(Date.now().toString(36)+Math.random().toString(36).slice(2));
  const token=()=>{const saved=get(TOKEN_KEY);if(/^CAR-[A-Z0-9]{24,96}$/.test(saved))return saved;const value="CAR-"+uuid().toUpperCase().padEnd(24,"A");set(TOKEN_KEY,value);return value;};
  const client=()=>root.GhostClubs&&typeof root.GhostClubs.clientId==="function"?root.GhostClubs.clientId():(()=>{const key="copa_ghost_client_id_v1",saved=get(key);if(/^GCL-[A-Z0-9]{8,40}$/.test(saved))return saved;const value="GCL-"+uuid().toUpperCase().slice(0,32);set(key,value);return value;})();
  const headers=()=>({"content-type":"application/json","x-copa-client":client(),"x-copa-arena-token":token()});
  const clubName=()=>get(CLUB_KEY,(root.teamName&&String(root.teamName).trim())||"COPA CLUB").slice(0,29);
  const actionId=()=>`AA-${uuid().slice(0,24)}`;
  const local=(tr,en)=>root.LANG==="tr"?tr:en;
  function sfx(kind){
    if(root._muted)return;
    try{
      const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;
      const context=sfx.context||(sfx.context=new Audio()),now=context.currentTime,gain=context.createGain(),osc=context.createOscillator();
      const tones={open:[180,260,.12],queue:[220,330,.16],match:[196,523,.3],pick:[320,410,.09],goal:[260,660,.22],error:[120,80,.16],win:[330,740,.35]};
      const tone=tones[kind]||tones.pick;osc.type=kind==="match"||kind==="win"?"triangle":"sine";osc.frequency.setValueAtTime(tone[0],now);osc.frequency.exponentialRampToValueAtTime(tone[1],now+tone[2]);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.07,now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+tone[2]);
      osc.connect(gain).connect(context.destination);osc.start(now);osc.stop(now+tone[2]+.02);
    }catch(_){}
  }
  async function request(path,options={}){
    const response=await fetch(api()+path,{...options,headers:{...headers(),...(options.headers||{})}});
    const data=response.status===204?null:await response.json().catch(()=>({error:"invalid_response"}));
    if(!response.ok)throw new Error(data&&data.error||`http_${response.status}`);return data;
  }
  function telemetry(event,detail="",value=0){request("/v1/arena/events",{method:"POST",body:JSON.stringify({event,detail,value})}).catch(()=>{});}
  function rootEl(){
    let element=document.getElementById("arena");
    if(!element){
      element=document.createElement("section");element.id="arena";element.className="arena-shell hidden";element.setAttribute("aria-label","Copa Arena");
      const wrap=document.querySelector(".wrap");wrap.appendChild(element);element.addEventListener("click",onClick);element.addEventListener("change",onChange);
    }
    return element;
  }
  function setScreen(screen){state.screen=screen;render();}
  function divisionLabel(value){const map={aday:"candidate",bronz:"bronze",gumus:"silver",altin:"gold",elmas:"diamond",efsane:"legend"};return text(map[value]||"candidate");}
  function icon(name){
    const paths={
      arena:"<path d='M4 17V8l8-4 8 4v9M2 20h20M7 17v-5h10v5M9 9h6'/><path class='arena-icon-spark' d='M12 1v3M3 6l3 2M21 6l-3 2'/>",
      search:"<circle cx='11' cy='11' r='6'/><path d='m16 16 5 5M8 11h6M11 8v6'/>",
      shield:"<path d='M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z'/><path d='m8 12 2.4 2.4L16 9'/>",
      rank:"<path d='M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7'/>",
      ball:"<circle cx='12' cy='12' r='9'/><path d='m12 7 3 2-1 4h-4L9 9zM12 7V3M15 9l4-1M14 13l3 4M10 13l-3 4M9 9 5 8'/>"
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arena}</svg>`;
  }
  function chrome(content,kicker="COPA ARENA"){
    const isLive=state.screen==="room"&&state.room&&state.room.phase==="live";
    const status=isLive?"LIVE":local("ÇEVRİMİÇİ","ONLINE");
    return `<div class="arena-backdrop" aria-hidden="true"><i></i><i></i><i></i></div><header class="arena-topbar"><button type="button" data-arena-action="close" aria-label="${esc(text("back"))}">←</button><div><span>${esc(kicker)}</span><b>COPA <em>ARENA</em></b></div><div class="arena-live-mark ${isLive?"is-live":"is-online"}"><i></i> ${esc(status)}</div></header><div class="arena-content">${content}</div>`;
  }
  function terms(){
    return chrome(`<article class="arena-consent"><div class="arena-crest">${icon("arena")}</div><span class="arena-kicker">${esc(text("ranked"))}</span><h1>${esc(text("consentTitle"))}</h1><p>${esc(text("consent"))}</p><label><span>${esc(text("club"))}</span><input data-arena-club maxlength="29" value="${esc(clubName())}" autocomplete="off"></label><div class="arena-trust-row"><span>${icon("shield")}<b>${esc(text("authentic"))}</b><small>${esc(text("noBots"))}</small></span><span>${icon("rank")}<b>${esc(text("fair"))}</b><small>${esc(text("fairCopy"))}</small></span></div><button class="arena-primary" data-arena-action="accept">${esc(text("accept"))}</button></article>`);
  }
  function rewardTrack(profile){
    const progress=Number(profile.tokenProgress)||0,owned=new Set(profile.cosmetics||[]);
    return `<div class="arena-reward-track">${REWARDS.map(item=>`<div class="${progress>=item.at?"is-earned":""} ${owned.has(item.id)?"is-owned":""}"><i></i><b>${item.at}</b><span>${esc(root.LANG==="tr"?item.tr:item.en)}</span></div>`).join("")}</div>`;
  }
  function portal(){
    const profile=state.profile||{rating:1000,division:"aday",seasonPoints:0,wins:0,draws:0,losses:0,tokenProgress:0,cosmetics:[]};
    const matches=profile.wins+profile.draws+profile.losses;
    return chrome(`<div class="arena-portal">
      <section class="arena-hero-card">
        <div class="arena-hero-copy"><span>${esc(text("ranked"))}</span><h1>COPA ARENA</h1><p>${esc(text("subtitle"))}</p></div>
        <div class="arena-rank-orbit" data-division="${esc(profile.division)}"><i></i><div>${icon("shield")}<b>${esc(divisionLabel(profile.division))}</b><strong>${profile.rating}</strong><small>${esc(text("rating"))}</small></div></div>
      </section>
      <section class="arena-dashboard">
        <div class="arena-season-head"><span><small>${esc(text("season"))}</small><b>${esc(profile.seasonKey||"—")}</b></span><strong>${profile.seasonPoints} P</strong></div>
        ${rewardTrack(profile)}
        <div class="arena-record"><span><small>${esc(text("record"))}</small><b>${matches}</b></span><span class="is-win"><small>W</small><b>${profile.wins}</b></span><span><small>D</small><b>${profile.draws}</b></span><span class="is-loss"><small>L</small><b>${profile.losses}</b></span></div>
      </section>
      <button class="arena-primary arena-play" data-arena-action="queue">${icon("search")}<span><b>${esc(text("play"))}</b><small>${esc(text("authentic"))} · ${esc(text("fair"))}</small></span><i>→</i></button>
      <div class="arena-portal-links"><button data-arena-action="history">${icon("ball")} ${esc(text("history"))}</button><button data-arena-action="leaderboard">${icon("rank")} ${esc(text("leaderboard"))}</button></div>
      <div class="arena-principles"><span><i>01</i><b>${esc(text("authentic"))}</b><small>${esc(text("noBots"))}</small></span><span><i>02</i><b>${esc(text("fair"))}</b><small>${esc(text("fairCopy"))}</small></span><span><i>03</i><b>${esc(text("server"))}</b><small>${esc(text("serverCopy"))}</small></span></div>
      <button class="arena-data-delete" data-arena-action="delete-data">${esc(text("deleteData"))}</button>
    </div>`);
  }
  function queue(){
    return chrome(`<div class="arena-queue"><div class="arena-radar">${icon("search")}<i></i><i></i><i></i></div><span>${esc(text("ranked"))}</span><h1>${esc(text("queue"))}</h1><p>${esc(text("queueCopy"))}</p><strong data-arena-elapsed>00:00</strong><div class="arena-queue-tags"><b>${esc(divisionLabel(state.profile&&state.profile.division))}</b><i></i><b>${state.profile&&state.profile.rating||1000}</b></div><button class="arena-quiet" data-arena-action="cancel">${esc(text("cancel"))}</button></div>`);
  }
  const choiceLabels={
    formations:{"4-4-2":"4-4-2","4-3-3":"4-3-3","4-2-3-1":"4-2-3-1","3-5-2":"3-5-2"},
    styles:{balanced:"Dengeli",press:"Önde Baskı",counter:"Kontra",control:"Kontrol"},
    chairmen:{patron:"Patron",diplomat:"Diplomat",showman:"Şovmen",professor:"Profesör"},
    training:{finishing:"Bitiricilik",shape:"Savunma Şekli",chemistry:"Takım Uyumu",recovery:"Toparlanma"},
    tactics:{press:"Baskı Kur",balanced:"Dengede Kal",counter:"Kontraya Çık",control:"Topu Tut"},
    market:{twelfth:"12. Adam",counter:"Kontra",wall:"Savunma Duvarı",wonderkid:"Genç Yetenek",captain:"Kaptan",none:"Kart Alma"},
    traits:{connector:"Bağlantı",reliable:"Güvenilir",star:"Yıldız"}
  };
  const choiceLabelsEn={
    formations:choiceLabels.formations,
    styles:{balanced:"Balanced",press:"High Press",counter:"Counter",control:"Control"},
    chairmen:{patron:"Patron",diplomat:"Diplomat",showman:"Showman",professor:"Professor"},
    training:{finishing:"Finishing",shape:"Defensive Shape",chemistry:"Team Chemistry",recovery:"Recovery"},
    tactics:{press:"Press",balanced:"Hold Shape",counter:"Counter",control:"Keep Ball"},
    market:{twelfth:"12th Player",counter:"Counter",wall:"Defensive Wall",wonderkid:"Wonderkid",captain:"Captain",none:"No Card"},
    traits:{connector:"Connector",reliable:"Reliable",star:"Star"}
  };
  const choiceLabel=(kind,value)=>((root.LANG==="tr"?choiceLabels:choiceLabelsEn)[kind]||{})[value]||value;
  const traitDescription=trait=>({
    connector:local("Kimya odaklı","Chemistry focused"),
    reliable:local("Dengeli katkı","Balanced contribution"),
    star:local("Güç odaklı","Power focused")
  })[trait]||"";
  function options(kind,values,selected="",locked=false){
    const descriptions={
      tactics:{
        press:local("Kontrol oyununa karşı üstün; dayanıklılık harcar.","Counters Control; costs stamina."),
        balanced:local("Güvenli ve nötr; eşleşme bonusu yok.","Safe and neutral; no counter bonus."),
        counter:local("Baskıya karşı üstün; orta saha kontrolü azalır.","Counters Press; gives up midfield control."),
        control:local("Kontraya karşı üstün; tempo ve dayanıklılık ister.","Counters Counter; demands tempo and stamina.")
      },
      training:{
        finishing:local("Hücum +2","Attack +2"),shape:local("Savunma +2","Defence +2"),
        chemistry:local("Kimya +2","Chemistry +2"),recovery:local("Dayanıklılık +3","Stamina +3")
      }
    };
    return `<div class="arena-choice-grid ${kind}">${values.map(value=>{
      const active=value===selected;
      const detail=descriptions[kind]&&descriptions[kind][value];
      return `<button class="${active?"is-selected":""}" data-arena-choice="${esc(kind)}:${esc(value)}" aria-pressed="${active}" ${locked?"disabled":""}><i></i><b>${esc(choiceLabel(kind,value))}</b><span>${kind==="tactics"?"↗":kind==="training"?"+":"◆"}</span>${detail?`<small>${esc(detail)}</small>`:""}<em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>`;
  }
  function statusStrip(game){
    const self=game.self||{},opponent=game.opponent||{};
    const phaseLabel=game.liveStage==="reveal"?local("OLAYLAR OYNATILIYOR","PLAYING EVENTS"):local("KARAR SÜRESİ","DECISION TIME");
    const presence=opponent.connected?local("Rakip bağlı","Opponent connected"):local("Rakip yeniden bağlanıyor","Opponent reconnecting");
    return `<div class="arena-versus"><span><small>${esc(text("you"))}</small><b>${esc(self.clubName||"—")}</b><strong>${self.rating||"—"}</strong></span><i>VS</i><span><small>${esc(text("opponent"))}</small><b>${esc(opponent.clubName||"—")}</b><strong>${opponent.rating||"—"}</strong></span></div><div class="arena-phase-status ${opponent.connected?"is-connected":"is-reconnecting"}"><span>${esc(presence)}</span><b data-arena-deadline="${Number(game.deadline)||0}" data-arena-deadline-label="${esc(phaseLabel)}"></b></div>`;
  }
  function setup(game){
    const submitted=!!(game.self&&game.self.setup),chosen=game.self&&game.self.setup||{};
    return chrome(`${statusStrip(game)}<div class="arena-phase"><span>01 / 14</span><h1>${esc(text("setup"))}</h1><p>${esc(text("fairCopy"))}</p><div class="arena-fixed-chairman"><b>${esc(text("babacan"))}</b><small>${root.LANG==="tr"?"Tüm kulüpler eşit yönetim desteğiyle başlar.":"Every club starts with the same board support."}</small></div><label>${esc(text("formation"))}</label>${options("formations",["4-4-2","4-3-3","4-2-3-1","3-5-2"],chosen.formation,submitted)}<label>${esc(text("style"))}</label>${options("styles",["balanced","press","counter","control"],chosen.style,submitted)}<button class="arena-primary" data-arena-action="submit-setup" disabled>${esc(submitted?text("waiting"):text("choose"))}</button></div>`);
  }
  function draft(game){
    const offers=game.offers||[],picked=game.self&&game.self.draft||[],selected=picked[game.draftStep]||null,status=game.draftStatus||{};
    const slot=(offers[0]&&offers[0].slot)||(root.LANG==="tr"?"OYUNCU":"PLAYER"),count=Number(status.count!=null?status.count:picked.length),total=Number(status.total)||11;
    return chrome(`${statusStrip(game)}<div class="arena-phase arena-draft"><span>${String(game.draftStep+2).padStart(2,"0")} / 14 · ${esc(slot)}</span><h1>${esc(text("draft"))}</h1><p>${esc(local("İki kulüp aynı teklifleri görür; kadrolar bağımsızdır ve aynı oyuncu iki takımca seçilebilir.","Both clubs see mirrored offers; squads are independent and may select the same player."))}</p><div class="arena-draft-progress"><span>${esc(text("startingXI"))}<b>${count} / ${total}</b></span><div>${Array.from({length:total},(_,index)=>`<i class="${index<count?"is-filled":""}"></i>`).join("")}</div></div><div class="arena-team-pulse"><b>${esc(text("budget"))} <i>€${status.budget!=null?status.budget:48}M</i></b><b>${esc(text("power"))} <i>${status.power||"—"}</i></b></div><div class="arena-offers">${offers.map(item=>{
      const active=!!selected&&selected.id===item.id;
      const profileMeta=[item.country,item.position,item.age?`${item.age}${root.LANG==="tr"?" yaş":"y"}`:""].filter(Boolean).join(" · ");
      const fit=item.positionFit==="adapted"?local("UYARLANMIŞ MEVKİ","ADAPTED POSITION"):local("DOĞAL MEVKİ","NATURAL POSITION");
      return `<button class="${active?"is-selected":""}" data-arena-choice="draft:${esc(item.id)}" aria-pressed="${active}" ${selected?"disabled":""}><span>${esc(item.slot||item.line)}</span><strong>${item.power}</strong><b>${esc(item.name)}</b>${profileMeta?`<small class="arena-player-origin">${esc(profileMeta)}</small>`:""}<small class="arena-position-fit ${item.positionFit==="adapted"?"is-adapted":""}">${esc(fit)}</small>${item.club?`<small class="arena-player-club">${esc(item.club)}</small>`:""}<small class="arena-player-value">€${item.cost}M · ${item.chemistry>=0?"+":""}${item.chemistry} ${esc(text("chemistry"))}</small><i title="${esc(local("Bağlantı kimyayı, Güvenilir dengeyi, Yıldız gücü öne çıkarır.","Connector favors chemistry, Reliable balance, Star power."))}">${esc(choiceLabel("traits",item.trait))}<small>${esc(traitDescription(item.trait))}</small></i><em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>${selected?`<p class="arena-choice-confirmed">${esc(selected.name)} · ${esc(text("selected"))}</p>`:""}</div>`);
  }
  function market(game){
    const selected=game.self&&game.self.market&&game.self.market.id;
    const team=game.team||{};
    return chrome(`${statusStrip(game)}<div class="arena-phase"><span>13 / 14</span><h1>${esc(text("market"))}</h1><div class="arena-team-pulse"><b>${esc(text("budget"))} <i>€${team.budget==null?"—":team.budget}M</i></b><b>${esc(text("chemistry"))} <i>${team.chemistry==null?"—":team.chemistry}</i></b><b>${esc(text("power"))} <i>${team.power||"—"}</i></b></div><div class="arena-offers arena-market-offers">${(game.offers||[]).map(item=>{
      const active=item.id===selected;
      return `<button class="${active?"is-selected":""}" data-arena-choice="market:${esc(item.id)}" aria-pressed="${active}" ${selected?"disabled":""}><span>${esc(text(item.id==="none"?"pass":"marketCard"))}</span><strong>${item.cost?`€${item.cost}M`:"—"}</strong><b>${esc(choiceLabel("market",item.id))}</b><small>ATK ${item.attack>=0?"+":""}${item.attack} · DEF ${item.defense>=0?"+":""}${item.defense} · CHEM ${item.chemistry>=0?"+":""}${item.chemistry}</small><em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>${selected?`<p class="arena-choice-confirmed">${esc(choiceLabel("market",selected))} · ${esc(text("selected"))}</p>`:""}</div>`);
  }
  function training(game){
    const selected=game.self&&game.self.training||"";
    const team=game.team||{},draft=game.self&&game.self.draft||[];
    return chrome(`${statusStrip(game)}<div class="arena-phase"><span>14 / 14</span><h1>${esc(text("training"))}</h1><div class="arena-final-summary"><b>${esc(local("KADRO ÖZETİ","SQUAD SUMMARY"))}</b><span>${draft.length}/11</span><span>${esc(text("power"))} ${team.power||"—"}</span><span>${esc(text("chemistry"))} ${team.chemistry==null?"—":team.chemistry}</span><span>${esc(text("budget"))} €${team.budget==null?"—":team.budget}M</span></div>${options("training",["finishing","shape","chemistry","recovery"],selected,!!selected)}${selected?`<p class="arena-choice-confirmed">${esc(choiceLabel("training",selected))} · ${esc(text("selected"))}</p>`:""}</div>`);
  }
  function lobby(game){
    return chrome(`${statusStrip(game)}<div class="arena-ready"><div class="arena-ready-ring">${icon("shield")}<i></i></div><h1>${esc(game.self&&game.self.ready?text("waiting"):text("ready"))}</h1><p>${esc(text("serverCopy"))}</p><button class="arena-primary" data-arena-action="ready" ${game.self&&game.self.ready?"disabled":""}>${esc(text("ready"))}</button></div>`);
  }
  function live(game){
    const events=(game.events||[]).slice(-8).reverse(),score=game.score||[0,0],revealing=game.liveStage==="reveal";
    const report=game.windowResult||null,selfHome=game.selfIndex===0;
    const myTactic=report&&report.tactics&&report.tactics[selfHome?0:1],theirTactic=report&&report.tactics&&report.tactics[selfHome?1:0];
    const myGoals=report?(selfHome?report.homeGoals:report.awayGoals):0,theirGoals=report?(selfHome?report.awayGoals:report.homeGoals):0;
    const myXg=report?(selfHome?report.homeXg:report.awayXg):0,theirXg=report?(selfHome?report.awayXg:report.homeXg):0;
    const advantage=report&&(report.advantage==="neutral"?local("Eşleşme nötr kaldı.","The matchup was neutral."):((report.advantage==="home")===selfHome?local("Taktik eşleşme sende.","You won the tactical matchup."):local("Taktik eşleşme rakipte.","The opponent won the tactical matchup.")));
    return chrome(`${statusStrip(game)}<div class="arena-live">
      <div class="arena-match-clock"><b>${Number(game.matchMinute)||game.window*30}'</b><span>${revealing?local("OLAYLAR OYNATILIYOR","PLAYING EVENTS"):local("TAKTİK MOLASI","TACTICAL BREAK")}</span></div>
      <div class="arena-live-score"><span>${esc(game.self&&game.self.clubName||text("you"))}</span><b>${score[game.selfIndex]||0}<i>–</i>${score[game.selfIndex===0?1:0]||0}</b><span>${esc(game.opponent&&game.opponent.clubName||text("opponent"))}</span></div>
      <div class="arena-pitch-live" aria-label="${esc(local("Maç olay haritası; altın senin, turuncu rakibin.","Match event map; gold is you, orange is the opponent."))}"><i></i><i></i><b style="left:${Math.min(94,Math.max(6,Number(game.matchMinute)||game.window*30))}%"></b>${events.map(event=>`<span class="${event.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"}" style="left:${Math.min(94,Math.max(6,event.minute))}%">${event.type==="goal"?"●":"▪"}</span>`).join("")}<small class="arena-pitch-legend">${esc(local("ALTIN: SEN · TURUNCU: RAKİP","GOLD: YOU · ORANGE: OPPONENT"))}</small></div>
      <div class="arena-event-feed">${events.length?events.map(event=>`<span><b>${event.minute}'</b><i class="${event.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"}">${esc(text(event.type==="goal"?"goal":"cardEvent"))} · ${esc(event.side===(game.selfIndex===0?"home":"away")?text("you"):text("opponent"))}</i></span>`).join(""):`<span><b>0'</b><i>${esc(text("live"))}</i></span>`}</div>
      ${revealing&&report?`<div class="arena-window-report"><b>${esc(local(`${report.startMinute}'–${report.endMinute}' BÖLÜM RAPORU`,`${report.startMinute}'–${report.endMinute}' WINDOW REPORT`))}</b><div><span>${esc(choiceLabel("tactics",myTactic))}</span><i>VS</i><span>${esc(choiceLabel("tactics",theirTactic))}</span></div><p>${esc(advantage)} · xG ${myXg}–${theirXg} · ${esc(local("Gol","Goals"))} ${myGoals}–${theirGoals}</p></div>`:""}
      <div class="arena-tactic-window"><span>${game.window+1} / 3</span><h2>${esc(revealing?local("BÖLÜM SONUCU","WINDOW RESULT"):text("tacticDecision"))}</h2>${revealing?"":options("tactics",["press","balanced","counter","control"],game.self&&game.self.tactics&&game.self.tactics[game.window]||"",!!(game.self&&game.self.tactics&&game.self.tactics.length>game.window))}${!revealing&&game.self&&game.self.tactics&&game.self.tactics.length>game.window?`<p>${esc(choiceLabel("tactics",game.self.tactics[game.window]))} · ${esc(text("selected"))} · ${esc(text("waiting"))}</p>`:""}</div>
    </div>`);
  }
  function result(game){
    const outcome=game.result&&game.result.outcomes&&game.result.outcomes[game.selfIndex]||"draw",score=game.result&&game.result.score||game.score||[0,0],mine=score[game.selfIndex],theirs=score[game.selfIndex===0?1:0],penalty=game.result&&game.result.penalty;
    const reward=game.result&&game.result.rewards&&game.result.rewards[game.selfIndex]||{},profile=game.result&&game.result.profiles&&game.result.profiles[game.selfIndex]||null;
    const teams=game.result&&game.result.teams||[],myTeam=teams[game.selfIndex]||game.team||{},theirTeam=teams[game.selfIndex===0?1:0]||game.opponentTeam||{};
    const ratingAfter=profile&&profile.rating!=null?profile.rating:Number(reward.ratingBefore||game.self&&game.self.rating||1000)+Number(reward.ratingDelta||0);
    const decisions=(game.self&&game.self.tactics||[]).map((choice,index)=>`${index*30}' ${choiceLabel("tactics",choice)} / ${choiceLabel("tactics",game.opponent&&game.opponent.tactics&&game.opponent.tactics[index]||"balanced")}`);
    const eventRecap=(game.events||[]).filter(item=>item.type==="goal"||item.type==="card").slice(-8);
    const resultLabel=game.result&&game.result.voided?"voided":game.result&&game.result.forfeitIndex!==null&&game.result.forfeitIndex!==undefined?(game.result.forfeitIndex===game.selfIndex?"forfeitLoss":"forfeitWin"):outcome;
    const resultSoundKey=`${game.matchId||"match"}:${mine}:${theirs}:${outcome}`;
    if(outcome==="win"&&state.lastResultSound!==resultSoundKey){state.lastResultSound=resultSoundKey;sfx("win");}
    return chrome(`<div class="arena-result ${outcome}"><span>${esc(text(resultLabel))}</span><h1>${mine} <i>–</i> ${theirs}</h1>${penalty?`<p>PEN ${penalty[game.selfIndex]}–${penalty[game.selfIndex===0?1:0]}</p>`:""}${game.result&&game.result.voided?`<p>${esc(text("voidedCopy"))}</p>`:""}<div class="arena-result-clubs"><b>${esc(game.self&&game.self.clubName)}</b><i>VS</i><b>${esc(game.opponent&&game.opponent.clubName)}</b></div><div class="arena-result-rewards"><span><small>${esc(text("rating"))}</small><b>${Number(reward.ratingBefore||game.self&&game.self.rating||1000)} → ${ratingAfter}</b><em>${Number(reward.ratingDelta||0)>=0?"+":""}${Number(reward.ratingDelta||0)}</em></span><span><small>${esc(text("season"))}</small><b>+${Number(reward.seasonPoints||0)} P</b></span><span><small>${esc(text("power"))}</small><b>${myTeam.power||"—"} – ${theirTeam.power||"—"}</b></span><span><small>${esc(text("chemistry"))}</small><b>${myTeam.chemistry==null?"—":myTeam.chemistry} – ${theirTeam.chemistry==null?"—":theirTeam.chemistry}</b></span></div>${eventRecap.length?`<div class="arena-result-events"><b>${esc(local("MAÇ OLAYLARI","MATCH EVENTS"))}</b>${eventRecap.map(item=>`<span><strong>${Number(item.minute)}'</strong><i class="${item.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"}">${esc(text(item.type==="goal"?"goal":"cardEvent"))} · ${esc(item.side===(game.selfIndex===0?"home":"away")?text("you"):text("opponent"))}</i></span>`).join("")}</div>`:""}${decisions.length?`<div class="arena-result-decisions"><b>${esc(local("TAKTİK ÖZETİ","TACTICAL SUMMARY"))}</b>${decisions.map(item=>`<span>${esc(item)}</span>`).join("")}</div>`:""}<div class="arena-result-actions"><button class="arena-primary" data-arena-action="queue">${esc(text("searchAgain"))}</button><button class="arena-quiet" data-arena-action="portal">${esc(text("home"))}</button></div></div>`);
  }
  function room(){
    const game=state.room;if(!game)return errorView("invalid_room");
    if(game.phase==="lobby")return lobby(game);
    if(game.phase==="setup")return setup(game);
    if(game.phase==="draft")return draft(game);
    if(game.phase==="market")return market(game);
    if(game.phase==="training")return training(game);
    if(game.phase==="live")return live(game);
    if(game.phase==="result")return result(game);
    return loading();
  }
  function listView(kind){
    const leaderboard=kind==="leaderboard",items=leaderboard?state.leaderboard:state.history;
    return chrome(`<div class="arena-list"><span class="arena-kicker">${esc(text(kind))}</span><h1>${esc(text(kind))}</h1><div>${items.length?items.map((item,index)=>leaderboard?`<article><strong>${item.rank||index+1}</strong><span><b>${esc(item.clubName)}</b><small>${esc(divisionLabel(item.division))}</small></span><em>${item.rating}</em></article>`:`<article class="${esc(item.outcome)}"><strong>${item.score[0]}–${item.score[1]}</strong><span><b>${esc(text(item.outcome))}</b><small>${new Date(item.createdAt).toLocaleDateString()}</small></span><em>${item.ratingDelta>=0?"+":""}${item.ratingDelta}</em></article>`).join(""):`<p>${esc(text("empty"))}</p>`}</div><button class="arena-quiet" data-arena-action="portal">← ${esc(text("home"))}</button></div>`);
  }
  function loading(label){return chrome(`<div class="arena-loading"><div>${icon("arena")}<i></i></div><b>${esc(label||text("loading"))}</b></div>`);}
  function errorView(code){return chrome(`<div class="arena-error">${icon("shield")}<span>BAĞLANTI</span><h1>${esc(text("network"))}</h1><p>${esc(code||state.lastError)}</p><button class="arena-primary" data-arena-action="retry">${esc(text("retry"))}</button><button class="arena-quiet" data-arena-action="close">${esc(text("back"))}</button></div>`);}
  function render(){
    const element=rootEl();
    let html=loading();
    if(state.screen==="terms")html=terms();
    else if(state.screen==="portal")html=portal();
    else if(state.screen==="queue")html=queue();
    else if(state.screen==="room")html=room();
    else if(state.screen==="leaderboard"||state.screen==="history")html=listView(state.screen);
    else if(state.screen==="error")html=errorView(state.lastError);
    element.innerHTML=html;
    const elapsed=element.querySelector("[data-arena-elapsed]");
    if(elapsed)updateElapsed();
    updateDeadline();
  }
  function open(){
    root.closeModal&&root.closeModal();
    document.body.classList.add("arena-active");rootEl().classList.remove("hidden");
    const intro=document.getElementById("intro");if(intro)intro.classList.add("hidden");
    sfx("open");telemetry("arena_opened");
    if(get(TERMS_KEY)!==TERMS_VERSION){setScreen("terms");return;}
    if(resume())return;
    loadPortal();
  }
  function close(){
    disconnect(false);document.body.classList.remove("arena-active");rootEl().classList.add("hidden");
    const intro=document.getElementById("intro");if(intro)intro.classList.remove("hidden");
    state.screen="closed";
  }
  async function loadPortal(){
    setScreen("loading");
    try{
      const [profileData,historyData]=await Promise.all([request("/v1/arena/profile"),request("/v1/arena/history")]);
      state.profile=profileData.profile;state.history=historyData.matches||[];setScreen("portal");
    }catch(error){state.lastError=error.message;setScreen("error");sfx("error");}
  }
  async function startQueue(){
    if(!navigator.onLine){state.lastError="offline";setScreen("error");return;}
    disconnect(false);setScreen("loading");
    try{
      const data=await request("/v1/arena/session",{method:"POST",body:JSON.stringify({clubName:clubName(),mode:"ranked",region:"weur"})});
      state.profile=data.profile;state.queueStarted=Date.now();setScreen("queue");telemetry("arena_queue_joined","weur",data.profile.rating);sfx("queue");
      connectQueue(data.ticket);
    }catch(error){state.lastError=error.message;setScreen("error");sfx("error");}
  }
  function connectQueue(ticket){
    const socket=new WebSocket(`${wsBase()}/v1/arena/connect?ticket=${encodeURIComponent(ticket)}`);state.socket=socket;
    socket.addEventListener("message",event=>{
      let data;try{data=JSON.parse(event.data);}catch(_){return;}
      if(data.type==="matched"){
        sfx("match");telemetry("arena_matched","ranked",Math.round((Date.now()-state.queueStarted)/1000));
        const saved={matchId:data.matchId,token:data.roomToken};set(ROOM_KEY,JSON.stringify(saved));socket.close(1000,"matched");connectRoom(saved);
      }
      if(data.type==="error"){state.lastError=data.code||"queue_error";setScreen("error");}
    });
    socket.addEventListener("close",event=>{if(state.screen==="queue"&&event.code!==1000){state.lastError="queue_disconnected";setScreen("error");}});
    socket.addEventListener("error",()=>{if(state.screen==="queue"){state.lastError="queue_connection";setScreen("error");}});
  }
  function connectRoom(saved){
    state.screen="room";state.room=null;render();
    const socket=new WebSocket(`${wsBase()}/v1/arena/rooms/${encodeURIComponent(saved.matchId)}/connect?token=${encodeURIComponent(saved.token)}`);state.socket=socket;
    socket.addEventListener("open",()=>{state.retries=0;startHeartbeat(socket);if(state.room)socket.send(JSON.stringify({type:"sync"}));});
    socket.addEventListener("message",event=>{
      let data;try{data=JSON.parse(event.data);}catch(_){return;}
      if(data.type==="state"){
        const previous=state.room,previousGoals=previous&&previous.events?previous.events.filter(item=>item.type==="goal").length:0;
        state.room=data.state;state.screen="room";render();
        const goals=(data.state.events||[]).filter(item=>item.type==="goal").length;if(goals>previousGoals)sfx("goal");
        if(previous&&previous.phase!==data.state.phase)telemetry("arena_phase_completed",previous.phase);
        if(data.state.phase==="result"){
          const settled=data.state.result&&data.state.result.profiles&&data.state.result.profiles[data.state.selfIndex];
          if(settled)state.profile=settled;
          remove(ROOM_KEY);telemetry("arena_match_completed",data.state.result.voided?"void":data.state.result.outcomes[data.state.selfIndex]);
        }
      }
      if(data.type==="ack"&&data.status&&data.status!=="ok"){
        render();
        if(data.status!=="already_submitted")sfx("error");
      }
    });
    socket.addEventListener("close",event=>{
      if(state.socket===socket){clearInterval(state.heartbeat);state.heartbeat=null;}
      if(state.screen!=="room"||state.room&&state.room.phase==="result"||event.code===1000)return;
      if(state.retries>=5){state.lastError="room_reconnect_failed";setScreen("error");return;}
      state.retries++;setTimeout(()=>{telemetry("arena_reconnected","retry",state.retries);connectRoom(saved);},Math.min(8000,700*Math.pow(2,state.retries)));
    });
    socket.addEventListener("error",()=>{});
  }
  function disconnect(cancel=true){
    clearInterval(state.timer);state.timer=null;
    clearInterval(state.heartbeat);state.heartbeat=null;
    clearInterval(state.deadlineTimer);state.deadlineTimer=null;
    if(state.socket){if(cancel&&state.screen==="queue"&&state.socket.readyState===1)state.socket.send(JSON.stringify({type:"cancel"}));try{state.socket.close(1000,"client");}catch(_){}state.socket=null;}
  }
  function send(payload){
    if(!state.socket||state.socket.readyState!==1){state.lastError="socket_not_ready";sfx("error");return false;}
    state.socket.send(JSON.stringify({...payload,actionId:actionId()}));sfx("pick");return true;
  }
  function updateElapsed(){
    clearInterval(state.timer);
    const paint=()=>{const element=document.querySelector("[data-arena-elapsed]");if(!element)return;const seconds=Math.floor((Date.now()-state.queueStarted)/1000);element.textContent=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;};
    paint();state.timer=setInterval(paint,1000);
  }
  function startHeartbeat(socket){
    clearInterval(state.heartbeat);
    state.heartbeat=setInterval(()=>{
      if(state.screen==="room"&&state.socket===socket&&socket.readyState===1)socket.send(JSON.stringify({type:"sync"}));
    },4000);
  }
  function updateDeadline(){
    clearInterval(state.deadlineTimer);state.deadlineTimer=null;
    const element=document.querySelector("[data-arena-deadline]");if(!element)return;
    const deadline=Number(element.dataset.arenaDeadline)||0;
    const label=element.dataset.arenaDeadlineLabel||text("waiting");
    const paint=()=>{
      const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      element.textContent=`${label} · ${seconds}s`;
      if(seconds===0&&state.socket&&state.socket.readyState===1)state.socket.send(JSON.stringify({type:"sync"}));
    };
    paint();state.deadlineTimer=setInterval(paint,1000);
  }
  async function showLeaderboard(){
    setScreen("loading");try{state.leaderboard=(await request("/v1/arena/leaderboard?limit=25")).entries||[];setScreen("leaderboard");}catch(error){state.lastError=error.message;setScreen("error");}
  }
  function onChange(event){
    if(event.target.matches("[data-arena-club]"))set(CLUB_KEY,event.target.value.trim());
  }
  function selectChoice(button){
    if(button.disabled)return;
    const [kind,value]=button.dataset.arenaChoice.split(":");
    if(["draft","market","training","tactics"].includes(kind)){
      const group=button.parentElement;
      if(group)group.querySelectorAll("button").forEach(item=>{
        item.disabled=true;item.classList.toggle("is-selected",item===button);item.setAttribute("aria-pressed",String(item===button));
      });
      const type=kind==="tactics"?"tactic":kind;
      if(!send({type,choice:value})&&group)group.querySelectorAll("button").forEach(item=>{item.disabled=false;item.classList.remove("is-selected");item.setAttribute("aria-pressed","false");});
      return;
    }
    const group=button.closest(".arena-choice-grid");group.querySelectorAll("button").forEach(item=>item.classList.toggle("is-selected",item===button));
    group.querySelectorAll("button").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
    const phase=button.closest(".arena-phase");if(phase)phase.dataset[kind]=value;
    const submit=phase&&phase.querySelector('[data-arena-action="submit-setup"]');
    if(submit)submit.disabled=!(phase.dataset.formations&&phase.dataset.styles);
  }
  function onClick(event){
    const choice=event.target.closest("[data-arena-choice]");if(choice){selectChoice(choice);return;}
    const button=event.target.closest("[data-arena-action]");if(!button)return;
    const action=button.dataset.arenaAction;
    if(action==="close"){
      if(state.screen==="room"&&state.room&&state.room.phase!=="result"&&!root.confirm(local("Devam eden Arena maçından ayrılmak istediğine emin misin? Süre dolunca otomatik karar verilir.","Leave the active Arena match? Automatic choices will be made when timers expire.")))return;
      close();return;
    }
    if(action==="accept"){
      const input=rootEl().querySelector("[data-arena-club]"),name=input&&input.value.trim();
      if(!name||name.length<2){input&&input.focus();return;}
      set(CLUB_KEY,name);set(TERMS_KEY,TERMS_VERSION);loadPortal();return;
    }
    if(action==="queue"){startQueue();return;}
    if(action==="cancel"){disconnect(true);loadPortal();return;}
    if(action==="ready"){send({type:"ready"});return;}
    if(action==="submit-setup"){
      const phase=button.closest(".arena-phase");button.disabled=true;button.textContent=text("waiting");send({type:"setup",choice:{formation:phase.dataset.formations,style:phase.dataset.styles}});return;
    }
    if(action==="portal"){disconnect(false);loadPortal();return;}
    if(action==="history"){setScreen("history");return;}
    if(action==="leaderboard"){showLeaderboard();return;}
    if(action==="delete-data"){
      if(!root.confirm(text("deleteConfirm")))return;
      request("/v1/arena/profile",{method:"DELETE"}).then(()=>{
        remove(TOKEN_KEY);remove(TERMS_KEY);remove(ROOM_KEY);state.profile=null;state.history=[];setScreen("terms");
      }).catch(error=>{state.lastError=error.message;setScreen("error");});
      return;
    }
    if(action==="retry"){const saved=get(ROOM_KEY);if(saved){try{connectRoom(JSON.parse(saved));return;}catch(_){remove(ROOM_KEY);}}loadPortal();}
  }
  function refresh(){if(state.screen!=="closed")render();}
  function resume(){
    const saved=get(ROOM_KEY);if(!saved)return false;
    try{document.body.classList.add("arena-active");rootEl().classList.remove("hidden");const intro=document.getElementById("intro");if(intro)intro.classList.add("hidden");connectRoom(JSON.parse(saved));return true;}catch(_){remove(ROOM_KEY);return false;}
  }
  root.CopaArena={open,close,refresh,resume,state};
})(window);
