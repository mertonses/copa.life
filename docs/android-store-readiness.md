# copa.life Android mağaza hazırlık kaydı

Bu dosya ilk Android mağaza sürümü için ürün ve beyan kararlarının tek kaynağıdır. Play Console'a girilecek cevaplar, yayımlanan APK/AAB ve üretim sunucusunun gerçek davranışıyla son kez karşılaştırılmalıdır.

## İlk sürüm ticari modeli

- Ücretsiz.
- Koşu tamamlandıktan sonra Google AdMob tam ekran geçiş reklamı.
- Uygulama içi satın alma yok.
- Patreon veya başka bir harici ödeme/bağış bağlantısı yok.
- Gerçek para ile ödül, bahis veya ücretli rastgele ödül yok.

Android paket kontrolü gerçek kulüp armalarını, Patreon varlık ve bağlantılarını, ödeme entegrasyonlarını ve eski oyuncu niteliklerini engeller. Reklam tarafında yalnız sabitlenmiş GMA Next‑Gen ve UMP sürümleri ile yerel `CopaAds` köprüsüne izin verir.

## İçerik ve marka ayrımı

- Android'de gerçek kulüp armaları paketlenmez.
- Ülke ve dil seçimleri yalnızca proje içinde üretilmiş, izin envanterinde kayıtlı yedi SVG bayrağı kullanır. Android paket kontrolü bitmap bayrakları, haricî kaynakları ve izin listesindeki kodlar dışındaki bayrak dosyalarını reddeder.
- Takımlar, ad veya kısaltmayla üretilen jenerik copa.life armalarıyla gösterilir.
- Oyuncu fotoğrafı bulunmaz.
- Oyuncu profilleri altı adet 0–100 copa.life oyun boyutundan oluşur; ham üçüncü taraf nitelikleri ve bireysel sakatlık yatkınlığı bulunmaz.
- Turnuva adları jeneriktir: Türkiye Ulusal Kupası, İngiltere Kupası, İspanya Kupası, Almanya Kupası, İtalya Kupası ve Japonya Kupası.

Takım ve oyuncu adlarının kamusal bilgi olması tek başına sıfır hukuki risk garantisi değildir. Mağaza görselleri, açıklamalar ve oyunun sunumu resmî ortaklık izlenimi vermemeli; yayın öncesi marka/haksız rekabet incelemesi ayrıca yapılmalıdır.

## Play Data Safety taslağı

Ghost Club paylaşımı veya Dünya Kulüpler Sıralaması açılırsa aşağıdaki veri sınıfları işlenir:

| Veri | Zorunluluk | Amaç | Süre |
| --- | --- | --- | --- |
| Kullanıcının oluşturduğu kulüp adı | İsteğe bağlı | Uygulama işlevi / eşleştirme | En çok 45 gün |
| Tamamlanmış kadro ve oyun sonucu | İsteğe bağlı | Uygulama işlevi / Ghost rakibi | En çok 45 gün |
| Rastgele anonim kurulum kimliği | İsteğe bağlı | Kötüye kullanım önleme, raporlama ve silme | Aktif kayıtlar ve güvenlik gereksinimi boyunca |
| Ghost raporu ve nedeni | İsteğe bağlı | Güvenlik, moderasyon ve kötüye kullanım önleme | En çok 90 gün |
| Herkese açık kulüp profili ve toplu kariyer değerleri | İsteğe bağlı | Dünya sıralaması / uygulama işlevi | Sıralamadan ayrılana veya silene kadar |
| Tur, galibiyet ve şampiyonluk içeren sıralama koşusu | İsteğe bağlı | Sunucuda puanlama ve kötüye kullanım önleme | Aktif aylık sezon |
| IP adresi / yaklaşık konum | Run sonu reklam isteğinde | Reklam, ölçüm ve sahtekârlık önleme | Google AdMob politikalarına göre |
| Uygulama etkileşimleri | Run sonu reklam isteğinde | Reklam, analiz ve ölçüm | Google AdMob politikalarına göre |
| Tanı ve performans verileri | Reklam SDK'sı çalıştığında | Analiz ve sahtekârlık önleme | Google AdMob politikalarına göre |
| Cihaz veya diğer kimlikler | Cihazda mevcutsa | Reklam, analiz ve sahtekârlık önleme | Google AdMob politikalarına göre |

