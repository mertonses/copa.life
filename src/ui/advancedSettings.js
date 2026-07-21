/* Advanced-settings helpers loaded only when the panel is opened. */
(function(global){
  "use strict";
  const input=()=>document.getElementById("seedInput");
  const text=(tr,en,es,de,it)=>typeof global.LT==="function"?global.LT(tr,en,es,de,it):(global.LANG==="tr"?tr:en);
  function refreshCopy(){
    const set=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value;};
    set("advancedRunTitle",text("RUN AYARLARI","RUN SETTINGS","AJUSTES DEL RUN","RUN-EINSTELLUNGEN","IMPOSTAZIONI RUN"));
    set("advancedGhostTitle","GHOST CLUB");
    set("ghostHelpToggle","?");
    set("ghostHelpCopy",text(
      "Ghost Club, gerçek oyuncuların tamamladığı run'lardan oluşan rakip havuzudur. Rakip, paylaşım ve Dünya sıralaması birbirinden bağımsızdır; yalnız açtığın özellik veri gönderir.",
      "Ghost Club is a pool of opponents created from completed runs by real players. Opponents, sharing and the World ranking are independent; only features you enable send data.",
      "Ghost Club es un grupo de rivales creado con partidas terminadas por jugadores reales. Rivales, compartir y clasificación mundial son independientes; solo envían datos las funciones que activas.",
      "Ghost Club ist ein Gegnerpool aus abgeschlossenen Runs echter Spieler. Gegner, Teilen und Weltrangliste sind unabhängig; nur aktivierte Funktionen senden Daten.",
      "Ghost Club è un gruppo di avversari creato dai run completati da giocatori reali. Avversari, condivisione e classifica mondiale sono indipendenti; solo le funzioni attivate inviano dati."
    ));
    set("advancedPrivacyTitle",text("VERİ VE GİZLİLİK","DATA & PRIVACY","DATOS Y PRIVACIDAD","DATEN & DATENSCHUTZ","DATI E PRIVACY"));
    set("seedRandomBtn",text("🎲 Rastgele","🎲 Random","🎲 Aleatorio","🎲 Zufällig","🎲 Casuale"));
    set("seedPasteBtn",text("📋 Yapıştır","📋 Paste","📋 Pegar","📋 Einfügen","📋 Incolla"));
    set("seedHint",text("Aynı seed, aynı başlangıç koşullarını yeniden üretir.","The same seed recreates the same starting conditions.","La misma seed recrea las mismas condiciones iniciales.","Derselbe Seed erzeugt dieselben Startbedingungen.","Lo stesso seed ricrea le stesse condizioni iniziali."));
    set("finalReplayImportBtn",text("FİNAL TEKRAR KODU","FINAL REPLAY CODE","CÓDIGO DE REPETICIÓN FINAL","FINAL-REPLAY-CODE","CODICE REPLAY FINALE"));
    set("metaProgressBtn",text("KULÜP KARİYERİ VE KAYIT","CLUB CAREER & SAVE","CARRERA DEL CLUB Y GUARDADO","VEREINSKARRIERE & SPEICHERSTAND","CARRIERA CLUB E SALVATAGGIO"));
    const field=input();if(field)field.placeholder=text("Rastgele oluşturulur","Generated randomly","Se genera al azar","Wird zufällig erzeugt","Generato casualmente");
    const helpToggle=document.getElementById("ghostHelpToggle");
    if(helpToggle){
      const label=text("Ghost Club nedir?","What is Ghost Club?","¿Qué es Ghost Club?","Was ist Ghost Club?","Cos'è Ghost Club?");
      helpToggle.setAttribute("aria-label",label);
      helpToggle.setAttribute("title",label);
    }
  }
  function ensureMarkup(body){
    if(!body||body.dataset.ready==="1")return;
    const seedValue=input()&&input().value||"";
    body.dataset.ready="1";
    body.innerHTML=`<section class="advanced-section" aria-labelledby="advancedRunTitle"><h3 class="advanced-section-title" id="advancedRunTitle"></h3><div class="advanced-card advanced-seed-card"><div class="seedwrap"><label for="seedInput">Seed</label><div class="seed-control-row"><input id="seedInput" maxlength="14" autocomplete="off" autocapitalize="characters"><button class="seed-helper-btn" id="seedRandomBtn" type="button" onclick="CopaAdvancedSettings.randomizeSeedInput()"></button><button class="seed-helper-btn" id="seedPasteBtn" type="button" onclick="CopaAdvancedSettings.pasteSeedInput()"></button></div><span class="seed-hint" id="seedHint"></span></div></div><div class="advanced-run-tools"><button class="btn btn-ghost final-replay-import-btn" id="finalReplayImportBtn" type="button" onclick="openFinalReplayImport()"></button><button class="btn btn-ghost final-replay-import-btn" id="metaProgressBtn" type="button" onclick="CopaLazy.openMetaProgression()"></button></div></section><section class="advanced-section" aria-labelledby="advancedGhostTitle"><div class="advanced-section-heading"><h3 class="advanced-section-title" id="advancedGhostTitle"></h3><details class="advanced-help"><summary id="ghostHelpToggle"></summary><p id="ghostHelpCopy"></p></details></div><div id="advancedGhostSettingSlot" class="advanced-card advanced-ghost-slot"></div></section><section class="advanced-section" aria-labelledby="advancedPrivacyTitle"><h3 class="advanced-section-title" id="advancedPrivacyTitle"></h3><div id="advancedPrivacySlot" class="advanced-card advanced-privacy-slot"></div></section>`;
    input().value=seedValue;
    refreshCopy();if(global.GhostClubs&&typeof global.GhostClubs.ensureSetting==="function")global.GhostClubs.ensureSetting();
  }
  function randomizeSeedInput(){
    const field=input();if(!field)return;
    let value=Date.now()>>>0;
    try{if(global.crypto&&typeof global.crypto.getRandomValues==="function"){const values=new Uint32Array(1);global.crypto.getRandomValues(values);value=values[0];}}catch(_){}
    field.value=String(10000+(value%90000));field.focus();
  }
  async function pasteSeedInput(){
    const field=input();if(!field)return;
    try{
      if(!navigator.clipboard||typeof navigator.clipboard.readText!=="function")throw new Error("clipboard unavailable");
      const value=String(await navigator.clipboard.readText()||"").replace(/[\r\n\t]+/g,"").trim().slice(0,Number(field.maxLength)||14);
      if(!value)throw new Error("clipboard empty");field.value=value;field.focus();
    }catch(_){
      if(typeof global.showToast==="function")global.showToast(text("Panodan seed okunamadı.","Could not read a seed from the clipboard.","No se pudo leer la seed del portapapeles.","Seed konnte nicht aus der Zwischenablage gelesen werden.","Impossibile leggere il seed dagli appunti."));
    }
  }
  global.CopaAdvancedSettings=Object.freeze({ensureMarkup,refreshCopy,randomizeSeedInput,pasteSeedInput});
})(window);
