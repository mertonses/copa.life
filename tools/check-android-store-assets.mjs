import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const STORE=path.join(ROOT,"store/android");
const LOCALES=[
  ["tr-TR","listing-tr.md"],
  ["en-US","listing-en.md"],
  ["es-ES","listing-es.md"],
  ["de-DE","listing-de.md"],
  ["it-IT","listing-it.md"],
];
const failures=[];
const fail=message=>failures.push(message);

function dimensions(file){
  const data=fs.readFileSync(file);
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
    return {width:data.readUInt32BE(16),height:data.readUInt32BE(20),type:"png",bitDepth:data[24],colorType:data[25]};
  }
  if(data[0]===0xff&&data[1]===0xd8){
    let offset=2;
    while(offset<data.length){
      if(data[offset]!==0xff){offset++;continue;}
      const marker=data[offset+1];
      if(marker===0xd8||marker===0xd9){offset+=2;continue;}
      const length=data.readUInt16BE(offset+2);
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
        return {width:data.readUInt16BE(offset+7),height:data.readUInt16BE(offset+5),type:"jpeg"};
      }
      offset+=2+length;
    }
  }
  throw new Error(`unsupported image format: ${file}`);
}

function checkImage(relative,width,height,type){
  const absolute=path.join(STORE,relative);
  if(!fs.existsSync(absolute)){fail(`missing asset: ${relative}`);return;}
  try{
    const actual=dimensions(absolute);
    if(actual.width!==width||actual.height!==height)fail(`${relative} is ${actual.width}x${actual.height}; expected ${width}x${height}`);
    if(actual.type!==type)fail(`${relative} is ${actual.type}; expected ${type}`);
    if(type==="png"&&(actual.bitDepth!==8||actual.colorType!==6))fail(`${relative} must be a 32-bit RGBA PNG`);
  }catch(error){fail(error.message);}
}

checkImage("graphics/app-icon-512.png",512,512,"png");
checkImage("graphics/feature-graphic.jpg",1024,500,"jpeg");
for(const root of ["graphics/play-games-pc",...LOCALES.map(([locale])=>`graphics/localized/${locale}/play-games-pc`)]){
  checkImage(`${root}/logo-600x400.png`,600,400,"png");
  checkImage(`${root}/feature-1920x1080.jpg`,1920,1080,"jpeg");
  for(const file of ["01-run-setup.jpg","02-player-draft.jpg","03-group-draw.jpg","04-match-hub.jpg","05-player-profile.jpg"])checkImage(`${root}/${file}`,1920,1080,"jpeg");
}
for(const [locale,listing] of LOCALES){
  const root=`graphics/localized/${locale}`;
  checkImage(`${root}/feature-graphic.jpg`,1024,500,"jpeg");
  for(const folder of ["phone","tablet"]){
    const directory=path.join(STORE,root,folder);
    const files=fs.existsSync(directory)?fs.readdirSync(directory).filter(file=>file.endsWith(".jpg")).sort():[];
    if(files.length!==5)fail(`${root}/${folder} must contain exactly five JPG screenshots`);
    for(const file of files)checkImage(`${root}/${folder}/${file}`,folder==="phone"?1080:1920,folder==="phone"?1920:1080,"jpeg");
  }
  const listingPath=path.join(STORE,listing);
  if(!fs.existsSync(listingPath)){fail(`missing listing: ${listing}`);continue;}
  const content=fs.readFileSync(listingPath,"utf8");
  const sections=content.split(/^##\s+/m).slice(1).map(section=>section.split("\n").slice(1).join("\n").trim());
  const [name,shortDescription,fullDescription]=sections;
  if(!name||Array.from(name.split("\n")[0].trim()).length>30)fail(`${listing} app name is missing or exceeds 30 characters`);
  if(!shortDescription||Array.from(shortDescription.split("\n")[0].trim()).length>80)fail(`${listing} short description is missing or exceeds 80 characters`);
  if(!fullDescription||Array.from(fullDescription).length>4000)fail(`${listing} full description is missing or exceeds 4000 characters`);
}

const manifestPath=path.join(STORE,"asset-manifest.json");
if(!fs.existsSync(manifestPath))fail("missing asset-manifest.json");
else{
  const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
  for(const asset of manifest.assets||[]){
    const absolute=path.join(STORE,asset.file);
    if(!fs.existsSync(absolute)){fail(`manifest references missing file: ${asset.file}`);continue;}
    const data=fs.readFileSync(absolute),sha256=createHash("sha256").update(data).digest("hex");
    if(asset.bytes!==data.length||asset.sha256!==sha256)fail(`manifest hash/size is stale for ${asset.file}`);
  }
}

if(failures.length){
  failures.forEach(message=>console.error(`[android store] ${message}`));
  process.exit(1);
}
console.log("[android store] passed: 5 listings plus localized phone, tablet and Google Play Games on PC assets");
