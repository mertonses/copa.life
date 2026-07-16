# copa.life Android mağaza hazırlık kaydı

Bu dosya ilk Android mağaza sürümü için ürün ve beyan kararlarının tek kaynağıdır. Play Console'a girilecek cevaplar, yayımlanan APK/AAB ve üretim sunucusunun gerçek davranışıyla son kez karşılaştırılmalıdır.

## İlk sürüm ticari modeli

- Ücretsiz.
- Reklamsız.
- Uygulama içi satın alma yok.
- Patreon veya başka bir harici ödeme/bağış bağlantısı yok.
- Gerçek para ile ödül, bahis veya ücretli rastgele ödül yok.

Android paket kontrolü gerçek kulüp armalarını, Patreon varlık ve bağlantılarını, reklam/ödeme entegrasyonlarını ve eski oyuncu niteliklerini engeller.

## İçerik ve marka ayrımı

- Android'de gerçek kulüp armaları paketlenmez.
- Takımlar, ad veya kısaltmayla üretilen jenerik copa.life armalarıyla gösterilir.
- Oyuncu fotoğrafı bulunmaz.
- Oyuncu profilleri altı adet 0–100 copa.life oyun boyutundan oluşur; ham üçüncü taraf nitelikleri ve bireysel sakatlık yatkınlığı bulunmaz.
- Turnuva adları jeneriktir: Türkiye Ulusal Kupası, İngiltere Kupası, İspanya Kupası, Almanya Kupası, İtalya Kupası ve Japonya Kupası.

Takım ve oyuncu adlarının kamusal bilgi olması tek başına sıfır hukuki risk garantisi değildir. Mağaza görselleri, açıklamalar ve oyunun sunumu resmî ortaklık izlenimi vermemeli; yayın öncesi marka/haksız rekabet incelemesi ayrıca yapılmalıdır.

## Play Data Safety taslağı

Ghost Club paylaşımı açılırsa aşağıdaki veri sınıfları işlenir:

| Veri | Zorunluluk | Amaç | Süre |
| --- | --- | --- | --- |
| Kullanıcının oluşturduğu kulüp adı | İsteğe bağlı | Uygulama işlevi / eşleştirme | En çok 45 gün |
| Tamamlanmış kadro ve oyun sonucu | İsteğe bağlı | Uygulama işlevi / Ghost rakibi | En çok 45 gün |
| Rastgele anonim kurulum kimliği | İsteğe bağlı | Kötüye kullanım önleme, raporlama ve silme | Aktif kayıtlar ve güvenlik gereksinimi boyunca |
| Ghost raporu ve nedeni | İsteğe bağlı | Güvenlik, moderasyon ve kötüye kullanım önleme | En çok 90 gün |

- Ghost paylaşımı varsayılan olarak kapalıdır.
- Etkinleştirme için kullanım şartı kabulü ve ayrı açık paylaşım rızası gerekir.
- Aktarım HTTPS üzerinden yapılır.
- Kullanıcı ayarlardan tüm Ghost verilerini silebilir ve rızasını geri çekebilir.
- 45 günlük süre dolan Ghost kayıtları günlük sunucu göreviyle D1'den fiziksel olarak silinir.
- Uygulama reklam kimliği, konum, kişi listesi, fotoğraf, ses veya finansal bilgi istemez.

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

## 15 Temmuz 2026 uygulama durumu

- Ghost Club D1 veritabanı üretimden yedeklendi; `0001` ve `0002` migration'ları uygulandı. Üretim Worker'ı `https://copa-life-ghost-clubs.mertonses-copa.workers.dev` adresinde şema sürümü 2 ile çalışıyor; günlük fiziksel silme görevi `17 3 * * *` zamanlamasına bağlı.
- Gizlilik, kullanım şartları ve takedown sayfaları ana web paketindeki logo hakları engeline karışmadan ayrı Cloudflare Pages paketine dağıtıldı. Kalıcı gizlilik politikası URL'si: `https://copa-life-legal.pages.dev/privacy.html`.
- Play yükleme anahtarı depo dışında üretildi. Parola Windows Current User DPAPI ile şifreli tutuluyor; yükleme sertifikası SHA-256 parmak izi `64:4C:43:AC:75:D7:93:87:87:7B:3B:FC:E7:6C:51:CE:98:85:C1:EA:D3:39:38:F7:D8:9D:1F:6B:A5:2C:21:56`.
- İmzalı AAB: `android/app/build/outputs/bundle/release/app-release-signed.aab`. Değişken AAB boyutu ve SHA-256 değeri yalnız `store/android/release-manifest.json` dosyasından okunur; bu belgede kopyalanmaz.
- Android paketindeki Web3Forms iletişim formu ve erişim anahtarı kaldırıldı. Android'deki destek düğmeleri açık web sitesine çıkar; ad, e-posta ve destek mesajı native paket tarafından toplanmaz.
- Destek URL'si resmi Capacitor Browser bileşeniyle Chrome/Custom Tab akışında açılır. Pixel 3a API 34 emülatöründe eklenti kaydı, destek işlevinin eklenti yolunu kullanması ve `https://copa.life/` VIEW intent'i doğrulandı.
- Türkçe/İngilizce mağaza metinleri, Play Console beyan cevapları, 512×512 ikon, 1024×500 feature graphic, dört telefon ve dört tablet ekran görüntüsü `store/android/` altında hazırlandı.
- `copa.life` alan adında henüz MX kaydı yoktur. Kurumsal destek e-postası oluşturulup politika/takedown sayfalarına eklenmeden iletişim hazırlığı tamamlanmış sayılmaz.
- Android 14 / API 34 Pixel 3a emülatöründe temiz kurulum, splash, çevrimdışı açılış, arka plan-devam, geri tuşuyla küçültme ve Ghost'un varsayılan kapalı/çift rızalı olması doğrulandı. Bu test Capacitor 8 global eklenti uyumsuzluğunu ortaya çıkardı; `src/runtime/nativeApp.js` düzeltilip temiz kurulumda yeniden doğrulandı.
- Android candidate workflow'u artık her adayda API 34 emülatörü açar, instrumentation testini çalıştırır, gerçek `life.copa.app` paketini başlatır ve crash/ANR, çalışan süreç, odaklanan Activity ve ekran görüntüsünü otomatik doğrular.
- Ayrı staging D1 veritabanı oluşturuldu ve `0001`/`0002` migration'ları uygulandı. Staging Worker kodu hazırdır; ilk deploy için Cloudflare hesabında Analytics Engine'in etkinleştirilmesi gerekir.
- Haftalık anonim KPI raporu ile 30 dakikalık `profile_open_error` ve Worker 5xx alarmı hazırlandı. Raporların veri okuyabilmesi için production GitHub environment'a ayrı, salt-okunur `CLOUDFLARE_ANALYTICS_TOKEN` eklenmesi gerekir.
- Play Console oturumu açıldı ancak Google hesabında geliştirici hesabı henüz oluşturulmamış. Uygulama kaydı, Data Safety ve kapalı test yüklemesi; hesap türü seçimi, kayıt ücreti, sözleşme ve kimlik doğrulaması tamamlandıktan sonra uygulanabilir.
- Gerçek web armaları proje sahibinin kararıyla web kaynaklarında kalır; lisans kanıtı olmadığı için genel web yayını teknik hak kapısından geçmez. Android ve hukuki sayfa paketi gerçek armaları içermez.