- Ghost paylaşımı ve Dünya sıralaması varsayılan olarak kapalıdır.
- Her özellik için kullanım şartı kabulü ve birbirinden ayrı açık rıza gerekir.
- Aktarım HTTPS üzerinden yapılır.
- Kullanıcı ayarlardan tüm Ghost ve sıralama verilerini birlikte silebilir; sıralamadan çıkmak profil ve koşu satırlarını siler.
- 45 günlük süre dolan Ghost kayıtları günlük sunucu göreviyle D1'den fiziksel olarak silinir.
- Uygulama kişi listesi, kesin konum, fotoğraf, ses veya finansal bilgi istemez. GMA SDK, cihazda mevcutsa Android reklam kimliğini ve diğer cihaz tanımlayıcılarını işleyebilir.
- UMP rıza durumu her uygulama açılışında güncellenir; `canRequestAds()` false ise reklam yüklenmez.
- Gizlilik seçenekleri UMP gerekli gördüğünde uygulama Ayarları içinde görünür.
- Tüm AdMob istekleri `AgeRestrictedTreatment.TEEN` ve en fazla `MAX_AD_CONTENT_RATING_T` ile sınırlandırılır.
- Reklam aynı tamamlanan run için tekrar gösterilmez ve cihaz tarafında iki gösterim arasında en az 10 dakika beklenir.

Play Console yanıtları üretim sürümünde Ghost özelliğinin açık olup olmadığına göre verilmelidir. Özellik kapalı yayımlansa bile ileride uzaktan açılacaksa veri beyanı önceden güncellenmelidir.

## UGC ve yaş derecelendirmesi

Ghost Club adı kullanıcı tarafından oluşturulan içeriktir. Mağaza yaş derecelendirmesinde **kullanıcı tarafından oluşturulan içerik / çevrim içi etkileşim** beyanı yapılmalıdır.

Mevcut güvenlik katmanları:

- Küfür, nefret, siyasi/kişisel taklit, müstehcen içerik ve gerçek kulüp/şirket markası filtresi.
- İnceleme gerektiren adlar için `review`, açık ihlaller için `blocked` durumu.
- “Bu kulübü bildir” ve bildirilen Ghost'u yerel olarak bir daha göstermeme.
- Tekrarlanan ihlaller için anonim istemci engeli.
- Kullanım şartları, gizlilik politikası ve takedown iletişim kanalı.

## Yayından önce manuel Play Console işleri

- Uygulama erişimi, içerik derecelendirmesi, hedef kitle ve Data Safety formlarını bu kayıtla doldur.
- Gizlilik politikası URL'sini herkese açık HTTPS adresi olarak gir.
- Destek/takedown iletişim kanalının çalışan bir posta kutusuna veya forma gittiğini doğrula.
- Telefon ve tablet ekran görüntülerinde resmî kulüp arması, Patreon veya riskli mağaza metni bulunmadığını doğrula.
- Üretim AAB'sini ayrı ve gizli bir yükleme anahtarıyla imzala; anahtarı depoya ekleme.
- Kapalı test kanalında geri tuşu, yaşam döngüsü kaydı, çevrimdışı açılış, Ghost rızası/silmesi ve farklı ekran oranlarını test et.

## 20 Temmuz 2026 uygulama durumu

