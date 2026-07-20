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
- Drafttaki her üçlü en fazla bir Gizli Oyuncu içerir. Nihai sonuç sabit fiyatla
  karşılaştırılan piyasa değerinden `gem`, `fair` veya `bust` olarak türetilir.
- Gizli Oyuncu scout sinyali sonuçtan ayrı ve kontrollü biçimde hatalı üretilir;
  metin oyun durumuna yazılmaz, aktif dilde render edilir. İmzalama geri alınamaz
  ve oyuncunun mevcut trait bilgisi reveal sırasında korunur.
- Otomatik kadro doldurma doğrudan oyuncu havuzunu atlayamaz; manuel draft ile
  aynı aday üretimi, bütçe, gizli oyuncu ve deadline kurallarını kullanır.

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

## Oyuncu verisi ve transfer değeri

- Oyuncu tuple şeması `[ad, güç, rol, kulüp, yaş, yerli, piyasa ipucu, doğal
  mevki, potansiyel, lig seviyesi]` olmak üzere 10 alandır.
- `güç` bugünkü saha katkısını, `potansiyel` gelişim tavanını ifade eder.
  Piyasa değeri tek başına mevcut güce dönüştürülmez. Wonderkid gelişimi
  oyuncunun potansiyelini aşamaz.
- Doğal mevki draftta seçilen slot tarafından değiştirilemez. Slot uyumsuzluğu
  doğal mevki ile oynanan mevki arasındaki ceza tablosundan hesaplanır.
- Draft bonservisi tam sayı milyon avrodur; güç eğrisine ek olarak yaş ve
  potansiyel primi içerir. Aynı güçte genç/yüksek potansiyelli oyuncu prime
  oyuncudan, prime oyuncu da ileri yaştaki oyuncudan daha pahalıdır.
- Birinci lig oyuncuları draftta daha sık görünür; düşük güçlü akademi
  oyuncuları ilk takım adaylarını bastıramaz.
- İlk 11'deki en güçlü iki oyuncu, 86 üzerindeki etkin güçleri oranında ve
  toplam `+2.5` ile sınırlı bir yıldız etkisi üretir.
- Ülke elit bantları `check:playerbalance` ile korunur: Türkiye `4-6`,
  İngiltere `10-14`, İspanya `7-10`, İtalya ve Almanya `4-7` adet `90+`;
  Japonya'da `90+` yoktur ve güç tavanı `82`dir.
