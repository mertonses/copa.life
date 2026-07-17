# copa.life iOS build rehberi

## Tek kaynak ilkesi

Web, Android ve iOS aynı `index.html`, `src/` ve `assets/` oyun kaynağından üretilir. iOS için ayrı oynanış motoru tutulmaz. `npm run build:ios`, mağazaya uygun içerik filtresini uygulayıp `dist-ios` üretir; gerçek armalar/bayrak görselleri, Patreon, gömülü iletişim formu, web analitiği ve teşhis araçları bu pakete alınmaz.

## Windows'ta yapılabilenler

```bash
npm ci
npm run build:ios
npm run check:ios
npm run ios:sync
npm run check:parity
```

Bu komutlar iOS web paketini ve Xcode kaynak projesini hazırlar. Windows üzerinde iOS Simulator, imzalı `.ipa`, archive veya App Store yüklemesi üretilemez.

## Mac gereksinimi

28 Nisan 2026'dan beri App Store Connect yüklemeleri Xcode 26 veya sonrası ve iOS/iPadOS 26 SDK ile üretilmelidir. Mac'te:

```bash
npm ci
npm ci --prefix services/ghost-club-api
npm ci --prefix playtest/runner
npm run ios:doctor
npm run ios:sync
npm run check:ios:readiness
```

Ardından `ios/App/App.xcodeproj` Xcode 26 ile açılır. Önce iPhone ve iPad simulator testleri, sonra gerçek cihaz testi yapılır. App Store archive yalnız temiz `main` kaynağından ve artırılmış `release/ios-version.json` ile alınır.

## Sürüm yönetimi

- Görünen sürüm: `marketingVersion`
- Her yüklemede artması gereken değer: `buildNumber`
- Tek kaynak: `release/ios-version.json`

```bash
npm run ios:version
npm run ios:version:patch
```

`ios:sync`, Xcode proje sürümünü, bundle kimliğini, minimum iOS sürümünü, privacy manifest kaydını, Swift Package yollarını ve mağaza görsellerini yeniden doğrular.

## Yerel içerik güncellemeleri

Web oynanışındaki her değişiklik aynı commit'ten `dist-ios` içine girer. Mağazadaki kurulu uygulamanın JavaScript oyun motorunu uzaktan ve sessizce değiştiren bir live-update sistemi kullanılmaz. Oynanış değişiklikleri yeni App Store build'i olarak yayınlanır; sunucu API'leri en az bir mobil destek penceresi boyunca geriye uyumlu tutulur.
