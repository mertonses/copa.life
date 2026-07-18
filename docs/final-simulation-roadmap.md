# Final simülasyonu doğrulama ve geliştirme yolu

## 18 Temmuz 2026 itibarıyla tamamlanan temel

- Görsel motorun sekans ve şut çözümüyle ortak kullanılan DOM'suz `copa-final-core-v3` çekirdeği.
- Aynı seed ile byte düzeyinde tekrar üretilebilir sonuç ve doğrulanabilir `CFS3` paylaşım kodu.
- 10.000 gerçek çekirdek maçıyla güç farkı, gol, şut, xG, kart, kurtarış, uzatma ve penaltı kalibrasyonu.
- On bir aynı-seed A/B senaryosu: dört temel taktik, dört 12 dakikalık hamle, kanat/kontra kartı ve takım konuşması.
- Maç içi hamleler 12 oyun dakikası sürer, 12 dakika bekleme ister ve final başına en fazla üç kez kullanılabilir.
- Yüklen ve önde bas gerideyken; skoru koru öndeyken daha verimlidir. Koşulsuz, kalıcı bir en iyi seçenek yoktur.
- Final süreç kapanması checkpoint'i: dakika, skor, RNG, karar geçmişi, oyuncu/top durumu, istatistik ve audit.
- Sonuç ekranında açılabilir simülasyon denetimi ve kişisel isim taşımayan tekrar kodu.
- Yalnız web'de çalışan, seed veya kimlik göndermeyen `schema_version: 3` toplu final telemetrisi.

## Kalibrasyon referansı

10.000 maçlık sabit örneklemde:

| Ölçü | Sonuç |
| --- | ---: |
| Eşit güçte ev tarafı kazanma | %50,9 |
| Güçlü rakibe karşı kazanma | %19,2 |
| Güçlü kullanıcı tarafı kazanma | %81,0 |
| Gol / maç | 2,49 |
| Şut / maç | 14,97 |
| xG / maç | 2,59 |
| Uzatma | %25,0 |
| Penaltı | %12,3 |
| Sarı kart / maç | 1,52 |
| Kırmızı kart / maç | 0,01 |

Bu değerler ürün hedefidir; tekil maç garantisi değildir. Model değişikliğinde otomatik eşikler sapmayı engeller.

## Sonraki geliştirme sırası

1. **Görsel/çekirdek yakınsaması:** oyuncu hareketi dışında kalan karar ve olay çözümünü ortak çekirdeğe taşımayı sürdür.
2. **Durum bazlı üretim kalibrasyonu:** anonim örneklem yeterli olduğunda skor/dakika bağlamında hamle tercihlerini ve sonuçlarını karşılaştır.
3. **Erişilebilirlik derinliği:** canlı taktik durumunu ekran okuyucuya daha ayrıntılı ve rahatsız etmeyen biçimde aktar.
4. **Fiziksel cihaz kapısı:** düşük seviye Android'de 1×/8× kare süresi, ısı, bellek ve süreç-kapanması ölçümü; bu adım fiziksel cihaz geldiğinde tamamlanacak.

## Değişiklik kapıları

- `npm run check:finalsim:stats`
- `npm run check:finalsim:ab`
- `npm run check:persistence`
- `npx playwright test tests/final-sim-ui.test.ts --project=mobile-chromium`
- `npm run check:parity`

Bu kapılar geçmeden final model sürümü yükseltilmez ve mağaza adayı üretilmez.
