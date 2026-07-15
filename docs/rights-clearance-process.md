# Veri ve marka hakları yayın süreci

Bu süreç teknik bir yayın kontrolüdür; hukuki görüş değildir. Hak sahibi, kullanım alanı veya uygulanacak ülke konusunda kuşku varsa fikri mülkiyet alanında çalışan bir hukukçu incelemelidir.

## Kural

`docs/data-rights-inventory.json` içindeki her kayıt `cleared` olmadıkça genel web paketi halka açık dağıtıma hazır sayılmaz. Android paketi ayrıca gerçek kulüp armalarını dışarıda bırakan bağımsız paket kontrolünden geçer.

Bir kaydı `cleared` yapmak için aynı kayda şu alanlar eklenmelidir:

- `evidence`: sözleşme, açık lisans, proje sahibi kaynak beyanı veya yazılı iznin özeti
- `owner`: kanıtı veren hak sahibi ve proje içindeki sorumlu
- `reviewed_at`: ISO tarih
- Gerekiyorsa `territories`, `purposes`, `expires_at`: coğrafi, ticari ve süre sınırları

Satın alma makbuzu, kaynak adı veya “fan projesi” ibaresi tek başına yeniden dağıtım izni sayılmaz. Kanıt yoksa varlık özgün/jenerik karşılığıyla değiştirilmelidir.

## Yayın öncesi

1. `npm run check:rights` ile envanter yapısını doğrula.
2. Android için `npm run build:android && npm run check:android` çalıştır; bu paket gerçek armaları ve riskli marka/ödeme varlıklarını içermemelidir.
3. Genel web yayını için `npm run check:rights:public` ile bütün web varlıklarının kanıtlı biçimde temizlendiğini doğrula.
4. Paket içeriğini ve kanıt kayıtlarını sürüm etiketiyle arşivle.
5. İtiraz/silme talebi gelirse ilgili kaydı `blocked` durumuna döndür, yeni yayını durdur ve varlığı kaldır.

## Mevcut durum

- Oyuncu kaynak verisinin üçüncü taraf bir futbol oyunundan geldiği varsayılmaz. Proje sahibinin bağımsız kaynak beyanı kaydedilmiştir.
- Yayınlanan oyuncu profilleri copa.life'a ait altı adet 0–100 oyun boyutudur; ham 1–20 alanlar ve bireysel sakatlık yatkınlığı yayımlanmaz.
- Android gerçek kulüp armalarını içermez ve jenerik kısaltma armaları kullanır.
- Web paketindeki gerçek kulüp armaları için yeniden dağıtım kanıtı kayıtlı değildir; genel web yayını bu nedenle ayrıca engellidir.
- Bayrak dosyalarının uygulama biçimi için kaynak/lisans kaydı tamamlanmalıdır.
