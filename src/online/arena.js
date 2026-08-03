(function(root){
  "use strict";
  const TOKEN_KEY="copa_arena_token_v1";
  const TERMS_KEY="copa_arena_terms_v1";
  const CLUB_KEY="copa_arena_club_v1";
  const ROOM_KEY="copa_arena_room_v1";
  const CUSTOM_ROOM_KEY="copa_arena_custom_room_v1";
  const GOOGLE_USER_KEY="copa_arena_google_user_v1";
  const API_META="meta[name='copa-arena-api']";
  const TERMS_VERSION="arena-terms-v1";
  function ensureArenaStyles(){
    if(document.querySelector('link[data-copa-arena-styles]'))return;
    const link=document.createElement("link");link.rel="stylesheet";link.href="src/styles/arena.css?v=20260803-custom-rooms";link.dataset.copaArenaStyles="true";document.head.appendChild(link);
  }
  ensureArenaStyles();
  const REWARDS=[
    {at:5,id:"arena_badge_rookie",tr:"Çaylak Rozeti",en:"Rookie Badge"},
    {at:12,id:"arena_frame_floodlights",tr:"Projektör Çerçevesi",en:"Floodlights Frame"},
    {at:20,id:"arena_kit_nocturne",tr:"Gece Forması",en:"Nocturne Kit"},
    {at:35,id:"arena_title_unbroken",tr:"Yıkılmayan Ünvanı",en:"Unbroken Title"}
  ];
  const COPY={
    tr:{
      arena:"COPA ARENA",multiplayer:"ÇOK OYUNCULU",subtitle:"Canlı rakiplere karşı kulübünü kur, kararını ver, yüksel.",
      ranked:"DERECELİ YOLCULUK",play:"EŞLEŞME BUL",back:"COPA LIFE'A DÖN",loading:"ARENA YÜKLENİYOR",
      candidate:"ADAY",bronze:"BRONZ",silver:"GÜMÜŞ",gold:"ALTIN",diamond:"ELMAS",legend:"EFSANE",
      rating:"RATING",season:"SEZON YOLU",record:"KARİYER",history:"SON MAÇLAR",leaderboard:"SIRALAMA",
      queue:"RAKİP ARANIYOR",queueCopy:"Benzer seviyede uygun bir kulüp aranıyor.",cancel:"ARAMAYI İPTAL ET",
      ready:"HAZIRIM",waiting:"RAKİP BEKLENİYOR",setup:"KULÜP KİMLİĞİ",draft:"KADRO KUR",market:"SON DOKUNUŞ",
      training:"MAÇ PLANI",live:"CANLI MAÇ",result:"MAÇ SONU",formation:"DİZİLİŞ",style:"OYUN ANLAYIŞI",
      chairman:"BAŞKAN",budget:"KALAN KASA",chemistry:"KİMYA",power:"GÜÇ",choose:"SEÇ",
      reconnecting:"BAĞLANTI YENİDEN KURULUYOR",retry:"TEKRAR DENE",home:"ARENA MERKEZİ",
      win:"GALİBİYET",loss:"MAĞLUBİYET",draw:"BERABERLİK",forfeitWin:"HÜKMEN GALİBİYET",forfeitLoss:"HÜKMEN MAĞLUBİYET",voided:"HÜKÜMSÜZ MAÇ",voidedCopy:"İki taraf da yeterli sayıda karar vermediği için sıralama ve sezon ilerlemesi değişmedi.",searchAgain:"YENİ EŞLEŞME",
      consentTitle:"ARENA'YA GİR",consent:"Copa Arena canlı ve dereceli bir moddur. Kulüp adın, skorun ve rating'in herkese açık sıralamada görünür. Kişisel bilgi ve serbest sohbet yoktur.",
      accept:"KABUL ET VE GİR",club:"ARENA KULÜP ADI",network:"Arena servisine ulaşılamadı.",empty:"Henüz tamamlanmış maç yok.",
      authentic:"HIZLI EŞLEŞME",noBots:"Saniyeler içinde seviyene uygun bir rakip bul.",fair:"AYNI ŞARTLAR",fairCopy:"İki kulüp de aynı süre ve fırsatlarla yarışır.",
      server:"GÜVENLİ SONUÇ",serverCopy:"Skor ve kararlar güvenle doğrulanır.",
      deleteData:"ARENA VERİLERİMİ SİL",deleteConfirm:"Arena kulübün, derecen ve maç geçmişin kalıcı olarak silinecek. Devam edilsin mi?",
      you:"SEN",opponent:"RAKİP",goal:"GOL",cardEvent:"KART",tacticDecision:"TAKTİK KARARI",pass:"PAS",marketCard:"KART",
      selected:"SEÇİLDİ",startingXI:"İLK 11",babacan:"BABACAN BAŞKAN",practice:"YAPAY ZEKÂ ANTRENMANI",practiceCopy:"Ödülsüz, derecesiz ve sunucu otoriteli prova maçı.",practiceAgain:"YENİ ANTRENMAN",networkGood:"İYİ",networkFair:"ORTA",networkPoor:"ZAYIF",
      googleTitle:"ARENA HESABIN",googleCopy:"Dereceni ve maç geçmişini tüm cihazlarında koru.",googleContinue:"GOOGLE İLE DEVAM ET",googleReady:"GOOGLE HESABI BAĞLANDI",googleConfig:"Google girişi henüz yapılandırılmadı.",
      or:"VEYA",guestContinue:"MİSAFİR OLARAK DEVAM ET",guestFast:"KAYIT OLMADAN HEMEN GİR",guestNote:"Misafir ilerlemesi yalnızca bu cihazda korunur.",guestName:"Misafir",
      rematch:"RÖVANŞ İSTE",rematchSent:"RÖVANŞ İSTEĞİ GÖNDERİLDİ",rematchIncoming:"RAKİBİN RÖVANŞ İSTİYOR",rematchStarting:"RÖVANŞ BAŞLIYOR",
      leave:"TERK ET",leaveTitle:"MAÇI TERK ET",leaveCopy:"Onaylarsan maç hemen biter ve 0–3 hükmen mağlup sayılırsın.",leaveCheck:"0–3 hükmen mağlubiyeti kabul ediyorum.",leaveConfirm:"TERK ET VE MAÇI BİTİR",leaveCancel:"VAZGEÇ",
      inactivityOne:"Bir kararın otomatik verildi. Üst üste 3 otomatik kararda hükmen mağlup olursun.",inactivityTwo:"SON UYARI: Bir kararı daha kaçırırsan 0–3 hükmen mağlup olacaksın."
    },
    en:{
      arena:"COPA ARENA",multiplayer:"MULTIPLAYER",subtitle:"Build your club live, make the call, climb the table.",
      ranked:"RANKED JOURNEY",play:"FIND A MATCH",back:"BACK TO COPA LIFE",loading:"LOADING ARENA",
      candidate:"CANDIDATE",bronze:"BRONZE",silver:"SILVER",gold:"GOLD",diamond:"DIAMOND",legend:"LEGEND",
      rating:"RATING",season:"SEASON TRACK",record:"CAREER",history:"RECENT MATCHES",leaderboard:"LEADERBOARD",
      queue:"FINDING OPPONENT",queueCopy:"Looking for a suitable club near your level.",cancel:"CANCEL SEARCH",
      ready:"I'M READY",waiting:"WAITING FOR OPPONENT",setup:"CLUB IDENTITY",draft:"BUILD YOUR XI",market:"FINAL TOUCH",
      training:"MATCH PLAN",live:"LIVE MATCH",result:"FULL TIME",formation:"FORMATION",style:"PLAY STYLE",
      chairman:"CHAIRMAN",budget:"CASH LEFT",chemistry:"CHEMISTRY",power:"POWER",choose:"CHOOSE",
      reconnecting:"RECONNECTING",retry:"TRY AGAIN",home:"ARENA HUB",
      win:"VICTORY",loss:"DEFEAT",draw:"DRAW",forfeitWin:"FORFEIT VICTORY",forfeitLoss:"FORFEIT DEFEAT",voided:"VOID MATCH",voidedCopy:"Neither side made enough decisions, so rating and season progress were unchanged.",searchAgain:"NEW MATCH",
      consentTitle:"ENTER THE ARENA",consent:"Copa Arena is live and ranked. Your club name, scores and rating appear on the public table. There is no personal data or free chat.",
      accept:"ACCEPT AND ENTER",club:"ARENA CLUB NAME",network:"Arena service is unavailable.",empty:"No completed matches yet.",
      authentic:"FAST MATCHMAKING",noBots:"Find a well-matched opponent in seconds.",fair:"LEVEL TERMS",fairCopy:"Both clubs compete with the same time and opportunities.",
      server:"VERIFIED RESULT",serverCopy:"Scores and decisions are securely verified.",
      deleteData:"DELETE MY ARENA DATA",deleteConfirm:"Your Arena club, rating and match history will be permanently deleted. Continue?",
      you:"YOU",opponent:"OPPONENT",goal:"GOAL",cardEvent:"CARD",tacticDecision:"TACTIC DECISION",pass:"PASS",marketCard:"CARD",
      selected:"SELECTED",startingXI:"STARTING XI",babacan:"BABACAN CHAIRMAN",practice:"AI PRACTICE",practiceCopy:"Rewardless, unranked and server-authoritative rehearsal.",practiceAgain:"NEW PRACTICE",networkGood:"GOOD",networkFair:"FAIR",networkPoor:"POOR",
      googleTitle:"YOUR ARENA ACCOUNT",googleCopy:"Keep your rating and match history on every device.",googleContinue:"CONTINUE WITH GOOGLE",googleReady:"GOOGLE ACCOUNT CONNECTED",googleConfig:"Google sign-in is not configured yet.",
      or:"OR",guestContinue:"CONTINUE AS GUEST",guestFast:"ENTER WITHOUT SIGNING UP",guestNote:"Guest progress is kept only on this device.",guestName:"Guest",
      rematch:"REQUEST REMATCH",rematchSent:"REMATCH REQUEST SENT",rematchIncoming:"OPPONENT WANTS A REMATCH",rematchStarting:"REMATCH STARTING",
      leave:"LEAVE",leaveTitle:"LEAVE MATCH",leaveCopy:"Confirming ends the match immediately as a 0–3 forfeit defeat.",leaveCheck:"I accept the 0–3 forfeit defeat.",leaveConfirm:"LEAVE AND END MATCH",leaveCancel:"CANCEL",
      inactivityOne:"One choice was automated. Three consecutive missed choices cause a forfeit.",inactivityTwo:"FINAL WARNING: Miss one more choice and you will lose 0–3 by forfeit."
    }
  };
  COPY.es={...COPY.en,subtitle:"Construye tu club en directo, decide y sube en la tabla.",ranked:"CAMINO CLASIFICATORIO",play:"BUSCAR PARTIDA",back:"VOLVER A COPA LIFE",loading:"CARGANDO ARENA",rating:"PUNTUACIÓN",season:"RUTA DE TEMPORADA",record:"CARRERA",history:"ÚLTIMOS PARTIDOS",leaderboard:"CLASIFICACIÓN",queue:"BUSCANDO RIVAL",queueCopy:"Buscando un club adecuado de nivel similar.",cancel:"CANCELAR BÚSQUEDA",ready:"ESTOY LISTO",waiting:"ESPERANDO AL RIVAL",setup:"IDENTIDAD DEL CLUB",draft:"CREA TU ONCE",market:"TOQUE FINAL",training:"PLAN DE PARTIDO",live:"PARTIDO EN VIVO",result:"FINAL",formation:"FORMACIÓN",style:"ESTILO DE JUEGO",chairman:"PRESIDENTE",budget:"CAJA RESTANTE",chemistry:"QUÍMICA",power:"FUERZA",choose:"ELEGIR",reconnecting:"RECONECTANDO",retry:"REINTENTAR",home:"CENTRO ARENA",win:"VICTORIA",loss:"DERROTA",draw:"EMPATE",searchAgain:"NUEVO PARTIDO",consentTitle:"ENTRAR EN LA ARENA",consent:"Copa Arena es un modo en vivo y clasificatorio. El nombre del club, los resultados y la puntuación aparecen en la tabla pública. No hay datos personales ni chat libre.",accept:"ACEPTAR Y ENTRAR",club:"NOMBRE DEL CLUB ARENA",network:"No se puede acceder al servicio Arena.",empty:"Aún no hay partidos completados.",authentic:"EMPAREJAMIENTO RÁPIDO",noBots:"Si hace falta, un club gestionado por el sistema mantiene activa la cola.",fair:"OFERTAS EQUIVALENTES",fairCopy:"Decide mejor, no más rápido.",server:"SERVIDOR AUTORITATIVO",serverCopy:"El resultado se genera una vez y no puede repetirse.",deleteData:"BORRAR MIS DATOS DE ARENA",deleteConfirm:"Tu club Arena, puntuación e historial se borrarán de forma permanente. ¿Continuar?",you:"TÚ",opponent:"RIVAL",goal:"GOL",cardEvent:"TARJETA",tacticDecision:"DECISIÓN TÁCTICA",pass:"PASAR",marketCard:"CARTA"};
  COPY.de={...COPY.en,subtitle:"Baue deinen Club live auf, entscheide und steige auf.",ranked:"RANGLISTENREISE",play:"MATCH FINDEN",back:"ZURÜCK ZU COPA LIFE",loading:"ARENA LÄDT",rating:"WERTUNG",season:"SAISONPFAD",record:"KARRIERE",history:"LETZTE SPIELE",leaderboard:"RANGLISTE",queue:"GEGNER WIRD GESUCHT",queueCopy:"Ein passender Club mit ähnlicher Wertung wird gesucht.",cancel:"SUCHE ABBRECHEN",ready:"BEREIT",waiting:"WARTE AUF GEGNER",setup:"CLUBIDENTITÄT",draft:"BAUE DEINE ELF",market:"LETZTER SCHLIFF",training:"SPIELPLAN",live:"LIVE-SPIEL",result:"ABPFIFF",formation:"FORMATION",style:"SPIELSTIL",chairman:"PRÄSIDENT",budget:"RESTBUDGET",chemistry:"CHEMIE",power:"STÄRKE",choose:"WÄHLEN",reconnecting:"VERBINDUNG WIRD WIEDERHERGESTELLT",retry:"ERNEUT VERSUCHEN",home:"ARENA-ZENTRALE",win:"SIEG",loss:"NIEDERLAGE",draw:"UNENTSCHIEDEN",searchAgain:"NEUES MATCH",consentTitle:"ARENA BETRETEN",consent:"Copa Arena ist live und gewertet. Clubname, Ergebnisse und Wertung erscheinen öffentlich. Es gibt keine persönlichen Daten und keinen freien Chat.",accept:"AKZEPTIEREN UND STARTEN",club:"ARENA-CLUBNAME",network:"Arena-Dienst ist nicht erreichbar.",empty:"Noch keine abgeschlossenen Spiele.",authentic:"SCHNELLES MATCHMAKING",noBots:"Bei Bedarf hält ein systemverwalteter Club die Warteschlange in Bewegung.",fair:"GLEICHWERTIGE ANGEBOTE",fairCopy:"Entscheidungsqualität zählt, nicht Tempo.",server:"SERVER-AUTORITATIV",serverCopy:"Das Ergebnis wird einmal erzeugt und kann nicht neu gewürfelt werden.",deleteData:"MEINE ARENA-DATEN LÖSCHEN",deleteConfirm:"Arena-Club, Wertung und Verlauf werden dauerhaft gelöscht. Fortfahren?",you:"DU",opponent:"GEGNER",goal:"TOR",cardEvent:"KARTE",tacticDecision:"TAKTISCHE ENTSCHEIDUNG",pass:"AUSLASSEN",marketCard:"KARTE"};
  COPY.it={...COPY.en,subtitle:"Costruisci il club dal vivo, scegli e scala la classifica.",ranked:"VIAGGIO CLASSIFICATO",play:"TROVA PARTITA",back:"TORNA A COPA LIFE",loading:"CARICAMENTO ARENA",rating:"PUNTEGGIO",season:"PERCORSO STAGIONE",record:"CARRIERA",history:"ULTIME PARTITE",leaderboard:"CLASSIFICA",queue:"RICERCA AVVERSARIO",queueCopy:"Cerchiamo un club adatto di livello simile.",cancel:"ANNULLA RICERCA",ready:"SONO PRONTO",waiting:"IN ATTESA DELL'AVVERSARIO",setup:"IDENTITÀ DEL CLUB",draft:"CREA L'UNDICI",market:"TOCCO FINALE",training:"PIANO PARTITA",live:"PARTITA LIVE",result:"FINE PARTITA",formation:"MODULO",style:"STILE DI GIOCO",chairman:"PRESIDENTE",budget:"CASSA RESTANTE",chemistry:"INTESA",power:"FORZA",choose:"SCEGLI",reconnecting:"RICONNESSIONE",retry:"RIPROVA",home:"CENTRO ARENA",win:"VITTORIA",loss:"SCONFITTA",draw:"PAREGGIO",searchAgain:"NUOVA PARTITA",consentTitle:"ENTRA NELL'ARENA",consent:"Copa Arena è una modalità live e classificata. Nome del club, risultati e punteggio compaiono nella classifica pubblica. Non ci sono dati personali né chat libera.",accept:"ACCETTA ED ENTRA",club:"NOME CLUB ARENA",network:"Servizio Arena non disponibile.",empty:"Nessuna partita completata.",authentic:"MATCHMAKING RAPIDO",noBots:"Se serve, un club gestito dal sistema mantiene attiva la coda.",fair:"OFFERTE EQUIVALENTI",fairCopy:"Conta la qualità delle scelte, non la velocità.",server:"SERVER AUTORITATIVO",serverCopy:"Il risultato viene generato una volta e non può essere rilanciato.",deleteData:"ELIMINA I MIEI DATI ARENA",deleteConfirm:"Club Arena, punteggio e cronologia verranno eliminati definitivamente. Continuare?",you:"TU",opponent:"AVVERSARIO",goal:"GOL",cardEvent:"CARTELLINO",tacticDecision:"DECISIONE TATTICA",pass:"PASSA",marketCard:"CARTA"};
  Object.assign(COPY.es,{multiplayer:"MULTIJUGADOR",queueCopy:"Buscando un club adecuado de nivel similar.",authentic:"EMPAREJAMIENTO RÁPIDO",noBots:"Encuentra un rival de nivel similar en segundos.",fair:"MISMAS CONDICIONES",fairCopy:"Ambos clubes compiten con el mismo tiempo y oportunidades.",server:"RESULTADO VERIFICADO",serverCopy:"El marcador y las decisiones se verifican de forma segura.",forfeitWin:"VICTORIA POR ABANDONO",forfeitLoss:"DERROTA POR ABANDONO",voided:"PARTIDO ANULADO",voidedCopy:"Ningún equipo tomó suficientes decisiones. La puntuación y el progreso de temporada no cambiaron.",rematch:"PEDIR REVANCHA",rematchSent:"SOLICITUD DE REVANCHA ENVIADA",rematchIncoming:"EL RIVAL QUIERE LA REVANCHA",rematchStarting:"COMIENZA LA REVANCHA",leave:"ABANDONAR",leaveTitle:"ABANDONAR PARTIDO",leaveCopy:"El partido terminará de inmediato con una derrota por 0–3.",leaveCheck:"Acepto la derrota por 0–3.",leaveConfirm:"ABANDONAR Y TERMINAR",leaveCancel:"CANCELAR",inactivityOne:"Se automatizó una decisión. Tres omisiones seguidas causan derrota.",inactivityTwo:"ÚLTIMO AVISO: Otra omisión causará una derrota por 0–3."});
  Object.assign(COPY.de,{multiplayer:"MEHRSPIELER",queueCopy:"Ein passender Club mit ähnlicher Wertung wird gesucht.",authentic:"SCHNELLES MATCHMAKING",noBots:"Finde in Sekunden einen passenden Gegner.",fair:"GLEICHE BEDINGUNGEN",fairCopy:"Beide Clubs spielen mit derselben Zeit und denselben Chancen.",server:"GEPRÜFTES ERGEBNIS",serverCopy:"Spielstand und Entscheidungen werden sicher geprüft.",forfeitWin:"SIEG DURCH AUFGABE",forfeitLoss:"NIEDERLAGE DURCH AUFGABE",voided:"MATCH ANNULLIERT",voidedCopy:"Keine Seite traf genug Entscheidungen. Wertung und Saisonfortschritt blieben unverändert.",rematch:"REVANCHE ANFRAGEN",rematchSent:"REVANCHE ANGEFRAGT",rematchIncoming:"GEGNER WILL EINE REVANCHE",rematchStarting:"REVANCHE STARTET",leave:"AUFGEBEN",leaveTitle:"MATCH AUFGEBEN",leaveCopy:"Das Match endet sofort mit einer 0–3-Niederlage.",leaveCheck:"Ich akzeptiere die 0–3-Niederlage.",leaveConfirm:"AUFGEBEN UND BEENDEN",leaveCancel:"ABBRECHEN",inactivityOne:"Eine Entscheidung wurde automatisiert. Drei Versäumnisse in Folge führen zur Niederlage.",inactivityTwo:"LETZTE WARNUNG: Noch ein Versäumnis führt zu einer 0–3-Niederlage."});
  Object.assign(COPY.it,{multiplayer:"MULTIGIOCATORE",queueCopy:"Cerchiamo un club adatto di livello simile.",authentic:"MATCHMAKING RAPIDO",noBots:"Trova in pochi secondi un avversario adatto.",fair:"STESSE CONDIZIONI",fairCopy:"Entrambi i club giocano con lo stesso tempo e le stesse opportunità.",server:"RISULTATO VERIFICATO",serverCopy:"Punteggio e decisioni vengono verificati in sicurezza.",forfeitWin:"VITTORIA A TAVOLINO",forfeitLoss:"SCONFITTA A TAVOLINO",voided:"PARTITA ANNULLATA",voidedCopy:"Nessuna squadra ha preso abbastanza decisioni. Punteggio e progresso stagionale non sono cambiati.",rematch:"CHIEDI RIVINCITA",rematchSent:"RICHIESTA DI RIVINCITA INVIATA",rematchIncoming:"L'AVVERSARIO VUOLE UNA RIVINCITA",rematchStarting:"INIZIA LA RIVINCITA",leave:"ABBANDONA",leaveTitle:"ABBANDONA PARTITA",leaveCopy:"La partita termina subito con una sconfitta per 0–3.",leaveCheck:"Accetto la sconfitta per 0–3.",leaveConfirm:"ABBANDONA E TERMINA",leaveCancel:"ANNULLA",inactivityOne:"Una scelta è stata automatica. Tre assenze consecutive causano la sconfitta.",inactivityTwo:"ULTIMO AVVISO: Un'altra assenza causerà una sconfitta per 0–3."});
  const state={screen:"closed",profile:null,history:[],leaderboard:[],socket:null,room:null,googleUser:null,googleLoading:false,setupDraft:null,setupSubmitting:false,planDraft:null,planSubmitting:false,emoteMenu:false,emoteReadyAt:0,emoteCooldownTimer:null,emoteHideTimer:null,forfeitConfirm:false,liveEventCues:new Set(),queueStarted:0,timer:null,heartbeat:null,deadlineTimer:null,retryTimer:null,retries:0,reconnectAt:0,connection:"idle",latency:null,pingAt:0,lastNetworkBand:"",lastNetworkTelemetry:0,lastError:"",lastResultSound:"",lastPenaltySound:"",lastAudioCue:"",audioCueCount:0,audioClockTimer:null,audioClockBeat:0,audioClockActive:false,searchAudio:null,searchFadeTimer:null,lastArenaAdMatchId:"",customRoom:null,customInput:"",customBusy:false,customPoll:null};
  const text=key=>(COPY[root.LANG]||COPY.en)[key]||key;
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const api=()=>String((document.querySelector(API_META)||{}).content||root.COPA_ARENA_API||"").trim().replace(/\/$/,"");
  const wsBase=()=>api().replace(/^http:/,"ws:").replace(/^https:/,"wss:");
  const storage=root.CopaPlatform&&root.CopaPlatform.storage||localStorage;
  const get=(key,fallback="")=>{try{const value=storage.getItem(key);return value==null?fallback:value;}catch(_){return fallback;}};
  const set=(key,value)=>{try{storage.setItem(key,value);return true;}catch(_){return false;}};
  const remove=key=>{try{storage.removeItem(key);}catch(_){}};
  const jsonGet=key=>{try{return JSON.parse(get(key,"null"));}catch(_){return null;}};
  const uuid=()=>root.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,""):(Date.now().toString(36)+Math.random().toString(36).slice(2));
  const token=()=>{const saved=get(TOKEN_KEY);if(/^CAR-[A-Z0-9]{24,96}$/.test(saved))return saved;const value="CAR-"+uuid().toUpperCase().padEnd(24,"A");set(TOKEN_KEY,value);return value;};
  const client=()=>root.GhostClubs&&typeof root.GhostClubs.clientId==="function"?root.GhostClubs.clientId():(()=>{const key="copa_ghost_client_id_v1",saved=get(key);if(/^GCL-[A-Z0-9]{8,40}$/.test(saved))return saved;const value="GCL-"+uuid().toUpperCase().slice(0,32);set(key,value);return value;})();
  const headers=()=>({"content-type":"application/json","x-copa-client":client(),"x-copa-arena-token":token()});
  const clubName=()=>get(CLUB_KEY,"").trim().slice(0,29);
  const actionId=()=>`AA-${uuid().slice(0,24)}`;
  const local=(tr,en)=>root.LANG==="tr"?tr:en;
  const soundMuted=()=>!!root._muted||!!root.muted||(typeof root.CopaSfxMuted==="function"&&!!root.CopaSfxMuted());
  function sfx(kind){
    if(soundMuted())return;
    if(kind==="goal"&&root.sfxGoal)return root.sfxGoal();
    if(kind==="win"&&root.sfxJingle)return root.sfxJingle();
    const context=root.ac&&root.ac(),tone=({open:[260,.12],queue:[330,.16],match:[523,.3],pick:[410,.09],emote:[620,.13],error:[80,.16]}[kind]||[410,.09]);
    if(context&&root.click)root.click(context,context.currentTime,tone[0],.05,tone[1]);
  }
  function startSearchMusic(){
    stopSearchMusic(false);
    if(soundMuted())return false;
    try{
      const audio=new Audio("assets/audio/ui/searching-opponent.ogg?v=20260730-arena-search1");
      audio.preload="auto";audio.loop=true;audio.volume=.26;state.searchAudio=audio;
      audio.play().catch(()=>{if(state.searchAudio===audio)state.searchAudio=null;});
      return true;
    }catch(_){return false;}
  }
  function stopSearchMusic(reward=false){
    clearInterval(state.searchFadeTimer);state.searchFadeTimer=null;
    const audio=state.searchAudio;state.searchAudio=null;
    if(audio){
      const start=Number(audio.volume)||.26,steps=7;let step=0;
      state.searchFadeTimer=setInterval(()=>{step++;audio.volume=Math.max(0,start*(1-step/steps));if(step>=steps){clearInterval(state.searchFadeTimer);state.searchFadeTimer=null;audio.pause();audio.removeAttribute("src");audio.load();}},35);
    }
    if(reward){if(root.sfxArenaFound)root.sfxArenaFound();else sfx("match");}
  }
  function penaltySfx(outcome){
    if(root.sfxArena&&root.sfxArena(outcome)){state.lastAudioCue=`penalty:${outcome}`;state.audioCueCount++;}
  }
  function stopArenaClock(){
    clearTimeout(state.audioClockTimer);state.audioClockTimer=null;state.audioClockActive=false;state.audioClockBeat=0;
  }
  function arenaClockWanted(game){
    if(!game||state.screen!=="room"||document.hidden||soundMuted())return false;
    if(game.phase==="setup")return !(game.self&&game.self.setup);
    if(game.phase==="draft")return true;
    if(game.phase==="market")return !(game.self&&game.self.market);
    if(game.phase==="training")return !(game.self&&game.self.training);
    if(game.phase==="live")return game.liveStage!=="reveal"&&!(game.self&&game.self.tactics&&game.self.tactics.length>game.window);
    if(game.phase==="penalty")return game.penalty&&game.penalty.stage!=="reveal"&&!game.penalty.selfLocked;
    return false;
  }
  function arenaClockDelay(game){
    const seconds=Math.max(0,(Number(game&&game.deadline)||Date.now()+30_000)-Date.now())/1000;
    return seconds<=6?420:seconds<=12?560:760;
  }
  function scheduleArenaClock(game){
    clearTimeout(state.audioClockTimer);
    if(!arenaClockWanted(game)){stopArenaClock();return;}
    state.audioClockActive=true;
    if(root.sfxArenaTick)root.sfxArenaTick(state.audioClockBeat++%2===1,arenaClockDelay(game)<600);
    state.audioClockTimer=setTimeout(()=>scheduleArenaClock(state.room),arenaClockDelay(game));
  }
  function syncArenaAudio(game){
    if(arenaClockWanted(game)){if(!state.audioClockActive)scheduleArenaClock(game);}else stopArenaClock();
    const penalty=game&&game.phase==="penalty"&&game.penalty,last=penalty&&penalty.stage==="reveal"&&(penalty.history||[]).at(-1);
    if(last){
      const key=`${game.matchId||""}:${last.kick==null?(penalty.history||[]).length:last.kick}:${last.shooter}:${last.outcome}`;
      if(key!==state.lastPenaltySound){state.lastPenaltySound=key;penaltySfx(last.outcome);}
    }
  }
  async function request(path,options={}){
    const response=await fetch(api()+path,{...options,headers:{...headers(),...(options.headers||{})}});
    const data=response.status===204?null:await response.json().catch(()=>({error:"invalid_response"}));
    if(!response.ok)throw new Error(data&&data.error||`http_${response.status}`);return data;
  }
  const googleClientId=()=>String((document.querySelector("meta[name='copa-google-client-id']")||{}).content||"").trim();
  const googleIosClientId=()=>String((document.querySelector("meta[name='copa-google-ios-client-id']")||{}).content||"").trim();
  const nativePlatform=()=>String((document.querySelector("meta[name='copa-platform']")||{}).content||"web")!=="web";
  async function finishGoogleSignIn(credential){
    state.googleLoading=true;render();
    try{
      const response=await fetch(api()+"/v1/arena/auth/google",{method:"POST",headers:{"content-type":"application/json","x-copa-client":client(),"x-copa-arena-token":token()},body:JSON.stringify({credential})});
      const data=await response.json().catch(()=>({error:"invalid_response"}));if(!response.ok)throw new Error(data.error||"google_sign_in_failed");
      set(TOKEN_KEY,data.token);set(GOOGLE_USER_KEY,JSON.stringify(data.user||{}));state.googleUser=data.user||{};state.googleLoading=false;render();
    }catch(error){state.googleLoading=false;state.lastError=error.message;render();}
  }
  async function nativeGoogleSignIn(){
    const clientId=googleClientId();if(!clientId||clientId.startsWith("__")){state.lastError=text("googleConfig");render();return;}
    state.googleLoading=true;render();
    try{
      const plugin=root.Capacitor&&root.Capacitor.Plugins&&root.Capacitor.Plugins.SocialLogin;
      if(!plugin)throw new Error("native_google_unavailable");
      const iosClientId=googleIosClientId();
      await plugin.initialize({google:{webClientId:clientId,iOSClientId:iosClientId&&!iosClientId.startsWith("__")?iosClientId:undefined,iOSServerClientId:clientId,mode:"online"}});
      const login=await plugin.login({provider:"google",options:{scopes:["email","profile"]}});
      const credential=login&&login.result&&login.result.idToken;if(!credential)throw new Error("google_credential_missing");
      await finishGoogleSignIn(credential);
    }catch(error){state.googleLoading=false;state.lastError=error.message||"google_sign_in_failed";render();}
  }
  function continueAsGuest(){
    const guest={name:text("guestName"),guest:true};
    const suffix=token().replace(/^CAR-/,"").slice(0,4);
    set(GOOGLE_USER_KEY,JSON.stringify(guest));set(CLUB_KEY,`${text("guestName")} ${suffix}`.slice(0,29));set(TERMS_KEY,TERMS_VERSION);
    state.googleUser=guest;state.lastError="";telemetry("arena_guest_entered");loadPortal();
  }
  function mountGoogleButton(){
    const slot=rootEl().querySelector("[data-google-slot]");if(!slot||nativePlatform()||state.googleUser)return;
    const clientId=googleClientId();if(!clientId||clientId.startsWith("__")){slot.innerHTML=`<button type="button" class="arena-google-button is-unconfigured" disabled>${esc(text("googleConfig"))}</button>`;return;}
    slot.innerHTML=`<button type="button" class="arena-google-button is-loading" disabled aria-busy="true"><i>G</i>${esc(text("googleContinue"))}</button>`;
    const mount=()=>{
      if(!root.google||!google.accounts||!google.accounts.id)return;
      google.accounts.id.initialize({client_id:clientId,callback:response=>finishGoogleSignIn(response.credential)});
      slot.innerHTML="";
      const available=Math.floor(slot.getBoundingClientRect().width||320);
      const buttonWidth=Math.max(200,Math.min(320,available));
      google.accounts.id.renderButton(slot,{theme:"filled_black",size:"large",shape:"rectangular",text:"continue_with",width:buttonWidth,logo_alignment:"left"});
    };
    if(root.google&&google.accounts){mount();return;}
    let script=document.querySelector("script[data-copa-google-identity]");
    if(!script){script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;script.dataset.copaGoogleIdentity="1";document.head.appendChild(script);}
    script.addEventListener("load",mount,{once:true});
  }
  function telemetry(event,detail="",value=0){request("/v1/arena/events",{method:"POST",body:JSON.stringify({event,detail,value})}).catch(()=>{});}
  function rootEl(){
    let element=document.getElementById("arena");
    if(!element){
      element=document.createElement("section");element.id="arena";element.className="arena-shell hidden";element.setAttribute("aria-label","Copa Arena");
      const wrap=document.querySelector(".wrap");wrap.appendChild(element);element.addEventListener("click",onClick);element.addEventListener("input",onChange);element.addEventListener("change",onChange);
    }
    return element;
  }
  function setScreen(screen){state.screen=screen;render();}
  function divisionLabel(value){const map={aday:"candidate",bronz:"bronze",gumus:"silver",altin:"gold",elmas:"diamond",efsane:"legend"};return text(map[value]||"candidate");}
  function icon(name){
    const paths={
      arena:"<path d='M3 7l5 5 4-8 4 8 5-5-2 12H5z'/><path d='M6 22h12'/><path class='arena-icon-spark' d='M12 1v2M2 4l2 2M22 4l-2 2'/>",
      search:"<circle cx='11' cy='11' r='6'/><path d='m16 16 5 5M8 11h6M11 8v6'/>",
      shield:"<path d='M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z'/><path d='m8 12 2.4 2.4L16 9'/>",
      rank:"<path d='M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7'/>",
      ball:"<circle cx='12' cy='12' r='9'/><path d='m12 7 3 2-1 4h-4L9 9zM12 7V3M15 9l4-1M14 13l3 4M10 13l-3 4M9 9 5 8'/>",
      settings:"<path d='M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.6a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.6a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z'/><circle cx='12' cy='12' r='3'/>",
      guide:"<path d='M4 4h6.5c1 0 1.5.5 1.5 1.5V20c0-1.2-.8-2-2.2-2H4z'/><path d='M20 4h-6.5c-1 0-1.5.5-1.5 1.5V20c0-1.2.8-2 2.2-2H20z'/><path d='M7 8h2M15 8h2M7 11h2M15 11h2'/>"
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arena}</svg>`;
  }
  function chrome(content,kicker=text("multiplayer")){
    const isLive=state.screen==="room"&&state.room&&["live","penalty"].includes(state.room.phase);
    const quality=state.latency==null?"":state.latency<180?"good":state.latency<450?"fair":"poor";
    const status=isLive?`LIVE${state.latency==null?"":` · ${state.latency}ms`}`:quality?`${text("network"+quality[0].toUpperCase()+quality.slice(1))} ${state.latency}ms`:local("ÇEVRİMİÇİ","ONLINE");
    const reconnect=state.connection==="reconnecting"?`<div class="arena-reconnect-banner" role="status"><i></i><span><b>${esc(text("reconnecting"))}</b><small data-arena-reconnect-countdown>${Math.max(1,Math.ceil((state.reconnectAt-Date.now())/1000))}s</small></span></div>`:"";
    const settingsLabel=({tr:"Ayarlar",en:"Settings",es:"Ajustes",de:"Einstellungen",it:"Impostazioni"}[root.LANG]||"Settings");
    const guideLabel=({tr:"Arena rehberi",en:"Arena guide",es:"Guía de Arena",de:"Arena-Guide",it:"Guida Arena"}[root.LANG]||"Arena guide");
    return `<div class="arena-backdrop" aria-hidden="true"><i></i><i></i><i></i></div><header class="arena-topbar"><button type="button" data-arena-action="close" aria-label="${esc(text("back"))}">←</button><div><span>${esc(kicker)}</span><b>COPA <em>ARENA</em></b></div><div class="arena-topbar-actions"><div class="arena-live-mark ${isLive?"is-live":"is-online"} is-${quality||"unknown"}"><i></i> ${esc(status)}</div><button type="button" class="arena-guide-button" data-arena-action="guide" title="${esc(guideLabel)}" aria-label="${esc(guideLabel)}">${icon("guide")}</button><button type="button" class="arena-settings-button global-settings-proxy" onclick="event.stopPropagation();toggleSettings(this)" title="${esc(settingsLabel)}" aria-label="${esc(settingsLabel)}" aria-haspopup="true">${icon("settings")}</button></div></header>${reconnect}<div class="arena-content">${content}</div>${forfeitDialog()}`;
  }
  function terms(){
    const user=state.googleUser;
    return chrome(`<article class="arena-consent"><div class="arena-crest">${icon("arena")}</div><span class="arena-kicker">${esc(text("ranked"))}</span><h1>${esc(text("consentTitle"))}</h1><p>${esc(text("consent"))}</p><section class="arena-google-auth ${user?"is-ready":""}"><span>${esc(text("googleTitle"))}</span><p>${esc(text("googleCopy"))}</p>${user?`<div class="arena-google-user"><i>${user.guest?"◇":"G"}</i><span><b>${esc(user.name||text("googleReady"))}</b><small>${esc(user.guest?text("guestNote"):user.email||text("googleReady"))}</small></span><em>✓</em></div>`:nativePlatform()?`<button type="button" class="arena-google-button" data-arena-action="google">${state.googleLoading?"…":`<i>G</i>${esc(text("googleContinue"))}`}</button>`:`<div class="arena-google-slot" data-google-slot></div>`}${user?"":`<div class="arena-auth-divider"><span>${esc(text("or"))}</span></div><button type="button" class="arena-guest-button" data-arena-action="guest"><i>◇</i><span><b>${esc(text("guestContinue"))}</b><small>${esc(text("guestFast"))}</small></span><em>→</em></button><small class="arena-guest-note">${esc(text("guestNote"))}</small>`}${state.lastError?`<small class="arena-google-error">${esc(state.lastError)}</small>`:""}</section>${user?`<label><span>${esc(text("club"))}</span><input data-arena-club maxlength="29" value="${esc(clubName())}" autocomplete="off"></label><div class="arena-trust-row"><span>${icon("shield")}<b>${esc(text("authentic"))}</b><small>${esc(text("noBots"))}</small></span><span>${icon("rank")}<b>${esc(text("fair"))}</b><small>${esc(text("fairCopy"))}</small></span></div><button class="arena-primary" data-arena-action="accept">${esc(text("accept"))}</button>`:""}</article>`);
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
      <button class="arena-practice" data-arena-action="practice">${icon("shield")}<span><b>${esc(text("practice"))}</b><small>${esc(text("practiceCopy"))}</small></span><i>›</i></button>
      <button class="arena-custom-entry" data-arena-action="custom-room">${icon("arena")}<span><b>${esc(arenaLocale({tr:"ÖZEL ODA",en:"PRIVATE ROOM",es:"SALA PRIVADA",de:"PRIVATER RAUM",it:"STANZA PRIVATA"}))}</b><small>${esc(arenaLocale({tr:"Kod oluştur, arkadaşınla ödülsüz maç yap",en:"Create a code and play an unranked friend match",es:"Crea un código y juega un amistoso sin rango",de:"Code erstellen und ungewertet gegen Freunde spielen",it:"Crea un codice e gioca un'amichevole non classificata"}))}</small></span><i>›</i></button>
      <div class="arena-portal-links"><button data-arena-action="history">${icon("ball")} ${esc(text("history"))}</button><button data-arena-action="leaderboard">${icon("rank")} ${esc(text("leaderboard"))}</button></div>
      <div class="arena-principles"><span><i>01</i><b>${esc(text("authentic"))}</b><small>${esc(text("noBots"))}</small></span><span><i>02</i><b>${esc(text("fair"))}</b><small>${esc(text("fairCopy"))}</small></span><span><i>03</i><b>${esc(text("server"))}</b><small>${esc(text("serverCopy"))}</small></span></div>
      <button class="arena-data-delete" data-arena-action="delete-data">${esc(text("deleteData"))}</button>
    </div>`);
  }
  function queue(){
    return chrome(`<div class="arena-queue"><div class="arena-radar">${icon("search")}<i></i><i></i><i></i></div><span>${esc(text("ranked"))}</span><h1>${esc(text("queue"))}</h1><p>${esc(text("queueCopy"))}</p><strong data-arena-elapsed>00:00</strong><div class="arena-queue-tags"><b>${esc(divisionLabel(state.profile&&state.profile.division))}</b><i></i><b>${state.profile&&state.profile.rating||1000}</b></div><button class="arena-quiet" data-arena-action="cancel">${esc(text("cancel"))}</button></div>`);
  }
  function customRoom(){
    const item=state.customRoom,waiting=item&&item.status==="waiting";
    return chrome(`<div class="arena-custom-room">
      <span>${esc(arenaLocale({tr:"ARKADAŞINLA OYNA",en:"PLAY WITH A FRIEND",es:"JUEGA CON UN AMIGO",de:"MIT FREUNDEN SPIELEN",it:"GIOCA CON UN AMICO"}))}</span>
      <h1>${esc(arenaLocale({tr:"ÖZEL ODA",en:"PRIVATE ROOM",es:"SALA PRIVADA",de:"PRIVATER RAUM",it:"STANZA PRIVATA"}))}</h1>
      <p>${esc(arenaLocale({tr:"Aynı kurallar, aynı süreler. Derece ve sezon puanı etkilenmez.",en:"Same rules and timers. Rating and season points are unaffected.",es:"Mismas reglas y tiempos. No afecta a la clasificación ni a la temporada.",de:"Gleiche Regeln und Zeiten. Wertung und Saisonpunkte bleiben unverändert.",it:"Stesse regole e tempi. Punteggio e stagione non cambiano."}))}</p>
      ${waiting?`<section class="arena-custom-code"><small>${esc(arenaLocale({tr:"ODA KODUN",en:"YOUR ROOM CODE",es:"CÓDIGO DE SALA",de:"DEIN RAUMCODE",it:"CODICE STANZA"}))}</small><strong>${esc(item.code)}</strong><button data-arena-action="copy-custom-code">${esc(arenaLocale({tr:"KODU KOPYALA",en:"COPY CODE",es:"COPIAR CÓDIGO",de:"CODE KOPIEREN",it:"COPIA CODICE"}))}</button><i></i><b>${esc(arenaLocale({tr:"Rakip bekleniyor",en:"Waiting for opponent",es:"Esperando rival",de:"Warte auf Gegner",it:"In attesa dell'avversario"}))}</b></section>`:`<div class="arena-custom-actions"><button class="arena-primary" data-arena-action="create-custom" ${state.customBusy?"disabled":""}>${esc(arenaLocale({tr:"ODA OLUŞTUR",en:"CREATE ROOM",es:"CREAR SALA",de:"RAUM ERSTELLEN",it:"CREA STANZA"}))}</button><div><span>${esc(arenaLocale({tr:"VEYA KODLA KATIL",en:"OR JOIN WITH A CODE",es:"O ÚNETE CON CÓDIGO",de:"ODER MIT CODE BEITRETEN",it:"O ENTRA CON UN CODICE"}))}</span><input data-arena-custom-code maxlength="6" value="${esc(state.customInput)}" placeholder="ABC234" autocomplete="off" autocapitalize="characters"><button data-arena-action="join-custom" ${state.customBusy?"disabled":""}>${esc(arenaLocale({tr:"KATIL",en:"JOIN",es:"UNIRSE",de:"BEITRETEN",it:"ENTRA"}))}</button></div></div>`}
      ${state.lastError?`<small class="arena-custom-error" role="alert">${esc(state.lastError)}</small>`:""}
      <button class="arena-quiet" data-arena-action="${waiting?"cancel-custom":"portal"}">${esc(waiting?arenaLocale({tr:"ODAYI KAPAT",en:"CLOSE ROOM",es:"CERRAR SALA",de:"RAUM SCHLIESSEN",it:"CHIUDI STANZA"}):text("home"))}</button>
    </div>`);
  }
  const choiceLabels={
    formations:{"4-4-2":"4-4-2","4-3-3":"4-3-3","4-2-3-1":"4-2-3-1","3-5-2":"3-5-2"},
    styles:{balanced:"Dengeli",press:"Önde Baskı",counter:"Kontra",control:"Kontrol"},
    chairmen:{patron:"Patron",diplomat:"Diplomat",showman:"Şovmen",professor:"Profesör"},
    training:{finishing:"Bitiricilik",shape:"Savunma Şekli",chemistry:"Takım Uyumu",recovery:"Toparlanma"},
    plans:{adaptive:"Akıllı Denge",protect:"Güvenli Kilit",brave:"Hücum Tepkisi"},
    tactics:{press:"Ön Alan Presi",balanced:"Dengeli Blok",counter:"Hızlı Geçiş",control:"Topa Sahip Olma"},
    market:{twelfth:"12. Adam",counter:"Kontra",wall:"Savunma Duvarı",wonderkid:"Genç Yetenek",captain:"Kaptan",none:"Kart Alma"}
  };
  const choiceLabelsEn={
    formations:choiceLabels.formations,
    styles:{balanced:"Balanced",press:"High Press",counter:"Counter",control:"Control"},
    chairmen:{patron:"Patron",diplomat:"Diplomat",showman:"Showman",professor:"Professor"},
    training:{finishing:"Finishing",shape:"Defensive Shape",chemistry:"Team Chemistry",recovery:"Recovery"},
    plans:{adaptive:"Smart Balance",protect:"Protect the Lead",brave:"Brave Response"},
    tactics:{press:"High Press",balanced:"Balanced Block",counter:"Fast Transition",control:"Possession Play"},
    market:{twelfth:"12th Player",counter:"Counter",wall:"Defensive Wall",wonderkid:"Wonderkid",captain:"Captain",none:"No Card"}
  };
  const choiceLabel=(kind,value)=>((root.LANG==="tr"?choiceLabels:choiceLabelsEn)[kind]||{})[value]||value;
  const arenaLocale=values=>(values[root.LANG]||values.en||values.tr);
  const tacticInsights={
    press:{risk:3,reward:3,counters:"control"},
    balanced:{risk:1,reward:1,counters:""},
    counter:{risk:2,reward:3,counters:"press"},
    control:{risk:2,reward:2,counters:"counter"}
  };
  function tacticPreview(value){
    const insight=tacticInsights[value]||tacticInsights.balanced;
    const risk=arenaLocale({tr:"RİSK",en:"RISK",es:"RIESGO",de:"RISIKO",it:"RISCHIO"});
    const reward=arenaLocale({tr:"GETİRİ",en:"REWARD",es:"PREMIO",de:"ERTRAG",it:"RESA"});
    const edge=insight.counters
      ?arenaLocale({tr:`${choiceLabel("tactics",insight.counters)} karşısında üstün`,en:`Edge vs ${choiceLabel("tactics",insight.counters)}`,es:`Ventaja vs ${choiceLabel("tactics",insight.counters)}`,de:`Vorteil gg. ${choiceLabel("tactics",insight.counters)}`,it:`Vantaggio vs ${choiceLabel("tactics",insight.counters)}`})
      :arenaLocale({tr:"Güvenli ve nötr",en:"Safe and neutral",es:"Seguro y neutral",de:"Sicher und neutral",it:"Sicuro e neutrale"});
    return `<span class="arena-risk-preview"><i>${esc(risk)} ${"●".repeat(insight.risk)}${"○".repeat(3-insight.risk)}</i><i>${esc(reward)} ${"●".repeat(insight.reward)}${"○".repeat(3-insight.reward)}</i><strong>${esc(edge)}</strong></span>`;
  }
  function options(kind,values,selected="",locked=false){
    const descriptions={
      tactics:{
        press:local("Rakibin pasla çıkışını bozar. Topa Sahip Olma'ya üstün; Hızlı Geçiş'e karşı zayıf.","Disrupts build-up. Strong against Possession Play; vulnerable to Fast Transition."),
        balanced:local("Hatlar arası mesafeyi korur. Eşleşme avantajı veya dezavantajı oluşturmaz.","Keeps the lines compact. Creates no matchup advantage or disadvantage."),
        counter:local("Top kazanılınca dikine çıkar. Ön Alan Presi'ne üstün; Topa Sahip Olma'ya karşı zayıf.","Attacks vertically after regaining the ball. Strong against High Press; vulnerable to Possession Play."),
        control:local("Sabırlı paslarla oyunu yerleştirir. Hızlı Geçiş'e üstün; Ön Alan Presi'ne karşı zayıf.","Establishes the game through patient passing. Strong against Fast Transition; vulnerable to High Press.")
      },
      training:{
        finishing:local("Hücum +2","Attack +2"),shape:local("Savunma +2","Defence +2"),
        chemistry:local("Kimya +2","Chemistry +2"),recovery:local("Dayanıklılık +3","Stamina +3")
      }
    };
    return `<div class="arena-choice-grid ${kind}">${values.map(value=>{
      const active=value===selected;
      const detail=descriptions[kind]&&descriptions[kind][value];
      return `<button class="${active?"is-selected":""}" data-arena-choice="${esc(kind)}:${esc(value)}" aria-pressed="${active}" ${locked?"disabled":""}><i></i><b>${esc(choiceLabel(kind,value))}</b><span>${kind==="tactics"?"↗":kind==="training"?"+":"◆"}</span>${detail?`<small>${esc(detail)}</small>`:""}${kind==="tactics"?tacticPreview(value):""}<em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>`;
  }
  const EMOTE_IDS=["hello","applause","fire","respect","easy","comeOn","yawn"];
  const emoteLabel=id=>{
    const labels={
      tr:{hello:"Selam",applause:"İyi hamle",fire:"Haydi!",respect:"İyi oyun",easy:"Çok kolay",comeOn:"Hadi ama",yawn:"Esnedim"},
      en:{hello:"Hello",applause:"Nice play",fire:"Let's go!",respect:"Good game",easy:"Too easy",comeOn:"Come on",yawn:"Yawn"},
      es:{hello:"Hola",applause:"Buena",fire:"¡Vamos!",respect:"Buen juego",easy:"Muy fácil",comeOn:"Vamos ya",yawn:"Bostezo"},
      de:{hello:"Hallo",applause:"Stark",fire:"Los!",respect:"Gutes Spiel",easy:"Zu leicht",comeOn:"Komm schon",yawn:"Gähn"},
      it:{hello:"Ciao",applause:"Bella mossa",fire:"Forza!",respect:"Bella partita",easy:"Troppo facile",comeOn:"Dai",yawn:"Sbadiglio"}
    };
    return (labels[root.LANG]||labels.en)[id]||id;
  };
  function emoteIcon(id){
    const paths={
      hello:"<path d='M5 6h14v10H11l-5 4v-4H5z'/><path d='M9 11h.01M12 11h.01M15 11h.01'/>",
      applause:"<path d='m12 3 2.2 4.5L19 8.2l-3.5 3.4.8 4.8-4.3-2.3-4.3 2.3.8-4.8L5 8.2l4.8-.7z'/><path d='M4 19h16'/>",
      fire:"<path d='M13 2c1 5-3 6-1 10 1-2 3-3 4-5 3 3 4 6 2 10-1 3-4 5-7 5-4 0-7-3-7-7 0-3 2-6 5-9 0 3 1 5 2 6 0-4 3-6 2-10z'/>",
      respect:"<path d='M12 3 20 7v5c0 5-3 8-8 10-5-2-8-5-8-10V7z'/><path d='m8 12 2.5 2.5L16 9'/>",
      easy:"<path d='M5 8h14v8H5z'/><path d='M8 12h8M12 8v8'/>",
      comeOn:"<path d='M4 12h12'/><path d='m12 7 5 5-5 5'/><path d='M4 7v10'/>",
      yawn:"<circle cx='12' cy='12' r='9'/><path d='M8 9h.01M16 9h.01'/><ellipse cx='12' cy='15' rx='2.5' ry='2'/>"
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[id]||paths.hello}</svg>`;
  }
  function emoteReaction(item,side){
    if(!item||!EMOTE_IDS.includes(item.id)||Date.now()-Number(item.at||0)>3400)return "";
    return `<span class="arena-emote-reaction is-${side}" data-arena-emote-sequence="${Number(item.sequence)||0}" role="status">${emoteIcon(item.id)}<b>${esc(emoteLabel(item.id))}</b></span>`;
  }
  function emotePicker(){
    const cooling=Date.now()<Number(state.emoteReadyAt||0);
    return `<div class="arena-emote-picker" role="menu" aria-label="${esc(local("Emote gönder","Send emote"))}">${EMOTE_IDS.map(id=>`<button type="button" data-arena-emote="${id}" role="menuitem" ${cooling?"disabled":""}>${emoteIcon(id)}<span>${esc(emoteLabel(id))}</span></button>`).join("")}</div>`;
  }
  function statusStrip(game){
    const self=game.self||{},opponent=game.opponent||{};
    const phaseLabel=game.phase==="penalty"
      ?(game.penalty&&game.penalty.stage==="reveal"?local("VURUŞ OYNATILIYOR","PLAYING KICK"):local("KARARINI KİLİTLE","LOCK YOUR CHOICE"))
      :(game.liveStage==="reveal"?local("CANLI AKSİYON","LIVE ACTION"):local("TAKTİK KARARI","TACTICAL CALL"));
    const presence=opponent.connected?local("Rakip bağlı","Opponent connected"):local("Rakip yeniden bağlanıyor","Opponent reconnecting");
    const emotes=game.emotes||{},enabled=game.mode!=="practice";
    const trigger=enabled?`<button type="button" class="arena-emote-trigger ${Date.now()<Number(state.emoteReadyAt||0)?"is-cooling":""}" data-arena-action="toggle-emotes" aria-label="${esc(local("Emote gönder","Send emote"))}" aria-haspopup="menu" aria-expanded="${state.emoteMenu}">${emoteIcon("hello")}</button>`:"";
    const misses=Math.max(0,Number(self.missedDecisions)||0),warning=misses>0?`<div class="arena-inactivity-warning is-${Math.min(2,misses)}" role="alert">${esc(misses>=2?text("inactivityTwo"):text("inactivityOne"))}</div>`:"";
    const leave=`<button type="button" class="arena-forfeit-trigger" data-arena-action="open-forfeit">${esc(game.mode==="practice"?local("ANTRENMANI BİTİR","END PRACTICE"):text("leave"))}</button>`;
    return `<div class="arena-versus"><span class="is-self"><small>${esc(text("you"))}</small><div class="arena-club-line"><b>${esc(self.clubName||"—")}</b>${trigger}${emoteReaction(emotes.self,"self")}</div><strong>${self.rating||"—"}</strong>${enabled&&state.emoteMenu?emotePicker():""}</span><i>VS</i><span class="is-opponent"><small>${esc(text("opponent"))}</small><div class="arena-club-line"><b>${esc(opponent.clubName||"—")}</b>${emoteReaction(emotes.opponent,"opponent")}</div><strong>${opponent.rating||"—"}</strong></span></div><div class="arena-phase-status ${opponent.connected?"is-connected":"is-reconnecting"}"><span>${esc(presence)}</span><b data-arena-deadline="${Number(game.deadline)||0}" data-arena-deadline-label="${esc(phaseLabel)}"></b>${leave}</div>${warning}`;
  }
  function forfeitDialog(){
    if(!state.forfeitConfirm)return "";
    const practice=state.room&&state.room.mode==="practice";
    return `<div class="arena-forfeit-backdrop" role="presentation"><section class="arena-forfeit-dialog" role="dialog" aria-modal="true" aria-labelledby="arenaForfeitTitle"><span>${practice?"AI":"0–3"}</span><h2 id="arenaForfeitTitle">${esc(practice?local("ANTRENMANI BİTİR","END PRACTICE"):text("leaveTitle"))}</h2><p>${esc(practice?local("Prova maçını şimdi bitirebilirsin. Derecen, sezon puanın ve maç kaydın etkilenmez.","You can end this rehearsal now. Your rating, season points and match record will not change."):text("leaveCopy"))}</p>${practice?"":`<label><input type="checkbox" data-arena-forfeit-check><b>${esc(text("leaveCheck"))}</b></label>`}<button class="arena-forfeit-confirm" data-arena-action="confirm-forfeit" ${practice?"":"disabled"}>${esc(practice?local("ANTRENMANI BİTİR","END PRACTICE"):text("leaveConfirm"))}</button><button class="arena-quiet" data-arena-action="cancel-forfeit">${esc(text("leaveCancel"))}</button></section></div>`;
  }
  function setupDraft(game){
    const matchId=String(game.matchId||"");
    if(!state.setupDraft||state.setupDraft.matchId!==matchId){
      state.setupDraft={matchId,formation:"",style:""};
      state.setupSubmitting=false;
    }
    if(game.self&&game.self.setup){
      state.setupDraft.formation=game.self.setup.formation||"";
      state.setupDraft.style=game.self.setup.style||"";
    }
    return state.setupDraft;
  }
  function setup(game){
    const chosen=setupDraft(game),confirmed=!!(game.self&&game.self.setup),submitted=confirmed||state.setupSubmitting;
    return chrome(`${statusStrip(game)}<div class="arena-phase"><span>01 / 14</span><h1>${esc(text("setup"))}</h1><p>${esc(text("fairCopy"))}</p><div class="arena-fixed-chairman"><b>${esc(text("babacan"))}</b><small>${root.LANG==="tr"?"Tüm kulüpler eşit yönetim desteğiyle başlar.":"Every club starts with the same board support."}</small></div><label>${esc(text("formation"))}</label>${options("formations",["4-4-2","4-3-3","4-2-3-1","3-5-2"],chosen.formation,submitted)}<label>${esc(text("style"))}</label>${options("styles",["balanced","press","counter","control"],chosen.style,submitted)}<button class="arena-primary" data-arena-action="submit-setup" disabled>${esc(submitted?text("waiting"):text("choose"))}</button></div>`);
  }
  const pitchPositions={
    GK:[50,91],LB:[14,76],CB1:[38,79],CB2:[62,79],RB:[86,76],
    CM1:[34,59],CM2:[66,59],AM:[50,44],LW:[18,30],RW:[82,30],ST:[50,17]
  };
  function powerBand(value){
    const power=Number(value);
    if(!Number.isFinite(power))return "empty";
    return power>=91?"elite":power>=81?"good":power>=71?"average":power>=61?"weak":"worst";
  }
  function budgetBand(value){
    const budget=Number(value);
    if(!Number.isFinite(budget))return "empty";
    return budget>=31?"elite":budget>=21?"good":budget>=13?"average":budget>=6?"weak":"worst";
  }
  function pitchPlayer(player,side="self"){
    const key=player.slot||player.line,pos=pitchPositions[key]||[50,50];
    const y=side==="opponent"?100-pos[1]:pos[1],power=Number(player.effectivePower??player.power)||0;
    return `<span class="arena-lineup-player is-${side} power-${powerBand(power)}" style="--x:${pos[0]}%;--y:${y}%" title="${esc(`${player.name} · ${player.position||key} · ${power}`)}"><i>${esc(player.position||key)}</i><b>${esc(player.name)}</b><strong>${power}</strong></span>`;
  }
  function lineupPitch(game,versus=false){
    const mine=game.self&&game.self.draft||[],theirs=versus&&game.opponent&&game.opponent.draft||[];
    const heading=versus?local("MAÇ ÖNCESİ · KARŞI KARŞIYA","PRE-MATCH · HEAD TO HEAD"):local("KADRO PANOSU","SQUAD BOARD");
    const myPower=game.team&&game.team.power,theirPower=game.opponentTeam&&game.opponentTeam.power;
    return `<section class="arena-lineup-wrap ${versus?"is-versus":""}" aria-label="${esc(heading)}"><header><span>${esc(heading)}</span><b>${esc(game.self&&game.self.setup&&game.self.setup.formation||"4-2-3-1")}</b></header><div class="arena-lineup-pitch"><i class="arena-pitch-lines"></i>${versus?`<em>${esc(game.opponent&&game.opponent.clubName||text("opponent"))}</em>`:""}${theirs.map(player=>pitchPlayer(player,"opponent")).join("")}${mine.map(player=>pitchPlayer(player)).join("")}<small>${esc(game.self&&game.self.clubName||text("you"))}</small></div><footer><span>${mine.length}/11 ${esc(text("selected"))}</span>${versus?`<b>${esc(text("power"))} <strong class="arena-context-power power-${powerBand(myPower)}">${myPower||"—"}</strong> <i>VS</i> <strong class="arena-context-power power-${powerBand(theirPower)}">${theirPower||"—"}</strong></b>`:""}</footer></section>`;
  }
  function draft(game){
    const offers=game.offers||[],picked=game.self&&game.self.draft||[],selected=picked[game.draftStep]||null,status=game.draftStatus||{};
    const slot=(offers[0]&&offers[0].slot)||(root.LANG==="tr"?"OYUNCU":"PLAYER"),count=Number(status.count!=null?status.count:picked.length),total=Number(status.total)||11;
    const budget=status.budget!=null?status.budget:48,power=status.power==null?"—":status.power;
    return chrome(`${statusStrip(game)}<div class="arena-phase arena-draft"><span>${String(game.draftStep+2).padStart(2,"0")} / 14 · ${esc(slot)}</span><h1>${esc(text("draft"))}</h1><p>${esc(local("İki kulübe denk güçte, farklı oyuncular sunulur; bir futbolcu maçta yalnızca bir kez yer alır.","Both clubs receive equivalent but distinct players; each footballer can appear only once per match."))}</p><div class="arena-draft-progress"><span>${esc(text("startingXI"))}<b>${count} / ${total}</b></span><div>${Array.from({length:total},(_,index)=>`<i class="${index<count?"is-filled":""}"></i>`).join("")}</div></div><div class="arena-team-pulse"><b class="arena-budget-state budget-${budgetBand(budget)}">${esc(text("budget"))} <i class="arena-context-budget budget-${budgetBand(budget)}">€${budget}M</i></b><b>${esc(local("ÖNERİLEN REZERV","SUGGESTED RESERVE"))} <i>€${Number(status.recommendedReserve)||0}M</i></b><b>${esc(text("power"))} <i class="arena-context-power power-${powerBand(power)}">${power}</i></b></div><div class="arena-offers">${offers.map(item=>{
      const active=!!selected&&selected.id===item.id;
      const leagueLabel=item.sourceLeagueLabel&&(item.sourceLeagueLabel[root.LANG]||item.sourceLeagueLabel.en)||item.sourceLeague||"";
      const profileMeta=[leagueLabel,item.position,item.age?`${item.age}${root.LANG==="tr"?" yaş":"y"}`:""].filter(Boolean).join(" · ");
      const fit=item.positionFit==="adapted"?local("UYARLANMIŞ MEVKİ","ADAPTED POSITION"):local("DOĞAL MEVKİ","NATURAL POSITION");
      const penalty=item.positionPenalty?` · ${local("güç cezası","power penalty")} -${item.positionPenalty}`:"";
      const affordable=item.affordable!==false;
      const itemPower=item.effectivePower??item.power;
      const priceTone=!affordable?"unavailable":item.cost<=2?"value":item.cost<=4?"standard":"premium";
      const chemistryTone=item.chemistry>0?"positive":item.chemistry<0?"negative":"neutral";
      return `<button class="${active?"is-selected":affordable?"":"is-unaffordable"}" data-arena-choice="draft:${esc(item.id)}" data-arena-cost="${Number(item.cost)||0}" aria-pressed="${active}" ${selected||!affordable?"disabled":""}><span>${esc(item.slot||item.line)}</span><small class="arena-player-price is-${priceTone}">€${item.cost}M</small><strong class="arena-context-power power-${powerBand(itemPower)}">${itemPower}</strong><b>${esc(item.name)}</b>${profileMeta?`<small class="arena-player-origin">${esc(profileMeta)}</small>`:""}<small class="arena-position-fit ${item.positionFit==="adapted"?"is-adapted":""}">${esc(fit+penalty)}</small>${item.club?`<small class="arena-player-club">${esc(item.club)}</small>`:""}<small class="arena-player-chem is-${chemistryTone}"><span>${esc(text("chemistry"))}</span><b>${item.chemistry>=0?"+":""}${item.chemistry}</b></small>${!affordable?`<small class="arena-budget-warning">${esc(local("Kalan mevkiler için bütçe gerekli","Budget reserved for remaining positions"))}</small>`:""}<em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>${selected?`<p class="arena-choice-confirmed">${esc(selected.name)} · ${esc(text("selected"))}</p>`:""}${lineupPitch(game)}</div>`);
  }
  function market(game){
    const selected=game.self&&game.self.market&&game.self.market.id;
    const team=game.team||{};
    const activations={
      second_half:local("45'–70' arasında ikinci dalga","Second wave from 45'–70'"),
      trailing:local("Gerideyken hücum ivmesi","Attacking lift while trailing"),
      leading:local("Öndeyken savunma kilidi","Defensive lock while leading"),
      late:local("70' sonrası ekstra tehdit","Extra threat after 70'"),
      pressure:local("Baskı anlarında liderlik","Leadership under pressure"),
      none:local("Bütçeyi korur","Keeps the budget")
    };
    const categoryLabels={momentum:local("MOMENTUM","MOMENTUM"),doctrine:local("DOKTRİN","DOCTRINE"),defense:local("SAVUNMA","DEFENCE"),attack:local("HÜCUM","ATTACK"),leadership:local("LİDERLİK","LEADERSHIP"),reserve:local("REZERV","RESERVE")};
    const synergy=item=>{
      const style=game.self&&game.self.setup&&game.self.setup.style,formation=game.self&&game.self.setup&&game.self.setup.formation;
      const perfect=(item.id==="counter"&&style==="counter")||(item.id==="wall"&&style==="control")||(item.id==="wonderkid"&&formation==="4-3-3")||(item.id==="twelfth"&&style==="press")||item.id==="captain";
      const risky=item.risk>0||(item.id==="counter"&&style==="control");
      return perfect?["perfect",local("MÜKEMMEL UYUM","PERFECT FIT")]:risky?["risky",local("RİSKLİ UYUM","BOLD FIT")]:["balanced",local("DENGELİ UYUM","BALANCED FIT")];
    };
    return chrome(`${statusStrip(game)}<div class="arena-phase"><span>13 / 14</span><h1>${esc(text("market"))}</h1><div class="arena-team-pulse"><b class="arena-budget-state budget-${budgetBand(team.budget)}">${esc(text("budget"))} <i class="arena-context-budget budget-${budgetBand(team.budget)}">€${team.budget==null?"—":team.budget}M</i></b><b>${esc(text("chemistry"))} <i>${team.chemistry==null?"—":team.chemistry}</i></b><b>${esc(text("power"))} <i class="arena-context-power power-${powerBand(team.power)}">${team.power||"—"}</i></b></div><div class="arena-offers arena-market-offers">${(game.offers||[]).map(item=>{
      const active=item.id===selected;
      const affordable=item.affordable!==false,fit=synergy(item),projected=item.projected||{};
      const impact=item.id==="none"?"":`<small class="arena-card-stats">ATK ${item.attack>=0?"+":""}${item.attack} · DEF ${item.defense>=0?"+":""}${item.defense} · CHEM ${item.chemistry>=0?"+":""}${item.chemistry}</small><small class="arena-card-preview">${esc(text("power"))} <i class="arena-context-power power-${powerBand(projected.power)}">${projected.power??"—"}</i> · ${esc(text("chemistry"))} ${projected.chemistry??"—"}</small><small class="arena-card-fit is-${fit[0]}">${esc(fit[1])}</small>`;
      return `<button class="arena-card is-${esc(item.category||"reserve")} ${active?"is-selected":affordable?"":"is-unaffordable"}" data-arena-choice="market:${esc(item.id)}" aria-pressed="${active}" ${selected||!affordable?"disabled":""}><span>${esc(categoryLabels[item.category]||text(item.id==="none"?"pass":"marketCard"))}</span><strong>${item.cost?`€${item.cost}M`:"—"}</strong><i class="arena-card-glyph" aria-hidden="true"></i><b>${esc(choiceLabel("market",item.id))}</b><small class="arena-card-trigger">${esc(activations[item.activation]||activations.none)}</small>${impact}${!affordable?`<small class="arena-budget-warning">${esc(local("Yetersiz bütçe","Not enough budget"))}</small>`:""}<em>✓ ${esc(text("selected"))}</em></button>`;
    }).join("")}</div>${selected?`<p class="arena-choice-confirmed">${esc(choiceLabel("market",selected))} · ${esc(text("selected"))}</p>`:""}${lineupPitch(game)}</div>`);
  }
  function matchPlanDraft(game){
    if(!state.planDraft||state.planDraft.matchId!==game.matchId){
      state.planDraft={matchId:game.matchId,focus:"",scenario:""};
      state.planSubmitting=false;
    }
    const saved=game.self&&game.self.training;
    if(saved){
      state.planDraft.focus=typeof saved==="string"?saved:saved.focus||"";
      state.planDraft.scenario=typeof saved==="string"?"adaptive":saved.scenario||"";
    }
    return state.planDraft;
  }
  function planVisual(value){
    const visuals={
      finishing:`<svg viewBox="0 0 64 48"><path class="plan-frame" d="M37 9h18v25H37"/><path class="plan-net" d="M43 9v25m6-25v25m6-17H37m18 8H37"/><path class="plan-flight" d="M11 34C20 31 25 23 35 17"/><circle class="plan-ball" cx="11" cy="34" r="4"/></svg>`,
      shape:`<svg viewBox="0 0 64 48"><path class="plan-shield" d="M32 7l18 7v11c0 9-7 14-18 18-11-4-18-9-18-18V14z"/><path class="plan-block" d="M20 27h24"/><circle class="plan-node is-one" cx="21" cy="23" r="3"/><circle class="plan-node is-two" cx="32" cy="29" r="3"/><circle class="plan-node is-three" cx="43" cy="23" r="3"/></svg>`,
      chemistry:`<svg viewBox="0 0 64 48"><path class="plan-link" d="M17 31L28 14l19 5-6 18-24-6zM28 14l13 23M47 19L17 31"/><circle class="plan-node is-one" cx="28" cy="14" r="4"/><circle class="plan-node is-two" cx="47" cy="19" r="4"/><circle class="plan-node is-three" cx="41" cy="37" r="4"/><circle class="plan-node is-four" cx="17" cy="31" r="4"/></svg>`,
      recovery:`<svg viewBox="0 0 64 48"><path class="plan-orbit" d="M47 18a16 16 0 10-1 16"/><path class="plan-arrow" d="M44 10l5 8-9 2"/><path class="plan-pulse" d="M18 27h8l3-7 6 14 4-7h8"/></svg>`,
      adaptive:`<svg viewBox="0 0 64 48"><path class="plan-horizon" d="M11 35h42"/><path class="plan-balance" d="M32 12v23M20 19h24M20 19l-7 12h14zm24 0l-7 12h14z"/><circle class="plan-pivot" cx="32" cy="19" r="3"/></svg>`,
      protect:`<svg viewBox="0 0 64 48"><path class="plan-shield" d="M32 6l17 7v12c0 9-7 14-17 18-10-4-17-9-17-18V13z"/><rect class="plan-lock" x="25" y="23" width="14" height="11" rx="3"/><path class="plan-lock-hook" d="M28 23v-4a4 4 0 018 0v4"/><path class="plan-scan" d="M18 29h28"/></svg>`,
      brave:`<svg viewBox="0 0 64 48"><path class="plan-lane" d="M10 38h44"/><path class="plan-rush is-one" d="M14 31l12-9-12-9"/><path class="plan-rush is-two" d="M29 31l12-9-12-9"/><circle class="plan-ball" cx="49" cy="22" r="5"/></svg>`
    };
    return `<span class="arena-plan-visual is-${value}" aria-hidden="true">${visuals[value]||""}</span>`;
  }
  function training(game){
    const plan=matchPlanDraft(game),locked=!!(game.self&&game.self.training)||state.planSubmitting;
    const team=game.team||{},draft=game.self&&game.self.draft||[];
    const focusDetails={finishing:local("Hücum +2","Attack +2"),shape:local("Savunma +2","Defence +2"),chemistry:local("Kimya +2","Chemistry +2"),recovery:local("Dayanıklılık +3","Stamina +3")};
    const scenarioDetails={
      adaptive:local("Öndeyken korur · gerideyken hızlanır","Protects a lead · accelerates when behind"),
      protect:local("Öncelik skoru ve alanı korumak","Prioritises score and space"),
      brave:local("Gerideyken daha güçlü hücum riski","Stronger attacking risk when behind")
    };
    const choiceButtons=(kind,values,selected,details)=>`<div class="arena-plan-grid is-${kind}">${values.map(value=>`<button data-arena-plan="${kind}:${value}" class="${selected===value?"is-selected":""}" aria-pressed="${selected===value}" ${locked?"disabled":""}>${planVisual(value)}<i></i><b>${esc(kind==="focus"?choiceLabel("training",value):choiceLabel("plans",value))}</b><small>${esc(details[value])}</small><em>✓</em></button>`).join("")}</div>`;
    return chrome(`${statusStrip(game)}<div class="arena-phase arena-match-plan"><span>14 / 14</span><h1>${esc(text("training"))}</h1><div class="arena-final-summary"><b>${esc(local("KADRO ÖZETİ","SQUAD SUMMARY"))}</b><span>${draft.length}/11</span><span class="arena-context-power power-${powerBand(team.power)}">${esc(text("power"))} ${team.power||"—"}</span><span>${esc(text("chemistry"))} ${team.chemistry==null?"—":team.chemistry}</span><span class="arena-budget-state arena-context-budget budget-${budgetBand(team.budget)}">${esc(text("budget"))} €${team.budget==null?"—":team.budget}M</span></div><section class="arena-plan-section"><header><span>01</span><div><b>${esc(local("ANA ODAK","PRIMARY FOCUS"))}</b><small>${esc(local("Takımın maç boyunca taşıdığı temel güç.","The team's core strength throughout the match."))}</small></div></header>${choiceButtons("focus",["finishing","shape","chemistry","recovery"],plan.focus,focusDetails)}</section><section class="arena-plan-section"><header><span>02</span><div><b>${esc(local("SENARYO PLANI","MATCH SCRIPT"))}</b><small>${esc(local("Skora göre otomatik, küçük ve kontrollü tepki.","A small, controlled automatic response to the score."))}</small></div></header>${choiceButtons("scenario",["adaptive","protect","brave"],plan.scenario,scenarioDetails)}</section><button class="arena-primary" data-arena-action="submit-plan" ${locked||!(plan.focus&&plan.scenario)?"disabled":""}>${esc(locked?text("waiting"):local("PLANI KİLİTLE","LOCK PLAN"))}</button>${locked?`<p class="arena-choice-confirmed">${esc(choiceLabel("training",plan.focus))} · ${esc(choiceLabel("plans",plan.scenario))} · ${esc(text("selected"))}</p>`:""}${lineupPitch(game,true)}</div>`);
  }
  function lobby(game){
    return chrome(`${statusStrip(game)}<div class="arena-ready"><div class="arena-ready-ring">${icon("shield")}<i></i></div><h1>${esc(game.self&&game.self.ready?text("waiting"):text("ready"))}</h1><p>${esc(text("serverCopy"))}</p><button class="arena-primary" data-arena-action="ready" ${game.self&&game.self.ready?"disabled":""}>${esc(text("ready"))}</button></div>`);
  }
  function liveHistory(game){
    const history=Array.isArray(game.windowHistory)?game.windowHistory.slice():[];
    const report=game.windowResult;
    if(report&&!history.some(item=>Number(item.window)===Number(report.window)))history.push(report);
    return history;
  }
  function momentumTimeline(game,segments){
    const history=liveHistory(game),selfHome=game.selfIndex===0;
    const title=arenaLocale({tr:"MAÇ AKIŞI",en:"MATCH FLOW",es:"FLUJO DEL PARTIDO",de:"SPIELVERLAUF",it:"ANDAMENTO"});
    const momentum=arenaLocale({tr:"MOMENTUM / xG",en:"MOMENTUM / xG",es:"MOMENTO / xG",de:"MOMENTUM / xG",it:"MOMENTUM / xG"});
    return `<section class="arena-momentum" aria-label="${esc(title)}"><header><b>${esc(title)}</b><span>${esc(momentum)}</span></header><div>${segments.map((segment,index)=>{
      const item=history.find(entry=>Number(entry.window)===index);
      const myXg=item?Number(selfHome?item.homeXg:item.awayXg):0,theirXg=item?Number(selfHome?item.awayXg:item.homeXg):0;
      const delta=Number((myXg-theirXg).toFixed(2)),strength=Math.min(100,Math.max(8,Math.abs(delta)*95));
      const stateClass=!item?"is-pending":Math.abs(delta)<.08?"is-neutral":delta>0?"is-mine":"is-theirs";
      return `<article class="${stateClass} ${index===Number(game.window)?"is-current":""}"><small>${Number(segment.startMinute)}–${Number(segment.endMinute)}'</small><i><em style="--swing:${strength}%"></em></i><b>${item?`${myXg.toFixed(2)}–${theirXg.toFixed(2)}`:"—"}</b></article>`;
    }).join("")}</div></section>`;
  }
  function opponentTendency(game){
    const choices=(game.opponent&&game.opponent.tactics||[]).slice(-2);
    const heading=arenaLocale({tr:"RAKİP EĞİLİMİ",en:"OPPONENT TENDENCY",es:"TENDENCIA RIVAL",de:"GEGNER-TENDENZ",it:"TENDENZA RIVALE"});
    let label=arenaLocale({tr:"Veri oluşuyor",en:"Building signal",es:"Creando señal",de:"Signal entsteht",it:"Segnale in corso"});
    if(choices.length===1)label=arenaLocale({tr:`İlk tercih: ${choiceLabel("tactics",choices[0])}`,en:`First read: ${choiceLabel("tactics",choices[0])}`,es:`Primera lectura: ${choiceLabel("tactics",choices[0])}`,de:`Erster Eindruck: ${choiceLabel("tactics",choices[0])}`,it:`Prima lettura: ${choiceLabel("tactics",choices[0])}`});
    if(choices.length===2){
      if(choices[0]===choices[1])label=arenaLocale({tr:`Israrcı: ${choiceLabel("tactics",choices[1])}`,en:`Repeating: ${choiceLabel("tactics",choices[1])}`,es:`Repite: ${choiceLabel("tactics",choices[1])}`,de:`Wiederholt: ${choiceLabel("tactics",choices[1])}`,it:`Insiste: ${choiceLabel("tactics",choices[1])}`});
      else if(choices.every(item=>["press","counter"].includes(item)))label=arenaLocale({tr:"Dikey ve agresif",en:"Direct and aggressive",es:"Directo y agresivo",de:"Direkt und aggressiv",it:"Diretto e aggressivo"});
      else if(choices.includes("control"))label=arenaLocale({tr:"Topa hükmetme arıyor",en:"Seeking control",es:"Busca el control",de:"Sucht Kontrolle",it:"Cerca controllo"});
      else label=arenaLocale({tr:"Esnek, kalıp vermiyor",en:"Flexible, no fixed pattern",es:"Flexible, sin patrón",de:"Flexibel, kein Muster",it:"Flessibile, senza schema"});
    }
    return `<aside class="arena-tendency"><span>${icon("search")}</span><div><b>${esc(heading)}</b><strong>${esc(label)}</strong><small>${choices.length?choices.map(item=>choiceLabel("tactics",item)).join(" → "):arenaLocale({tr:"İlk iki karar analiz edilir",en:"Reads the last two calls",es:"Analiza las dos últimas",de:"Analysiert die letzten zwei",it:"Analizza le ultime due"})}</small></div></aside>`;
  }
  function turningPoints(game){
    const selfSide=game.selfIndex===0?"home":"away",history=liveHistory(game),points=[];
    (game.events||[]).filter(item=>item.type==="goal").forEach(item=>points.push({
      key:`g-${item.minute}-${item.side}`,minute:Number(item.minute),priority:100+Number(item.minute)/100,
      title:item.side===selfSide?arenaLocale({tr:"Skoru buldun",en:"Your breakthrough",es:"Tu gol",de:"Dein Treffer",it:"Il tuo gol"}):arenaLocale({tr:"Rakip skoru buldu",en:"Opponent breakthrough",es:"Gol rival",de:"Gegentreffer",it:"Gol rivale"}),
      detail:arenaLocale({tr:"Gol, maçın dengesini değiştirdi.",en:"A goal changed the balance of the match.",es:"Un gol cambió el equilibrio.",de:"Ein Tor veränderte das Spiel.",it:"Un gol ha cambiato l'equilibrio."})
    }));
    history.forEach(item=>{
      const myXg=Number(game.selfIndex===0?item.homeXg:item.awayXg),theirXg=Number(game.selfIndex===0?item.awayXg:item.homeXg),delta=Number((myXg-theirXg).toFixed(2));
      points.push({key:`w-${item.window}`,minute:Number(item.endMinute),priority:Math.abs(delta)*10,
        title:delta>=0?arenaLocale({tr:"Momentum sende",en:"Momentum swung your way",es:"El momento fue tuyo",de:"Momentum auf deiner Seite",it:"Momentum dalla tua parte"}):arenaLocale({tr:"Rakip baskıyı artırdı",en:"Opponent raised the pressure",es:"El rival aumentó la presión",de:"Gegner erhöhte den Druck",it:"Il rivale ha alzato la pressione"}),
        detail:`xG ${myXg.toFixed(2)}–${theirXg.toFixed(2)} · ${choiceLabel("tactics",(game.self&&game.self.tactics||[])[Number(item.window)]||"balanced")}`
      });
    });
    return points.sort((a,b)=>b.priority-a.priority).slice(0,3).sort((a,b)=>a.minute-b.minute);
  }
  function live(game){
    const allEvents=game.events||[],events=allEvents.slice(-8).reverse(),score=game.score||[0,0],revealing=game.liveStage==="reveal";
    const report=game.windowResult||null,selfHome=game.selfIndex===0;
    const segments=game.liveSegments&&game.liveSegments.length?game.liveSegments:[{startMinute:0,endMinute:30},{startMinute:30,endMinute:60},{startMinute:60,endMinute:90}];
    const segment=segments[game.window]||segments[0];
    const myTactic=report&&report.tactics&&report.tactics[selfHome?0:1],theirTactic=report&&report.tactics&&report.tactics[selfHome?1:0];
    const myGoals=report?(selfHome?report.homeGoals:report.awayGoals):0,theirGoals=report?(selfHome?report.awayGoals:report.homeGoals):0;
    const myXg=report?(selfHome?report.homeXg:report.awayXg):0,theirXg=report?(selfHome?report.awayXg:report.homeXg):0;
    const baseMine=revealing?Math.max(0,(score[game.selfIndex]||0)-myGoals):(score[game.selfIndex]||0);
    const baseTheirs=revealing?Math.max(0,(score[game.selfIndex===0?1:0]||0)-theirGoals):(score[game.selfIndex===0?1:0]||0);
    const segmentGoals=allEvents.filter(event=>event.type==="goal"&&event.minute>=Number(segment.startMinute)).map(event=>`${event.minute}:${event.side===(game.selfIndex===0?"home":"away")?0:1}`).join(",");
    const revealDelay=event=>revealing&&event.minute>=Number(segment.startMinute)?Math.max(0,Math.min(6.5,(event.minute-segment.startMinute)/(segment.endMinute-segment.startMinute)*6.5)):0;
    const advantage=report&&(report.advantage==="neutral"?local("Eşleşme nötr kaldı.","The matchup was neutral."):((report.advantage==="home")===selfHome?local("Taktik eşleşme sende.","You won the tactical matchup."):local("Taktik eşleşme rakipte.","The opponent won the tactical matchup.")));
    return chrome(`${statusStrip(game)}<div class="arena-live">
      <div class="arena-match-clock"><b data-arena-match-clock data-start-minute="${Number(segment.startMinute)||0}" data-end-minute="${Number(segment.endMinute)||90}" data-revealing="${revealing}" data-deadline="${Number(game.deadline)||0}">${revealing?Number(segment.startMinute)||0:Number(game.matchMinute)||Number(segment.startMinute)||0}'</b><span>${revealing?local("CANLI AKSİYON","LIVE ACTION"):local("OYUN DEVAM EDERKEN KARAR VER","DECIDE WHILE PLAY CONTINUES")}</span></div>
      <div class="arena-live-score"><span>${esc(game.self&&game.self.clubName||text("you"))}</span><b data-arena-live-score data-base-mine="${baseMine}" data-base-theirs="${baseTheirs}" data-goals="${esc(segmentGoals)}">${baseMine}<i>–</i>${baseTheirs}</b><span>${esc(game.opponent&&game.opponent.clubName||text("opponent"))}</span></div>
      ${momentumTimeline(game,segments)}
      <div class="arena-pitch-live ${revealing?"is-playing":""}" aria-label="${esc(local("Maç olay haritası; altın senin, turuncu rakibin.","Match event map; gold is you, orange is the opponent."))}"><i></i><i></i><b style="left:${Math.min(94,Math.max(6,Number(game.matchMinute)||Number(segment.startMinute)||0))}%"></b><em class="arena-live-ball"></em>${events.map(event=>`<span class="${event.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"} is-${esc(event.type)} ${revealDelay(event)?"is-reveal-event":""}" style="left:${Math.min(94,Math.max(6,event.minute))}%;--reveal-delay:${revealDelay(event)}s">${event.type==="goal"?"●":event.type==="shot"?"◆":"▪"}</span>`).join("")}<small class="arena-pitch-legend">${esc(local("ALTIN: SEN · TURUNCU: RAKİP","GOLD: YOU · ORANGE: OPPONENT"))}</small></div>
      <div class="arena-event-feed">${events.length?events.map(event=>{const labels={goal:local("GOL","GOAL"),card:local("KART","CARD"),attack:local("TEHLİKELİ ATAK","DANGEROUS ATTACK"),shot:local("ŞUT","SHOT"),save:local("KURTARIŞ","SAVE")};return `<span class="${revealDelay(event)?"is-reveal-event":""}" style="--reveal-delay:${revealDelay(event)}s"><b>${event.minute}'</b><i class="${event.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"}">${esc(labels[event.type]||event.type)} · ${esc(event.side===(game.selfIndex===0?"home":"away")?text("you"):text("opponent"))}</i></span>`;}).join(""):`<span><b>0'</b><i>${esc(local("BAŞLAMA VURUŞU","KICK-OFF"))}</i></span>`}</div>
      ${revealing&&report?`<div class="arena-window-report"><b>${esc(local(`${report.startMinute}'–${report.endMinute}' BÖLÜM RAPORU`,`${report.startMinute}'–${report.endMinute}' WINDOW REPORT`))}</b><div><span>${esc(choiceLabel("tactics",myTactic))}</span><i>VS</i><span>${esc(choiceLabel("tactics",theirTactic))}</span></div><p>${esc(advantage)} · xG ${myXg}–${theirXg}</p></div>`:""}
      <div class="arena-tactic-window"><span>${game.window+1} / ${segments.length}</span><h2>${esc(revealing?local("SAHADA CANLI","LIVE ON THE PITCH"):text("tacticDecision"))}</h2>${revealing?"":opponentTendency(game)}${revealing?"":options("tactics",["press","balanced","counter","control"],game.self&&game.self.tactics&&game.self.tactics[game.window]||"",!!(game.self&&game.self.tactics&&game.self.tactics.length>game.window))}${!revealing&&game.self&&game.self.tactics&&game.self.tactics.length>game.window?`<p>${esc(choiceLabel("tactics",game.self.tactics[game.window]))} · ${esc(text("selected"))} · ${esc(local("Maç akışı sürüyor","Match flow continues"))}</p>`:""}</div>
    </div>`);
  }
  const penaltyZoneLabels={
    leftHigh:["SOL ÜST","LEFT HIGH"],leftLow:["SOL ALT","LEFT LOW"],center:["ORTA","CENTER"],rightLow:["SAĞ ALT","RIGHT LOW"],rightHigh:["SAĞ ÜST","RIGHT HIGH"]
  };
  const penaltyZoneMotion={
    leftHigh:{x:"18%",y:"72%",keeperX:"20%",keeperY:"44%",keeperRotate:"-68deg"},
    leftLow:{x:"18%",y:"10%",keeperX:"20%",keeperY:"7%",keeperRotate:"-46deg"},
    center:{x:"50%",y:"47%",keeperX:"50%",keeperY:"28%",keeperRotate:"0deg"},
    rightLow:{x:"82%",y:"10%",keeperX:"80%",keeperY:"7%",keeperRotate:"46deg"},
    rightHigh:{x:"82%",y:"72%",keeperX:"80%",keeperY:"44%",keeperRotate:"68deg"}
  };
  function penalty(game){
    const shootout=game.penalty||{},score=shootout.score||[0,0],history=shootout.history||[];
    const mine=score[game.selfIndex]||0,theirs=score[game.selfIndex===0?1:0]||0;
    const reveal=shootout.stage==="reveal",last=history.at(-1);
    const shotMotion=penaltyZoneMotion[last&&last.shooterZone]||penaltyZoneMotion.center;
    const keeperMotion=penaltyZoneMotion[last&&last.keeperZone]||penaltyZoneMotion.center;
    const role=shootout.selfRole==="shooter"?local("VURUŞ SENDE","YOU SHOOT"):local("KALEYİ SEN KORUYORSUN","YOU KEEP");
    const outcome=last&&({goal:local("GOL","GOAL"),save:local("KURTARIŞ","SAVE"),miss:local("AUT","MISS"),post:local("DİREK","POST")}[last.outcome]||last.outcome);
    const dots=side=>Array.from({length:Math.max(5,Number(shootout.kicks&&shootout.kicks[side])||0)},(_,index)=>{
      const kick=history.filter(item=>item.shooter===side)[index];
      return `<i class="${kick?(kick.goal?"is-goal":"is-miss"):""}"></i>`;
    }).join("");
    return chrome(`${statusStrip(game)}<section class="arena-penalty ${reveal?"is-reveal":""}">
      <header><span>${esc(local("BERABERLİK BOZULUYOR","THE TIE BREAKS HERE"))}</span><h1>${esc(local("PENALTI ATIŞLARI","PENALTY SHOOTOUT"))}</h1><p>${esc(local("Kararlar sunucuda gizli kilitlenir ve yalnızca iki taraf da tamamlayınca açıklanır.","Choices are sealed on the server and revealed only after both sides lock."))}</p></header>
      <div class="arena-penalty-score"><span><b>${esc(game.self&&game.self.clubName||text("you"))}</b><i>${dots(game.selfIndex)}</i></span><strong>${mine}<em>–</em>${theirs}</strong><span><b>${esc(game.opponent&&game.opponent.clubName||text("opponent"))}</b><i>${dots(game.selfIndex===0?1:0)}</i></span></div>
      <div class="arena-penalty-stage">
        <div class="arena-goal" aria-label="${esc(local("Penaltı hedef bölgeleri","Penalty target zones"))}" style="--ball-x:${shotMotion.x};--ball-y:${shotMotion.y};--keeper-x:${keeperMotion.keeperX};--keeper-y:${keeperMotion.keeperY};--keeper-rotate:${keeperMotion.keeperRotate}"><i></i><i></i><i></i><span></span><b class="arena-keeper"></b><em class="arena-ball"></em></div>
        <div class="arena-penalty-call"><small>${esc(local(`${shootout.round||1}. TUR`,`ROUND ${shootout.round||1}`))}</small><h2>${esc(reveal?(outcome||local("VURUŞ","KICK")):role)}</h2>${reveal&&last?`<p>${esc(penaltyZoneLabels[last.shooterZone][root.LANG==="tr"?0:1])} · ${esc(outcome)}</p>`:`<p>${esc(shootout.selfLocked?local("Kararın kilitlendi · rakip bekleniyor","Choice locked · waiting for opponent"):local("Bir bölge seç ve kararını kilitle","Choose a zone and seal your call"))}</p>`}</div>
      </div>
      ${reveal?"":`<div class="arena-penalty-zones" role="group" aria-label="${esc(role)}">${Object.keys(penaltyZoneLabels).map(zone=>`<button data-arena-choice="penalty:${zone}" ${shootout.selfLocked?"disabled":""}><i></i><b>${esc(penaltyZoneLabels[zone][root.LANG==="tr"?0:1])}</b></button>`).join("")}</div>`}
      <footer><span><i class="${shootout.selfLocked?"is-locked":""}"></i>${esc(local("SEN","YOU"))}</span><span><i class="${shootout.opponentLocked?"is-locked":""}"></i>${esc(local("RAKİP","OPPONENT"))}</span></footer>
    </section>`);
  }
  function result(game){
    const outcome=game.result&&game.result.outcomes&&game.result.outcomes[game.selfIndex]||"draw",score=game.result&&game.result.score||game.score||[0,0],mine=score[game.selfIndex],theirs=score[game.selfIndex===0?1:0],penalty=game.result&&game.result.penalty;
    const reward=game.result&&game.result.rewards&&game.result.rewards[game.selfIndex]||{},profile=game.result&&game.result.profiles&&game.result.profiles[game.selfIndex]||null;
    const teams=game.result&&game.result.teams||[],myTeam=teams[game.selfIndex]||game.team||{},theirTeam=teams[game.selfIndex===0?1:0]||game.opponentTeam||{};
    const ratingAfter=profile&&profile.rating!=null?profile.rating:Number(reward.ratingBefore||game.self&&game.self.rating||1000)+Number(reward.ratingDelta||0);
    const decisionMinutes=(game.liveSegments||[]).map(segment=>Number(segment.startMinute)||0);
    const decisions=(game.self&&game.self.tactics||[]).map((choice,index)=>`${decisionMinutes[index]??index*30}' ${choiceLabel("tactics",choice)} / ${choiceLabel("tactics",game.opponent&&game.opponent.tactics&&game.opponent.tactics[index]||"balanced")}`);
    const eventRecap=(game.events||[]).filter(item=>item.type==="goal"||item.type==="card").slice(-8);
    const keyMoments=turningPoints(game);
    const resultLabel=game.result&&game.result.voided?"voided":game.result&&game.result.forfeitIndex!==null&&game.result.forfeitIndex!==undefined?(game.result.forfeitIndex===game.selfIndex?"forfeitLoss":"forfeitWin"):outcome;
    const resultSoundKey=`${game.matchId||"match"}:${mine}:${theirs}:${outcome}`;
    if(outcome==="win"&&state.lastResultSound!==resultSoundKey){state.lastResultSound=resultSoundKey;sfx("win");}
    const practice=game.mode==="practice",rematch=game.rematch||{};
    const rematchButton=rematch.available
      ?`<button class="arena-rematch ${rematch.opponentRequested?"is-incoming":""}" data-arena-action="rematch" ${rematch.requested||rematch.launched?"disabled":""}>${esc(rematch.launched?text("rematchStarting"):rematch.requested?text("rematchSent"):rematch.opponentRequested?text("rematchIncoming"):text("rematch"))}</button>`
      :"";
    return chrome(`<div class="arena-result ${outcome}"><span>${esc(practice?text("practice"):text(resultLabel))}</span><h1>${mine} <i>–</i> ${theirs}</h1>${penalty?`<p>PEN ${penalty[game.selfIndex]}–${penalty[game.selfIndex===0?1:0]}</p>`:""}${practice?`<p>${esc(text("practiceCopy"))}</p>`:""}${game.result&&game.result.voided?`<p>${esc(text("voidedCopy"))}</p>`:""}<div class="arena-result-clubs"><b>${esc(game.self&&game.self.clubName)}</b><i>VS</i><b>${esc(game.opponent&&game.opponent.clubName)}</b></div><div class="arena-result-rewards"><span><small>${esc(text("rating"))}</small><b>${Number(reward.ratingBefore||game.self&&game.self.rating||1000)} → ${ratingAfter}</b><em>${Number(reward.ratingDelta||0)>=0?"+":""}${Number(reward.ratingDelta||0)}</em></span><span><small>${esc(text("season"))}</small><b>+${Number(reward.seasonPoints||0)} P</b></span><span><small>${esc(text("power"))}</small><b><i class="arena-context-power power-${powerBand(myTeam.power)}">${myTeam.power||"—"}</i> – <i class="arena-context-power power-${powerBand(theirTeam.power)}">${theirTeam.power||"—"}</i></b></span><span><small>${esc(text("chemistry"))}</small><b>${myTeam.chemistry==null?"—":myTeam.chemistry} – ${theirTeam.chemistry==null?"—":theirTeam.chemistry}</b></span></div>${keyMoments.length?`<section class="arena-turning-points"><header><b>${esc(arenaLocale({tr:"3 KIRILMA ANI",en:"3 TURNING POINTS",es:"3 MOMENTOS CLAVE",de:"3 SCHLÜSSELMOMENTE",it:"3 MOMENTI CHIAVE"}))}</b><span>${esc(arenaLocale({tr:"MAÇIN HİKÂYESİ",en:"MATCH STORY",es:"HISTORIA DEL PARTIDO",de:"SPIELGESCHICHTE",it:"STORIA DELLA PARTITA"}))}</span></header><div>${keyMoments.map((item,index)=>`<article><i>${String(index+1).padStart(2,"0")}</i><span><small>${item.minute}'</small><b>${esc(item.title)}</b><p>${esc(item.detail)}</p></span></article>`).join("")}</div></section>`:""}${eventRecap.length?`<div class="arena-result-events"><b>${esc(local("MAÇ OLAYLARI","MATCH EVENTS"))}</b>${eventRecap.map(item=>`<span><strong>${Number(item.minute)}'</strong><i class="${item.side===(game.selfIndex===0?"home":"away")?"mine":"theirs"}">${esc(text(item.type==="goal"?"goal":"cardEvent"))} · ${esc(item.side===(game.selfIndex===0?"home":"away")?text("you"):text("opponent"))}</i></span>`).join("")}</div>`:""}${decisions.length?`<div class="arena-result-decisions"><b>${esc(local("TAKTİK ÖZETİ","TACTICAL SUMMARY"))}</b>${decisions.map(item=>`<span>${esc(item)}</span>`).join("")}</div>`:""}<div class="arena-result-actions">${rematchButton}<button class="arena-primary" data-arena-action="${practice?"practice":"queue"}">${esc(practice?text("practiceAgain"):text("searchAgain"))}</button><button class="arena-quiet" data-arena-action="portal">${esc(text("home"))}</button></div></div>`);
  }
  function room(){
    const game=state.room;if(!game)return loading(state.connection==="reconnecting"?text("reconnecting"):text("loading"));
    if(game.phase==="lobby")return lobby(game);
    if(game.phase==="setup")return setup(game);
    if(game.phase==="draft")return draft(game);
    if(game.phase==="market")return market(game);
    if(game.phase==="training")return training(game);
    if(game.phase==="live")return live(game);
    if(game.phase==="penalty")return penalty(game);
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
    else if(state.screen==="custom")html=customRoom();
    else if(state.screen==="room")html=room();
    else if(state.screen==="leaderboard"||state.screen==="history")html=listView(state.screen);
    else if(state.screen==="error")html=errorView(state.lastError);
    element.innerHTML=html;
    if(state.screen==="terms")mountGoogleButton();
    if(state.screen==="room"&&state.room&&state.room.phase==="setup"){
      const phase=element.querySelector(".arena-phase"),draft=setupDraft(state.room);
      if(phase){
        phase.dataset.formations=draft.formation;
        phase.dataset.styles=draft.style;
        const submit=phase.querySelector('[data-arena-action="submit-setup"]');
        if(submit)submit.disabled=state.setupSubmitting||!!(state.room.self&&state.room.self.setup)||!(draft.formation&&draft.style);
      }
    }
    const elapsed=element.querySelector("[data-arena-elapsed]");
    if(elapsed)updateElapsed();
    updateDeadline();
    syncArenaAudio(state.screen==="room"?state.room:null);
  }
  function open(){
    root.closeModal&&root.closeModal();
    document.body.classList.add("arena-active");rootEl().classList.remove("hidden");
    const intro=document.getElementById("intro");if(intro)intro.classList.add("hidden");
    sfx("open");telemetry("arena_opened");
    state.googleUser=jsonGet(GOOGLE_USER_KEY);
    if(!state.googleUser||get(TERMS_KEY)!==TERMS_VERSION||!clubName()){setScreen("terms");return;}
    if(resume())return;
    loadPortal();
  }
  function close(){
    disconnect(false);document.body.classList.remove("arena-active");rootEl().classList.add("hidden");
    const intro=document.getElementById("intro");if(intro)intro.classList.remove("hidden");
    state.screen="closed";
    if(root.CopaModeGate)root.CopaModeGate.show();
  }
  async function loadPortal(){
    setScreen("loading");
    try{
      const [profileData,historyData]=await Promise.all([request("/v1/arena/profile"),request("/v1/arena/history")]);
      state.profile=profileData.profile;state.history=historyData.matches||[];setScreen("portal");
    }catch(error){state.lastError=error.message;setScreen("error");sfx("error");}
  }
  async function startQueue(mode="ranked"){
    if(!navigator.onLine){state.lastError="offline";setScreen("error");return;}
    disconnect(false);if(mode==="ranked")startSearchMusic();setScreen("loading");
    try{
      const data=await request("/v1/arena/session",{method:"POST",body:JSON.stringify({clubName:clubName(),mode,region:"weur"})});
      if(data.recoverMatch){
        const saved={matchId:data.recoverMatch.matchId,token:data.recoverMatch.roomToken,mode};
        state.profile=data.profile;set(ROOM_KEY,JSON.stringify(saved));telemetry("arena_reconnected","session_recovery");connectRoom(saved);return;
      }
      if(data.directMatch){
        const saved={matchId:data.directMatch.matchId,token:data.directMatch.roomToken,mode:"practice"};
        state.profile=data.profile;set(ROOM_KEY,JSON.stringify(saved));telemetry("arena_practice_started","server_bot");connectRoom(saved);return;
      }
      state.profile=data.profile;state.queueStarted=Date.now();setScreen("queue");telemetry("arena_queue_joined","weur",data.profile.rating);sfx("queue");
      connectQueue(data.ticket);
    }catch(error){stopSearchMusic(false);state.lastError=error.message;setScreen("error");sfx("error");}
  }
  function stopCustomPolling(){clearInterval(state.customPoll);state.customPoll=null;}
  function enterCustomMatch(data){
    if(!data||!data.directMatch)return false;
    stopCustomPolling();remove(CUSTOM_ROOM_KEY);
    const saved={matchId:data.directMatch.matchId,token:data.directMatch.roomToken,mode:"custom"};
    set(ROOM_KEY,JSON.stringify(saved));connectRoom(saved);return true;
  }
  async function pollCustomRoom(){
    const code=state.customRoom&&state.customRoom.code;if(!code)return;
    try{const data=await request(`/v1/arena/custom-rooms/${encodeURIComponent(code)}`);if(enterCustomMatch(data))return;state.customRoom=data.room||state.customRoom;if(state.screen==="custom")render();}
    catch(error){stopCustomPolling();state.lastError=error.message;remove(CUSTOM_ROOM_KEY);state.customRoom=null;if(state.screen==="custom")render();}
  }
  function startCustomPolling(){stopCustomPolling();pollCustomRoom();state.customPoll=setInterval(pollCustomRoom,1500);}
  async function createCustomRoom(){
    if(state.customBusy)return;state.customBusy=true;state.lastError="";render();
    try{const data=await request("/v1/arena/custom-rooms",{method:"POST",body:JSON.stringify({clubName:clubName()})});state.customRoom=data.room;set(CUSTOM_ROOM_KEY,JSON.stringify(data.room));startCustomPolling();}
    catch(error){state.lastError=error.message;}finally{state.customBusy=false;if(state.screen==="custom")render();}
  }
  async function joinCustomRoom(){
    const code=String(state.customInput||"").toUpperCase().replace(/[^A-Z2-9]/g,"").slice(0,6);if(code.length!==6)return;
    if(state.customBusy)return;state.customBusy=true;state.lastError="";render();
    try{const data=await request(`/v1/arena/custom-rooms/${encodeURIComponent(code)}`,{method:"POST",body:JSON.stringify({clubName:clubName()})});enterCustomMatch(data);}
    catch(error){state.lastError=error.message;state.customBusy=false;if(state.screen==="custom")render();}
  }
  async function cancelCustomRoom(){
    const code=state.customRoom&&state.customRoom.code;stopCustomPolling();
    try{if(code)await request(`/v1/arena/custom-rooms/${encodeURIComponent(code)}`,{method:"DELETE"});}catch(_){}
    state.customRoom=null;remove(CUSTOM_ROOM_KEY);loadPortal();
  }
  function connectQueue(ticket){
    const socket=new WebSocket(`${wsBase()}/v1/arena/connect?ticket=${encodeURIComponent(ticket)}`);state.socket=socket;
    socket.addEventListener("message",event=>{
      let data;try{data=JSON.parse(event.data);}catch(_){return;}
      if(data.type==="matched"){
        stopSearchMusic(true);telemetry("arena_matched","ranked",Math.round((Date.now()-state.queueStarted)/1000));
        const saved={matchId:data.matchId,token:data.roomToken};set(ROOM_KEY,JSON.stringify(saved));socket.close(1000,"matched");connectRoom(saved);
      }
      if(data.type==="error"){stopSearchMusic(false);state.lastError=data.code||"queue_error";setScreen("error");}
    });
    socket.addEventListener("close",event=>{if(state.screen==="queue"&&event.code!==1000){stopSearchMusic(false);state.lastError="queue_disconnected";setScreen("error");}});
    socket.addEventListener("error",()=>{if(state.screen==="queue"){stopSearchMusic(false);state.lastError="queue_connection";setScreen("error");}});
  }
  function connectRoom(saved){
    state.screen="room";if(!state.room)state.room=null;state.connection=state.retries?"reconnecting":"connecting";render();
    const socket=new WebSocket(`${wsBase()}/v1/arena/rooms/${encodeURIComponent(saved.matchId)}/connect?token=${encodeURIComponent(saved.token)}`);state.socket=socket;
    socket.addEventListener("open",()=>{state.retries=0;state.connection="connected";state.reconnectAt=0;startHeartbeat(socket);if(state.room)socket.send(JSON.stringify({type:"sync"}));render();});
    socket.addEventListener("message",event=>{
      let data;try{data=JSON.parse(event.data);}catch(_){return;}
      if(data.type==="state"){
        const previous=state.room;
        const previousOpponentEmote=previous&&previous.emotes&&previous.emotes.opponent&&Number(previous.emotes.opponent.sequence)||0;
        if(data.state.phase!=="setup"){state.setupDraft=null;state.setupSubmitting=false;}
        if(data.state.phase!=="training"){state.planDraft=null;state.planSubmitting=false;}
        state.room=data.state;state.screen="room";render();
        const nextOpponentEmote=data.state.emotes&&data.state.emotes.opponent&&Number(data.state.emotes.opponent.sequence)||0;
        if(nextOpponentEmote>previousOpponentEmote){
          sfx("emote");clearTimeout(state.emoteHideTimer);
          state.emoteHideTimer=setTimeout(()=>render(),3000);
        }
        if(previous&&previous.phase!==data.state.phase)telemetry("arena_phase_completed",previous.phase);
        if(data.state.phase==="result"){
          state.forfeitConfirm=false;
          const settled=data.state.result&&data.state.result.profiles&&data.state.result.profiles[data.state.selfIndex];
          if(settled)state.profile=settled;
          remove(ROOM_KEY);telemetry("arena_match_completed",data.state.result.voided?"void":data.state.result.outcomes[data.state.selfIndex]);
          const matchId=data.state.matchId||saved.matchId;
          if(data.state.mode!=="practice"&&matchId&&state.lastArenaAdMatchId!==matchId){
            state.lastArenaAdMatchId=matchId;
            setTimeout(()=>{if(root.CopaAds&&typeof root.CopaAds.showArenaEnd==="function")root.CopaAds.showArenaEnd(matchId).catch(()=>{});},650);
          }
        }
      }
      if(data.type==="rematch"){
        const next={matchId:data.matchId,token:data.roomToken,mode:"ranked"};
        set(ROOM_KEY,JSON.stringify(next));state.room=null;state.retries=0;sfx("match");connectRoom(next);
      }
      if(data.type==="pong"&&state.pingAt){
        state.latency=Math.max(0,Date.now()-state.pingAt);state.pingAt=0;
        const band=state.latency<180?"good":state.latency<450?"fair":"poor",now=Date.now();
        if(band!==state.lastNetworkBand||now-state.lastNetworkTelemetry>60_000){
          state.lastNetworkBand=band;state.lastNetworkTelemetry=now;telemetry("arena_network_quality",band,state.latency);
        }
        const mark=rootEl().querySelector(".arena-live-mark");
        if(mark){
          const live=state.room&&["live","penalty"].includes(state.room.phase);
          mark.className=`arena-live-mark ${live?"is-live":"is-online"} is-${band}`;
          mark.innerHTML=`<i></i> ${esc(live?`LIVE · ${state.latency}ms`:`${text("network"+band[0].toUpperCase()+band.slice(1))} ${state.latency}ms`)}`;
        }
      }
      if(data.type==="ack"&&data.status&&data.status!=="ok"){
        if(state.room&&state.room.phase==="setup"&&data.status!=="already_submitted")state.setupSubmitting=false;
        if(state.room&&state.room.phase==="training"&&data.status!=="already_submitted")state.planSubmitting=false;
        render();
        if(data.status!=="already_submitted")sfx("error");
      }
    });
    socket.addEventListener("close",event=>{
      if(state.socket===socket){clearInterval(state.heartbeat);state.heartbeat=null;}
      if(state.socket!==socket)return;
      if(state.screen!=="room"||state.room&&state.room.phase==="result"||event.code===1000)return;
      if(state.retries>=8){state.lastError="room_reconnect_failed";telemetry("arena_error","reconnect_exhausted",state.retries);setScreen("error");return;}
      state.retries++;const delay=Math.min(8000,700*Math.pow(2,state.retries));
      state.connection="reconnecting";state.reconnectAt=Date.now()+delay;telemetry("arena_reconnect_started","grace",state.retries);render();
      clearTimeout(state.retryTimer);state.retryTimer=setTimeout(()=>{telemetry("arena_reconnected","retry",state.retries);connectRoom(saved);},delay);
    });
    socket.addEventListener("error",()=>{});
  }
  function disconnect(cancel=true){
    clearInterval(state.timer);state.timer=null;
    clearInterval(state.heartbeat);state.heartbeat=null;
    clearInterval(state.deadlineTimer);state.deadlineTimer=null;
    stopArenaClock();
    clearTimeout(state.retryTimer);state.retryTimer=null;state.connection="idle";state.reconnectAt=0;
    clearTimeout(state.emoteCooldownTimer);state.emoteCooldownTimer=null;clearTimeout(state.emoteHideTimer);state.emoteHideTimer=null;state.emoteMenu=false;state.emoteReadyAt=0;state.forfeitConfirm=false;state.liveEventCues.clear();stopCustomPolling();
    if(state.screen==="queue"||cancel)stopSearchMusic(false);
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
      if(state.screen==="room"&&state.socket===socket&&socket.readyState===1){state.pingAt=Date.now();socket.send(JSON.stringify({type:"ping"}));socket.send(JSON.stringify({type:"sync"}));}
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
      const matchClock=document.querySelector("[data-arena-match-clock]");
      if(matchClock&&matchClock.dataset.revealing==="true"){
        const start=Number(matchClock.dataset.startMinute)||0,end=Number(matchClock.dataset.endMinute)||90;
        const segmentDuration=7000;
        const progress=Math.max(0,Math.min(1,1-(Number(matchClock.dataset.deadline)-Date.now())/segmentDuration));
        const minute=Math.round(start+(end-start)*progress);
        matchClock.textContent=`${minute}'`;
        const liveScore=document.querySelector("[data-arena-live-score]");
        if(liveScore){
          let mine=Number(liveScore.dataset.baseMine)||0,theirs=Number(liveScore.dataset.baseTheirs)||0;
          String(liveScore.dataset.goals||"").split(",").filter(Boolean).forEach((item,index)=>{
            const [goalMinute,side]=item.split(":").map(Number);
            if(goalMinute<=minute){
              if(side===0)mine++;else theirs++;
              const room=state.room||{},cue=`${room.matchId||"match"}:${room.window}:${goalMinute}:${side}:${index}`;
              if(!state.liveEventCues.has(cue)){state.liveEventCues.add(cue);sfx("goal");}
            }
          });
          liveScore.innerHTML=`${mine}<i>–</i>${theirs}`;
        }
      }
      const reconnect=document.querySelector("[data-arena-reconnect-countdown]");if(reconnect)reconnect.textContent=`${Math.max(0,Math.ceil((state.reconnectAt-Date.now())/1000))}s`;
      if(seconds===0&&state.socket&&state.socket.readyState===1)state.socket.send(JSON.stringify({type:"sync"}));
    };
    paint();state.deadlineTimer=setInterval(paint,1000);
  }
  async function showLeaderboard(){
    setScreen("loading");try{state.leaderboard=(await request("/v1/arena/leaderboard?limit=25")).entries||[];setScreen("leaderboard");}catch(error){state.lastError=error.message;setScreen("error");}
  }
  function onChange(event){
    if(event.target.matches("[data-arena-club]"))set(CLUB_KEY,event.target.value.trim());
    if(event.target.matches("[data-arena-custom-code]")){state.customInput=event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,"").slice(0,6);event.target.value=state.customInput;}
    if(event.target.matches("[data-arena-forfeit-check]")){
      const confirmButton=rootEl().querySelector('[data-arena-action="confirm-forfeit"]');
      if(confirmButton)confirmButton.disabled=!event.target.checked;
    }
  }
  function selectChoice(button){
    if(button.disabled)return;
    const [kind,value]=button.dataset.arenaChoice.split(":");
    if(["draft","market","training","tactics","penalty"].includes(kind)){
      const group=button.parentElement;
      if(group)group.querySelectorAll("button").forEach(item=>{
        item.disabled=true;item.classList.toggle("is-selected",item===button);item.setAttribute("aria-pressed",String(item===button));
      });
      const type=kind==="tactics"?"tactic":kind;
      if(kind==="draft"){
        const current=Number(state.room&&state.room.draftStatus&&state.room.draftStatus.budget);
        const cost=Number(button.dataset.arenaCost)||0;
        const cash=rootEl().querySelector(".arena-budget-state .arena-context-budget");
        if(cash&&Number.isFinite(current))cash.textContent=`€${Math.max(0,current-cost)}M`;
      }
      if(!send({type,choice:value})&&group)group.querySelectorAll("button").forEach(item=>{item.disabled=false;item.classList.remove("is-selected");item.setAttribute("aria-pressed","false");});
      return;
    }
    const group=button.closest(".arena-choice-grid");group.querySelectorAll("button").forEach(item=>item.classList.toggle("is-selected",item===button));
    group.querySelectorAll("button").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
    const phase=button.closest(".arena-phase");if(phase)phase.dataset[kind]=value;
    if(state.room&&state.room.phase==="setup"){
      const draft=setupDraft(state.room);
      if(kind==="formations")draft.formation=value;
      if(kind==="styles")draft.style=value;
    }
    const submit=phase&&phase.querySelector('[data-arena-action="submit-setup"]');
    if(submit)submit.disabled=!(phase.dataset.formations&&phase.dataset.styles);
  }
  function onClick(event){
    const emoteChoice=event.target.closest("[data-arena-emote]");
    if(emoteChoice&&state.room&&Date.now()>=Number(state.emoteReadyAt||0)){
      const emote=emoteChoice.dataset.arenaEmote;
      state.emoteMenu=false;
      if(send({type:"emote",emote})){
        state.emoteReadyAt=Date.now()+4000;
        clearTimeout(state.emoteCooldownTimer);
        state.emoteCooldownTimer=setTimeout(()=>{state.emoteReadyAt=0;refresh();},4050);
      }
      render();return;
    }
    const planChoice=event.target.closest("[data-arena-plan]");
    if(planChoice&&!planChoice.disabled&&state.room&&state.room.phase==="training"){
      const [kind,value]=planChoice.dataset.arenaPlan.split(":");
      const draft=matchPlanDraft(state.room);
      if(kind==="focus")draft.focus=value;
      if(kind==="scenario")draft.scenario=value;
      render();return;
    }
    const choice=event.target.closest("[data-arena-choice]");if(choice){selectChoice(choice);return;}
    const button=event.target.closest("[data-arena-action]");if(!button)return;
    const action=button.dataset.arenaAction;
    if(action==="open-forfeit"){state.forfeitConfirm=true;state.emoteMenu=false;render();return;}
    if(action==="cancel-forfeit"){state.forfeitConfirm=false;render();return;}
    if(action==="confirm-forfeit"){
      const check=rootEl().querySelector("[data-arena-forfeit-check]");
      if((!state.room||state.room.mode!=="practice")&&(!check||!check.checked))return;
      button.disabled=true;if(send({type:"forfeit"}))state.forfeitConfirm=false;
      return;
    }
    if(action==="toggle-emotes"){state.emoteMenu=!state.emoteMenu;render();return;}
    if(action==="google"){nativeGoogleSignIn();return;}
    if(action==="guide"){
      if(root.CopaHowtoGuide)root.CopaHowtoGuide.open(null,"arena");
      else if(typeof root._loadHowtoGuide==="function")root._loadHowtoGuide().then(api=>api.open(null,"arena")).catch(()=>{});
      else if(typeof root.openHowtoModal==="function")root.openHowtoModal("arena");
      return;
    }
    if(action==="guest"){continueAsGuest();return;}
    if(action==="close"){
      if(state.screen==="room"&&state.room&&state.room.phase!=="result"&&!root.confirm(local("Devam eden Arena maçından ayrılmak istediğine emin misin? Süre dolunca otomatik karar verilir.","Leave the active Arena match? Automatic choices will be made when timers expire.")))return;
      close();return;
    }
    if(action==="accept"){
      const input=rootEl().querySelector("[data-arena-club]"),name=input&&input.value.trim();
      if(!name||name.length<2){input&&input.focus();return;}
      set(CLUB_KEY,name);set(TERMS_KEY,TERMS_VERSION);loadPortal();return;
    }
    if(action==="queue"){startQueue("ranked");return;}
    if(action==="custom-room"){state.lastError="";state.customRoom=jsonGet(CUSTOM_ROOM_KEY);state.customInput="";setScreen("custom");if(state.customRoom)startCustomPolling();return;}
    if(action==="create-custom"){createCustomRoom();return;}
    if(action==="join-custom"){joinCustomRoom();return;}
    if(action==="cancel-custom"){cancelCustomRoom();return;}
    if(action==="copy-custom-code"){
      const code=state.customRoom&&state.customRoom.code||"";
      if(code&&navigator.clipboard)navigator.clipboard.writeText(code).catch(()=>{});
      button.textContent=arenaLocale({tr:"KOPYALANDI",en:"COPIED",es:"COPIADO",de:"KOPIERT",it:"COPIATO"});
      return;
    }
    if(action==="rematch"){send({type:"rematch"});return;}
    if(action==="practice"){startQueue("practice");return;}
    if(action==="cancel"){disconnect(true);loadPortal();return;}
    if(action==="ready"){send({type:"ready"});return;}
    if(action==="submit-setup"){
      const phase=button.closest(".arena-phase"),choice={formation:phase.dataset.formations,style:phase.dataset.styles};
      state.setupSubmitting=true;button.disabled=true;button.textContent=text("waiting");
      if(!send({type:"setup",choice})){state.setupSubmitting=false;render();}
      return;
    }
    if(action==="submit-plan"){
      const draft=matchPlanDraft(state.room);
      if(!(draft.focus&&draft.scenario))return;
      state.planSubmitting=true;button.disabled=true;button.textContent=text("waiting");
      if(!send({type:"training",choice:{focus:draft.focus,scenario:draft.scenario}})){state.planSubmitting=false;render();}
      return;
    }
    if(action==="portal"){disconnect(false);loadPortal();return;}
    if(action==="history"){setScreen("history");return;}
    if(action==="leaderboard"){showLeaderboard();return;}
    if(action==="delete-data"){
      if(!root.confirm(text("deleteConfirm")))return;
      request("/v1/arena/profile",{method:"DELETE"}).then(()=>{
        remove(TOKEN_KEY);remove(TERMS_KEY);remove(CLUB_KEY);remove(ROOM_KEY);remove(GOOGLE_USER_KEY);state.googleUser=null;state.profile=null;state.history=[];setScreen("terms");
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
  document.addEventListener("visibilitychange",()=>syncArenaAudio(state.screen==="room"?state.room:null));
  root.CopaArena={open,close,refresh,resume,state,finishGoogleSignIn};
})(window);
