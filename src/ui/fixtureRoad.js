(function(global){
  "use strict";

  const COPY={
    tr:{current:"Sıradaki maç",won:"Kazandı",draw:"Berabere",lost:"Kaybetti",locked:"Kilitli",reveal:"Rakip tur sonrası belli olur",opponent:"Rakip",score:"Skor",penalties:"Penaltılar",event:"Önemli olay",noEvent:"Kayıtlı önemli olay yok",close:"Detayı kapat",cup:"Kupa",champion:"Şampiyon",progress:"Kupa ilerlemesi"},
    en:{current:"Next match",won:"Won",draw:"Draw",lost:"Lost",locked:"Locked",reveal:"Opponent revealed after the round",opponent:"Opponent",score:"Score",penalties:"Penalties",event:"Key event",noEvent:"No key event recorded",close:"Close details",cup:"Cup",champion:"Champion",progress:"Cup progress"},
    es:{current:"Próximo partido",won:"Victoria",draw:"Empate",lost:"Derrota",locked:"Bloqueado",reveal:"El rival se revela tras la ronda",opponent:"Rival",score:"Marcador",penalties:"Penaltis",event:"Momento clave",noEvent:"Sin momento clave registrado",close:"Cerrar detalle",cup:"Copa",champion:"Campeón",progress:"Progreso de copa"},
    de:{current:"Nächstes Spiel",won:"Sieg",draw:"Remis",lost:"Niederlage",locked:"Gesperrt",reveal:"Gegner wird nach der Runde enthüllt",opponent:"Gegner",score:"Ergebnis",penalties:"Elfmeterschießen",event:"Schlüsselmoment",noEvent:"Kein Schlüsselmoment gespeichert",close:"Details schließen",cup:"Pokal",champion:"Meister",progress:"Pokalfortschritt"},
    it:{current:"Prossima partita",won:"Vittoria",draw:"Pareggio",lost:"Sconfitta",locked:"Bloccato",reveal:"L'avversario appare dopo il turno",opponent:"Avversario",score:"Risultato",penalties:"Rigori",event:"Momento chiave",noEvent:"Nessun momento chiave registrato",close:"Chiudi dettagli",cup:"Coppa",champion:"Campione",progress:"Progresso coppa"}
  };
  const LOCK='<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2"/><path d="M7 8V6a3 3 0 0 1 6 0v2"/></svg>';
  const CUP='<svg viewBox="0 0 28 32" aria-hidden="true"><path d="M8 3h12v11a6 6 0 0 1-12 0Z"/><path d="M8 7H4Q4 17 8 15M20 7h4Q24 17 20 15M14 20v6M9 26h10M7 30h14"/></svg>';
  let selected=-1;

  const currentLang=()=>typeof LANG!=="undefined"?LANG:"en";
  const copy=()=>COPY[currentLang()]||COPY.en;
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const fixtureList=()=>typeof fixtures!=="undefined"&&Array.isArray(fixtures)?fixtures:[];
  const currentRound=()=>typeof round!=="undefined"?Math.max(1,Number(round)||1):1;
  const labels=()=>{
    const data=typeof L==="function"?L():{};
    return data.rounds||["Round 1","Round 2","Last 16","Quarter-final","Semi-final","Final"];
  };

  function ensureStyle(){
    if(document.querySelector("link[data-copa-fixture-road]"))return;
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="src/styles/fixtureRoad.css?v=20260718-fixture1";
    link.dataset.copaFixtureRoad="1";
    document.head.appendChild(link);
  }

  function resultCopy(result){
    const c=copy();
    return result==="W"?c.won:result==="D"?c.draw:result==="L"?c.lost:"";
  }

  function opponentVisual(fixture,hidden){
    if(hidden)return `<span class="fixture-lock">${LOCK}</span>`;
    const name=fixture&&fixture.opp||"";
    const maps={
      ENG:typeof CLUB_LOGOS_EN_SM!=="undefined"?CLUB_LOGOS_EN_SM:null,
      ES:typeof CLUB_LOGOS_ES_SM!=="undefined"?CLUB_LOGOS_ES_SM:null,
      IT:typeof CLUB_LOGOS_IT_SM!=="undefined"?CLUB_LOGOS_IT_SM:null,
      DE:typeof CLUB_LOGOS_DE_SM!=="undefined"?CLUB_LOGOS_DE_SM:null,
      JP:typeof CLUB_LOGOS_JP_SM!=="undefined"?CLUB_LOGOS_JP_SM:null
    };
    const country=typeof selectedCountry!=="undefined"?selectedCountry:"TR";
    const fallback=typeof CLUB_LOGOS_SM!=="undefined"?CLUB_LOGOS_SM:null;
    const map=maps[country]||fallback;
    const source=!global.COPA_IS_NATIVE&&map&&map[name];
    if(source)return `<img class="fixture-club-logo" src="${esc(source)}" alt="" loading="lazy" decoding="async">`;
    if(global.CopaClubVisuals&&typeof global.CopaClubVisuals.svgFor==="function")return global.CopaClubVisuals.svgFor(name,22,26);
    return `<span class="fixture-monogram" aria-hidden="true">${esc(name.split(/\s+/).map(item=>item[0]).join("").slice(0,2).toUpperCase()||"XI")}</span>`;
  }

  function eventText(fixture,index){
    if(fixture&&fixture.note)return fixture.note;
    const events=fixture&&Array.isArray(fixture.events)?fixture.events:[];
    const event=[...events].reverse().find(item=>item&&(item.type==="goal"||item.type==="red"||item.type==="penalty"))||events[events.length-1];
    if(event){
      const minute=Number.isFinite(Number(event.min))?`${event.min}' `:Number.isFinite(Number(event.minute))?`${event.minute}' `:"";
      const type=event.type==="goal"?(currentLang()==="tr"?"Gol":"Goal"):event.type==="red"?(currentLang()==="tr"?"Kırmızı kart":"Red card"):event.type==="penalty"?(currentLang()==="tr"?"Penaltı":"Penalty"):"";
      return `${minute}${type}${event.name?` · ${event.name}`:""}`.trim();
    }
    const list=fixtureList();
    const lastPlayed=list.reduce((last,item,i)=>item&&item.res?i:last,-1);
    if(index===lastPlayed&&index===5&&typeof keyMoment!=="undefined"&&keyMoment)return keyMoment;
    return "";
  }

  function penaltyScore(fixture,index){
    if(fixture&&Array.isArray(fixture.penalty))return fixture.penalty;
    const report=global.lastMatchReportData;
    const list=fixtureList();
    const lastPlayed=list.reduce((last,item,i)=>item&&item.res?i:last,-1);
    if(index===lastPlayed&&report&&Array.isArray(report.penalty))return report.penalty;
    return null;
  }

  function nodeMarkup(fixture,index,roundLabels){
    const c=copy(),played=!!fixture.res,active=!played&&index===currentRound()-1,locked=!played&&!active;
    const state=played?fixture.res:active?"current":"locked";
    const result=played?resultCopy(fixture.res):active?c.current:c.locked;
    const score=played?`${fixture.gf}–${fixture.ga}`:"";
    const opponent=locked?c.reveal:fixture.opp||c.opponent;
    const aria=played?`${roundLabels[index]}, ${opponent}, ${score}, ${result}`:active?`${roundLabels[index]}, ${c.current}, ${opponent}`:`${roundLabels[index]}, ${c.locked}, ${c.reveal}`;
    return `<button type="button" class="fix fixture-node ${played?"is-played":""} ${active?"cur is-active":""} ${locked?"is-locked":""} ${fixture.res==="W"?"win":fixture.res==="D"?"draw":fixture.res==="L"?"lose":""}" data-fixture-index="${index}" data-fixture-state="${state}" aria-label="${esc(aria)}" aria-expanded="${selected===index}">
      <span class="fr">${esc(roundLabels[index]||String(index+1))}</span>
      <span class="fixture-visual">${opponentVisual(fixture,locked)}</span>
      <span class="fixture-node-main">${played?`<b class="fs">${esc(score)}</b><em class="fixture-result result-${fixture.res.toLowerCase()}">${fixture.res} · ${esc(result)}</em>`:active?`<b class="fixture-opponent">${esc(opponent)}</b><em class="fixture-result is-current">${esc(c.current)}</em>`:`<b class="fixture-reveal">${esc(c.reveal)}</b>`}</span>
    </button>`;
  }

  function detailMarkup(index){
    const list=fixtureList(),fixture=list[index],c=copy(),roundLabels=labels();
    if(!fixture)return"";
    const played=!!fixture.res,active=!played&&index===currentRound()-1,locked=!played&&!active;
    if(locked)return `<div class="fixture-detail-copy"><span>${esc(roundLabels[index])}</span><b>${esc(c.locked)}</b><p>${esc(c.reveal)}</p></div>`;
    const penalty=penaltyScore(fixture,index),event=eventText(fixture,index);
    return `<div class="fixture-detail-copy">
      <span>${esc(roundLabels[index])} · ${esc(played?resultCopy(fixture.res):c.current)}</span>
      <b>${esc(fixture.opp||c.opponent)}</b>
      <div class="fixture-detail-stats">
        ${played?`<div><small>${esc(c.score)}</small><strong>${esc(fixture.gf)}–${esc(fixture.ga)}</strong></div>`:""}
        ${penalty?`<div><small>${esc(c.penalties)}</small><strong>${esc(penalty[0])}–${esc(penalty[1])}</strong></div>`:""}
        <div class="fixture-key-event"><small>${esc(c.event)}</small><strong>${esc(event||c.noEvent)}</strong></div>
      </div>
    </div>`;
  }

  function closeDetail(){
    selected=-1;
    const panel=document.getElementById("fixtureDetail");
    if(panel){panel.classList.add("hidden");panel.innerHTML="";}
    document.querySelectorAll("#fixbar [data-fixture-index]").forEach(node=>node.setAttribute("aria-expanded","false"));
  }

  function select(index){
    const panel=document.getElementById("fixtureDetail");
    if(!panel)return;
    if(selected===index){closeDetail();return;}
    selected=index;
    document.querySelectorAll("#fixbar [data-fixture-index]").forEach(node=>node.setAttribute("aria-expanded",String(Number(node.dataset.fixtureIndex)===index)));
    panel.innerHTML=`${detailMarkup(index)}<button type="button" class="fixture-detail-close" aria-label="${esc(copy().close)}">×</button>`;
    panel.classList.remove("hidden");
    panel.querySelector(".fixture-detail-close")?.addEventListener("click",closeDetail);
  }

  function centerActive(track){
    const active=track.querySelector(".fixture-node.is-active")||track.querySelector(".fixture-node.is-played:last-of-type");
    if(!active)return;
    requestAnimationFrame(()=>{
      const left=active.offsetLeft-(track.clientWidth-active.clientWidth)/2;
      track.scrollTo({left:Math.max(0,left),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
    });
  }

  function bind(root){
    const track=root.querySelector(".fixture-track");
    root.querySelectorAll("[data-fixture-index]").forEach(node=>node.addEventListener("click",()=>select(Number(node.dataset.fixtureIndex))));
    root.querySelector(".fixture-trophy")?.addEventListener("click",()=>{
      const index=Math.max(0,fixtureList().length-1);
      select(index);
    });
    track?.addEventListener("keydown",event=>{
      if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
      const nodes=[...track.querySelectorAll("[data-fixture-index]")],current=nodes.indexOf(document.activeElement);
      if(current<0)return;
      event.preventDefault();
      const next=Math.max(0,Math.min(nodes.length-1,current+(event.key==="ArrowRight"?1:-1)));
      nodes[next].focus();
    });
    if(track)centerActive(track);
  }

  function render(){
    ensureStyle();
    const root=document.getElementById("fixbar");
    if(!root)return;
    const list=fixtureList(),roundLabels=labels(),played=list.filter(item=>item&&item.res).length;
    const champion=!!(list[5]&&list[5].res==="W"),progress=Math.round(played/Math.max(1,list.length)*100);
    selected=-1;
    root.classList.remove("hidden");
    root.classList.add("fixture-road-v2");
    root.style.setProperty("--fixture-progress",`${progress}%`);
    root.style.setProperty("--fixture-ratio",String(progress/100));
    root.innerHTML=`<div class="fixture-track" role="list" aria-label="${esc(copy().progress)}">${list.map((fixture,index)=>nodeMarkup(fixture,index,roundLabels)).join("")}
      <button type="button" class="fix trophy fixture-trophy${champion?" lit is-champion":played>=4?" is-near":""}" aria-label="${esc(champion?copy().champion:copy().cup)}" style="--trophy-progress:${progress}%"><span class="fixture-trophy-ring">${CUP}</span><small>${esc(champion?copy().champion:copy().cup)}</small></button>
    </div><div id="fixtureDetail" class="fixture-detail hidden" aria-live="polite"></div>`;
    bind(root);
  }

  ensureStyle();
  global.CopaFixtureRoad=Object.freeze({render,select,closeDetail});
})(window);
