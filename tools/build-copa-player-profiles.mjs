import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const SOURCE=path.join(ROOT,"tools","data","player_profile_source.json");
const OUTPUT=path.join(ROOT,"assets","data","copa","player_profiles.json");
const FALLBACK_OUTPUT=path.join(ROOT,"assets","data","copa","player_profiles.js");
const MODEL_VERSION="copa-model-v1";

const raw=JSON.parse(fs.readFileSync(SOURCE,"utf8"));
const rawFields=Array.isArray(raw.fields)?raw.fields:[];
const rawIndex=new Map(rawFields.map((field,index)=>[field,index]));
const entries=Object.entries(raw.records||{});

const DIMENSIONS=["impact","build_up","space_control","duels","engine","pressure_decision"];
const OUTPUT_FIELDS=[
  "copa_impact","copa_build_up","copa_space_control","copa_duels","copa_engine","copa_pressure_decision",
  "position_fit","strengths","risks","tendencies","archetype","national_team","secondary_position","preferred_foot","best_position","positions"
];

const OUTFIELD={
  impact:{finishing:.22,off_the_ball:.18,long_shots:.12,dribbling:.14,heading:.12,passing:.08,crossing:.07,penalties:.03,composure:.04},
  build_up:{passing:.30,decisions:.20,dribbling:.15,flair:.12,crossing:.10,composure:.08,free_kicks:.05},
  space_control:{off_the_ball:.18,decisions:.18,work_rate:.17,tackling:.14,pace:.08,leadership:.07,bravery:.06,aggression:.05,heading:.07},
  duels:{tackling:.23,strength:.18,aggression:.14,bravery:.14,agility:.09,heading:.12,decisions:.06,aerial_reach:.04},
  engine:{pace:.20,acceleration:.20,agility:.15,stamina:.18,natural_fitness:.12,work_rate:.15},
  pressure_decision:{decisions:.27,composure:.24,work_rate:.14,leadership:.12,bravery:.10,passing:.08,flair:.05}
};

const KEEPER={
  impact:{reflexes:.28,handling:.22,one_on_ones:.18,command_of_area:.12,agility:.12,rushing_out:.08},
  build_up:{kicking:.35,passing:.25,decisions:.20,composure:.15,handling:.05},
  space_control:{command_of_area:.28,aerial_reach:.24,handling:.18,decisions:.14,rushing_out:.10,composure:.06},
  duels:{one_on_ones:.28,reflexes:.18,rushing_out:.17,bravery:.13,agility:.12,strength:.06,decisions:.06},
  engine:{agility:.22,acceleration:.16,stamina:.18,natural_fitness:.15,strength:.10,reflexes:.12,rushing_out:.07},
  pressure_decision:{decisions:.26,composure:.24,handling:.18,command_of_area:.12,bravery:.10,kicking:.06,leadership:.04}
};

const ROLE_WEIGHTS={
  keeper:{impact:.34,build_up:.12,space_control:.23,duels:.15,engine:.05,pressure_decision:.11},
  striker:{impact:.35,build_up:.10,space_control:.12,duels:.15,engine:.16,pressure_decision:.12},
  wide:{impact:.24,build_up:.20,space_control:.10,duels:.06,engine:.24,pressure_decision:.16},
  midfield:{impact:.10,build_up:.28,space_control:.18,duels:.12,engine:.14,pressure_decision:.18},
  holding:{impact:.06,build_up:.18,space_control:.23,duels:.22,engine:.15,pressure_decision:.16},
  fullback:{impact:.08,build_up:.18,space_control:.20,duels:.17,engine:.24,pressure_decision:.13},
  defender:{impact:.04,build_up:.12,space_control:.25,duels:.28,engine:.11,pressure_decision:.20}
};

