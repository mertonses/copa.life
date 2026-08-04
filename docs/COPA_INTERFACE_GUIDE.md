# Copa Interface Guide

Bu belge Copa Life ve Copa Arena'nın aynı ürün ailesi gibi davranması için uygulanan arayüz sözleşmesidir. Yeni ekranlar bu sözleşmeyi varsayılan kabul eder.

## Ürün karakteri

- Life, kulüp dosyası ve sezon hikâyesi hissi taşır. Ana vurgu turuncudur.
- Arena, yayın ve karşılaşma hissi taşır. Ana vurgu altındır.
- Tipografi, boşluklar, erişilebilirlik ve kontrol davranışı iki modda aynıdır.
- Dekor bilgiyle yarışmaz. Her yüzeyde tek bir görsel kahraman bulunur.

## Ekran dilbilgisi

Her ana akış şu sırayı izler:

1. Durum: Oyuncu nerede ve ne bekleniyor?
2. Karar: Şimdi yapılabilen tek ana eylem nedir?
3. Kanıt: Güç, ekonomi, süre veya sonuç bu kararı nasıl açıklıyor?
4. Ayrıntı: İkincil günlükler ve ham veriler açılır bölümde yer alır.

Bir ekranda yalnızca bir birincil buton bulunur. İkincil işlemler sessiz buton, bağlantı ya da açılır ayrıntı olur. Sunucu bekleme, kilitli seçim ve yeniden bağlanma durumları yalnızca renkle anlatılmaz; metin ve simge birlikte kullanılır.

## Tasarım değişkenleri

Ortak değerler `src/styles/palette.css` içindeki `--ui-*` değişkenleridir. Dokunma hedefi en az 44 piksel, panel yarıçapı 16 piksel, kontrol yarıçapı 10 pikseldir. Boşluk ölçeği 4, 8, 12, 16 ve 24 pikseldir.

## Hareket

- Girdi geri bildirimi: 120 ms.
- Durum geçişi: 180 ms.
- Sonuç veya seçim açıklaması: en fazla 260 ms.
- Sürekli parlama, yanıp sönme ve anlamsız döngü kullanılmaz.
- Hareket azaltma tercihi tüm animasyonları kaldırır.
- Titreşim yalnızca kesin seçim, hazır olma veya önemli sonuç anında bir kez çalışır.

## Arena şablonları

- Karşılaşma lobisi iki kulübü simetrik gösterir; güç ve hazır durumu aynı hizada yer alır.
- Oda akışında kod, katılımcı durumu ve ana eylem tek blokta bulunur.
- Maç sonunda önce skor ve maçın oyuncusu, sonra üç futbol gerekçesi, en son ödüller ve ayrıntılı olay günlüğü gösterilir.
- Güvenli hazır mesajlar maç arayüzünün parçasıdır; serbest metin yoktur.

## Life şablonları

- Draft kartında oyuncu adı ana odaktır. Güç ve fiyat eşit ölçüdedir; lig kimliği arka planda ve küçük etikette görünür.
- Gizli oyuncu, bilgi eksikliğini siluet ve tarama yüzeyiyle anlatır.
- Kulüp Kariyeri tek dosyadır: özet, yönergeler, yönetim, geçmiş, kupalar ve finans birbirinden ayrılır; ayrı modal kopyaları oluşturulmaz.

## Yazım ve yerelleştirme

Başlıklar kısa, eylem odaklı ve futbol dilinde olmalıdır. Türkçe metinde noktalı virgül kullanılmaz. Değer ve birim ayrılmaz. Dar ekranda metin kesilmeden önce açıklama ikinci satıra geçer. Beş ürün dili aynı anahtar ve aynı bilgi sırasını kullanır.

## QA sözleşmesi

Her yeni yüzey en az şu durumlarla doğrulanır: boş, yükleniyor, başarı, hata, çevrimdışı, yeniden bağlanıyor, kilitli, devre dışı, uzun yerelleştirme, 320 piksel genişlik, klavye odağı, kaba işaretçi ve hareket azaltma. Web, Android ve iOS aynı karar sırasını ve aynı sunucu durumunu göstermelidir.
