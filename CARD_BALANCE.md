# Kart Balance Tablosu

Bu dosya `npm run report:cards` ile gerçek kart kodundan üretilir. Etki değerleri örnek 4-4-2 kadro üzerinde 1-6. tur aralığına göre hesaplanır. Tek kullanımlık ve event tabanlı kartlarda nihai etki oyun akışında uygulanabilir; tablo bu kartları ayrıca notlar.

- Toplam kart: 35
- Risk içeren kart: 11
- Tek kullanımlık/olay kartı: 19
- Yüksek kaldıraç veya çok verimli kart: 4

| Kart | Kategori | Mod | COMMON fiyat | COMMON etki | DARK fiyat | DARK etki | Verim | Denge notu |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 12. Adam | power | contract | €4M | +2..+4 | €5M | +3..+6 | normal (1.20) | kontrat: tekrarlı etki, final etkisi var |
| Wonderkid | power | scaling | €6M | +1..+6 | €8M | +4..+9 | normal (1.13) | ölçeklenen etki, risk içerir, final etkisi var |
| İvme | power | scaling | €4M | +2..+4 | €5M | +4..+8 | verimli (1.60) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Kontra | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Büyük Maç Adamı | power | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Pastanın Çileği | power | instant | €8M | +0 | €10M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Otobüs | defense | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var, düşük görünen güç etkisi |
| Kaleci Kalesi | risk | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var |
| Anadolu Eksp. | squad | scaling | €4M | +2 | €5M | +2 | pahalı/niş (0.50) | ölçeklenen etki |
| Altyapı Planı | squad | scaling | €4M | +4 | €5M | +6 | normal (1.20) | ölçeklenen etki, final etkisi var |
| Tecrübeli Omurga | squad | scaling | €6M | +1 | €8M | +2 | pahalı/niş (0.25) | ölçeklenen etki, final etkisi var, düşük görünen güç etkisi |
| Yerli Blok | squad | scaling | €6M | +5 | €8M | +5 | normal (0.83) | ölçeklenen etki, final etkisi var |
| Kanat Akını | power | scaling | €6M | +4 | €8M | +6 | normal (0.75) | ölçeklenen etki, final etkisi var |
| Çift Forvet | power | scaling | €6M | +4 | €8M | +8 | normal (1.00) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Derbi Aslanı | final | scaling | €10M | +0..+8 | €13M | +0..+7 | normal (0.80) | ölçeklenen etki, final etkisi var |
| Final Patronu | final | scaling | €6M | +0..+5 | €8M | +0..+9 | normal (1.13) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Son Dans | final | scaling | €6M | +0..+8 | €8M | +0..+14 | verimli (1.75) | ölçeklenen etki, risk içerir, final etkisi var, yüksek kaldıraç / ucuz |
| Taksit Transfer | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında, final etkisi var |
| Son Kredi | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Kara Borsa | risk | instant | €5M | +0 | €6M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Sahte Evrak | risk | contract | €6M | +6 | €8M | +10 | verimli (1.25) | kontrat: tekrarlı etki, final etkisi var |
| Deplasman Kafilesi | risk | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, düşük görünen güç etkisi |
| Kumarbaz | economy | contract | €5M | +0 | €6M | +0 | normal (-) | kontrat: tekrarlı etki |
| Geçici Prim | temporary | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Kısa Kamp | temporary | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Doping Söylentisi | risk | contract | €5M | +6 | €6M | +10 | verimli (1.67) | kontrat: tekrarlı etki, risk içerir, final etkisi var |
| Kriz Yönetimi | final | instant | €11M | +0 | €14M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, final etkisi var, düşük görünen güç etkisi |
| Kurban Belli | risk | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, düşük görünen güç etkisi |
| Primler Yatınca | power | instant | €3M | +0 | €4M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Vur İğneyi | risk | instant | €3M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Sürpriz Faktör | power | instant | €6M | +0 | €8M | +0 | normal (-) | olay kartı: etkisi satın alma anında, düşük görünen güç etkisi |
| Geç Geçebilirsen | defense | scaling | €5M | +5 | €6M | +7 | normal (1.17) | ölçeklenen etki, risk içerir, final etkisi var |
| Nasip, Kısmet | risk | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Yıldız Krizi | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Saha Dışı Baskı | power | instant | €4M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |

## İzleme Notları

- Görünür kart açıklaması yalnızca seçili varyantı anlatmalı; COMMON ve DARK aynı anda metne basılmamalı.
- Yüksek kaldıraç kartlarında satın alma önizlemesi, gerçek oyun etkisi ve feed metni birlikte kontrol edilmeli.
- Risk kartlarında ceza, sakatlık, güven ve ekonomi etkisi sade ama açık kalmalı.
