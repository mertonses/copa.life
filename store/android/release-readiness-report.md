# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **22 Temmuz 2026**
Bu dosya `tools/write-android-release-manifest.mjs` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Güncel aday

- Paket: `life.copa.app`
- Sürüm: `1.0.2` (`versionCode` 3)
- Kaynak commit: `3d4fe19572ca13720d0320a2db83b77595e467df`
- Build sürümü: `3d4fe19572ca`
- AAB: `android/app/build/outputs/bundle/release/app-release-signed.aab`
- Boyut: `15606987` bayt
- SHA-256: `A024A2DB801E42B05D997287FC5A5F0B61428E66F6F6BB5C1B15A529B1E856C7`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`
- AdMob modu: `test`
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

- [ ] published AdMob UMP privacy message
- [ ] production AdMob rewarded reroll ID
- [ ] deployed and verified copa.life app-ads.txt
- [ ] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON repository secret
- [ ] exact-release emulator smoke
- [ ] physical-device smoke before track promotion

## Terfi kuralı

Kapalı teste veya production'a yalnız bu rapordaki AAB SHA-256 değeri ile manifestteki değer birebir aynıysa geçilir. Kaynak ya da mobil düzeltme değişirse aynı `versionCode` yeniden kullanılmaz; sürüm artırılır, temiz committen yeni AAB üretilir ve bu iki dosya yeniden yazılır.
