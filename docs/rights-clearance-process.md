# Veri ve marka hakları yayın süreci

Bu süreç teknik bir yayın kontrolüdür; hukuki görüş değildir. Hak sahibi, kullanım alanı veya uygulanacak ülke konusunda kuşku varsa fikri mülkiyet alanında çalışan bir hukukçu incelemelidir.

## Kural

`docs/data-rights-inventory.json` varsayılan olarak temizlenmemiş her kaydı engeller. Yalnız proje sahibinin açıkça kabul ettiği `owner_accepted_web_only` kaydı web dağıtımına istisna olabilir. Bu durum lisans, izin veya hukuki temizlik anlamına gelmez; kapsam, risk kabulü, kanıt, sorumlu ve inceleme tarihi zorunludur. Android paketi bu istisnaları devralmaz ve ilgili görsel dosyaları katı biçimde dışarıda bırakır.

Bir kaydı `cleared` yapmak için aynı kayda şu alanlar eklenmelidir:

- `evidence`: sözleşme, açık lisans, proje sahibi kaynak beyanı veya yazılı iznin özeti
- `owner`: kanıtı veren hak sahibi ve proje içindeki sorumlu
- `reviewed_at`: ISO tarih
- Gerekiyorsa `territories`, `purposes`, `expires_at`: coğrafi, ticari ve süre sınırları

Satın alma makbuzu, kaynak adı veya “fan projesi” ibaresi tek başına yeniden dağıtım izni sayılmaz. Kanıt yoksa varlık özgün/jenerik karşılığıyla değiştirilmelidir.

## Yayın öncesi

1. `npm run check:rights` ile envanter yapısını doğrula.
2. Android için `npm run build:android && npm run check:android` çalıştır; bu paket gerçek armaları ve riskli marka/ödeme varlıklarını içermemelidir.
3. Genel web yayını için `npm run check:rights:public` çalıştır; temiz kayıtları ve açık web-only istisnalarını doğrula, başka bir durum varsa yayını durdur.
4. Paket içeriğini ve kanıt kayıtlarını sürüm etiketiyle arşivle.
5. İtiraz/silme talebi gelirse ilgili kaydı `blocked` durumuna döndür, yeni yayını durdur ve varlığı kaldır.

## Mevcut durum

- Oyuncu kaynak verisinin üçüncü taraf bir futbol oyunundan geldiği varsayılmaz. Proje sahibinin bağımsız kaynak beyanı kaydedilmiştir.
- Yayınlanan oyuncu profilleri copa.life'a ait altı adet 0–100 oyun boyutudur; ham 1–20 alanlar ve bireysel sakatlık yatkınlığı yayımlanmaz.
- Android gerçek kulüp armalarını veya bayrak görsel dosyalarını içermez; jenerik kulüp kısaltmaları ve metin ülke kodları kullanır.
- Web paketindeki gerçek kulüp armaları ve bayrak dosyaları için yeniden dağıtım kanıtı kayıtlı değildir. Proje sahibi 16 Temmuz 2026 tarihinde yalnız web dağıtımı için açık risk istisnası vermiştir; kayıtlar hukuken temizlenmiş sayılmaz.
