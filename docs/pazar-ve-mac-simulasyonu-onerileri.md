# Pazar ve maç simülasyonu ürün raporu

## Pazar sekmesi

### Öncelikli oynanış geliştirmeleri

1. **Her turun ayrı bir pazar kimliği olsun.** “Forvet bolluğu”, “yerli oyuncu haftası”, “DARK kart baskısı” gibi tek cümlelik bir piyasa koşulu fiyatları ve teklif havuzunu etkilesin. Oyuncu pazarı sadece yenilenen bir liste olmaktan çıkar.
2. **Teklifleri kadroya göre sırala.** Her kart veya oyuncu üzerinde “ilk 11’e +3”, “kimyaya −1”, “kasa sonrası −€8M” gibi satın alma sonrası üç kısa sonuç gösterilsin.
3. **Pazarlık hakkı ekle.** Tur başına bir kez fiyat indirimi, takas veya sonraki tur ödeme seçeneği sunulsun. Başkan tipi başarı ihtimalini değiştirsin.
4. **Oyuncu satışı/takas sistemi ekle.** Yedek veya uyumsuz oyuncu düşük bedelle çıkarılabilsin; böylece pazar yalnızca satın alma ekranı olmaz.
5. **Scout belirsizliği kullan.** Bazı adaylarda kesin güç yerine aralık gösterilsin. Scout kartı veya başkan etkisi aralığı daraltsın.
6. **Serbest transferleri karar alanına dönüştür.** Ücretsiz oyuncular maaş, düşük kimya veya tek maçlık sözleşme gibi bir karşılık taşısın.

### UI önerisi

- Üstte tek satır: `Kasa · Borç limiti · Bu tur harcanan`.
- Hemen altında filtreler: `İlk 11 etkisi`, `Mevki`, `Fiyat`, `Kimya`.
- Kartlarda önce karar bilgisi, sonra açıklama: güç farkı, kimya farkı, satın alma sonrası kasa.
- Kart dokunulduğunda tam ekran modal yerine alttan açılan karşılaştırma paneli.
- “Ücretsiz yenile” düğmesinin yanında yeni havuzun neyi değiştireceği açıkça yazmalı.
- Alınamayacak teklifler soluklaşmak yerine neden alınamadığını ve gerekli farkı göstermeli.

### Önerilen ilk sürüm

Önce satın alma sonrası etki göstergeleri, mevki filtresi ve tek pazarlık hakkı uygulanmalı. Bunlar yeni içerik üretmeden pazar kararlarını belirgin biçimde güçlendirir.

## Her maç için final simülasyonu

### Önerilen akış

`MAÇA ÇIK` seçildiğinde küçük bir seçim sayfası açılmalı:

- **İZLE:** Aynı maç sonucunu 60–90 saniyelik canlı simülasyonla sunar.
- **HIZLI OYNA:** Aynı sonucu 2–3 saniyelik özetle sunar.
- İsteğe bağlı “Bu tur için hatırla” seçeneği bulunabilir.

Her iki seçenek de aynı seed, kadro, kartlar ve taktik girdileriyle **tek kez üretilmiş aynı sonucu** kullanmalı. İzlemek sonuç avantajı vermemeli; yalnızca sunum biçimini değiştirmeli.

### Maç Öncesi Risk raporu

Ayrı bir “Maç Öncesi Risk” modalını kaldırmak doğru olur. Ancak bilgi tamamen kaybolmamalı. Maç ekranında tek satırlık en fazla üç uyarı bırakılmalı:

- `Rakip güç farkı +6`
- `Borç baskısı yüksek`
- `Sol kanat uyumsuz`

Böylece akış kesilmez, fakat oyuncu mağlubiyetin nedenini anlayabilir. Takım konuşması ve hazırlık kararları `MAÇA ÇIK`tan önce tamamlanmalı; izleme biçimi bundan sonra seçilmelidir.

### Teknik yaklaşım

1. Maç sonucu bağımsız bir resolver tarafından bir kez oluşturulur.
2. Resolver; skor, olaylar, kartlar, sakatlıklar, momentum ve istatistiklerden oluşan bir olay akışı döndürür.
3. `İZLE` bu olayları zaman çizelgesinde oynatır.
4. `HIZLI OYNA` aynı olayları sıkıştırılmış özet olarak gösterir.
5. Ödül, sakatlık, kayıt ve ilerleme yalnızca ortak sonuç tamamlayıcısında uygulanır.

Bu ayrım çift ödül, farklı sonuç, geri tuşuyla yeniden zar atma ve kayıt bozulması risklerini önler.

### Final simini doğrudan kopyalamama nedeni

Final sunumu grup maçlarında ağır kalabilir. Görsel dil ve olay motoru yeniden kullanılmalı; normal maçlarda tören, final başlığı, uzatma/altın gol ve uzun sonuç raporu koşula bağlı olmalıdır. Grup maçlarında beraberlik, eleme maçlarında uzatma/penaltı kuralları ortak resolver tarafından belirlenmelidir.

### Uygulama sırası

1. Ortak deterministik maç sonucu modeli.
2. `MAÇA ÇIK → İZLE / HIZLI OYNA` seçimi.
3. Normal maç için kısa canlı sunum.
4. Risk modalını kaldırıp üç kompakt uyarıyı maç ekranına taşıma.
5. Telemetri: izleme tercihi, simden çıkış, tekrar izleme ve maç başına süre.
