# copa.life iOS / App Store hazırlık durumu

Son güncelleme: 17 Temmuz 2026

## Teknik sözleşme

- Bundle ID: `life.copa.app`
- İlk sürüm: `1.0.0 (1)`
- Minimum sürüm: iOS/iPadOS 15
- Hedef: iPhone + iPad
- Yönler: iPhone'da dikey ve iki yatay yön; iPad'de dört yön
- Xcode: App Store yüklemesi için 26+
- Paket: Capacitor 8, Swift Package Manager
- Uzak runtime URL yok; oyun uygulama paketinden açılır.
- HTTPS dışı trafik ve ATS istisnası yoktur.

## UI ve oynanış

- Safe area, Dynamic Island ve Home indicator boşlukları CSS/native yapılandırma ile korunur.
- Birincil kontroller en az 44 pt hedefe göre tasarlanmıştır.
- Dikey ve yatay telefon, dar iPad pencere boyutları ve tam iPad ekranı desteklenir.
- Arka plana geçiş ve uygulama kapanışı öncesi draft/final checkpoint alınır.
- Haptik geri bildirim isteğe bağlı ve varsayılan kapalıdır.
- Pil tasarrufu, akıllı maç hızı ve seçim onayı isteğe bağlıdır.
- iOS paketi Android ile aynı oyun motorunu ve denge modelini kullanır.

## Haklar ve içerik

- Gerçek kulüp armaları ve ülke bayrak dosyaları iOS paketine alınmaz.
- Takımlar jenerik, renkli kısaltma armalarıyla gösterilir.
- Oyuncu fotoğrafı kullanılmaz.
- Ham 1–20 özellikler, sakatlık yatkınlığı ve medikal eğilimler pakette yoktur.
- Oyuncu değerlendirmeleri altı adet 0–100 copa.life oyun boyutudur.
- Resmî turnuva markaları yerine ülke bazlı jenerik kupa adları kullanılır.
- Uygulama ve mağaza metni resmî onay/sponsorluk iddiası içermez.
- Takım ve oyuncu adlarına ilişkin nihai içerik hakları beyanı, hak envanteri ve yayın ülkelerinin hukukuna göre hesap sahibi tarafından onaylanmalıdır.

## Gizlilik ve UGC

- Ghost Club varsayılan kapalıdır; kullanım şartı ve ayrı paylaşım rızası gerekir.
- Uygulama hesabı oluşturulmaz.
- Uygulama içinden tüm Ghost verileri silinebilir.
- Ghost kayıtları en çok 45, raporlar en çok 90 gün tutulur ve fiziksel olarak silinir.
- Kulüp adı filtresi, bildirme, bir daha göstermeme, `review`/`blocked`, tekrar eden ihlal engeli ve yayınlanmış takedown kanalı vardır.
- iOS privacy manifest, isteğe bağlı Ghost kullanımında `Gameplay Content` ve anonim `Device ID` sınıflarını yalnız `App Functionality`, ilişkilendirilmemiş ve takipsiz olarak beyan eder.
- Native paket web analitiği, reklam SDK'sı, ATT, IDFA, IAP veya abonelik içermez.
- Kalıcı gizlilik URL'si: `https://copa-life-legal.pages.dev/privacy.html`
- Destek/takedown: `https://copa-life-legal.pages.dev/takedown.html`

## Üyelik ve mağaza

- Bireysel Apple Developer hesabında D‑U‑N‑S gerekmez; mağazada hesap sahibinin yasal adı satıcı olarak görünür.
- Organizasyon adının görünmesi için tüzel kişi ve D‑U‑N‑S ile organizasyon üyeliği gerekir.
- Apple Developer Program yıllık üyeliği, iki faktörlü Apple Account ve kimlik doğrulama gerekir.
- AB'de dağıtım yapılacaksa DSA trader durumu App Store Connect'te doğrulanmalıdır; aksi halde AB ülkeleri ilk dağıtımdan çıkarılmalıdır.
- Güney Kore gibi ek oyun sınıflandırması isteyen bölgeler, yerel numara alınana kadar ilk dağıtımdan çıkarılabilir.

## Mac/fiziksel cihaz kapıları

- Xcode 26 ile simulator build ve test
- En az bir güncel iPhone'da temiz kurulum, safe area, arka plan/devam, çevrimdışı açılış ve Ghost silme
- En az bir iPad veya iPad simulatoründe Split View/pencere yeniden boyutlandırma
- App Privacy Report ile ağ alanları ve privacy manifest incelemesi
- Archive validation, TestFlight internal test ve App Review gönderimi
