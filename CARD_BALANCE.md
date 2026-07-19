# Kart Balance Tablosu

Bu dosya `npm run report:cards` ile gerçek kart kodundan üretilir. Etki değerleri örnek 4-4-2 kadro üzerinde 1-6. tur aralığına göre hesaplanır. Tek kullanımlık ve event tabanlı kartlarda nihai etki oyun akışında uygulanabilir; tablo bu kartları ayrıca notlar.

- Toplam kart: 37
- Risk içeren kart: 13
- Tek kullanımlık/olay kartı: 19
- Yüksek kaldıraç veya çok verimli kart: 2

| Kart | Kategori | Mod | COMMON fiyat | COMMON etki | DARK fiyat | DARK etki | Verim | Denge notu |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 12. Adam | power | contract | €4M | +2..+4 | €5M | +3..+6 | normal (1.20) | kontrat: tekrarlı etki, final etkisi var |
| Wonderkid | power | scaling | €6M | +1..+6 | €8M | +4..+9 | normal (1.13) | ölçeklenen etki, risk içerir, final etkisi var |
| İvme | power | scaling | €4M | +1..+5 | €6M | +2..+8 | verimli (1.33) | ölçeklenen etki, final etkisi var |
| Kontra | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Büyük Maç Adamı | power | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Lokomotif | power | instant | €8M | +0 | €10M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Otobüs | defense | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var, düşük görünen güç etkisi |
| Kaleci Kalesi | risk | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var |
| Maç Sözü | defense | contract | €5M | +0 | €6M | +0 | normal (-) | kontrat: tekrarlı etki |
| Anadolu Eksp. | squad | scaling | €4M | +2 | €5M | +2 | pahalı/niş (0.50) | ölçeklenen etki |
| Altyapı Planı | squad | scaling | €4M | +4 | €5M | +6 | normal (1.20) | ölçeklenen etki, final etkisi var |
| Duvar! | squad | scaling | €5M | +1 | €6M | +2 | pahalı/niş (0.33) | ölçeklenen etki, final etkisi var |
| Yerli Blok | squad | scaling | €6M | +5 | €8M | +8 | normal (1.00) | ölçeklenen etki, final etkisi var |
| Kaptanın Kararı | squad | contract | €6M | +0 | €8M | +0 | normal (-) | kontrat: tekrarlı etki, düşük görünen güç etkisi |
| Kanat Akını | power | scaling | €6M | +4 | €8M | +6 | normal (0.75) | ölçeklenen etki, final etkisi var |
| Çift Forvet | power | scaling | €6M | +4 | €8M | +8 | normal (1.00) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Derbi Aslanı | final | scaling | €10M | +0..+8 | €13M | +0..+7 | normal (0.80) | ölçeklenen etki, final etkisi var |
| Son Koz | final | scaling | €6M | +0..+5 | €8M | +0..+9 | normal (1.13) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Son Dans | final | scaling | €6M | +0..+7 | €8M | +0..+10 | verimli (1.25) | ölçeklenen etki, risk içerir, final etkisi var |
| Taksit Transfer | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var |
| Son Kredi | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Kara Borsa | risk | instant | €3M | +0 | €7M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Mükâfat | risk | contract | €6M | +5 | €8M | +8 | normal (1.00) | kontrat: tekrarlı etki, final etkisi var |
| Fedailer | risk | instant | €4M | +0 | €6M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Kumarbaz | economy | contract | €5M | +0 | €6M | +0 | normal (-) | kontrat: tekrarlı etki |
| Geçici Prim | temporary | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Kısa Kamp | temporary | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Doping Söylentisi | risk | contract | €7M | +6 | €9M | +9 | normal (1.00) | kontrat: tekrarlı etki, risk içerir, final etkisi var |
| Kriz Yönetimi | final | instant | €9M | +0 | €12M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, final etkisi var, düşük görünen güç etkisi |
| Kurban Belli | risk | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Riziko | power | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Vur İğneyi | risk | instant | €3M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Joker | power | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, düşük görünen güç etkisi |
| Barikat | defense | scaling | €5M | +5 | €6M | +7 | normal (1.17) | ölçeklenen etki, risk içerir, final etkisi var |
| Piyango | risk | instant | €2M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Yıldız Krizi | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Saha Dışı Baskı | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |

## İzleme Notları

- Görünür kart açıklaması yalnızca seçili varyantı anlatmalı; COMMON ve DARK aynı anda metne basılmamalı.
- Yüksek kaldıraç kartlarında satın alma önizlemesi, gerçek oyun etkisi ve feed metni birlikte kontrol edilmeli.
- Risk kartlarında ceza, sakatlık, güven ve ekonomi etkisi sade ama açık kalmalı.
