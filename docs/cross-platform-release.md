# copa.life web ve Android yayın mimarisi

## Hedef yapı

Oynanış için tek kaynak vardır: kökteki `index.html`, `src/` ve `assets/`. Web paketi (`dist`) ile Android WebView paketi (`dist-android`) aynı kaynak ağacından üretilir. Android tarafında ayrı bir oyun kopyası tutulmaz.

Android derlemesi yalnız mağazaya özel, açıkça tanımlanmış dönüşümleri uygular:

- Gerçek kulüp armalarını, bayrak görsel dosyalarını, Patreon varlığını ve web tanılama kodunu dışarıda bırakır; ülke/dil göstergelerini metin kodlarına dönüştürür.
- Kupa adlarını jenerik karşılıklarına dönüştürür.
- Destek bağlantısını Capacitor Browser üzerinden açar.
- Native yaşam döngüsü ve durum çubuğu köprüsünü ekler.

Bu kurallar `tools/android-package-policy.mjs` dosyasındaki tek allowlist üzerinden yönetilir. Oynanış farkı bu katmana eklenmemelidir.

## Parite garantisi

Her iki paket `platform-build.json` üretir. Manifestlerde aynı değerlerin bulunması zorunludur:

- Kaynak commit'i
- Kaynak SHA-256 parmak izi
- Paketleme araçları ve native yapılandırmayı kapsayan derleme parmak izi
- Kaynak dosya sayısı
- Derleme sürümü

`npm run check:parity`, ortak dosyaların iki çıktıda da bulunduğunu ve Android'e izin verilen dönüşümler dışında içeriklerinin değişmediğini doğrular. GitHub Pages yayını bu kontrol geçmeden ilerlemez. Aynı değişiklik ayrıca Android aday AAB iş akışını tetikler.

## Günlük geliştirme akışı

1. Oynanış, denge, arayüz ve performans değişiklikleri yalnız ortak kaynakta yapılır.
2. `npm test` ve `npm run check:parity` çalıştırılır.
3. Değişiklik `main` dalına girdiğinde:
   - Pages akışı web sürümünü test edip yayınlar.
   - Android candidate akışı aynı commit için native senkronizasyon ve Gradle derlemesi yapar.
   - Üretilen imzasız AAB, 14 gün saklanan bir CI doğrulama artefaktıdır; mağazaya gönderilmez.

Bu sayede web'de çalışan yeni oynanış aynı commit'ten Android paketine de girer. Kullanıcıya ulaşma zamanı yine Google Play inceleme ve kademeli dağıtım sürecine bağlıdır.

## Android sürümü çıkarma

Her mağaza yüklemesinde `versionCode` mutlaka artmalıdır. Sürümün tek kaynağı `release/android-version.json` dosyasıdır; Gradle ve paket manifesti bu dosyayı okur.

```powershell
npm run android:version
npm run android:version:patch
npm run android:release:local
```

- Hata düzeltmesi: `android:version:patch`
- Geriye uyumlu özellik: `android:version:minor`
- Kırıcı ürün değişikliği: `android:version:major`

Sürüm artırıldıktan sonra `store/android/whatsnew/` altındaki Türkçe ve İngilizce notlar güncellenmeli, ardından `npm run android:notes:stamp` çalıştırılmalıdır. Not damgası sürümle uyuşmuyorsa release durur. Yerel yayın betiği bağımlılıkları temiz kurar, ana testleri, Ghost API testlerini, mobil tarayıcı testlerini ve parite kontrolünü çalıştırır; AAB içeriğini tarar, upload sertifikasını doğrular, Android paketini imzalar ve `store/android/release-manifest.json` dosyasını günceller.

`npm run android:release:local` yalnız `main` dalındaki temiz ve commit edilmiş bir çalışma ağacında mağaza adayı üretir. Devam eden geliştirme veya release dalında aynı hattı sınamak için `npm run android:candidate:local` kullanılabilir; bu çıktı doğrulansa ve imzalansa bile mağaza adayı sayılmaz ve Play'e yüklenmez. Candidate manifesti kaynak commit/fingerprint bilgisini kaydetse de final paket `main` üzerinde yeniden üretilir.

CI build'leri `GITHUB_SHA`yı, yerel temiz build'ler ise doğrulanmış `git rev-parse HEAD` sonucunu manifestte saklar. Çalışma ağacı kirliyse commit alanı özellikle boş bırakılır; böyle bir çıktı yalnız yerel deneme adayıdır.

## Google Play otomasyonu

`.github/workflows/android-play.yml` yalnız elle çalıştırılır ve yeni AAB'yi yalnız `internal` test kanalına yükler. Sürüm kodunun ayrıca yazılması gerekir; yanlış sürüm seçimi akışı durdurur. Alpha, beta veya production için yeni paket derlenmez ve aynı sürüm yeniden yüklenmez. Internal'da doğrulanmış sürüm Play Console üzerinden terfi ettirilir; production geçişinde `store/android/promotion-checklist.md` uygulanır.

DUNS ve Play kuruluş doğrulaması tamamlanınca şu GitHub Secrets değerleri eklenir:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_UPLOAD_KEYSTORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_KEY_PASSWORD`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

Play API otomasyonu kullanılmadan önce ilk AAB Play Console'dan elle yüklenmeli ve paket `life.copa.app` hesapta oluşturulmalıdır. Sonraki yeni sürümler otomatik olarak `internal` kanalına gönderilebilir. Internal'dan sonraki kanal değişiklikleri, test edilmiş aynı versionCode terfi ettirilerek yapılır.

## Hukuk sayfalarının sürekliliği

Gizlilik, kullanım şartları ve takedown metinleri gerçek arma hak kapısından bağımsız `copa-life-legal.pages.dev` projesinde tutulur. `.github/workflows/legal-pages.yml` değişiklikleri Wrangler ile kalıcı production adresine dağıtır ve günlük zamanlanmış kontrolde üç canlı URL'yi yeniden okur. Mağaza beyanlarında rastgele preview deployment adresi kullanılmaz.

## Geriye uyumluluk kuralları

- Kayıt anahtarları silinmez veya anlamı değiştirilmez; yeni şema gerekiyorsa sürümlü migration yazılır ve devam etme testi eklenir.
- Ghost API değişiklikleri, mağazada eski Android sürümleri bulunacağı için en az bir mobil destek penceresi boyunca geriye uyumlu kalır.
- Zorunlu sunucu alanları bir anda eklenmez; önce opsiyonel kabul edilir, mobil yayılım tamamlanınca zorunlu hâle getirilir.
- Feature flag yalnız veri/özellik açıp kapatır; uzaktan JavaScript veya başka çalıştırılabilir oyun kodu indirmez.
- Native eklenti eklenirse Android izinleri, Data Safety beyanı ve kapalı kanal cihaz testi yeniden gözden geçirilir.

## Geri alma

Web sürümü önceki sağlam commit yeniden yayınlanarak geri alınabilir. Google Play'de aynı `versionCode` tekrar kullanılamaz; sorunlu mobil sürüm durdurulur ve düzeltilmiş kodla daha yüksek `versionCode` taşıyan yeni AAB çıkarılır. Bu nedenle production öncesinde internal test ve fiziksel cihaz smoke testi zorunlu yayın kapısıdır.

## Uzaktan kod güncellemesi kullanılmamasının nedeni

Android paketi oyunun HTML/JS/CSS dosyalarını AAB içine gömer. Oynanış kodunu Play dışında değiştiren bir OTA mekanizması kurulmaz. Böylece yayınlar tekrarlanabilir, geri izlenebilir ve mağaza güncelleme mekanizmasıyla uyumlu kalır.
