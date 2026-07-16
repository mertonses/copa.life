(function(root){
  "use strict";
  const PALETTES=[
    ["#9f2f3f","#f2c94c"],["#173a5e","#d4a72c"],["#20242d","#f0eee7"],["#2c5d50","#d8b25c"],
    ["#6f334c","#d9a441"],["#274b70","#d7e2e9"],["#7a3b2e","#e1b85b"],["#344563","#c7d2dc"]
  ];
  const OVERRIDES={
    "galatasaray":{code:"GS",colors:["#9f2f3f","#f2c94c"]},
    "fenerbahce":{code:"FB",colors:["#173a5e","#d4a72c"]},
    "besiktas":{code:"BJK",colors:["#20242d","#f0eee7"]},
    "trabzonspor":{code:"TS",colors:["#6f334c","#7fa4bd"]}
  };
  function normalize(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g," ").trim();}
  function hash(value){let result=2166136261;for(const char of value){result^=char.codePointAt(0);result=Math.imul(result,16777619);}return result>>>0;}
  function codeFor(name){const words=String(name||"").replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/).filter(Boolean),ignored=/^(?:fc|fk|cf|ac|sc|club|calcio|football|futbol)$/i,meaningful=words.filter(word=>!ignored.test(word));if(meaningful.length>=2)return meaningful.slice(0,3).map(word=>Array.from(word)[0]).join("").toLocaleUpperCase("tr-TR");const word=meaningful[0]||words[0]||"XI";return Array.from(word).slice(0,2).join("").toLocaleUpperCase("tr-TR");}
  function crestFor(name){const key=normalize(name),override=OVERRIDES[key];if(override)return {code:override.code,colors:override.colors.slice(),generic:true};const colors=PALETTES[hash(key||"xi")%PALETTES.length];return {code:codeFor(name),colors:colors.slice(),generic:true};}
  function svgFor(name,width=44,height=52){const crest=crestFor(name),code=crest.code.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g,"").slice(0,3),a=crest.colors[0],b=crest.colors[1];return `<svg class="generic-club-crest" viewBox="0 0 44 52" width="${Math.max(16,Math.min(96,Number(width)||44))}" height="${Math.max(18,Math.min(112,Number(height)||52))}" aria-hidden="true"><defs><linearGradient id="crest-${hash(normalize(name))}" x1="0" x2="1"><stop offset="50%" stop-color="${a}"/><stop offset="50%" stop-color="${b}"/></linearGradient></defs><path d="M22 2L41 9V28Q41 44 22 50Q3 44 3 28V9Z" fill="url(#crest-${hash(normalize(name))})" stroke="#f5f0e8" stroke-width="1.8"/><text x="22" y="34" text-anchor="middle" font-family="monospace" font-size="12" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.55)" stroke-width="2" paint-order="stroke">${code}</text></svg>`;}
  for(const key of ["CLUB_LOGOS","CLUB_LOGOS_SM","CLUB_LOGOS_EN","CLUB_LOGOS_EN_SM","CLUB_LOGOS_ES","CLUB_LOGOS_ES_SM","CLUB_LOGOS_IT","CLUB_LOGOS_IT_SM","CLUB_LOGOS_DE","CLUB_LOGOS_DE_SM","CLUB_LOGOS_JP","CLUB_LOGOS_JP_SM"]){if(typeof root[key]==="undefined")root[key]={};}
  root.CopaClubVisuals=Object.freeze({crestFor,codeFor,svgFor});
})(typeof window!=="undefined"?window:globalThis);
