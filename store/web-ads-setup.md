# Copa web reklam kurulumu

Web reklam katmanı varsayılan olarak kapalıdır. Geçerli bir AdSense hesabı, site onayı ve HTML5 Games Ads erişimi olmadan reklam isteği yapılmaz.

## Onay sırası

1. AdSense for Content erişimini etkinleştir.
2. `copa.life` sitesini AdSense'e ekle ve site incelemesini tamamla.
3. HTML5 Games Ads erişimi için başvur.
4. Copa için reklam istemcisi, özel kanal ve liste alanı kimliklerini oluştur.

## GitHub Actions secrets

Pages dağıtımında aşağıdaki repository secrets kullanılır:

- `COPA_ADSENSE_CLIENT`: `ca-pub-` ile başlayan 16 haneli yayıncı kimliği
- `COPA_ADSENSE_CHANNEL`: Copa oyun reklamlarına ayrılan özel kanal kimliği
- `COPA_ADSENSE_DISPLAY_SLOT`: maç geçmişi ve sıralama alanı için 10 haneli reklam birimi kimliği

Bu değerler eksik veya geçersizse derleme reklam kodunu pasif bırakır. Test kimlikleri üretim dağıtımına yazılmaz.

## Yerleşim ilkeleri

- Arena maç sonucu: düşük sıklıklı geçiş reklamı
- Draft ve pazar yenileme: yalnız oyuncunun açıkça seçtiği ödüllü reklam
- Maç geçmişi ve Dünya sıralaması: açıkça işaretlenmiş doğal reklam alanı
- Canlı maç, taktik seçimi, penaltı ve karar süresi: reklam yok

Ödül yalnız reklamın izlendiği SDK tarafından doğrulandığında verilir.
