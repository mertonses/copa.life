import fs from "node:fs";

const layout = fs.readFileSync("src/styles/layout.css", "utf8");
const match = fs.readFileSync("src/styles/match.css", "utf8");
const cards = fs.readFileSync("src/styles/cards.css", "utf8");
const mobile = fs.readFileSync("src/styles/mobileExperience.css", "utf8");
const mobileScript = fs.readFileSync("src/ui/mobileExperience.js", "utf8");
const chairPicker = fs.readFileSync("src/ui/chairPicker.js", "utf8");
const chairPickerCss = fs.readFileSync("src/styles/chairPicker.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");

const checks = [
  {
    name: "global overflow guard",
    pass: /html,\s*\nbody\{[\s\S]*?overflow-x:hidden/s.test(layout),
  },
  {
    name: "retired beta badge is absent from the brand chrome",
    pass: !/logo-beta/.test(layout)&&!/logo-beta/.test(html),
  },
  {
    name: "mobile run chrome omits duplicate slogan and round label",
    pass: /@media\(max-width:760px\)\{[\s\S]*?body\.run-active #logoSlogan,\s*body\.run-active #hub>\.roundtag\{display:none!important\}/s.test(layout)
      && /function beginDraft\(\)\{[\s\S]*?document\.body\.classList\.add\("run-active"\)/s.test(html)
      && /function restart\(\)\{[\s\S]*?document\.body\.classList\.remove\("run-active"\)/s.test(html)
      && /function _tryRestoreState\(\)\{[\s\S]*?document\.body\.classList\.add\("run-active"\)[\s\S]*?catch\(e\)\{\s*document\.body\.classList\.remove\("run-active"\)/s.test(html),
  },
  {
    name: "mobile viewport-bound screens",
    pass: /@media\(max-width:900px\)\{[\s\S]*#app,[\s\S]*#result\{[\s\S]*max-width:100%!important;[\s\S]*overflow-x:hidden!important/s.test(layout),
  },
  {
    name: "chairman profile badge belongs to the centred persona panel",
    pass: /<div class="chairpopup-desc">\$\{model\.desc\}<\/div><\/div><strong class="cp-role-badge">/.test(chairPicker)
      && !/cp-mechanics-head[\s\S]*?cp-role-badge/.test(chairPicker)
      && /\.chair-picker-modal \.cp-role-badge\{[^}]*align-self:center;[^}]*justify-content:center;[^}]*margin:12px auto 0;/s.test(chairPickerCss)
      && /@media\(max-width:720px\)\{[\s\S]*?\.chair-picker-modal \.cp-role-badge\{grid-column:1\/-1;justify-self:center;/s.test(chairPickerCss),
  },
  {
    name: "chairman profile counter sits directly beside the fitted close control",
    pass: /<div class="cp-top-controls"><span class="cp-counter">[\s\S]*?<button class="cp-close"/.test(chairPicker)
      && !/cp-mechanics-head[\s\S]*?cp-counter/.test(chairPicker)
      && /\.chair-picker-modal \.cp-top-controls\{[^}]*top:10px;[^}]*right:14px;[^}]*display:flex;[^}]*align-items:center;[^}]*gap:8px;[^}]*height:36px\}/s.test(chairPickerCss)
      && /\.chair-picker-modal \.cp-close\{[^}]*position:static;[^}]*width:36px;[^}]*height:36px;/s.test(chairPickerCss),
  },
  {
    name: "mobile metrics fit in one four-column row",
    pass: /#hub \.hub-stat-row\{[\s\S]*display:grid!important;[\s\S]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important;[\s\S]*overflow:visible!important/s.test(mobile),
  },
  {
    name: "mobile hub actions use the safe-area dock",
    pass: /\.mobile-action-dock\[data-dock-kind="hub"\] \.actionbtns\{[\s\S]*grid-template-columns:\.8fr \.8fr 1\.2fr!important/s.test(mobile),
  },
  {
    name: "mobile hub play button remains the rightmost action",
    pass: /\.mobile-action-dock\[data-dock-kind="hub"\] \.actionbar #playBtn\{order:3!important\}/.test(mobile),
  },
  {
    name: "mobile team talk aligns icon above its fitted label",
    pass: /\.mobile-action-dock\[data-dock-kind="hub"\] \.actionbar #talkBtn\{[\s\S]*flex-direction:column!important;[\s\S]*gap:2px!important/s.test(mobile)
      && /#talkBtn span\{[\s\S]*font-size:8\.5px!important;[\s\S]*text-align:center!important/s.test(mobile),
  },
  {
    name: "mobile result secondary actions stay in one three-column row",
    pass: /#result \.result-row\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/s.test(mobile),
  },
  {
    name: "result summary stays compact on narrow screens",
    pass: /\.result \.scoreboard\{[\s\S]*?min-height:94px;[\s\S]*?padding:14px 22px 13px;/s.test(match)
      && /\.result \.scoreboard-title\{[\s\S]*?display:flex;[\s\S]*?align-items:baseline;/s.test(match)
      && /@media\(max-width:760px\)\{[\s\S]*?\.result \.statline\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}[\s\S]*?\.result \.scoreboard\{min-height:82px;/s.test(match)
      && /function resultHeroLabel\(r,wasSacked,x\)\{\s*if\(wasSacked\)return "";\s*if\(r\.won\)return typeof teamName/s.test(html),
  },
  {
    name: "mobile action dock accounts for the bottom safe area",
    pass: /\.mobile-action-dock\{[\s\S]*padding:[^;]*var\(--copa-safe-bottom\)/s.test(mobile),
  },
  {
    name: "mobile player sheet uses the dynamic viewport",
    pass: /\.player-profile-layer\.is-sheet \.player-profile-card\{[\s\S]*height:calc\(100dvh - var\(--copa-safe-top\)\)!important/s.test(mobile),
  },
  {
    name: "mobile final simulation has three presentation segments",
    pass: /\.mobile-sim-tabs\{[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s.test(mobile)&&/data-sim-view="field"/.test(mobileScript),
  },
  {
    name: "mobile enhancements remain explicit preferences",
    pass: /mobileHapticBtn/.test(mobileScript)&&/mobileBatteryBtn/.test(mobileScript)&&/mobileSmartSpeedBtn/.test(mobileScript)&&/mobileConfirmPickBtn/.test(mobileScript),
  },
  {
    name: "mobile draft surfaces cash and squad impact before confirmation",
    pass: /mobile-candidate-impact/.test(mobile)&&/cashAfter/.test(mobileScript)&&/squadAverage/.test(mobileScript),
  },
  {
    name: "mobile final events expose an unread badge",
    pass: /mobile-tab-badge/.test(mobile)&&/updateEventBadge/.test(mobileScript),
  },
  {
    name: "mobile result detail remains progressively disclosed",
    pass: /#result \.mobile-result-disclosure\{[\s\S]*display:block/s.test(mobile)
      && /wrapResultDisclosure/.test(mobileScript)
      && /function ensureResultDisclosures\(\)\{\s*if\(!isPhoneInteraction\(\)\)/.test(mobileScript),
  },
  {
    name: "mobile landing keeps live formation-linked tactics and a two-by-two summary grid",
    pass: !/button\.id="mobileMechanicsToggle"/.test(mobileScript)
      && /\.tactical-board\{display:grid!important\}/.test(mobile)
      && /function _updateTacticalFormation\(name\)/.test(html)
      && /function _tickTacticalBoard\(\)/.test(html)
      && /function pickForm\(f\)\{[\s\S]*?_updateTacticalFormation\(f\)/.test(html)
      && /#introLand \.mechanics\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important;[\s\S]*grid-auto-rows:minmax\(54px,auto\)/s.test(mobile),
  },
  {
    name: "mobile connection loss has a non-blocking state",
    pass: /\.mobile-network-banner\{[\s\S]*position:fixed/s.test(mobile)&&/addEventListener\("offline"/.test(mobileScript),
  },
  {
    name: "mobile free transfer cards stay two-up",
    pass: /@media\(max-width:620px\)\{[\s\S]*#hub #freeAgentRow \.shopcards\{[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/s.test(layout),
  },
  {
    name: "narrow card cost badges wrap without clipping",
    pass: /\.ct-cost-list li\{[^}]*max-width:100%[^}]*white-space:normal[^}]*overflow-wrap:break-word[^}]*word-break:normal/s.test(cards),
  },
  {
    name: "mobile hub core blocks bound to viewport",
    pass: /#hub \.pitch-area,\s*\n\s*#hub #hubPitch,\s*\n\s*#hub #hubBenchSection,[\s\S]*#fixbar\.cuproad/s.test(layout)
      && /#hub \.hub-bench-stack\{[\s\S]*max-width:100%!important;[\s\S]*margin:0!important/s.test(layout),
  },
  {
    name: "injury notice stays compact directly above the bench",
    pass: /<div class="hub-bench-stack" id="hubBenchStack">\s*<div class="injbar hidden" id="injbar"[\s\S]*<div id="hubBenchSection"><\/div>/s.test(html)
      && /#hub \.hub-bench-stack \.injbar\{[\s\S]*grid-template-columns:18px minmax\(0,1fr\) auto;[\s\S]*min-height:44px;[\s\S]*box-shadow:none!important/s.test(layout),
  },
  {
    name: "mobile card market reroll stays visually minimal",
    pass: /#hub #shopLbl button\[onclick\*="shopReroll"\]\{[\s\S]*width:24px!important;[\s\S]*min-height:24px!important/s.test(mobile)
      && /button\[onclick\*="shopReroll"\]::after\{[\s\S]*inset:-10px/s.test(mobile),
  },
  {
    name: "mobile footer keeps links on one row and note separate",
    pass: /\.global-footer-bar \.footer-links-row\{[\s\S]*flex-wrap:nowrap;[\s\S]*overflow-x:auto/s.test(mobile)
      && /\.global-footer-bar \.rights-note\{[\s\S]*width:100%;[\s\S]*white-space:normal!important/s.test(mobile)
      && /\.global-footer-bar \.footer-link\{[\s\S]*min-height:44px!important;[\s\S]*font-size:7px!important/s.test(mobile),
  },
  {
    name: "draft desktop columns stay equal and centered",
    pass: /@media\(min-width:901px\)\{[\s\S]*#draft \.draft-cols\{[\s\S]*grid-template-columns:minmax\(0,420px\) minmax\(0,420px\)!important/s.test(layout),
  },
  {
    name: "draft field never collapses",
    pass: /#draft \.draft-right \.pitch\{[\s\S]*aspect-ratio:68\/92!important/s.test(layout),
  },
  {
    name: "draft mobile pitch has usable width",
    pass: /@media\(max-width:900px\)\{[\s\S]*#draft \.draft-right \.pitch\{[\s\S]*width:100%!important/s.test(layout),
  },
  {
    name: "final sim stage collapses before phone width",
    pass: /@media\(max-width:760px\)\{\.simstage\{grid-template-columns:1fr\}/.test(match),
  },
  {
    name: "final sim default speed uses visible 1x value",
    pass: /setSpeed\(10\)/.test(html),
  },
  {
    name: "opponent scout report stays viewport bound on mobile",
    pass: /@media\(max-width:620px\)\{[\s\S]*?\.scout-lineup-modal\.scout-report-modal\{[\s\S]*?width:calc\(100vw - 14px\)[\s\S]*?max-height:calc\(100svh - 14px\)/.test(match),
  },
  {
    name: "opponent scout report collapses insights to one column",
    pass: /@media\(max-width:620px\)\{[\s\S]*?\.scout-report-grid\{grid-template-columns:1fr\}/.test(match),
  },
];

const matrix = [390, 412, 768, 820, 1024];
let failed = false;
for (const check of checks) {
  if (!check.pass) {
    failed = true;
    console.error(`responsive check failed: ${check.name}`);
  }
}

console.log(`responsive matrix widths: ${matrix.join(", ")}px`);
if (failed) process.exit(1);
