/* Kart fiyatlari ve variant dengesi. */
/* Variant fiyat carpani: notr/altin/kara */
var VARIANT_PRICE_MOD=[1.0,1.3,0.85];

function weightedVariant(){
 const r=rand();
 if(r<0.65)return 0; // NÖTR  65%
 if(r<0.90)return 1; // ALTIN 25%
 return 2;           // KARA  10%
}

function cardPrice(k){
 const d=CARDDEFS[k],rar=d.rar||"bronze";
 const floor={bronze:7,silver:12,gold:17,risk:10}[rar]||7;
 const base=Math.round(d.price||floor);
 const vm=VARIANT_PRICE_MOD[variantOf(k)||0];
 return Math.max(3,Math.round(Math.max(floor,base)*vm)+chairmanMarketMod());
}

function variantText(k){
 const labels=L().variantLbl||["NÖTR","ALTIN","KARA"];
 return labels[variantOf(k)]||labels[0]||"";
}

function cardContractType(k){
 if(isInstantCard(k))return LANG==="tr"?"Tek kullanım":"Single use";
 if(cardMode(k)==="contract")return LANG==="tr"?"Sözleşme":"Contract";
 return LANG==="tr"?"Sürekli":"Persistent";
}
