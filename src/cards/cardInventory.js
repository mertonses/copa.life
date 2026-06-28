/* Kart aktif slot ve envanter yardimcilari. */
function variantOf(k){const v=cardVariant[k]||0;return v>=3?2:v===2?1:0;}
function invOf(k){return cardInv[k]||0;}
function hasCard(k){return cards.includes(k);}
function activeCardSlots(){return round>=5?4:(round>=3?3:2);}
function canActivate(k){return invOf(k)>0&&!hasCard(k)&&cards.length<activeCardSlots();}
function allCardKeys(){return Object.keys(CARDDEFS);}
