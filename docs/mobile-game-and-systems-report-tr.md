# Copa Life — mobil oyunlaşma ve sistem geliştirme raporu

## Yönetici özeti

Copa Life zaten Capacitor kabuğu, dikey yönelim, güvenli alanlar, haptik desteği ve mobil aksiyon alanlarıyla iyi bir teknik tabana sahip. Android sürümünü “web sitesinin uygulama paketi” hissinden çıkarmak için bütün oyunu yeniden yazmak gerekmiyor. En doğru yol, mevcut oyun kurallarını ve simülasyon çekirdeklerini koruyup mobil sürümde ekran akışını, etkileşimleri ve sunumu ayrı bir katman hâline getirmektir.

Öncelik sırası:

1. Mobil başlangıç ve koşuya devam ekranını bağımsızlaştır.
2. Kura ve penaltıyı tam ekran, tek elle oynanan “an” ekranlarına dönüştür.
3. Kadro ve kart işlemlerini alt sayfa, uzun basma ve sürükleme gibi mobil kalıplarla yenile.
4. Antrenman, sinerji, kimya ve takım konuşmasını aynı “maça hazırlık” çatısında birleştir.

## Android sürümünün web hissinden çıkarılması

### Başlangıç ekranı

Mobilde masaüstü başlık, küçük araç düğmeleri ve uzun tek sayfa yerine tam ekran bir oyun açılışı kullanılmalı:

- Tam ekran stadyum/soyunma odası atmosferi ve Copa Life logosu.
- En büyük eylem “Devam Et”; altında “Yeni Koşu”.
- Son koşudan kulüp, tur, güç ve sonraki rakibi gösteren tek kompakt kayıt kartı.
- Ayarlar ve rehber sağ üstte küçük ikonlar; yasal bağlantılar başlangıç ekranından çıkarılıp ayarlara taşınmalı.
- Ülke, diziliş ve başkan seçimi aynı uzun sayfada değil, geri kaydırılabilen üç ayrı adım olmalı.
- Android geri hareketi ekran geçmişinde çalışmalı; yalnız kökte uygulamadan çıkış istemeli.
- Sistem çubuğu, splash ve ilk ekran aynı koyu renkte birleşmeli; açılışta beyaz parlaması olmamalı.

### Kura çekimi

- 9:16 tam ekran tören.
- Üstte yalnız ilerleme ve torba; altta başparmak alanında “Topu çek”.
- Topa dokunma veya kısa yukarı sürükleme; açılışta haptik darbe ve kısa ses.
- Takım arması topun içinden çıkar, sonra ilgili grup sütununa fiziksel bir hareketle yerleşir.
- Kullanıcının grubu her zaman görünür ama bütün gruplar yatay sayfalama ile gezilebilir.
- Hızlı kura erişilebilirlik ve tekrar oynama için korunmalı.

### Penaltılar

- Tam ekran kale; oyuncu/kaleci isimleri yalnız tek düello satırında.
- Şut için üç büyük bölge veya kısa sürükleme; kalecilikte aynı bölgeler.
- Skor ve penaltı noktaları tek bir yerde gösterilmeli.
- Gol, kurtarış, direk ve dışarı için ayrı ses/haptik imzaları.
- Hareket azaltma açıkken kamera sarsıntısı ve uzun animasyonlar devreden çıkmalı.

### Kartlar ve kadro

- Kart koleksiyonu iki sütunlu mobil grid; dokununca alt sayfa, uzun basınca hızlı detay.
- Aktif yuvalara sürükle-bırak eklenebilir ama dokunarak seçme her zaman alternatif kalmalı.
- Kadro değişikliklerinde oyuncuya dokun, uygun hedefleri vurgula, ikinci dokunuşla değiştir yaklaşımı daha güvenlidir.
- Maç ekranı, pazar ve kariyer ayrı mobil rotalar olmalı; masaüstündeki tek uzun sayfanın bölümleri gibi davranmamalı.

## Phaser fizibilitesi

