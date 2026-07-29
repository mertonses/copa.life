(function(global){
"use strict";

const COPY={
  tr:{title:"MAÇ ANALİZİ",subtitle:"Sonucu açıklayan üç kısa neden",expectation:"BEKLENTİ",turning:"KIRILMA NOKTASI",decision:"KARAR ETKİSİ",open:"MAÇI ANALİZ ET",close:"Analizi kapat",score:"Maç sonucu",
    favStrong:n=>`Kağıt üzerinde belirgin favoriydin: +${n} güç. Bu avantaj pozisyon olasılığını artırdı, sonucu garanti etmedi.`,
    fav:n=>`Maça +${n} güç avantajıyla başladın; küçük fark nedeniyle sonuç hâlâ açıktı.`,
    dogStrong:n=>`Rakip kağıt üzerinde +${n} güç öndeydi; sürpriz için verimli bir maç gerekiyordu.`,
    dog:n=>`Rakip +${n} güç avantajlıydı, ancak fark maçı tek başına belirleyecek düzeyde değildi.`,
    even:"Takımlar güç olarak birbirine yakındı; küçük maç içi farklar daha belirleyici oldu.",
    finishing:"Ürettiğin pozisyonlar skora aynı ölçüde yansımadı; bitiricilik sonucu aşağı çekti.",
    clinical:"Rakip daha az üretimden daha fazla skor çıkardı; bitiricilik maçın kırılma noktasıydı.",
    keeper:n=>`Rakip kaleci ${n} kurtarışla üstünlüğün büyümesini engelledi.`,
    shotVolume:n=>`Şut sayısında ${n} fark kurdun; saha üstünlüğünün ana kaynağı buydu.`,
    cards:"Kartlar maçın dengesini ve sonraki hamle alanını etkiledi.",
    scoreSwing:"Skor ile oyun üretimi birbirine yakındı; tek bir kritik an sonucu çevirdi.",
    talkBackfire:"Soyunma odası konuşması ters tepti ve maç planını zorlaştırdı.",
    talk:n=>`Takım konuşması maç gücüne ${n>0?"+":""}${n} etki verdi.`,
    cardsUp:n=>`Aktif kartların maç gücüne +${n} katkı sağladı.`,
    prep:()=>`Hazırlık planı şut kalitesi, savunma baskısı ve duran top üretimini bu maça özel değiştirdi.`,
    tactics:n=>`${n} maç içi komut kullandın; komutlar yalnız uygulandıkları kısa bölümde etkiliydi.`,
    neutralDecision:"Karar etkileri sınırlı kaldı; sonucu esas olarak güç dengesi ve pozisyon kalitesi şekillendirdi."},
  en:{title:"MATCH ANALYSIS",subtitle:"Three concise reasons behind the result",expectation:"EXPECTATION",turning:"TURNING POINT",decision:"DECISION IMPACT",open:"ANALYSE MATCH",close:"Close analysis",score:"Match result",
    favStrong:n=>`You were the clear pre-match favourite at +${n} power. That improved chance quality, but did not guarantee the result.`,
    fav:n=>`You started with a +${n} power edge; the small gap still left the match open.`,
    dogStrong:n=>`The opponent held a +${n} power edge; an efficient match was needed for an upset.`,
    dog:n=>`The opponent was +${n} power ahead, but the gap was not large enough to decide the match alone.`,
    even:"The teams were closely matched on power, so small in-match swings mattered more.",
    finishing:"Your chance creation did not convert into goals at the same rate; finishing pulled the result down.",
    clinical:"The opponent scored more from less production; finishing was the key swing.",
    keeper:n=>`The opposing goalkeeper made ${n} saves and stopped your control from becoming a wider lead.`,
    shotVolume:n=>`You created a ${n}-shot advantage; volume was the main source of control.`,
    cards:"Cards changed the match balance and reduced the available margin for later decisions.",
    scoreSwing:"The score and underlying production were close; one critical moment decided it.",
    talkBackfire:"The dressing-room talk backfired and made the match plan harder to execute.",
    talk:n=>`The team talk changed match power by ${n>0?"+":""}${n}.`,
    cardsUp:n=>`Active cards added +${n} match power.`,
    prep:()=>`The preparation plan changed shot quality, defensive pressure and set-piece production for this match.`,
    tactics:n=>`You used ${n} in-match instructions; each affected only its short active window.`,
    neutralDecision:"Decision effects stayed limited; the power balance and chance quality shaped the result most."},
  es:{title:"ANÁLISIS DEL PARTIDO",subtitle:"Tres razones breves detrás del resultado",expectation:"EXPECTATIVA",turning:"PUNTO DE GIRO",decision:"EFECTO DE DECISIONES",open:"ANALIZAR PARTIDO",close:"Cerrar análisis",score:"Resultado",
    favStrong:n=>`Eras claro favorito con +${n} de fuerza. La ventaja mejoró tus opciones, pero no garantizaba el resultado.`,fav:n=>`Empezaste con +${n} de fuerza; la pequeña diferencia mantuvo abierto el partido.`,dogStrong:n=>`El rival tenía +${n} de fuerza; necesitabas un partido muy eficiente.`,dog:n=>`El rival tenía +${n} de fuerza, pero no bastaba para decidir el partido.`,even:"Las fuerzas eran similares; los pequeños detalles tuvieron más peso.",finishing:"Las ocasiones creadas no se convirtieron al mismo ritmo; la definición redujo el resultado.",clinical:"El rival marcó más con menos producción; la definición fue decisiva.",keeper:n=>`El portero rival hizo ${n} paradas y frenó tu dominio.`,shotVolume:n=>`Lograste una ventaja de ${n} tiros; el volumen explicó tu control.`,cards:"Las tarjetas alteraron el equilibrio y el margen de decisión.",scoreSwing:"La producción fue pareja; un momento crítico decidió el resultado.",talkBackfire:"La charla de vestuario salió mal y dificultó el plan.",talk:n=>`La charla cambió la fuerza en ${n>0?"+":""}${n}.`,cardsUp:n=>`Las cartas activas aportaron +${n} de fuerza.`,prep:n=>`La preparación aportó cerca de +${n} de fuerza solo para este partido.`,tactics:n=>`Usaste ${n} instrucciones, activas solo durante periodos cortos.`,neutralDecision:"Las decisiones tuvieron un efecto limitado; pesaron más la fuerza y la calidad de las ocasiones."},
  de:{title:"SPIELANALYSE",subtitle:"Drei kurze Gründe für das Ergebnis",expectation:"ERWARTUNG",turning:"WENDEPUNKT",decision:"ENTSCHEIDUNGSEFFEKT",open:"SPIEL ANALYSIEREN",close:"Analyse schließen",score:"Spielergebnis",
    favStrong:n=>`Du warst mit +${n} Stärke klarer Favorit. Das erhöhte die Chancen, garantierte aber nichts.`,fav:n=>`Du startetest mit +${n} Stärke; der kleine Abstand ließ das Spiel offen.`,dogStrong:n=>`Der Gegner lag +${n} Stärke vorn; für eine Überraschung war hohe Effizienz nötig.`,dog:n=>`Der Gegner hatte +${n} Stärke, doch der Abstand entschied das Spiel nicht allein.`,even:"Die Teams waren ähnlich stark; kleine Spielszenen wogen stärker.",finishing:"Deine Chancen wurden nicht entsprechend in Tore umgesetzt; die Verwertung kostete Ergebnis.",clinical:"Der Gegner erzielte aus weniger Chancen mehr Tore; die Verwertung war entscheidend.",keeper:n=>`Der gegnerische Torwart verhinderte mit ${n} Paraden einen größeren Vorteil.`,shotVolume:n=>`Du hattest ${n} Schüsse mehr; das Volumen war die Basis deiner Kontrolle.`,cards:"Karten veränderten Balance und Handlungsspielraum.",scoreSwing:"Leistung und Ergebnis lagen eng beieinander; ein Schlüsselmoment entschied.",talkBackfire:"Die Kabinenansprache ging nach hinten los und erschwerte den Plan.",talk:n=>`Die Ansprache veränderte die Spielstärke um ${n>0?"+":""}${n}.`,cardsUp:n=>`Aktive Karten brachten +${n} Spielstärke.`,prep:n=>`Die Vorbereitung brachte ungefähr +${n} Stärke nur für dieses Spiel.`,tactics:n=>`Du nutztest ${n} Anweisungen; jede wirkte nur kurzzeitig.`,neutralDecision:"Entscheidungen wirkten begrenzt; Stärkeverhältnis und Chancenqualität prägten das Ergebnis."},
  it:{title:"ANALISI PARTITA",subtitle:"Tre motivi sintetici dietro il risultato",expectation:"ASPETTATIVA",turning:"SVOLTA",decision:"IMPATTO DECISIONI",open:"ANALIZZA PARTITA",close:"Chiudi analisi",score:"Risultato",
    favStrong:n=>`Eri nettamente favorito con +${n} forza. Il vantaggio aumentava le occasioni, senza garantire il risultato.`,fav:n=>`Partivi con +${n} forza; il margine ridotto lasciava la partita aperta.`,dogStrong:n=>`L'avversario aveva +${n} forza; serviva una gara molto efficiente.`,dog:n=>`L'avversario aveva +${n} forza, ma il divario non decideva da solo.`,even:"Le squadre erano vicine per forza; i piccoli episodi hanno pesato di più.",finishing:"Le occasioni create non sono diventate gol allo stesso ritmo; la finalizzazione ha pesato.",clinical:"L'avversario ha segnato di più creando meno; la finalizzazione è stata decisiva.",keeper:n=>`Il portiere avversario ha effettuato ${n} parate limitando il tuo vantaggio.`,shotVolume:n=>`Hai creato ${n} tiri in più; il volume è stato la fonte principale del controllo.`,cards:"I cartellini hanno cambiato equilibrio e margine decisionale.",scoreSwing:"La produzione è rimasta vicina; un episodio critico ha deciso.",talkBackfire:"Il discorso nello spogliatoio ha avuto l'effetto opposto e complicato il piano.",talk:n=>`Il discorso ha modificato la forza di ${n>0?"+":""}${n}.`,cardsUp:n=>`Le carte attive hanno aggiunto +${n} forza.`,prep:n=>`La preparazione ha dato circa +${n} forza solo per questa partita.`,tactics:n=>`Hai usato ${n} istruzioni, attive solo per brevi finestre.`,neutralDecision:"Le decisioni hanno inciso poco; equilibrio di forza e qualità delle occasioni hanno contato di più."}
};

let layer=null,previousFocus=null;
const lang=()=>COPY[global.LANG]?global.LANG:"en";
const finite=value=>Number.isFinite(Number(value))?Number(value):null;
const pair=value=>Array.isArray(value)&&value.length>=2?[Number(value[0])||0,Number(value[1])||0]:null;
const cleanNumber=value=>Math.round(Number(value)*10)/10;
const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

function validPerf(report,perf){
  if(!perf||typeof perf!=="object")return null;
  if(report&&Array.isArray(report.score)){
    const gf=finite(perf.gf),ga=finite(perf.ga);
    if(gf!=null&&ga!=null&&(gf!==Number(report.score[0])||ga!==Number(report.score[1])))return null;
  }
  return perf;
}

function sourceFor(report,perf){
  const safeReport=report&&typeof report==="object"?report:{};
  const stored=safeReport.analysis&&typeof safeReport.analysis==="object"?safeReport.analysis:{};
  const current=validPerf(safeReport,perf)||{};
  return Object.assign({},current,stored,{
    power:finite(stored.power)!=null?finite(stored.power):finite(safeReport.homePower),
    oppPower:finite(stored.oppPower)!=null?finite(stored.oppPower):finite(safeReport.awayPower),
    xg:pair(stored.xg)||pair(current.xg),
    shots:pair(stored.shots)||pair(current.shots),
    saves:pair(stored.saves)||pair(current.saves),
  });
}

function expectation(data,c){
  const home=finite(data.power),away=finite(data.oppPower),gap=home==null||away==null?0:Math.round(home-away),magnitude=Math.abs(gap);
  if(magnitude<=2)return c.even;
  if(gap>0)return magnitude>=8?c.favStrong(magnitude):c.fav(magnitude);
  return magnitude>=8?c.dogStrong(magnitude):c.dog(magnitude);
}

function turningPoint(data,report,c){
  const xg=pair(data.xg),shots=pair(data.shots),saves=pair(data.saves),score=report&&Array.isArray(report.score)?report.score:[finite(data.gf)||0,finite(data.ga)||0];
  if(xg&&xg[0]>=Number(score[0])+.7)return c.finishing;
  if(xg&&xg[1]+.55<xg[0]&&Number(score[1])>Number(score[0]))return c.clinical;
  if(saves&&saves[1]>=4)return c.keeper(Math.round(saves[1]));
  if(shots&&Math.abs(shots[0]-shots[1])>=4)return c.shotVolume(Math.abs(Math.round(shots[0]-shots[1])));
  const events=Array.isArray(report&&report.events)?report.events:[],cards=events.filter(event=>event&&/yellow|red|card/.test(String(event.type||""))).length;
  return cards?c.cards:c.scoreSwing;
}

function decisionImpact(data,c){
  const talk=data.talk&&typeof data.talk==="object"?data.talk:null;
  if(talk&&talk.backfire)return c.talkBackfire;
  if(talk&&finite(talk.delta)!=null&&Number(talk.delta)!==0)return c.talk(cleanNumber(talk.delta));
  if(finite(data.cardBonus)>0)return c.cardsUp(cleanNumber(data.cardBonus));
  const preparation=data.preparation&&typeof data.preparation==="object"?data.preparation:null;
  if(preparation&&(["attack","defence","setpiece","chemistry","penalty"].some(key=>finite(preparation[key])>0)||preparation.analysis))return c.prep();
  if(finite(data.decisionCount)>0)return c.tactics(Math.round(data.decisionCount));
  return c.neutralDecision;
}

function build(report,perf){
  const c=COPY[lang()],data=sourceFor(report,perf);
  return[
    {key:"expectation",label:c.expectation,text:expectation(data,c)},
    {key:"turning",label:c.turning,text:turningPoint(data,report,c)},
    {key:"decision",label:c.decision,text:decisionImpact(data,c)}
  ];
}

function triggerHTML(){
  const c=COPY[lang()];
  return `<button type="button" class="match-analysis-trigger" onclick="CopaMatchAnalysis.open()" aria-haspopup="dialog"><span class="match-analysis-trigger-icon" aria-hidden="true">≋</span><span><b>${c.open}</b><small>${c.subtitle}</small></span><i aria-hidden="true">→</i></button>`;
}

function ensureLayer(){
  if(layer)return layer;
  layer=document.createElement("div");
  layer.id="matchAnalysisLayer";
  layer.className="match-analysis-layer hidden";
  layer.setAttribute("aria-hidden","true");
  layer.addEventListener("click",event=>{if(event.target===layer)close();});
  document.body.appendChild(layer);
  return layer;
}

function open(report){
  const source=report||global.lastMatchReportData;
  if(!source)return false;
  const c=COPY[lang()],score=Array.isArray(source.score)?source.score:[0,0],items=build(source,global.lastMatchPerf);
  const node=ensureLayer();
  previousFocus=document.activeElement&&document.activeElement!==document.body?document.activeElement:null;
  node.innerHTML=`<section class="match-analysis-dialog" role="dialog" aria-modal="true" aria-labelledby="matchAnalysisTitle" aria-describedby="matchAnalysisSubtitle">
    <header><div><span>${esc(c.title)}</span><h2 id="matchAnalysisTitle">${esc(source.homeName||"XI")} <b>${esc(score[0])}–${esc(score[1])}</b> ${esc(source.awayName||"")}</h2><p id="matchAnalysisSubtitle">${esc(c.subtitle)}</p></div><button type="button" class="match-analysis-close" onclick="CopaMatchAnalysis.close()" aria-label="${esc(c.close)}">×</button></header>
    <div class="match-analysis-reasons">${items.map((item,index)=>`<article class="match-analysis-reason is-${item.key}"><span aria-hidden="true">0${index+1}</span><div><b>${esc(item.label)}</b><p>${esc(item.text)}</p></div></article>`).join("")}</div>
  </section>`;
  node.classList.remove("hidden");node.setAttribute("aria-hidden","false");
  document.documentElement.classList.add("match-analysis-open");
  const background=document.querySelector(".wrap");
  if(background)background.setAttribute("aria-hidden","true");
  requestAnimationFrame(()=>node.querySelector(".match-analysis-close")?.focus());
  return true;
}

function close(){
  if(!layer||layer.classList.contains("hidden"))return false;
  layer.classList.add("hidden");layer.setAttribute("aria-hidden","true");
  document.documentElement.classList.remove("match-analysis-open");
  const background=document.querySelector(".wrap");
  if(background)background.removeAttribute("aria-hidden");
  const focus=previousFocus;previousFocus=null;
  if(focus&&focus.isConnected)requestAnimationFrame(()=>focus.focus({preventScroll:true}));
  return true;
}

function isOpen(){return !!layer&&!layer.classList.contains("hidden");}
function mountResultEntry(){
  const host=document.getElementById("matchAnalysisEntry");
  if(!host)return false;
  host.innerHTML=global.lastMatchReportData?triggerHTML():"";
  host.classList.toggle("hidden",!global.lastMatchReportData);
  return !!global.lastMatchReportData;
}

document.addEventListener("keydown",event=>{
  if(!isOpen())return;
  if(event.key==="Escape"){event.preventDefault();close();return;}
  if(event.key!=="Tab")return;
  const focusable=[...layer.querySelectorAll("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")].filter(node=>!node.disabled);
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

global.CopaMatchAnalysis=Object.freeze({build,triggerHTML,open,close,isOpen,mountResultEntry,_sourceForTest:sourceFor});
})(window);
