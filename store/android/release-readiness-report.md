# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **22 Temmuz 2026**
Bu dosya `tools/write-android-release-manifest.mjs` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Play'e gönderilen kapalı test sürümü

- Paket: `life.copa.app`
- Sürüm: `1.1.0` (`versionCode` 5)
- Kaynak commit: `c1bff89877d204e191dac2616c1c83f556ef2c2b`
- CI çalışması: `https://github.com/mertonses/copa.life/actions/runs/29941262601`
- Artifact: `signed-android-1.1.0-5/app-release.aab`
- Boyut: `15569512` bayt
- SHA-256: `A1BA2D8B8F5DDFAF0AFA486D50D774F5F3F67222C32AEFCE82FDE3E7CDA2B989`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`
- AdMob modu: `production`
- Play durumu: kapalı teste gönderildi / incelemede

## Doğrulama

| Kontrol | Durum |
| --- | --- |
| Ana test paketi | geçti |
| Kritik tarayıcı testleri | geçti |
| Ghost API testleri | geçti |
| Web / Android paritesi | geçti |
| Android paket taraması | geçti |
| İmzalı AAB doğrulaması | geçti |
| PR adayı emülatör testi | geçti |
| Tam imzalı `1.1.0` emülatör kaydı | kaydedilmedi |
| Fiziksel cihaz testi | kapalı testte kanıt toplanacak |

## Tamamlanan dış kapılar

- [x] Production AdMob kimlikleri CI secret'larında mevcut.
- [x] `https://copa.life/app-ads.txt` canlı ve doğrulandı.
- [x] Kapalı test AAB'si Play Console'a gönderildi.
- [x] AdMob Avrupa tüzükleri rıza mesajı 5 dilde yayımlanmış durumda.
- [x] AdMob uygulaması `life.copa.app` Google Play kaydına bağlandı ve doğrulandı.

## Kalan dış kapılar

- [ ] AdMob uygulama incelemesinin tamamlanmasını ve reklam sunum limitinin kaldırılmasını bekle.
- [ ] En az 12 katılımcıya ulaş ve 14 günlük kapalı test şartını tamamla.
- [ ] Kapalı test sırasında fiziksel cihaz smoke kaydı topla.
- [ ] Otomatik internal-track yüklemesi için `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret'ını ekle.

## Terfi kuralı

Kapalı testteki sürüm için yalnız bu rapordaki SHA-256 değeri referans alınır. Kaynak veya mobil paket değişirse `versionCode` artırılır; `5` yeniden kullanılmaz.
