# Japonya oyuncu verisi kapsamı

## Yayındaki kapsam

- Veri anlık görüntüsü: 15 Temmuz 2026 tarihli bağımsız copa.life oyuncu havuzu.
- Lig kapsamı: Japonya üst ligindeki 20 kulüp.
- Oyuncu sayısı: 561.
- Her oyuncu ad, oyun gücü, mevki grubu, kulüp, yaş, oyun içi yerli/millî bayrağı ve değer bandından oluşan mevcut tuple şemasını kullanır.
- Ayrıntılı copa.life profil deposunda 561/561 eşleşme bulunur.

Bu havuz “Japon vatandaşları” listesi değildir. Kapsamdaki kulüplerin yabancı oyuncularını da içerir; Japonya dışında oynayan Japon futbolcuları ve alt lig kadroları kapsam dışıdır.

## copa.life dönüşümü

Yayınlanan profil verisi ham niteliklerden oluşmaz. Her oyuncu için aynı altı 0–100 oyun boyutu üretilir:

- Hücum/Kurtarış Etkisi
- Oyun Kurulum
- Alan Kontrolü
- İkili Mücadele
- Tempo
- Karar Güvenilirliği

Kaleciler ayrı bir altı başlık taşımaz; aynı ana başlıklar kaleciye uygun ağırlıklarla hesaplanır. Bireysel sakatlık yatkınlığı bulunmaz. Sakatlıklar oyun akışındaki rastlantısal sistem tarafından belirlenir.

Tuple'ın altıncı alanı geçici bir oyun bayrağıdır ve vatandaşlık iddiası olarak yorumlanmamalıdır. Kesin yerli/millî statüsü kullanılacaksa bağımsız kaynak ve alan bazında kanıt kaydı eklenmelidir.

## Tekrarlanabilirlik

```powershell
npm run profiles:build-copa
npm run audit:japan-data
```

Denetim oyuncu/kulüp sayısını, tuple şemasını, yaş ve güç aralıklarını, mevki dağılımını, tekrarlanan kimlikleri ve copa.life profil kapsamını doğrular.
