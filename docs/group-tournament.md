# Grup turnuvası sistemi

## Format sözleşmesi

- Sürüm kimliği: `groups16_v1`
- 16 takım, 4 torba, 4 grup ve grup başına 4 takım.
- Oyuncunun kulübü ev sahibi seri başı olarak 1. torbadadır. Diğer takımlar güç eğrisine göre torbalanır; her gruba her torbadan bir takım gelir.
- Her takım grubunda tek devreli 3 maç oynar. Toplam grup fikstürü 24 maçtır.
- Galibiyet 3, beraberlik 1, mağlubiyet 0 puandır.
- Sıralama ölçütleri: puan, genel averaj, atılan gol, eşit takımlar arasındaki puan/averaj/gol, fair-play ve seed'e bağlı deterministik kura.
- İlk iki takım çeyrek finale çıkar. Eşleşmeler `A1–B2`, `C1–D2`, `B1–A2`, `D1–C2` düzenindedir; aynı gruptan iki takım ancak finalde yeniden karşılaşabilir.
- Eleme maçları berabere bitemez; uzatma/penaltı sonucu kazanan turnuva grafiğine yazılır.

## Oyuncu akışı

Kadronun kurulmasından sonra kura aşaması açılır. Manuel kura her topu tek tek gösterir; hızlı kura aynı önceden hesaplanmış sonucu anında açar. Kura, fikstür ve yapay zekâ sonuçları run seed'iyle yeniden üretilebilir. Yarım kalan kura ve her güvenli oyun aşaması yerel checkpoint'e kaydedilir.

Grup maçlarında mağlubiyet koşuyu anında bitirmez. Galibiyet Başkan Güveni'ni 1 artırır, beraberlik değiştirmez, mağlubiyet 1 azaltır. Galibiyet mevcut ödül seçimini açar; beraberlik €2M maç geliri verir; mağlubiyet ödül vermez. Kart süreleri, sakatlıklar, yedekler, başkan müdahaleleri ve borç kontrolleri her üç sonuçta da tur sonu işleminden geçer.

## Entegrasyonlar

- Kayıt şeması v6, kura/grup/eleme grafiğini atomik olarak saklar. v2–v5 kayıtlar eski eleme formatında güvenli biçimde devam eder; bozuk takım, kura, fikstür veya tablo grafikleri reddedilir ve son sağlam kopyaya dönülür.
- Fikstür çubuğu altı oyuncu maçını `G1, G2, G3, ÇF, YF, F` olarak gösterir. Eleme rakipleri grup sonuçları oluştukça doldurulur.
- Sezon özeti grup derecesini, puanı, averajı ve dört takımlı son tabloyu saklar. Kariyer arşivi grup aşamasında elenmeyi ayrı etiketler.
- Hayalet kulüp eşleşmesi grup bütünlüğünü korumak için yalnız çeyrek/yarı finalde, mevcut eleme rakibinin turnuva takım kimliğini koruyarak uygulanır.
- Oyuncu ve yapay zekâ sarı/kırmızı kartları aynı fair-play ceza sözleşmesine yazılır; penaltı serisi normal süre skorundan ayrı saklanır ve sezon gol istatistiklerine eklenmez.
- Hayalet Kulüp ve Dünya sıralaması geçmişleri ilk üç maçta `W/D/L`, eleme maçlarında `W/L` kabul eder; grup derecesi, puan, averaj ve çıkma durumu sunucuda maç geçmişiyle çapraz doğrulanır. Kalıcı `422` kayıtları kuyruğu kilitlemeden ayrıştırılır ve yerel tanı kaydı bırakır.
- Ürün analitiği şema v4 yalnız kategorik kura modu, turnuva aşaması, grup maç günü ve eleme durumunu gönderir; seed, takım adı, kesin güç veya kullanıcı kimliği göndermez.
- Kura, tablo, eleme ağacı ve özet görünümü TR/EN/ES/DE/IT kopyalarına ve mobil/masaüstü kırılımlarına sahiptir.

## Kalite kapıları

- Saf motor: deterministik kura, 24 maç, benzersiz eşleşmeler, puan/averaj/ikili sonuç/fair-play, gruptan çıkma, elenme ve şampiyonluk yolu.
- Dayanıklılık: v6 round-trip, eski kayıt göçü, yarım kura restore'u, bozuk turnuva grafiği reddi.
- Denge: dört güç bandında 2.800 tam turnuva; gruptan çıkma ve şampiyonluk oranlarının güçle monoton artması, beraberlik ve puan bantları.
- UI: gerçek maç sonucu akışı, üç grup sonucu, grup elenmesi özeti, çeyrek finalden kupaya yol, hayalet rakip değişimi, semantik tablolar ve yatay taşma kontrolleri.
- Regresyon: ortak maç motoru, kart ekonomisi, genel ekonomi, Başkan Güveni, kariyer/meta, Ghost servisi ve Worker analitik testleri.
