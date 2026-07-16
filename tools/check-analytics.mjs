import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const failures=[];
const read=relative=>fs.readFileSync(path.join(ROOT,relative),"utf8");
const fail=message=>failures.push(message);
const expect=(condition,message)=>{if(!condition)fail(message);};

const sourceIndex=read("index.html");
const runtime=read("src/runtime/productAnalytics.js");
const worker=read("services/ghost-club-api/src/index.js");
const workerConfig=read("services/ghost-club-api/wrangler.jsonc");
const stagingConfig=read("services/ghost-club-api/wrangler.staging.jsonc");
const pagesBuilder=read("tools/build-pages.mjs");
const pagesWorkflow=read(".github/workflows/pages.yml");
const reportWorkflow=read(".github/workflows/analytics-report.yml");
const monitorWorkflow=read(".github/workflows/analytics-monitor.yml");
const reportScript=read("services/ghost-club-api/scripts/analytics-report.mjs");
const monitorScript=read("services/ghost-club-api/scripts/analytics-monitor.mjs");
const privacy=read("privacy.html");
const webIndex=read("dist/index.html");
const androidIndex=read("dist-android/index.html");

expect(sourceIndex.includes('meta name="copa-analytics-api"'),"web analytics API meta is missing");
expect(sourceIndex.includes("src/runtime/productAnalytics.js"),"web product analytics runtime is not loaded");
for(const event of ["session_started","country_selected","draft_started","xi_completed","round_completed","run_finished","ghost_opt_in","profile_open_error"]){
  expect(runtime.includes(`"${event}"`),`product event is missing: ${event}`);
  expect(worker.includes(`"${event}"`),`Worker allowlist is missing: ${event}`);
}
for(const forbidden of ["localStorage","sessionStorage","document.cookie","session_id","player_name","club_name","email"]){
  expect(!runtime.includes(forbidden),`analytics runtime contains forbidden identifier/storage marker: ${forbidden}`);
}
expect(runtime.includes("globalPrivacyControl")&&runtime.includes("doNotTrack"),"browser privacy signals are not respected");
expect(worker.includes("No user/session index is written"),"Analytics Engine privacy schema is not documented in code");
expect(workerConfig.includes('"binding": "PRODUCT_ANALYTICS"')&&workerConfig.includes('"dataset": "copa_life_product_events"'),"production Analytics Engine binding is missing");
expect(stagingConfig.includes('"dataset": "copa_life_product_events_staging"'),"staging analytics dataset is not isolated");
expect(workerConfig.includes('"binding": "WORKER_ANALYTICS"')&&workerConfig.includes('"dataset": "copa_life_worker_health"'),"production Worker health analytics binding is missing");
expect(stagingConfig.includes('"dataset": "copa_life_worker_health_staging"'),"staging Worker health dataset is not isolated");
expect(worker.includes("routeBucket(url.pathname)")&&worker.includes('return "not_found"'),"Worker metrics do not use a fixed privacy-safe route bucket");
expect(!worker.includes("writeDataPoint({indexes"),"Analytics Engine metrics must not write an identifier index");
expect(reportWorkflow.includes("CLOUDFLARE_ANALYTICS_TOKEN")&&reportScript.includes("_sample_interval"),"weekly sampled KPI report is missing");
expect(reportScript.includes("sumIf(")&&monitorScript.includes("sumIf("),"Analytics Engine conditional aggregates must use supported sumIf syntax");
expect(!reportScript.includes("NULLIF(")&&!reportScript.includes("SUM(IF(")&&!monitorScript.includes("SUM(IF("),"Analytics Engine queries contain unsupported SQL functions or mixed numeric IF branches");
expect(monitorWorkflow.includes("PROFILE_ERROR_RATE")&&monitorWorkflow.includes("WORKER_5XX_RATE"),"analytics error monitor thresholds are missing");
expect(monitorScript.includes('blob1 = \'profile_open_error\'')&&monitorScript.includes("blob3 = '5xx'"),"profile and Worker error monitor queries are incomplete");
expect(pagesBuilder.includes("CF_WEB_ANALYTICS_TOKEN")&&pagesBuilder.includes("static.cloudflareinsights.com/beacon.min.js"),"Cloudflare Web Analytics build injection is missing");
expect(pagesWorkflow.includes("vars.CF_WEB_ANALYTICS_TOKEN"),"Pages workflow does not consume the Web Analytics token variable");
expect(privacy.includes("Toplu kullanım ve performans ölçümü")&&privacy.includes("kullanıcı veya oturum kimliği"),"privacy policy does not disclose aggregate analytics");
expect(webIndex.includes("src/runtime/productAnalytics.js"),"web artifact is missing product analytics runtime");

for(const forbidden of ["src/runtime/productAnalytics.js","copa-analytics-api","static.cloudflareinsights.com","cloudflareinsights.com","/v1/analytics/events"]){
  expect(!androidIndex.includes(forbidden),`Android index contains web-only analytics marker: ${forbidden}`);
}
expect(!fs.existsSync(path.join(ROOT,"dist-android/src/runtime/productAnalytics.js")),"Android artifact contains the web-only analytics runtime");

if(failures.length){for(const failure of failures)console.error(`[analytics] ${failure}`);process.exit(1);}
console.log("[analytics] privacy-minimised funnel, Worker health reports and alarms passed; Android artifact is clean");
