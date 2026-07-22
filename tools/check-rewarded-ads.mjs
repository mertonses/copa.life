import fs from "node:fs";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const fail=message=>{console.error(`[rewarded-ads] ${message}`);process.exitCode=1;};
const expect=(source,marker,message)=>{if(!source.includes(marker))fail(message||`missing ${marker}`);};

const html=read("index.html");
const state=read("src/state/gameState.js");
const hub=read("src/ui/hub.js");
const runtime=read("src/runtime/nativeAds.js");
const plugin=read("android/app/src/main/java/life/copa/app/CopaAdsPlugin.java");

for(const marker of ["MAX_REWARDED_INJURY_HEALS=1","MAX_REWARDED_MARKET_REROLLS=1"])expect(state,marker);
for(const marker of ["requestRewardedInjuryHeal","showRewardedInjury(chairmanEventRunId)","result&&result.earned","rewardedInjuryHealsEarned"])expect(html,marker);
for(const marker of ["requestRewardedMarketReroll","showRewardedMarket(chairmanEventRunId)","result&&result.earned","rewardedMarketRerollsEarned"])expect(hub,marker);
for(const marker of ["showRewardedInjury","showRewardedMarket","showRunEnd"])expect(runtime,marker);
for(const marker of ["PLACEMENT_INJURY","PLACEMENT_MARKET","MAX_REWARDED_INJURY_HEALS_PER_RUN = 1","MAX_REWARDED_MARKET_REROLLS_PER_RUN = 1","onUserEarnedReward"])expect(plugin,marker);
if(/renderResult\(\)[\s\S]{0,220}CopaNativeAds\.showRunEnd/.test(html))fail("run-end interstitial still interrupts the result reveal");
expect(html,'onclick="restartAfterRunAd()"',"run-end ad is not attached to the explicit new-run transition");

if(!process.exitCode)console.log("Rewarded ads OK: draft 2/run, injury heal 1/run, market refresh 1/run; rewards require native completion.");
