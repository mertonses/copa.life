# Turnuva kura ve denge denetimi — 22 Temmuz 2026

## Sonuç

Grup kurası, puan tablosu, grup W/B/M sonuçları, eleme ilerleyişi, güç farkı ve beş oyun stili birlikte test edildi. İki kesin tutarsızlık düzeltildi:

1. Yeni tur başlatılırken gelişmiş ayarlardaki seed temizlenmediği için bir kez girilen seed fark edilmeden tekrar kullanılabiliyor; aynı kura ve sonuç dizisi yeniden oluşabiliyordu. Yeni tur artık seed alanını temizliyor. Aynı seed elle tekrar girilirse deterministik tekrar özelliği korunuyor.
2. Turnuvada rakibe atanan oyun stili normal maç motoruna aktarılmıyordu. Rakip profili ile hesaplanan maç artık aynı stili kullanıyor.

## Kura testi

- Aynı seed aynı kurayı üretmeye devam ediyor; bu tekrar oynatma sözleşmesidir.
- Farklı seed'ler farklı kura üretiyor.
- Her grupta dört farklı takım ve her torbadan tam bir takım bulunuyor.
- Her takım grup rakipleriyle birer kez oynuyor; üç maç gününün her birinde dört takım da tam bir kez sahaya çıkıyor.
- 900 ardışık seed örneğinde 40 takımlı havuz 700'den fazla, 20 takımlı havuz 580'den fazla farklı oyuncu grubu üretmek zorunda. Ortalama ardışık grup-rakibi tekrarı sırasıyla 0,35 ve 0,65 takımın altında tutuluyor.

Japonya havuzu 20 takım olduğundan 16 takımlı turnuvada kulüp tekrarının diğer ülkelere göre daha görünür olması matematiksel olarak normaldir. Oyuncunun üç grup rakibinin tamamen aynı gelmesi ise yeni çeşitlilik kapısıyla nadir tutuluyor.

## Güç ve sonuç matrisi

Her güç seviyesi 700 tam turnuva ile ölçüldü:

| Oyuncu gücü | Grup G | Grup B | Grup M | Gruptan çıkma | Eleme maçı kazanma | Şampiyonluk |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 64 | %25,2 | %25,0 | %49,8 | %27,1 | %17,0 | %0,0 |
| 72 | %36,8 | %27,7 | %35,5 | %49,9 | %29,5 | %1,0 |
| 80 | %50,8 | %25,0 | %24,2 | %73,7 | %42,9 | %4,4 |
| 88 | %63,5 | %20,8 | %15,7 | %85,4 | %58,4 | %14,7 |
| 96 | %75,2 | %15,9 | %9,0 | %95,3 | %71,7 | %33,6 |

Güç arttıkça galibiyet, gruptan çıkma, eleme kazanma ve şampiyonluk oranları monoton yükseliyor. 20 puanlık tek maç avantajında favorinin oranları yaklaşık %68,8 galibiyet, %19,6 beraberlik ve %11,7 mağlubiyet. Sürpriz sonuç mümkün, fakat 96 güçte grup elenmesi %4,7 ile sınırın altında.

## Kalan minör riskler ve öneriler

1. **Oyun stili farkı:** 80 güçte gruptan çıkma oranı uzun topta %72,2, gegenpress'te %70,8, kontrada %67,2, tiki-takada %65,8 ve blokta %57,8. Blok stili oynanabilir bantta olsa da diğerlerinden belirgin biçimde geride. Kapalı test verisi görülmeden katsayıyı değiştirmek yerine gerçek seçim ve başarı oranı izlenmeli.
2. **Küçük ülke havuzu tekrarı:** Japonya'da 20 kulübün 15'i her turnuvaya seçildiği için kura töreninde tanıdık isimler sık görülür. Oyuncu grubunun tekrarı düşük kalırsa bu hata değildir. Şikâyet sürerse son iki turdaki oyuncu rakiplerine düşük öncelik veren geçmiş-duyarlı seçim eklenebilir.
3. **Sürpriz mağlubiyet algısı:** Tek maçta büyük favori de kaybedebilir. Son maç raporunda güç farkı, rakip stili, xG ve kart etkisi birlikte görünür kılınırsa sonuç daha anlaşılır olur.

## İlerleme planı

1. **Tamamlandı:** Seed yeniden kullanımını kaldır, rakip stilini maç motoruna bağla, kura çeşitliliği ve W/B/M/eleme regresyon kapılarını ekle.
2. **Kapalı test:** En az 200 grup ve 75 eleme maçında aşama, iki takım gücü, güç farkı bandı, iki stil, W/B/M, xG ve elenme aşamasını anonim toplulaştırılmış olarak izle.
3. **Kalibrasyon kararı:** Özellikle `+12` ve `+20` güç farkı ile blok stilini güven aralıklarıyla değerlendir. Ancak gerçek veri otomatik test bantlarıyla çelişirse küçük katsayı değişikliği yap.
4. **Yeniden doğrulama:** Her denge değişikliğinde turnuva matrisi, normal maç dengesi, grup tarayıcı akışı ve tam test zincirini yeniden çalıştır.

## Doğrulama

- `npm run check:tournament`
- `npm run check:tournament:balance`
- `npm run check:tournament:balance:matrix`
- `npm run check:normalmatch`
- `npm run test:group --prefix playtest/runner`: 19 geçti, 1 platforma göre atlandı
- `npm test`: geçti
