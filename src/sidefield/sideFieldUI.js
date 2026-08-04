/* Yan Saha route and game-economy adapter. */
(function(root){
  "use strict";
  let view="round",draft=null;
  const engine=()=>root.CopaSideFieldEngine;
  const tr=()=>root.LANG==="tr";
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const state=()=>{root.sideFieldState=engine().normalizeState(root.sideFieldState);return root.sideFieldState;};
  const cash=()=>Number(root.budget)||0;
  const money=value=>`${Number(value)<0?"−":""}€${Math.abs(Math.round(Number(value)||0))}M`;
  function snapshot(){return JSON.parse(JSON.stringify(state()));}
  function restore(value){root.sideFieldState=engine().normalizeState(value);draft=null;return state();}
  function reset(){root.sideFieldState=engine().createState();draft=null;}
  function ensureCurrent(){
    if(!engine()||!root.tournament)return null;
    const result=engine().ensureMarket(state(),root.tournament,cash());root.sideFieldState=result.state;
    return result.market;
  }
  function currentKey(){const market=ensureCurrent();return market&&market.key||"";}
  function score(match){return match&&match.status==="played"&&Array.isArray(match.score)?`${match.score[0]}–${match.score[1]}`:"";}
  function initials(name){return String(name||"?").split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toLocaleUpperCase().slice(0,2);}
  function stageLabel(market){
    if(!market)return tr()?"PİYASA YOK":"NO MARKET";
    if(market.stage==="group")return tr()?`GRUPLAR · ${market.matchday}. MAÇ GÜNÜ`:`GROUPS · MATCHDAY ${market.matchday}`;
    const labels={roundof16:tr()?"SON 16":"ROUND OF 16",quarterfinal:tr()?"ÇEYREK FİNAL":"QUARTERFINAL",semifinal:tr()?"YARI FİNAL":"SEMIFINAL",final:tr()?"FİNAL":"FINAL"};return labels[market.round]||String(market.round||"").toUpperCase();
  }
  function statusLabel(status){return({open:tr()?"AÇIK":"OPEN",locked:tr()?"KİLİTLİ":"LOCKED",settled:tr()?"SONUÇLANDI":"SETTLED"})[status]||status;}
  function pickLabel(pick,quote){if(pick==="D")return tr()?"BERABERLİK":"DRAW";return pick==="H"?quote.homeName:quote.awayName;}
  function usedRisk(market){return market?engine().roundTickets(state(),market.key).reduce((sum,ticket)=>sum+ticket.stake,0):0;}
  function availableStake(market,odds){
    if(!market)return[];const used=usedRisk(market),remaining=Math.max(0,market.riskLimit-used),minimum=engine().minStakeForOdds(odds),max=Math.min(remaining,Math.floor(engine().MAX_PAYOUT/odds),Math.max(0,Math.floor(cash()-engine().CASH_FLOOR)));
    return Array.from({length:Math.max(0,max-minimum+1)},(_,index)=>minimum+index);
  }
  function marketCard(market,quote){
    const match=root.tournament&&root.tournament.matches&&root.tournament.matches[quote.matchId],played=match&&match.status==="played",existing=engine().roundTickets(state(),market.key).find(ticket=>ticket.matchId===quote.matchId),picks=market.stage==="group"?["H","D","A"]:["H","A"];
    return `<article class="ys-match-card ${played?"is-played":""} ${existing?"has-ticket":""}">
      <div class="ys-match-meta"><span>${market.stage==="group"?`#${esc(match&&match.groupId||"")}`:stageLabel(market)}</span>${played?`<b>${score(match)}</b>`:`<i>${existing?(tr()?"SEÇİM YAPILDI":"PICK SAVED"):(tr()?"MAÇ ÖNCESİ":"PRE-MATCH")}</i>`}</div>
      <div class="ys-teams"><span><i>${esc(initials(quote.homeName))}</i><b>${esc(quote.homeName)}</b></span><em>${played?score(match):"VS"}</em><span><i>${esc(initials(quote.awayName))}</i><b>${esc(quote.awayName)}</b></span></div>
      <div class="ys-odds">${picks.map(pick=>`<button type="button" ${market.status!=="open"||played||existing?"disabled":""} onclick="CopaSideField.select('${esc(quote.matchId)}','${pick}')"><span>${pick==="H"?"1":pick==="D"?"X":"2"}</span><b>${quote.odds[pick].toFixed(2)}</b></button>`).join("")}</div>
      ${existing?ticketLine(existing,quote):""}
    </article>`;
  }
  function ticketLine(ticket,quote){
    const tone=ticket.status==="won"?"win":ticket.status==="lost"?"loss":"open",label=ticket.status==="won"?(tr()?"İSABET":"HIT"):ticket.status==="lost"?(tr()?"KAÇTI":"MISS"):ticket.status==="locked"?(tr()?"KİLİTLİ":"LOCKED"):(tr()?"BEKLİYOR":"PENDING");
    return `<div class="ys-ticket-line ${tone}"><span>${esc(pickLabel(ticket.pick,quote))} · ${ticket.odds.toFixed(2)}</span><b>${label}${ticket.status==="won"?` · +€${ticket.payout}M`:""}</b></div>`;
  }
  function roundPanel(market){
    if(!market)return `<div class="ys-empty"><b>${tr()?"Bu turda yan maç yok.":"No side fixture this round."}</b><p>${tr()?"Kendi maçın tahmin piyasasına dahil edilmez.":"Your own match is never included."}</p></div>`;
    const remaining=Math.max(0,market.riskLimit-usedRisk(market));
    return `<div class="ys-risk-strip"><span><small>${tr()?"TUR RİSKİ":"ROUND RISK"}</small><b>€${usedRisk(market)}M / €${market.riskLimit}M</b></span><i><em style="width:${market.riskLimit?usedRisk(market)/market.riskLimit*100:0}%"></em></i><span><small>${tr()?"KALAN":"LEFT"}</small><b>€${remaining}M</b></span></div>
      <div class="ys-match-grid">${market.quotes.map(quote=>marketCard(market,quote)).join("")||`<div class="ys-empty"><b>${tr()?"Bu turda başka maç yok.":"There are no other fixtures this round."}</b></div>`}</div>`;
  }
  function resultsPanel(){
    const markets=Object.values(state().markets).slice().reverse(),rows=[];
    for(const market of markets)for(const quote of market.quotes){const match=root.tournament&&root.tournament.matches&&root.tournament.matches[quote.matchId];if(match&&match.status==="played")rows.push(`<article><span><small>${stageLabel(market)}</small><b>${esc(quote.homeName)} <em>${score(match)}</em> ${esc(quote.awayName)}</b></span>${ticketResultFor(match,market,quote)}</article>`);}
    return rows.length?`<div class="ys-results-list">${rows.join("")}</div>`:`<div class="ys-empty"><b>${tr()?"Henüz kehanet mühürlenmedi.":"No prophecy has been sealed yet."}</b><p>${tr()?"Maç gününün ardından tüm yan saha sonuçları burada görünür.":"All side-fixture results appear here after matchday."}</p></div>`;
  }
  function ticketResultFor(match,market,quote){const ticket=engine().roundTickets(state(),market.key).find(item=>item.matchId===match.id);return ticket?`<strong class="${ticket.status}">${ticket.status==="won"?`+€${ticket.payout}M`:ticket.status==="lost"?`−€${ticket.stake}M`:(tr()?"BEKLİYOR":"PENDING")}</strong>`:"<strong>—</strong>";}
  function ticketsPanel(){
    const tickets=state().tickets.slice().reverse();if(!tickets.length)return `<div class="ys-empty"><b>${tr()?"Henüz seçim yapmadın.":"You have no picks yet."}</b><p>${tr()?"Bir maç ve sonuç seç; riski onayladığında kuponun mühürlensin.":"Choose a fixture and outcome, then seal your risk."}</p></div>`;
    return `<div class="ys-my-tickets">${tickets.map(ticket=>{const market=state().markets[ticket.marketKey],quote=market&&market.quotes.find(item=>item.matchId===ticket.matchId);if(!quote)return"";return`<article class="${ticket.status}"><span>${stageLabel(market)}</span><h3>${esc(quote.homeName)} — ${esc(quote.awayName)}</h3><p>${esc(pickLabel(ticket.pick,quote))} · ${ticket.odds.toFixed(2)}</p><div><b>€${ticket.stake}M</b><em>→</em><strong>€${ticket.potentialPayout}M</strong></div><small>${ticket.status==="won"?(tr()?"İSABET":"HIT"):ticket.status==="lost"?(tr()?"KAÇTI":"MISS"):ticket.status==="locked"?(tr()?"KİLİTLİ":"LOCKED"):(tr()?"BEKLİYOR":"PENDING")}</small></article>`;}).join("")}</div>`;
  }
  function draftPanel(market){
    if(!draft||!market)return"";const quote=market.quotes.find(item=>item.matchId===draft.matchId);if(!quote){draft=null;return"";}const odds=quote.odds[draft.pick],stakes=availableStake(market,odds),selected=stakes.includes(draft.stake)?draft.stake:(stakes[0]||0);draft.stake=selected;
    return `<div class="ys-slip-backdrop" onclick="if(event.target===this)CopaSideField.closeSlip()"><aside class="ys-slip" role="dialog" aria-modal="true" aria-label="${tr()?"Yan Saha seçimi":"Side Field pick"}"><button class="ys-slip-close" onclick="CopaSideField.closeSlip()" aria-label="${tr()?"Kapat":"Close"}">×</button><span>${tr()?"KEHANET FİŞİ":"PROPHECY SLIP"}</span><h2>${esc(quote.homeName)} — ${esc(quote.awayName)}</h2><p>${esc(pickLabel(draft.pick,quote))}</p><div class="ys-slip-odds"><small>${tr()?"ORAN":"ODDS"}</small><b>${odds.toFixed(2)}</b></div>${stakes.length?`<label>${tr()?"RİSK":"RISK"}</label><div class="ys-stakes">${stakes.map(amount=>`<button class="${amount===selected?"active":""}" onclick="CopaSideField.setStake(${amount})">€${amount}M</button>`).join("")}</div><div class="ys-slip-return"><span>${tr()?"OLASI DÖNÜŞ":"POSSIBLE RETURN"}</span><b>€${Math.round(selected*odds)}M</b></div><button class="ys-seal" onclick="CopaSideField.place()">${tr()?"SEÇİMİ MÜHÜRLE":"SEAL PICK"}</button>`:`<div class="ys-slip-warning">${tr()?"Bu seçim, kalan risk sınırına sığmıyor.":"This pick exceeds your remaining risk limit."}</div>`}<small class="ys-fineprint">${tr()?"Yalnızca oyun içi kulüp kasası · gerçek para değeri yoktur":"In-game club funds only · no real-money value"}</small></aside></div>`;
  }
  function render(){
    const route=document.getElementById("sideFieldRoute");if(!route)return;const market=ensureCurrent();
    route.innerHTML=`<div class="ys-shell"><header class="ys-hero"><div><span>${stageLabel(market)}</span><h1>YAN SAHA</h1><p>${tr()?"Kader çizilmez. Okunur, tartılır, göze alınır.":"Fate is read, weighed and risked."}</p></div><aside><small>${tr()?"KULÜP KASASI":"CLUB CASH"}</small><b>${money(cash())}</b><em class="${market&&market.status||"settled"}">${statusLabel(market&&market.status||"settled")}</em></aside></header><nav class="ys-tabs"><button class="${view==="round"?"active":""}" onclick="CopaSideField.setView('round')">${tr()?"BU TUR":"THIS ROUND"}</button><button class="${view==="results"?"active":""}" onclick="CopaSideField.setView('results')">${tr()?"SONUÇLAR":"RESULTS"}</button><button class="${view==="tickets"?"active":""}" onclick="CopaSideField.setView('tickets')">${tr()?"SEÇİMLERİM":"MY PICKS"}<i>${state().tickets.length}</i></button></nav><main>${view==="results"?resultsPanel():view==="tickets"?ticketsPanel():roundPanel(market)}</main><footer><b>${tr()?"RİSK PROTOKOLÜ":"RISK PROTOCOL"}</b><span>${tr()?"Tekli seçim · tur başına €4M tavan · −€10M risk çizgisi · kendi maçın hariç":"Singles only · €4M round cap · −€10M risk floor · excludes your match"}</span></footer></div>${draftPanel(market)}`;
  }
  function mount(){let route=document.getElementById("sideFieldRoute");if(!route){route=document.createElement("section");route.id="sideFieldRoute";route.className="side-field-route";document.getElementById("hub")?.appendChild(route);}render();return route;}
  function setView(next){view=["round","results","tickets"].includes(next)?next:"round";draft=null;render();}
  function select(matchId,pick){const market=ensureCurrent();if(!market||market.status!=="open")return;draft={matchId,pick,stake:0};render();}
  function setStake(value){if(draft)draft.stake=Math.max(1,Math.floor(Number(value)||1));render();}
  function closeSlip(){draft=null;render();}
  function reasonText(result){const map={market_closed:"Piyasa maça çıkışta kilitlenir.",selection_missing:"Bu seçim artık kullanılamıyor.",invalid_stake:"Geçerli bir risk seç.",ticket_limit:"Bir turda en fazla üç seçim yapabilirsin.",match_already_selected:"Bu maç için zaten seçim yaptın.",minimum_stake:`Bu oran için en az €${result.minimum||1}M risk gerekir.`,risk_limit:"Tur risk sınırına ulaştın.",cash_reserve:"Yan Saha kasayı −€10M risk çizgisinin altına indiremez.",payout_limit:"Olası dönüş tavanı €12M."};return tr()?(map[result.reason]||"Seçim kaydedilemedi."):"The pick could not be saved.";}
  function place(){
    const market=ensureCurrent();if(!draft||!market)return;const result=engine().place(state(),market.key,draft.matchId,draft.pick,draft.stake,cash());if(!result.ok){root.showToast?.(reasonText(result));return;}
    root.sideFieldState=result.state;const amount=result.ticket.stake,before=Number(root.budget)||0;root.budget=Math.round(before-amount);if(root.econStats){root.econStats.yanSahaStaked=(root.econStats.yanSahaStaked||0)+amount;}if(typeof root.recordCashFlow==="function")root.recordCashFlow("expense",amount,"yan_saha",before,root.budget,0);
    draft=null;root.setBudget?.();root._saveState?.();root.showToast?.(tr()?`Seçim mühürlendi · −€${amount}M`:`Pick sealed · −€${amount}M`,{type:"info"});render();
  }
  function lockCurrent(){const result=engine().lock(state(),root.tournament);root.sideFieldState=result.state;render();return result;}
  function settleMarket(marketKey){
    if(!marketKey)return{payout:0,settled:[]};const result=engine().settle(state(),root.tournament,marketKey);root.sideFieldState=result.state;
    if(result.payout>0){root.earn?.(result.payout,"yanSahaPayout");if(root.econStats)root.econStats.yanSahaWon=(root.econStats.yanSahaWon||0)+result.payout;root.pushFeed?.(`✦ ${tr()?"Yan Saha isabeti":"Side Field hit"}: +€${result.payout}M`,"win");}
    else if(result.settled.length)root.pushFeed?.(`◇ ${tr()?"Yan Saha seçimleri sonuçlandı":"Side Field picks settled"}`,"");
    root.setBudget?.();render();return result;
  }
  root.CopaSideField={snapshot,restore,reset,ensureCurrent,currentKey,mount,render,setView,select,setStake,closeSlip,place,lockCurrent,settleMarket};
})(window);
