# Büyüme ölçüm sözleşmesi

## Dönüşüm hunisi

1. Mağaza gösterimi
2. Mağaza sayfası ziyareti
3. Yükleme
4. `session_started`
5. `draft_started`
6. `xi_completed`
7. `match_completed`
8. `run_finished`
9. `arena_match_completed`

## Gizlilik

- Native Firebase olayları varsayılan olarak kapalıdır.
- Yalnız Ayarlar'daki anonim ölçüm izni açıldığında toplanır.
- Oyuncu adı, kulüp adı, e-posta, kesin kadro gücü ve serbest metin gönderilmez.
- Google Play install referrer, Firebase'in Google Ads/Play ilişkilendirmesi üzerinden değerlendirilir; ayrı bir kullanıcı profili kurulmaz.

## Haftalık karar tablosu

- Play organik dönüşüm oranı
- Özel mağaza sayfası dönüşüm oranı
- Kampanya başına mağaza ziyareti ve yükleme maliyeti
- `session_started → draft_started` oranı
- `draft_started → xi_completed` oranı
- `xi_completed → match_completed` oranı
- İlk gün ve yedinci gün elde tutma
- Android crash ve ANR oranı
- Son sürüme ait değerlendirme puanı ve yorum temaları
