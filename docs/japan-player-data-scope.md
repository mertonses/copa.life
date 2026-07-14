# Japonya oyuncu verisi kapsamı

## Yayındaki kapsam

- Kaynak anlık görüntüsü: 14 Temmuz 2026 tarihli FM26 dışa aktarımı.
- Lig kapsamı: J1'de filtrelenen 20 kulüp.
- Oyuncu sayısı: 561.
- Her oyuncu mevcut copa.life tuple şemasına dönüştürülür; ad, güç, mevki grubu, kulüp, yaş, oyun içi yerli/milli bayrağı ve değer bandı korunur.
- Ayrıntılı profil deposunda 561/561 eşleşme bulunur.

Bu havuz “Japon vatandaşları” listesi değildir. J1 kulüplerindeki yabancı oyuncuları da içerir; Japonya dışında oynayan Japon futbolcuları, J2/J3 kadrolarını ve dışa aktarım filtresine girmeyen oyuncuları içermez.

## Dönüşüm ve kalite sınırları

Güç puanı, ham FM niteliklerinden mevki ağırlıklı ve deterministik biçimde 55–90 copa.life bandına dönüştürülür. Ham nitelikler profil deposunda 1–20 ölçeğinde saklanır; rastgele profil veya yapay milliyet üretilmez.

Kaynak CSV'de ayrı bir milliyet sütunu yoktur. `Milli Takım` alanı milli takım statüsünü gösterir; bu nedenle tuple'ın altıncı alanı şu anda yalnızca geçici oyun bayrağıdır ve Japon vatandaşlığı olarak yorumlanamaz. Görünür rozet seçili ülke kodunu gösterir, fakat bu sınırlama giderilene kadar milliyete dayalı analiz yapılmamalıdır. Kesin milliyet/yerli statüsü istenirse FM görünümüne `Uyruk` alanı eklenerek yeniden dışa aktarım yapılmalıdır.

## Tekrarlanabilirlik

```powershell
node tools/build-japan-player-pool.mjs --input="C:\path\to\export.csv"
npm run audit:japan-data
```

Denetim oyuncu/kulüp sayısını, tuple şemasını, yaş ve güç aralıklarını, mevki dağılımını, tekrarlanan kimlikleri ve profil kapsamını doğrular. Yeni bir kaynak dışa aktarımı ayrı bir veri anlık görüntüsü olarak değerlendirilip önce denetimden geçirilmelidir.
