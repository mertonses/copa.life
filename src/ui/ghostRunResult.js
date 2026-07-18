(function(global){
  "use strict";

  const COPY={
    tr:{
      kicker:"HAYALET KULÜP",
      title:"HAYALET KULÜBÜN HAZIR",
      message:"Bu run artık Hayalet Kulüp havuzunda.<br><strong>Kadro seçimlerin, dizilişin ve oyun tarzın başka oyuncuların karşısına çıkabilir.</strong>",
      support:"Run sona erdi. Kulübün ise yaşamaya devam ediyor.",
      status:"HAVUZDA",
      club:"KULÜP",
      reached:"ULAŞILAN TUR",
      formation:"SON DİZİLİŞ",
      power:"KADRO GÜCÜ",
      chairman:"BAŞKAN TİPİ",
      seed:"SEED",
      restart:"YENİ RUN BAŞLAT",
      copySeed:"SEED’İ KOPYALA",
      copied:"SEED KOPYALANDI",
      share:"PAYLAŞ",
      enable:"İZİN VER VE HAVUZA EKLE",
      pendingTitle:"RUN YAŞAMAYA DEVAM EDEBİLİR",
      pendingMessage:"Bu run henüz Hayalet Kulüp havuzunda değil.<br><strong>Açık izin verirsen kadro seçimlerin, dizilişin ve oyun tarzın başka oyuncuların karşısına çıkabilir.</strong>",
      pendingSupport:"Paylaşım isteğe bağlıdır; iznin olmadan oyun verisi yüklenmez.",
      pendingStatus:"HENÜZ HAVUZDA DEĞİL",
      close:"Kapat"
    },
    en:{
      kicker:"GHOST CLUB",
      title:"YOUR GHOST CLUB IS READY",
      message:"This run is now in the Ghost Club pool.<br><strong>Your squad choices, formation and playing style may face other players.</strong>",
      support:"The run is over. Your club keeps living.",
      status:"IN THE POOL",
      club:"CLUB",
      reached:"ROUND REACHED",
      formation:"FINAL FORMATION",
      power:"SQUAD POWER",
      chairman:"CHAIRMAN TYPE",
      seed:"SEED",
      restart:"START NEW RUN",
      copySeed:"COPY SEED",
      copied:"SEED COPIED",
      share:"SHARE",
      enable:"ALLOW AND ADD TO POOL",
      pendingTitle:"THIS RUN CAN LIVE ON",
      pendingMessage:"This run is not in the Ghost Club pool yet.<br><strong>With your explicit permission, your squad choices, formation and playing style may face other players.</strong>",
      pendingSupport:"Sharing is optional; no game data is uploaded without your permission.",
      pendingStatus:"NOT IN THE POOL YET",
      close:"Close"
    },
    es:{title:"TU CLUB FANTASMA ESTÁ LISTO",restart:"NUEVA PARTIDA",copySeed:"COPIAR SEED",copied:"SEED COPIADO",share:"COMPARTIR",close:"Cerrar"},
    de:{title:"DEIN GEISTERCLUB IST BEREIT",restart:"NEUEN RUN STARTEN",copySeed:"SEED KOPIEREN",copied:"SEED KOPIERT",share:"TEILEN",close:"Schließen"},
    it:{title:"IL TUO GHOST CLUB È PRONTO",restart:"NUOVO RUN",copySeed:"COPIA SEED",copied:"SEED COPIATO",share:"CONDIVIDI",close:"Chiudi"}
  };
  let stylesReady=false;

  function copyFor(lang){
    return Object.assign({},COPY.en,COPY[lang]||{});
  }
  function esc(value){
    return String(value==null?"—":value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
  function ensureStyles(){
    if(stylesReady||document.querySelector('link[data-ghost-run-result]')){stylesReady=true;return;}
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="src/styles/ghostRunResult.css?v=20260718-ghost-result2";
    link.dataset.ghostRunResult="";
    document.head.appendChild(link);
    stylesReady=true;
  }
  function fallbackCopy(value,onDone){
    const area=document.createElement("textarea");
    area.value=value;
    area.style.cssText="position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    try{document.execCommand("copy");onDone();}finally{area.remove();}
  }
  function copySeed(data,button,copy){
    const done=()=>{
      button.textContent=copy.copied;
      window.setTimeout(()=>{button.textContent=copy.copySeed;},1800);
    };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(data.seed).then(done).catch(()=>fallbackCopy(data.seed,done));
    }else fallbackCopy(data.seed,done);
  }
  function fact(label,value){
    return `<div class="ghost-run-fact"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;
  }
  function open(data,actions){
    if(!data||!data.completed||typeof global.showModal!=="function")return false;
    ensureStyles();
    const copy=copyFor(data.lang);
    const shared=!!data.shared;
    const title=shared?copy.title:copy.pendingTitle;
    const message=shared?copy.message:copy.pendingMessage;
    const support=shared?copy.support:copy.pendingSupport;
    const status=shared?copy.status:copy.pendingStatus;
    const icon=global.GhostClubs&&typeof global.GhostClubs.ghostIcon==="function"
      ?global.GhostClubs.ghostIcon():"";
    const html=`<section class="ghost-run-shell" role="document">
      <header class="ghost-run-head">
        <span class="ghost-run-mark" aria-hidden="true">${icon}</span>
        <div><span class="ghost-run-kicker">${esc(copy.kicker)}</span><h2>${esc(title)}</h2></div>
        <button class="ghost-run-close" type="button" data-ghost-close aria-label="${esc(copy.close)}">×</button>
      </header>
      <p class="ghost-run-message">${message}</p>
      <article class="ghost-run-card">
        <div class="ghost-run-card-top">
          <div><span class="ghost-run-card-label">${esc(copy.club)}</span><b class="ghost-run-club">${esc(data.club)}</b></div>
          <span class="ghost-run-status${shared?"":" is-pending"}">${esc(status)}</span>
        </div>
        <div class="ghost-run-facts">
          ${fact(copy.reached,data.reached)}
          ${fact(copy.formation,data.formation)}
          ${fact(copy.power,data.power)}
          ${fact(copy.chairman,data.chairman)}
        </div>
        <div class="ghost-run-seed-row"><span class="ghost-run-card-label">${esc(copy.seed)}</span><code>${esc(data.seed)}</code></div>
      </article>
      <p class="ghost-run-support">${esc(support)}</p>
      <footer class="ghost-run-actions">
        ${shared?"":`<button class="btn btn-primary ghost-run-enable" type="button" data-ghost-enable>${esc(copy.enable)}</button>`}
        <button class="btn btn-primary ghost-run-primary" type="button" data-ghost-restart>${esc(copy.restart)}</button>
        <button class="btn btn-ghost" type="button" data-ghost-seed>${esc(copy.copySeed)}</button>
        <button class="btn ghost-run-share" type="button" data-ghost-share>${esc(copy.share)}</button>
      </footer>
    </section>`;
    global.showModal(html,{dismissOnOverlay:true,label:title,bare:true});
    const modal=document.getElementById("modal");
    if(!modal)return false;
    modal.querySelector("[data-ghost-close]")?.addEventListener("click",()=>global.closeModal());
    modal.querySelector("[data-ghost-restart]")?.addEventListener("click",()=>{
      global.closeModal();
      if(actions&&typeof actions.restart==="function")actions.restart();
    });
    modal.querySelector("[data-ghost-seed]")?.addEventListener("click",event=>copySeed(data,event.currentTarget,copy));
    modal.querySelector("[data-ghost-enable]")?.addEventListener("click",()=>{
      global.closeModal();
      if(actions&&typeof actions.enable==="function")actions.enable();
    });
    modal.querySelector("[data-ghost-share]")?.addEventListener("click",()=>{
      global.closeModal();
      window.setTimeout(()=>{if(actions&&typeof actions.share==="function")actions.share();},0);
    });
    return true;
  }

  global.CopaGhostRunResult=Object.freeze({open});
})(window);
