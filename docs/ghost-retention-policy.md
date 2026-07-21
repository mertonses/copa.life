# Ghost Club ve Dünya sıralaması veri saklama ve silme politikası

Sürümler: `ghost-terms-v1`, `leaderboard-terms-v1`
Yürürlük: 20 Temmuz 2026

## Varsayılan durum ve rıza

Web sürümünde salt-okuma Ghost rakip eşleştirmesi varsayılan olarak açıktır; bu istek oyuncunun kadrosunu veya anonim kurulum kimliğini göndermez. Android ve iOS mağaza uygulamalarında Ghost eşleştirmesi varsayılan olarak kapalıdır. Kendi kulübünü Ghost olarak paylaşma tüm platformlarda varsayılan kapalıdır: kullanıcı hem kullanım şartlarını kabul etmeden hem de oyun verisinin paylaşımına ayrı açık rıza vermeden kayıt oluşturulmaz veya yükleme kuyruğuna veri eklenmez.

Dünya Kulüpler Sıralaması da varsayılan kapalıdır ve Ghost paylaşımından ayrı açık rıza ister. Bu özellik ödülsüz bir topluluk kariyer sıralaması olarak Beta durumundadır; istemci sonuçlarına tutarlılık kontrolleri uygular fakat mutlak hile koruması iddia etmez. Sıralamayı kapatmak yeni yüklemeleri durdurur, yerel kuyruğu temizler ve sunucudaki profil/koşu satırlarını siler. Çevrimdışı silme isteği sonraki ağ bağlantısında yeniden gönderilir.

Ghost rızası geri çekildiğinde paylaşım kapanır ve gönderilmemiş yerel kuyruk silinir. Sunucudaki tüm çevrimiçi kayıtların silinmesi için uygulamadaki “Çevrimiçi verilerimi sil” işlemi kullanılır.

## Saklama süreleri

- Ghost kadro ve oyun kayıtları: oluşturulduktan sonra en çok 45 gün.
- Kullanıcı raporları: en çok 90 gün; ilişkili Ghost daha önce silinmişse daha erken temizlenebilir.
- Anonim istemci ihlal sayaçları: hizmet güvenliği ve tekrarlanan kötüye kullanımı önleme amacıyla tutulur; periyodik idari incelemeye tabidir.
- Dünya sıralaması tekil koşu satırları: yalnız aktif aylık sezon.
- Dünya sıralaması kulüp profili ve toplu kariyer değerleri: kullanıcı sıralamadan ayrılana, silene veya hizmet kapanana kadar.

Her gün `03:17 UTC` zamanında çalışan görev, süresi dolmuş Ghost satırlarını D1'den fiziksel olarak siler, eski/yetim raporları temizler ve aktif sezon dışındaki tekil sıralama koşularını kaldırır. `eligible_until` yalnızca eşleştirme filtresi değildir; gerçek silme eşiğidir.

## Kullanıcı silme işlemi

Her kurulumda yerel olarak üretilen yüksek entropili bir silme anahtarı bulunur. Sunucuda yalnızca bu anahtarın özeti saklanır. Bu anahtar ve ona bağlı çevrimiçi Ghost/Dünya kimliği Kulüp Kariyeri kayıt koduna dahil edilmez; kayıt kodu çevrimiçi profili başka cihaza taşımaz. Kullanıcı:

- Belirli bir Ghost kaydını silebilir.
- Aynı silme anahtarına ait tüm Ghost kayıtlarını silebilir.
- Yerel paylaşım rızasını geri çekebilir.
- Dünya sıralaması profilini ve tekil koşu satırlarını silebilir.
- Aynı silme anahtarına ait tüm Ghost ve sıralama verilerini tek işlemle silebilir.

Silme anahtarı kaybedilirse Ghost kayıtları yine 45 günlük otomatik süre sonunda temizlenir; kalıcı sıralama profilinin silinmesi için [takedown.html](../takedown.html) kanalından gizlilik talebi gerekir. Takedown talepleri aynı kanaldan ayrıca işlenir.

## Moderasyon durumları

- `eligible`: eşleştirilebilir.
- `review`: eşleştirmeden çıkarılmış, inceleme bekliyor.
- `blocked`: ihlal nedeniyle engellenmiş.

Raporlanan Ghost istemcide hemen gizlenir. Sunucu raporu `review` durumuna geçirir; üç benzersiz raporda `blocked` olur. İhlal üreten anonim istemci üç ihlal sonrasında engellenir.

## Denetim

Şema veya saklama süresi değiştiğinde bu belge, gizlilik politikası, Play Data Safety yanıtları, istemci rıza metni ve sunucu zamanlanmış görevi aynı sürümde güncellenmelidir.
