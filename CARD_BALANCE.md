# Kart Balance Tablosu

Bu dosya `npm run report:cards` ile gerçek kart kodundan üretilir. Etki değerleri örnek 4-4-2 kadro üzerinde 1-6. tur aralığına göre hesaplanır. Tek kullanımlık ve event tabanlı kartlarda nihai etki oyun akışında uygulanabilir; tablo bu kartları ayrıca notlar.

- Toplam kart: 35
- Risk içeren kart: 18
- Tek kullanımlık/olay kartı: 19
- Yüksek kaldıraç veya çok verimli kart: 8

| Kart | Kategori | Mod | COMMON fiyat | COMMON etki | DARK fiyat | DARK etki | Verim | Denge notu |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 12. Adam | power | contract | €5M | +5 | €3M | +10 | çok verimli (3.33) | kontrat: tekrarlı etki, DARK yüksek kaldıraç |
| Wonderkid | power | scaling | €7M | +1..+6 | €5M | +1..+6 | normal (1.20) | ölçeklenen etki, risk içerir, final etkisi var |
| İvme | power | scaling | €5M | +2..+4 | €3M | +4..+8 | çok verimli (2.67) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç |
| Kontra | power | instant | €5M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Büyük Maç Adamı | power | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Pastan?n ?ile?i | power | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Otobüs | defense | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Kaleci Kalesi | risk | instant | €5M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Anadolu Eksp. | squad | scaling | €5M | +2 | €3M | +2 | normal (0.67) | ölçeklenen etki |
| Altyapı Planı | squad | scaling | €5M | +8 | €3M | +16 | çok verimli (5.33) | ölçeklenen etki, risk içerir, final etkisi var, DARK yüksek kaldıraç, yüksek tavan / ucuz |
| Tecrübeli Omurga | squad | scaling | €7M | +2 | €5M | +4 | normal (0.80) | ölçeklenen etki, risk içerir, final etkisi var |
| Yerli Blok | squad | scaling | €9M | +5 | €7M | +9 | verimli (1.29) | ölçeklenen etki, DARK yüksek kaldıraç |
| Kanat Akını | power | scaling | €8M | +4 | €6M | +4 | normal (0.67) | ölçeklenen etki |
| Çift Forvet | power | scaling | €7M | +4 | €5M | +8 | verimli (1.60) | ölçeklenen etki, DARK yüksek kaldıraç |
| Derbi Aslanı | final | scaling | €12M | +0..+8 | €9M | +0..+14 | verimli (1.56) | ölçeklenen etki, final etkisi var |
| Final Patronu | final | scaling | €7M | +0..+6 | €5M | +0..+12 | çok verimli (2.40) | ölçeklenen etki, final etkisi var, DARK yüksek kaldıraç, yüksek tavan / ucuz |
| Son Dans | final | scaling | €7M | +0..+8 | €5M | +0..+14 | çok verimli (2.80) | ölçeklenen etki, risk içerir, final etkisi var, yüksek tavan / ucuz |
| Taksit Transfer | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, final etkisi var |
| Son Kredi | economy | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Kara Borsa | risk | instant | €6M | +0 | €4M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Sahte Evrak | risk | contract | €7M | +6 | €5M | +10 | çok verimli (2.00) | kontrat: tekrarlı etki |
| Deplasman Kafilesi | risk | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Kumarbaz | economy | contract | €6M | +0 | €4M | +0 | normal (-) | kontrat: tekrarlı etki |
| Geçici Prim | temporary | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Kısa Kamp | temporary | instant | €5M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Doping Söylentisi | risk | contract | €0M | +6 | €0M | +10 | normal (-) | kontrat: tekrarlı etki |
| Kriz Yönetimi | final | instant | €17M | +0 | €13M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir, final etkisi var, düşük görünen güç etkisi |
| Kurban Belli | risk | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Primler Yatınca | power | instant | €0M | +0 | €0M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Vur İğneyi | risk | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Sürpriz Faktör | power | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında |
| Geç Geçebilirsen | defense | scaling | €6M | +5 | €4M | +5 | verimli (1.25) | ölçeklenen etki, risk içerir, final etkisi var |
| Nasip, Kısmet | risk | instant | €5M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Yıldız Krizi | power | instant | €7M | +0 | €5M | +0 | normal (-) | olay kartı: etkisi satın alma anında, risk içerir |
| Saha Dışı Baskı | power | instant | €5M | +0 | €3M | +0 | normal (-) | olay kartı: etkisi satın alma anında |

## İzleme Notları

- Görünür kart açıklaması yalnızca seçili varyantı anlatmalı; COMMON ve DARK aynı anda metne basılmamalı.
- Yüksek kaldıraç kartlarında satın alma önizlemesi, gerçek oyun etkisi ve feed metni birlikte kontrol edilmeli.
- Risk kartlarında ceza, sakatlık, güven ve ekonomi etkisi sade ama açık kalmalı.
