# AdMob üretim kurulumu — copa.life Android

Kod tarafı GMA Next‑Gen `1.2.1`, UMP `4.0.0` ve Google test kimlikleriyle hazırdır. Aşağıdaki hesaba bağlı değerler tamamlanmadan Play üretim AAB'si oluşturulmaz.

## 1. AdMob uygulaması

1. AdMob'da **Apps → Add app** seç.
2. Platform: **Android**.
3. Mağazada listelendi mi sorusunda henüz yayınlanmadıysa **No** seç.
4. Uygulama adı: **copa.life**.
5. Paket adı: **life.copa.app**.
6. Oluşan `ca-app-pub-…~…` biçimindeki **App ID** değerini kopyala.

## 2. Run sonu reklam birimi

1. Uygulama içinde **Ad units → Add ad unit → Interstitial** seç.
2. Ad: `run_end_interstitial`.
3. Google optimized eCPM açık kalabilir.
4. İlk sürüm için AdMob frequency cap önerisi: kullanıcı başına **10 dakikada en fazla 1 gösterim**.
5. Oluşan `ca-app-pub-…/…` biçimindeki **Ad unit ID** değerini kopyala.

## 2.1. Ödüllü yenileme reklam birimi

1. Uygulama içinde **Ad units → Add ad unit → Rewarded** seç.
2. Ad: `draft_reroll_rewarded`.
3. Ödül miktarı: `1`; ödül adı: `yenileme_hakki`.
4. Her tamamlanan reklam +1 draft yenilemesi verir; ücretsiz 1 hak korunur ve koşu başına en fazla 2 reklam ödülü alınabilir.
5. Oluşan `ca-app-pub-…/…` biçimindeki rewarded **Ad unit ID** değerini kopyala.

Kod tüm istekleri `TEEN` yaş koruması ve en fazla `T` reklam içerik derecesiyle sınırlar; AdMob arayüzünde daha dar bir filtre istersen `PG` seçebilirsin.

Kod yalnız run tamamen bittikten ve sonuç ekranı oluşturulduktan sonra gösterim ister. Reklam hazır değilse oyun beklemez; aynı tamamlanmış run için daha sonra sürpriz gösterim yapılmaz. AdMob ayarına ek olarak uygulama da iki gösterim arasında en az 10 dakika bekler.

## 3. Gizlilik ve mesajlaşma

1. **Privacy & messaging → European regulations** bölümünde copa.life için mesaj oluştur.
2. Google'ın onaylı CMP/UMP mesajını yayımla.
3. Reddetme ve tercihleri yönetme seçeneklerini etkin bırak.
4. UMP, her açılışta rıza bilgisini yeniler. `canRequestAds()` false ise uygulama reklam yüklemez.
5. UMP giriş noktası gerektirdiğinde oyunun Ayarlar menüsünde **REKLAM GİZLİLİĞİ / AD PRIVACY** düğmesi otomatik görünür.

## 4. Kimlikleri release hattına ekleme

Yerel temiz release için:

```powershell
$env:COPA_ADMOB_APP_ID = "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
$env:COPA_ADMOB_INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"
$env:COPA_ADMOB_REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR"
npm run android:release:local
```

GitHub Actions için aynı adlarla iki repository/environment secret ekle:

- `COPA_ADMOB_APP_ID`
- `COPA_ADMOB_INTERSTITIAL_ID`
- `COPA_ADMOB_REWARDED_ID`

Üretim hattı test kimliklerini reddeder. Geliştirme ve emülatör derlemeleri yalnız Google'ın resmî test uygulama ve interstitial kimliklerini kullanır.

## 5. app-ads.txt

1. AdMob'daki yayıncı kimliğini (`pub-…`) kopyala.
2. `app-ads.txt.template` içindeki `PUB_ID` alanını değiştir.
3. Dosyayı `https://copa.life/app-ads.txt` adresinde düz metin ve HTTP 200 olarak yayımla.
4. AdMob'un doğrulamasını bekle.

## 6. Play Console beyanları

- Reklam: **Evet**.
- Advertising ID: **Evet**.
- Data Safety: yaklaşık konum, uygulama etkileşimleri, tanı bilgileri ve cihaz/diğer kimlikler; **toplanır ve Google ile paylaşılır**; amaçlar reklam, analiz ve sahtekârlık önlemedir.
- Uygulama içi satın alma: **Hayır**.

## 7. Yayın testi

- Debug/emülatörde reklam üzerinde **Test Ad** ibaresini doğrula.
- EEA test coğrafyasında UMP mesajını, reddetme/kabul etme akışını ve Ayarlar gizlilik düğmesini doğrula.
- Run sonunda reklam hazırsa açıldığını; kapatılınca sonuç ekranına dönüldüğünü doğrula.
- Reklam yokken, çevrimdışıyken veya rıza alınmadığında oyunun kesintisiz devam ettiğini doğrula.
- Kendi canlı reklamına tıklama; üretim kimliklerini yalnız internal testte test cihazı olarak işaretlenmiş cihazlarla kullan.
