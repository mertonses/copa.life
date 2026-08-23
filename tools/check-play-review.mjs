import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const failures=[];
const expect=(value,message)=>{if(!value)failures.push(message);};
const runtime=read("src/runtime/playReview.js");
const activity=read("android/app/src/main/java/life/copa/app/MainActivity.java");
const plugin=read("android/app/src/main/java/life/copa/app/CopaReviewPlugin.java");
const gradle=read("android/app/build.gradle");
const index=read("index.html");

expect(index.includes("src/runtime/playReview.js"),"review runtime is not included");
expect(runtime.includes("MIN_DISTINCT_DAYS=2"),"review request lacks a minimum experience window");
expect(runtime.includes("MIN_MATCH_WINS=3"),"review request is not gated by positive play");
expect(runtime.includes("COOLDOWN_MS=120"),"review request cooldown is missing");
expect(runtime.includes('props.outcome==="win"'),"review request is not restricted to a positive outcome");
expect(runtime.includes("result.requested!==true"),"unavailable review flows must not consume the prompt quota");
expect(!runtime.includes("5 yıldız")&&!runtime.includes("5 stars"),"review runtime contains rating manipulation copy");
expect(activity.includes("registerPlugin(CopaReviewPlugin.class)"),"native review plugin is not registered");
expect(plugin.includes("ReviewManagerFactory.create")&&plugin.includes("launchReviewFlow"),"native Play review flow is incomplete");
expect(gradle.includes("com.google.android.play:review:2.0.2"),"Play review dependency is missing");

if(failures.length){for(const failure of failures)console.error(`[play-review] ${failure}`);process.exit(1);}
console.log("[play-review] positive-moment Android review flow passed");
