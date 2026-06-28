/* Kart fiyatlari ve variant dengesi. */
/* Variant fiyat carpani: altin/kara */
var VARIANT_PRICE_MOD=[1.15,0.85];

function weightedVariant(){
 return rand()<0.5?0:1; // 50/50 ALTIN / KARA
}

function cardPrice(k){
 const d=CARDDEFS[k],rar=d.rar||"bronze";
 const floor={bronze:7,silver:12,gold:17,risk:6}[rar]||7;
 const base=Math.round(d.price||floor);
 const vm=VARIANT_PRICE_MOD[variantOf(k)||0];
 const pm=typeof cardPriceMod!=="undefined"?cardPriceMod:1.0;
 return Math.max(3,Math.round(Math.max(floor,base)*vm*pm)+chairmanMarketMod());
}

function variantText(k){
 const labels=L().variantLbl||["GOLDEN","DARK"];
 return labels[Math.min(variantOf(k)||0,1)]||labels[0]||"";
}

function cardContractType(k){
 if(isInstantCard(k))return LANG==="tr"?"Tek kullanım":"Single use";
 if(cardMode(k)==="contract")return LANG==="tr"?"Sözleşme":"Contract";
 return LANG==="tr"?"Sürekli":"Persistent";
}
