/* Kart kombinasyonlari ve aktif combo yardimcilari. */
var COMBOS=[{k:"c_kont",need:["kontra","yildiz"],b:3},{k:"c_iron",need:["otobus","tecrubeli_omurga"],b:3},{k:"c_aka",need:["genc","anadolu"],b:4},{k:"c_pressyouth",need:["kontra","genc"],b:3},{k:"c_kanatkont",need:["kanat_akini","kontra"],b:3},{k:"c_millikale",need:["yerli_blok","kaleci_kalesi"],b:2}];
var SCOMBOS=[{k:"gegenkids",style:"gegen",need:["genc"],b:5},{k:"mourinho",style:"blok",need:["otobus"],b:5},{k:"scoutnet",need:["anadolu","tecrubeli_omurga"],b:4}];
function sActive(){return SCOMBOS.filter(c=>(!c.style||style===c.style)&&c.need.every(hasCard));}
function comboBonus(){let t=0;COMBOS.forEach(c=>{if(c.need.every(hasCard))t+=c.b;});sActive().forEach(c=>t+=c.b);return t;}
function activeCombos(){return COMBOS.filter(c=>c.need.every(hasCard)).concat(sActive());}
function wouldCombo(k){if(hasCard(k))return null;const test=kk=>kk===k||hasCard(kk);const nc=COMBOS.filter(c=>!c.need.every(hasCard)&&c.need.every(test));const ns=SCOMBOS.filter(c=>(!c.style||style===c.style)&&!c.need.every(hasCard)&&c.need.every(test));return[...nc,...ns][0]||null;}
