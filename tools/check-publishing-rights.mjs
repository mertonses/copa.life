import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const INVENTORY=path.join(ROOT,"docs/data-rights-inventory.json");
const PUBLIC=process.argv.includes("--public")||/^(1|true)$/i.test(process.env.PUBLIC_RELEASE||"");
const REQUIRED=["assets/clubs/","assets/data/copa/","tools/data/player_profile_source.json","assets/flags/","src/data/logos.js","src/data/player_profile_store.js","src/data/players"];
const WEB_ONLY_EXCEPTION="owner_accepted_web_only";
const ignored=new Set([".git","node_modules","dist","dist-android","dist-ios","android/app/src/main/assets/public","ios/App/App/public",".tmp",".wrangler",".wrangler-dry-run","playtest/runner/test-results"]);

const posix=value=>value.replace(/\\/g,"/");
function walk(directory,out=[]){
  if(!fs.existsSync(directory))return out;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const full=path.join(directory,entry.name),relative=posix(path.relative(ROOT,full));
    if([...ignored].some(prefix=>relative===prefix||relative.startsWith(prefix+"/")))continue;
    if(entry.isDirectory())walk(full,out);else out.push(relative);
  }
  return out;
}
function matcher(pattern){
  const escaped=posix(pattern).replace(/[.+?^${}()|[\]\\]/g,"\\$&").replace(/\*\*/g,".*").replace(/\*/g,"[^/]*");
  return new RegExp(`^${escaped}$`);
}
function fail(message){console.error(`[rights] ${message}`);process.exitCode=1;}

let inventory;
try{inventory=JSON.parse(fs.readFileSync(INVENTORY,"utf8"));}catch(error){fail(`inventory cannot be read: ${error.message}`);process.exit();}
if(inventory.schema_version!==1)fail("unsupported inventory schema");
if(inventory.policy!=="deny_public_release_until_cleared")fail("inventory must be deny-by-default");
if(!Array.isArray(inventory.records)||!inventory.records.length)fail("inventory has no records");

const files=walk(ROOT),patterns=[];
for(const record of inventory.records||[]){
  if(!record.id||!record.title||!record.status||!Array.isArray(record.paths)||!record.paths.length){fail(`invalid record: ${record.id||"unknown"}`);continue;}
  for(const item of record.paths)patterns.push({record,pattern:item,match:matcher(item)});
  if(record.status==="cleared"&&(!record.evidence||!record.owner||!record.reviewed_at))fail(`cleared record lacks evidence, owner or review date: ${record.id}`);
  if(record.status===WEB_ONLY_EXCEPTION&&(
    inventory.web_only_exception_policy!=="explicit_owner_risk_acceptance_does_not_equal_clearance"||
    record.distribution_scope!=="web_only"||!record.risk_acknowledgement||!record.evidence||!record.owner||!record.reviewed_at
  ))fail(`web-only exception lacks scope, acknowledgement, evidence, owner or review date: ${record.id}`);
}
for(const required of REQUIRED){
  if(!patterns.some(item=>item.pattern.startsWith(required)||required.startsWith(item.pattern.replace(/\*.*$/,""))))fail(`sensitive path is not inventoried: ${required}`);
}
for(const item of patterns){
  if(!files.some(file=>item.match.test(file)))fail(`inventory pattern matches no file: ${item.pattern}`);
}

const exceptions=(inventory.records||[]).filter(record=>record.status===WEB_ONLY_EXCEPTION);
const blocked=(inventory.records||[]).filter(record=>record.status!=="cleared"&&record.status!==WEB_ONLY_EXCEPTION);
if(PUBLIC&&blocked.length){
  for(const record of blocked)fail(`public release blocked by ${record.id} (${record.status}): ${record.paths.join(", ")}`);
  console.error("[rights] Record written permission/licence evidence or replace the affected assets with independently created, cleared material.");
}else if(!process.exitCode){
  if(PUBLIC)for(const record of exceptions)console.warn(`[rights] web-only owner risk exception (not legal clearance): ${record.id}`);
  console.log(PUBLIC?`[rights] public web release allowed; ${exceptions.length} explicit web-only owner exception(s) remain uncleared`:`[rights] development check passed; ${blocked.length} blocking record(s), ${exceptions.length} web-only owner exception(s)`);
}
