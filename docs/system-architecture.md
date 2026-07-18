# Sistem mimarisi

Uygulama klasik tarayıcı betikleriyle çalışır; yeni sistem sorumlulukları `index.html` içindeki oyun kurallarından ayrılmıştır.

## Sınırlar

- `src/state/runPersistence.js`: sürümlü şema, doğrulama, eski kayıt göçü, primary/backup/session seçimi ve yazma hataları
- `src/state/finalSimPersistence.js`: devam eden finale özel, 48 saat süreli, checksum'lı ve primary/backup/session kontrollü checkpoint
- `src/state/runLifecycle.js`: `intro → draft → hub → match → reward → result` geçişleri ve faz invariantları
- `src/state/diagnostics.js`: kişisel bilgi eklemeyen yerel hata halkası ve kullanıcı tarafından kopyalanabilir rapor
- `src/runtime/lazyAssets.js`: ağır/görsel varlıkların ihtiyaç anında yüklenmesi
- `src/sim/finalSimCore.js`: DOM'suz deterministik maç çekirdeği, kalibrasyon, aynı-seed A/B ve CFS3 tekrar kodu
- `src/runtime/finalReplay.js`: kişisel isim içermeyen yerel final denetim kaydı, kod kopyalama ve kod doğrulama arayüzü
- `services/ghost-club-api/`: ayrı Worker, D1 migration, rate-limit, test ve dağıtım yaşam döngüsü

`index.html` halen oyun ekranlarının ve mevcut oyun kurallarının bileşim köküdür. Yeni kalıcılık, yaşam döngüsü, tanılama veya ağ politikaları buraya eklenmemeli; ilgili modülde uygulanıp yalnız ince bir UI köprüsüyle çağrılmalıdır.

## Durum sahipliği

Çalışan oyun durumu bellekte tutulur. Güvenli `draft` ve `hub` kontrol noktaları `runPersistence` şemasına yazılır. Normal tur maçı ve ödül sırasında yeniden yükleme son güvenli kontrol noktasına döner. Final sırasında ise RNG, dakika, skor, taktik kararları, oyuncu/top konumu ve olay istatistikleri ayrı `finalSimPersistence` checkpoint'ine yazılır; Android süreç kapanması veya sayfa yenilemesi finali aynı durumdan sürdürür. Bozuk birincil kayıt varsa doğrulanmış session/backup kopyası denenir.

## Değişiklik kuralı

1. Yeni faz eklenirse önce `runLifecycle` geçiş tablosu ve invariantları güncellenir.
2. Kayıt biçimi değişirse şema sürümü, migration ve `check:persistence` birlikte güncellenir.
3. Worker veri biçimi değişirse ileri yönlü D1 migration ve Worker runtime testi aynı değişiklikte bulunur.
4. Halka açık pakete hak duyarlı veri eklenirse önce `data-rights-inventory.json` kaydı ve kanıtı eklenir.
5. Final model davranışı değişirse model sürümü, 10.000 maç Monte Carlo bantları, aynı-seed A/B eşikleri ve tekrar uyumluluğu birlikte güncellenir.
