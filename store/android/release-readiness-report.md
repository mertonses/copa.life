# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **22 Temmuz 2026**

## Hazır olanlar

- Paket: `life.copa.app`, sürüm `1.0.0` (`versionCode` 1), min SDK 24, target/compile SDK 36.
- Güncel kaynak commitinden imzalı yerel aday üretildi; AAB içeriği, sertifika, web/Android paritesi ve bağımlılık güvenliği doğrulandı.
- Mobil pakette gerçek arma, bayrak görseli veya resmi kupa adı bulunmuyor.
- Beş dil için listing metni, özellik grafiği, beş telefon ve beş tablet ekran görüntüsü hazır.
- Gizlilik, kullanım koşulları, kaldırma ve güvenlik sayfaları doğrulandı.
- Run sonu geçiş reklamı, UMP rıza akışı ve uygulama içi gizlilik ayarları kodlandı.
- GitHub Actions'a dört upload-key secret'ı eklendi: keystore, keystore parolası, alias ve key parolası.
- Ghost Club Worker üretime dağıtıldı; D1 şeması güncel ve canlı health kontrolü başarılı.

## Play Console'da doğrulanan durum

- Uygulama mevcut ve geliştirici hesabında erişilebilir.
- Kurulum görevlerinin **8/11** tanesi tamamlanmış.
- Eksik görevler: Data Safety, uygulama kategorisi/iletişim bilgileri ve varsayılan mağaza girişi.
- Varsayılan `en-US` listing'inde yalnız uygulama adı var; açıklamalar ve görseller henüz kaydedilmemiş.
- Production erişimi kilitli: kapalı testte şu an **0 test kullanıcısı** var; Console en az 12 kullanıcı ve 14 gün şartını gösteriyor.
- Yayınlanmamış Console değişikliği bulunmuyor.

## Güncel AAB

- Kaynak commit: `e0ff32c1ac57d7a2c8abea56e4c8e7bc7ad76d17`
- Dosya: `android/app/build/outputs/bundle/release/app-release-signed.aab`
- Boyut: `15,578,190` bayt
- SHA-256: `BAE9015D0BA601A6594EB788C39201A48510D79E9CC998C400BF746FDE5D10A3`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`

Bu AAB yerel adaydır ve Google'ın test AdMob kimlikleriyle üretildi. Production AdMob kimlikleri ve exact-release emulator smoke sonucu olmadan Play'e yüklenmemelidir. `release-manifest.json` bu durumu `store_upload_eligible: false` olarak kilitler.

## Dış hesaplara bağlı kalan kapılar

1. AdMob hesabı henüz kurulmamış; `apps.admob.com` kayıt akışına yönlendiriyor. Hesap şartları kullanıcı tarafından kabul edildikten sonra uygulama ve `run_end_interstitial` birimi oluşturulmalı.
2. Gerçek `COPA_ADMOB_APP_ID` ve `COPA_ADMOB_INTERSTITIAL_ID` hem release ortamına hem GitHub Secrets'a eklenmeli.
3. AdMob Avrupa gizlilik mesajı yayımlanmalı ve gerçek publisher ID ile `https://copa.life/app-ads.txt` hazırlanmalı.
4. Google Play servis hesabı oluşturulup `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret'ı eklenmeli.
5. Data Safety cevapları son SDK/izin listesiyle Console'da tamamlanıp kaydedilmeli.
6. Listing metinleri ve hakları temiz görseller Console'a yüklenip kaydedilmeli.
7. Gerçek production-ID buildinde exact-release emulator ve fiziksel cihaz smoke testleri geçmeli.
8. Internal/closed test yayını başlatılıp 12 kullanıcıyla 14 günlük kapı tamamlanmalı.

## Terfi kuralı

Internal testte doğrulanan AAB'nin hash'i manifestle birebir eşleşmeden kapalı teste veya production'a terfi yapılmaz. Mobil düzeltme gerekirse aynı `versionCode` yeniden kullanılmaz; sürüm artırılıp yeni aday üretilir.
