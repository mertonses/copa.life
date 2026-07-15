# Sistem mimarisi

Uygulama klasik tarayıcı betikleriyle çalışır; yeni sistem sorumlulukları `index.html` içindeki oyun kurallarından ayrılmıştır.

## Sınırlar

- `src/state/runPersistence.js`: sürümlü şema, doğrulama, eski kayıt göçü, primary/backup/session seçimi ve yazma hataları
- `src/state/runLifecycle.js`: `intro → draft → hub → match → reward → result` geçişleri ve faz invariantları
- `src/state/diagnostics.js`: kişisel bilgi eklemeyen yerel hata halkası ve kullanıcı tarafından kopyalanabilir rapor
- `src/runtime/lazyAssets.js`: ağır/görsel varlıkların ihtiyaç anında yüklenmesi
- `services/ghost-club-api/`: ayrı Worker, D1 migration, rate-limit, test ve dağıtım yaşam döngüsü

`index.html` halen oyun ekranlarının ve mevcut oyun kurallarının bileşim köküdür. Yeni kalıcılık, yaşam döngüsü, tanılama veya ağ politikaları buraya eklenmemeli; ilgili modülde uygulanıp yalnız ince bir UI köprüsüyle çağrılmalıdır.

## Durum sahipliği

Çalışan oyun durumu bellekte tutulur. Yalnız güvenli `draft` ve `hub` kontrol noktaları `runPersistence` şemasına yazılır. `match` ve `reward` sırasında yeniden yükleme, yarım işlemi tekrar oynatmak yerine son güvenli kontrol noktasına döner. Bozuk birincil kayıt varsa doğrulanmış session/backup kopyası denenir; geri yükleme hatası kanıt bırakmadan kaydı silmez.

## Değişiklik kuralı

1. Yeni faz eklenirse önce `runLifecycle` geçiş tablosu ve invariantları güncellenir.
2. Kayıt biçimi değişirse şema sürümü, migration ve `check:persistence` birlikte güncellenir.
3. Worker veri biçimi değişirse ileri yönlü D1 migration ve Worker runtime testi aynı değişiklikte bulunur.
4. Halka açık pakete hak duyarlı veri eklenirse önce `data-rights-inventory.json` kaydı ve kanıtı eklenir.
