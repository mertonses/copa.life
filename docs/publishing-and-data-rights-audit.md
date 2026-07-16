# Yayın ve veri hakları ön denetimi

> Bu belge mühendislik risk kaydıdır; hukuki görüş değildir.

## Güncel ürün kararı

Oyuncu verisinin Football Manager'dan geldiği varsayılmayacaktır. Proje sahibinin 15 Temmuz 2026 tarihli beyanına göre kaynak veri bağımsızdır. Yayınlanan oyuncu profili, ham alanları göstermeyen ve deterministik biçimde üretilen **copa.life oyun modeli**dir.

Model altı ortak 0–100 boyut kullanır:

- Hücum/Kurtarış Etkisi
- Oyun Kurulumu
- Alan Kontrolü
- İkili Mücadele
- Tempo ve Dayanıklılık
- Baskı ve Karar

Sakatlık yatkınlığı kaldırılmıştır. Oyuncu fotoğrafı kullanılmaz. Temas ve baskı değerlendirmeleri kişilik veya sağlık iddiası olarak değil, oyun eğilimi olarak sunulur.

## Platform ayrımı

Web sürümü mevcut gerçek kulüp armalarını ve bayrak görsellerini korur. Lisans/provenans durumu çözülmüş sayılmaz; proje sahibinin 16 Temmuz 2026 tarihli açık web-only risk istisnasıyla dağıtılır.

Android sürümü:

- Gerçek arma klasörünü ve logo haritalarını paketlemez.
- Bayrak bitmap/SVG dosyalarını paketlemez; ülke ve dil seçiminde jenerik metin kodları kullanır.
- Tutarlı jenerik kalkanlar ve 2–3 harflik kısaltmalar kullanır.
- Patreon bağlantısı ve ikonunu paketlemez.
- Resmî kupa adları yerine ülke temelli jenerik adlar kullanır.
- Yalnız copa.life 0–100 profil çıktısını paketler; ham kaynak dosyası tools altında kalır.
- Android paket denetimiyle yasaklı dosya ve metinleri derleme sonrasında tarar.

## Kalan riskler

1. **Web kulüp armaları:** Yazılı izin kaydı olmadığı için web kamu yayını açısından yüksek risk.
2. **Gerçek kulüp adları:** Tarafsız düz metin kullanımı logodan daha düşük risklidir, ancak marka şikâyeti ihtimali sıfır değildir.
3. **Gerçek oyuncu kimlikleri:** İsim, yaş ve mevki kamusal spor bilgisi olarak kullanılır; kişilik hakkı veya düzeltme talepleri için takedown kanalı korunmalıdır.
4. **Bayrak dosyalarının kaynağı:** Ulusal bayrak tasarımından ayrı olarak kullanılan bitmap/SVG dosyalarının üretim kaydı tamamlanmalıdır.

## Uygulanan kontroller

- Kaynak oyuncu dosyası yayın dizininin dışına taşındı.
- 8.866 profil copa-model-v1 çıktısına dönüştürüldü.
- Ham 1–20 alanlar ve sakatlık yatkınlığı Android/veri paketinden çıkarıldı.
- Android ve web için ayrı derleme politikaları kuruldu.
- Ghost Club varsayılan kapalı, açık rızalı ve sürümlü kullanım şartlı hale getirildi.
- Bildirim, yerel engelleme, sunucu inceleme/engelleme, tekrar ihlal kontrolü ve gerçek otomatik silme eklendi.
- Gizlilik, retention, kullanım şartları ve takedown belgeleri yayıma dahil edildi.

## Yayın kapısı

Yerel hak denetimi envanter kapsamını doğrular. Web için gerçek armalar ve kaynağı belgelenmemiş bayrak dosyaları yalnız açık `owner_accepted_web_only` kaydı bulunduğu sürece yayınlanabilir; bu kayıt hukuki temizlik değildir. Android ayrı ve daha katı paket denetiminden geçer; webdeki arma veya bayrak görsellerini Android'e taşımaz.
