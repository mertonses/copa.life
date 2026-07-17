# Ghost Club veri saklama ve silme politikası

Sürüm: `ghost-terms-v1`  
Yürürlük: 15 Temmuz 2026

## Varsayılan durum ve rıza

Web sürümünde salt-okuma Ghost rakip eşleştirmesi varsayılan olarak açıktır; bu istek oyuncunun kadrosunu veya anonim kurulum kimliğini göndermez. Android ve iOS mağaza uygulamalarında Ghost eşleştirmesi varsayılan olarak kapalıdır. Kendi kulübünü Ghost olarak paylaşma tüm platformlarda varsayılan kapalıdır: kullanıcı hem kullanım şartlarını kabul etmeden hem de oyun verisinin paylaşımına ayrı açık rıza vermeden kayıt oluşturulmaz veya yükleme kuyruğuna veri eklenmez.

Rıza geri çekildiğinde paylaşım kapanır ve gönderilmemiş yerel kuyruk silinir. Sunucudaki kayıtların silinmesi için uygulamadaki “Verilerimi sil” işlemi kullanılır.

## Saklama süreleri

- Ghost kadro ve oyun kayıtları: oluşturulduktan sonra en çok 45 gün.
- Kullanıcı raporları: en çok 90 gün; ilişkili Ghost daha önce silinmişse daha erken temizlenebilir.
- Anonim istemci ihlal sayaçları: hizmet güvenliği ve tekrarlanan kötüye kullanımı önleme amacıyla tutulur; periyodik idari incelemeye tabidir.

Her gün `03:17 UTC` zamanında çalışan görev, süresi dolmuş Ghost satırlarını D1'den fiziksel olarak siler ve eski/yetim raporları temizler. `eligible_until` yalnızca eşleştirme filtresi değildir; gerçek silme eşiğidir.

## Kullanıcı silme işlemi

Her kurulumda yerel olarak üretilen yüksek entropili bir silme anahtarı bulunur. Sunucuda yalnızca bu anahtarın özeti saklanır. Kullanıcı:

- Belirli bir Ghost kaydını silebilir.
- Aynı silme anahtarına ait tüm Ghost kayıtlarını silebilir.
- Yerel paylaşım rızasını geri çekebilir.

Silme anahtarı kaybedilirse kayıtlar yine 45 günlük otomatik süre sonunda temizlenir. Takedown talepleri [takedown.html](../takedown.html) kanalından ayrıca işlenir.

## Moderasyon durumları

- `eligible`: eşleştirilebilir.
- `review`: eşleştirmeden çıkarılmış, inceleme bekliyor.
- `blocked`: ihlal nedeniyle engellenmiş.

Raporlanan Ghost istemcide hemen gizlenir. Sunucu raporu `review` durumuna geçirir; üç benzersiz raporda `blocked` olur. İhlal üreten anonim istemci üç ihlal sonrasında engellenir.

## Denetim

Şema veya saklama süresi değiştiğinde bu belge, gizlilik politikası, Play Data Safety yanıtları, istemci rıza metni ve sunucu zamanlanmış görevi aynı sürümde güncellenmelidir.
