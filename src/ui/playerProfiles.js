(function(global){
"use strict";

const HOVER_OPEN_MS=320,HOVER_CLOSE_MS=150,DOUBLE_TAP_MS=320;
const bound=new WeakMap(),normalizedCache=new Map(),replaying=new WeakSet();
let root=null,panel=null,openTimer=0,closeTimer=0,requestId=0,current=null,lastTap=null;
let dragging=false,dragSuppressUntil=0,historyPushed=false,previousFocus=null;

const copy={
  tr:{open:"Oyuncu profilini aç",close:"Oyuncu profilini kapat",age:"yaş",club:"Kulüp",country:"Ülke / Milli Takım",foot:"Kullandığı ayak",positions:"Mevkiler",best:"En verimli",secondary:"İkinci mevki",physical:"Fiziksel",technical:"Teknik",mental:"Mental",goalkeeping:"Kalecilik"},
  en:{open:"Open player profile",close:"Close player profile",age:"years old",club:"Club",country:"Country / National team",foot:"Preferred foot",positions:"Positions",best:"Best position",secondary:"Secondary position",physical:"Physical",technical:"Technical",mental:"Mental",goalkeeping:"Goalkeeping"},
  es:{open:"Abrir perfil del jugador",close:"Cerrar perfil del jugador",age:"años",club:"Club",country:"País / Selección",foot:"Pie preferido",positions:"Posiciones",best:"Mejor posición",secondary:"Posición secundaria",physical:"Físico",technical:"Técnica",mental:"Mental",goalkeeping:"Portería"},
  de:{open:"Spielerprofil öffnen",close:"Spielerprofil schließen",age:"Jahre",club:"Verein",country:"Land / Nationalteam",foot:"Starker Fuß",positions:"Positionen",best:"Beste Position",secondary:"Nebenposition",physical:"Physis",technical:"Technik",mental:"Mental",goalkeeping:"Torwart"},
  it:{open:"Apri profilo giocatore",close:"Chiudi profilo giocatore",age:"anni",club:"Club",country:"Paese / Nazionale",foot:"Piede preferito",positions:"Posizioni",best:"Posizione migliore",secondary:"Posizione secondaria",physical:"Fisico",technical:"Tecnica",mental:"Mentale",goalkeeping:"Portiere"}
};
const englishLabels={
  acceleration:"Acceleration",rushing_out:"Rushing Out",passing:"Passing",bravery:"Bravery",command_of_area:"Command of Area",agility:"Agility",handling:"Handling",aerial_reach:"Aerial Reach",crossing:"Crossing",kicking:"Kicking",tackling:"Tackling",free_kicks:"Free Kicks",dribbling:"Dribbling",natural_fitness:"Natural Fitness",decisions:"Decisions",heading:"Heading",leadership:"Leadership",strength:"Strength",pace:"Pace",off_the_ball:"Off the Ball",flair:"Flair",aggression:"Aggression",work_rate:"Work Rate",composure:"Composure",reflexes:"Reflexes",finishing:"Finishing",one_on_ones:"One on Ones",penalties:"Penalties",long_shots:"Long Shots",stamina:"Stamina"
};
const outfieldGroups={
  physical:["acceleration","pace","agility","strength","stamina","natural_fitness"],
  technical:["passing","crossing","tackling","free_kicks","dribbling","heading","finishing","long_shots","penalties"],
  mental:["bravery","decisions","leadership","off_the_ball","flair","aggression","work_rate","composure"]
};
const keeperGroups={
  goalkeeping:["command_of_area","handling","aerial_reach","kicking","reflexes","one_on_ones","rushing_out"],
  physical:["agility","strength","stamina","natural_fitness","acceleration","pace"],
  mental:["bravery","decisions","leadership","aggression","work_rate","composure"]
};

function tr(){return global.LANG==="tr";}
function t(){return copy[global.LANG]||copy.en;}
function finePointer(){return !!(global.matchMedia&&global.matchMedia("(hover: hover) and (pointer: fine)").matches);}
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch];});}
function number(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function playerKey(player){return player&&player.profileKey||[global.selectedCountry||"",player&&player.name||"",player&&player.club||"",player&&player.age||"",player&&player.ov||""].join("|");}
function ratingColor(value,scale){const n=Math.max(0,Math.min(100,(number(value)||0)*(scale||1)));if(typeof global.ovCol==="function")return global.ovCol(n);return n>=90?"#15803d":n>=80?"#4ade80":n>=70?"#eab308":n>=60?"#f97316":"#ef4444";}
function positionLabel(pos){if(!pos)return"";const dict=typeof global.L==="function"&&global.L().abbr;return dict&&dict[pos]||pos;}
function uniqueValues(values){const seen=new Set();return values.map(function(v){return String(v||"").trim();}).filter(function(v){const k=v.toLocaleLowerCase("tr-TR");if(!v||seen.has(k))return false;seen.add(k);return true;});}
function splitPositions(value){return String(value||"").split(/[,;|]+/).map(function(v){return v.trim();}).filter(Boolean);}
function footLabel(value){
  if(!value||tr())return value||"";
  const key=String(value),lang=global.LANG||"en",maps={
    en:{"Sağ Ayaklı":"Right footed","Sadece Sağ Ayaklı":"Right foot only","Sol Ayaklı":"Left footed","Sadece Sol Ayaklı":"Left foot only","İki Ayağını da Kullanıyor":"Two footed"},
    es:{"Sağ Ayaklı":"Diestro","Sadece Sağ Ayaklı":"Solo derecha","Sol Ayaklı":"Zurdo","Sadece Sol Ayaklı":"Solo izquierda","İki Ayağını da Kullanıyor":"Ambidiestro"},
    de:{"Sağ Ayaklı":"Rechtsfuß","Sadece Sağ Ayaklı":"Nur rechts","Sol Ayaklı":"Linksfuß","Sadece Sol Ayaklı":"Nur links","İki Ayağını da Kullanıyor":"Beidfüßig"},
    it:{"Sağ Ayaklı":"Destro","Sadece Sağ Ayaklı":"Solo destro","Sol Ayaklı":"Mancino","Sadece Sol Ayaklı":"Solo mancino","İki Ayağını da Kullanıyor":"Ambidestro"}
  };return maps[lang]&&maps[lang][key]||maps.en[key]||key;
}
function isKeeper(player,profile){const raw=[player&&player.natPos,player&&player.pos,profile&&profile.best_position,profile&&profile.secondary_position,profile&&profile.positions].filter(Boolean).join(" ").toUpperCase();return /(^|[\s,(])(?:GK|KL)(?:$|[\s,)])/.test(raw);}
function attrLabel(profile,key){return tr()?(profile.labels&&profile.labels[key]||englishLabels[key]||key):(englishLabels[key]||key);}
function attributeGroups(player,profile){
  const source=isKeeper(player,profile)?keeperGroups:outfieldGroups;
  return Object.keys(source).map(function(group){
    return {key:group,items:source[group].map(function(key){const value=number(profile[key]);return value==null?null:{key:key,label:attrLabel(profile,key),value:value};}).filter(Boolean)};
  }).filter(function(group){return group.items.length;});
}
function normalize(player,profile){
  const pos=positionLabel(player.natPos||player.pos);
  const best=profile&&profile.best_position||"",secondary=profile&&profile.secondary_position||"";
  const positions=uniqueValues([best,secondary].concat(splitPositions(profile&&profile.positions)).concat(pos?[pos]:[]));
  return {
    key:playerKey(player),name:player.name||"",ov:number(player.ov),age:number(player.age),position:pos,
    club:player.club||"",country:profile&&profile.national_team||"",foot:footLabel(profile&&profile.preferred_foot),
    best:best,secondary:secondary,positions:positions,groups:profile?attributeGroups(player,profile):[]
  };
}
function profileFor(player){
  const key=[playerKey(player),global.LANG||"tr",player.ov||"",player.natPos||"",player.pos||"",player.club||"",player.age||""].join("|");
  if(normalizedCache.has(key))return Promise.resolve(normalizedCache.get(key));
  const loader=player.profileKey&&typeof global.playerProfileByKeyAsync==="function"
    ?global.playerProfileByKeyAsync(player.profileKey)
    :typeof global.playerProfileForAsync==="function"
      ?global.playerProfileForAsync(global.selectedCountry||"TR",player.name,player.club,player.age)
      :Promise.resolve(null);
  return loader.catch(function(){return null;}).then(function(profile){const value=normalize(player,profile);normalizedCache.set(key,value);return value;});
}
function ensureDom(){
  if(root)return;
  root=document.createElement("div");root.className="player-profile-layer hidden";root.setAttribute("aria-hidden","true");
  root.innerHTML='<div class="player-profile-backdrop" data-profile-close></div><section class="player-profile-card" role="dialog"><button class="player-profile-close" type="button" data-profile-close></button><div class="player-profile-content"></div></section>';
  document.body.appendChild(root);panel=root.querySelector(".player-profile-card");
  root.addEventListener("click",function(event){if(event.target.closest("[data-profile-close]"))close();});
  panel.addEventListener("mouseenter",cancelClose);
  panel.addEventListener("mouseleave",scheduleClose);
}
function identityHtml(data){
  const c=t(),meta=[];
  if(data.age!=null)meta.push(esc(data.age+" "+c.age));
  if(data.position)meta.push(esc(data.position));
  const details=[];
  if(data.club)details.push('<span><b>'+esc(c.club)+'</b>'+esc(data.club)+'</span>');
  if(data.country)details.push('<span><b>'+esc(c.country)+'</b>'+esc(data.country)+'</span>');
  if(data.foot)details.push('<span><b>'+esc(c.foot)+'</b>'+esc(data.foot)+'</span>');
  return '<header class="player-profile-head"><div class="player-profile-monogram" aria-hidden="true">'+esc((typeof global._playerMonogram==="function"?global._playerMonogram(data.name):data.name.slice(0,2)).toUpperCase())+'</div><div class="player-profile-id"><div class="player-profile-name-row"><h2 id="playerProfileTitle">'+esc(data.name)+'</h2>'+(data.ov!=null?'<strong class="player-profile-ov" style="--profile-tone:'+ratingColor(data.ov,1)+'">'+esc(data.ov)+'</strong>':"")+'</div>'+(meta.length?'<p>'+meta.join('<i aria-hidden="true">·</i>')+'</p>':"")+'</div></header>'+(details.length?'<div class="player-profile-details">'+details.join("")+'</div>':"");
}
function positionsHtml(data){
  if(!data.positions.length)return"";const c=t();
  const chips=data.positions.map(function(pos){let cls="";if(pos===data.best)cls=" is-best";else if(pos===data.secondary)cls=" is-secondary";return '<span class="player-profile-pos'+cls+'">'+esc(pos)+'</span>';}).join("");
  const legends=[];if(data.best)legends.push('<span><i class="is-best"></i>'+esc(c.best)+'</span>');if(data.secondary)legends.push('<span><i class="is-secondary"></i>'+esc(c.secondary)+'</span>');
  return '<section class="player-profile-section player-profile-positions"><h3>'+esc(c.positions)+'</h3><div class="player-profile-pos-list">'+chips+'</div>'+(legends.length?'<div class="player-profile-legend">'+legends.join("")+'</div>':"")+'</section>';
}
function groupsHtml(data){
  const c=t();return data.groups.map(function(group){
    const rows=group.items.map(function(item){const pct=Math.max(0,Math.min(100,item.value/20*100)),tone=ratingColor(item.value,5);return '<div class="player-profile-stat"><span>'+esc(item.label)+'</span><div class="player-profile-bar" aria-hidden="true"><i style="width:'+pct+'%;background:'+tone+'"></i></div><b style="color:'+tone+'">'+esc(item.value)+'</b></div>';}).join("");
    return '<section class="player-profile-section player-profile-attributes"><h3>'+esc(c[group.key]||group.key)+'</h3><div class="player-profile-stat-grid">'+rows+'</div></section>';
  }).join("");
}
function render(data){
  if(!panel)return;panel.querySelector(".player-profile-close").setAttribute("aria-label",t().close);panel.querySelector(".player-profile-close").innerHTML="&times;";
  panel.setAttribute("aria-labelledby","playerProfileTitle");
  panel.querySelector(".player-profile-content").innerHTML=identityHtml(data)+positionsHtml(data)+groupsHtml(data);
}
function place(){
  if(!current||!panel||!finePointer())return;
  const anchor=current.anchor;if(!anchor||!anchor.isConnected){close();return;}
  const a=anchor.getBoundingClientRect(),p=panel.getBoundingClientRect(),gap=10,edge=10;
  let left=a.right+gap,top=a.top+(a.height-p.height)/2;
  if(left+p.width>innerWidth-edge)left=a.left-p.width-gap;
  if(left<edge){left=Math.max(edge,Math.min(a.left+(a.width-p.width)/2,innerWidth-p.width-edge));top=a.bottom+gap;if(top+p.height>innerHeight-edge)top=a.top-p.height-gap;}
  panel.style.left=Math.round(Math.max(edge,Math.min(left,innerWidth-p.width-edge)))+"px";
  panel.style.top=Math.round(Math.max(edge,Math.min(top,innerHeight-p.height-edge)))+"px";
}
function open(player,anchor,reason){
  if(!player||player.hidden||dragging||performance.now()<dragSuppressUntil)return;
  clearTimeout(openTimer);clearTimeout(closeTimer);ensureDom();
  const wasOpen=!!current,token=++requestId;previousFocus=document.activeElement;current={player:player,anchor:anchor,reason:reason||"api"};
  root.classList.remove("hidden");root.classList.toggle("is-sheet",!finePointer());root.setAttribute("aria-hidden","false");panel.setAttribute("aria-modal",finePointer()?"false":"true");
  render(normalize(player,null));requestAnimationFrame(place);
  if(!finePointer()&&!wasOpen&&!historyPushed){try{history.pushState(Object.assign({},history.state,{copaPlayerProfile:true}),"");historyPushed=true;}catch(e){}}
  profileFor(player).then(function(data){if(!current||token!==requestId)return;render(data);requestAnimationFrame(place);});
  if(reason==="keyboard"||!finePointer())requestAnimationFrame(function(){const button=panel&&panel.querySelector(".player-profile-close");if(button)button.focus({preventScroll:true});});
}
function close(fromHistory){
  clearTimeout(openTimer);clearTimeout(closeTimer);requestId++;
  if(!root||!current)return;root.classList.add("hidden");root.setAttribute("aria-hidden","true");panel.style.left="";panel.style.top="";current=null;
  if(historyPushed&&!fromHistory){historyPushed=false;try{history.back();}catch(e){}}
  else if(fromHistory)historyPushed=false;
  if(previousFocus&&previousFocus.isConnected&&finePointer()){try{previousFocus.focus({preventScroll:true});}catch(e){}}previousFocus=null;
}
function cancelClose(){clearTimeout(closeTimer);}
function scheduleClose(){if(!finePointer())return;clearTimeout(closeTimer);closeTimer=setTimeout(function(){close();},HOVER_CLOSE_MS);}
function scheduleOpen(element){if(!finePointer()||dragging||performance.now()<dragSuppressUntil)return;clearTimeout(closeTimer);clearTimeout(openTimer);openTimer=setTimeout(function(){const meta=bound.get(element);if(meta)open(meta.player,element,"hover");},HOVER_OPEN_MS);}
function bind(element,player,options){
  if(!element||!player||player.hidden)return element;
  const old=bound.get(element),opts=Object.assign({delayCoarseAction:false},options||{});
  const base=(old&&element.getAttribute("aria-label")===old.aria)?old.base:(element.getAttribute("aria-label")||player.name||"");
  const aria=(base?base+". ":"")+t().open;
  const meta=old||{};meta.player=player;meta.options=opts;meta.base=base;meta.aria=aria;bound.set(element,meta);
  element.dataset.playerProfile="true";element.setAttribute("aria-label",aria);
  if(element.tagName!=="BUTTON"&&element.tagName!=="A"){if(!element.hasAttribute("role"))element.setAttribute("role","button");if(!element.hasAttribute("tabindex"))element.tabIndex=0;}
  if(!old){
    element.addEventListener("mouseenter",function(){scheduleOpen(element);});
    element.addEventListener("mouseleave",scheduleClose);
    element.addEventListener("keydown",function(event){if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();event.stopImmediatePropagation();const value=bound.get(element);if(value)open(value.player,element,"keyboard");});
  }
  return element;
}
function bindSelector(rootNode,selector,players,options){Array.from(rootNode.querySelectorAll(selector)).forEach(function(element,index){if(players[index])bind(element,players[index],options);});}
function setDragging(value){dragging=!!value;if(dragging){dragSuppressUntil=Infinity;close();}else dragSuppressUntil=performance.now()+380;}
function interceptCoarseClick(event){
  if(finePointer()||event.detail===0)return;
  const element=event.target.closest&&event.target.closest("[data-player-profile='true']");if(!element)return;
  if(replaying.has(element)){replaying.delete(element);return;}
  if(dragging||performance.now()<dragSuppressUntil){event.preventDefault();event.stopImmediatePropagation();return;}
  const meta=bound.get(element);if(!meta)return;const now=performance.now(),key=playerKey(meta.player);
  if(lastTap&&lastTap.key===key&&now-lastTap.at<=DOUBLE_TAP_MS){
    event.preventDefault();event.stopImmediatePropagation();if(lastTap.timer)clearTimeout(lastTap.timer);lastTap=null;open(meta.player,element,"double-tap");return;
  }
  lastTap={key:key,at:now,element:element,timer:0};
  if(meta.options.delayCoarseAction){
    event.preventDefault();event.stopImmediatePropagation();
    lastTap.timer=setTimeout(function(){if(!lastTap||lastTap.element!==element)return;lastTap=null;if(!element.isConnected)return;replaying.add(element);element.click();queueMicrotask(function(){replaying.delete(element);});},DOUBLE_TAP_MS+10);
  }
}

document.addEventListener("click",interceptCoarseClick,true);
document.addEventListener("dragstart",function(event){if(event.target.closest&&event.target.closest("[data-player-profile='true']"))setDragging(true);},true);
document.addEventListener("dragend",function(){if(dragging)setDragging(false);},true);
document.addEventListener("drop",function(){if(dragging)setDragging(false);},true);
document.addEventListener("keydown",function(event){if(event.key==="Escape"&&current){event.preventDefault();close();}});
global.addEventListener("resize",function(){if(current){if(finePointer())place();else close();}},{passive:true});
global.addEventListener("orientationchange",function(){if(current)close();},{passive:true});
global.addEventListener("popstate",function(){if(current&&historyPushed)close(true);});

global.PlayerProfiles={bind:bind,bindSelector:bindSelector,open:open,close:close,setDragging:setDragging,isOpen:function(){return !!current;},_normalizedCache:normalizedCache};
})(window);
