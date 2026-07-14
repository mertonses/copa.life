import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../src/core/squad.js",import.meta.url),"utf8");
const context={console};
vm.createContext(context);
vm.runInContext(source,context,{filename:"src/core/squad.js"});
const positionPenalty=vm.runInContext("positionPenalty",context);
const positionPenaltyFor=vm.runInContext("positionPenaltyFor",context);

const cases=[
 ["natural centre-back","CB","CB",0],
 ["natural goalkeeper","GK","GK",0],
 ["full-back to wing-back","LB","WB",2],
 ["holding midfielder to centre midfield","DM","CM",2],
 ["left winger to left midfield","LW","LM",2],
 ["centre midfield to attacking midfield","CM","AM",3],
 ["left winger to right winger","LW","RW",3],
 ["centre-back to holding midfield","CB","DM",4],
 ["striker to attacking midfield","ST","AM",4],
 ["left-back to right-back","LB","RB",4],
 ["winger to wing-back","LW","WB",5],
 ["centre-back to full-back","CB","LB",6],
 ["holding to attacking midfield","DM","AM",6],
 ["centre-back to striker","CB","ST",18],
 ["goalkeeper to centre-back","GK","CB",22],
 ["centre-back to goalkeeper","CB","GK",22],
 ["legacy defensive group","DEF","DEF",0]
];

for(const [label,natural,target,expected] of cases){
 const actual=positionPenalty(natural,target,natural);
 if(actual!==expected)throw new Error(`${label}: expected ${expected}, got ${actual}`);
}

const movedPlayer={natPos:"AM",pos:"DM",natG:"MID"};
if(positionPenaltyFor(movedPlayer,"DM")!==6)throw new Error("natural position must survive a later slot move");

console.log(`Position-fit audit passed: ${cases.length + 1} cases.`);
