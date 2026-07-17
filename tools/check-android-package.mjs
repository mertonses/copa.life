import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."),OUT=path.join(ROOT,"dist-android");
const failures=[];
function fail(message){failures.push(message);}
function walk(directory,files=[]){if(!fs.existsSync(directory))return files;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())walk(file,files);else files.push(file);}return files;}
if(!fs.existsSync(OUT))fail("dist-android is missing; run build:android first");
for(const relative of ["assets/clubs","assets/flags","assets/icons/patreon.svg","src/data/logos.js","src/runtime/productAnalytics.js","src/state/diagnostics.js","sw.js"]){if(fs.existsSync(path.join(OUT,relative)))fail(`forbidden Android artifact: ${relative}`);}
const textFiles=walk(OUT).filter(file=>/[.](?:html|js|css|json|webmanifest|svg)$/i.test(file)),forbidden=["assets/clubs/","patreon.com","FM26","Football Manager","injury_proneness","FA Cup","Copa del Rey","Coppa Italia","DFB-Pokal","Emperor's Cup","Emperor’s Cup"];
forbidden.push("api.web3forms.com","cfSubmitBtn","cfMail","openContactForm()","openBugReport()","2eb11e4e-335a-401e-b2e7-104c07ecd4a6");
forbidden.push("static.cloudflareinsights.com","cloudflareinsights.com","copa-analytics-api","/v1/analytics/events");
for(const file of textFiles){const text=fs.readFileSync(file,"utf8");for(const needle of forbidden)if(text.includes(needle))fail(`${path.relative(OUT,file)} contains ${needle}`);}
const generatedGame=path.join(OUT,"src/game/generate.js");
if(fs.existsSync(generatedGame)){const source=fs.readFileSync(generatedGame,"utf8");for(const needle of ['o.trait="cam"','cam:"Cam Adam"','cam:"Glass"'])if(source.includes(needle))fail(`individual medical tendency leaked into ${path.relative(OUT,generatedGame)}`);}
const nativeFiles=["android/app/build.gradle","android/capacitor.settings.gradle","android/app/capacitor.build.gradle"].map(file=>path.join(ROOT,file)).filter(fs.existsSync);
for(const file of nativeFiles){const source=fs.readFileSync(file,"utf8");for(const needle of ["com.android.billingclient","play-services-ads","google-mobile-ads","admob"])if(source.toLowerCase().includes(needle.toLowerCase()))fail(`monetization SDK found in ${path.relative(ROOT,file)}: ${needle}`);}
const index=fs.existsSync(path.join(OUT,"index.html"))?fs.readFileSync(path.join(OUT,"index.html"),"utf8"):"";
for(const marker of ['meta name="copa-platform" content="android"',"src/data/generic_club_visuals.js","src/runtime/nativeApp.js","privacy.html","terms.html"]){if(!index.includes(marker))fail(`Android index missing ${marker}`);}
if(!index.includes('class="generic-country-code"'))fail("Android index is missing generic country-code visuals");
if(/<img\s+[^>]*src=["']assets\/flags\//i.test(index))fail("Android index still renders flag artwork");
const androidI18n=path.join(OUT,"src/data/i18n.js"),androidProfiles=path.join(OUT,"src/ui/playerProfiles.js");
if(!fs.existsSync(androidI18n)||!fs.readFileSync(androidI18n,"utf8").includes("COPA_IS_NATIVE"))fail("Android language controls do not switch to generic country codes");
if(!fs.existsSync(androidProfiles))fail("Android player profiles are missing");
else{
  const profileSource=fs.readFileSync(androidProfiles,"utf8");
  if(!/function nationalTeamInfo\([^)]*\)\{[^}]*flag:""/s.test(profileSource)||!profileSource.includes("countryFlag:nationalTeam.flag")||!profileSource.includes("COPA_IS_NATIVE"))fail("Android player profiles do not suppress native-store artwork");
}
const nativeRuntime=path.join(OUT,"src/runtime/nativeApp.js");
if(fs.existsSync(nativeRuntime)){const source=fs.readFileSync(nativeRuntime,"utf8");if(!source.includes("capacitor.Plugins"))fail("native runtime does not support Capacitor 8 plugin globals");}
if(!index.includes("Capacitor.Plugins.Browser")||!index.includes("openNativeSupport")||!index.includes('plugin.open({url:"https://copa.life/"'))fail("Android support link is not routed through the native Browser plugin");
const platformManifestPath=path.join(OUT,"platform-build.json"),versionPath=path.join(ROOT,"release/android-version.json");
if(!fs.existsSync(platformManifestPath))fail("Android platform build manifest missing");
else if(!fs.existsSync(versionPath))fail("Android release version file missing");
else{const manifest=JSON.parse(fs.readFileSync(platformManifestPath,"utf8")),version=JSON.parse(fs.readFileSync(versionPath,"utf8"));if(manifest.platform!=="android")fail("wrong platform build manifest");if(!/^[a-f0-9]{64}$/.test(manifest.source_fingerprint||""))fail("invalid shared source fingerprint");if(manifest.version_code!==version.versionCode||manifest.version_name!==version.versionName)fail("Android package version drift");}
if(fs.existsSync(platformManifestPath)){const manifest=JSON.parse(fs.readFileSync(platformManifestPath,"utf8"));if(!index.includes(`src/runtime/nativeApp.js?v=${manifest.build_version}`))fail("native runtime cache key does not match the Android build");if(!index.includes(`v${manifest.version_name} (${manifest.version_code})`))fail("visible Android version label is missing");if(/\?v=202\d/.test(index))fail("stale manually-versioned Android asset URL remains");}
const profilePath=path.join(OUT,"assets/data/copa/player_profiles.json");
if(!fs.existsSync(profilePath))fail("copa player profile data missing");else{const data=JSON.parse(fs.readFileSync(profilePath,"utf8")),expected=["copa_impact","copa_build_up","copa_space_control","copa_duels","copa_engine","copa_pressure_decision"];if(data.model_version!=="copa-model-v1")fail("wrong copa model version");if(expected.some(field=>!data.fields.includes(field)))fail("six copa dimensions are incomplete");if(data.fields.some(field=>field==="injury_proneness"||field==="aggression"||field==="composure"))fail("raw or medical attributes leaked into Android data");for(const [key,row] of Object.entries(data.records||{})){for(let index=0;index<6;index++)if(!Number.isInteger(row[index])||row[index]<0||row[index]>100){fail(`invalid copa score at ${key}`);break;}if(failures.length>30)break;}}
if(failures.length){for(const failure of failures)console.error(`[android] ${failure}`);process.exit(1);}console.log(`[android] clean package: ${walk(OUT).length} files; no real crests, flag artwork, embedded contact collector, raw 1–20 profile data, medical tendency, or official cup names`);
