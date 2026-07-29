const OPENERS=Object.freeze([
  "Neon","Kara","Mavi","Sokak","Gece","Turbo","Pixel","Urban","Loco","Brutal",
  "Nova","Zero","Viral","Cosmic","Rapid","Wild","Lucky","Rogue","Funky","Ultra",
  "Chill","Mad","Hyper","Retro","Atomic","Shadow","Golden","Silent","Electric","Noisy",
  "Barrio","Nord","Sud","Ost","West","Rosso","Nero","Azul","Verde","Sakura"
]);
const CORES=Object.freeze([
  "Martılar","Kaplanlar","Tayfa","United","Rovers","Athletic","City","Crew","Boys","Club",
  "Wolves","Foxes","Owls","Comets","Orbit","Storm","Rush","Wave","Drift","Pulse",
  "Kickers","Ballers","Legends","Nomads","Vikings","Ronin","Pirates","Rebels","Ultras","Ninjas",
  "Pandas","Coyotes","Dragons","Falcons","Bulls","Sharks","Wasps","Lions","Crows","Ravens"
]);
const ENDINGS=Object.freeze([
  "FC","SK","FK","XI","1907","1912","2000","404","LOL","GG",
  "Crew","Utd","CF","AC","SC","e.V.","Calcio","Futbol","Klub","Team"
]);
const SLANG=Object.freeze(["Bruh","Noob","Gırgır","Çılgın","BamBam","Golcü","TikiTaka","Haydi","Vamos","Dale","Forza","Kiez"]);

const hash=value=>{
  let h=2166136261;
  for(const char of String(value)){h^=char.codePointAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
};
const pick=(list,seed,salt)=>list[hash(`${seed}|${salt}`)%list.length];
const typo=(value,seed)=>{
  if(hash(`${seed}|typo`)%5!==0||value.length<7)return value;
  const index=1+hash(`${seed}|typo-index`)%(value.length-2);
  if(/\s/.test(value[index]))return value;
  return value.slice(0,index)+value[index]+value.slice(index);
};

export function botWaitMs(seed){
  return 6_000+(hash(`${seed}|queue-wait`)%8_000);
}

export function botDecisionDelay(seed,phase,step=0){
  const ranges={
    lobby:[1_400,4_800],setup:[2_100,7_600],draft:[1_700,6_900],market:[1_600,6_200],
    training:[2_200,7_200],live:[1_400,5_800],penalty:[1_200,4_900],result:[1_600,4_200]
  };
  const [minimum,span]=ranges[phase]||[1_500,5_500];
  return minimum+(hash(`${seed}|${phase}|${step}|delay`)%span);
}

export function createBotIdentity(seed,rating=1000){
  const raw=hash(seed),tag=raw.toString(36).toUpperCase().padStart(7,"0").slice(-4);
  const useSlang=hash(`${seed}|slang`)%4===0;
  const first=useSlang?pick(SLANG,seed,"slang"):pick(OPENERS,seed,"open");
  const core=pick(CORES,seed,"core"),ending=pick(ENDINGS,seed,"ending");
  const clubName=typo(`${first} ${core} ${ending}`,seed).slice(0,24).trim()+` ${tag}`;
  return Object.freeze({
    owner:`arena-system:${raw.toString(16).padStart(8,"0")}:${tag}`,
    clubName:clubName.slice(0,29),
    rating:Math.max(700,Math.min(1900,Math.round(Number(rating)||1000)+(hash(`${seed}|rating`)%81)-40)),
    personality:Object.freeze({
      seed:tag,
      risk:(hash(`${seed}|risk`)%101)/100,
      thrift:(hash(`${seed}|thrift`)%101)/100,
      flair:(hash(`${seed}|flair`)%101)/100,
      press:(hash(`${seed}|press`)%101)/100,
      patience:(hash(`${seed}|patience`)%101)/100
    })
  });
}

export const BOT_NAME_CAPACITY=(OPENERS.length+SLANG.length)*CORES.length*ENDINGS.length*36**4;
