# Copa Arena oyuncu veri sözleşmesi

Arena kataloğu, oyuncunun vatandaşlığını değil oyuncu kaydının geldiği lig havuzunu taşır. İstemciye gönderilen `sourceLeague` ve `sourceLeagueLabel` alanları bu nedenle yalnızca **veri kaynağı** olarak gösterilir. Doğrulanmış bağımsız bir vatandaşlık kaynağı bulunmadığı sürece `nationality` değeri `null` kalır.

## Kaynak kodları

| Kod | Kapsam |
| --- | --- |
| TR | Türkiye profesyonel oyuncu havuzları |
| ES | İspanya profesyonel oyuncu havuzları |
| DE | Almanya profesyonel oyuncu havuzları |
| IT | İtalya profesyonel oyuncu havuzları |
| ENG | İngiltere profesyonel oyuncu havuzları |
| JP | Japonya üst lig kulüpleri |

Tüm havuzlar `2026-07-20` katalog veri sürümünde birlikte yayımlanmıştır. Yalnızca Japonya kaynağının doğrulanmış veri anlık görüntü tarihi vardır (`2026-07-15`); diğer kaynaklarda bilinmeyen bir tarih uydurulmaz ve `snapshotDate` boş bırakılır. Her katalog sürümü kaynak dosyalar, kapsam metadata’sı ve üretim kurallarından türetilen bir hash ile kimliklendirilir.

## Kimlik ve tutarsızlık politikası

- Oyuncu kimliği dosya sırasından bağımsız, normalize edilmiş ad ve yaş üzerinden türetilir.
- Aynı ad/yaş kimliği birden fazla kaynakta veya bir kaynak içinde birden fazla kayıtta bulunursa belirsiz kabul edilir.
- Belirsiz kimliğin hangi kulüpte olduğuna dair güvenilir snapshot kanıtı yoksa sürümlerden biri tahmin edilmez; kimliğin tüm kopyaları Arena kataloğundan karantinaya alınır.
- Her lig/hat/seviye havuzu en az 12, hedef olarak 24 farklı oyuncu içerir. Dar güç bantlarında en yakın güçteki oyuncularla çeşitlilik tamamlanır.
- Oda açılırken kurallar, katalog sürümü, kaynak provenance metadata’sı ve 66 benzersiz teklif sabitlenir. Aynı gerçek oyuncu bir maçtaki iki kadroda veya iki farklı teklif turunda tekrar kullanılamaz.

## Doğrulama

```powershell
npm run check:arena:players
npm run test:arena
npm run check:arena:selfplay
```
