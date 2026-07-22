# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **22 Temmuz 2026**

## Hazır olanlar

- Paket: `life.copa.app`, sürüm `1.0.0` (`versionCode` 1), min SDK 24, target/compile SDK 36.
- Güncel kaynak commitinden imzalı yerel aday üretildi; AAB içeriği, sertifika, web/Android paritesi ve bağımlılık güvenliği doğrulandı.
- Mobil pakette gerçek arma, bayrak görseli veya resmi kupa adı bulunmuyor.
- Beş dil için listing metni, özellik grafiği, beş telefon ve beş tablet ekran görüntüsü hazır.
- Gizlilik, kullanım koşulları, kaldırma ve güvenlik sayfaları doğrulandı.
- Run sonu geçiş reklamı, draftta koşu başına en fazla +2 hak veren isteğe bağlı ödüllü reklam, UMP rıza akışı ve uygulama içi gizlilik ayarları kodlandı.
- GitHub Actions'a dört upload-key secret'ı eklendi: keystore, keystore parolası, alias ve key parolası.
- AdMob hesabı onaylandı; `copa.life` Android uygulaması ve `run_end_interstitial` geçiş reklamı birimi oluşturuldu.
- Üretim AdMob uygulama/reklam birimi kimlikleri GitHub Actions secret'larına eklendi.
- Gerçek yayıncı kaydı `app-ads.txt` olarak web paketine eklendi ve dağıtım kontrolüyle zorunlu hale getirildi.
- Ghost Club Worker üretime dağıtıldı; D1 şeması güncel ve canlı health kontrolü başarılı.

## Play Console'da doğrulanan durum

- Uygulama mevcut ve geliştirici hesabında erişilebilir.
- Geliştirici, izin/beyan/belge ve mağaza bilgisi düzenlemelerini tamamladığını doğruladı.
- Kapalı test `Alpha` kanalı henüz etkin değil: ülke seçimi tamamlandı; testçi listesi ve ilk sürüm eksik.
- Production erişimi kapalı testte en az 12 kullanıcı ve kesintisiz 14 gün şartı tamamlanana kadar kilitli.
- Yayınlanmamış Console değişikliği bulunmuyor.

## Güncel AAB

- Kaynak build: `617d12591ffa` (AdMob/app-ads değişiklikleri commitlenmeden üretilen doğrulama adayı)
- Dosya: `android/app/build/outputs/bundle/release/app-release-signed.aab`
- Boyut: `15,595,813` bayt
- SHA-256: `92249AA1EE03243C51E9F767EFEB797295B3A606E06E0370EEF734569B9E965A`
- Upload certificate: `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`

Bu AAB gerçek production AdMob kimlikleriyle üretildi; ancak kaynak çalışma ağacı build anında dirty olduğu için yalnız doğrulama adayıdır ve Play'e yüklenmemelidir. `release-manifest.json` bu durumu `store_upload_eligible: false` olarak kilitler. Merge sonrasında temiz `main` commitinden yeni AAB üretilmelidir.

## Dış hesaplara bağlı kalan kapılar

1. AdMob Avrupa gizlilik mesajı yayımlanmalı.
2. AdMob'da `draft_reroll_rewarded` ödüllü reklam birimi oluşturulup `COPA_ADMOB_REWARDED_ID` GitHub secret'ı eklenmeli.
3. Bu dal merge edilerek `https://copa.life/app-ads.txt` yayına alınmalı; ardından AdMob doğrulaması beklenmeli.
4. Google Play servis hesabı oluşturulup `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret'ı eklenmeli.
5. Temiz `main` commitinden production-ID AAB üretilip exact-release emulator ve fiziksel cihaz smoke testleri geçirilmeli.
6. Kapalı test testçi listesi en az 12 Google hesabıyla oluşturulmalı, ilk sürüm yayımlanmalı ve kesintisiz 14 günlük kapı tamamlanmalı.

## Terfi kuralı

Internal testte doğrulanan AAB'nin hash'i manifestle birebir eşleşmeden kapalı teste veya production'a terfi yapılmaz. Mobil düzeltme gerekirse aynı `versionCode` yeniden kullanılmaz; sürüm artırılıp yeni aday üretilir.