Phaser’a geçiş “basit ve zahmetsiz” değildir; fakat doğru sınırla uygulanırsa yönetilebilir.

| Alan | Öneri | Gerekçe |
|---|---|---|
| Penaltı | Uygun, orta efor | İzole durum makinesi ve animasyon ağırlıklı. Mevcut `penaltyCore` kural kaynağı olarak kalabilir. |
| Kura | Uygun, düşük-orta efor | Top, torba ve yerleşme animasyonları canvas için doğal. Turnuva motoru DOM’dan bağımsız kalmalı. |
| Kart açılışı | Kısmen uygun | Yalnız paket/kart açma animasyonu Phaser olabilir. |
| Kart koleksiyonu ve pazar | Önerilmez | Metin, kaydırma, erişilebilirlik, filtre ve alt sayfalar DOM/CSS’te daha ucuz ve sağlamdır. |
| Tüm uygulama | Önerilmez | Formlar, modallar, erişilebilirlik ve çok dilli metin için gereksiz yeniden yazım yaratır. |

En güvenli mimari: oyun kuralları mevcut JavaScript çekirdeklerinde, Phaser yalnız bir “renderer/adaptör” olarak çalışır. Böylece web, Android ve otomatik denge testleri aynı sonucu üretir. İlk prototip kura ekranı olmalı; penaltı ikinci adımda taşınmalı. Mevcut efektler yeterliyse Web Animations/Canvas ile daha küçük bir çözüm de Phaser’dan önce denenebilir.

## Maç öncesi hazırlık ve antrenman sistemi

Her maç öncesi 2 hazırlık puanı verilir. Oyuncu iki hafif çalışma veya bir yoğun çalışma seçer.

Önerilen çalışmalar:

- Bitiricilik: hücum üretimi ve şut kalitesi.
- Savunma şekli: savunma ve rakip hücumunu karşılama.
- Duran top: o maç duran top olaylarının kalitesi.
- Penaltı: seri sırasında şut istikrarı.
- Takım uyumu: geçici kimya ve yeni oyuncu entegrasyonu.
- Toparlanma: yorgunluk ve sakatlık riskini azaltır, doğrudan güç vermez.
- Rakip analizi: rakibin stilini açar ve doğru karşı plan seçilirse bonus verir.

Örnek matematik:

```text
hazırlık_bonusu =
  taban_etki
  × antrenör_katsayısı
  × (1 - yorgunluk / 120)
  × tekrar_azalması
```

- Hafif çalışma taban etkisi 1, yoğun çalışma 2–3 olabilir.
- Aynı çalışmanın art arda kullanımı için tekrar azalması: 1.00, 0.70, 0.45.
- Toplam efektif güç karşılığı +4 ile sınırlandırılmalı.
- Yoğun çalışma +8 ila +12 yorgunluk ve küçük sakatlık riski üretmeli.
- Hazırlık kalıcı güç vermemeli; aksi hâlde güçlü koşular kart ve kimya sistemiyle birlikte kartopu etkisi yaratır.
- Rakibe uygun seçim düz +güçten daha değerli olmalı: örneğin kontra rakibine “geçiş savunması” seçmek rakibin saldırı katsayısını azaltır.

UI, taktik tahtası üstünde iki boş hazırlık yuvası ve tahmini “güç / risk / kimya” değişimini gösteren canlı önizleme olarak tasarlanmalı.

## Kart sinerjisi

Tek tek kart çiftleri yazmak yerine her karta 1–2 sistem etiketi verilmesi ölçeklenebilir:

- Oyun: pres, geçiş, topa sahip olma, derin savunma, kanat, duran top.
- Kadro: gençlik, veteran, yerli çekirdek, yıldız.
- Yönetim: ekonomi, taraftar, başkan, risk.

Sinerji puanı:

- Aynı etiketten 2 kart: 1 rezonans.
- Aynı etiketten 3 kart: toplam 2 rezonans.
- Tamamlayıcı ikili, örneğin pres + gençlik: 1 ek rezonans.
- Çelişen etiket, örneğin derin savunma + aşırı pres: 1 sürtüşme.
- Net sinerjinin maç gücü karşılığı en fazla +5 olmalı.

