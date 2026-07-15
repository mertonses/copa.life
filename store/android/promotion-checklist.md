# Android kanal terfi kontrol listesi

Bu liste yeni AAB yüklemek için değil, internal testte doğrulanmış aynı sürümü daha geniş bir kanala taşımak içindir.

## Internal test kabulü

- `versionCode` ve `versionName`, `store/android/release-manifest.json` ile aynı.
- Test edilen AAB'nin SHA-256 değeri release manifestindeki değerle aynı.
- En az bir gerçek düşük/orta seviye telefon ve bir tablet veya geniş ekran cihazda kurulum yapıldı.
- Mevcut mağaza sürümünün üzerine güncelleme yapıldı; kayıt, kadro, kartlar, dil ve Ghost tercihi korundu.
- İlk açılış, geri tuşu, arka plana alma, çevrimdışı açılış ve destek bağlantısı çalıştı.
- Ghost paylaşımı varsayılan kapalı; rıza, bildirme, engelleme ve veri silme çalıştı.
- Yeni kritik hata, ANR veya beklenmeyen izin görülmedi.

## Production terfisi

1. Play Console'da internal test sürümünü açın; yeni AAB yüklemeyin.
2. Aynı `versionCode` taşıyan sürümü production'a terfi ettirin.
3. İlk production sürümü değilse kademeli dağıtımı düşük oranla başlatın.
4. Android vitals, kullanıcı geri bildirimi ve Ghost API health durumunu izleyin.
5. Sorun yoksa oranı aşamalı yükseltin; sorun varsa rollout'u durdurun.

## Sorun halinde

- Kademeli rollout devam ediyorsa Play Console'dan durdurun.
- Web değişikliği sorunun kaynağıysa önceki sağlam commit'i Pages'e yeniden yayınlayın.
- Mobil düzeltme gerekiyorsa mevcut `versionCode` tekrar kullanılmaz; patch sürümü artırılıp yeni AAB internal'a gönderilir.
- Upload anahtarı veya sertifika uyuşmazlığı varsa yeni anahtar üretmeyin; `release/android-upload-certificate.sha256` ve çevrimdışı keystore yedeğini karşılaştırın.
