# Copa Life — iPhone ve iPad test kurulumu

Bu pakette iOS 15 ve üzeri için hazır Capacitor/Xcode projesi bulunur. Fiziksel bir
iPhone veya iPad'e kurulabilen uygulama Apple tarafından imzalanmak zorunda olduğu
için Windows üzerinde doğrudan kurulabilir bir IPA üretilemez.

## Fiziksel cihazda test

1. Paketi macOS üzerinde açın. Paket güncel web dosyalarıyla eşitlenmiş Xcode
   projesini içerir.
2. `ios/App/App.xcodeproj` dosyasını Xcode 26 ile açın.
3. Xcode'da **App > Signing & Capabilities** bölümünden kendi Apple Developer
   takımınızı seçin. Kişisel Apple ID kullanıyorsanız Xcode benzersiz bir bundle ID
   isteyebilir.
4. iPhone veya iPad'i Mac'e bağlayın, hedef cihaz olarak seçin ve **Run** düğmesine
   basın. İlk kurulumda cihazın Geliştirici Modu'nu etkinleştirmek gerekebilir.

Kaynak kodda ayrıca değişiklik yapacaksanız tam depoda Node.js 22 ile `npm ci` ve
ardından `npm run ios:sync` çalıştırarak Xcode projesini yeniden eşitleyin.

Ücretsiz Apple ID ile imzalanan geliştirme kurulumları süreli olabilir. Kalıcı
TestFlight dağıtımı için ücretli Apple Developer üyeliği, App Store Connect kaydı
ve dağıtım sertifikaları gerekir.

## Simülatör

Ana dalın iOS doğrulama iş akışı macOS üzerinde hem iPhone hem iPad simülatöründe
çalışan imzasız `App.app` çıktısını üretir. Bu çıktı yalnızca Apple Silicon/Intel
Mac'teki iOS Simulator'a kurulabilir; fiziksel cihaza kurulamaz.

## Kurulumsuz hızlı test

Safari'den `https://copa.life` adresini açıp **Paylaş > Ana Ekrana Ekle** seçeneğiyle
web/PWA sürümünü iPhone veya iPad'de hemen test edebilirsiniz.
