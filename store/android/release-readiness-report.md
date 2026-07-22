# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **22 Temmuz 2026**
Bu dosya `tools/write-android-release-manifest.mjs` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Güncel aday

- Paket: `life.copa.app`
- Sürüm: `1.0.3` (`versionCode` 4)
- Kaynak commit: `30ea47110400f8b94a01978afbe4ff1a1cd31bc6`
- Build sürümü: `30ea47110400`
- AAB: `android/app/build/outputs/bundle/release/app-release-signed.aab`
- Boyut: `15611112` bayt
- SHA-256: `2D0ED0DF941BEAA5D9F6BF1F17361DB916BFA360F3BFA714DA96F6F40B13DDD9`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`
- AdMob modu: `production`
- Play yüklemeye uygun: **EVET**

## Doğrulama

| Kontrol | Durum |
| --- | --- |
| `main_test_suite` | passed |
| `critical_browser_tests` | passed |
| `ghost_worker_tests` | passed |
| `web_android_parity` | passed |
| `android_package_scan` | passed |
| `signed_aab_signature` | passed |
| `exact_release_emulator_smoke` | passed |
| `physical_device_smoke` | required before track promotion |

## Dış hesaplara ve cihazlara bağlı kapılar

- [ ] published AdMob UMP privacy message
- [ ] production AdMob rewarded reroll ID
- [ ] deployed and verified copa.life app-ads.txt
- [ ] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON repository secret
- [ ] exact-release emulator smoke
- [ ] physical-device smoke before track promotion

## Terfi kuralı

Kapalı teste veya production'a yalnız bu rapordaki AAB SHA-256 değeri ile manifestteki değer birebir aynıysa geçilir. Kaynak ya da mobil düzeltme değişirse aynı `versionCode` yeniden kullanılmaz; sürüm artırılır, temiz committen yeni AAB üretilir ve bu iki dosya yeniden yazılır.
