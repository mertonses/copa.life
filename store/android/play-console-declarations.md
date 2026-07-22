# Play Console beyan cevapları

Son teknik kontrol: 21 Temmuz 2026. Bu dosya, Console açıldığında cevapların doğrudan girilebilmesi için hazırlanmıştır. Play Console'da alan adı ve yasal geliştirici bilgileri doğrulanmıştır.

## Uygulama oluşturma

| Alan | Girilecek değer |
| --- | --- |
| Varsayılan dil | Türkçe — tr-TR |
| Ad | copa.life |
| Uygulama veya oyun | Oyun |
| Ücretsiz veya ücretli | Ücretsiz |
| Kategori | Spor |
| Paket adı | `life.copa.app` |
| Reklam içeriyor | Evet |
| Uygulama içi satın alma | Hayır |
| Destek e-postası | `support@copa.life` |
| Destek web sitesi | `https://copa.life/support.html` |
| Gizlilik politikası | `https://copa-life-legal.pages.dev/privacy.html` |

Yerelleştirmeler: **en-US, es-ES, de-DE, it-IT**. Türkçe ana giriş `tr-TR` olarak kalır.

Play App Signing etkinleştirilecek. Mevcut gizli yükleme anahtarı yalnız AAB yüklemek için kullanılacak.

## App content cevapları

### App access

- Uygulamanın tamamı özel erişim olmadan kullanılabilir: **Evet**.
- Giriş, hesap, üyelik, konum veya özel erişim talimatı: **Yok**.

### Ads

- Uygulama reklam içeriyor mu: **Evet** — koşu tamamlandıktan sonra AdMob tam ekran geçiş reklamı ve kullanıcının isteğe bağlı izleyerek draftta +1 yenileme hakkı kazandığı ödüllü reklam.
- Reklam SDK'sı: **Google GMA Next‑Gen 1.2.1**.
- Gizlilik mesajı: **Google UMP 4.0.0**; reklam isteği yalnız `canRequestAds()` izin verdiğinde yapılır.
- Android reklam kimliği kullanımı: **Evet** — `com.google.android.gms.permission.AD_ID` beyan edilir.

### Target audience and content

- Seçilecek yaş grupları: **13–15, 16–17 ve 18+**.
- 13 yaş altı: **Seçilmeyecek**.
- Uygulama özellikle çocuklara yönelik mi: **Hayır**.
- Gerekçe: strateji/kadro yönetimi odağı ve isteğe bağlı kullanıcı üretimli kulüp adları.

### Content rating / IARC hazırlığı

- Kategori: **Game**.
- Kullanıcıların çevrim içi içerik paylaşması veya birbirlerinin oluşturduğu içeriği görmesi: **Evet** — yalnız Ghost kulüp adı ve tamamlanmış oyun/kadro anlık görüntüsü.
- Serbest sohbet, özel mesaj, fotoğraf, ses veya video yükleme: **Hayır**.
- Kullanıcı konumu paylaşımı: **Hayır**.
- Kumar/bahis, gerçek para veya satın alınabilir rastgele ödül: **Hayır**.
- Grafik şiddet, cinsel içerik, uyuşturucu, nefret söylemi veya küfür: **Hayır**.
- Metinsel, grafik olmayan spor sakatlığı ve rastgele maç olayları bulunabilir.
- Son IARC derecesi yalnız Console anketinin gerçek soruları görülerek kabul edilecek; tahmini derece mağaza metnine yazılmayacak.

### User-generated content

- UGC var mı: **Evet** — kullanıcının oluşturduğu Ghost Club adı.
- İçerik oluşturmadan önce şartların kabulü: **Evet**.
- Yasak içerik kuralları: **Evet** — hakaret/nefret, müstehcenlik, siyasi içerik, kişi taklidi, gerçek kulüp ve şirket markaları.
- Uygulama içi bildir: **Evet**.
- Uygulama içi engelle/gizle: **Evet** — bildirilen Ghost bir daha gösterilmez.
- Sunucu moderasyonu: **Evet** — `review` ve `blocked` durumları, tekrar eden ihlallerde istemci engeli.
- Takedown kanalı: **Evet** — `support@copa.life` ve uygulama içi bildirim akışı.

### Account creation and deletion

- Uygulama kullanıcı hesabı oluşturuyor mu: **Hayır**.
- Kullanıcı hesabı ile giriş var mı: **Hayır**.
- Play hesap silme URL'si gereksinimi: **Uygulanamaz**.
- Buna rağmen isteğe bağlı Ghost verisi uygulama içindeki **Verilerimi sil** işlemiyle silinebilir.

### Diğer politika beyanları

| Soru | Cevap |
| --- | --- |
| News / magazine app | Hayır |
| Government app | Hayır |
| Financial features | Hayır |
| Health features | Hayır |
| VPN service | Hayır |
| Dating | Hayır |
| Real-money gambling/games/contests | Hayır |
| Ads ID | Evet — Google Mobile Ads SDK |

