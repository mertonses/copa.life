# copa.life Android derleme rehberi

Web ve Android'in tek kaynak/parite yapısı, CI aday üretimi ve Play dağıtım akışı için `docs/cross-platform-release.md` belgesini esas alın.

## Proje ayarları

- Uygulama kimliği: `life.copa.app`
- Uygulama adı: `copa.life`
- Minimum SDK: 24
- Compile / target SDK: 36
- Native kabuk: Capacitor 8
- Gerekli Java kaynak düzeyi: JDK 21

Gerçek kulüp armaları, Patreon bağlantısı/varlığı ve ödeme SDK'ları Android paketine alınmaz. Reklam için yalnız GMA Next‑Gen 1.2.1, UMP 4.0.0 ve yerel `CopaAds` köprüsü paketlenir. Run sonu reklamında aynı run tekrarını ve 10 dakikalık yerel gösterim aralığını köprü engeller. `npm run check:android` bu sınırı derlemeden önce doğrular.

## Web paketini native projeye aktarma

```powershell
npm ci
npm run profiles:build-copa
npm run android:sync
```

`android:sync` sırasıyla Android'e özel `dist-android` paketini üretir, risk kontrollerini çalıştırır ve Capacitor native varlıklarını günceller.

## Yerel Gradle derlemesi

JDK 21 ve Android SDK yollarını kendi kurulumunuza göre ayarlayın:

```powershell
$env:JAVA_HOME = "C:\path\to\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME

Set-Location android
.\gradlew.bat :app:assembleDebug
.\gradlew.bat :app:bundleRelease
```

Debug ve kirli aday derlemeler Google'ın test AdMob kimliklerini kullanır. Play'e gidecek temiz release öncesinde gerçek kimlikleri ortam değişkeni olarak verin:

```powershell
$env:COPA_ADMOB_APP_ID = "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
$env:COPA_ADMOB_INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"
npm run android:release:local
```

Çıktılar:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Depodaki release yapılandırması bir imzalama sırrı içermez. Play'e yüklenecek AAB için Play App Signing/yükleme anahtarı ayrı ve gizli biçimde yapılandırılmalıdır. Keystore, parola veya servis hesabı anahtarı depoya eklenmemelidir.

Bu çalışma alanında ilk yükleme anahtarı oluşturulduktan sonra imzalı paketi yeniden üretmek için:

```powershell
.\tools\sign-android-release.ps1
```

Betik, repo dışında tutulan yükleme anahtarını ve Windows Current User DPAPI ile korunan parola dosyasını kullanır; imzalı çıktıyı `app-release-signed.aab` adıyla üretir ve imzayı doğrular. Anahtar ile parola dosyasının şifreli çevrimdışı yedeği ayrıca tutulmalıdır; yalnız DPAPI dosyasına güvenmek Windows profili kaybında yükleme anahtarını kullanılamaz hâle getirebilir.

## Yayın öncesi doğrulama

```powershell
npm test
npm run test:ci --prefix playtest/runner
npm run check --prefix services/ghost-club-api
npm audit
npm run android:sync
```

Ardından gerçek cihaz veya kapalı test kanalında şu akışlar manuel denenmelidir:

- İlk açılış, splash ve durum çubuğu.
- Geri tuşuyla profil/modal kapatma ve uygulamayı küçültme.
- Arka plana geçişte oyunun kaydedilmesi ve geri dönüşte devam.
- Çevrimdışı temel oyun.
- Ghost özelliğinin varsayılan kapalı olması, çift rıza, raporlama ve veri silme.
- EEA test coğrafyasında UMP mesajı, Ayarlar'daki reklam gizliliği girişi ve run sonunda test geçiş reklamı.
- Küçük telefon, uzun ekran ve tablet yerleşimleri.
