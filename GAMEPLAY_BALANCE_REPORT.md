# Copa Life ve Copa Arena Denge Raporu

Tarih: 3 Ağustos 2026

## Sonuç

Maç çekirdeği güç farkına monoton tepki veriyor, eşit güçte taraf tutmuyor ve taktik kararlarını ölçülü tutuyor. Oyuncuyu gizlice kazandıran/kaybettiren seri düzeltmesi yok. Bu sayede yenilgi; güç, hazırlık, takım konuşması, taktik ve maç içi varyansın açıklanabilir birleşimi olarak kalıyor.

## Ölçüm özeti

- Normal maç: yedi güç bandında toplam 28.000 örnek. Eşit güçte ev/deplasman galibiyeti %36,88 / %37,83; beraberlik %25,30.
- Final çekirdeği: 10.000 maç. Güç farkı büyüdükçe ev sahibi kazanma oranı kesintisiz biçimde %13,29 → %34,14 → %50,72 → %70,16 → %87,69 ilerliyor.
- Maç gerçekçiliği: maç başına 2,65 gol, 15,40 şut, 2,73 xG, 1,51 sarı kart; kırmızı kart %1,42, uzatma %19,93 ve penaltı %6,12.
- Turnuva: güç 64/72/80/88/96 için şampiyonluk %0,14 / %0,43 / %5,57 / %22,14 / %49,14. Güç artışı her basamakta gerçek ve monoton bir avantaj sağlıyor.
- Stil matrisi: güç 80 ile son doğrulama örnekleminde beş stilin gruptan çıkma aralığı %76–%86, şampiyonluk aralığı %3,61–%6,11. Evrensel “en iyi stil” yok.
- Copa Arena: 6.400 self-play maçı; 3,06 gol/maç, %24,8 beraberlik ve sonuçlanan maçlarda %50,3 ev sahibi payı. 6.400 draftın tamamı farklı.

## Kararların anlamı

- Hücum emri şut ve xG üretirken savunmayı açıyor; tam maç kullanımında kazanma farkı +3,6 puanla sınırlı.
- Pres top kazanımını artırıyor fakat kart riskini yükseltiyor.
- Sakin oyun topa sahip olmayı ve disiplini iyileştiriyor; hücumu sıfırlamıyor.
- Skoru koruma yenilen golü düşürüyor fakat hücum hacminden vazgeçiyor.
- Kanat ve kontra kartları hücum yolunu değiştiriyor; doğrudan “satın al-kazan” etkisi üretmiyor.
- Olumlu takım konuşması anlamlı ama sınırlı: kazanma oranına yaklaşık +5,4 puan.

## Kart ekonomisi

Koddan üretilen tam 37 kart tablosu `CARD_BALANCE.md` dosyasındadır. Rapor 13 risk kartı, 19 olay/tek kullanımlık kart ve iki yüksek kaldıraçlı kart tespit ediyor.

- Güç kartları tek başına ekonomiyi ezmiyor: fiyat tabanı €2M, kart yığınında azalan getiri ve final risk tavanı uygulanıyor.
- COMMON, öngörülebilir ve daha ucuz yol; DARK daha güçlü sonuç karşılığında güven, sakatlık, nakit veya final cezası taşıyor.
- Mükâfat sözleşmesi doğrulandı: COMMON €6M/+5 ve edinimde %18 güven riski; DARK €8M/+8, kesin güven −1 ve finalde −8.
- Son Dans ve diğer final kartları artık raporda 7. tur örneklenerek doğru görünüyor. Önceki 1–6 tur raporu final kartlarını hatalı biçimde etkisiz gösteriyordu.
- Ücretsiz Riziko satın alma hakkını tüketiyor ve gecikmeli maliyetini koruyor; ücretsiz olduğu için bedelsiz tekrar çevrimine dönüşmüyor.
- Kara Borsa, Doping, Yerli Blok, Barikat ve sözleşme kartları hem fiyat/etki hem de sonuç dallarıyla UI testlerinde ayrı ayrı doğrulandı.

## Tasarım kararı

