# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **31 Temmuz 2026**
Bu dosya `tools/write-android-release-manifest.mjs` tarafından AAB manifestiyle birlikte otomatik üretilir.

## Play'e gönderilen kapalı test sürümü

- Paket: `life.copa.app`
- Sürüm: `1.4.1` (`versionCode` 25)
- Kaynak commit: `22fb5369fa090072eb99711c9df67d8b4673830c`
- CI çalışması: `https://github.com/mertonses/copa.life/actions/runs/30580952290`
- Artifact: `signed-android-1.4.1-25/app-release.aab`
- Artifact kimliği: `8775052779` (29 Ağustos 2026'ya kadar saklanır)
- Boyut: `17525136` bayt
- SHA-256: `01CAE01E6833F4A3054E6B363DFC0E7E380DE80A045C4BB4970A30F6502FB4F2`
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
| Tam imzalı `1.4.1` emülatör kaydı | kaydedilmedi |
| Fiziksel cihaz testi | kapalı testte kanıt toplanacak |

## Tamamlanan dış kapılar

- [x] Production AdMob kimlikleri CI secret'larında mevcut.
- [x] `https://copa.life/app-ads.txt` canlı ve doğrulandı.
- [x] Kapalı test AAB'si Play Console'a gönderildi.
- [x] Play API hizmet hesabı doğrulandı ve otomatik yükleme tamamlandı.
- [x] AdMob Avrupa tüzükleri rıza mesajı 5 dilde yayımlanmış durumda.
- [x] AdMob uygulaması `life.copa.app` Google Play kaydına bağlandı ve doğrulandı.

## Kalan dış kapılar

- [ ] AdMob uygulama incelemesinin tamamlanmasını ve reklam sunum limitinin kaldırılmasını bekle.
- [ ] En az 12 katılımcıya ulaş ve 14 günlük kapalı test şartını tamamla.
- [ ] Kapalı test sırasında fiziksel cihaz smoke kaydı topla.

## Terfi kuralı

Kapalı testteki sürüm için yalnız bu rapordaki SHA-256 değeri referans alınır. Kaynak veya mobil paket değişirse `versionCode` artırılır; `25` yeniden kullanılmaz.
