# Android mağaza ve yayın hazırlık raporu

Son güncelleme: **21 Temmuz 2026**

## Hazır olanlar

- Paket kimliği: `life.copa.app`
- Sürüm: `1.0.0` (`versionCode` 1)
- Min SDK 24, target/compile SDK 36
- Play App Signing uyumlu upload certificate pin'i
- İzinler yalnız `android.permission.INTERNET`
- 512×512 PNG mağaza ikonu
- Beş dil için 1024×500 özellik görseli
- Beş dil için beşer 1080×1920 telefon ekranı
- Beş dil için beşer 1920×1080 tablet ekranı
- Beş dil için kısa/tam açıklama ve sürüm notları
- Beş dil için erişilebilir alternatif metinler
- Play Console App Content ve Data Safety cevap haritası
- Herkese açık gizlilik politikası URL'si
- Reklam ve uygulama içi satın alma yok
- Hesap veya giriş zorunluluğu yok

## Yayını durduran dış bilgiler

1. **Doğrulanmış destek e-postası:** Mağaza girişi, gizlilik ve UGC kaldırma taleplerinde aynı, düzenli izlenen adres kullanılmalı.
2. **Geliştirici hesabı türü:** Kuruluş hesabıysa D‑U‑N‑S, yasal ad, adres, telefon ve web alanı doğrulaması tamamlanmalı. Kişisel hesapsa Console'un kimlik ve cihaz doğrulaması tamamlanmalı.
3. **Yasal kimlik eşleştirmesi:** Gizlilik politikasındaki geliştirici adı, Play Console'daki yasal adla eşleşmeli.
4. **Console anketleri:** IARC içerik derecelendirmesi, hedef kitle, UGC ve Data Safety cevapları Console'da kaydedilip son AAB ile yeniden karşılaştırılmalı.

## AAB durumu

- Depodaki `release-manifest.json` ve imzalı AAB **17 Temmuz 2026** tarihli eski adaya aittir; güncel grup turnuvası/UI değişikliklerini temsil etmediği için **yüklenmemelidir**.
- Güncel dirty-worktree aday koşusunda statik, güvenlik, mağaza ve servis kontrolleri geçti; ancak aynı çalışma alanında devam eden ürün/test değişiklikleri sırasında tarayıcı matrisi kararsızlaştığı için imzalama aşamasına bilinçli olarak geçilmedi.
- Son yüklenebilir AAB, değişiklikler tek ve temiz bir committe sabitlendikten sonra `npm run android:release:local` ile üretilmeli. `release-manifest.json` içindeki yeni hash ve `exact_release_emulator_smoke` sonucu görülmeden Console'a dosya yüklenmemeli.

## Hesaba bağlı test kapısı

Kişisel geliştirici hesabı 13 Kasım 2023'ten sonra oluşturulduysa production erişimi istemeden önce kapalı testte en az **12 test kullanıcısının 14 gün kesintisiz** opt-in durumda kalması gerekir. Console hesabı bu kapsama girmiyorsa kendi gösterdiği test kapısı izlenmelidir.

## Yükleme sırası

1. `application-create.md` ile uygulamayı oluştur.
2. `play-console-declarations.md` ile App Content alanlarını doldur.
3. Türkçe ana listing'i ekle; ardından dört yerelleştirmeyi ekle.
4. `asset-manifest.json` içindeki ölçü ve hash'lerle görselleri doğrula.
5. Son imzalı AAB'yi önce **Internal testing** kanalına yükle.
6. Pre-launch raporu ve gerçek cihaz testleri temizlenince gerekli kapalı testi başlat.
7. Production'a aynı doğrulanmış artifact'i terfi ettir; yeni AAB üretme.

## İsteğe bağlı ama önerilen

- 20–30 saniyelik, en az %80 gerçek oynanış içeren reklamsız ve listelenmemiş YouTube önizleme videosu.
- İlk üç telefon ekranında draft, kadro ve maç akışını bu sırada tutmak.
- Yayından önce arayüzdeki `BETA` rozetinin ürün kararını kesinleştirmek. Rozet kalacaksa mağaza görselleri mevcut sürümü doğru yansıtır; kaldırılacaksa görseller yeniden üretilmelidir.
- Destek e-postasına dışarıdan test mesajı gönderip teslimat ve yanıt akışını doğrulamak.
