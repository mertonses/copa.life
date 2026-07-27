import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("src/game/preMatchPreparation.js","utf8");
const context={window:{LANG:"tr"},console};
vm.createContext(context);
vm.runInContext(source,context,{filename:"src/game/preMatchPreparation.js"});

const prep=context.window.CopaPreparation;
const failures=[];
const expect=(value,message)=>{if(!value)failures.push(message);};

expect(prep&&typeof prep.relevance==="function","preparation relevance API is missing");
if(prep){
  const early={name:"Rakip",style:"counter"};
  const final={name:"Finalist",style:"press"};
  expect(prep.relevance("analysis",2,early)===4,"opponent analysis is not prioritized when a style is known");
  expect(prep.relevance("penalties",2,early)===0,"penalty training is still promoted too early");
  expect(prep.relevance("penalties",5,final)===4,"penalty training is not promoted in knockout rounds");
  prep.restore({round:3,fatigue:18});
  expect(prep.relevance("recovery",3,early)===4,"recovery is not prioritized for a fatigued squad");
  prep.restore({round:3,fatigue:0});
  expect(prep.relevance("recovery",3,early)<4,"recovery is always treated as the dominant drill");
}

if(failures.length){
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Preparation balance OK: contextual recommendations avoid a universal best drill.");
