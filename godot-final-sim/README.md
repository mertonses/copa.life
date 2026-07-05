# Kopa Final Sim - Godot Prototype

Bu klasor mevcut Kopa web oyunundan bagimsiz, final mac simulasyonunu denemek icin hazirlanmis Godot 4 prototipidir.

## Acma

1. Godot Project Manager'da **Ice Aktar** sec.
2. `C:\Users\pc\Desktop\Kopa\godot-final-sim\project.godot` dosyasini sec.
3. Projeyi ac ve sag ustten **Calistir**.

## Mimari

- **Kirilmaz ana kural:** Macin sonucu ve ana akisi once `MatchEventGenerator` tarafindan event listesi olarak uretilir. Godot sahnesi bu event listesini gorsel olarak oynatir. Gorsel motor mac sonucunu yeniden icat etmez.
- `MatchController`: mac dongusunu, UI'yi, skor/log bilgisini ve sahayi yonetir.
- `MatchEventGenerator`: seed, takim gucu, oyuncu/taktik agirliklari ve weighted randomness ile 90 dakikalik event listesini uretir.
- `MatchArchive`: event listesini JSON/archive mantigiyla saklamak, ozetlemek ve replay icin tek kaynak yapmak icin kullanilir.
- `TeamController`: takim oyuncularini, formasyon blogunu, hucum/savunma yerlesimini yonetir.
- `PlayerAgent`: tek bir oyuncunun pozisyon, hiz, hedef, rol ve basit istatistiklerini tutar.
- `MatchBall`: topun sahibi, serbest hareketi, pas/sut hizi ve hedef oyuncusunu yonetir.
- `FormationManager`: 4-4-2, 4-3-3, 3-5-2 baslangic rollerini ve pozisyonlarini uretir.
- `TacticManager`: gegen/kontra/otobus gibi stil degerlerini pressing, tempo, genislik ve direktlik olarak cevirir.
- `DecisionSystem`: top sahibinin sut, pas, ara pas, kanat pas, dripling veya top saklama kararini verir.
- `MovementSystem`: oyuncu hedefe gitme, hiz ve basit ayrisma/carpismadan kacinma hareketini uygular.
- `GoalkeeperAI`: kaleciyi topa gore cizgide kaydirir, tehlikede aci kapatmaya cikarir.
- `PitchManager`: saha sinirlarini, gol agzini, restart noktasini ve ekran koordinati cevirimini tutar.
- `DebugOverlay`: oyuncu hedefleri, state halkalari, pres oyuncusu, pas kanali kapatici ve defans cizgisini cizer.

## Mac Fazlari

Takimlar artik sadece "top bizde/rakipte" diye davranmaz. `MatchController` her frame su fazlari hesaplar:

- `build_up`: kendi sahasinda geriden oyun kurma
- `progression`: orta sahadan ileri tasima
- `wide_attack`: kanat uzerinden hucum
- `central_attack`: merkezden delme
- `final_third`: ceza sahasi cevresinde karar ani
- `press`: top kaybi sonrasi veya yakin baski
- `transition_defense`: top kaybi sonrasi sekle donme
- `low_block`: kaleye yakin kompakt savunma
- `defense`: normal savunma blogu

## Su an ne var?

- 22 bagimsiz oyuncu ajanı
- Formasyon blogu ve topa gore takim kaymasi
- Hucum/savunma gecislerinde farkli hedef davranislari
- Serbest top, pas, sut ve top kapma
- `OWNED`, `PASSING`, `LOOSE`, `SHOOTING`, `CROSSING`, `OUT_OF_PLAY` top state machine'i
- `KICK_OFF`, `IN_PLAY`, `OUT_OF_PLAY`, `GOAL` basta olmak uzere mac state iskeleti
- Top disari cikinca oyunu durdurup gecici restart
- Pres yapan oyuncu ve ikinci pas kanali kapatici
- Mac basinda uretilen event listesi replay olarak oynatilir
- `Instant` butonu event listesinden sonucu aninda gosterir
- `Summary` butonu event archive ozetini gosterir
- `Debug` butonu analiz cizgilerini acip kapatir
- Kaleci aci kapatma hedefi
- Oyuncular arasi basit ayrisma
- Olay gunlugu, skor ve canli saha gosterimi
- Test girdisi: `data/test_match.json`

## Sonraki adim

Bu prototipin hissi iyi gelirse mevcut Kopa final girdilerini buraya baglayabiliriz: takim gucu, rakip gucu, stil, aktif kartlar, seed, oyuncu rolleri, sakatliklar ve final cezasi.
