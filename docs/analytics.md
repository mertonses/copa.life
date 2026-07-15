# copa.life ölçüm mimarisi

Bu yapı kullanıcı profili çıkarmadan iki ayrı soruyu yanıtlar:

1. Siteye kaç ziyaret geldi, nereden geldi ve sayfa ne kadar hızlıydı?
2. Oyuncular oyun akışının hangi aşamalarına ulaştı?

## 1. Cloudflare Web Analytics

GitHub Pages build'i yalnız `CF_WEB_ANALYTICS_TOKEN` değişkeni tanımlıysa Cloudflare beacon'ını `dist/index.html` içine ekler. Kaynak `index.html` ve Android paketi beacon içermez.

Cloudflare Dashboard'da `copa.life` için Web Analytics sitesi oluşturulduktan sonra token, GitHub repository variable olarak `CF_WEB_ANALYTICS_TOKEN` adıyla eklenir. Secret gerekmez; token zaten tarayıcıya gönderilen public site token'ıdır.

Bu katman ziyaret, sayfa görüntüleme, yönlendiren site, ülke, cihaz, tarayıcı, işletim sistemi ve Core Web Vitals için kullanılır. Cloudflare'ın resmi kurulum rehberi: <https://developers.cloudflare.com/web-analytics/get-started/>.

## 2. Kimliksiz ürün hunisi

`src/runtime/productAnalytics.js` yalnız üretim web hostlarında çalışır. Çerez, `localStorage`, kullanıcı/oturum kimliği, e-posta, oyuncu adı, kullanıcı kulübü adı veya serbest metin göndermez. Global Privacy Control veya Do Not Track açık olduğunda olay göndermez.

İzinli olaylar:

- `session_started`
- `country_selected`
- `draft_started`
- `xi_completed`
- `round_completed`
- `run_finished`
- `ghost_opt_in`
- `profile_open_error`

İzinli boyutlar yalnız platform, arayüz dili, seçilen oyun ülkesi, tur, sonuç kategorisi, hata kategorisi, sayfa yolu ve build sürümüdür.

Worker endpoint'i: `POST /v1/analytics/events`

Analytics Engine dataset'i: `copa_life_product_events`

| Alan | Anlam |
| --- | --- |
| `blob1` | event |
| `blob2` | platform |
| `blob3` | locale |
| `blob4` | game country |
| `blob5` | outcome |
| `blob6` | error/detail category |
| `blob7` | page path |
| `blob8` | app/build version |
| `double1` | count, her zaman 1 |
| `double2` | round, 0–6 |

Dataset ilk üretim olayında otomatik oluşur. Resmî kurulum: <https://developers.cloudflare.com/analytics/analytics-engine/get-started/>.

## Örnek sorgular

Yedi günlük huni:

```sql
SELECT blob1 AS event, SUM(_sample_interval * double1) AS total
FROM copa_life_product_events
WHERE timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY event
ORDER BY total DESC
```

Ülke seçimine göre tamamlanan run:

```sql
SELECT blob4 AS game_country, SUM(_sample_interval * double1) AS completed_runs
FROM copa_life_product_events
WHERE timestamp >= NOW() - INTERVAL '30' DAY
  AND blob1 = 'run_finished'
GROUP BY game_country
ORDER BY completed_runs DESC
```

Build bazında oyuncu profili yükleme hataları:

```sql
SELECT blob8 AS build_version, SUM(_sample_interval * double1) AS errors
FROM copa_life_product_events
WHERE timestamp >= NOW() - INTERVAL '7' DAY
  AND blob1 = 'profile_open_error'
GROUP BY build_version
ORDER BY errors DESC
```

SQL API için yalnız `Account Analytics: Read` yetkili ayrı bir okuma token'ı kullanılmalıdır: <https://developers.cloudflare.com/analytics/analytics-engine/sql-api/>.

## Yayın kapıları

- `npm run check:analytics`: web ölçümünü ve Android dışlamasını doğrular.
- `npm run check:android`: Android paketinde beacon, endpoint veya web analitik runtime'ı bulunmasını engeller.
- Staging ve production farklı Analytics Engine dataset'leri kullanır.
- Mobil analitik ileride açılırsa ayrı karar, kullanıcı bilgilendirmesi ve Play Data Safety güncellemesi gerekir.
