# D‑U‑N‑S geldikten sonra Play yayın sırası

## 1. Kuruluş hesabı

- D‑U‑N‑S numarasını gir.
- Play'deki yasal kuruluş adı ve adresini Dun & Bradstreet kaydıyla karakter karakter eşleştir.
- Yetkili temsilcinin resmî kimliğini ve istenen kuruluş belgesini yükle.
- Kuruluş alan adına bağlı iletişim e-postasını ve telefonu doğrula.
- `copa.life` web sitesi sahiplik doğrulamasını tamamla.
- Kamuya açık geliştirici e-postası ve telefonunun yayımlanmasını onayla.

## 2. Uygulama kaydı

- Varsayılan dil: Türkçe.
- Oyun / Ücretsiz seçimlerini yap.
- Paket adı: `life.copa.app`.
- Play App Signing'i etkinleştir.
- Mağaza adı, kısa açıklama ve tam açıklamayı `listing-tr.md` dosyasından gir; İngilizce yerelleştirmeyi `listing-en.md` ile ekle.

## 3. Görseller

- `graphics/app-icon-512.png`
- `graphics/feature-graphic.jpg`
- `graphics/phone/` altındaki dört adet 1080×1920 ekran görüntüsü
- `graphics/tablet/` altındaki dört adet 1920×1080 geniş ekran görüntüsü
- Yüklemeden önce `asset-manifest.json` boyut ve SHA‑256 değerlerini doğrula.

## 4. App content

- `play-console-declarations.md` dosyasındaki App access, Ads, Target audience, IARC, UGC, hesap ve Data Safety cevaplarını gir.
- Gizlilik politikası URL'sini ekle.
- Destek/takedown posta kutusuna gerçek bir test iletisi gönder ve yanıt alabildiğini doğrula.
- Kurumsal geliştirici adı ve e-postasını gizlilik/takedown sayfalarında yayımla.

## 5. Kapalı test

- Son imzalı AAB'yi Internal testing kanalına yükle.
- Play'in otomatik pre-launch raporunu bekle.
- En az bir gerçek telefon ve bir tablet oranında temiz kurulum, çevrimdışı açılış, geri tuşu, yaşam döngüsü, Ghost rızası, bildir/gizle ve veri silmeyi doğrula.
- Data Safety özeti ile test edilen AAB'nin ağ davranışını son kez karşılaştır.

## 6. Üretim

- Ülke dağıtımı, içerik derecesi ve mağaza görünümünü önizle.
- Hak/marka ayrımı için Android görsellerinde yalnız jenerik armaların bulunduğunu kontrol et.
- İlk üretim sürümünü kademeli dağıt; çökme/ANR ve politika bildirimlerini izle.