function value(record,field){
  const index=rawIndex.get(field),number=index==null?NaN:Number(record[index]);
  return Number.isFinite(number)&&number>=1&&number<=20?number:null;
}
function text(record,field){const index=rawIndex.get(field);return index==null?"":String(record[index]??"").trim();}
function clamp(number,min=0,max=100){return Math.max(min,Math.min(max,number));}
function weightedRaw(record,weights){
  let total=0,used=0;
  for(const [field,weight] of Object.entries(weights)){const current=value(record,field);if(current==null)continue;total+=current*weight;used+=weight;}
  return used?total/used*5:null;
}
function keeperRecord(record){return /(^|[\s,(])(?:KL|GK)(?:$|[\s,)])/i.test([text(record,"best_position"),text(record,"secondary_position"),text(record,"positions")].join(" "));}
function roleFor(record,keeper){
  if(keeper)return"keeper";
  const position=[text(record,"best_position"),text(record,"secondary_position")].join(" ").toLocaleUpperCase("tr-TR");
  if(/\bST\b/.test(position))return"striker";
  if(/\bOOS\b/.test(position)&&/(?:SĞ|SL|R|L)/.test(position))return"wide";
  if(/\bKB\b|\bD\s*\((?:SĞ|SL|R|L)/.test(position))return"fullback";
  if(/\bDOS\b/.test(position))return"holding";
  if(/\bD\b/.test(position))return"defender";
  return"midfield";
}
function rank(sorted,target){
  let low=0,high=sorted.length;
  while(low<high){const mid=(low+high)>>1;if(sorted[mid]<=target)low=mid+1;else high=mid;}
  return sorted.length<=1?.5:(low-1)/(sorted.length-1);
}
function scoredArchetype(role,scores){
  const top=DIMENSIONS.slice().sort((a,b)=>scores[b]-scores[a])[0];
  if(role==="keeper")return top==="build_up"?"build_keeper":top==="space_control"?"area_keeper":top==="duels"?"duel_keeper":"shot_stopper";
  if(role==="striker")return top==="engine"?"pressing_forward":top==="build_up"?"link_forward":top==="duels"||top==="space_control"?"target_forward":"finisher";
  if(role==="wide")return top==="build_up"||top==="pressure_decision"?"creative_wide":"direct_wide";
  if(role==="defender"||role==="fullback")return top==="build_up"?"build_defender":top==="duels"?"duel_defender":top==="engine"?"running_defender":"space_defender";
  if(role==="holding")return top==="duels"||top==="space_control"?"ball_winner":"deep_builder";
  return top==="build_up"?"playmaker":top==="engine"?"tempo_midfielder":top==="duels"||top==="space_control"?"ball_winner":"balanced_midfielder";
}

const prepared=entries.map(([key,record])=>{
  const keeper=keeperRecord(record),weights=keeper?KEEPER:OUTFIELD,bases={};
  for(const dimension of DIMENSIONS)bases[dimension]=weightedRaw(record,weights[dimension]);
  return {key,record,keeper,bases,role:roleFor(record,keeper)};
});

const distributions={keeper:{},outfield:{}};
for(const group of Object.keys(distributions))for(const dimension of DIMENSIONS)distributions[group][dimension]=prepared.filter(item=>(group==="keeper")===item.keeper&&item.bases[dimension]!=null).map(item=>item.bases[dimension]).sort((a,b)=>a-b);

const records={};
for(const item of prepared){
  const group=item.keeper?"keeper":"outfield",scores={};
  for(const dimension of DIMENSIONS){
    const base=item.bases[dimension];
    if(base==null){scores[dimension]=null;continue;}
    const percentile=25+rank(distributions[group][dimension],base)*74;
    scores[dimension]=Math.round(clamp(base*.72+percentile*.28,1,99));
  }
  const available=DIMENSIONS.filter(dimension=>scores[dimension]!=null);
  const mean=available.reduce((sum,dimension)=>sum+scores[dimension],0)/Math.max(1,available.length);
  const roleWeights=ROLE_WEIGHTS[item.role],roleScore=Object.entries(roleWeights).reduce((sum,[dimension,weight])=>sum+(scores[dimension]??mean)*weight,0);
  const shapeFit=clamp(50+(roleScore-50)*.35+(roleScore-mean)*1.3,45,100);
  const positionFit=Math.round(clamp(45+shapeFit*.55,0,100));
  const strongest=available.slice().sort((a,b)=>scores[b]-scores[a]);
  const weakest=available.slice().sort((a,b)=>scores[a]-scores[b]);
  const strengths=strongest.filter(dimension=>scores[dimension]>=68).slice(0,3).map(dimension=>item.keeper&&dimension==="impact"?"shot_stopping":dimension);
  if(strengths.length<2)for(const dimension of strongest){const id=item.keeper&&dimension==="impact"?"shot_stopping":dimension;if(!strengths.includes(id))strengths.push(id);if(strengths.length===2)break;}
  const risks=weakest.filter(dimension=>scores[dimension]<=55).slice(0,2).map(dimension=>dimension);
  const contact=weightedRaw(item.record,{aggression:.70,bravery:.15,strength:.15});
  const tendencies=[];
  if(contact!=null&&contact>=72)tendencies.push("contact_play");
  if(scores.engine>=74&&scores.impact>=68)tendencies.push("direct_play");
  if(scores.build_up>=72&&scores.pressure_decision>=68)tendencies.push("controlled_play");
  records[item.key]=[
    ...DIMENSIONS.map(dimension=>scores[dimension]),positionFit,strengths,risks,tendencies,scoredArchetype(item.role,scores),
    text(item.record,"national_team"),text(item.record,"secondary_position"),text(item.record,"preferred_foot"),text(item.record,"best_position"),text(item.record,"positions")
  ];
}

const output={
  schema_version:1,
  model_version:MODEL_VERSION,
  source:"copa.life oyun modeli",
  scale:{min:0,max:100},
  dimensions:DIMENSIONS,
  fields:OUTPUT_FIELDS,
  records
};
fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
const serialized=JSON.stringify(output);
fs.writeFileSync(OUTPUT,serialized);
fs.writeFileSync(
  FALLBACK_OUTPUT,
  `globalThis.__COPA_PLAYER_PROFILE_DATA__=${serialized.replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")};\n`,
);
console.log(`[copa profiles] ${entries.length} profiles -> ${path.relative(ROOT,OUTPUT)} + lazy file fallback (${MODEL_VERSION})`);