## Data Safety cevap haritası

### Üst seviye cevaplar

- Uygulama kullanıcı verisi topluyor veya paylaşıyor mu: **Evet**.
- Tüm aktarılan veriler aktarım sırasında şifreleniyor mu: **Evet — HTTPS**.
- Kullanıcı veri silme talebinde bulunabilir mi: **Evet — uygulama içinden**.
- Veri üçüncü taraflarla "shared" olarak beyan edilecek mi: **Evet** — Google Mobile Ads SDK reklam verilerini Google ile paylaşır. Cloudflare'ın geliştirici adına hizmet sağlayıcı işlemesi ayrıca mevcut Ghost/Data Safety kapsamıyla beyan edilir.
- Veri satışı: **Yok**.
- Reklam veya pazarlama amacı: **Evet** — AdMob reklam sunumu ve ölçümü.

### Toplanan veri türleri

| Play veri türü | Örnek | Zorunlu mu | Amaç | Saklama |
| --- | --- | --- | --- | --- |
| Other user-generated content | Ghost veya Dünya sıralaması kulüp adı | İsteğe bağlı | App functionality | Ghost: en çok 45 gün; sıralama: katılım/silme süresince |
| App activity → Other actions / App interactions | Ghost kadrosu/sonucu veya sıralama tur-galibiyet-kupa sonucu | İsteğe bağlı | App functionality | Ghost: en çok 45 gün; sıralama koşusu: aktif aylık sezon |
| Device or other IDs | Uygulamanın ürettiği rastgele kurulum kimliği | İsteğe bağlı | App functionality; Fraud prevention, security and compliance | Aktif Ghost/güvenlik kaydı süresince |
| Other user-generated content | Bildirilen Ghost ve bildirim nedeni | İsteğe bağlı | Fraud prevention, security and compliance | En çok 90 gün |
| Approximate location | IP adresinden tahmin edilebilen genel konum | Gerekli / otomatik reklam SDK işlemesi | Advertising or marketing; Fraud prevention, security and compliance | Google AdMob politikalarına göre |
| App activity → App interactions | Uygulama başlatma, dokunma ve reklam/video etkileşimleri | Gerekli / otomatik reklam SDK işlemesi | Advertising or marketing; Analytics | Google AdMob politikalarına göre |
| App info and performance → Diagnostics | SDK/uygulama performansı, hang ve enerji kullanımı | Gerekli / otomatik reklam SDK işlemesi | Analytics; Fraud prevention, security and compliance | Google AdMob politikalarına göre |
| Device or other IDs | Android reklam kimliği, App Set ID ve uygulanabilir diğer cihaz/hesap tanımlayıcıları | Gerekli / cihazda mevcutsa | Advertising or marketing; Analytics; Fraud prevention, security and compliance | Google AdMob politikalarına göre |

Notlar:

- Kurulum kimliği donanım, Android veya reklam kimliği değildir.
- Ghost paylaşımı ve Dünya sıralaması varsayılan kapalıdır; her biri şart kabulü ve birbirinden ayrı açık rıza gerektirir.
- Süresi dolan Ghost kayıtları D1'den günlük görevle fiziksel olarak silinir.
- Sıralamadan çıkış profil ve koşu satırlarını siler; aktif sezon dışındaki tekil koşu satırları günlük görevle temizlenir.
- IP adresi uygulama veritabanında saklanmaz; altyapı sağlayıcısının geçici güvenlik/ağ işlemesi gizlilik politikasındaki hizmet sağlayıcı kapsamındadır.
- Yerel oyun kaydı cihazdan çıkmadığı sürece Data Safety'de "collected" değildir.
- Android paketi ad/e-posta/mesaj toplayan gömülü iletişim formu içermez. Destek bağlantısı açık web sitesine çıkar.
- Google Mobile Ads SDK tarafından aktarılan veriler TLS ile şifrelenir. UMP tercihi güncel değilse veya reklam isteğine izin vermiyorsa SDK'ya reklam isteği yapılmaz.

## Privacy policy kontrolü

Politika yayından önce şu kuruluş alanlarıyla son kez karşılaştırılacak:

1. Play Console'da doğrulanmış yasal geliştirici adı.
2. Kurumsal destek ve gizlilik e-postası: `support@copa.life`.
3. Console kamuya açık geliştirici telefon numarası gösteriyorsa doğrulanmış numara.

Politika URL'si herkese açık HTTPS sayfası olmalı; PDF olmamalı, coğrafi engel veya giriş istememelidir.

## Console'a girerken son doğrulama

Bu cevaplar, yüklenecek son AAB'nin tarama raporu ve üretim Ghost Worker davranışıyla bir kez daha karşılaştırılacak. Play Console'un soru metni bu dosyadaki sınıflandırmadan farklıysa daha geniş/şeffaf beyan seçilecek ve bu dosya güncellenecek.
