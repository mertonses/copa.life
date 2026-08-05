import {execFileSync} from "node:child_process";

const args=process.argv.slice(2),valueOf=flag=>{const index=args.indexOf(flag);return index>=0?args[index+1]:"";};
const base=valueOf("--base"),head=valueOf("--head")||"HEAD",supplied=valueOf("--files");
let files=[];
if(supplied)files=supplied.split(",").map(file=>file.trim()).filter(Boolean);
else try{
  if(base){
    const mergeBase=execFileSync("git",["merge-base",base,head],{encoding:"utf8"}).trim();
    files=execFileSync("git",["diff","--name-only",`${mergeBase}...${head}`],{encoding:"utf8"}).split(/\r?\n/).filter(Boolean);
  }else files=execFileSync("git",["diff","--name-only","HEAD~1",head],{encoding:"utf8"}).split(/\r?\n/).filter(Boolean);
}catch(_){files=[];}

const all=files.length===0||files.some(file=>/^(package(?:-lock)?\.json|\.github\/workflows\/|tools\/changed-test-matrix\.mjs)/.test(file));
const matches=pattern=>all||files.some(file=>pattern.test(file));
const suites=["contracts"];
if(matches(/^(services\/copa-arena-api\/|src\/online\/arena\.js|src\/styles\/arena\.css)/))suites.push("arena");
if(matches(/^(services\/ghost-club-api\/|src\/runtime\/productAnalytics\.js|privacy\.html)/))suites.push("ghost");
if(matches(/^(index\.html|src\/(ui|styles|sidefield|cards)\/|playtest\/runner\/tests\/)/))suites.push("navigation");
if(matches(/^(android\/|ios\/|capacitor\.config|src\/runtime\/(native|platform)|tools\/(build-android|build-ios|check-android|check-ios))/))suites.push("native");
process.stdout.write(JSON.stringify([...new Set(suites)]));