Güç 80 bir takımın kupayı her koşuda alması hedeflenmedi: gruptan çoğunlukla çıkıyor ancak dört eleme maçını arka arkaya geçmek zor. Bu, tekrar oynanabilirliği koruyor. Güç 88 ve 96'da kupa olasılığının belirgin yükselmesi, kadro kurma ve ekonomi kararlarının gerçek karşılığı olduğunu gösteriyor. Yapay mağlubiyet telafisi eklemek yerine maç sonu üç nedenli analiz ve görünür güç/hazırlık sinyalleri korunmalıdır.

## İşlevsellik düzeltmeleri

- Mobil ve Android kadro değişikliği tek dokunuş akışına alındı. Yedek seçildikten sonra alt panel kapanıyor, seçim korunuyor ve sahadaki oyuncuya dokununca değişiklik tamamlanıyor.
- Mobil sayfa ve modal kaydırma alanları güvenli ekran boşluklarıyla sınırlandı. Sabit aksiyon alanları içerik kaydırmasını bloke etmiyor.
- Penaltı yön tuşları üç eşit kolonda kalıyor ve dar ekranda yazı taşırmıyor.
- Oyuncu profili masaüstünde yalnızca tıklamayla açılıyor. Draft DETAY düğmesi profili anında kapatmıyor. COPA SCORES varsayılan olarak açık.
- Reset her platformda Life ve Arena seçim ekranına dönüyor. Life içinden Arena seçimine dönüş kalıcı olarak erişilebilir.
- Kariyer ve kulüp direktifi aynı modal hiyerarşisini kullanıyor. Üç maçlık hedef seçimi bekleyen başka bir modal varsa güvenli biçimde sıraya alınıyor.
- Arena kasası satın alma sonrası anında yenileniyor. Sunucu bütçeyi ayrıca doğruladığı için gecikmiş arayüz pahalı oyuncu alımına izin vermiyor.
- Yapay zekâ antrenmanı ödülsüz olarak terk edilebiliyor.
- Japonya ligi dolgu kulüpleri Japon şehir tabanlı adlar kullanıyor.
- Maç analizi daha doğal futbol Türkçesine geçirildi. Hazırlık bandı maç başladıktan sonra güncel maçı anlatıyor.

## Copa Arena

Özel oda sistemi uygulandı. Ev sahibi altı karakterli oda kodu oluşturabiliyor, rakip kodla katılabiliyor, bekleyen oda iptal edilebiliyor ve eşleşme normal Arena oyun motoruna bağlanıyor. Özel maçlar dereceli puan veya ekonomi ödülü vermiyor. Böylece arkadaş maçı rekabet ekonomisini istismar edemiyor.

Canlı servis D1 göçü ve Worker sürümüyle yayınlandı. Oda otoritesi Durable Object içinde tutuluyor, kalıcı profil ve maç verisi D1 üzerinde kalıyor.

## Sonraki ürün yatırımları

- Şöhretler Maçı haftalık rakip kademeleri, değişen kadro kısıtları ve yalnızca kozmetik ödüllerle sezonluk bir vitrine dönüşmeli.
- Şöhretler Maçı öncesinde kaptan ve oyun planı seçilmeli. Maç içinde en fazla üç anlamlı karar olmalı. Maç sonunda rakibin tercihleriyle karşılaştırma gösterilmeli.
- Özel odaların ikinci aşamasında dört ve sekiz takımlı kodlu turnuva ağacı, rövanş, seyirci modu ve bölge seçimi eklenmeli.
- Sezon Yolu ödülleri güç satmamalı. Forma, stadyum teması, profil çerçevesi, giriş animasyonu ve geçmiş sezon rozeti premium hissi korur.
- Arena'da bağlantı kalitesi göstergesi, hareketsizlik cezası, yeniden bağlanma süresi ve maç sonu tek dokunuş rövanş elzemdir.
- Serbest yazılı sohbet yerine hazır sportmenlik mesajları kullanılmalı. Bu yaklaşım moderasyon yükünü azaltırken sosyal hissi korur.
