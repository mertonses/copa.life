/* Kart fiyatlari ve variant dengesi. */
/* Variant fiyat carpani: normal/bronz/altin/kara */
var VARIANT_PRICE_MOD=[1.0,1.15,1.4,0.9];

function weightedVariant(){
 const r=rand();
 if(r<0.55)return 0; // Normal  55%
 if(r<0.85)return 1; // Bronz   30%
 if(r<0.97)return 2; // Altin   12%
 return 3;           // Kara     3%
}

function cardPrice(k){
 const d=CARDDEFS[k],rar=d.rar||"bronze";
 const floor={bronze:9,silver:15,gold:21,risk:12}[rar]||9;
 const base=Math.round((d.price||floor)*1.35);
 const vm=VARIANT_PRICE_MOD[variantOf(k)||0];
 return Math.max(3,Math.round(Math.max(floor,base)*vm)+chairmanMarketMod());
}

function variantText(k){
 const labels=L().variantLbl||["NORMAL","BRONZ","ALTIN","KARA"];
 return labels[variantOf(k)]||labels[0]||"";
}

function cardContractType(k){
 if(isInstantCard(k))return LANG==="tr"?"Tek kullanım":"Single use";
 if(cardMode(k)==="contract")return LANG==="tr"?"Sözleşme":"Contract";
 return LANG==="tr"?"Sürekli":"Persistent";
}
