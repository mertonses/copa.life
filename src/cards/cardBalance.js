/* Kart fiyatlari ve variant dengesi. */
/* DARK daha yuksek etki karsiliginda daha pahali ve daha risklidir. */
var VARIANT_PRICE_MOD=[1.0,1.25];

function weightedVariant(){
 return rand()<0.5?0:1; // 50/50 COMMON / DARK
}

function cardPrice(k){
 const d=CARDDEFS[k];
 const base=typeof d.price==="number"?d.price:7;
 if(base===0)return 0;
 const vm=d.fixedPrice?1:VARIANT_PRICE_MOD[variantOf(k)||0];
 const pm=typeof cardPriceMod!=="undefined"?cardPriceMod:1.0;
 return Math.max(typeof CARD_PRICE_FLOOR==="number"?CARD_PRICE_FLOOR:2,Math.round(base*vm*pm)+chairmanMarketMod());
}

function variantText(k){
 const labels=L().variantLbl||["COMMON","DARK"];
 return labels[Math.min(variantOf(k)||0,1)]||labels[0]||"";
}

function cardContractType(k){
 if(isInstantCard(k))return LANG==="tr"?"Tek kullanım":"Single use";
 if(cardMode(k)==="contract")return LANG==="tr"?"Sözleşme":"Contract";
 return LANG==="tr"?"Sürekli":"Persistent";
}