- Ghost Club D1 veritabanının üretiminde `0001` ve `0002` migration'ları çalışmaktadır. Dünya sıralaması için `0003_club_leaderboard.sql` ve şema sürümü 3 Worker kodu hazırlanıp test edilmiştir; üretime açılmadan önce migration ve Worker birlikte dağıtılmalıdır. Günlük fiziksel silme görevi `17 3 * * *` zamanlamasına bağlıdır.
- Gizlilik, kullanım şartları ve takedown sayfaları ana web paketindeki logo hakları engeline karışmadan ayrı Cloudflare Pages paketine dağıtıldı. Kalıcı gizlilik politikası URL'si: `https://copa-life-legal.pages.dev/privacy.html`.
- Play yükleme anahtarı depo dışında üretildi. Parola Windows Current User DPAPI ile şifreli tutuluyor; yükleme sertifikası SHA-256 parmak izi `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`.
- İmzalı AAB: `android/app/build/outputs/bundle/release/app-release-signed.aab`. Değişken AAB boyutu ve SHA-256 değeri yalnız `store/android/release-manifest.json` dosyasından okunur; bu belgede kopyalanmaz.
- Android paketindeki Web3Forms iletişim formu ve erişim anahtarı kaldırıldı. Android'deki destek düğmeleri ödeme veya bağış yönlendirmesi içermeyen `https://copa.life/support.html` sayfasına çıkar; ad, e-posta ve destek mesajı native paket tarafından toplanmaz.
- Destek URL'si resmi Capacitor Browser bileşeniyle Chrome/Custom Tab akışında açılır. Pixel 3a API 34 emülatöründe eklenti kaydı ve destek işlevinin eklenti yolunu kullanması doğrulandı; yeni özel destek URL'sinin VIEW intent'i aday paket üzerinde yeniden doğrulanmalıdır.
- Türkçe, İngilizce, İspanyolca, Almanca ve İtalyanca mağaza metinleri ile sürüm notları; Play Console beyan cevapları; 512×512 ikon; dil başına 1024×500 feature graphic, beş telefon ve beş tablet ekran görüntüsü `store/android/` altında hazırlandı.
- Android run sonu reklam akışı GMA Next‑Gen 1.2.1 ve UMP 4.0.0 ile eklendi. Geliştirme sürümleri yalnız Google test kimliklerini kullanır; üretim AAB hattı gerçek AdMob kimliklerini zorunlu tutar.
- Resmî destek, gizlilik ve takedown adresi `support@copa.life` olarak doğrulandı ve beyan dosyalarına işlendi.
- Android 14 / API 34 Pixel 3a emülatöründe temiz kurulum, splash, çevrimdışı açılış, arka plan-devam, geri tuşuyla küçültme ve Ghost'un varsayılan kapalı/çift rızalı olması doğrulandı. Bu test Capacitor 8 global eklenti uyumsuzluğunu ortaya çıkardı; `src/runtime/nativeApp.js` düzeltilip temiz kurulumda yeniden doğrulandı.
- Android candidate workflow'u artık her adayda API 34 emülatörü açar, instrumentation testini çalıştırır, gerçek `life.copa.app` paketini başlatır ve crash/ANR, çalışan süreç, odaklanan Activity ve ekran görüntüsünü otomatik doğrular.
- Ayrı staging D1 veritabanı oluşturuldu; `0001`/`0002` migration'ları uygulandı ve staging Analytics Engine dataset'leri veri alıyor.
- Haftalık anonim KPI raporu ile 30 dakikalık `profile_open_error` ve Worker 5xx alarmı hazırlandı. Salt-okunur `CLOUDFLARE_ANALYTICS_TOKEN` production ortamına eklendi.
- İmzalı AAB, bundletool ile gerçek cihaz split APK'larına dönüştürülüp Android 14 / API 34 emülatörüne temiz kuruldu. Soğuk açılış, tam kurulum akışı, hub, çift dokunmalı altı boyutlu oyuncu profili ve çevrimdışı kayıt geri yükleme geçti; safe-area/crash/ANR/OOM gözlenmedi.
- Devam eden final; dakika, skor, RNG, taktik kararları, oyuncu/top konumu ve olay istatistikleriyle yerel checkpoint'e alınır. Mobil Chromium süreç-kapanma senaryosunda 20. dakikadan sonra yenileme ve aynı final durumuna dönüş otomatik testten geçti. Fiziksel düşük seviye cihaz testi hâlâ manuel yayın kapısıdır.
- Play Console geliştirici hesabı oluşturuldu; alan adı ve yasal geliştirici bilgileri doğrulandı. Uygulama kaydı açıldı ve kalan mağaza/App Content adımları Console üzerinden tamamlanabilir.
- Gerçek web armaları proje sahibinin kararıyla web kaynaklarında kalır; lisans kanıtı olmadığı için genel web yayını teknik hak kapısından geçmez. Android ve hukuki sayfa paketi gerçek armaları içermez.
