# copa.life Android yayın paketi

## Play Console'a yüklenecekler

| Alan | Kaynak |
| --- | --- |
| Uygulama oluştur | `application-create.md` |
| Türkçe mağaza metni | `listing-tr.md` |
| İngilizce mağaza metni | `listing-en.md` |
| İspanyolca mağaza metni | `listing-es.md` |
| Almanca mağaza metni | `listing-de.md` |
| İtalyanca mağaza metni | `listing-it.md` |
| İkon | `graphics/app-icon-512.png` |
| Türkçe görseller | `graphics/feature-graphic.jpg`, `graphics/phone/`, `graphics/tablet/` |
| Diğer dil görselleri | `graphics/localized/<locale>/` |
| Görsel alt metinleri | `asset-alt-text.md` |
| App Content / Data Safety | `play-console-declarations.md` |
| Sürüm notları | `whatsnew/` |
| Terfi kontrolü | `promotion-checklist.md` |
| Hazırlık ve eksikler | `release-readiness-report.md` |

## Yerelleştirme klasörleri

- `tr-TR`: Türkçe
- `en-US`: İngilizce (ABD)
- `es-ES`: İspanyolca (İspanya)
- `de-DE`: Almanca (Almanya)
- `it-IT`: İtalyanca (İtalya)

Her yerelleştirme klasöründe bir 1024×500 feature graphic, beş 1080×1920 telefon ve beş 1920×1080 tablet görseli bulunur.

Google Play Games on PC için varsayılan ve beş yerel klasörde ayrıca `play-games-pc/` bulunur: 600×400 şeffaf logo, metinsiz 1920×1080 kapak ve beş 1920×1080 ekran görüntüsü. `npm run assets:store:pc` ile yeniden üretilir.

## Yeniden üretme ve doğrulama

```powershell
npm run assets:store
npm run check:android:store
npm run assets:store:localization-packs
npm run android:notes:stamp
npm run check:android:release
```

`assets:store`, son Android web artifact'ini derler ve sabit seed ile beş dilin görsellerini yeniden alır. `asset-manifest.json`, her dosyanın ölçüsünü, boyutunu ve SHA-256 değerini taşır. `assets:store:localization-packs`, Play Console'da henüz bulunmayan `es-ES`, `de-DE` ve `it-IT` girişlerini `outputs/google-play-localizations/` altında kopyala-yapıştır metinleri ve yüklemeye hazır görsellerle paketler.

## Not

İmzalı AAB yolu ve hash'i yalnız `release-manifest.json` dosyasından okunmalıdır. Eski bir AAB, yeni mağaza görselleri hazır olsa bile production'a gönderilmemelidir.
