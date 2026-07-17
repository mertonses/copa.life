# Final simülasyonu doğrulama ve geliştirme yolu

## 17 Temmuz 2026 itibarıyla tamamlanan temel

- Görsel motorun sekans ve şut çözümüyle ortak kullanılan DOM'suz `copa-final-core-v2` çekirdeği.
- Aynı seed ile byte düzeyinde tekrar üretilebilir sonuç ve doğrulanabilir `CFS2` paylaşım kodu.
- 10.000 gerçek çekirdek maçıyla güç farkı, gol, şut, xG, kart, kurtarış, uzatma ve penaltı kalibrasyonu.
- Yedi aynı-seed A/B senaryosu: yüklen, önde bas, sakin, skoru koru, kanat kartı, kontra kartı ve takım konuşması.
- Final süreç kapanması checkpoint'i: dakika, skor, RNG, karar geçmişi, oyuncu/top durumu, istatistik ve audit.
- Sonuç ekranında açılabilir simülasyon denetimi ve kişisel isim taşımayan tekrar kodu.
- Yalnız web'de çalışan, seed veya kimlik göndermeyen `schema_version: 2` toplu final telemetrisi.

## Kalibrasyon referansı

10.000 maçlık sabit örneklemde:

| Ölçü | Sonuç |
| --- | ---: |
| Eşit güçte ev tarafı kazanma | %49,9 |
| Güçlü rakibe karşı kazanma | %19,9 |
| Güçlü kullanıcı tarafı kazanma | %80,2 |
| Gol / maç | 2,90 |
| Şut / maç | 17,20 |
| xG / maç | 3,01 |
| Uzatma | %22,9 |
| Penaltı | %9,4 |
| Sarı kart / maç | 1,57 |
| Kırmızı kart / maç | 0,02 |

Bu değerler ürün hedefidir; tekil maç garantisi değildir. Model değişikliğinde otomatik eşikler sapmayı engeller.

## Sonraki geliştirme sırası

1. **Penaltı checkpoint'i:** süreç tam penaltı vuruşu sırasında kapanırsa atış sırası, yönler ve seri skoru aynı noktadan dönmeli.
2. **Görsel/çekirdek yakınsaması:** karar, pas ve disiplin çözümünün kalan kısmını ortak çekirdeğe taşıyarak görsel motor ile Monte Carlo arasındaki farkı azalt.
3. **Gerçek maç replay'i:** olay zaman çizelgesini görsel olarak salt okunur yeniden oynatan, ileri/geri sarılabilir replay ekranı ekle.
4. **Kalibrasyon panosu:** haftalık anonim model sürümü, güç bandı, taktik ve bitiş türü dağılımlarını eşiklerle karşılaştır.
5. **Erişilebilirlik:** audit ve replay ekranına ekran okuyucu özeti, klavye odağı ve azaltılmış hareket modu ekle.
6. **Fiziksel cihaz kapısı:** düşük seviye Android'de 1×/8× kare süresi, ısı, bellek ve süreç-kapanması ölçümü; bu adım fiziksel cihaz geldiğinde tamamlanacak.

## Değişiklik kapıları

- `npm run check:finalsim:stats`
- `npm run check:finalsim:ab`
- `npm run check:persistence`
- `npx playwright test tests/final-sim-ui.test.ts --project=mobile-chromium`
- `npm run check:parity`

Bu kapılar geçmeden final model sürümü yükseltilmez ve mağaza adayı üretilmez.
