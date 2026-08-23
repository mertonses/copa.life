/* URL-gated deterministic fixtures for local/Playwright visual QA. Never active in normal play. */
(function(root){
  const query=new URLSearchParams(root.location.search||"");
  const mode=query.get("testMode")||"";
  const COMMON=Object.freeze({
    club:{name:"Copa Test United",country:"TR",league:"Türkiye"},
    chairman:{id:"babacan",name:"Patron Başkan"},
    formation:"4-3-3",
    squad:[
      {playerId:"fixture-gk-01",name:"Fixture Kaleci",pos:"GK",power:78,age:27,club:"Copa Test United"},
      {playerId:"fixture-df-01",name:"Fixture Sol Bek",pos:"LB",power:77,age:25,club:"Copa Test United"},
      {playerId:"fixture-df-02",name:"Fixture Stoper 1",pos:"CB",power:80,age:28,club:"Copa Test United"},
      {playerId:"fixture-df-03",name:"Fixture Stoper 2",pos:"CB",power:79,age:26,club:"Copa Test United"},
      {playerId:"fixture-df-04",name:"Fixture Sağ Bek",pos:"RB",power:76,age:24,club:"Copa Test United"},
      {playerId:"fixture-mf-01",name:"Fixture Orta Saha 1",pos:"CM",power:82,age:27,club:"Copa Test United"},
      {playerId:"fixture-mf-02",name:"Fixture Orta Saha 2",pos:"CM",power:81,age:25,club:"Copa Test United"},
      {playerId:"fixture-mf-03",name:"Fixture Orta Saha 3",pos:"CM",power:79,age:29,club:"Copa Test United"},
      {playerId:"fixture-fw-01",name:"Fixture Sol Kanat",pos:"LW",power:84,age:23,club:"Copa Test United"},
      {playerId:"fixture-fw-02",name:"Fixture Golcü",pos:"ST",power:86,age:26,club:"Copa Test United"},
      {playerId:"fixture-fw-03",name:"Fixture Sağ Kanat",pos:"RW",power:83,age:24,club:"Copa Test United"}
    ],
    opponents:[
      {name:"Copa Test Athletic",country:"TR",league:"Türkiye",power:77},
      {name:"Istanbul Test Club",country:"TR",league:"Türkiye",power:80},
      {name:"Anatolia Test",country:"TR",league:"Türkiye",power:82}
    ],
    injuredPlayerId:"fixture-fw-02"
  });
  let injuryConsumed=false;
  function is(modeName){return mode===modeName;}
  function consumeInjury(players){
    if(!is("injury")||injuryConsumed)return null;
    const list=Array.isArray(players)?players:[];
    const target=list.find(player=>player&&!player.injured&&!player.suspended);
    if(!target)return null;
    injuryConsumed=true;
    if(typeof root.assignPlayerInjury==="function")root.assignPlayerInjury(target,2);
    else{target.injured=true;target.injuryLevel=2;target.injuryMatchesRemaining=2;target.injuryDecisionRound=0;target.injuryPlayedRound=0;}
    if(typeof root.econStats==="object"&&root.econStats)root.econStats.injuries=(Number(root.econStats.injuries)||0)+1;
    if(typeof root.syncInjuredIdx==="function")root.syncInjuredIdx();
    return target;
  }
  function common(){return JSON.parse(JSON.stringify(COMMON));}
  function applyCommon(target){
    if(!target||typeof target!=="object")return common();
    const fixture=common();
    Object.keys(fixture).forEach(key=>{target[key]=fixture[key];});
    return target;
  }
  root.CopaTestFixtures=Object.freeze({mode,is,consumeInjury,common,applyCommon});
})(window);
