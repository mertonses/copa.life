/* Shared club-name policy for user input and Ghost Club snapshots. */
(function(root){
  "use strict";

  const MAX_LENGTH=29;
  const MIN_ALNUM=2;
  const RAW_UNSAFE=/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/u;
  const INVISIBLE_OR_UNSAFE=/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}\p{M}]/u;
  const ALLOWED=/^[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N} .&'\u2019\-\u30fb]+$/u;
  const ALNUM=/[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N}]/u;

  function normalize(value){
    return String(value==null?"":value)
      .normalize("NFKC")
      .replace(/\u2019/g,"'")
      .replace(/[\t\n\r ]+/g," ")
      .trim();
  }

  function inspect(value){
    const raw=String(value==null?"":value);
    if(RAW_UNSAFE.test(raw))return {ok:false,value:"",length:Array.from(raw).length,code:"unsafe_unicode",maxLength:MAX_LENGTH};
    const normalized=normalize(value);
    const length=Array.from(normalized).length;
    if(!normalized)return {ok:false,value:"",length,code:"required",maxLength:MAX_LENGTH};
    if(length>MAX_LENGTH)return {ok:false,value:normalized,length,code:"too_long",maxLength:MAX_LENGTH};
    if(INVISIBLE_OR_UNSAFE.test(normalized))return {ok:false,value:normalized,length,code:"unsafe_unicode",maxLength:MAX_LENGTH};
    if(!ALLOWED.test(normalized))return {ok:false,value:normalized,length,code:"invalid_character",maxLength:MAX_LENGTH};
    const chars=Array.from(normalized);
    if(!ALNUM.test(chars[0])||!ALNUM.test(chars[chars.length-1]))return {ok:false,value:normalized,length,code:"invalid_edge",maxLength:MAX_LENGTH};
    if(chars.filter(ch=>ALNUM.test(ch)).length<MIN_ALNUM)return {ok:false,value:normalized,length,code:"too_short",maxLength:MAX_LENGTH};
    return {ok:true,value:normalized,length,code:"",maxLength:MAX_LENGTH};
  }

  function moderationText(value){
    return normalize(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en-US").replace(/[013457@$]/g,ch=>({0:"o",1:"i",3:"e",4:"a",5:"s",7:"t","@":"a","$":"s"})[ch]||ch).replace(/[^a-z0-9\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu," ").trim();
  }

  function reservedNames(){
    const names=[];
    ["OPP_POOL","OPP_POOL_EN","OPP_POOL_ES","OPP_POOL_IT","OPP_POOL_DE","OPP_POOL_JP"].forEach(key=>{if(Array.isArray(root[key]))names.push(...root[key]);});
    ["CLUB_LOGOS","CLUB_LOGOS_EN","CLUB_LOGOS_ES","CLUB_LOGOS_IT","CLUB_LOGOS_DE","CLUB_LOGOS_JP"].forEach(key=>{if(root[key]&&typeof root[key]==="object")names.push(...Object.keys(root[key]));});
    return new Set(names.map(name=>moderationText(name).replace(/\s+/g,"")).filter(Boolean));
  }

  function inspectUser(value){
    const base=inspect(value);if(!base.ok)return base;
    const text=moderationText(base.value),compact=text.replace(/\s+/g,"");
    const prohibited=[/\b(?:hitler|nazi|isis|kkk)\b/,/\b(?:porn|porno|sex|seks|xxx|hentai)\b/,/\b(?:kill all|oldurun|nefret)\b/];
    if(prohibited.some(pattern=>pattern.test(text)))return {...base,ok:false,code:"restricted_name"};
    if(/\b(?:official|resmi|gercek hesap|real account|president|prime minister|cumhurbaskani|basbakan|party|partisi|senator|minister|bakan)\b/.test(text))return {...base,ok:false,code:"review_required"};
    if(reservedNames().has(compact))return {...base,ok:false,code:"reserved_brand"};
    return base;
  }

  function sanitize(value,fallback=""){
    const result=inspect(value);
    return result.ok?result.value:fallback;
  }

  root.ClubNamePolicy=Object.freeze({MAX_LENGTH,inspect,inspectUser,normalize,sanitize});
})(typeof window!=="undefined"?window:globalThis);
