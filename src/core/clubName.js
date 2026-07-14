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

  function sanitize(value,fallback=""){
    const result=inspect(value);
    return result.ok?result.value:fallback;
  }

  root.ClubNamePolicy=Object.freeze({MAX_LENGTH,inspect,normalize,sanitize});
})(typeof window!=="undefined"?window:globalThis);
