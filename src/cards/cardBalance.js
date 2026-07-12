/* Kart fiyatlari ve variant dengesi. */
/* DARK daha yuksek etki karsiliginda daha pahali ve daha risklidir. */
var VARIANT_PRICE_MOD=[1.0,1.25];

/* Tek bir kartta birden fazla maliyeti ayni anda bagirmak yerine, para
   fiyatinin yanina en belirleyici ikincil bedeli koyuyoruz. */
var CARD_COST_META={
 yildiz_krizi:{0:{chem:1},1:{chem:2,risk:20,cash:4}},
 kasiga_para:{0:{chem:1,nextMarket:true,priceRise:25},1:{chem:1,trust:1,nextMarket:true,priceRise:50}},
 kara_borsa:{0:{trade:1},1:{trade:1,risk:35,cash:10}},
 derbi:{1:{risk:25,cash:7}},
 final_provasi:{1:{risk:25,cash:3}},
 taksit_transfer:{0:{nextTurn:4,turns:2},1:{trust:1,nextTurn:7,turns:2}},
 kumarbaz:{0:{nextTurn:5,turns:2},1:{trust:1,nextTurn:10,turns:2}},
 primler_yatinca:{0:{nextTurn:8},1:{nextTurn:16}},
 doping:{0:{risk:35,cash:15},1:{trust:1,risk:25,cash:25}},
 gecici_prim:{0:{risk:30},1:{risk:60}},
 kurban_belli:{1:{risk:25,cash:6}},
 nasip_kismet:{1:{risk:25,cash:4}},
 kaleci_kalesi:{1:{risk:15,cash:15}},
 otobus:{1:{risk:10,cash:6}},
 yildiz:{1:{risk:25,cash:6}},
 buyuk_mac:{1:{risk:20,cash:12}},
 kontra:{1:{risk:25,cash:10}},
 vur_igneyi:{1:{risk:25,cash:6}}
};

function cardCostMeta(k,v){
 const set=CARD_COST_META[k]||{};
 return set[v||0]||{};
}

function cardCostBadge(k,v){
 const c=cardCostMeta(k,v);
 const tr=typeof LANG!=="undefined"&&LANG==="tr";
 const chaos=typeof shopPriceChaos!=="undefined"?Number(shopPriceChaos[k]||0):0;
 if(chaos)return tr?"Kaos "+(chaos>0?"+":"-")+"€"+Math.abs(chaos)+"M":"Chaos "+(chaos>0?"+":"-")+"€"+Math.abs(chaos)+"M";
 if(c.chem)return tr?"Kimya -"+c.chem:"Chemistry -"+c.chem;
 if(c.trust)return tr?"G\u00fcven -"+c.trust:"Trust -"+c.trust;
 if(c.nextMarket)return tr?"Pazar +%"+c.priceRise:"Market +"+c.priceRise+"%";
 if(c.nextTurn)return tr?"Sonraki tur -\u20ac"+c.nextTurn+"M":"Next round -\u20ac"+c.nextTurn+"M";
 if(c.trade)return tr?"Kart yak: "+c.trade:"Burn card: "+c.trade;
 if(c.risk)return tr?"Risk %"+c.risk:"Risk "+c.risk+"%";
 if(!isInstantCard(k)&&cardMode(k)==="contract")return tr?"Slot 1":"Slot 1";
 return "";
}

function cardCostLines(k,v){
 const c=cardCostMeta(k,v),tr=typeof LANG!=="undefined"&&LANG==="tr",out=[];
 const add=s=>{if(s&&!out.includes(s))out.push(s);};
 if(c.chem)add(tr?"Kimya -"+c.chem:"Chemistry -"+c.chem);
 if(c.trust)add(tr?"Güven -"+c.trust:"Trust -"+c.trust);
 if(c.nextMarket)add(tr?"Sonraki pazar +%"+c.priceRise:"Next market +"+c.priceRise+"%");
 if(c.nextTurn)add(tr?(c.turns||1)+" tur -€"+c.nextTurn+"M":"-€"+c.nextTurn+"M for "+(c.turns||1)+" round"+((c.turns||1)>1?"s":""));
 if(c.trade)add(tr?"Kart yak: "+c.trade:"Burn card: "+c.trade);
 if(c.risk)add(tr?"Risk %"+c.risk+(c.cash?": -€"+c.cash+"M":""):"Risk "+c.risk+"%"+(c.cash?": -€"+c.cash+"M":""));
 const pen=typeof KARA_PEN!=="undefined"&&v===1?Number(KARA_PEN[k]||0):0;
 if(pen)add(tr?"Finalde -"+pen+" güç":"Final -"+pen+" power");
 const custom={
   taraftar:{1:tr?"Risk %25: Güven -1":"Risk 25%: Trust -1"},
   doping:{0:tr?"Risk %20: Güven -1; her tur %35 -€15M":"Risk 20%: Trust -1; each round 35% -€15M",1:tr?"Her tur %25: -€25M":"Each round 25%: -€25M"},
   sahte_evrak:{0:tr?"Risk %18: Güven -1":"Risk 18%: Trust -1"},
   kisa_kamp:{0:tr?"Sonraki maç -2 güç":"Next match -2 power",1:tr?"Sonraki maç -4 güç":"Next match -4 power"},
   gecici_prim:{0:tr?"Maç sonu risk %30: sakatlık; sonraki maç -2":"Post-match risk 30%: injury; next match -2",1:tr?"Maç sonu risk %60: sakatlık; sonraki maç -2":"Post-match risk 60%: injury; next match -2"},
   deplasman_kafilesi:{1:tr?"Rakip güçlü değilse %50: -4 güç":"If opponent is not stronger: 50% -4 power"},
   kurban_belli:{0:tr?"Tur sonunda 1 oyuncu sakatlanır":"1 player injured after the round",1:tr?"Tur sonunda 2 oyuncu sakatlanır":"2 players injured after the round"},
   son_kredi:{0:tr?"Borç toleransı €5M daralır":"Debt tolerance tightens by €5M",1:tr?"Borç toleransı €5M daralır":"Debt tolerance tightens by €5M"}
 };
 if(custom[k]&&custom[k][v])add(custom[k][v]);
 return out;
}

function weightedVariant(){
 const chaos=typeof chairman!=="undefined"&&chairman&&chairman.id==="cilgin";
 return rand()<(chaos?0.42:0.64)?0:1; // DARK is meaningful, not every other offer
}

function cardPrice(k){
 const d=CARDDEFS[k];
 const base=typeof d.price==="number"?d.price:7;
 if(base===0)return 0;
 const vm=d.fixedPrice?1:VARIANT_PRICE_MOD[variantOf(k)||0];
 const pm=typeof cardPriceMod!=="undefined"?cardPriceMod:1.0;
 const chaos=typeof shopPriceChaos!=="undefined"?Number(shopPriceChaos[k]||0):0;
 return Math.max(typeof CARD_PRICE_FLOOR==="number"?CARD_PRICE_FLOOR:2,Math.round(base*vm*pm)+chairmanMarketMod()+chaos);
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
