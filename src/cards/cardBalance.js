/* Kart tier etiketleri, fiyatlari, iade ve progress dengesi. */
function cardPrice(k){
 const d=CARDDEFS[k],rar=d.rar||"bronze";
 const floor={bronze:9,silver:15,gold:21,risk:12}[rar]||9;
 const scaled=Math.round((d.price||floor)*1.35);
 const tierTax=isProgressCard(k)?tierOf(k)*4:0;
 return Math.max(3,Math.max(floor,scaled)+tierTax+chairmanMarketMod());
}
function tierText(k){const labels=L().tierLbl||[];return labels[tierOf(k)]||labels[0]||"";}
function tierFromCopies(c){return Math.max(0,Math.min(3,(c||0)-1));}
function duplicateRefund(k){return Math.max(3,Math.floor(cardPrice(k)*0.35));}
function progressText(k){
 if(!isProgressCard(k))return isInstantCard(k)?(LANG==="tr"?"Tek kullanım":"Single use"):(LANG==="tr"?"Sözleşme kartı":"Contract card");
 const c=Math.min(MAX_CARD_COPIES,invOf(k)),next=tierFromCopies(c+1),up=next>tierOf(k)&&c<MAX_CARD_COPIES;
 return (LANG==="tr"?"Gelişim":"Progress")+" "+c+"/"+MAX_CARD_COPIES+(up?" · "+(LANG==="tr"?"sonraki kopya tier atlatır":"next copy upgrades"):(c>=MAX_CARD_COPIES?" · MAX":""));
}
function progressStars(k){const c=Math.min(MAX_CARD_COPIES,invOf(k));let s="";for(let i=1;i<=MAX_CARD_COPIES;i++)s+=i<=c?"★":"☆";return s;}
function progressBarHTML(k){
 if(!isProgressCard(k))return `<div class="singleuse">${progressText(k)}</div>`;
 const c=Math.min(MAX_CARD_COPIES,invOf(k)),pct=Math.round(c/MAX_CARD_COPIES*100),next=tierFromCopies(c+1),up=next>tierOf(k)&&c<MAX_CARD_COPIES;
 return `<div class="progline"><span>${progressStars(k)}</span><b>${c}/${MAX_CARD_COPIES}</b></div><div class="progbar"><i style="width:${pct}%"></i></div>${up?`<div class="upnext">${LANG==="tr"?"Sıradaki kopya: ":"Next copy: "}${(L().tierLbl||[])[next]||""}</div>`:""}`;
}
