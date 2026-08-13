# Google Play kategori ve etiket ayarı

## Uygulanacak ayar

- Uygulama türü: **Oyun**
- Ana kategori: **Strategy / Strateji**
- Etiketler: **Sports / Spor**, **Simulation / Simülasyon**

Bu seçim oyunun futbol temasını korurken asıl oynanışını da doğru anlatır: kadro kurma,
bütçe ve pazar yönetimi, taktik kararlar, sezon ilerlemesi ve Copa Arena'daki canlı
rekabet. “Sports” tek başına oyunun yönetim ve strateji katmanını eksik temsil ediyordu.

## Play Console adımları

Play Console → **Grow users → Store presence → Store settings → App category** yolundan
uygulama türünü **Game**, ana kategoriyi **Strategy** olarak seçin. **Manage tags** altında
**Sports** ve **Simulation** etiketlerini ekleyip kaydedin.

Google Play kategori ve etiketleri en fazla beş seçimle sınırlar; etiketler yalnızca oyunun
mağaza metni veya ilk oyun deneyiminde açıkça desteklenen mekanikleri yansıtmalıdır. Bu
nedenle RPG, Action, Board veya Racing gibi oyunda olmayan etiketler eklenmemelidir.

## Kaynak doğruluğu

Yerelleştirilmiş listing dosyalarının sınıflandırma bölümü ve Play Console beyan haritası
aynı ayarı gösterir. Google Play Developer API'nin `edits.listings` kaynağı kategori ve
etiketleri güncellemediği için bu iki alan otomatik listing yayın script'ine dahil değildir;
Console'da bir kez manuel kaydedilmelidir. Değişikliklerin mağaza sayfasına yansıması 24
saate kadar sürebilir.
