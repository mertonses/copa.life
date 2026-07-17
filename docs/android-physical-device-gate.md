# Android fiziksel cihaz performans kapısı

Bu kapı yalnız fiziksel, düşük seviye bir Android cihaz bağlandığında tamamlanır. Emülatör; ısı, gerçek bellek baskısı ve süreç kapanması için kabul ölçümü değildir.

## Ön koşullar

1. Debug veya release adayı `life.copa.app` cihazda kurulu olmalı.
2. USB hata ayıklama açık olmalı ve `adb devices` tek cihaz göstermeli.
3. Uygulamada Final Sim ekranı açık olmalı.

## Ölçüm sırası

```powershell
npm run android:physical-gate -- -Phase doctor
npm run android:physical-gate -- -Phase baseline -DurationSeconds 30
npm run android:physical-gate -- -Phase one -DurationSeconds 45
npm run android:physical-gate -- -Phase eight -DurationSeconds 45
npm run android:physical-gate -- -Phase survival -DurationSeconds 60
```

- `one` sırasında Final Sim 1× hızda çalıştırılır.
- `eight` sırasında aynı senaryo 8× hızda çalıştırılır.
- `survival` sırasında uygulama arka plana alınır, başka uygulamalar açılır ve copa.life’a geri dönülür.
- Çıktılar `outputs/android-physical-gate/` altında JSON özet ve ham `gfxinfo`, bellek, batarya/ısı ve logcat kayıtları olarak oluşur.

## Geçiş ölçütleri

- Süreç beklenmedik biçimde kapanmamalı.
- AndroidRuntime kaynaklı fatal hata bulunmamalı.
- 8× ölçümünde janky frame oranı yüzde 10’u aşmamalı.
- Toplam PSS artışı 1× başlangıcına göre 120 MB’ı aşmamalı.
- Cihaz sıcaklığı başlangıca göre 8°C’den fazla yükselmemeli.
- Arka plan dönüşünde Final Sim veya penaltı checkpoint’i aynı noktadan açılmalı.
