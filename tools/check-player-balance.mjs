import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT=path.resolve(import.meta.dirname,"..");
const DEFINITIONS=[
  ["TR","src/data/players.js","POOL"],
  ["ENG","src/data/players_england.js","POOL_EN"],
  ["ES","src/data/players_spain.js","POOL_ES"],
  ["IT","src/data/players_italy.js","POOL_IT"],
  ["DE","src/data/players_germany.js","POOL_DE"],
  ["JP","src/data/players_japan.js","POOL_JP"]
];
const EXACT_POSITIONS=new Set(["GK","CB","LB","RB","DM","CM","LM","RM","AM","LW","RW","ST"]);
const expectedGroup=position=>position==="GK"?"GK":["CB","LB","RB"].includes(position)?"DEF":["LW","RW","ST"].includes(position)?"FWD":"MID";
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};
const normalize=value=>String(value||"").toLocaleLowerCase("tr-TR").replaceAll("ı","i").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();

function loadPool(file,variable){
  const context={};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT,file),"utf8"),context,{filename:file});
  return context[variable].map(player=>Array.from(player));
}
function playerByName(pool,name){return pool.find(player=>normalize(player[0])===normalize(name));}
function mean(players){return players.reduce((sum,player)=>sum+player[1],0)/Math.max(1,players.length);}

const pools={};
const report=[];
for(const [country,file,variable] of DEFINITIONS){
  const pool=loadPool(file,variable);
  pools[country]=pool;
  const identities=new Set();
  for(const player of pool){
    expect(player.length===10,`${country}: ${player[0]} 10 alanlı şemaya uymuyor`);
    expect(Number.isInteger(player[1])&&player[1]>=52&&player[1]<=95,`${country}: ${player[0]} güç değeri geçersiz`);
    expect(["GK","DEF","MID","FWD"].includes(player[2]),`${country}: ${player[0]} rol grubu geçersiz`);
    expect(Number.isInteger(player[4])&&player[4]>=15&&player[4]<=45,`${country}: ${player[0]} yaş değeri geçersiz`);
    expect(player[5]===0||player[5]===1,`${country}: ${player[0]} yerli bayrağı geçersiz`);
    expect(EXACT_POSITIONS.has(player[7]),`${country}: ${player[0]} doğal mevki geçersiz`);
    expect(expectedGroup(player[7])===player[2],`${country}: ${player[0]} doğal mevki/rol grubu çelişiyor`);
    expect(Number.isInteger(player[8])&&player[8]>=player[1]&&player[8]<=96,`${country}: ${player[0]} potansiyeli geçersiz`);
    expect(player[9]===1||player[9]===2,`${country}: ${player[0]} lig seviyesi geçersiz`);
    if(player[9]===2)expect(player[1]<=84,`${country}: ${player[0]} alt lig güç tavanını aşıyor`);
    const identity=`${normalize(player[0])}|${normalize(player[3])}|${player[4]}`;
    expect(!identities.has(identity),`${country}: yinelenen oyuncu kimliği ${player[0]}`);
    identities.add(identity);
  }
  const over90=pool.filter(player=>player[1]>=90).length;
  const over80=pool.filter(player=>player[1]>=80).length;
  report.push({country,players:pool.length,mean:Number(mean(pool).toFixed(2)),over80,over90});
}

const eliteRanges={TR:[4,6],ENG:[10,14],ES:[7,10],IT:[4,7],DE:[4,7],JP:[0,0]};
for(const [country,[minimum,maximum]] of Object.entries(eliteRanges)){
  const count=pools[country].filter(player=>player[1]>=90).length;
  expect(count>=minimum&&count<=maximum,`${country}: 90+ oyuncu sayısı ${count}, hedef ${minimum}-${maximum}`);
}
expect(pools.JP.filter(player=>player[1]>=80).length>=10&&pools.JP.filter(player=>player[1]>=80).length<=20,"JP: 80+ elit katman 10-20 oyuncu olmalı");
expect(Math.max(...pools.JP.map(player=>player[1]))===82,"JP: güç tavanı 82 olmalı");
expect(JSON.stringify(Object.fromEntries(["GK","DEF","MID","FWD"].map(role=>[role,pools.JP.filter(player=>player[1]>=80&&player[2]===role).length])))===JSON.stringify({GK:2,DEF:4,MID:4,FWD:4}),"JP: elit katman mevki dağılımı 2/4/4/4 olmalı");

for(const [club,minimum,maximum] of [["Amedspor",71,73],["Erzurumspor",70,72],["Çorum FK",72,74]]){
  const players=pools.TR.filter(player=>normalize(player[3])===normalize(club));
  const average=mean(players);
  expect(players.length>0&&average>=minimum&&average<=maximum,`${club}: ortalama ${average.toFixed(2)}, hedef ${minimum}-${maximum}`);
}

const required=[
  ["TR","Victor Osimhen",94],["TR","Baran Sarka",70],["TR","Jhon Durán",88],["TR","Youssef En-Nesyri",87],
  ["ENG","Erling Haaland",94],["ENG","Mohamed Salah",93],["ES","Lamine Yamal",95],
  ["IT","Lautaro Martínez",92],["DE","Michael Olise",93],["DE","Harry Kane",93]
];
for(const [country,name,power] of required){
  const player=playerByName(pools[country],name);
  expect(player&&player[1]===power,`${country}: ${name} güç ${power} bulunamadı`);
}
for(const [country,name,group] of [["ENG","William Saliba","DEF"],["ENG","Gabriel","DEF"],["IT","Alessandro Bastoni","DEF"],["ES","Pedri","MID"],["ES","Jude Bellingham","MID"],["TR","Mauro Icardi","FWD"]]){
  const player=playerByName(pools[country],name);
  expect(player&&player[2]===group,`${country}: ${name} rolü ${group} olmalı`);
}
expect(playerByName(pools.TR,"Baran Sarka")?.[5]===1,"TR: Baran Sarka yerli olmalı");
for(const name of ["Ali Al-Musrati","Diogo Gonçalves","Marius Ștefănescu"])expect(playerByName(pools.TR,name)?.[5]===0,`TR: ${name} yabancı olmalı`);

const squadContext={};
vm.runInNewContext(`${fs.readFileSync(path.join(ROOT,"src/core/squad.js"),"utf8")}\nthis.market={playerMarketValue,valueOf,playerPotential};`,squadContext);
const market=squadContext.market;
const low=market.valueOf(55,27,55);
const prime=market.valueOf(80,27,80);
const prospect=market.valueOf(80,19,90);
const veteran=market.valueOf(80,34,80);
expect(Number.isInteger(low)&&low>=1,"Draft ücreti tam sayı ve en az 1 olmalı");
expect(Number.isInteger(prime)&&Number.isInteger(prospect)&&Number.isInteger(veteran),"Draft ücretleri tam sayı olmalı");
expect(prospect>prime&&prime>veteran,`Yaş/potansiyel fiyat eğrisi geçersiz: genç ${prospect}, prime ${prime}, veteran ${veteran}`);

console.table(report);
if(failures.length){
  for(const failure of failures)console.error(`- ${failure}`);
  throw new Error(`Oyuncu dengesi denetimi ${failures.length} hata buldu.`);
}
console.log(`Player balance OK: ${report.reduce((sum,row)=>sum+row.players,0)} oyuncu, doğal mevki/potansiyel/lig katmanı, elit dağılımı ve yaşa duyarlı bonservis doğrulandı.`);
