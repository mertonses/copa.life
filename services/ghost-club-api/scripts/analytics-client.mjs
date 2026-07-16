import fs from "node:fs";
import path from "node:path";

const accountId=String(process.env.CLOUDFLARE_ACCOUNT_ID||"").trim();
const analyticsToken=String(process.env.CLOUDFLARE_ANALYTICS_TOKEN||"").trim();

export const analyticsConfigured=()=>Boolean(accountId&&analyticsToken);

export async function queryAnalytics(sql){
  if(!analyticsConfigured())return {available:false,configured:false,reason:"analytics_credentials_missing",rows:[]};
  const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/analytics_engine/sql`,{
    method:"POST",
    headers:{authorization:`Bearer ${analyticsToken}`,"content-type":"text/plain;charset=UTF-8"},
    body:`${sql.trim().replace(/;$/,"")} FORMAT JSON`
  });
  const text=await response.text();
  if(!response.ok){
    if(response.status===404||/unknown table|does not exist|not found|no such dataset/i.test(text))return {available:false,configured:true,reason:"dataset_not_ready",rows:[]};
    throw new Error(`Analytics Engine SQL API failed (${response.status}): ${text.slice(0,300)}`);
  }
  let payload;
  try{payload=JSON.parse(text);}catch{throw new Error("Analytics Engine SQL API returned invalid JSON");}
  const rows=Array.isArray(payload)?payload:Array.isArray(payload.data)?payload.data:Array.isArray(payload.result)?payload.result:[];
  return {available:true,configured:true,reason:"",rows};
}

export function numeric(value){const number=Number(value);return Number.isFinite(number)?number:0;}

export function writeReport(filePath,report){
  const target=path.resolve(filePath);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,`${JSON.stringify(report,null,2)}\n`,"utf8");
  return target;
}

export function appendStepSummary(markdown){
  const target=process.env.GITHUB_STEP_SUMMARY;
  if(target)fs.appendFileSync(target,`${markdown.trim()}\n`,"utf8");
  else console.log(markdown.trim());
}
