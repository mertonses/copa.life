import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),OUT=path.join(ROOT,"dist-android");
const failures=[];
function fail(message){failures.push(message);}
function walk(directory,files=[]){if(!fs.existsSync(directory))return files;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file,files);else files.push(file);}return files;}
if(!fs.existsSync(OUT))fail("dist-android is missing; run build:android first");
for(const relative of ["assets/clubs","assets/icons/patreon.svg","src/data/logos.js","src/state/diagnostics.js","sw.js"]){if(fs.existsSync(path.join(OUT,relative)))fail(`forbidden Android artifact: ${relative}`);}
const firstPartyFlags=["TR.svg","IT.svg","ENGLAND.svg","GB.svg","ES.svg","DE.svg","JP.svg"];
for(const flag of firstPartyFlags)if(!fs.existsSync(path.join(OUT,"assets/flags",flag)))fail(`Android first-party flag is missing: ${flag}`);
if(fs.existsSync(path.join(OUT,"assets/flags")))for(const file of walk(path.join(OUT,"assets/flags")))if(!firstPartyFlags.includes(path.basename(file))||path.extname(file).toLowerCase()!==".svg")fail(`unapproved Android flag artifact: ${path.relative(OUT,file)}`);
const textFiles=walk(OUT).filter(file=>/[.](?:html|js|css|json|webmanifest|svg)$/i.test(file)),forbidden=["assets/clubs/","patreon.com","FM26","Football Manager","injury_proneness","FA Cup","Copa del Rey","Coppa Italia","DFB-Pokal","Emperor's Cup","Emperor’s Cup"];
forbidden.push("api.web3forms.com","cfSubmitBtn","cfMail","openContactForm()","openBugReport()","2eb11e4e-335a-401e-b2e7-104c07ecd4a6");
forbidden.push("static.cloudflareinsights.com","cloudflareinsights.com");
for(const file of textFiles){const text=fs.readFileSync(file,"utf8");for(const needle of forbidden)if(text.includes(needle))fail(`${path.relative(OUT,file)} contains ${needle}`);}
const generatedGame=path.join(OUT,"src/game/generate.js");
if(fs.existsSync(generatedGame)){const source=fs.readFileSync(generatedGame,"utf8");for(const needle of ['o.trait="cam"','cam:"Cam Adam"','cam:"Glass"'])if(source.includes(needle))fail(`individual medical tendency leaked into ${path.relative(OUT,generatedGame)}`);}
const nativeFiles=["android/app/build.gradle","android/capacitor.settings.gradle","android/app/capacitor.build.gradle"].map(file=>path.join(ROOT,file)).filter(fs.existsSync);
for(const file of nativeFiles){const source=fs.readFileSync(file,"utf8");if(source.toLowerCase().includes("com.android.billingclient"))fail(`billing SDK found in ${path.relative(ROOT,file)}`);}
const appGradle=fs.readFileSync(path.join(ROOT,"android/app/build.gradle"),"utf8"),androidManifest=fs.readFileSync(path.join(ROOT,"android/app/src/main/AndroidManifest.xml"),"utf8"),adsPluginPath=path.join(ROOT,"android/app/src/main/java/life/copa/app/CopaAdsPlugin.java");
for(const marker of ["ads-mobile-sdk:1.2.1","user-messaging-platform:4.0.0","COPA_ADMOB_APP_ID","COPA_ADMOB_INTERSTITIAL_ID","COPA_ADMOB_REWARDED_ID"])if(!appGradle.includes(marker))fail(`Android ad configuration is missing ${marker}`);
for(const marker of ["com.google.android.gms.ads.APPLICATION_ID","${admobAppId}","com.google.android.gms.permission.AD_ID"])if(!androidManifest.includes(marker))fail(`Android manifest is missing ${marker}`);
if(!fs.existsSync(adsPluginPath))fail("native CopaAds plugin is missing");else{const adsPlugin=fs.readFileSync(adsPluginPath,"utf8");for(const marker of ["requestConsentInfoUpdate","loadAndShowConsentFormIfRequired","canRequestAds()","showRunEnd","showRewardedReroll","showRewardedInjury","showRewardedMarket","RewardedAd","OnUserEarnedRewardListener","MAX_REWARDED_REROLLS_PER_RUN","MAX_REWARDED_INJURY_HEALS_PER_RUN","MAX_REWARDED_MARKET_REROLLS_PER_RUN","showPrivacyOptions","COPA_ADMOB_TEST_MODE","AgeRestrictedTreatment.TEEN","MAX_AD_CONTENT_RATING_T","RUN_END_AD_COOLDOWN_MS","duplicate_run","cooldown"])if(!adsPlugin.includes(marker))fail(`native CopaAds plugin is missing ${marker}`);}
const index=fs.existsSync(path.join(OUT,"index.html"))?fs.readFileSync(path.join(OUT,"index.html"),"utf8"):"";
for(const marker of ['meta name="copa-platform" content="android"',"src/data/generic_club_visuals.js","src/runtime/nativeApp.js","src/runtime/productAnalytics.js","copa-analytics-api","privacy.html","terms.html"]){if(!index.includes(marker))fail(`Android index missing ${marker}`);}
for(const marker of ["src/runtime/nativeAds.js","CopaNativeAds.showRunEnd(window._completedGhostRunKey)"])if(!index.includes(marker))fail(`Android run-end ad hook is missing ${marker}`);
for(const flag of ["TR.svg","IT.svg","ENGLAND.svg","ES.svg","DE.svg","JP.svg"])if(!index.includes(`assets/flags/${flag}`))fail(`Android index does not render first-party flag ${flag}`);
const androidI18n=path.join(OUT,"src/data/i18n.js"),androidProfiles=path.join(OUT,"src/ui/playerProfiles.js");
if(!fs.existsSync(androidI18n)||!/assets\/flags\/['"]?\+item\.flag/.test(fs.readFileSync(androidI18n,"utf8")))fail("Android language controls do not render first-party flags");
if(!fs.existsSync(androidProfiles))fail("Android player profiles are missing");
else{
  const profileSource=fs.readFileSync(androidProfiles,"utf8");
  if(!/function nationalTeamInfo\([^)]*\)\{[^}]*flag:""/s.test(profileSource)||!profileSource.includes("countryFlag:nationalTeam.flag")||!profileSource.includes("COPA_IS_NATIVE"))fail("Android player profiles do not suppress native-store artwork");
}
const nativeRuntime=path.join(OUT,"src/runtime/nativeApp.js"),nativeAdsRuntime=path.join(OUT,"src/runtime/nativeAds.js");
if(fs.existsSync(nativeRuntime)){const source=fs.readFileSync(nativeRuntime,"utf8");if(!source.includes("capacitor.Plugins"))fail("native runtime does not support Capacitor 8 plugin globals");}
if(!fs.existsSync(nativeAdsRuntime))fail("Android native ad runtime is missing");else{const source=fs.readFileSync(nativeAdsRuntime,"utf8");for(const marker of ["CopaAds","showRunEnd","showRewardedReroll","showRewardedInjury","showRewardedMarket","showPrivacyOptions","privacyOptionsChanged","scheduleInitialize","setTimeout(initialize,8000)"])if(!source.includes(marker))fail(`Android native ad runtime is missing ${marker}`);}
if(!index.includes("Capacitor.Plugins.Browser")||!index.includes("openNativeSupport")||!index.includes('const supportUrl="https://copa.life/support.html"')||!index.includes("plugin.open({url:supportUrl"))fail("Android support link is not routed through the dedicated support page");
if(index.includes('plugin.open({url:"https://copa.life/"'))fail("Android support link still routes to the public home page");
const platformManifestPath=path.join(OUT,"platform-build.json"),versionPath=path.join(ROOT,"release/android-version.json");
if(!fs.existsSync(platformManifestPath))fail("Android platform build manifest missing");
else if(!fs.existsSync(versionPath))fail("Android release version file missing");
else{const manifest=JSON.parse(fs.readFileSync(platformManifestPath,"utf8")),version=JSON.parse(fs.readFileSync(versionPath,"utf8"));if(manifest.platform!=="android")fail("wrong platform build manifest");if(!/^[a-f0-9]{64}$/.test(manifest.source_fingerprint||""))fail("invalid shared source fingerprint");if(manifest.version_code!==version.versionCode||manifest.version_name!==version.versionName)fail("Android package version drift");}
if(fs.existsSync(platformManifestPath)){const manifest=JSON.parse(fs.readFileSync(platformManifestPath,"utf8"));if(!index.includes(`src/runtime/nativeApp.js?v=${manifest.build_version}`))fail("native runtime cache key does not match the Android build");if(!index.includes(`v${manifest.version_name} (${manifest.version_code})`))fail("visible Android version label is missing");if(/\?v=202\d/.test(index))fail("stale manually-versioned Android asset URL remains");}
const profilePath=path.join(OUT,"assets/data/copa/player_profiles.json");
if(!fs.existsSync(profilePath))fail("copa player profile data missing");else{const data=JSON.parse(fs.readFileSync(profilePath,"utf8")),expected=["copa_impact","copa_build_up","copa_space_control","copa_duels","copa_engine","copa_pressure_decision"];if(data.model_version!=="copa-model-v1")fail("wrong copa model version");if(expected.some(field=>!data.fields.includes(field)))fail("six copa dimensions are incomplete");if(data.fields.some(field=>field==="injury_proneness"||field==="aggression"||field==="composure"))fail("raw or medical attributes leaked into Android data");for(const [key,row] of Object.entries(data.records||{})){for(let index=0;index<6;index++)if(!Number.isInteger(row[index])||row[index]<0||row[index]>100){fail(`invalid copa score at ${key}`);break;}if(failures.length>30)break;}}
if(failures.length){for(const failure of failures)console.error(`[android] ${failure}`);process.exit(1);}console.log(`[android] clean package: ${walk(OUT).length} files; first-party SVG flags only; no real crests, embedded contact collector, raw 1–20 profile data, medical tendency, or official cup names`);
