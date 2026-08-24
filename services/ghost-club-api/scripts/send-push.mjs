const endpoint=String(process.env.COPA_PUSH_API_URL||"").trim();
const adminToken=String(process.env.COPA_PUSH_ADMIN_TOKEN||"").trim();
const title=String(process.env.COPA_PUSH_TITLE||"").trim();
const body=String(process.env.COPA_PUSH_BODY||"").trim();
const deepLink=String(process.env.COPA_PUSH_DEEP_LINK||"").trim();
const type=String(process.env.COPA_PUSH_TYPE||"system").trim();
const priority=String(process.env.COPA_PUSH_PRIORITY||"normal").trim();
const locale=String(process.env.COPA_PUSH_LOCALE||"").trim();
const dryRun=String(process.env.COPA_PUSH_DRY_RUN||"").toLowerCase()==="true";

if(!endpoint||!adminToken||!title||!body)throw new Error("push dispatch configuration is incomplete");
const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-copa-push-admin":adminToken},body:JSON.stringify({title,body,deepLink,type,priority,locale,dryRun})});
const result=await response.json().catch(()=>({error:"invalid_response"}));
if(!response.ok)throw new Error(`push dispatch failed: HTTP ${response.status} ${String(result.error||"")}`.trim());
console.log(JSON.stringify(result));
