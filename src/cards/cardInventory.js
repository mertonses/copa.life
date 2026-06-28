/* Kart aktif slot ve envanter yardimcilari. */
function variantOf(k){return Math.min(cardVariant[k]||0,2);}
function invOf(k){return cardInv[k]||0;}
function hasCard(k){return cards.includes(k);}
function activeCardSlots(){return round>=5?4:(round>=3?3:2);}
function canActivate(k){return invOf(k)>0&&!hasCard(k)&&cards.length<activeCardSlots();}
function allCardKeys(){return Object.keys(CARDDEFS);}
