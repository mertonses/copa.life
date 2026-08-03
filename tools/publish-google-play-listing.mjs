import {createSign} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const STORE=path.join(ROOT,"store/android");
const PACKAGE=process.env.GOOGLE_PLAY_PACKAGE_NAME||"life.copa.app";
const COMMIT=process.argv.includes("--commit");
const LOCALES=[
  {code:"tr-TR",listing:"listing-tr.md"},
  {code:"en-US",listing:"listing-en.md"},
  {code:"es-ES",listing:"listing-es.md"},
  {code:"de-DE",listing:"listing-de.md"},
  {code:"it-IT",listing:"listing-it.md"},
];
const SCREENSHOTS=["01-two-modes.jpg","02-life-stars-tr-eng.jpg","03-life-stars-es-de.jpg","04-life-stars-it-jp.jpg","05-life-cup-journey.jpg","06-arena-season-road.jpg","07-arena-live-pvp.jpg","08-arena-private-tournaments.jpg"];

function listingFields(file){
  const sections=fs.readFileSync(file,"utf8").split(/^##\s+/m).slice(1).map(section=>section.split(/\r?\n/).slice(1).join("\n").trim());
  const [title,shortDescription,fullDescription]=sections;
  if(!title||!shortDescription||!fullDescription)throw new Error(`Incomplete listing: ${file}`);
  return{title:title.split(/\r?\n/)[0].trim(),shortDescription:shortDescription.split(/\r?\n/)[0].trim(),fullDescription};
}

function localPayloads(){
  return LOCALES.map(locale=>{
    const root=path.join(STORE,"graphics/localized",locale.code);
    const feature=path.join(root,"feature-graphic.jpg");
    const phone=SCREENSHOTS.map(file=>path.join(root,"phone",file));
    const tablet=SCREENSHOTS.map(file=>path.join(root,"tablet",file));
    for(const file of [feature,...phone,...tablet])if(!fs.existsSync(file))throw new Error(`Missing store asset: ${file}`);
    return{...locale,fields:listingFields(path.join(STORE,locale.listing)),feature,phone,tablet};
  });
}

const base64url=value=>Buffer.from(value).toString("base64url");
async function accessToken(serviceAccount){
  const now=Math.floor(Date.now()/1000),header=base64url(JSON.stringify({alg:"RS256",typ:"JWT"})),claim=base64url(JSON.stringify({iss:serviceAccount.client_email,scope:"https://www.googleapis.com/auth/androidpublisher",aud:serviceAccount.token_uri||"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})),unsigned=`${header}.${claim}`;
  const signer=createSign("RSA-SHA256");signer.update(unsigned);signer.end();
  const assertion=`${unsigned}.${signer.sign(serviceAccount.private_key).toString("base64url")}`;
  const response=await fetch(serviceAccount.token_uri||"https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
  if(!response.ok)throw new Error(`OAuth failed (${response.status}): ${await response.text()}`);
  return (await response.json()).access_token;
}

async function api(token,url,{method="GET",body,contentType="application/json",attempt=0}={}){
  const response=await fetch(url,{method,headers:{authorization:`Bearer ${token}`,...(body?{"content-type":contentType}:{})},body:body&&(Buffer.isBuffer(body)?body:contentType==="application/json"?JSON.stringify(body):body)});
  if((response.status===429||response.status>=500)&&attempt<5){await new Promise(resolve=>setTimeout(resolve,500*2**attempt));return api(token,url,{method,body,contentType,attempt:attempt+1});}
  const text=await response.text();
  if(!response.ok)throw new Error(`${method} ${url} failed (${response.status}): ${text.slice(0,1200)}`);
  return text?JSON.parse(text):{};
}

async function uploadImage(token,editId,locale,imageType,file){
  const url=`https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE)}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale)}/${imageType}?uploadType=media`;
  return api(token,url,{method:"POST",body:fs.readFileSync(file),contentType:"image/jpeg"});
}

const payloads=localPayloads();
console.log(`[play listing] local validation passed: ${payloads.length} locales, ${SCREENSHOTS.length} phone + ${SCREENSHOTS.length} tablet screenshots each`);
if(!COMMIT){console.log("[play listing] dry run only; pass --commit with GOOGLE_PLAY_SERVICE_ACCOUNT_JSON to publish");process.exit(0);}

const raw=process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
if(!raw)throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is required with --commit");
const serviceAccount=JSON.parse(raw),token=await accessToken(serviceAccount);
const base=`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(PACKAGE)}`;
const edit=await api(token,`${base}/edits`,{method:"POST",body:{}}),editId=edit.id;
if(!editId)throw new Error("Google Play did not return an edit id");
console.log(`[play listing] edit ${editId} opened`);

try{
  const current=await api(token,`${base}/edits/${encodeURIComponent(editId)}/listings`),videos=new Map((current.listings||[]).map(listing=>[listing.language,listing.video||""]));
  for(const locale of payloads){
    const listing={language:locale.code,...locale.fields};
    const existingVideo=videos.get(locale.code);if(existingVideo)listing.video=existingVideo;
    await api(token,`${base}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale.code)}`,{method:"PUT",body:listing});
    const imageGroups=[
      ["featureGraphic",[locale.feature]],
      ["phoneScreenshots",locale.phone],
      ["sevenInchScreenshots",locale.tablet],
      ["tenInchScreenshots",locale.tablet],
    ];
    for(const [imageType,files] of imageGroups){
      await api(token,`${base}/edits/${encodeURIComponent(editId)}/listings/${encodeURIComponent(locale.code)}/${imageType}`,{method:"DELETE"});
      for(const file of files)await uploadImage(token,editId,locale.code,imageType,file);
    }
    console.log(`[play listing] ${locale.code}: text + feature + phone + 7-inch + 10-inch uploaded`);
  }
  await api(token,`${base}/edits/${encodeURIComponent(editId)}:validate`,{method:"POST",body:{}});
  await api(token,`${base}/edits/${encodeURIComponent(editId)}:commit`,{method:"POST",body:{}});
  console.log(`[play listing] committed edit ${editId} for ${PACKAGE}`);
}catch(error){
  try{await api(token,`${base}/edits/${encodeURIComponent(editId)}`,{method:"DELETE"});}catch{}
  throw error;
}
