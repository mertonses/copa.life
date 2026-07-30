/* Horizontal career progression, club museum, run archive and portable save codes. */
(function(global){
  "use strict";

  const STORAGE_KEY="copa_meta_progression_v1";
  const FORMAT="copa-life-save";
  const VERSION=5;
  const ARCHIVE_LIMIT=20;
  const MUSEUM_LIMIT=60;
  const HALL_LIMIT=11;
  const LICENSE_LEVELS=new Set([3,5,7,9,12,15]);
  const STYLES=new Set(["gegen","kontra","tiki","uzun","blok"]);
  const COUNTRIES=new Set(["TR","IT","ENG","ES","DE","JP"]);
  const CLUB_FILE_IDS=new Set(["debt","youth","tactics"]);
  const BADGES=Object.freeze({
    first_run:["İlk Adım","First Step"],
    finalist:["Son Perde","Final Act"],
    champion:["Kupa Sahibi","Cup Winner"],
    clean_books:["Dengeli Defter","Balanced Books"],
    collector:["Kart Mimarı","Card Architect"],
    ghost_match:["Hayalet Avcı","Ghost Hunter"],
    six_styles:["Taktik Gezgin","Tactical Traveller"]
  });
  const DIRECTIVES=Object.freeze({
    clean_cup:{tr:"Temiz Kupa",en:"Clean Cup",trGoal:"Borçsuz şampiyon ol",enGoal:"Win the cup without debt",reward:"crest_clean_cup",kind:"crest"},
    youth_final:{tr:"Gençlik Yürüyüşü",en:"Youth March",trGoal:"En az 4 gençle finale çık",enGoal:"Reach the final with at least 4 young players",reward:"kit_youth_march",kind:"kit"},
    pure_tactics:{tr:"Saf Taktik",en:"Pure Tactics",trGoal:"Kart kullanmadan şampiyon ol",enGoal:"Win the cup without cards",reward:"story_pure_tactics",kind:"story"}
  });
  const STYLE_PLANS=Object.freeze({
    gegen:{shotQuality:0,passQuality:0,defensivePressure:0,setPieceBias:0,lateStamina:-.03,pressResistance:.035,opening:.01,styleFit:0},
    kontra:{shotQuality:.025,passQuality:-1,defensivePressure:0,setPieceBias:0,lateStamina:.015,pressResistance:0,opening:0,styleFit:0},
    tiki:{shotQuality:-.015,passQuality:2,defensivePressure:0,setPieceBias:0,lateStamina:0,pressResistance:.018,opening:0,styleFit:0},
    uzun:{shotQuality:.012,passQuality:-1.5,defensivePressure:0,setPieceBias:.16,lateStamina:0,pressResistance:0,opening:0,styleFit:0},
    blok:{shotQuality:-.02,passQuality:0,defensivePressure:.035,setPieceBias:0,lateStamina:.015,pressResistance:0,opening:0,styleFit:0}
  });
  const empty=()=>({
    version:VERSION,
    career:{reputation:0,licenses:0,unlockWindowOpen:false,selectedStylePlan:"",prestige:0},
    mastery:{styles:{},formations:{},chairmen:{}},
    badges:[],
    archive:[],
    museum:{memories:[],hall:[],collections:{claimed:[],stories:[],kits:[],crests:[],tokens:0,selectedKit:"",selectedCrest:""}},
    clubFiles:{completed:{debt:0,youth:0,tactics:0},claimed:[]},
    chairHistory:{}
    ,directives:{selected:"",completed:[]}
  });
  const safeGet=()=>{try{return localStorage.getItem(STORAGE_KEY);}catch(_){return null;}};
  const safeSet=value=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));return true;}catch(_){return false;}};
  const text=(value,max=48)=>String(value==null?"":value).replace(/[<>\r\n]/g,"").replace(/\s+/g," ").trim().slice(0,max);
  const integer=(value,min,max)=>Math.max(min,Math.min(max,Math.round(Number(value)||0)));
  const hash=value=>{let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
  const object=value=>!!value&&typeof value==="object"&&!Array.isArray(value);
  const countMap=(value,allow)=>{const out={};if(!object(value))return out;for(const [key,count] of Object.entries(value)){if(allow(key))out[key]=integer(count,0,1000000);}return out;};
  const base64Encode=value=>{const bytes=new TextEncoder().encode(value);let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);};
  const base64Decode=value=>{const binary=atob(value);const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));return new TextDecoder().decode(bytes);};
  const escapeHTML=value=>text(value,120).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");

  function levelThreshold(level){
    const n=Math.max(0,integer(level,1,1000)-1);
    return n*80+n*(n-1)*10;
  }
  function careerLevel(reputation){
    const value=integer(reputation,0,100000000);
    let level=1;
    while(level<1000&&value>=levelThreshold(level+1))level++;
    return level;
  }
  function nextCareerReward(level){
    for(let candidate=Math.max(2,level+1);candidate<=15;candidate++){
      if(LICENSE_LEVELS.has(candidate))return {level:candidate,type:"license",threshold:levelThreshold(candidate)};
    }
    const prestigeLevel=Math.max(18,Math.ceil((Math.max(15,level)+1)/3)*3);
    return prestigeLevel<=999?{level:prestigeLevel,type:"prestige",threshold:levelThreshold(prestigeLevel)}:null;
  }
  const masteryTier=count=>count>=20?4:count>=10?3:count>=5?2:count>=2?1:0;
  const tierLabel=(count,tr)=>[tr?"Yeni":"Rookie",tr?"Deneyimli":"Seasoned",tr?"Uzman":"Specialist",tr?"Usta":"Master",tr?"Efsane":"Legend"][masteryTier(count)];

  function cleanPlayer(value,index=0){
    if(!object(value))return null;
    const name=text(value.name,72);
    if(!name)return null;
    return {
      id:text(value.id,40)||`p-${hash([name,value.pos,index].join("|"))}`,
      name,
      pos:text(value.pos,8),
      power:integer(value.power==null?(value.eff==null?value.ov:value.eff):value.power,0,130),
      club:text(value.club,48),
      age:integer(value.age,0,60)
    };
  }
  function cleanArchiveEntry(value){
    if(!object(value))return null;
    const seed=integer(value.seed,0,4294967295),round=integer(value.round,1,7);
    const id=/^run-[a-z0-9]{4,32}$/.test(String(value.id||""))?String(value.id):"run-"+hash([seed,round,value.finishedAt||""].join("|"));
    const result=["win","loss","sacked"].includes(value.result)?value.result:"loss";
    const country=COUNTRIES.has(value.country)?value.country:"TR";
    const runStyle=STYLES.has(value.style)?value.style:"gegen";
    return {
      id,finishedAt:/^\d{4}-\d{2}-\d{2}T/.test(String(value.finishedAt||""))?String(value.finishedAt).slice(0,24):new Date().toISOString(),
      seed,team:text(value.team,29)||"COPA XI",country,formation:text(value.formation,16),style:runStyle,
      chairman:text(value.chairman,24),identity:text(value.identity,40),round,result,
      power:integer(value.power,0,130),cards:integer(value.cards,0,99),cash:integer(value.cash,-100,250),
      score:text(value.score,16),ghost:!!value.ghost,reputation:integer(value.reputation,0,1000),
      endType:text(value.endType,32)
    };
  }
  function cleanMemory(value){
    if(!object(value))return null;
    const entry=cleanArchiveEntry(value);
    if(!entry)return null;
    const players=(Array.isArray(value.players)?value.players:[]).slice(0,18).map(cleanPlayer).filter(Boolean);
    if(!players.length)return null;
    return Object.assign({},entry,{
      players,
      featuredIndex:integer(value.featuredIndex,0,players.length-1)
    });
  }
  function normalize(value){
    const source=object(value)?value:{},mastery=object(source.mastery)?source.mastery:{},career=object(source.career)?source.career:{};
    const archive=(Array.isArray(source.archive)?source.archive:[]).map(cleanArchiveEntry).filter(Boolean);
    const uniqueArchive=[];for(const item of archive){const at=uniqueArchive.findIndex(entry=>entry.id===item.id);if(at>=0)uniqueArchive.splice(at,1);uniqueArchive.push(item);}
    const museumSource=object(source.museum)?source.museum:{};
    const collectionSource=object(museumSource.collections)?museumSource.collections:{};
    const claimed=Array.from(new Set((Array.isArray(collectionSource.claimed)?collectionSource.claimed:[]).map(value=>text(value,40)).filter(Boolean)));
    const cosmetics=value=>Array.from(new Set((Array.isArray(value)?value:[]).map(item=>text(item,40)).filter(Boolean)));
    const memories=(Array.isArray(museumSource.memories)?museumSource.memories:[]).map(cleanMemory).filter(Boolean);
    const uniqueMemories=[];for(const item of memories){const at=uniqueMemories.findIndex(entry=>entry.id===item.id);if(at>=0)uniqueMemories.splice(at,1);uniqueMemories.push(item);}
    const memoryIds=new Set(uniqueMemories.map(item=>item.id));
    const hall=(Array.isArray(museumSource.hall)?museumSource.hall:[]).filter(item=>object(item)&&memoryIds.has(item.runId)).map(item=>({
      runId:text(item.runId,40),playerId:text(item.playerId,40)
    })).filter((item,index,list)=>list.findIndex(other=>other.runId===item.runId&&other.playerId===item.playerId)===index).slice(0,HALL_LIMIT);
    const clubSource=object(source.clubFiles)?source.clubFiles:{},historySource=object(source.chairHistory)?source.chairHistory:{};
    const clubClaimed=Array.from(new Set((Array.isArray(clubSource.claimed)?clubSource.claimed:[]).map(item=>text(item,32)).filter(item=>CLUB_FILE_IDS.has(item)||item==="club_files_set")));
    const chairHistory={};
    for(const [chairId,raw] of Object.entries(historySource)){
      if(!/^[a-z_]{2,24}$/.test(chairId)||!object(raw))continue;
      const decisions=object(raw.decisions)?countMap(raw.decisions,key=>/^[a-z_]{2,32}$/.test(key)):{};
      chairHistory[chairId]={
        runs:integer(raw.runs,0,1000000),decisionCount:integer(raw.decisionCount,0,1000000),
        positive:integer(raw.positive,0,1000000),negative:integer(raw.negative,0,1000000),decisions,
        lastOutcome:/^[a-z_]{2,32}$/.test(String(raw.lastOutcome||""))?String(raw.lastOutcome):"",
        lastPositive:!!raw.lastPositive,lastRunId:text(raw.lastRunId,40)
      };
    }
    return {
      version:VERSION,
      career:{
        reputation:integer(career.reputation,0,100000000),
        licenses:integer(career.licenses,0,99),
        unlockWindowOpen:!!career.unlockWindowOpen,
        selectedStylePlan:STYLES.has(career.selectedStylePlan)?career.selectedStylePlan:"",
        prestige:integer(career.prestige,0,999)
      },
      mastery:{
        styles:countMap(mastery.styles,key=>STYLES.has(key)),
        formations:countMap(mastery.formations,key=>global.FORMORDER?global.FORMORDER.includes(key):/^[0-9]-[0-9]/.test(key)),
        chairmen:countMap(mastery.chairmen,key=>global.CHAIR_ORDER?global.CHAIR_ORDER.includes(key):/^[a-z_]{2,24}$/.test(key))
      },
      badges:Array.from(new Set((Array.isArray(source.badges)?source.badges:[]).filter(key=>Object.hasOwn(BADGES,key)))),
      archive:uniqueArchive.slice(-ARCHIVE_LIMIT),
      museum:{memories:uniqueMemories.slice(-MUSEUM_LIMIT),hall,collections:{
        claimed,stories:cosmetics(collectionSource.stories),kits:cosmetics(collectionSource.kits),crests:cosmetics(collectionSource.crests),tokens:integer(collectionSource.tokens,0,3),
        selectedKit:cosmetics(collectionSource.kits).includes(text(collectionSource.selectedKit,40))?text(collectionSource.selectedKit,40):"",
        selectedCrest:cosmetics(collectionSource.crests).includes(text(collectionSource.selectedCrest,40))?text(collectionSource.selectedCrest,40):""
      }},
      clubFiles:{completed:Object.assign({debt:0,youth:0,tactics:0},countMap(clubSource.completed,key=>CLUB_FILE_IDS.has(key))),claimed:clubClaimed},
      chairHistory,
      directives:{
        selected:Object.hasOwn(DIRECTIVES,source.directives&&source.directives.selected)?source.directives.selected:"",
        completed:Array.from(new Set((Array.isArray(source.directives&&source.directives.completed)?source.directives.completed:[]).filter(id=>Object.hasOwn(DIRECTIVES,id))))
      }
    };
  }
  let state=(()=>{try{return normalize(JSON.parse(safeGet()||"null"));}catch(_){return empty();}})();
  const persist=()=>safeSet(state);
  const addBadge=key=>{if(Object.hasOwn(BADGES,key)&&!state.badges.includes(key))state.badges.push(key);};
  const increment=(map,key)=>{if(key)map[key]=integer((map[key]||0)+1,0,1000000);};
  const lockedFormationCount=()=>Array.isArray(global.FORMORDER)?global.FORMORDER.filter(item=>!(global.unlockedForms||[]).includes(item)).length:0;
  const COLLECTIONS=Object.freeze([
    {id:"story_first_steps",kind:"story",reward:"story_first_steps",test:()=>state.museum.memories.length>=3},
    {id:"kit_tactical_journey",kind:"kit",reward:"kit_tactical_journey",test:()=>new Set(state.archive.map(item=>item.style)).size>=3},
    {id:"crest_boardroom",kind:"crest",reward:"crest_boardroom",test:()=>new Set(state.archive.map(item=>item.chairman)).size>=3},
    {id:"token_hall_champion",kind:"token",reward:"run_start_token",test:()=>state.archive.some(item=>item.result==="win")&&state.museum.hall.length>=5}
  ]);
  function evaluateCollections(){
    const unlocked=[];
    for(const collection of COLLECTIONS){
      if(state.museum.collections.claimed.includes(collection.id)||!collection.test())continue;
      state.museum.collections.claimed.push(collection.id);
      if(collection.kind==="story")state.museum.collections.stories.push(collection.reward);
      else if(collection.kind==="kit")state.museum.collections.kits.push(collection.reward);
      else if(collection.kind==="crest")state.museum.collections.crests.push(collection.reward);
      else state.museum.collections.tokens=Math.min(3,state.museum.collections.tokens+1);
      unlocked.push({id:collection.id,kind:collection.kind,reward:collection.reward});
    }
    return unlocked;
  }
  function consumeStartToken(){
    if(state.museum.collections.tokens<1)return 0;
    state.museum.collections.tokens--;persist();return 1;
  }
  function activeCosmetics(){
    return {
      kit:state.museum.collections.selectedKit||"",
      crest:state.museum.collections.selectedCrest||""
    };
  }
  function directivePassed(id,value){
    const players=Array.isArray(value.players)?value.players:[],young=players.filter(player=>Number(player&&player.age)<=21).length;
    if(id==="clean_cup")return !!value.won&&Number(value.cash)>=0;
    if(id==="youth_final")return (value.won||Number(value.round)>=7)&&young>=4;
    if(id==="pure_tactics")return !!value.won&&Number(value.cards)===0;
    return false;
  }
  function refreshProgressionView(tab){
    const shell=global.CopaMobileShell;
    if(shell&&typeof shell.isCareerRouteActive==="function"&&shell.isCareerRouteActive()&&typeof shell.refreshCareerSection==="function"){
      shell.refreshCareerSection(tab);
      return;
    }
    openProgression(tab);
  }
  function selectDirective(id){
    const key=String(id||"");
    if(key&&!Object.hasOwn(DIRECTIVES,key))return false;
    state.directives.selected=state.directives.selected===key?"":key;persist();refreshProgressionView("career");return true;
  }
  function completeDirective(value){
    const id=state.directives.selected;
    if(!id||state.directives.completed.includes(id)||!directivePassed(id,value))return null;
    const def=DIRECTIVES[id];state.directives.completed.push(id);
    const field=def.kind==="kit"?"kits":def.kind==="crest"?"crests":"stories";
    state.museum.collections[field].push(def.reward);
    state.museum.collections[field]=Array.from(new Set(state.museum.collections[field]));
    return{id,kind:def.kind,reward:def.reward};
  }
  function selectStylePlan(styleId){
    const id=String(styleId||""),count=state.mastery.styles[id]||0;
    if(!STYLES.has(id)||count<5)return false;
    state.career.selectedStylePlan=state.career.selectedStylePlan===id?"":id;persist();refreshProgressionView("mastery");return true;
  }
  function activeStylePlan(styleId){
    const id=String(styleId||"");
    if(state.career.selectedStylePlan!==id||(state.mastery.styles[id]||0)<5)return null;
    return {...STYLE_PLANS[id],id};
  }
  function completeClubFile(id){
    const key=String(id||"");
    if(!CLUB_FILE_IDS.has(key))return {ok:false,reason:"invalid"};
    increment(state.clubFiles.completed,key);
    const rewards=[],first=!state.clubFiles.claimed.includes(key);
    if(first){
      state.clubFiles.claimed.push(key);
      if(key==="debt"){state.museum.collections.stories.push("story_clean_ledger");rewards.push({kind:"story",id:"story_clean_ledger"});}
      if(key==="youth"){state.museum.collections.crests.push("crest_academy_threads");rewards.push({kind:"crest",id:"crest_academy_threads"});}
      if(key==="tactics"){state.museum.collections.kits.push("kit_three_plans");rewards.push({kind:"kit",id:"kit_three_plans"});}
    }
    if([...CLUB_FILE_IDS].every(item=>state.clubFiles.claimed.includes(item))&&!state.clubFiles.claimed.includes("club_files_set")){
      state.clubFiles.claimed.push("club_files_set");
      state.museum.collections.tokens=Math.min(3,state.museum.collections.tokens+1);
      rewards.push({kind:"token",id:"run_start_token"});
    }
    state.museum.collections.stories=Array.from(new Set(state.museum.collections.stories));
    state.museum.collections.kits=Array.from(new Set(state.museum.collections.kits));
    state.museum.collections.crests=Array.from(new Set(state.museum.collections.crests));
    persist();
    return {ok:true,first,rewards,completed:state.clubFiles.completed[key]};
  }
  function clubFileSummary(){return JSON.parse(JSON.stringify(state.clubFiles));}
  function chairHistoryFor(chairId){
    const key=String(chairId||"");
    return JSON.parse(JSON.stringify(state.chairHistory[key]||{runs:0,decisionCount:0,positive:0,negative:0,decisions:{},lastOutcome:"",lastPositive:false,lastRunId:""}));
  }
  function ensureChairHistory(chairId){
    const key=text(chairId,24);
    if(!key)return null;
    if(!state.chairHistory[key])state.chairHistory[key]={runs:0,decisionCount:0,positive:0,negative:0,decisions:{},lastOutcome:"",lastPositive:false,lastRunId:""};
    return state.chairHistory[key];
  }
  function recordChairDecision(chairId,outcomeId,positive){
    const history=ensureChairHistory(chairId),outcome=text(outcomeId,32);
    if(!history||!/^[a-z_]{2,32}$/.test(outcome))return false;
    increment(history.decisions,outcome);history.decisionCount=integer(history.decisionCount+1,0,1000000);
    if(positive)history.positive=integer(history.positive+1,0,1000000);else history.negative=integer(history.negative+1,0,1000000);
    history.lastOutcome=outcome;history.lastPositive=!!positive;persist();return true;
  }
  function recordChairRun(chairId,runId){
    const history=ensureChairHistory(chairId),id=text(runId,40);
    if(!history||!id||history.lastRunId===id)return false;
    history.runs=integer(history.runs+1,0,1000000);history.lastRunId=id;persist();return true;
  }
  function selectCosmetic(kind,id){
    const field=kind==="kit"?"selectedKit":kind==="crest"?"selectedCrest":"";
    const owned=kind==="kit"?state.museum.collections.kits:kind==="crest"?state.museum.collections.crests:[];
    if(!field||!owned.includes(id))return false;
    state.museum.collections[field]=state.museum.collections[field]===id?"":id;
    persist();
    refreshProgressionView("museum");
    return true;
  }

  function reputationFor(value){
    const played=integer(value.playedMatches==null?value.round:value.playedMatches,1,7);
    const wins=integer(value.wins,0,7);
    const draws=integer(value.draws,0,7);
    return 10+played*6+wins*4+draws*2+(value.personalBest?10:0)+(value.won?25:0);
  }
  function recordRun(context){
    const value=object(context)?context:{},result=value.won?"win":value.endType==="sacked"?"sacked":"loss";
    const reputation=reputationFor(value),oldReputation=state.career.reputation,oldLevel=careerLevel(oldReputation);
    const newReputation=oldReputation+reputation,newLevel=careerLevel(newReputation);
    let levelLicenses=0;
    for(let level=oldLevel+1;level<=newLevel;level++)if(LICENSE_LEVELS.has(level))levelLicenses++;
    let prestigeEarned=0;
    for(let level=Math.max(18,oldLevel+1);level<=newLevel;level++)if(level%3===0)prestigeEarned++;
    const championLicense=value.won?1:0;
    const licensesEarned=lockedFormationCount()>0?levelLicenses+championLicense:0;
    state.career.reputation=newReputation;
    state.career.prestige=integer(state.career.prestige+prestigeEarned,0,999);
    for(let index=0;index<prestigeEarned;index++)state.museum.collections.crests.push(`crest_prestige_${state.career.prestige-prestigeEarned+index+1}`);
    state.museum.collections.crests=Array.from(new Set(state.museum.collections.crests));
    state.career.licenses=integer(state.career.licenses+licensesEarned,0,99);
    state.career.unlockWindowOpen=state.career.licenses>0;

    const entry=cleanArchiveEntry({
      id:"run-"+hash([value.seed,value.metaRun,value.country,value.team].join("|")),
      finishedAt:new Date().toISOString(),seed:value.seed,team:value.team,country:value.country,
      formation:value.formation,style:value.style,chairman:value.chairman,identity:value.identity,
      round:value.won?7:value.round,result,power:value.power,cards:value.cards,cash:value.cash,
      score:value.score,ghost:value.ghost,reputation,endType:value.endType
    });
    if(!entry)return null;
    const masteryBefore={
      style:state.mastery.styles[entry.style]||0,
      formation:state.mastery.formations[entry.formation]||0,
      chairman:state.mastery.chairmen[entry.chairman]||0
    };
    increment(state.mastery.styles,entry.style);
    increment(state.mastery.formations,entry.formation);
    increment(state.mastery.chairmen,entry.chairman);
    recordChairRun(entry.chairman,entry.id);
    addBadge("first_run");if(entry.round>=7)addBadge("finalist");if(entry.result==="win")addBadge("champion");
    if(entry.cash>=0)addBadge("clean_books");if(entry.cards>=5)addBadge("collector");if(entry.ghost)addBadge("ghost_match");
    if(Object.keys(state.mastery.styles).filter(key=>state.mastery.styles[key]>0).length>=STYLES.size)addBadge("six_styles");
    state.archive=state.archive.filter(item=>item.id!==entry.id).concat(entry).slice(-ARCHIVE_LIMIT);

    const memory=cleanMemory(Object.assign({},entry,{players:value.players,featuredIndex:value.featuredIndex||0}));
    if(memory)state.museum.memories=state.museum.memories.filter(item=>item.id!==memory.id).concat(memory).slice(-MUSEUM_LIMIT);
    const directiveReward=completeDirective(value),collectionsUnlocked=evaluateCollections();
    persist();
    const masteryAfter={
      style:state.mastery.styles[entry.style]||0,
      formation:state.mastery.formations[entry.formation]||0,
      chairman:state.mastery.chairmen[entry.chairman]||0
    };
    return {
      entry,reputation,oldReputation,newReputation,oldLevel,newLevel,licensesEarned,prestigeEarned,
      licensesAvailable:state.career.licenses,memory,
      mastery:{before:masteryBefore,after:masteryAfter},collectionsUnlocked,directiveReward
    };
  }

  function requestFormationUnlock(formation){
    const id=text(formation,16);
    if(!global.FORMORDER||!global.FORMORDER.includes(id)||(global.unlockedForms||[]).includes(id))return {ok:false,reason:"invalid"};
    if(state.career.licenses<1)return {ok:false,reason:"no_license"};
    if(!state.career.unlockWindowOpen)return {ok:false,reason:"window_closed"};
    global.unlockedForms.push(id);
    state.career.licenses--;
    state.career.unlockWindowOpen=false;
    persist();
    if(typeof global.saveMeta==="function")global.saveMeta();
    if(typeof global.buildFormButtons==="function")global.buildFormButtons();
    if(typeof global.applyMeta==="function")global.applyMeta();
    return {ok:true,formation:id,licenses:state.career.licenses};
  }
  function setFeaturedPlayer(runId,index){
    const memory=state.museum.memories.find(item=>item.id===runId);
    if(!memory)return false;
    memory.featuredIndex=integer(index,0,memory.players.length-1);
    persist();return true;
  }
  function toggleHallPlayer(runId,playerId){
    const memory=state.museum.memories.find(item=>item.id===runId);
    if(!memory||!memory.players.some(player=>player.id===playerId))return false;
    const at=state.museum.hall.findIndex(item=>item.runId===runId&&item.playerId===playerId);
    if(at>=0)state.museum.hall.splice(at,1);
    else{
      if(state.museum.hall.length>=HALL_LIMIT)return false;
      state.museum.hall.push({runId,playerId});
    }
    evaluateCollections();
    persist();return true;
  }

  function resultMeta(item,tr){
    if(item.result==="win")return {label:tr?"Şampiyon":"Champion",className:"is-win"};
    if(item.result==="sacked")return {label:tr?"Kovuldu":"Sacked",className:"is-sacked"};
    if(item.endType==="group_eliminated")return {label:tr?"Grupta Elendi":"Group Exit",className:"is-out"};
    if(item.round>=7)return {label:tr?"Final":"Final",className:"is-final"};
    return {label:tr?"Elendi":"Out",className:"is-out"};
  }
  function stageProgress(item,tr){const round=Number(item&&item.round)||0;if(item&&item.endType==="group_eliminated")return tr?"3 grup maçı":"3 group matches";if(round<=3)return tr?`Grup maçı ${round}/3`:`Group match ${round}/3`;if(round===4)return tr?"Son 16":"Round of 16";if(round===5)return tr?"Çeyrek final":"Quarter-final";if(round===6)return tr?"Yarı final":"Semi-final";return tr?"Final":"Final";}
  function archiveRowsHTML(tr,limit=ARCHIVE_LIMIT){
    return [...state.archive].reverse().slice(0,limit).map(item=>{
      const result=resultMeta(item,tr);
      const date=new Date(item.finishedAt).toLocaleDateString(tr?"tr-TR":"en-GB",{day:"2-digit",month:"short"});
      return `<article class="meta-run-row ${result.className}">
        <span class="meta-run-main"><b>${escapeHTML(item.team)}</b><small>${date} · ${escapeHTML(item.formation)} · #${item.seed}</small></span>
        <span class="meta-run-result"><b>${result.label}</b><small>${stageProgress(item,tr)} · +${item.reputation} ${tr?"itibar":"rep"} · ${item.cash<0?"-":""}€${Math.abs(item.cash)}M</small></span>
      </article>`;
    }).join("");
  }
  function archiveHTML(tr){
    if(!state.archive.length)return `<div class="meta-inline-empty">${tr?"İlk tamamlanan turun burada görünecek.":"Your first completed run will appear here."}</div>`;
    const visible=Math.min(5,state.archive.length);
    return `<div class="meta-run-list">${archiveRowsHTML(tr,visible)}</div>${state.archive.length>visible?`<button class="meta-see-all" type="button" onclick="CopaMeta.openArchive()">${tr?"Tüm kariyer geçmişi":"View full career history"} <span aria-hidden="true">→</span></button>`:""}`;
  }
  function masteryProgress(count){
    const stops=[0,2,5,10,20],tier=masteryTier(count);
    if(tier>=4)return {tier,percent:100,next:null,target:20};
    const start=stops[tier],target=stops[tier+1];
    return {tier,percent:Math.max(0,Math.min(100,Math.round((count-start)/Math.max(1,target-start)*100))),next:tier+1,target};
  }
  function masteryName(group,key,tr){
    const styles={
      gegen:[tr?"Gegenpress":"Gegenpress"],
      kontra:[tr?"Kontra":"Counter"],
      tiki:[tr?"Tiki-taka":"Tiki-taka"],
      uzun:[tr?"Uzun Top":"Direct Play"],
      blok:[tr?"Alçak Blok":"Low Block"]
    };
    if(group==="styles"&&styles[key])return styles[key][0];
    if(group==="chairmen"&&global.L&&global.L().chair&&global.L().chair[key])return global.L().chair[key].n;
    return String(key||"").replace(/_/g," ").replace(/\b\w/g,char=>char.toUpperCase());
  }
  function masteryIcon(group,key){
    if(group==="styles"&&global.L&&global.L().styles&&global.L().styles[key]&&global.L().styles[key].i)return global.L().styles[key].i;
    return `<span aria-hidden="true">${group==="formations"?"⌗":group==="chairmen"?"♙":"◇"}</span>`;
  }
  function masteryGroupHTML(group,tr){
    const entries=Object.entries(state.mastery[group]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    if(!entries.length)return `<div class="meta-inline-empty">${tr?"İlk tamamlanan turdan sonra oluşur.":"Appears after your first completed run."}</div>`;
    return entries.map(([key,count])=>{
      const progress=masteryProgress(count),current=tierLabel(count,tr);
      const next=progress.next==null?(tr?"En yüksek kademe":"Highest tier"):tierLabel(progress.target,tr);
      const planUnlocked=group==="styles"&&count>=5,planSelected=planUnlocked&&state.career.selectedStylePlan===key;
      return `<article class="meta-mastery-row tier-${progress.tier}">
        <div class="meta-mastery-icon">${masteryIcon(group,key)}</div><div class="meta-mastery-copy"><b>${escapeHTML(masteryName(group,key,tr))}</b><small>${progress.next==null?next:`${tr?"Sonraki":"Next"}: ${next}`}</small></div>
        <div class="meta-mastery-state"><span class="meta-tier-badge">${current}</span><small>${progress.next==null?`${count}`:`${count}/${progress.target}`}</small></div>
        <span class="meta-mastery-track" aria-label="${count}/${progress.target}"><i style="width:${progress.percent}%"></i></span>
        ${planUnlocked?`<button type="button" class="meta-plan-toggle ${planSelected?"is-selected":""}" onclick="CopaMeta.selectStylePlan('${key}')">${planSelected?(tr?"AKTİF UZMAN PLANI":"SPECIALIST PLAN ACTIVE"):(tr?"UZMAN PLANINI SEÇ":"SELECT SPECIALIST PLAN")}</button>`:""}
      </article>`;
    }).join("");
  }
  function masterySectionHTML(group,title,tr){
    const entries=Object.entries(state.mastery[group]),topTier=entries.length?Math.max(...entries.map(([,count])=>masteryTier(count))):0;
    const topCount=entries.filter(([,count])=>masteryTier(count)===topTier).length;
    const summary=entries.length?`${topCount} ${tierLabel([0,2,5,10,20][topTier],tr)}`:(tr?"Henüz kayıt yok":"No entries yet");
    return `<details class="meta-mastery-section" open>
      <summary><span>${title}</span><small>${summary}</small><i aria-hidden="true">⌄</i></summary>
      <div class="meta-mastery-list">${masteryGroupHTML(group,tr)}</div>
    </details>`;
  }
  function badgesHTML(tr){
    if(!state.badges.length)return `<p class="kitsub">${tr?"Henüz rozet yok.":"No badges yet."}</p>`;
    return state.badges.map(key=>`<span class="meta-badge">${BADGES[key][tr?0:1]}</span>`).join("");
  }
  function hallEntries(){
    return state.museum.hall.map(ref=>{
      const memory=state.museum.memories.find(item=>item.id===ref.runId),player=memory&&memory.players.find(item=>item.id===ref.playerId);
      return memory&&player?{memory,player}:null;
    }).filter(Boolean);
  }
  function museumHTML(tr){
    const hall=hallEntries();
    const claimed=new Set(state.museum.collections.claimed.concat(state.clubFiles.claimed));
    const collectionData=[
      ["story_first_steps","story","story_first_steps",tr?"İLK ADIMLAR":"FIRST STEPS",tr?"3 sezon hatırası":"3 run memories",Math.min(3,state.museum.memories.length),3,tr?"Hikâye":"Story"],
      ["kit_tactical_journey","kit","kit_tactical_journey",tr?"TAKTİK YOLCULUĞU":"TACTICAL JOURNEY",tr?"3 farklı anlayış":"3 different styles",Math.min(3,new Set(state.archive.map(item=>item.style)).size),3,tr?"Forma":"Kit"],
      ["crest_boardroom","crest","crest_boardroom",tr?"YÖNETİM MASASI":"BOARDROOM",tr?"3 farklı başkan":"3 different chairmen",Math.min(3,new Set(state.archive.map(item=>item.chairman)).size),3,tr?"Arma":"Crest"],
      ["token_hall_champion","token","run_start_token",tr?"KUPA MİRASI":"CUP LEGACY",tr?"Şampiyonluk + 5 müze oyuncusu":"Champion + 5 Hall players",state.archive.some(item=>item.result==="win")?Math.min(5,hall.length):0,5,tr?"Başlangıç jetonu":"Run-start token"],
      ["debt","story","story_clean_ledger",tr?"TEMİZ DEFTER":"CLEAN LEDGER",tr?"Kulüp dosyasını tamamla":"Complete the club file",Math.min(1,state.clubFiles.completed.debt||0),1,tr?"Hikâye":"Story"],
      ["youth","crest","crest_academy_threads",tr?"GENÇ KİMLİK":"YOUTH IDENTITY",tr?"Kulüp dosyasını tamamla":"Complete the club file",Math.min(1,state.clubFiles.completed.youth||0),1,tr?"Arma":"Crest"],
      ["tactics","kit","kit_three_plans",tr?"TAKTİK ÇEŞİTLİLİK":"TACTICAL VARIETY",tr?"Kulüp dosyasını tamamla":"Complete the club file",Math.min(1,state.clubFiles.completed.tactics||0),1,tr?"Forma":"Kit"],
      ["club_files_set","token","run_start_token",tr?"KULÜP ARŞİVİ":"CLUB ARCHIVE",tr?"Üç kulüp dosyasını tamamla":"Complete all three club files",state.clubFiles.claimed.filter(id=>CLUB_FILE_IDS.has(id)).length,3,tr?"Tek kontrollü jeton":"One bounded token"]
    ];
    const cosmeticNames={
      crest_clean_cup:[tr?"TEMİZ KUPA ARMASI":"CLEAN CUP CREST",tr?"Borçsuz şampiyonluk yönergesi":"Debt-free champion directive"],
      kit_youth_march:[tr?"GENÇLİK YÜRÜYÜŞÜ FORMASI":"YOUTH MARCH KIT",tr?"Dört gençle final yönergesi":"Final with four young players"],
      crest_prestige:[tr?"PRESTİJ ARMASI":"PRESTIGE CREST",tr?"Kariyer prestij kilometre taşı":"Career prestige milestone"]
    };
    const listedRewards=new Set(collectionData.map(item=>item[2]));
    const cosmeticButton=(kind,id)=>{
      const prestige=id.startsWith("crest_prestige_"),name=cosmeticNames[id]||cosmeticNames[prestige?"crest_prestige":""]||[id.replace(/_/g," ").toUpperCase(),tr?"Kariyer koleksiyonu":"Career collection"];
      const selected=(kind==="kit"?state.museum.collections.selectedKit:state.museum.collections.selectedCrest)===id;
      return `<button type="button" class="meta-owned-cosmetic ${selected?"is-equipped":""}" onclick="CopaMeta.selectCosmetic('${kind}','${id}')"><span aria-hidden="true">${kind==="kit"?"▤":"◆"}</span><b>${escapeHTML(name[0])}${prestige?` · ${escapeHTML(id.split("_").pop())}`:""}</b><small>${selected?(tr?"AKTİF":"EQUIPPED"):escapeHTML(name[1])}</small></button>`;
    };
    const extraKits=state.museum.collections.kits.filter(id=>!listedRewards.has(id));
    const extraCrests=state.museum.collections.crests.filter(id=>!listedRewards.has(id));
    const cosmeticVault=extraKits.length||extraCrests.length?`<div class="meta-cosmetic-vault"><div class="meta-section-heading"><h4>${tr?"KAZANILAN TASARIMLAR":"EARNED DESIGNS"}</h4><small>${tr?"Görsel kimlik · güç avantajı sağlamaz":"Visual identity · no power advantage"}</small></div><div>${extraKits.map(id=>cosmeticButton("kit",id)).join("")}${extraCrests.map(id=>cosmeticButton("crest",id)).join("")}</div></div>`:"";
    const collectionIcons={story:"✦",kit:"▤",crest:"◆",token:"◈"};
    const collections=`<section class="meta-collections"><div class="meta-section-heading"><h4>${tr?"MÜZE KOLEKSİYONLARI":"MUSEUM COLLECTIONS"}</h4><small>${claimed.size}/${collectionData.length} · ${tr?"Kalıcı güç vermez":"No permanent power"}</small></div><div class="meta-collection-grid">${collectionData.map(([id,kind,rewardId,title,goal,value,max,reward])=>{const complete=claimed.has(id),selected=(kind==="kit"&&state.museum.collections.selectedKit===rewardId)||(kind==="crest"&&state.museum.collections.selectedCrest===rewardId),progress=Math.round(Math.min(1,value/max)*100);return `<article class="kind-${kind} ${complete?"is-complete":""} ${selected?"is-equipped":""}" style="--collection-progress:${progress}%"><span class="meta-collection-icon" aria-hidden="true">${collectionIcons[kind]}</span><div><small>${goal}</small><b>${title}</b><p>${reward}</p></div><strong>${complete?"✓":`${value}/${max}`}</strong>${complete&&(kind==="kit"||kind==="crest")?`<button type="button" onclick="CopaMeta.selectCosmetic('${kind}','${rewardId}')">${selected?(tr?"AKTİF":"EQUIPPED"):(tr?"KUŞAN":"EQUIP")}</button>`:""}</article>`;}).join("")}</div>${cosmeticVault}${state.museum.collections.tokens?`<div class="meta-token-bank"><b>${tr?"HAZIR JETON":"TOKEN READY"} · ${state.museum.collections.tokens}</b><span>${tr?"Yeni turun ilk oyuncu krizinde risksiz uzlaşma açar.":"Unlocks a safe compromise in the first player crisis of a new run."}</span></div>`:""}</section>`;
    if(!state.museum.memories.length)return `<div class="meta-museum-summary"><span><small>${tr?"ŞÖHRETLER KARMASI":"HALL XI"}</small><b>${hall.length}/${HALL_LIMIT}</b></span><span>${tr?"Kalıcı koleksiyon":"Permanent collection"}</span></div>${collections}<section class="meta-empty-state meta-empty-museum"><span class="meta-empty-icon" aria-hidden="true">◇</span><h3>${tr?"Henüz kariyer hatıran yok":"No career memories yet"}</h3><p>${tr?"Bir turu tamamladığında sezonun, öne çıkan oyuncun ve önemli sonuçların burada kalıcı olarak arşivlenecek.":"Complete a run to permanently archive its season, featured player and defining result here."}</p></section>`;
    const hallHTML=hall.length?hall.map(({memory,player})=>`<div class="meta-hall-player"><span>${escapeHTML(player.pos)}</span><b>${escapeHTML(player.name)}</b><small>${player.power} · ${escapeHTML(memory.team)}</small></div>`).join(""):`<div class="meta-inline-empty">${tr?"Hatıralarındaki oyuncuları yıldızlayarak kendi 11'ini kur.":"Star players from your memories to build your own XI."}</div>`;
    const memoryCard=memory=>{
      const featured=memory.players[memory.featuredIndex]||memory.players[0],pinned=state.museum.hall.some(item=>item.runId===memory.id&&item.playerId===featured.id);
      const result=resultMeta(memory,tr),date=new Date(memory.finishedAt).toLocaleDateString(tr?"tr-TR":"en-GB",{day:"2-digit",month:"short",year:"numeric"});
      return `<article class="meta-memory-card ${result.className}">
        <div class="meta-memory-run"><small>${date} · ${result.label}</small><b>${escapeHTML(memory.team)}</b><span>${stageProgress(memory,tr)} · ${escapeHTML(memory.formation)}</span></div>
        <button type="button" class="${pinned?"is-pinned":""}" onclick="CopaMeta.toggleHallFromUi('${memory.id}','${featured.id}')" aria-label="${tr?"Şöhretler Karması seçimi":"Hall XI selection"}">
          <span aria-hidden="true">${pinned?"★":"☆"}</span><b>${escapeHTML(featured.name)}</b><small>${escapeHTML(featured.pos)} · ${featured.power}</small>
        </button>
      </article>`;
    };
    const orderedMemories=[...state.museum.memories].reverse(),recentMemories=orderedMemories.slice(0,6).map(memoryCard).join(""),olderMemories=orderedMemories.slice(6).map(memoryCard).join("");
    const exhibition=hall.length===HALL_LIMIT?`<button type="button" class="meta-exhibition" onclick="CopaMeta.playHallExhibition()"><span>XI</span><b>${tr?"ŞÖHRETLER MAÇINA ÇIK":"PLAY HALL EXHIBITION"}</b><small>${tr?"Ödülsüz · kadronun mirasını sahada gör":"No rewards · put your legacy XI on the pitch"}</small></button>`:"";
    return `<div class="meta-museum-summary"><span><small>${tr?"ŞÖHRETLER KARMASI":"HALL XI"}</small><b>${hall.length}/${HALL_LIMIT}</b></span><span>${state.museum.memories.length} ${tr?"sezon hatırası":"run memories"}</span></div>${collections}${exhibition}
      <section class="meta-hall-section"><div class="meta-section-heading"><h4>${tr?"SEÇİLİ KADRO":"SELECTED XI"}</h4><small>${tr?"En fazla 11 oyuncu":"Up to 11 players"}</small></div><div class="meta-hall-grid">${hallHTML}</div></section>
      <section class="meta-memory-section"><div class="meta-section-heading"><h4>${tr?"SEZON HATIRALARI":"RUN MEMORIES"}</h4><small>${tr?"Son 6 sezon":"Latest 6 runs"}</small></div><div class="meta-memory-list">${recentMemories}</div>${olderMemories?`<details class="meta-memory-archive"><summary>${tr?"DAHA ESKİ HATIRALAR":"OLDER MEMORIES"} · ${orderedMemories.length-6}<span aria-hidden="true">⌄</span></summary><div class="meta-memory-list">${olderMemories}</div></details>`:""}</section>`;
  }
  function careerHTML(tr){
    const level=careerLevel(state.career.reputation),next=nextCareerReward(level),threshold=levelThreshold(level),nextThreshold=levelThreshold(level+1);
    const earned=Math.max(0,state.career.reputation-threshold),required=Math.max(1,nextThreshold-threshold);
    const progress=Math.max(0,Math.min(100,Math.round(earned/required*100)));
    const progressTone=progress>=75?"is-high":progress>=35?"is-mid":"is-low";
    const levelTone=level>=8?"is-elite":level>=4?"is-established":"is-building";
    const activeFile=global.CopaClubFiles&&typeof global.CopaClubFiles.panelMarkup==="function"?global.CopaClubFiles.panelMarkup():"";
    const directiveCards=Object.entries(DIRECTIVES).map(([id,def])=>{const done=state.directives.completed.includes(id),selected=state.directives.selected===id;return `<button type="button" class="meta-directive ${done?"is-complete":""} ${selected?"is-selected":""}" onclick="CopaMeta.selectDirective('${id}')" ${done?"disabled":""}><span>${done?"✓":"◇"}</span><b>${escapeHTML(def[tr?"tr":"en"])}</b><small>${escapeHTML(def[tr?"trGoal":"enGoal"])}</small></button>`;}).join("");
    const chairArchive=Object.entries(state.chairHistory).filter(([,history])=>history&&(history.runs||history.decisionCount)).sort((a,b)=>(b[1].runs||0)-(a[1].runs||0)).map(([id,history])=>`<article><span aria-hidden="true">♙</span><p><b>${escapeHTML(masteryName("chairmen",id,tr))}</b><small>${history.runs||0} ${tr?"ortak tur":"shared runs"} · ${history.decisionCount||0} ${tr?"karar":"decisions"}</small></p><em>${history.positive||0}↑ · ${history.negative||0}↓</em></article>`).join("");
    return `${activeFile}<section class="meta-career-hero ${progressTone} ${levelTone}">
      <div class="meta-level-lockup ${levelTone}"><small>${tr?"KULÜP SEVİYESİ":"CLUB LEVEL"}</small><strong>${level}</strong></div>
      <div class="meta-career-progress ${progressTone}">
        <div><b>${state.career.reputation.toLocaleString(tr?"tr-TR":"en-GB")} ${tr?"İtibar":"Reputation"}</b><small>${earned}/${required}</small></div>
        <span><i style="width:${progress}%"></i></span>
        <small>${tr?"Seviye":"Level"} ${level+1}: ${nextThreshold.toLocaleString(tr?"tr-TR":"en-GB")} ${tr?"itibar":"reputation"}</small>
      </div>
      <div class="meta-license-count ${state.career.licenses?"has-license":""}"><span aria-hidden="true">◆</span><small>${tr?"TAKTİK LİSANSI":"TACTICAL LICENCE"}</small><strong>${state.career.licenses}</strong></div>
      ${next?`<div class="meta-next-reward"><span aria-hidden="true">◇</span><p><small>${tr?"SONRAKİ BÜYÜK ÖDÜL":"NEXT MAJOR REWARD"}</small><b>${next.type==="prestige"?(tr?"Prestij Arması":"Prestige Crest"):(tr?"Taktik Lisansı":"Tactical Licence")}</b></p><strong>${Math.max(0,next.threshold-state.career.reputation)} ${tr?"itibar kaldı":"reputation left"}</strong></div>`:""}
    </section><section class="meta-directives"><div class="meta-section-heading"><h4>${tr?"KULÜP DİREKTİFLERİ":"CLUB DIRECTIVES"}</h4><small>${state.directives.completed.length}/${Object.keys(DIRECTIVES).length} · ${tr?"Güç değil prestij ödülü":"Prestige, not power"}</small></div><div class="meta-directive-grid">${directiveCards}</div></section>
    ${chairArchive?`<section class="meta-management-archive"><div class="meta-section-heading"><h4>${tr?"YÖNETİM ARŞİVİ":"BOARD ARCHIVE"}</h4><small>${tr?"Eski başkan kayıtları korunur":"Former chair records are preserved"}</small></div><div>${chairArchive}</div></section>`:""}
    <details class="meta-career-disclosure meta-badge-section" open><summary><span>${tr?"ROZETLER":"BADGES"}</span><small>${state.badges.length}/${Object.keys(BADGES).length}</small><i aria-hidden="true">⌄</i></summary><div class="meta-career-disclosure-body"><div class="meta-badges">${badgesHTML(tr)}</div></div></details>
    <details class="meta-career-disclosure meta-archive" open><summary><span>${tr?"SON TURLAR":"RECENT RUNS"}</span><small>${Math.min(5,state.archive.length)}/${state.archive.length}</small><i aria-hidden="true">⌄</i></summary><div class="meta-career-disclosure-body">${archiveHTML(tr)}</div></details>`;
  }
  function worldHTML(tr){
    return `<section class="meta-world meta-world-panel" id="metaWorldPanel"><div class="meta-world-skeleton" aria-label="${tr?"Dünya sıralaması yükleniyor":"Loading world rankings"}"><i></i><i></i><i></i><i></i></div></section>`;
  }
  function panelHTML(tab,tr){
    if(tab==="mastery")return `<div class="meta-mastery-intro"><span aria-hidden="true">◎</span><p><b>${tr?"Deneyim kalıcıdır, güç sağlamaz.":"Experience is permanent, but grants no power."}</b><small>${tr?"Her tamamlanan tur bir sonraki ustalık kademesine ilerletir.":"Every completed run advances the next mastery tier."}</small></p></div>${masterySectionHTML("styles",tr?"OYUN ANLAYIŞI":"STYLE MASTERY",tr)}${masterySectionHTML("formations",tr?"DİZİLİŞ":"FORMATION MASTERY",tr)}${masterySectionHTML("chairmen",tr?"BAŞKAN":"CHAIRMAN MASTERY",tr)}`;
    if(tab==="museum")return museumHTML(tr);
    if(tab==="world")return worldHTML(tr);
    return careerHTML(tr);
  }
  function openProgression(tab="career"){
    const tr=global.LANG==="tr",active=["career","mastery","museum","world"].includes(tab)?tab:"career";
    global.showModal(`<div class="meta-progress-modal meta-tab-${active}"><header class="meta-progress-head"><div><div class="kithdr">${tr?"Kulüp Kariyeri":"Club Career"}</div><div class="kitsub">${tr?"Kariyerinin kalıcı arşivi":"Your permanent career archive"}</div></div><div class="meta-head-actions"><button class="meta-close" type="button" onclick="closeModal()" aria-label="${tr?"Kapat":"Close"}">×</button><button class="meta-save-menu" type="button" onclick="CopaMeta.openExport()" aria-label="${tr?"Kayıt seçenekleri":"Save options"}"><span aria-hidden="true">⇅</span><span>${tr?"KAYIT":"SAVE"}</span></button></div></header><nav class="meta-tabs" aria-label="${tr?"Kariyer bölümleri":"Career sections"}">${[
      ["career",tr?"KARİYER":"CAREER"],["mastery",tr?"USTALIK":"MASTERY"],["museum",tr?"MÜZE":"MUSEUM"],["world",tr?"DÜNYA":"WORLD"]
    ].map(([id,label])=>`<button type="button" class="${id===active?"active":""}" aria-current="${id===active?"page":"false"}" onclick="CopaMeta.openProgression('${id}')">${label}</button>`).join("")}</nav><div class="meta-tab-panel">${panelHTML(active,tr)}</div></div>`,{dismissOnOverlay:true,label:tr?"Kulüp kariyeri":"Club career"});
    const activeTab=document.querySelector(".meta-progress-modal .meta-tabs button.active");
    if(activeTab)try{activeTab.focus({preventScroll:true});}catch(_){}
    if(active==="career"&&global.matchMedia&&global.matchMedia("(max-width:620px)").matches)document.querySelectorAll(".meta-progress-modal .meta-career-disclosure").forEach(item=>item.removeAttribute("open"));
    if(active==="world"&&global.GhostClubs&&typeof global.GhostClubs.renderLeaderboard==="function")global.GhostClubs.renderLeaderboard(document.getElementById("metaWorldPanel"));
  }
  function openArchive(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="meta-history-modal"><header class="meta-progress-head"><div><div class="kithdr">${tr?"Kariyer Geçmişi":"Career History"}</div><div class="kitsub">${state.archive.length} ${tr?"tamamlanmış tur":"completed runs"}</div></div><button class="meta-close" type="button" onclick="CopaMeta.openProgression('career')" aria-label="${tr?"Kariyere dön":"Back to career"}">×</button></header><div class="meta-history-list">${archiveRowsHTML(tr)}</div><button class="meta-history-back" type="button" onclick="CopaMeta.openProgression('career')">← ${tr?"Kariyere dön":"Back to career"}</button></div>`,{dismissOnOverlay:true,label:tr?"Kariyer geçmişi":"Career history"});
  }
  function toggleHallFromUi(runId,playerId){
    const before=state.museum.hall.length,ok=toggleHallPlayer(runId,playerId),tr=global.LANG==="tr";
    if(!ok&&before>=HALL_LIMIT&&typeof global.showToast==="function")global.showToast(tr?"Şöhretler Karması 11 oyuncuyla dolu.":"Your Hall XI already has 11 players.");
    refreshProgressionView("museum");
  }
  function careerSummary(){
    const level=careerLevel(state.career.reputation),next=nextCareerReward(level);
    return {level,reputation:state.career.reputation,licenses:state.career.licenses,prestige:state.career.prestige,next};
  }
  function playHallExhibition(){
    const hall=hallEntries(),tr=global.LANG==="tr";
    if(hall.length!==HALL_LIMIT)return false;
    const run=()=>{
      const core=global.CopaFinalSimCore;
      if(!core)return false;
      const home=Math.round(hall.reduce((sum,item)=>sum+Number(item.player.power||0),0)/HALL_LIMIT);
      const seed=parseInt(hash(hall.map(item=>item.player.id).join("|")),36)>>>0;
      const result=core.simulateMatch({seed,homePower:home,awayPower:80,resolution:"full",plan:{pressResistance:.02}});
      global.showModal(`<div class="meta-exhibition-result"><span>${tr?"ŞÖHRETLER MAÇI":"HALL EXHIBITION"}</span><h3>${tr?"Senin XI":"Your XI"} <b>${result.score[0]}–${result.score[1]}</b> ${tr?"Efsaneler":"Legends"}</h3><p>xG ${result.stats.xg[0].toFixed(1)}–${result.stats.xg[1].toFixed(1)} · ${tr?"Şut":"Shots"} ${result.stats.shots[0]}–${result.stats.shots[1]}</p><small>${tr?"Bu maç ödülsüzdür ve kariyer istatistiklerini değiştirmez.":"This match has no rewards and does not alter career records."}</small><button class="btn btn-primary" onclick="CopaMeta.openProgression('museum')">${tr?"MÜZEYE DÖN":"BACK TO MUSEUM"}</button></div>`,{label:tr?"Şöhretler maçı":"Hall exhibition"});
      return true;
    };
    if(global.CopaFinalSimCore)return run();
    if(global.CopaLazy&&typeof global.CopaLazy.ensureMatchCore==="function"){global.CopaLazy.ensureMatchCore().then(run);return true;}
    return false;
  }
  function masteryInfo(group,key){
    const count=state.mastery[group]&&state.mastery[group][key]||0;
    return {count,tier:masteryTier(count),label:tierLabel(count,global.LANG==="tr")};
  }

  function coreSnapshot(){
    return {
      forms:(global.FORMORDER||[]).filter(item=>(global.unlockedForms||[]).includes(item)),
      best:integer(global.metaBest,0,7),runs:integer(global.metaRuns,0,1000000),
      chairs:(global.CHAIR_ORDER||[]).filter(item=>(global.unlockedChairs||[]).includes(item)),
      selected:String(global.selectedChairId||"babacan"),pending:Array.isArray(global.pendingChairChoices)?global.pendingChairChoices:[],
      elite:!!global.eliteBonus,legacy:integer(global.legacyFund,0,20)
    };
  }
  function exportCode(){
    const body=JSON.stringify({format:FORMAT,version:VERSION,createdAt:new Date().toISOString(),core:coreSnapshot(),progression:state});
    return `CPS1.${base64Encode(body)}.${hash(body)}`;
  }
  function decodeCode(code){
    const raw=String(code||"").trim();if(raw.length<16||raw.length>500000)throw new Error("invalid_length");
    const parts=raw.split(".");if(parts.length!==3||parts[0]!=="CPS1")throw new Error("invalid_format");
    const body=base64Decode(parts[1]);if(hash(body)!==parts[2])throw new Error("checksum");
    const payload=JSON.parse(body);if(!object(payload)||payload.format!==FORMAT||![1,2,3,4,5].includes(payload.version)||!object(payload.core))throw new Error("unsupported");
    return payload;
  }
  function importCode(code){
    const payload=decodeCode(code),core=payload.core;
    const forms=(Array.isArray(core.forms)?core.forms:[]).filter(item=>(global.FORMORDER||[]).includes(item));
    const chairs=(Array.isArray(core.chairs)?core.chairs:[]).filter(item=>(global.CHAIR_ORDER||[]).includes(item));
    global.unlockedForms=(global.FORMORDER||[]).filter(item=>(global.DEFAULT_FORMS||[]).includes(item)||forms.includes(item)||(global.unlockedForms||[]).includes(item));
    global.unlockedChairs=(global.CHAIR_ORDER||[]).filter(item=>item==="babacan"||chairs.includes(item)||(global.unlockedChairs||[]).includes(item));
    global.metaBest=Math.max(integer(global.metaBest,0,7),integer(core.best,0,7));
    global.metaRuns=Math.max(integer(global.metaRuns,0,1000000),integer(core.runs,0,1000000));
    global.eliteBonus=!!(global.eliteBonus||core.elite);global.legacyFund=Math.max(integer(global.legacyFund,0,20),integer(core.legacy,0,20));
    if(global.unlockedChairs.includes(core.selected))global.selectedChairId=core.selected;
    global.pendingChairChoices=(Array.isArray(core.pending)?core.pending:[]).filter(item=>(global.CHAIR_ORDER||[]).includes(item)&&!global.unlockedChairs.includes(item)).slice(0,3);
    const imported=normalize(payload.progression),merged=normalize(state);
    merged.career.reputation=Math.max(merged.career.reputation,imported.career.reputation);
    merged.career.licenses=Math.max(merged.career.licenses,imported.career.licenses);
    merged.career.unlockWindowOpen=merged.career.unlockWindowOpen||imported.career.unlockWindowOpen;
    merged.career.prestige=Math.max(merged.career.prestige,imported.career.prestige);
    if(!merged.career.selectedStylePlan&&imported.career.selectedStylePlan)merged.career.selectedStylePlan=imported.career.selectedStylePlan;
    for(const group of ["styles","formations","chairmen"])for(const [key,count] of Object.entries(imported.mastery[group]))merged.mastery[group][key]=Math.max(merged.mastery[group][key]||0,count);
    merged.badges=Array.from(new Set(merged.badges.concat(imported.badges)));
    merged.directives.completed=Array.from(new Set(merged.directives.completed.concat(imported.directives.completed)));
    if(!merged.directives.selected&&imported.directives.selected)merged.directives.selected=imported.directives.selected;
    merged.archive=normalize({archive:merged.archive.concat(imported.archive)}).archive;
    merged.museum=normalize({museum:{
      memories:merged.museum.memories.concat(imported.museum.memories),hall:merged.museum.hall.concat(imported.museum.hall),
      collections:{
        claimed:merged.museum.collections.claimed.concat(imported.museum.collections.claimed),
        stories:merged.museum.collections.stories.concat(imported.museum.collections.stories),
        kits:merged.museum.collections.kits.concat(imported.museum.collections.kits),
        crests:merged.museum.collections.crests.concat(imported.museum.collections.crests),
        tokens:Math.max(merged.museum.collections.tokens,imported.museum.collections.tokens),
        selectedKit:merged.museum.collections.selectedKit||imported.museum.collections.selectedKit,
        selectedCrest:merged.museum.collections.selectedCrest||imported.museum.collections.selectedCrest
      }
    }}).museum;
    for(const id of CLUB_FILE_IDS)merged.clubFiles.completed[id]=Math.max(merged.clubFiles.completed[id]||0,imported.clubFiles.completed[id]||0);
    merged.clubFiles.claimed=Array.from(new Set(merged.clubFiles.claimed.concat(imported.clubFiles.claimed)));
    for(const [chairId,history] of Object.entries(imported.chairHistory)){
      const current=merged.chairHistory[chairId]||{runs:0,decisionCount:0,positive:0,negative:0,decisions:{},lastOutcome:"",lastPositive:false,lastRunId:""};
      current.runs=Math.max(current.runs,history.runs);current.decisionCount=Math.max(current.decisionCount,history.decisionCount);
      current.positive=Math.max(current.positive,history.positive);current.negative=Math.max(current.negative,history.negative);
      for(const [outcome,count] of Object.entries(history.decisions))current.decisions[outcome]=Math.max(current.decisions[outcome]||0,count);
      if(history.decisionCount>=current.decisionCount){current.lastOutcome=history.lastOutcome;current.lastPositive=history.lastPositive;current.lastRunId=history.lastRunId;}
      merged.chairHistory[chairId]=current;
    }
    state=merged;persist();
    if(typeof global.saveMeta==="function")global.saveMeta();if(typeof global.applyMeta==="function")global.applyMeta();if(typeof global.buildFormButtons==="function")global.buildFormButtons();if(typeof global.buildChairButtons==="function")global.buildChairButtons();
    return {ok:true,runs:state.archive.length};
  }
  function copy(value,done){
    if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(value).then(done).catch(()=>fallbackCopy(value,done));
    fallbackCopy(value,done);
  }
  function fallbackCopy(value,done){const input=document.createElement("textarea");input.value=value;input.style.position="fixed";input.style.opacity="0";document.body.appendChild(input);input.select();document.execCommand("copy");input.remove();done();}
  function openExport(){
    const tr=global.LANG==="tr",code=exportCode();
    global.showModal(`<div class="meta-transfer-modal"><div class="kithdr">${tr?"İLERLEMEYİ DIŞA AKTAR":"EXPORT PROGRESS"}</div><div class="kitsub">${tr?"Kod aktif turu ve cihazına bağlı çevrimiçi Ghost/Dünya kimliğini içermez. Güvenli bir yerde sakla.":"The code excludes the active run and your device-bound online Ghost/World identity. Store it somewhere safe."}</div><textarea id="metaExportCode" readonly>${code}</textarea><div class="bact"><button class="btn btn-primary" onclick="CopaMeta.copyExport()">${tr?"KODU KOPYALA":"COPY CODE"}</button><button class="btn btn-ghost" onclick="CopaMeta.downloadExport()">${tr?"DOSYA İNDİR":"DOWNLOAD FILE"}</button><button class="btn btn-ghost" onclick="CopaMeta.openProgression()">${tr?"GERİ":"BACK"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"İlerlemeyi dışa aktar":"Export progress"});
  }
  function copyExport(){const code=exportCode();copy(code,()=>global.showToast(global.LANG==="tr"?"İlerleme kodu kopyalandı.":"Progress code copied."));}
  function downloadExport(){const blob=new Blob([exportCode()],{type:"text/plain;charset=utf-8"}),link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="copa-life-progress.copa";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);}
  function openImport(){
    const tr=global.LANG==="tr";
    global.showModal(`<div class="meta-transfer-modal"><div class="kithdr">${tr?"İLERLEMEYİ İÇE AKTAR":"IMPORT PROGRESS"}</div><div class="kitsub">${tr?"Geçerli ilerleme korunur; daha yüksek değerler ve arşiv birleştirilir.":"Current progress is preserved; higher values and archive entries are merged."}</div><textarea id="metaImportCode" placeholder="CPS1.…"></textarea><div class="bact"><button class="btn btn-primary" onclick="CopaMeta.submitImport()">${tr?"DOĞRULA VE BİRLEŞTİR":"VALIDATE AND MERGE"}</button><button class="btn btn-ghost" onclick="CopaMeta.openProgression()">${tr?"GERİ":"BACK"}</button></div></div>`,{dismissOnOverlay:true,label:tr?"İlerlemeyi içe aktar":"Import progress"});
  }
  function submitImport(){try{const result=importCode((document.getElementById("metaImportCode")||{}).value);global.showToast(global.LANG==="tr"?`${result.runs} arşiv kaydıyla ilerleme birleştirildi.`:`Progress merged with ${result.runs} archive entries.`);openProgression();}catch(_){global.showToast(global.LANG==="tr"?"Kod geçersiz veya bozulmuş.":"The code is invalid or corrupted.",{type:"info"});}}
  function installControl(){
    const body=document.querySelector(".advanced-body");if(!body||document.getElementById("metaProgressBtn"))return;
    const button=document.createElement("button");button.type="button";button.id="metaProgressBtn";button.className="btn btn-ghost final-replay-import-btn";button.onclick=()=>openProgression();button.textContent=global.LANG==="tr"?"KULÜP KARİYERİ VE KAYIT":"CLUB CAREER & SAVE";body.insertBefore(button,document.getElementById("advancedGhostSettingSlot"));
  }

  global.CopaMeta=Object.freeze({
    recordRun,getState:()=>JSON.parse(JSON.stringify(state)),careerSummary,careerLevel,levelThreshold,masteryInfo,
    renderPanelHTML:(tab="career")=>panelHTML(["career","mastery","museum","world"].includes(tab)?tab:"career",global.LANG==="tr"),
    requestFormationUnlock,setFeaturedPlayer,toggleHallPlayer,toggleHallFromUi,consumeStartToken,evaluateCollections,activeCosmetics,selectCosmetic,
    completeClubFile,clubFileSummary,chairHistory:chairHistoryFor,recordChairDecision,recordChairRun,selectDirective,selectStylePlan,activeStylePlan,playHallExhibition,
    exportCode,importCode,openProgression,openArchive,openExport,openImport,copyExport,downloadExport,submitImport,installControl
  });
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installControl,{once:true});else installControl();
})(window);
