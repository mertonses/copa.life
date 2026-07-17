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
- `final_sim_completed`

İzinli boyutlar yalnız platform, arayüz dili, seçilen oyun ülkesi, tur, sonuç kategorisi, hata kategorisi, sayfa yolu ve build sürümüdür. Final simülasyon olayı ayrıca model sürümü, kaba güç farkı bandı, bitiş türü ve son taktik kategorisini taşır. Seed, tekrar kodu, kesin güçler, oyuncu/kulüp adı veya karar zaman çizelgesi gönderilmez.

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
| `blob9` | final model version veya boş |
| `blob10` | kaba güç farkı bandı veya boş |
| `blob11` | bitiş türü (`regulation`, `golden_goal`, `penalties`) veya boş |
| `blob12` | son taktik kategorisi veya boş |
| `blob13` | analitik şema sürümü |
| `double1` | count, her zaman 1 |
| `double2` | round, 0–6 |
| `double3` | analitik şema sürümü |

Dataset ilk üretim olayında otomatik oluşur. Resmî kurulum: <https://developers.cloudflare.com/analytics/analytics-engine/get-started/>.

## 3. Worker sağlık metrikleri

Worker her isteği `copa_life_worker_health` dataset'ine toplu bir sağlık noktası olarak yazar. Ham URL, Ghost kimliği, IP, kullanıcı/oturum/kurulum kimliği ve Analytics Engine index'i yazılmaz. URL yalnızca sabit bir rota grubuna çevrilir.

| Alan | Anlam |
| --- | --- |
| `blob1` | sabit rota grubu (`health`, `ghost_write`, `ghost_match`, `ghost_report`, `ghost_delete`, `ghost_delete_all`, `analytics_events`, `not_found`) |
| `blob2` | HTTP metodu |
| `blob3` | durum sınıfı (`2xx`, `4xx`, `5xx`) |
| `double1` | istek sayısı, her zaman 1 |
| `double2` | Worker gecikmesi, milisaniye |
| `double3` | HTTP durum kodu |

Staging dataset'leri `copa_life_product_events_staging` ve `copa_life_worker_health_staging` adlarıyla üretimden tamamen ayrıdır.

## Otomatik rapor ve alarm

- `Weekly analytics report` her pazartesi son yedi günün anonim huni oranlarını, ülke dağılımını, profil açma hatalarını, final model/güç bandı/bitiş/taktik dağılımını ve Worker sağlığını GitHub Actions özetine ve JSON artifact'ine yazar.
- `Analytics error monitor` her 30 dakikada son bir saati kontrol eder. En az 5 olaydan sonra profil açma hata oranı %5'i veya Worker 5xx oranı %2'yi aşarsa workflow başarısız olur ve GitHub bildirimi üretir.
- Eşikler production environment variable'larıyla `PROFILE_ERROR_MIN_COUNT`, `PROFILE_ERROR_RATE`, `WORKER_5XX_MIN_COUNT` ve `WORKER_5XX_RATE` olarak değiştirilebilir.
- Her iki workflow için production environment'a `CLOUDFLARE_ACCOUNT_ID` ve yalnız `Account Analytics: Read` yetkili `CLOUDFLARE_ANALYTICS_TOKEN` secret'ı eklenir. Deploy token'ı raporlama için kullanılmaz.
- Token henüz yoksa raporlar `not_configured`, dataset ilk veriyle oluşmadıysa `waiting_for_first_data` durumuyla güvenli şekilde bekler.

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
- Haftalık rapor ve 30 dakikalık hata alarmı kimliksiz, örnekleme-düzeltilmiş (`_sample_interval`) toplamlardan üretilir.
- Mobil analitik ileride açılırsa ayrı karar, kullanıcı bilgilendirmesi ve Play Data Safety güncellemesi gerekir.
