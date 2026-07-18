import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("src/core/squad.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const context={Math,Set};
vm.createContext(context);
vm.runInContext(source,context,{filename:"src/core/squad.js"});

const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message);};
const close=(actual,expected)=>Math.abs(actual-expected)<0.11;

expect(close(context.playerMarketValue(80,"free_agent",1),6.3),"free_agent multiplier is not 0.90");
expect(close(context.playerMarketValue(80,"free_agent",5),8.8),"round urgency is not +10% per completed step");
[2,3,4,5,6].forEach((floor,index)=>{
  expect(context.freeAgentRoundFloor(index+1)===floor,`round ${index+1} floor is not EUR${floor}M`);
  expect(context.playerMarketValue(60,"free_agent",index+1)>=floor,`raw round ${index+1} value falls below its floor`);
});

const bands=[
  [60,66,2,4],
  [67,72,4,7],
  [73,78,7,12],
  [79,84,12,18],
  [85,99,18,24],
];
for(const [low,high,min,max] of bands){
  for(let ov=low;ov<=high;ov++){
    const band=context.freeAgentPriceBand(ov);
    expect(band[0]===min&&band[1]===max,`${ov} power is mapped outside EUR${min}-${max}M`);
  }
}

/* Generated rounds only use compatible power/floor intersections:
   R1 62-70, R2 64-72, R3 66-74, R4 68-76, R5 70-78. */
for(let round=1;round<=5;round++){
  const low=60+round*2,high=low+8;
  for(let ov=low;ov<=high;ov++){
    const raw=context.playerMarketValue(ov,"free_agent",round);
    for(const chairmanMultiplier of [0.90,1]){
      const fee=context.clampFreeAgentFee(ov,round,raw*chairmanMultiplier);
      const [bandLow,bandHigh]=context.freeAgentPriceBand(ov);
      expect(fee>=bandLow&&fee<=bandHigh,`R${round} / ${ov} power produced EUR${fee}M outside EUR${bandLow}-${bandHigh}M`);
      expect(fee>=context.freeAgentRoundFloor(round),`R${round} / ${ov} power produced EUR${fee}M below round floor`);
      expect(fee<=24,`R${round} / ${ov} power exceeded EUR24M`);
    }
  }
}

expect(/clampFreeAgentFee\(p\.ov,round,adjustedFee\)/.test(html),"free-agent generator does not apply the shared band clamp");
expect(/Math\.min\(adjustedFee,24\)/.test(html),"free-agent fallback cap is not EUR24M");
expect(!/valueOf\(p\.ov\)\*0\.62|Math\.min\([^\\n]*,16\)/.test(html),"legacy EUR16M / 0.62 pricing remains in the generator");

if(failures.length){
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Free-agent pricing OK: 0.90 multiplier, +10% round urgency, EUR2-6M floors, power bands and EUR24M cap verified.");