Sinerji satın almadan önce kart üzerinde görünmeli. “Bu kart Pres rezonansını 2/3 yapar: +1 güç” gibi bir önizleme, oyuncunun kombinasyon kurmasını sağlar. Gizli tarifler ana sistem olmamalı; keşif hissi için az sayıda özel kombinasyon tutulabilir.

## Kimya sisteminin geliştirilmesi

Mevcut -5/+5 toplamı korunabilir fakat kaynakları daha görünür ve konumsal yapılmalı:

- Dizilişte komşu oyuncular arasında bağlantı.
- Aynı kulüp geçmişi, yerli çekirdek ve ortak dil/ülke yakınlığı.
- Mevki/rol uyumu ve taktik aşinalığı.
- Kaptan ve lider oyuncuların yakın bağlantılara etkisi.
- Yeni transfer için 1–2 maçlık adaptasyon.
- Sürekli birlikte oynayan hatlar için küçük devamlılık bonusu.

Kimya yalnız ortalama gücü artırmamalı; takımın sonuç oynaklığını da azaltmalı. Örnek:

```text
güç_bonusu = sınırla((kimya_100 - 50) / 15, -3, +4)
varyans_katsayısı = sınırla(1.15 - kimya_100 / 200, 0.85, 1.15)
```

Yüksek kimya böylece favorinin saçma sürpriz yenilgilerini azaltır; düşük kimya güçlü ama dağınık kadroyu riskli kılar. Ekranda tek toplamın yanında “Savunma hattı”, “Orta saha” ve “Hücum hattı” bağlantıları, renk ve kısa neden etiketiyle gösterilmeli.

## Takıma konuşma sisteminin geliştirilmesi

Mevcut tek maçlık `talkMod` ve bir kullanım sınırı iyi bir çekirdek. Bunu bağlama duyarlı hâle getirmek gerekir:

- Tonlar: Sakinleştir, İnandır, Meydan Oku, Disiplin İste, Taktik Hatırlat.
- Hedef: tüm takım, savunma, hücum, gençler veya yıldız oyuncu.
- Bağlam: favori/underdog, son form, skor baskısı, genç/veteran oranı, kaptan özelliği ve başkan güveni.
- Sonuç yalnız düz güç olmamalı: odak, baskı, tempo, sakatlık riski ve ilk 20 dakika etkisi de kullanılmalı.

Örnek denge:

- Güvenli ton: %80 nötr veya +1, kötü sonuç yok.
- Bağlama uygun riskli ton: %55 +2, %30 +1, %15 -1.
- Bağlama aykırı ton: %25 +1, %45 nötr, %30 -1/-2.
- Toplam konuşma etkisi -2 ile +3 arasında sınırlandırılmalı.
- Kaptan kartı/özelliği kötü sonucu sıfırlayabilir ama kaptana yorgunluk veya bireysel güç bedeli getirebilir.

UI bir metin modalı yerine kısa soyunma odası sahnesi olmalı: oyuncu kümeleri, kaptan önde, tek elle seçilen büyük ton kartları ve seçimden sonra yüz ifadeleri/beden dili. Sonuç “Hücum +2 · Sakatlık riski +%4” gibi iki kısa çipte gösterilmeli. Ses, hafif ortam uğultusu ve doğru anda tek haptik vuruş atmosferi güçlendirir; hareket azaltma ve sessiz mod tam desteklenmelidir.

## Uygulama yol haritası

1. Mobil başlangıç rotası, güvenli alanlar ve tam ekran kura prototipi.
2. Maç öncesi hazırlık ekranı ve iki puanlı antrenman sistemi.
3. Kimya bağlantı görünümü ve varyans etkisi.
4. Etiket tabanlı kart sinerjisi.
5. Soyunma odası takım konuşması.
6. Kura prototipi başarılıysa Phaser renderer; ardından penaltı.
