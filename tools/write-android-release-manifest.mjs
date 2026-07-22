import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = process.argv.find((argument) => argument.endsWith(".aab")) ||
  "android/app/build/outputs/bundle/release/app-release-signed.aab";
const verified = process.argv.includes("--verified");
const emulatorSmokePassed = process.argv.includes("--emulator-smoke-passed");
const aabPath = path.resolve(ROOT, input);
const manifestPath = path.join(ROOT, "store", "android", "release-manifest.json");
const reportPath = path.join(ROOT, "store", "android", "release-readiness-report.md");

if (!fs.existsSync(aabPath)) throw new Error(`AAB not found: ${aabPath}`);

const version = JSON.parse(
  fs.readFileSync(path.join(ROOT, "release", "android-version.json"), "utf8"),
);
const platformBuild = JSON.parse(
  fs.readFileSync(path.join(ROOT, "dist-android", "platform-build.json"), "utf8"),
);
const previous = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};
const bytes = fs.readFileSync(aabPath);
const certificate = fs
  .readFileSync(path.join(ROOT, "release", "android-upload-certificate.sha256"), "utf8")
  .trim();
const admobTestAppId = "ca-app-pub-3940256099942544~3347511713";
const admobTestInterstitialId = "ca-app-pub-3940256099942544/1033173712";
const admobTestRewardedId = "ca-app-pub-3940256099942544/5224354917";
const admobAppId = String(process.env.COPA_ADMOB_APP_ID || admobTestAppId).trim();
const admobInterstitialId = String(
  process.env.COPA_ADMOB_INTERSTITIAL_ID || admobTestInterstitialId,
).trim();
const admobRewardedId = String(
  process.env.COPA_ADMOB_REWARDED_ID || admobTestRewardedId,
).trim();
const productionAdmobIdsPresent =
  /^ca-app-pub-\d{16}~\d{10}$/.test(admobAppId) &&
  /^ca-app-pub-\d{16}\/\d{10}$/.test(admobInterstitialId) &&
  /^ca-app-pub-\d{16}\/\d{10}$/.test(admobRewardedId) &&
  admobAppId !== admobTestAppId &&
  admobInterstitialId !== admobTestInterstitialId &&
  admobRewardedId !== admobTestRewardedId;

const manifest = {
  package_id: "life.copa.app",
  version_code: version.versionCode,
  version_name: version.versionName,
  release_status: productionAdmobIdsPresent ? "candidate" : "local_candidate",
  store_upload_eligible: productionAdmobIdsPresent && emulatorSmokePassed,
  source: {
    build_version: platformBuild.build_version,
    build_fingerprint: platformBuild.build_fingerprint,
    fingerprint: platformBuild.source_fingerprint,
    commit: platformBuild.source_commit,
  },
  min_sdk: previous.min_sdk || 24,
  target_sdk: previous.target_sdk || 36,
  compile_sdk: previous.compile_sdk || 36,
  signed_aab: {
    file: path.relative(ROOT, aabPath).replace(/\\/g, "/"),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
  },
  upload_certificate_sha256: certificate,
  admob: {
    mode: productionAdmobIdsPresent ? "production" : "test",
    production_ids_present: productionAdmobIdsPresent,
  },
  permissions: [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "com.google.android.gms.permission.AD_ID",
    "android.permission.ACCESS_ADSERVICES_TOPICS",
    "android.permission.ACCESS_ADSERVICES_AD_ID",
    "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
  ],
  verification: verified
    ? {
        main_test_suite: "passed",
        critical_browser_tests: "passed",
        ghost_worker_tests: "passed",
        web_android_parity: "passed",
        android_package_scan: "passed",
        signed_aab_signature: "passed",
        exact_release_emulator_smoke: emulatorSmokePassed
          ? "passed"
          : "required after candidate build",
        physical_device_smoke: "required before track promotion",
      }
    : {
        automated_release_checks: "not asserted by manifest writer",
        physical_device_smoke: "required before track promotion",
      },
  external_prerequisites: previous.external_prerequisites || [],
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const generatedDate = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "long",
  timeZone: "Europe/Istanbul",
}).format(new Date());
const verificationRows = Object.entries(manifest.verification)
  .map(([key, value]) => `| \`${key}\` | ${value} |`)
  .join("\n");
const prerequisites = manifest.external_prerequisites.length
  ? manifest.external_prerequisites.map((item) => `- [ ] ${item}`).join("\n")
  : "- [x] Manifestte kayıtlı dış önkoşul yok.";
const report = `# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **${generatedDate}**
Bu dosya \`tools/write-android-release-manifest.mjs\` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Güncel aday

- Paket: \`${manifest.package_id}\`
- Sürüm: \`${manifest.version_name}\` (\`versionCode\` ${manifest.version_code})
- Kaynak commit: \`${manifest.source.commit || "dirty/uncommitted"}\`
- Build sürümü: \`${manifest.source.build_version}\`
- AAB: \`${manifest.signed_aab.file}\`
- Boyut: \`${manifest.signed_aab.bytes}\` bayt
- SHA-256: \`${manifest.signed_aab.sha256}\`
- Upload certificate: \`${manifest.upload_certificate_sha256}\`
- AdMob modu: \`${manifest.admob.mode}\`
- Play yüklemeye uygun: **${manifest.store_upload_eligible ? "EVET" : "HAYIR"}**

## Doğrulama

| Kontrol | Durum |
| --- | --- |
${verificationRows}

## Dış hesaplara ve cihazlara bağlı kapılar

${prerequisites}

## Terfi kuralı

Kapalı teste veya production'a yalnız bu rapordaki AAB SHA-256 değeri ile manifestteki değer birebir aynıysa geçilir. Kaynak ya da mobil düzeltme değişirse aynı \`versionCode\` yeniden kullanılmaz; sürüm artırılır, temiz committen yeni AAB üretilir ve bu iki dosya yeniden yazılır.
`;
fs.writeFileSync(reportPath, report);
console.log(
  `Release manifest and readiness report updated: v${version.versionName}+${version.versionCode}, ${manifest.signed_aab.sha256}`,
);
