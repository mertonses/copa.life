# AdMob üretim kurulumu — copa.life Android

Kod tarafı GMA Next-Gen `1.2.1`, UMP `4.0.0` ve Google test kimlikleriyle hazırdır. Aşağıdaki hesaba bağlı değerler tamamlanmadan Play'e yüklenebilir üretim AAB'si oluşturulmaz.

## 1. AdMob uygulaması

1. AdMob'da **Apps → Add app** seç.
2. Platform olarak **Android** seç.
3. Uygulama henüz mağazada yayınlanmadıysa mağaza sorusunda **No** seç.
4. Uygulama adı olarak **copa.life**, paket adı olarak **life.copa.app** kullan.
5. Oluşan `ca-app-pub-…~…` biçimindeki **App ID** değerini kaydet.

## 2. Run sonu geçiş reklamı

1. **Ad units → Add ad unit → Interstitial** seç.
2. Adı `run_end_interstitial` yap.
3. İlk sürüm için AdMob frequency cap değerini kullanıcı başına **10 dakikada en fazla 1 gösterim** olarak ayarla.
4. Oluşan `ca-app-pub-…/…` biçimindeki **Ad unit ID** değerini kaydet.

Bu reklam sonuç açılır açılmaz gösterilmez. Oyuncu sonuç ekranında **yeni run başlatma** aksiyonunu seçtiğinde doğal geçiş noktasında istenir. Reklam hazır değilse oyun beklemez. Uygulama ayrıca iki gösterim arasında en az 10 dakika bırakır.

## 3. Ödüllü reklam birimi

1. **Ad units → Add ad unit → Rewarded** seç.
2. Adı `run_rewards_rewarded` yap.
3. Ödül miktarı `1`, ödül adı `oyun_hakki` olsun.
4. Oluşan rewarded **Ad unit ID** değerini kaydet.

Aynı rewarded birimi üç açık ve oyuncu tarafından başlatılan yerleşimde kullanılır:

- Draft yenileme: ücretsiz hak bittikten sonra reklam başına +1 yenileme; run başına en fazla 2.
- Sakatlık tedavisi: sakat bir oyuncuyu iyileştirme; run başına en fazla 1.
- Kart pazarı yenilemesi: turun ücretsiz yenilemesi bittikten sonra +1 yenileme; run başına en fazla 1.

Ödül yalnız Google SDK `onUserEarnedReward` olayını gönderirse verilir. Reklam yüklenemez, kapanır veya yarıda bırakılırsa oyun hakkı tüketmez ve görünür hata/tekrar dene akışı sunar.

Kod tüm istekleri `TEEN` yaş koruması ve en fazla `T` reklam içerik derecesiyle sınırlar. AdMob arayüzünde daha dar bir filtre istenirse `PG` seçilebilir.

## 4. Gizlilik ve mesajlaşma

1. **Privacy & messaging → European regulations** altında copa.life için mesaj oluştur.
2. Google'ın onaylı CMP/UMP mesajını yayımla.
3. Reddetme ve tercihleri yönetme seçeneklerini açık bırak.
4. UMP her açılışta rıza bilgisini yeniler; `canRequestAds()` false ise uygulama reklam yüklemez.
5. UMP gerektirdiğinde Ayarlar menüsündeki **REKLAM GİZLİLİĞİ / AD PRIVACY** düğmesi otomatik görünür.

## 5. Kimlikleri release hattına ekleme

Yerel temiz release için:

```powershell
$env:COPA_ADMOB_APP_ID = "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
$env:COPA_ADMOB_INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"
$env:COPA_ADMOB_REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/RRRRRRRRRR"
npm run android:release:local
```

CI ortamına aynı adlarla üç secret eklenir:

- `COPA_ADMOB_APP_ID`
- `COPA_ADMOB_INTERSTITIAL_ID`
- `COPA_ADMOB_REWARDED_ID`

Üretim hattı eksik, biçimsiz veya Google test kimliği olan üç değeri de reddeder. Debug/emülatör derlemeleri yalnız Google'ın resmî test kimliklerini kullanır.

## 6. app-ads.txt

1. AdMob yayıncı kimliğini (`pub-…`) kopyala.
2. `app-ads.txt.template` içindeki `PUB_ID` alanını değiştir.
3. Dosyayı `https://copa.life/app-ads.txt` adresinde düz metin ve HTTP 200 olarak yayımla.
4. AdMob doğrulamasını bekle.

## 7. Play Console beyanları

- Reklam: **Evet**.
- Advertising ID: **Evet**.
- Data Safety: yaklaşık konum, uygulama etkileşimleri, tanı bilgileri ve cihaz/diğer kimlikler Google Mobile Ads kapsamında toplanabilir/paylaşılabilir; amaçlar reklam, analiz ve sahtekârlık önlemedir.
- Uygulama içi satın alma: **Hayır**.

## 8. Yayın testi

- Debug/emülatörde reklam üzerinde **Test Ad** ibaresini doğrula.
- EEA test coğrafyasında UMP kabul, ret ve tercihleri yönetme akışlarını doğrula.
- Üç ödüllü yerleşimi ayrı ayrı tamamla; ödülün yalnız tamamlanan reklamdan sonra ve belirtilen run sınırında verildiğini doğrula.
- Sonuç ekranında kendiliğinden reklam çıkmadığını; yeni run aksiyonunda reklam varsa gösterildiğini doğrula.
- Reklam yokken, çevrimdışıyken veya rıza alınmadığında oyunun kesintisiz devam ettiğini doğrula.
- Canlı reklamlara tıklama; üretim kimliklerini yalnız internal testte test cihazı olarak işaretlenmiş cihazlarla kullan.
