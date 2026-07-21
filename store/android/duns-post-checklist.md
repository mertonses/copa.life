# Play kuruluş doğrulaması sonrası yayın sırası

## 1. Kuruluş hesabı — tamamlandı

- D‑U‑N‑S, yasal kuruluş bilgileri, yetkili temsilci ve alan adı Play Console'da doğrulandı.
- Resmî kamuya açık destek adresi: `support@copa.life`.
- Gizlilik sayfasındaki geliştirici adı, Play Console'daki doğrulanmış yasal adla birebir karşılaştırılacak.

## 2. Uygulama kaydı

- Varsayılan dil: Türkçe.
- Oyun / Ücretsiz seçimlerini yap.
- Paket adı: `life.copa.app`.
- Play App Signing'i etkinleştir.
- Mağaza adı, kısa açıklama ve tam açıklamayı `listing-tr.md` dosyasından gir; `listing-en.md`, `listing-es.md`, `listing-de.md` ve `listing-it.md` ile dört yerelleştirmeyi ekle.

## 3. Görseller

- `graphics/app-icon-512.png`
- Türkçe varsayılan giriş için `graphics/feature-graphic.jpg`, `graphics/phone/` ve `graphics/tablet/`
- Dört ek dil için `graphics/localized/<locale>/` altındaki feature graphic, beş adet 1080×1920 telefon ve beş adet 1920×1080 tablet görseli
- Yüklemeden önce `asset-manifest.json` boyut ve SHA‑256 değerlerini doğrula.

## 4. App content

- `play-console-declarations.md` dosyasındaki App access, Ads, Target audience, IARC, UGC, hesap ve Data Safety cevaplarını gir.
- Gizlilik politikası URL'sini ekle.
- `support@copa.life` posta kutusuna dışarıdan gerçek bir test iletisi gönder ve yanıt alabildiğini doğrula.
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
