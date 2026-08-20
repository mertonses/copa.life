# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **20 Ağustos 2026**
Bu dosya `tools/write-android-release-manifest.mjs` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Güncel aday

- Paket: `life.copa.app`
- Sürüm: `1.6.11` (`versionCode` 44)
- Kaynak commit: `dirty/uncommitted`
- Build sürümü: `6f3f35f8a725`
- AAB: `android/app/build/outputs/bundle/release/app-release-signed.aab`
- Boyut: `32223897` bayt
- SHA-256: `788FEF62419925070B363C4582FFA0226BEF9DC8A05569A59D8F23EDA73CF27D`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`
- AdMob modu: `production`
- Play yüklemeye uygun: **HAYIR**

## Doğrulama

| Kontrol | Durum |
| --- | --- |
| `main_test_suite` | passed |
| `critical_browser_tests` | passed |
| `ghost_worker_tests` | passed |
| `web_android_parity` | passed |
| `android_package_scan` | passed |
| `signed_aab_signature` | passed |
| `exact_release_emulator_smoke` | required after candidate build |
| `physical_device_smoke` | required before track promotion |

## Dış hesaplara ve cihazlara bağlı kapılar

- [ ] obtain AdMob app approval after Google Play store linking
- [ ] reach at least 12 opted-in closed testers and keep the requirement satisfied for 14 days
- [ ] record physical-device smoke evidence during closed testing

## Terfi kuralı

Kapalı teste veya production'a yalnız bu rapordaki AAB SHA-256 değeri ile manifestteki değer birebir aynıysa geçilir. Kaynak ya da mobil düzeltme değişirse aynı `versionCode` yeniden kullanılmaz; sürüm artırılır, temiz committen yeni AAB üretilir ve bu iki dosya yeniden yazılır.
