# copa.life oyun modeli sözleşmesi

Bu belge web, Android ve iOS paketlerinin aynı oynanış kurallarını ve sürüm
sözleşmesini kullanmasını tanımlar. Kullanıcı arayüzü platforma göre değişebilir;
sonuç üreten kurallar değişemez.

## Temel kurallar

- Kadro Gücü, ilk 11'in etkin gücü ile stil, kart, eşleşme, risk, moral,
  hava, kaptan ve `-5…+5` kimya katkılarının birleşimidir.
- Yüksek güç olasılık avantajıdır; tekil maç garantisi değildir.
- Başkan Güveni olayları ve aktif borç eşiğini etkiler. Kovulma yalnızca
  güncel başkan borç eşiği aşıldığında gerçekleşir.
- Normal kupa maçları ve final aynı DOM'suz maç çekirdeğinin sonuç
  sözleşmesini kullanır. Normal maç görselsiz; final görsel oynatımlıdır.
- Uzatma Altın Gol kuralıyla oynanır. Normal turlardaki düzenleme beraberliği
  doğrudan penaltıya taşır; final beraberliği Altın Gol ve gerekirse penaltıyla
  çözer.
- Ghost rakibi almak, kullanıcının kendi kulübünü paylaşmasından ayrıdır.
  Paylaşım açık rıza ister; eşleşme alınması tek başına veri yüklemez.

## Sürüm sözleşmesi

- `game_version`: kullanıcıya görünen oynanış paketi uyumluluğu.
- `data_version`: oyuncu/kulüp veri paketinin uyumluluğu.
- `simulation_version`: skor ve olay üreten çekirdeğin ana sürümü.
- `card_schema_version`: kart kimlikleri ve anlamlarının uyumluluğu.
- `analytics schema_version`: anonim ürün olaylarının alan sözleşmesi.

Ghost eşleşmesi aynı `simulation_version` ana sürümünde kalmalıdır. Küçük
uygulama sürümü değişiklikleri tek başına Ghost havuzunu bölmemelidir. Replay
ve checkpoint kayıtları model sürümünü taşır; uyumsuz kayıt sessizce farklı
kurallarla oynatılmaz.

## Anonim denge ölçümü

Üretim telemetrisi kişi, oyuncu adı, kulüp adı, seed, kurulum kimliği veya
serbest metin göndermez. Yalnızca şu kategorik alanlar ölçülebilir:

- ülke, tur, sonuç ve güç farkı bandı;
- formasyon, stil ve başkan kimliği;
- ödül seçimi ve kart türü;
- kasa bandı, bitiş türü ve model sürümü;
- Ghost karşılaşmasının gerçekleşip gerçekleşmediği.

Global Privacy Control veya Do Not Track sinyali varsa ürün telemetrisi
çalışmaz. Native mağaza paketlerinde bu web telemetrisi kapalıdır.

## Denge kabul ölçütleri

- Güç farkı arttıkça galibiyet oranı monoton artmalıdır.
- Denk maçlarda taraf avantajı yaklaşık `%50` çevresinde kalmalıdır.
- Skor dağılımı güç farkı büyüdüğünde yapay biçimde patlamamalıdır.
- Başkanlar, oyuncu gücü ve deneyim bandı kontrol edildiğinde yakın
  şampiyonluk oranlarına; farklı risk ve oynanış profillerine sahip olmalıdır.
- Bir galibiyet ödülü yeterli örneklemde seçimlerin `%65`inden fazlasını
  tek başına almamalıdır; aksi durumda dominant seçenek incelemesi gerekir.
- Final shout'ları maç durumuna bağlı avantaj üretmeli; tüm maç boyunca
  koşulsuz en iyi seçim olmamalıdır.
