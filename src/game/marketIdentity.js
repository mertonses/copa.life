(function(root){
  "use strict";

  const IDENTITIES=Object.freeze([
    {id:"local_week",tone:"local",tr:"YERLİ OYUNCU HAFTASI",en:"LOCAL PLAYER WEEK",effectTr:"İlk serbest oyuncu yerli havuzundan garanti.",effectEn:"The first free agent is guaranteed from the local pool."},
    {id:"forward_surplus",tone:"forward",tr:"FORVET BOLLUĞU",en:"FORWARD SURPLUS",effectTr:"Forvet serbest transferleri €1M daha ucuz.",effectEn:"Forward free agents cost €1M less."},
    {id:"dark_pressure",tone:"dark",tr:"DARK KART BASKISI",en:"DARK CARD PRESSURE",effectTr:"Tekliflerden biri DARK varyant gelir.",effectEn:"One offer arrives as a DARK variant."},
    {id:"normal",tone:"normal",tr:"NORMAL PİYASA",en:"NORMAL MARKET",effectTr:"Piyasa kuralı yok. Standart fiyatlar geçerli.",effectEn:"No market modifier. Standard prices apply."}
  ]);

  const current=round=>IDENTITIES[(Math.max(1,Number(round)||1)-1)%IDENTITIES.length];
  function freeAgentPosition(round,index,defaultPos){
    const identity=current(round);
    if(identity.id==="forward_surplus"&&index===0)return "ST";
    return defaultPos;
  }
  function freeAgentFee(round,player,fee){
    const identity=current(round),group=typeof root.groupOf==="function"?root.groupOf(player&&player.pos):"";
    return identity.id==="forward_surplus"&&group==="FWD"?Math.max(0,(Number(fee)||0)-1):Math.max(0,Number(fee)||0);
  }
  function decorateFreeAgent(round,index,player){
    const identity=current(round);
    return {marketIdentity:identity.id,localGuarantee:identity.id==="local_week"&&index===0,player};
  }
  function applyCardOffers(round,offers,variants){
    const identity=current(round);
    if(identity.id==="dark_pressure"&&offers.length)variants[offers[0]]=1;
    return identity;
  }
  function label(round,lang){
    const identity=current(round),tr=lang==="tr";
    return {id:identity.id,tone:identity.tone,title:tr?identity.tr:identity.en,effect:tr?identity.effectTr:identity.effectEn};
  }

  root.CopaMarketIdentity=Object.freeze({current,label,freeAgentPosition,freeAgentFee,decorateFreeAgent,applyCardOffers});
})(window);
