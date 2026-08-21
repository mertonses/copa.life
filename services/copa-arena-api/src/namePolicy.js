export const USER_CLUB_NAME_MAX_LENGTH=19;

const RAW_UNSAFE=/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}]/u;
const INVISIBLE_OR_UNSAFE=/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Zl}\p{Zp}\p{M}]/u;
const ALLOWED=/^[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N} .&'\u2019\-\u30fb]+$/u;
const ALNUM=/[\p{Script=Latin}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}\p{N}]/u;
const COMPACT_BLOCKED=[
  "hitler","nazi","isis","terror","teror","porno","hentai","onlyfans","lolicon","pedofil","pedo",
  "yarrak","yarrag","orospu","orspu","pezevenk","serefsiz","ibne","gavat","kahpe",
  "zomsik","siken","siker","siktir","sikik","sikim","sikici","sikiyim",
  "fuck","fck","shit","bitch","cunt","dick","cock","pussy","asshole","nigger","faggot",
  "putana","puttana","mierda","polla","cazzo","merda","scheisse","arschloch","fotze","hurensohn"
];
const TOKEN_BLOCKED=/\b(?:kkk|xxx|sex|seks|escort|nude|nudes|amk|aq|pic|puta|puto|cono|nefret)\b/;
const REVIEW_REQUIRED=/\b(?:official|resmi|gercek hesap|real account|president|prime minister|cumhurbaskani|basbakan|party|partisi|senator|minister|bakan)\b/;

function normalize(value){
  return String(value==null?"":value).normalize("NFKC").replace(/\u2019/g,"'").replace(/[\t\n\r ]+/g," ").trim();
}

export function moderationText(value){
  return normalize(value).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en-US")
    .replace(/[013457@$]/g,ch=>({0:"o",1:"i",3:"e",4:"a",5:"s",7:"t","@":"a","$":"s"})[ch]||ch)
    .replace(/[^a-z0-9\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]+/gu," ").trim();
}

export function inspectClubName(value){
  const raw=String(value==null?"":value);
  if(RAW_UNSAFE.test(raw))return {ok:false,value:"",code:"unsafe_unicode"};
  const name=normalize(raw),length=Array.from(name).length;
  if(!name)return {ok:false,value:"",code:"required"};
  if(length>USER_CLUB_NAME_MAX_LENGTH)return {ok:false,value:name,code:"too_long"};
  if(INVISIBLE_OR_UNSAFE.test(name))return {ok:false,value:name,code:"unsafe_unicode"};
  if(!ALLOWED.test(name))return {ok:false,value:name,code:"invalid_character"};
  const chars=Array.from(name);
  if(!ALNUM.test(chars[0])||!ALNUM.test(chars[chars.length-1]))return {ok:false,value:name,code:"invalid_edge"};
  if(chars.filter(char=>ALNUM.test(char)).length<2)return {ok:false,value:name,code:"too_short"};
  const text=moderationText(name),compact=text.replace(/\s+/g,"");
  if(COMPACT_BLOCKED.some(term=>compact.includes(term))||TOKEN_BLOCKED.test(text))return {ok:false,value:name,code:"restricted_name"};
  if(REVIEW_REQUIRED.test(text))return {ok:false,value:name,code:"review_required"};
  return {ok:true,value:name,code:""};
}

export function clubName(value){
  const result=inspectClubName(value);
  return result.ok?result.value:"";
}
