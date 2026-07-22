import fs from "node:fs";

const root=new URL("../",import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),"utf8");
const manifest=read("android/app/src/main/AndroidManifest.xml");
const html=read("index.html");
const mobile=read("src/styles/mobileExperience.css");
const fail=message=>{console.error(`[play-games-pc] ${message}`);process.exitCode=1;};
const requireText=(source,pattern,message)=>{if(!pattern.test(source))fail(message);};

requireText(manifest,/android\.hardware\.touchscreen"\s+android:required="false"/,"touchscreen must be optional for PC distribution");
requireText(manifest,/android:resizeableActivity="true"/,"MainActivity must support resizable PC windows");
requireText(manifest,/android:configChanges="[^"]*(screenSize|smallestScreenSize)[^"]*"/,"dynamic window size changes are not handled");
requireText(html,/addEventListener\("keydown"|document\.onkeydown|onkeydown/,"no keyboard input path was found");
requireText(mobile,/@media\s*\(min-width:|@media\s*\(max-width:/,"responsive UI rules are missing");
for(const permission of [...manifest.matchAll(/<uses-permission\s+android:name="([^"]+)"/g)].map(match=>match[1])){
  if(!["android.permission.INTERNET","com.google.android.gms.permission.AD_ID"].includes(permission))fail(`review unsupported PC permission: ${permission}`);
}

if(!process.exitCode)console.log("Google Play Games on PC baseline OK: optional touch, resizable window, dynamic display handling, keyboard path, no blocking permissions.");
