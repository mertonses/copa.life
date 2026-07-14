/* Arayuz metinleri ve dil secimi. */
var T={
 tr:{tagline:"",budget:"Kasa",coverTitle:"copa.life",coverSub:"Türkiye Kupası",
  coverBlurb:"11'ini draftla. transfer saati işliyor. her tur rakip güçlenir, oyuncular sakatlanır. finale gelirsen sahaya çıkarsın.",
  artNote:"1953 tarihli 'Going to the Match' tablosunda L.S. Lowry, Bolton Wanderers'ın o dönemki evi Burnden Park'a giden futbol taraftarlarını resmeder. Saha, Salford'daki Pendlebury'ye yalnızca birkaç mil uzaklıktaydı. Lowry büyük bir futbolseverdi ve Manchester City maçlarına düzenli olarak giderdi.",
  patreonText:"copa.life tek kişinin eseridir. Gelişim sürecine Patreon üzerinden destek olabilirsiniz.",
  pickhdr:"Dizilişini seç",proto:"copa.life prototip · Süper Lig + 1. Lig · 1358 oyuncu",
  formSub:{"4-3-3":"klasik","4-4-2":"abi","4-2-3-1":"modern","3-5-2":"kanat","5-3-2":"kale","3-4-3":"hücum","4-5-1":"otobüs"},
  startBtn:"BAŞLA",quickStartBtn:"<svg class='dice-ico' viewBox='0 0 20 20' width='14' height='14' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='2.5' y='2.5' width='15' height='15' rx='3'/><circle cx='7' cy='7' r='1' fill='currentColor' stroke='none'/><circle cx='13' cy='7' r='1' fill='currentColor' stroke='none'/><circle cx='10' cy='10' r='1' fill='currentColor' stroke='none'/><circle cx='7' cy='13' r='1' fill='currentColor' stroke='none'/><circle cx='13' cy='13' r='1' fill='currentColor' stroke='none'/></svg> RASTGELE BAŞLA",cNamePh:"Kulübüne bir isim ver...",
  undo:"? Son hamleyi geri al",rollHint:"Zar at. Rastgele bir mevki açılsın.",roll:`<svg class='dsvg' viewBox='0 0 28 28' width='24' height='24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='2' width='24' height='24' rx='5'/><circle cx='8' cy='8' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='8' r='2' fill='currentColor'><animate attributeName='opacity' values='0;1;1;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='14' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='1;0;1;0;1;0' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='8' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;0;0;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;0;0;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='8' cy='20' r='2' fill='currentColor'><animate attributeName='opacity' values='0;1;1;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='20' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle></svg> ZAR AT`,allBtn:`<svg viewBox='0 0 16 22' width='14' height='18' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.2em;margin-right:3px'><path d='M11 2L4 12H9L6 20L14 10H9L11 2Z' fill='currentColor' opacity='.15'/><path d='M11 2L4 12H9L6 20L14 10H9L11 2Z'/></svg> Takımı Otomatik Kur`,rollPrompt:"ZAR AT › mevki",
  afford:"alınabilir",tooexp:"kasa yetmez",free:"Bonservissiz",noAfford:"kasa az: en ucuzu yine alınabilir",
  pos:{GK:"Kaleci",LB:"Sol Bek",RB:"Sağ Bek",CB:"Stoper",CM:"Orta Saha",DM:"Ön Libero",LM:"Sol Açık",RM:"Sağ Açık",LW:"Sol Kanat",RW:"Sağ Kanat",AM:"On Numara",ST:"Forvet",WB:"Bek"},
  abbr:{GK:"KL",CB:"STP",LB:"SLB",RB:"SĞB",WB:"BEK",CM:"OS",DM:"ÖL",LM:"SLA",RM:"SĞA",LW:"SLK",RW:"SĞK",AM:"10",ST:"SNT"},
  grp:{GK:"Kaleci",DEF:"Defans",MID:"Orta saha",FWD:"Forvet"},
  capRoll:"ZAR DÖNÜYOR",youLbl:"Takımın",oppLbl:"Rakip",shopLbl:"Kart Pazar\u0131",pres:"<svg viewBox='0 0 14 12' width='13' height='11' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><rect x='1' y='9' width='12' height='2.5' rx='.8'/><rect x='4' y='2.5' width='6' height='7' rx='.5'/><line x1='3.5' y1='2.5' x2='10.5' y2='2.5'/></svg> Başkan",train:"??? Antrenman",scout:"?? Rakip kadrosunu gör",
  talk:"<svg viewBox='0 0 18 16' width='15' height='13' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' class='si' aria-hidden='true'><path d='M3 2.5h12a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 15 11H8l-4 3v-3H3A1.5 1.5 0 0 1 1.5 9.5V4A1.5 1.5 0 0 1 3 2.5Z'/></svg> Takıma Konuş",
  play:`Maça çık <span class='play-arrow' aria-hidden='true'><svg viewBox='0 0 18 18' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path class='play-arrow-ghost' d='M3 4L9 9L3 14'/><path class='play-arrow-main' d='M7 4L13 9L7 14'/></svg></span>`,playFinal:`FİNALE ÇIK <span class='play-arrow' aria-hidden='true'><svg viewBox='0 0 18 18' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path class='play-arrow-ghost' d='M3 4L9 9L3 14'/><path class='play-arrow-main' d='M7 4L13 9L7 14'/></svg></span>`,talk:"<svg viewBox='0 0 18 16' width='15' height='13' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' class='si' aria-hidden='true'><path d='M3 2.5h12a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 15 11H8l-4 3v-3H3A1.5 1.5 0 0 1 1.5 9.5V4A1.5 1.5 0 0 1 3 2.5Z'/></svg> Takıma Konuş",owned:"alındı",cardsLbl:"Kartların",autoOn:"Otomatik: AÇIK",autoOff:"Otomatik: KAPALI",
  ddTitle:"TRANSFER<br>SON GÜNÜ",squad:"kadro",
  rounds:["1. TUR","2. TUR","SON 16","ÇEYREK","YARI","FİNAL"],rabbr:["T1","T2","16","Çf","Yf","F"],
  vsword:"karşında",prize:m=>`Prim +€${m}M`,
  matchWin:"TUR ATLADIN",matchLose:"ELENDİN",matchPen:"PENALTILARDA TUR!",teleHead:"MAÇ SONUCU",cont:"Devam",toFinal:"Finale!",us:"BİZ",
  champTitle:"ŞAMPİYON",champV:"kupayı kaldırdın. bu kadro tarihe geçti.",outTitle:"ELENDİN",outV:t=>`${t}. turda kupaya veda. daha iyi bir build kur.`,
  lblTur:"Ulaşılan",lblGuc:"Güç",lblKart:"Kart",copy:"<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.12em;margin-right:4px'><path d='M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z'/><path d='M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1'/></svg>Sonucu kopyala",copied:"<svg viewBox='0 0 24 24' width='12' height='12' fill='currentColor' style='vertical-align:-.12em;margin-right:4px;color:var(--good)'><path d='M18.333 6a3.667 3.667 0 0 1 3.667 3.667v8.666a3.667 3.667 0 0 1 -3.667 3.667h-8.666a3.667 3.667 0 0 1 -3.667 -3.667v-8.666a3.667 3.667 0 0 1 3.667 -3.667zm-3.333 -4c1.094 0 1.828 .533 2.374 1.514a1 1 0 1 1 -1.748 .972c-.221 -.398 -.342 -.486 -.626 -.486h-10c-.548 0 -1 .452 -1 1v9.998c0 .32 .154 .618 .407 .805l.1 .065a1 1 0 1 1 -.99 1.738a3 3 0 0 1 -1.517 -2.606v-10c0 -1.652 1.348 -3 3 -3zm1.293 9.293l-3.293 3.292l-1.293 -1.292a1 1 0 0 0 -1.414 1.414l2 2a1 1 0 0 0 1.414 0l4 -4a1 1 0 0 0 -1.414 -1.414'/></svg>kopyalandı ?",copyfail:"kopyalanamadı",again:"YENİ copa.life TURU",
  presHead:"BAŞKANLIK BÜLTENİ",presThink:"BAŞKAN DÜŞÜNÜYOR...",presClose:"Tamam",
  kitHdr:"Forma Rengini Seç",kitSub:"sahada bu renkte oynayacaksın",spd:"HIZ",
  styleHdr:"Oyun Anlayışını Seç",styleSub:"küçük stil bonusunu belirler",
  motm:"MAÇIN ADAMI",yourXi:"SENİN 11'İN",oppXi:"RAKİP 11",
  scoutHead:"RAKİP KADROSU",weak:f=>`zayıf kanat: ${f}`,flanks:{L:"SOL",C:"ORTA",R:"SAĞ"},matchupMsg:"zayıf kanadı zorluyorsun (+güç)",scoutNotes:{FWD:["Ceza sahasında tehlikeli, yakın takip şart","Hız konusunda dikkatli — arka alanı seviyor","Döner ve bitirir, pozisyon verme","Off-top oynadığında iş yapar","Savunmanın arkasına düşüyor","Uzaktan şut sevmiyor, pas arayıcı","Hava topunda güçlü değil, zemin oyna"],MID:["Oyun kurucu, pas güzergahını kes","İkinci toplarda baskın çıkıyor","Kısa pas ağıyla ilerliyor, presin altında bozuluyor","Pozisyon okuma iyi ama hızı yok","Çift pas sonra şut — dikkat","Setpiyde tehlikeli, adam işaretle"],DEF:["Yüksek hat oynuyor, uzun top deneyebilirsin","Hava topuna hâkim, yerden geç","Topa agresif geliyor — üstüne çık","Çizgiye yapışıyor, aktif baskı yapılmıyor","Sol bek sağ kanatta zayıf kalabilir"],GK:["Çizgide bekliyor, çıkmıyor","Kross toplarında karar veremiyor","Alt köşede güvenilir ama yüksek top yer","Ayak oyununa güveniyor — presin altında hata yapabilir"]},
  injHead:"SAKATLIK!",injMsg:n=>`${n} sakatlandı: bu slot zayıfladı (-${INJ} puan).`,backup:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='14' height='14' class='si'><path d='M8 5Q6 9 6 15Q6 20 10 22Q16 24 20 21Q22 18 20 13Q18 8 14 5Q11 4 8 5Z'/><line x1='5.5' y1='14' x2='20.5' y2='14'/><line x1='13' y1='7' x2='13' y2='21'/></svg> Yedek çek",playInj:"<svg viewBox='0 0 16 20' width='12' height='15' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><rect x='5.5' y='1' width='2.5' height='8' rx='1.25'/><rect x='8.5' y='3' width='2.5' height='7' rx='1.25'/><rect x='11.5' y='4' width='2.5' height='6' rx='1.25'/><rect x='2.5' y='5' width='2.5' height='6' rx='1.25'/><path d='M2.5 11Q2 13 2 14Q2 17 5 19H10Q13.5 19 14 14V10.5'/></svg> Gözü Kara",backupHead:"YEDEK ÇEK",
  train:"??? Antrenman",trainDone:n=>`${n} geliştirildi (+2 puan)`,trainCant:"antrenman: kasa/hak yok",
  rar:{bronze:"BRONZ",silver:"GÜMÜŞ",gold:"ALTIN",ch:"GÖREV"},mismatch:p=>`yan mevki -${p}`,
  metaLine:(b,r)=>`en iyi: <b>${b}</b> · run: <b>${r}</b>`,startHead:"AÇILDI: Başlangıç Kartı",startSub:"bu run'a ücretsiz bir kartla başla",
  locked:"kilitli",lockedHint:"kupa kazandıkça diziliş açılır",formUnlocked:f=>`?? Yeni diziliş açıldı: ${f}!`,
 chLbl:"Görevler",chUnlock:"Kart açıldı:",objHdr:"?? HEDEFLER",feedHdr:"GELİŞMELER",feedEmpty:"henüz gelişme yok...",feedBuy:"alındı",feedUnlock:"açıldı",chairHdr:"BAŞKAN",hiddenName:"Gizli Oyuncu",hiddenMeta:"??? · cevher mi balon mu",cevher:"?? Cevher!",balon:"?? Balon:",reveal:"açıldı:",trait:{hizli:"Hızlı",lider:"Lider",buyukmac:"Büyük Maç",sorunlu:"Sorunlu",cam:"Cam Adam",wonderkid:"Wonderkid"},panicHead:"PANİK TRANSFER!",panicFeed:"deadline doldu, oyuncu dayatıldı",panicMsg:(n,o,p)=>`Menajer ${p} bulamadı. Kadroya ${o} güç ${n} dayatıldı.`,heads:["Galatasaray yeni stoper arıyor","Başkan bütçeyi sorguluyor","Taraftar forvet istiyor","Osimhen dedikoduları sürüyor","Menajer pazarda kulis yapıyor","Yıldız transfer heyecan yarattı","Rakip kulüpte kriz çıktı","Kart pazarı bu hafta hareketli","Kara borsa söylentileri arttı","Başkan prim bütçesini kapattı","Taraftar deplasman bileti peşinde","Kulüp doktoru yoğun mesai yapıyor","Genç oyuncular scout listesinde","Bir menajer gizli teklif getirdi","Sosyal medyada forma tartışması","Rakip savunmada sakatlık alarmı","Kupada sürpriz sonuçlar geceye damga vurdu","Bir yıldız maaşını indirmeye razı","Altyapıdan yeni isimler konuşuluyor","Basın toplantısında tansiyon yükseldi","Başkan locasında acil toplantı var","Taraftar grupları koreografi hazırlıyor","Rakip hoca kadroyu saklıyor","Son dakika sponsor görüşmesi başladı","Kasa açığı yönetimde gündem oldu","Transfer komitesi sabaha kadar çalıştı","Forvet piyasasında fiyatlar uçtu","Kaleci arayan kulüpler sıraya girdi","Kupa yayınında reyting rekoru bekleniyor","Şehirde final hayali konuşuluyor","Pazar raporu: risk kartları pahalı","Oyuncu temsilcileri tesis kapısında","Rakip kanatta zaaf iddiası","Başkan sabır istedi","Taraftar sabır değil zafer istiyor","Kulüp otobüsü tesislerden ayrıldı","Bir veteran liderlik konuşması yaptı","Genç yıldız antrenmanda parladı","Finans ekibi borç limitini uyardı","Tribünler biletleri tüketti","Kupa yolu yine kaosa gebe"],mgrDefault:"SEED",mgrPh:"",story:(mgr,team,chair,reached,motm,won,panic,wk,cid)=>{let p=`Transfer son gününde ${mgr} yönetiminde kurulan ${team}, `;p+=cid==="torpilci"?"başkanın torpilli yeğenlerine rağmen ":cid==="pinti"?"kısık bütçeye rağmen ":cid==="cilgin"?"kaos dolu bir yönetim altında ":cid==="babacan"?"başkanın açık çek desteğiyle ":cid==="leydi"?"dengeli bir yönetim desteğiyle ":cid==="sansasyoncu"?"şovmen bir başkanlık döneminde ":"";p+=`${reached} turuna kadar yükseldi. `;if(panic>0)p+=`Deadline paniğinde ${panic} oyuncu zorla kadroya katıldı. `;if(wk)p+=`Genç ${wk} turnuva boyunca patladı. `;p+=won?`Ve ${team} kupayı kaldırdı! ?? `:`Ama yolculuk burada bitti. `;p+=`Turnuvanın yıldızı: ${motm}.`;return p;},storyHdr:"SEZONUN HİKÂYESİ",chair:{babacan:{n:"Patron Başkan",role:"Büyük Patron",desc:"Kasa konusunda <b>cömert</b>, oyuncularına güvenen bir başkan. Finalde <b>eksi güç</b> bırakabilir ama <b>yolda yardımcıdır</b>.",hint:"?? Kasayı açık tutar · finalde küçük eksi güç"},leydi:{n:"Diplomat Başkan",role:"Adil El",desc:"<b>Adaletli</b> ve öngörülü; <b>yerli oyunculara</b> önem verir. <b>Kimyayı ödüllendirir</b>, gereksiz israftan kaçınır.",hint:"???? Yerli oyuncu sever · kimya primleri artar"},pinti:{n:"Pinti Başkan",role:"Demir Kasa",desc:"<b>Her kuruşu sayan</b>, borcu sevmeyen, <b>pazar indirimlerine</b> bayılan bir başkan. Sert bir <b>borç limiti</b> uygular.",hint:"Ucuz pazar · sert borç sınırı"},sansasyoncu:{n:"Şovmen Başkan",role:"Şov Zamanı",desc:"<b>Büyük isimler, büyük transferler.</b> Yıldız oyuncu peşinde koşar, <b>piyasayı ısıtır</b>. Basın toplantılarında şov yapar.",hint:"? Yıldız bonusu yüksek · pazar pahalı"},torpilci:{n:"Torpilci Başkan",role:"Yeğen Sezonu",desc:"<b>Yeğenlerini</b> ve çevresini kadroya sokmak için fırsat kollar. <b>Oyuncu kalitesi ikinci plandadır</b>.",hint:"????? Torpilli oyuncu dayatabilir"},cilgin:{n:"Profesör Başkan",role:"Joker",desc:"Kimse ne yapacağını bilemez. Toplantılar <b>öngörülemez</b>, kararlar <b>tutarsız</b>, müdahaleler <b>sürpriz dolu</b>.",hint:"?? Kuralsız müdahale eder · her şey mümkün"}},chem:{hdr:"KİMYA",young:"genç",tr:"yerli",vet:"tecrübe",none:"yok"},fan:{hdr:"TARAFTAR",s:["??","??","??","??"]},talkSub:"Bu maçlık moral etkisini seç:",talkUnder:"Rakip favori — ateşli ton işe yaradı.",talkFav:"Favorisin — odak ve disiplin şart.",talkDelta:"Güç",powHdr:"KADRO GÜCÜ",powHint:"detay ›",powHdr2:"GÜÇ DÖKÜMÜ",quickAgain:"?? Aynı ayarla yeniden",seedLbl:"SEED",presWord:"Başkan",cupTitle:"TÜRKİYE KUPASI FİNALİ",tcHdr:"TRANSFER CENTRE",assistLbl:"Asist:",stDraft:"Son gün, sıfırdan kuruldu",stChair:n=>n+" başkanlık etti",stPanic:n=>"Deadline paniğinde "+n+" zorunlu transfer",stWk:n=>"Genç "+n+" turnuvada patladı",stWon:t=>t+" Türkiye Kupası'nı kaldırdı ??",stOut:r=>r+" turunda elendi",stMotm:n=>"Turnuvanın yıldızı: "+n,pbPlayers:"Oyuncular",pbCards:"Stil + Kart",pbChem:"Kimya",pbFan:"Taraftar",pbTotal:"TOPLAM",ctxHidden:"gizemli — risk al",ctxWonder:"geleceğin yıldızı ??",ctxStar:"takımın yıldızı",ctxBig:"büyük maç adamı",ctxLead:"soyunma odası lideri",ctxYoung:"genç yetenek",ctxLocal:"yerli gurur",ctxVet:"tecrübeli isim",ctxForm:"son maçlarda formda",ctxSolid:"güvenilir isim",talkOpt:{gaz:{i:"<svg viewBox='0 0 14 18' width='13' height='16' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' class='si'><path d='M7 1Q4 5 4 9Q4 12 7 14Q10 12 10 9Q10 6 9 4Q9 8 7 10Q5 8 5 6Q5 3 7 1Z'><animate attributeName='stroke-width' values='1.4;2.2;1.4;1.8;1.4' dur='0.9s' repeatCount='indefinite'/></path><path d='M5 15Q3 18 7 18Q11 18 9 15'/></svg>",n:"Ateşle",d:"rakip favoriyse güçlü, sakatlık riski artırır"},mantik:{i:"<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' class='si'><path d='M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8'/><path d='M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8'/><path d='M17.5 16a3.5 3.5 0 0 0 0 -7h-.5'/><path d='M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0'/><path d='M6.5 16a3.5 3.5 0 0 1 0 -7h.5'/><path d='M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10'><animate attributeName='stroke-dasharray' values='0 30;30 0;30 0;0 30' dur='1.6s' repeatCount='indefinite'/></path></svg>",n:"Planı Hatırlat",d:"her durumda güvenli"},sert:{i:"<svg viewBox='0 0 14 16' width='12' height='14' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><path d='M7 1L13 3.5V9Q13 13.5 7 15.5Q1 13.5 1 9V3.5Z'><animate attributeName='stroke-width' values='1.5;2.4;1.5' dur='1.2s' repeatCount='indefinite'/></path><polyline points='4.5,8 6.5,10 9.5,6'/></svg>",n:"Disiplin İste",d:"favoriyken iyi, genç kadroda riskli"}},
  ch:{c1:"3+ farkla galibiyet",c2:"gol yemeden kazan",c3:"daha güçlü rakibi yen",c4:"çeyrek finale ulaş",c5:"finale ulaş"},
  clubHdr:"Kulüp Bilgileri",colP:"Birinci Renk",colS:"İkinci Renk",clubGo:"Kupaya Başla ??",
  catName:{hucum:"H\u00fccum",savunma:"Savunma",ekonomi:"Ekonomi",taraftar:"Taraftar",baskan:"Ba\u015fkan",risk:"Risk",gorev:"G\u00f6rev"},fanLbl:["\u00d6fkeli","Karars\u0131z","Memnun","Co\u015fkulu"],variantLbl:["COMMON","DARK"],runNames:{youth:"Gen\u00e7 Filizler Run\u0027\u0131",fan:"Taraftar Run\u0027\u0131",wall:"Demir Perde Run\u0027\u0131",attack:"H\u00fccum Run\u0027\u0131",economy:"Anadolu Run\u0027\u0131",risk:"Risk Run\u0027\u0131"},ui:{collectionHdr:"KART KOLEKS\u0130YONU",cardSlotFull:"\u{1F0CF} aktif kart slotu dolu",style:"Stil",cards:"Kartlar",matchup:"E\u015fle\u015fme",riskDebt:"Risk / final borcu",traitMorale:"\u00d6zellik + moral",bonusEfficiency:"Bonus verimi",softCap:"Yumu\u015fak tavan azaltt\u0131",lockedCard:"Kilitli Kart",lockedCaps:"K\u0130L\u0130TL\u0130",activeRemove:"aktif \u00b7 \u00e7\u0131karmak i\u00e7in t\u0131kla",clickEquip:"takmak i\u00e7in t\u0131kla",slotFull:"slot dolu",unlockFrom:"pazardan a\u00e7",copies:"Geli\u015fim",effect:"Etki",seeChair:"BA\u015eKANA G\u0130T",unlocksQf:"\u00e7eyrek finalde a\u00e7\u0131l\u0131r",less:"\u2212 daha az",all:n=>`+ t\u00fcm\u00fc (${n})`,deal:" \u00b7 \u{1F525} f\u0131rsat",cup:"KUPA",shareLine:"sen finali g\u00f6rebilir misin?",postBand:"copa.life \u00b7 KADRO KURULDU",startRun:`<svg viewBox='0 0 22 24' width='18' height='20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.3em;margin-right:4px'><path d='M7 3H15Q15 13 11 16Q7 13 7 3Z'/><path d='M7 3Q3 4 3 8Q3 12 7 12'/><path d='M15 3Q19 4 19 8Q19 12 15 12'/><path d='M11 16V19'/><line x1='7' y1='22' x2='15' y2='22'/><path d='M9 19H13'/></svg> KUPAYA BA\u015eLA`,finalPower:"g\u00fc\u00e7",playFinalCta:"F\u0130NAL\u0130 OYNA \u{1F3C6}"},
  talkHead:"SOYUNMA ODASI",talkThink:"KONUŞMA YAPILIYOR...",
  talk_all_up:["Takım Coştu!","??","oyuncular ateş aldı","tüm kadro +2",1],talk_all_dn:["Konuşma Ters Tepti","??","oyuncular gerildi","tüm kadro -2",0],talk_def_up:["Savunma Kenetlendi","???","arka dörtlü motive","savunma +",1],talk_def_dn:["Savunma Dağıldı","??","defans kafa dağıttı","savunma -",0],talk_atk_up:["Hücum Şahlandı","?","forvetler coştu","hücum +",1],talk_atk_dn:["Hücum Söndü","??","forvetler küstü","hücum -",0],talk_none:["Etkisiz Konuşma","??","kimse takmadı","etki yok",1],
  styles:{gegen:{n:"Gegenpressing",d:"koşulsuz +2 güç",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><polyline points='7,22 14,13 21,22'/><polyline points='7,15 14,6 21,15'/></svg>"},kontra:{n:"Kontra Atak",d:"forvet başına +1 güç; 3 forvetle +3",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><polyline points='4,10 16,14 4,18'/><polyline points='12,10 24,14 12,18'/></svg>"},tiki:{n:"Topa Sahip Ol",d:"3+ orta saha = +2, 5+ = +3; yağmurda -2 ceza",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><circle cx='14' cy='5' r='3'/><circle cx='5' cy='22' r='3'/><circle cx='23' cy='22' r='3'/><line x1='11.5' y1='7.5' x2='7.5' y2='18.5'/><line x1='16.5' y1='7.5' x2='20.5' y2='18.5'/><line x1='8' y1='22' x2='20' y2='22'/></svg>"},uzun:{n:"Uzun Top",d:"1 santrfor = +1, 2 santrfor = +3; rüzgarda +2 ekstra",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><path d='M5 23Q7 8 22 5'/><polyline points='18,3 22,5 20,9'/><circle cx='7' cy='22' r='2.5' fill='currentColor' stroke='none'/></svg>"},blok:{n:"Düşük Blok",d:"4 defanscı = +1, 5+ = +2; rakip güçlüyse +1 ekstra",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><circle cx='7' cy='16' r='3.5'/><circle cx='14' cy='16' r='3.5'/><circle cx='21' cy='16' r='3.5'/><rect x='4' y='22' width='20' height='4' rx='1.5'/></svg>"}},
  cards:{taraftar:{n:"12. Adam",d:"1. turda +2; 2. turda +3; 3. turdan itibaren +4 güç. Erken ısınır.",i:"??"},genc:{n:"Wonderkid",d:"Her tur +1 büyür, max +6.",i:"??"},ch_momentum:{n:"İvme",d:"1-2. turda +2; 3-4. turda +3; 5. turdan itibaren +4 güç. Geç açılır.",i:"??"},kontra:{n:"Kontra",d:"COMMON forvet başına +1. DARK forvet başına +2; %25 ihtimal -€10M ceza.",i:"<img src='assets/icons/lightning_512.png' class='si' alt=''>"},buyuk_mac:{n:"Büyük Maç Adamı",d:"COMMON +6 güç. DARK +6 güç; %20 ihtimal -€12M ceza.",i:"??"},yildiz:{n:"Pastanın Çileği",d:"COMMON: En iyi oyuncuna göre +4/+6/+8/+10 güç. DARK: +6/+8/+10/+14 güç; %25 ihtimal -€6M ceza.",i:"??"},otobus:{n:"Otobüs",d:"COMMON stoper başına +3. DARK stoper başına +6; %10 ihtimal -€6M ceza.",i:"??"},kaleci_kalesi:{n:"Kaleci Kalesi",d:"COMMON kaleci gücü +5. DARK kaleci gücü +9; %15 ihtimal -€15M ceza, finalde -8.",i:"??"},anadolu:{n:"Anadolu Eksp.",d:"Sahadaki 70 altı oyuncu başına +1 güç. COMMON max +3, DARK max +5.",i:"??"},veteran:{n:"Veteran",d:"+4 güç erken; finalde en az +2.",i:"??"},yerli_blok:{n:"Yerli Blok",d:"2 yerli: +1; 4 yerli: +3; 6+ yerli: +5.",i:"????"},kanat_akini:{n:"Kanat Akını",d:"COMMON kanat/bek başına +1 (max +4). DARK: +2 (max +6), finalde -5.",i:"??"},cift_forvet:{n:"Çift Forvet",d:"COMMON: SNT başına +2, max +4. DARK: SNT başına +4, max +8; finalde -4.",i:"??"},derbi:{n:"Derbi Aslanı",d:"Çeyrek +2; yarı +4; finalde +8 güç.",i:"??"},ch_final:{n:"Final Patronu",d:"Yarı finalde +3; finalde +6.",i:"??"},son_dans:{n:"Son Dans",d:"Finalde: sakatsız kadro +6; sakatlık varsa +4.",i:"??"},cilgin_basin:{n:"Çılgın Basın",d:"%60 +€15M; %40 -€10M.",i:"??"},sosyal_medya:{n:"Sosyal Medya",d:"Rakip güçlüyse +3 güç; zayıfsa -2 (dikkat!).",i:"??"},deplasman_kafilesi:{n:"Deplasman Kafilesi",d:"COMMON güçlü rakibe karşı +4, değilse +2. DARK güçlü rakibe karşı +8; değilse %50 +4 / %50 -4.",i:"??"},
  kurban_belli:{n:"Kurban Belli",i:"??",d:"COMMON: +6 güç, tur sonunda 1 oyuncu 1 tur sakatlanır. DARK: +12 güç, tur sonunda 2 oyuncu 1 tur sakatlanır; %25 ihtimal -€6M ek ceza."},
  primler_yatinca:{n:"Primler Yatınca",i:"??",d:"COMMON: +4 güç, gelecek tur −€8M. DARK: +8 güç, gelecek tur −€16M."},
  kaynasma:{n:"Kaynaşma",i:"??",d:"COMMON: Genç kadro (ort. yaş 29-): +5 güç, yaşlı kadro: +3 güç. DARK: Sonraki tur -3 güç ek ceza, finalde -1 güç."},
  vur_igneyi:{n:"Vur İğneyi",i:"??",d:"Sakat oyuncu olmadan seçilemez. COMMON: 1 sakat oyuncuyu iyileştirir; kart bedeli dışında ek masraf yok. DARK: 2 sakat oyuncuyu iyileştirir; %25 ihtimal -€6M ek masraf."},
  bu_adam:{n:"Sürpriz Faktör",i:"?",d:"COMMON: 70-79 güçlü rastgele bir oyuncuyu yedeğe ekler. DARK: 80-89 güçlü rastgele bir oyuncuyu yedeğe ekler."},
  gec_gec:{n:"Geç Geçebilirsen",i:"??",d:"Güçlü rakibe karşı +5 güç, diğer durumlarda +2. DARK: +2 ek güç, finalde -3."},
  eski_kurt:{n:"Eski Kurt",i:"??",d:"30+ yaşlı oyuncu yoksa seçilemez. COMMON: +8 güç, tur sonunda o oyuncu 2 puan kaybeder. DARK: 32+ yaşlı gerekli, +12 güç, 6 puan kaybeder."},
  nasip_kismet:{n:"Nasip, Kısmet",i:"?",d:"COMMON: Kart fiyatları -%50. DARK: Kart fiyatları -%75; %25 ihtimal -€4M ceza."},
  yildiz_krizi:{n:"Yıldız Krizi",i:"?",d:"COMMON: En güçlü oyuncu medyada hedef olur; takım tepki verir: bu maç +3 güç. DARK: En güçlü 2 oyuncu medyada hedef olur; takım tepki verir: bu maç +4 güç; %20 ihtimal -€4M medya cezası."},
  kasiga_para:{n:"Saha Dışı Baskı",i:"??",d:"COMMON: Rakip -4 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%25. DARK: Rakip -8 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%50 ve güven -1."}},
  pp:{generous:i=>["Beklenmedik Gelir","??",`kasaya €${i.delta}M`,`+€${i.delta}M`,1],sponsor:i=>["Yeni Sponsor","??","anlaşma imzalandı",`+€${i.delta}M`,1],sale:i=>["Yıldız Satıldı","??","oyuncu gitti, kasa doldu",`+€${i.delta}M`,1],star:i=>["Yıldız Transferi","?",`başkan bağladı: ${i.name} (${i.ov})`,`${i.pos} +`,1],bargain:i=>["Anadolu Kelepiri","??",`taşradan cevher: ${i.name} (${i.ov})`,`-€${i.fee}M`,1],academy:i=>["Altyapı Patlaması","??",`tesisten: ${i.name} (${i.ov})`,`${i.pos} +`,1],youth:i=>["Genç Yetenek Keşfi","",`ücretsiz yedek: ${i.name} (${i.ov})`,`${i.pos} · ${i.ov}`,1],nephew:i=>["Torpilli Yeğen","??",`başkanın yeğeni: ${i.name} (${i.ov})`,`${i.pos} -`,0],cut:i=>["Kemer Sıkma","??","kısıntıya gidildi",`-€${i.delta}M`,0],yacht:i=>["Başkan Tekne Aldı","???","parayla yat alındı",`-€${i.delta}M`,0],tax:i=>["Vergi Cezası","??","devlet kapıyı çaldı",`-€${i.delta}M`,0],federation:i=>["Federasyon Yaptırımı","",i.mode==="fine"?"kural ihlali kasaya yansıdı":"takım bu maça güç cezasıyla çıkacak",i.mode==="fine"?`-€${i.delta}M`:"Bu maç -1 güç",0],ffp:i=>["FFP İncelemesi","","harcama planı nedeniyle transfer pazarı kapatıldı","Sonraki pazar kapalı",0],fans:i=>["Taraftar Protestosu","","tribün baskısı yönetimi ve takımı sarstı","Güven -1 · bu maç -2 güç",0],investigation:i=>["Şike Soruşturması","",`${i.risk} riskli kart incelemeye alındı`,`-€${i.delta}M · güven -1`,0],management:i=>["Yönetim Değişikliği","",`${i.old} görevden ayrıldı`,i.name?`Yeni başkan: ${i.name}`:"Yönetim değişti",0]}},
 en:{tagline:"",budget:"Funds",coverTitle:"copa.life",coverSub:"Turkish Cup",
  coverBlurb:"Draft your XI before the deadline. Opponents get tougher each round, injuries can hit, and reaching the final takes you onto the pitch.",
  artNote:"Painted in 1953, 'Going to the Match' by L.S. Lowry shows football fans at Burnden Park, Bolton, then the home of Bolton Wanderers. The ground was only a few miles from Pendlebury in Salford. Lowry was a huge football fan and regularly attended Manchester City matches.",
  patreonText:"copa.life is a one-person project. You can support the idea and its development on Patreon. It would mean a lot.",
  pickhdr:"Pick your formation",proto:"copa.life prototype · Turkish top 2 tiers · 1358 players",
  formSub:{"4-3-3":"classic","4-4-2":"old","4-2-3-1":"modern","3-5-2":"wings","5-3-2":"low","3-4-3":"attack","4-5-1":"bus"},
  startBtn:"START",quickStartBtn:"<svg class='dice-ico' viewBox='0 0 20 20' width='14' height='14' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='2.5' y='2.5' width='15' height='15' rx='3'/><circle cx='7' cy='7' r='1' fill='currentColor' stroke='none'/><circle cx='13' cy='7' r='1' fill='currentColor' stroke='none'/><circle cx='10' cy='10' r='1' fill='currentColor' stroke='none'/><circle cx='7' cy='13' r='1' fill='currentColor' stroke='none'/><circle cx='13' cy='13' r='1' fill='currentColor' stroke='none'/></svg> RANDOM START",cNamePh:"Name your club...",
  undo:"? Undo last pick",rollHint:"Roll the dice. A random position opens.",roll:`<svg class='dsvg' viewBox='0 0 28 28' width='24' height='24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='2' width='24' height='24' rx='5'/><circle cx='8' cy='8' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='8' r='2' fill='currentColor'><animate attributeName='opacity' values='0;1;1;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='14' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='1;0;1;0;1;0' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='8' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;0;0;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='14' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;0;0;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='8' cy='20' r='2' fill='currentColor'><animate attributeName='opacity' values='0;1;1;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle><circle cx='20' cy='20' r='2' fill='currentColor'><animate attributeName='opacity' values='0;0;0;1;1;1' dur='0.72s' repeatCount='indefinite' calcMode='discrete' keyTimes='0;0.167;0.333;0.5;0.667;0.833'/></circle></svg> ROLL`,allBtn:`<svg viewBox='0 0 16 22' width='14' height='18' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.2em;margin-right:3px'><path d='M11 2L4 12H9L6 20L14 10H9L11 2Z' fill='currentColor' opacity='.15'/><path d='M11 2L4 12H9L6 20L14 10H9L11 2Z'/></svg> Auto-fill XI`,rollPrompt:"ROLL › position",
  afford:"affordable",tooexp:"no funds",free:"Free agent",noAfford:"low funds: cheapest still takeable",
  pos:{GK:"Goalkeeper",LB:"Left Back",RB:"Right Back",CB:"Centre Back",CM:"Midfielder",DM:"Defensive Mid",LM:"Left Mid",RM:"Right Mid",LW:"Left Wing",RW:"Right Wing",AM:"Attacking Mid",ST:"Striker",WB:"Wing Back"},
  abbr:{GK:"GK",CB:"CB",LB:"LB",RB:"RB",WB:"WB",CM:"CM",DM:"DM",LM:"LM",RM:"RM",LW:"LW",RW:"RW",AM:"AM",ST:"ST"},
  grp:{GK:"Keeper",DEF:"Defence",MID:"Midfield",FWD:"Forward"},
  capRoll:"ROLLING",youLbl:"Power",oppLbl:"Opponent",shopLbl:"Card Market",pres:"<svg viewBox='0 0 14 12' width='13' height='11' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><rect x='1' y='9' width='12' height='2.5' rx='.8'/><rect x='4' y='2.5' width='6' height='7' rx='.5'/><line x1='3.5' y1='2.5' x2='10.5' y2='2.5'/></svg> Chairman",train:"??? Training",scout:"?? Scout opponent",
  talk:"<svg viewBox='0 0 18 16' width='15' height='13' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' class='si' aria-hidden='true'><path d='M3 2.5h12a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 15 11H8l-4 3v-3H3A1.5 1.5 0 0 1 1.5 9.5V4A1.5 1.5 0 0 1 3 2.5Z'/></svg> Team Talk",
  play:`Play match <span class='play-arrow' aria-hidden='true'><svg viewBox='0 0 18 18' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path class='play-arrow-ghost' d='M3 4L9 9L3 14'/><path class='play-arrow-main' d='M7 4L13 9L7 14'/></svg></span>`,playFinal:`PLAY THE FINAL <span class='play-arrow' aria-hidden='true'><svg viewBox='0 0 18 18' width='18' height='18' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path class='play-arrow-ghost' d='M3 4L9 9L3 14'/><path class='play-arrow-main' d='M7 4L13 9L7 14'/></svg></span>`,talk:"<svg viewBox='0 0 18 16' width='15' height='13' fill='none' stroke='currentColor' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round' class='si' aria-hidden='true'><path d='M3 2.5h12a1.5 1.5 0 0 1 1.5 1.5v5.5A1.5 1.5 0 0 1 15 11H8l-4 3v-3H3A1.5 1.5 0 0 1 1.5 9.5V4A1.5 1.5 0 0 1 3 2.5Z'/></svg> Team Talk",owned:"owned",cardsLbl:"Your cards",autoOn:"Auto: ON",autoOff:"Auto: OFF",
  ddTitle:"TRANSFER<br>DEADLINE",squad:"squad",
  rounds:["ROUND 1","ROUND 2","LAST 16","QUARTER","SEMI","FINAL"],rabbr:["R1","R2","16","QF","SF","F"],
  vsword:"you face",prize:m=>`Bonus +€${m}M`,
  matchWin:"YOU ADVANCE",matchLose:"KNOCKED OUT",matchPen:"THROUGH ON PENS!",teleHead:"MATCH RESULT",cont:"Continue",toFinal:"To the final!",us:"US",
  champTitle:"CHAMPIONS",champV:"you lifted the cup. this squad made history.",outTitle:"KNOCKED OUT",outV:t=>`out in round ${t}. build something better.`,
  lblTur:"Reached",lblGuc:"Power",lblKart:"Cards",copy:"<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.12em;margin-right:4px'><path d='M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z'/><path d='M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1'/></svg>Copy result",copied:"<svg viewBox='0 0 24 24' width='12' height='12' fill='currentColor' style='vertical-align:-.12em;margin-right:4px;color:var(--good)'><path d='M18.333 6a3.667 3.667 0 0 1 3.667 3.667v8.666a3.667 3.667 0 0 1 -3.667 3.667h-8.666a3.667 3.667 0 0 1 -3.667 -3.667v-8.666a3.667 3.667 0 0 1 3.667 -3.667zm-3.333 -4c1.094 0 1.828 .533 2.374 1.514a1 1 0 1 1 -1.748 .972c-.221 -.398 -.342 -.486 -.626 -.486h-10c-.548 0 -1 .452 -1 1v9.998c0 .32 .154 .618 .407 .805l.1 .065a1 1 0 1 1 -.99 1.738a3 3 0 0 1 -1.517 -2.606v-10c0 -1.652 1.348 -3 3 -3zm1.293 9.293l-3.293 3.292l-1.293 -1.292a1 1 0 0 0 -1.414 1.414l2 2a1 1 0 0 0 1.414 0l4 -4a1 1 0 0 0 -1.414 -1.414'/></svg>copied ?",copyfail:"couldn't copy",again:"NEW copa.life ROUND",
  presHead:"CHAIRMAN'S BULLETIN",presThink:"CHAIRMAN DELIBERATING...",presClose:"OK",
  kitHdr:"Pick Your Kit Colour",kitSub:"you'll play in this colour",spd:"SPEED",
  styleHdr:"Pick Your Philosophy",styleSub:"sets a small style bonus",
  motm:"MAN OF THE MATCH",yourXi:"YOUR XI",oppXi:"OPPONENT XI",
  scoutHead:"OPPONENT SQUAD",weak:f=>`weak flank: ${f}`,flanks:{L:"LEFT",C:"CENTRE",R:"RIGHT"},matchupMsg:"you target their weak flank (+power)",scoutNotes:{FWD:["Dangerous in tight areas — track closely","Watch the run in behind","Clinical on the turn — no space","Drops off and links play","Aerial threat — attack the cross","Not direct, likes to combine first","Prefers left side when cutting in"],MID:["Key playmaker — cut off his lanes","Strong in duels for second balls","Short combinations, pressure breaks him","Reads the game well, not physically dominant","Delayed run into the box — aware","Set-piece taker, mark him"],DEF:["High line — punish the space behind","Good in the air, play along the floor","Aggressive on the ball — exploit it","Stays deep, won't press high","Right side may be exposed on counter"],GK:["Stays on his line — test him with crosses","Uncertain coming off his line","Comfortable low, weaker high","Plays with his feet — press the build-up"]},
  injHead:"INJURY!",injMsg:n=>`${n} is injured: this slot weakened (-${INJ} rating).`,backup:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='14' height='14' class='si'><path d='M8 5Q6 9 6 15Q6 20 10 22Q16 24 20 21Q22 18 20 13Q18 8 14 5Q11 4 8 5Z'/><line x1='5.5' y1='14' x2='20.5' y2='14'/><line x1='13' y1='7' x2='13' y2='21'/></svg> Draw backup",playInj:"<svg viewBox='0 0 16 20' width='12' height='15' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><rect x='5.5' y='1' width='2.5' height='8' rx='1.25'/><rect x='8.5' y='3' width='2.5' height='7' rx='1.25'/><rect x='11.5' y='4' width='2.5' height='6' rx='1.25'/><rect x='2.5' y='5' width='2.5' height='6' rx='1.25'/><path d='M2.5 11Q2 13 2 14Q2 17 5 19H10Q13.5 19 14 14V10.5'/></svg> Play injured",backupHead:"DRAW BACKUP",
  trainDone:n=>`${n} trained (+2 rating)`,trainCant:"training: no funds/use",
  rar:{bronze:"BRONZE",silver:"SILVER",gold:"GOLD",ch:"QUEST"},mismatch:p=>`off-pos -${p}`,
  metaLine:(b,r)=>`best: <b>${b}</b> · runs: <b>${r}</b>`,startHead:"UNLOCKED: Starting Card",startSub:"begin this run with a free card",
  locked:"locked",lockedHint:"win cups to unlock formations",formUnlocked:f=>`?? New formation unlocked: ${f}!`,
 chLbl:"Challenges",chUnlock:"Card unlocked:",objHdr:"?? OBJECTIVES",feedHdr:"FEED",feedEmpty:"no news yet...",feedBuy:"signed",feedUnlock:"unlocked",chairHdr:"CHAIRMAN",hiddenName:"Mystery Player",hiddenMeta:"??? · gem or dud",cevher:"?? Gem!",balon:"?? Dud:",reveal:"revealed:",trait:{hizli:"Pacey",lider:"Leader",buyukmac:"Big Game",sorunlu:"Difficult",cam:"Glass",wonderkid:"Wonderkid"},panicHead:"PANIC BUY!",panicFeed:"deadline hit, forced signing",panicMsg:(n,o,p)=>`Manager could not find a ${p}. A Power ${o} ${n} was forced in.`,heads:["Galatasaray hunting a new CB","Chairman questions the budget","Fans demand a striker","Osimhen rumours rumble on","Manager working the market","New star signing excites fans","Rival manager resigns"],mgrDefault:"SEED",mgrPh:"",story:(mgr,team,chair,reached,motm,won,panic,wk,cid)=>{let p=`Built from scratch on deadline day, ${team} `;p+=cid==="torpilci"?"survived boardroom favouritism and ":cid==="pinti"?"worked around a tight budget and ":cid==="cilgin"?"endured chaotic ownership and ":cid==="babacan"?"benefited from generous backing and ":cid==="leydi"?"thrived under balanced leadership and ":cid==="sansasyoncu"?"navigated a headline-hungry chairman and ":"";p+=`reached the ${reached}. `;if(panic>0)p+=`Deadline panic forced ${panic} emergency signing(s). `;if(wk)p+=`Young ${wk} broke out during the tournament. `;p+=won?`${team} lifted the cup. `:`The run ended there. `;p+=`Player of the tournament: ${motm}.`;return p;},storyHdr:"SEASON STORY",chair:{babacan:{n:"The Patron",role:"Big Patron",desc:"<b>Generous</b> and trusting. Keeps the coffers open and backs his manager — but may add a <b>power penalty at the final</b>.",hint:"?? Generous with funds · small final power cost"},leydi:{n:"The Diplomat",role:"The Fair Hand",desc:"<b>Fair</b> and forward-thinking. Values <b>local players</b> and rewards <b>team chemistry</b>. Avoids wasteful spending.",hint:"???? Loves local players · boosts chemistry bonuses"},pinti:{n:"The Miser",role:"Iron Safe",desc:"<b>Counts every cent.</b> Hates debt, loves a <b>discount</b>. Enforces the <b>strictest debt limit</b> of any chairman.",hint:"Cheap market · harsh debt limit"},sansasyoncu:{n:"The Showman",role:"Showtime",desc:"<b>Big names, big transfers.</b> Chases <b>star players</b> and heats up the market. Always hunting the next headline.",hint:"? High star bonus · expensive market"},torpilci:{n:"The Fixer",role:"Family Business",desc:"Slots in <b>nephews and allies</b> at every opportunity. <b>Player quality comes second</b> to loyalty.",hint:"????? May force low-quality players"},cilgin:{n:"The Professor",role:"Wild Card",desc:"Nobody knows what comes next. Meetings are <b>unpredictable</b>, decisions <b>inconsistent</b>, interventions <b>always a surprise</b>.",hint:"?? Erratic interference · anything goes"}},chem:{hdr:"CHEMISTRY",young:"young",tr:"local",vet:"leader",none:"none"},fan:{hdr:"FANS",s:["Angry","Uneasy","Happy","Buzzing"]},talkSub:"Pick a one-match morale effect:",talkUnder:"They are favourites - the fire-up worked.",talkFav:"You are favourites - focus and discipline matter.",talkDelta:"Power",powHdr:"SQUAD POWER",powHint:"detail ->",powHdr2:"POWER BREAKDOWN",quickAgain:"Replay same setup",seedLbl:"SEED",presWord:"Chairman",cupTitle:"TURKISH CUP FINAL",tcHdr:"TRANSFER CENTRE",assistLbl:"Assist:",stDraft:"Built from scratch on deadline day",stChair:n=>n+" was in charge",stPanic:n=>n+" forced panic signing(s)",stWk:n=>"Young "+n+" broke out",stWon:t=>t+" lifted the Cup",stOut:r=>"Knocked out in the "+r,stMotm:n=>"Player of the tournament: "+n,pbPlayers:"Players",pbCards:"Style + Cards",pbChem:"Chemistry",pbFan:"Fans",pbTotal:"TOTAL",ctxHidden:"mystery player - take the risk",ctxWonder:"future superstar",ctxStar:"team talisman",ctxBig:"big-game player",ctxLead:"dressing-room leader",ctxYoung:"young talent",ctxLocal:"local pride",ctxVet:"experienced head",ctxForm:"in red-hot form",ctxSolid:"reliable name",talkOpt:{gaz:{i:"<svg viewBox='0 0 14 18' width='13' height='16' fill='none' stroke='currentColor' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' class='si'><path d='M7 1Q4 5 4 9Q4 12 7 14Q10 12 10 9Q10 6 9 4Q9 8 7 10Q5 8 5 6Q5 3 7 1Z'><animate attributeName='stroke-width' values='1.4;2.2;1.4;1.8;1.4' dur='0.9s' repeatCount='indefinite'/></path><path d='M5 15Q3 18 7 18Q11 18 9 15'/></svg>",n:"Fire Up",d:"strong as underdog, raises injury risk"},mantik:{i:"<svg viewBox='0 0 24 24' width='15' height='15' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' class='si'><path d='M15.5 13a3.5 3.5 0 0 0 -3.5 3.5v1a3.5 3.5 0 0 0 7 0v-1.8'/><path d='M8.5 13a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1 -7 0v-1.8'/><path d='M17.5 16a3.5 3.5 0 0 0 0 -7h-.5'/><path d='M19 9.3v-2.8a3.5 3.5 0 0 0 -7 0'/><path d='M6.5 16a3.5 3.5 0 0 1 0 -7h.5'/><path d='M5 9.3v-2.8a3.5 3.5 0 0 1 7 0v10'><animate attributeName='stroke-dasharray' values='0 30;30 0;30 0;0 30' dur='1.6s' repeatCount='indefinite'/></path></svg>",n:"Remind Plan",d:"safe in every match"},sert:{i:"<svg viewBox='0 0 14 16' width='12' height='14' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' class='si'><path d='M7 1L13 3.5V9Q13 13.5 7 15.5Q1 13.5 1 9V3.5Z'><animate attributeName='stroke-width' values='1.5;2.4;1.5' dur='1.2s' repeatCount='indefinite'/></path><polyline points='4.5,8 6.5,10 9.5,6'/></svg>",n:"Demand Discipline",d:"good as favourite, risky with youth"}},
  ch:{c1:"win by 3+ goals",c2:"win with a clean sheet",c3:"beat a stronger opponent",c4:"reach the quarter-final",c5:"reach the final"},
  clubHdr:"Club Details",colP:"Primary Colour",colS:"Secondary Colour",clubGo:"Start the Cup ??",
  catName:{hucum:"Attack",savunma:"Defense",ekonomi:"Economy",taraftar:"Fans",baskan:"Chairman",risk:"Risk",gorev:"Quest"},fanLbl:["Furious","Uneasy","Happy","Buzzing"],variantLbl:["COMMON","DARK"],runNames:{youth:"Youth Run",fan:"Fan Run",wall:"Iron Wall Run",attack:"Attack Run",economy:"Economy Run",risk:"Risk Run"},ui:{collectionHdr:"CARD COLLECTION",cardSlotFull:"\u{1F0CF} active card slots full",style:"Style",cards:"Cards",matchup:"Matchup",riskDebt:"Risk / final debt",traitMorale:"Traits + morale",bonusEfficiency:"Bonus efficiency",softCap:"Soft cap reduced",lockedCard:"Locked Card",lockedCaps:"LOCKED",activeRemove:"active \u00b7 click to remove",clickEquip:"click to equip",slotFull:"slots full",unlockFrom:"unlock from market",copies:"Copies",effect:"Effect",seeChair:"SEE CHAIRMAN",unlocksQf:"unlocks at QF",less:"\u2212 less",all:n=>`+ all (${n})`,deal:" \u00b7 \u{1F525} deal",cup:"THE CUP",shareLine:"can you reach the final?",postBand:"copa.life \u00b7 SQUAD SET",startRun:`<svg viewBox='0 0 22 24' width='18' height='20' fill='none' stroke='currentColor' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round' style='vertical-align:-.3em;margin-right:4px'><path d='M7 3H15Q15 13 11 16Q7 13 7 3Z'/><path d='M7 3Q3 4 3 8Q3 12 7 12'/><path d='M15 3Q19 4 19 8Q19 12 15 12'/><path d='M11 16V19'/><line x1='7' y1='22' x2='15' y2='22'/><path d='M9 19H13'/></svg> START THE RUN`,finalPower:"power",playFinalCta:"PLAY THE FINAL \u{1F3C6}"},
  talkHead:"DRESSING ROOM",talkThink:"GIVING THE TALK...",
  talk_all_up:["Team Fired Up!","??","players caught fire","whole squad +2",1],talk_all_dn:["Talk Backfired","??","players tensed up","whole squad -2",0],talk_def_up:["Defence Locked In","???","back line motivated","defence +",1],talk_def_dn:["Defence Rattled","??","back line lost focus","defence -",0],talk_atk_up:["Attack Unleashed","?","forwards buzzing","attack +",1],talk_atk_dn:["Attack Flat","??","forwards sulking","attack -",0],talk_none:["No Effect","??","nobody listened","no effect",1],
  styles:{gegen:{n:"Gegenpressing",d:"unconditional +2 power",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><polyline points='7,22 14,13 21,22'/><polyline points='7,15 14,6 21,15'/></svg>"},kontra:{n:"Counter-Attack",d:"+1 power per forward; 3 forwards = +3",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><polyline points='4,10 16,14 4,18'/><polyline points='12,10 24,14 12,18'/></svg>"},tiki:{n:"Possession",d:"3+ midfielders = +2, 5+ = +3; rain penalty -2",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><circle cx='14' cy='5' r='3'/><circle cx='5' cy='22' r='3'/><circle cx='23' cy='22' r='3'/><line x1='11.5' y1='7.5' x2='7.5' y2='18.5'/><line x1='16.5' y1='7.5' x2='20.5' y2='18.5'/><line x1='8' y1='22' x2='20' y2='22'/></svg>"},uzun:{n:"Long Ball",d:"1 striker = +1, 2 strikers = +3; wind gives +2 extra",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><path d='M5 23Q7 8 22 5'/><polyline points='18,3 22,5 20,9'/><circle cx='7' cy='22' r='2.5' fill='currentColor' stroke='none'/></svg>"},blok:{n:"Low Block",d:"4 defenders = +1, 5+ = +2; +1 extra if underdog",i:"<svg viewBox='0 0 28 28' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' width='24' height='24'><circle cx='7' cy='16' r='3.5'/><circle cx='14' cy='16' r='3.5'/><circle cx='21' cy='16' r='3.5'/><rect x='4' y='22' width='20' height='4' rx='1.5'/></svg>"}},
  cards:{taraftar:{n:"12th Man",d:"Round 1: +2; Round 2: +3; Round 3+: +4 power. Peaks early.",i:"??"},genc:{n:"Wonderkid",d:"+1 per round, grows to max +6.",i:"??"},ch_momentum:{n:"Momentum",d:"Rounds 1-2: +2; Rounds 3-4: +3; Round 5+: +4 power. Peaks late.",i:"??"},kontra:{n:"Counter",d:"COMMON +1 per forward. DARK +2 per forward; 25% chance -€10M fine.",i:"<img src='assets/icons/lightning_512.png' class='si' alt=''>"},buyuk_mac:{n:"Big Game Player",d:"COMMON +6 power. DARK +6 power; 20% chance -€12M fine.",i:"??"},yildiz:{n:"Cherry on Top",d:"COMMON: +4/+6/+8/+10 power from your best player. DARK: +6/+8/+10/+14 power; 25% chance -?6M fine.",i:"??"},otobus:{n:"Park Bus",d:"COMMON +3 per CB. DARK +6 per CB; 10% chance -€6M fine.",i:"??"},kaleci_kalesi:{n:"Keeper's Fortress",d:"COMMON goalkeeper Power +5. DARK goalkeeper Power +9; 15% chance -€15M fine, -8 in the final.",i:"??"},anadolu:{n:"Anatolia Exp.",d:"+1 power per sub-70 starter. COMMON max +3, DARK max +5.",i:"??"},veteran:{n:"Veteran",d:"+4 early; minimum +2 in the final.",i:"??"},yerli_blok:{n:"Local Block",d:"2 locals: +1; 4 locals: +3; 6+ locals: +5.",i:"????"},kanat_akini:{n:"Wing Surge",d:"COMMON +1 per wing/wingback (max +4). DARK +2 (max +6), -5 in the final.",i:"??"},cift_forvet:{n:"Two Strikers",d:"COMMON +2 per ST, max +4. DARK +4 per ST, max +8; -4 in the final.",i:"??"},derbi:{n:"Derby Lion",d:"Quarter: +2; semi: +4; final: +8 power.",i:"??"},ch_final:{n:"Final Boss",d:"Semi-final +3; final +6.",i:"??"},son_dans:{n:"Last Dance",d:"Final: no injuries +6; injured squad +4.",i:"??"},cilgin_basin:{n:"Crazy Press",d:"60% +€15M; 40% -€10M.",i:"??"},kumarbaz:{n:"Bet Sponsor",d:"Money now, 2-round payback. DARK is bigger but trust -1.",i:"??"},gecici_prim:{n:"Temporary Bonus",d:"COMMON +6/30% injury. DARK +12/60% injury. Next match -2.",i:"??"},doping:{n:"Doping Rumour",d:"COMMON +6 power; 35% each round -€15M. DARK +10 power; 25% chance -€25M.",i:"??"},kriz:{n:"Crisis Management",d:"Offsets final power penalty (guaranteed): COMMON up to 8, DARK up to 14.",i:"??"},sosyal_medya:{n:"Social Media",d:"Underdog: +3 power; favourite: -2 (caution!).",i:"??"},deplasman_kafilesi:{n:"Away Trip",d:"COMMON +4 against stronger opponent, otherwise +2. DARK +8 against stronger opponent; otherwise 50% +4 / 50% -4.",i:"??"},
  kurban_belli:{n:"Sacrifice Play",i:"??",d:"COMMON: +6 power, 1 player injured for 1 round after. DARK: +12 power, 2 players injured for 1 round after; 25% chance -€6M extra fine."},
  primler_yatinca:{n:"Bonus Day",i:"??",d:"COMMON: +4 power, next turn −€8M. DARK: +8 power, next turn −€16M."},
  kaynasma:{n:"Team Bonding",i:"??",d:"COMMON: Young squad (avg age 29-): +5, older: +3 power. DARK: Extra -3 power next turn, -1 in final."},
  vur_igneyi:{n:"Play Through Pain",i:"??",d:"Requires injured player. COMMON: heals 1 injured player; no extra cost beyond the card price. DARK: heals 2 injured players; 25% chance -€6M extra cost."},
  bu_adam:{n:"Surprise Factor",i:"?",d:"COMMON: adds a random Power 70-79 player to the bench. DARK: adds a random Power 80-89 player to the bench."},
  gec_gec:{n:"Park the Bus",i:"??",d:"Against stronger opponent: +5 power, otherwise +2. DARK: +3 extra but 25% injury risk, -1 in final."},
  eski_kurt:{n:"Old Fox",i:"??",d:"Requires a 30+ player. COMMON: +8 power, that player loses 2 rating after the match. DARK: Needs a 32+ player, +12 power, loses 6 rating."},
  nasip_kismet:{n:"Destiny",i:"?",d:"COMMON: Card prices -50%. DARK: Card prices -75%; 25% chance -€4M fine."},
  yildiz_krizi:{n:"Star Crisis",i:"?",d:"COMMON: Best player draws media heat; the squad responds: +3 power this match. DARK: Best 2 players draw media heat; the squad responds: +4 power this match; 20% chance -€4M media fine."},
  kasiga_para:{n:"Backroom Pressure",i:"??",d:"COMMON: Opponent -4 power; next market closes, the next open market has card prices +25%. DARK: Opponent -8 power; next market closes, the next open market has card prices +50%, trust -1."}},
  pp:{generous:i=>["Unexpected Income","??",`+€${i.delta}M to coffers`,`+€${i.delta}M`,1],sponsor:i=>["New Sponsor","??","deal signed",`+€${i.delta}M`,1],sale:i=>["Star Sold","??","player gone, coffers full",`+€${i.delta}M`,1],star:i=>["Star Signing","?",`landed: ${i.name} (${i.ov})`,`${i.pos} +`,1],bargain:i=>["Local Bargain","??",`gem: ${i.name} (${i.ov})`,`-€${i.fee}M`,1],academy:i=>["Academy Breakthrough","??",`from academy: ${i.name} (${i.ov})`,`${i.pos} +`,1],youth:i=>["Youth Breakthrough","",`free bench player: ${i.name} (${i.ov})`,`${i.pos} · ${i.ov}`,1],nephew:i=>["The Useless Nephew","??",`nephew joins: ${i.name} (${i.ov})`,`${i.pos} -`,0],cut:i=>["Belt Tightening","??","budget cut",`-€${i.delta}M`,0],yacht:i=>["Chairman Bought a Yacht","???","club funds went to a yacht",`-€${i.delta}M`,0],tax:i=>["Tax Penalty","??","the tax office came calling",`-€${i.delta}M`,0],federation:i=>["Federation Sanction","",i.mode==="fine"?"a rule breach hit the budget":"the team carries a match penalty",i.mode==="fine"?`-€${i.delta}M`:"This match -1 power",0],ffp:i=>["FFP Review","","spending controls closed the transfer market","Next market closed",0],fans:i=>["Supporter Protest","","fan pressure shook the board and squad","Trust -1 · this match -2 power",0],investigation:i=>["Integrity Investigation","",`${i.risk} risky card${i.risk===1?"":"s"} reviewed`,`-€${i.delta}M · trust -1`,0],management:i=>["Boardroom Change","",`${i.old} left the club`,i.name?`New chairman: ${i.name}`:"Board changed",0]}},
};
Object.assign(T.tr.chem,{scattered:"Dağınık kadro",localGap:"Yerli çekirdek yok",leaderGap:"Saha içi lider yok"});
Object.assign(T.en.chem,{scattered:"Scattered squad",localGap:"No local core",leaderGap:"No on-pitch leader"});
function _patchCardCopy(){
 const tr=T.tr.cards,en=T.en.cards;
 Object.assign(tr,{
  taraftar:{...tr.taraftar,d:"Taraftar desteği tüm takım gücüne eklenir. COMMON: 1. tur +2, 2. tur +3, 3. turdan itibaren +4. DARK: +3/+5/+6; satın alırken %25 ihtimalle güven -1 ve finalde -6 güç."},
  genc:{...tr.genc,d:"Oyuncuları büyütmez; kartın takım gücü katkısı her tur artar. COMMON: 1. tur +1'den finalde +6'ya. DARK: 1. tur +4'ten finalde +9'a; finalde -4 güç."},
  ch_momentum:{...tr.ch_momentum,d:"Turnuva ilerledikçe takımın kazandığı ritmi güce çevirir. COMMON: 1-2. tur +2, 3-4. tur +3, 5. turdan itibaren +4. DARK: +4/+6/+8; finalde -6 güç."},
  kontra:{...tr.kontra,d:"Tek kullanımlık. COMMON forvet başına +1 güç. DARK forvet başına +2 güç ve %25 ihtimal -€10M ceza. En iyi: çift forvet / kanat kontra."},
  buyuk_mac:{...tr.buyuk_mac,d:"Tek kullanımlık büyük maç hamlesi. COMMON +6 güç. DARK +10 güç ve %20 ihtimal -€12M ceza. En iyi: çeyrek final ve sonrası."},
  yildiz:{...tr.yildiz,d:"Tek kullanımlık. Gücü en yüksek oyuncuna göre güç verir. DARK daha güçlüdür ama %25 ihtimal -€6M ceza taşır."},
  otobus:{...tr.otobus,d:"Tek kullanımlık. COMMON sahadaki stoper başına +3 güç (max +9). DARK stoper başına +4 güç (max +12); %10 ihtimal -€6M ve finalde -3 güç."},
  kaleci_kalesi:{...tr.kaleci_kalesi,d:"Tek kullanımlık. COMMON kaleci gücü +5. DARK +9; %15 ihtimal -€15M ve finalde -8."},
  anadolu:{...tr.anadolu,d:"Build kartı. Sahadaki 70 altı oyuncu başına +1 güç verir. COMMON max +3; DARK max +5 ve satın alırken %20 ihtimalle €5M ek lojistik masrafı."},
  altyapi_plani:{...(tr.altyapi_plani||{n:"Altyapı Planı",i:""}),d:"Build kartı. COMMON ilk 11'deki 23 yaş ve altı oyuncu başına +1 güç (max +4). DARK oyuncu başına +2 (max +6); finalde -4 güç."},
  tecrubeli_omurga:{...(tr.tecrubeli_omurga||{n:"Tecrübeli Omurga",i:""}),d:"Yalnız ilk 11'deki 32 yaş ve üzeri oyuncuları sayar. COMMON oyuncu başına +1 (max +4), DARK oyuncu başına +2 (max +6); DARK finalde -4 güç."},
  yerli_blok:{...tr.yerli_blok,d:"Build kartı. COMMON ilk 11'deki yerli başına +1 güç (max +5). DARK yerli başına +2 (max +5); finalde -3 güç."},
  kanat_akini:{...tr.kanat_akini,d:"Build + Final.sim kartı. COMMON kanat/bek başına +1 güç (max +4). DARK başına +2 (max +6), finalde -5; Final.sim'de kanat sekanslarını teşvik eder."},
  cift_forvet:{...tr.cift_forvet,d:"Build kartı. COMMON ilk 11'deki SNT başına +2 güç (max +4). DARK başına +4 (max +8), finalde -4; uzun top ve kontra oyununa uygundur."},
  derbi:{...tr.derbi,d:"İlk üç tur etkisizdir; yalnız büyük maçlarda açılır. COMMON: çeyrek final +2, yarı final +4, final +8. DARK: çeyrek +4, yarı +7, final +6; satın alırken %25 ihtimalle €7M ek masraf."},
  final_provasi:{...(tr.final_provasi||tr.ch_final||{n:"Final Provası",i:""}),d:"Yalnız final maçında çalışır. COMMON finalde +5 güç verir. DARK finalde +9 güç verir; satın alırken %25 ihtimalle €3M ek masraf çıkarır."},
  son_dans:{...tr.son_dans,d:"Yalnızca finalde çalışır. COMMON: İlk 11'de sakat yoksa +8, en az 1 sakat varsa +2. DARK: sakat yoksa +14, en az 1 sakat varsa -8."},
  taksit_transfer:{...(tr.taksit_transfer||{n:"Taksit Transfer",i:""}),d:"COMMON: Hemen +€10M, sonraki 2 tur -€4M. DARK: +€18M, sonraki 2 tur -€7M; güven -1 ve finalde -6."},
  son_kredi:{...(tr.son_kredi||{n:"Son Kredi",i:""}),d:"Acil ekonomi kartı. Kasa -€10M altındaysa çalışır, değilse bekler. COMMON +€15M. DARK +€20M ve güven -1. Kart edinilince kovulma eşiği €5M daralır."},
  kara_borsa:{...(tr.kara_borsa||{n:"Kara Borsa",i:""}),d:"COMMON: 1 bedava COMMON kalıcı kart. DARK: 2 bedava kalıcı kart; %40 ihtimal -€10M ceza."},
  sahte_evrak:{...(tr.sahte_evrak||{n:"Sahte Evrak",i:""}),d:"Kontrat risk kartı. COMMON +6 güç/tur; edinirken %18 ihtimal güven -1. DARK +10 güç/tur, güven -1 ve finalde -10 güç."},
  kumarbaz:{...(tr.kumarbaz||{n:"Kumarbaz",i:""}),d:"Ekonomi kontratı. Şimdi para verir, sonraki 2 tur ödeme alır. COMMON +€15M / 2 tur -€5M. DARK +€25M / 2 tur -€10M ve güven -1."},
  gecici_prim:{n:"Geçici Prim",i:"⚡",...tr.gecici_prim,d:"Tek maçlık güç. COMMON +6 ve maç sonu %30 sakatlık riski. DARK +12 ve %60 risk. İki varyant da sonraki maça -2 güç bırakır."},
  kisa_kamp:{...(tr.kisa_kamp||{n:"Kısa Kamp",i:"⛺"}),d:"Tek maçlık kontrollü güç. COMMON +4, sonraki maç -2. DARK +6, sonraki maç -4. En iyi: kritik eşleşme."},
  doping:{n:"Doping Söylentisi",i:"ğŸ’‰",...tr.doping,d:"Kontrat risk kartı. COMMON +6 güç/tur; edinirken %20 güven -1, her tur %35 ihtimal -€15M. DARK +10 güç/tur, güven -1, her tur %25 ihtimal -€25M ve finalde -6 güç."},
  kriz:{n:"Kriz Yönetimi",i:"⚠",...tr.kriz,d:"COMMON toplam final cezasının %50'sini telafi eder. DARK %75'ini telafi eder; satın alırken %20 ihtimalle €5M ek danışmanlık masrafı."},
  primler_yatinca:{...tr.primler_yatinca,d:"Ertelenmiş ödeme. Şimdi güç, gelecek tur para kaybı. COMMON +4 / sonra −€8M. DARK +8 / sonra −€16M."},
  vur_igneyi:{...tr.vur_igneyi,d:"Sakatlık çözümü. COMMON 1 sakat oyuncuyu iyileştirir; kart bedeli dışında ek masraf yok. DARK 2 sakat oyuncuyu iyileştirir ve %25 ihtimal -€6M ek masraf çıkarır."},
  bu_adam:{...tr.bu_adam,d:"Yedek hamlesi. COMMON 70-79 güçlü rastgele bir oyuncuyu yedeğe ekler. DARK 80-89 güçlü bir oyuncu ekler; %25 ihtimalle €6M imza masrafı çıkarır."},
  gec_gec:{...tr.gec_gec,d:"Underdog savunma kartı. COMMON rakip güçlüyse +5, değilse +2. DARK bunlara +2 güç ekler; her tur %25 sakatlık riski ve finalde -3 güç taşır."},
  nasip_kismet:{...tr.nasip_kismet,d:"Sonraki tur kart fiyatları COMMON -%25, DARK -%40. DARK ayrıca %25 ihtimal -€4M ceza taşır."},
  yildiz_krizi:{...tr.yildiz_krizi,d:"COMMON: Medya ilgisi bu maç +3 güç verir. DARK: Bu maç +4 güç; %20 ihtimal -€4M medya cezası."},
  kasiga_para:{...tr.kasiga_para,d:"COMMON: Rakip -4 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%25. DARK: Rakip -8 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%50 ve güven -1."}
 });
 Object.assign(en,{
  taraftar:{...en.taraftar,d:"Crowd support is added to the whole team's power. COMMON: +2 in round 1, +3 in round 2, then +4. DARK: +3/+5/+6; 25% chance of trust -1 on purchase and -6 power in the final."},
  genc:{...en.genc,d:"Does not develop players; the card's team-power contribution rises each round. COMMON: +1 in round 1 to +6 in the final. DARK: +4 to +9; -4 power in the final."},
  ch_momentum:{...en.ch_momentum,d:"Converts the team's growing tournament rhythm into power. COMMON: +2 in rounds 1-2, +3 in rounds 3-4, then +4. DARK: +4/+6/+8; -6 power in the final."},
  kontra:{...en.kontra,d:"Single use. COMMON +1 power per forward. DARK +2 power per forward and 25% chance -€10M fine. Best: two strikers / wing counter."},
  buyuk_mac:{...en.buyuk_mac,d:"Single-use big match boost. COMMON +6 power. DARK +10 power and 20% chance -€12M fine. Best: quarter-final onward."},
  yildiz:{...en.yildiz,d:"Single use. Power scales from your highest-power player. DARK is stronger but has 25% chance -€6M fine."},
  otobus:{...en.otobus,d:"Single use. COMMON adds +3 power per starting CB (max +9). DARK adds +4 per CB (max +12); 10% chance -€6M and -3 in the final."},
  kaleci_kalesi:{...en.kaleci_kalesi,d:"Single use. COMMON goalkeeper rating +5. DARK +9; 15% chance -€15M and -8 in the final."},
  anadolu:{...en.anadolu,d:"Build card. +1 power per sub-70 starter. COMMON max +3; DARK max +5 with a 20% chance of an extra €5M logistics cost on acquisition."},
  altyapi_plani:{...(en.altyapi_plani||{n:"Academy Plan",i:""}),d:"Build card. COMMON adds +1 per age-23-or-under starter (max +4). DARK adds +2 each (max +6); -4 power in the final."},
  tecrubeli_omurga:{...(en.tecrubeli_omurga||{n:"Veteran Spine",i:""}),d:"Counts only age-32+ starters. COMMON adds +1 each (max +4). DARK adds +2 each (max +6) and -4 power in the final."},
  yerli_blok:{...en.yerli_blok,d:"Build card. COMMON adds +1 per local starter (max +5). DARK adds +2 each (max +5) and -3 power in the final."},
  kanat_akini:{...en.kanat_akini,d:"Build + Final.sim card. COMMON adds +1 per wing/fullback (max +4). DARK adds +2 each (max +6), -5 in the final, and encourages wide sequences."},
  cift_forvet:{...en.cift_forvet,d:"Build card. COMMON adds +2 per starting ST (max +4). DARK adds +4 per ST (max +8) and -4 in the final; best for long balls and counters."},
  derbi:{...en.derbi,d:"Inactive in the first three rounds; activates only in big matches. COMMON: quarter-final +2, semi-final +4, final +8. DARK: quarter +4, semi +7, final +6; 25% chance of an extra €7M cost on acquisition."},
  final_provasi:{...(en.final_provasi||en.ch_final||{n:"Final Rehearsal",i:""}),d:"Works only in the final. COMMON adds +5 power. DARK adds +9 power and has a 25% chance of an extra €3M cost when acquired."},
  son_dans:{...en.son_dans,d:"Final only. COMMON: +8 with no injured starter, +2 with at least 1. DARK: +14 with none, -8 with at least 1 injured starter."},
  taksit_transfer:{...(en.taksit_transfer||{n:"Installment Transfer",i:""}),d:"COMMON: +€10M now, -€4M for 2 rounds. DARK: +€18M, -€7M for 2 rounds; trust -1 and -6 final."},
  son_kredi:{...(en.son_kredi||{n:"Last Credit",i:""}),d:"Emergency economy. Triggers below -€10M or waits. COMMON +€15M. DARK +€20M and trust -1. Acquisition tightens the sack limit by €5M."},
  kara_borsa:{...(en.kara_borsa||{n:"Black Market",i:""}),d:"COMMON: 1 free COMMON persistent card. DARK: 2 free persistent cards; 40% chance -€10M fine."},
  sahte_evrak:{...(en.sahte_evrak||{n:"Fake Papers",i:""}),d:"Contract risk card. COMMON +6 power/round and 18% chance trust -1 on acquisition. DARK +10 power/round, trust -1 and -10 power in the final."},
  kumarbaz:{...en.kumarbaz,d:"Economy contract. Money now, payments later. COMMON +€15M / 2 rounds -€5M. DARK +€25M / 2 rounds -€10M and trust -1."},
  gecici_prim:{...en.gecici_prim,d:"One-match power. COMMON +6 with 30% injury risk after. DARK +12 with 60% risk. Both leave -2 power next match."},
  kisa_kamp:{...(en.kisa_kamp||{n:"Short Camp",i:"⛺"}),d:"Controlled one-match power. COMMON +4, next -2. DARK +6, next -4. Best: critical matchup."},
  doping:{...en.doping,d:"Contract risk card. COMMON +6 power/round, 20% trust risk on acquisition and 35% chance -€15M each round. DARK +10, trust -1, 25% chance -€25M each round and -6 power in the final."},
  kriz:{...en.kriz,d:"COMMON offsets 50% of the total final penalty. DARK offsets 75% with a 20% chance of an extra €5M consultancy cost on acquisition."},
  primler_yatinca:{...en.primler_yatinca,d:"Deferred payment. Power now, money lost next round. COMMON +4 / then −€8M. DARK +8 / then −€16M."},
  vur_igneyi:{...en.vur_igneyi,d:"Injury solution. COMMON heals 1 injured player; no extra cost beyond the card price. DARK heals 2 injured players and has 25% chance -€6M extra cost."},
  bu_adam:{...en.bu_adam,d:"Bench move. COMMON adds a random Power 70-79 player. DARK adds an Power 80-89 player with a 25% chance of an extra €6M signing cost."},
  gec_gec:{...en.gec_gec,d:"Underdog defence card. +5 if opponent is stronger, otherwise +2. DARK: +2 extra power, -3 final power."},
  nasip_kismet:{...en.nasip_kismet,d:"Next-round card prices: COMMON -25%, DARK -40%. DARK also has a 25% chance -€4M fine."},
  yildiz_krizi:{...en.yildiz_krizi,d:"COMMON: Media attention grants +3 this match. DARK: +4 this match; 20% chance -€4M media fine."},
  kasiga_para:{...en.kasiga_para,d:"COMMON: Opponent -4 power; next market closes, the next open market has card prices +25%. DARK: Opponent -8 power; next market closes, the next open market has card prices +50%, trust -1."}
 });
}
_patchCardCopy();
function _patchVariantDescriptions(){
 const split={
  tr:{
   taraftar:"COMMON: Tur 1/2/3+ için +2/+3/+4. DARK: +3/+5/+6; %25 güven -1, finalde -6.",
   genc:"COMMON: Tur numarası kadar güç. DARK: Buna +3 güç ekler; final cezası taşır.",
   ch_momentum:"COMMON: Geç oyun ivmesi verir. DARK: Daha güçlü ivme verir ama final baskısı ekler.",
   kontra:"COMMON: Forvet başına +1 güç. DARK: Forvet başına +2 güç; %25 ihtimal -€10M ceza.",
   buyuk_mac:"COMMON: Bu maç +6 güç. DARK: Bu maç +10 güç; %20 ihtimal -€12M ceza.",
   yildiz:"COMMON: Gücü en yüksek oyuncuna göre tek maçlık güç. DARK: Daha güçlü; %25 ihtimal -€6M ceza.",
   otobus:"COMMON: Stoper başına +3, max +9. DARK: Stoper başına +4, max +12; %10 ihtimal -€6M, finalde -3.",
   kaleci_kalesi:"COMMON: Kaleci gücü +5. DARK: +9; %15 ihtimal -€15M, finalde -8.",
   anadolu:"70 altı oyuncu başına +1. COMMON max +3. DARK max +5; %20 ihtimalle €5M ek masraf.",
   altyapi_plani:"COMMON: 23 yaş ve altı başına +1, max +4. DARK: Başına +2, max +6; finalde -4.",
   tecrubeli_omurga:"COMMON: İlk 11'deki 32+ başına +1, max +4. DARK: Başına +2, max +6; finalde -4.",
   yerli_blok:"COMMON: Yerli başına +1, max +5. DARK: Başına +2, max +5; finalde -3.",
   kanat_akini:"COMMON: Kanat/bek başına +1, max +4. DARK: Başına +2, max +6; finalde -5.",
   cift_forvet:"COMMON: SNT başına +2, max +4. DARK: Başına +4, max +8; finalde -4.",
   derbi:"COMMON: Çeyrek +2, yarı +4, final +8. DARK: Çeyrek +4, yarı +7, final +6; %25 ihtimalle €7M ek masraf.",
   final_provasi:"Yalnız finalde çalışır. COMMON: +5 takım gücü. DARK: +9 takım gücü; satın alırken %25 ihtimalle €3M ek masraf.",
   son_dans:"COMMON: Finalde sakatsız kadro +8. DARK: Finalde sakatsız kadro +14, sakatlıkta ağır düşer.",
   taksit_transfer:"COMMON: Şimdi +€10M, 2 tur -€4M. DARK: +€18M, 2 tur -€7M; güven -1, finalde -6.",
   son_kredi:"COMMON: Kasa -€10M altındaysa +€15M. DARK: +€20M ve güven -1. İkisinde de kovulma eşiği €5M daralır.",
   kara_borsa:"COMMON: 1 bedava COMMON kalıcı kart. DARK: 2 bedava kalıcı kart; %40 ihtimal -€10M.",
   sahte_evrak:"COMMON: Her tur +6; edinirken %18 güven -1. DARK: Her tur +10, güven -1 ve finalde -10.",
   kumarbaz:"COMMON: +€15M şimdi, 2 tur -€5M. DARK: +€25M şimdi, 2 tur -€10M ve güven -1.",
   gecici_prim:"COMMON: Bu maç +6, %30 sakatlık; sonraki maç -2. DARK: +12, %60 sakatlık; sonraki maç -2.",
   kisa_kamp:"COMMON: Bu maç +4, sonraki maç -2. DARK: Bu maç +6, sonraki maç -4.",
   doping:"COMMON: +6/tur; %20 güven riski, her tur %35 ihtimal -€15M. DARK: +10/tur; güven -1, %25 ihtimal -€25M, finalde -6.",
   kriz:"COMMON: Final cezasının %50'sini telafi eder. DARK: %75'ini telafi eder; %20 ihtimalle €5M ek masraf.",
   primler_yatinca:"COMMON: Şimdi +4 güç, gelecek tur −€8M. DARK: Şimdi +8 güç, gelecek tur −€16M.",
   vur_igneyi:"COMMON: 1 sakat oyuncuyu iyileştirir; kart bedeli dışında ek masraf yok. DARK: 2 sakat oyuncuyu iyileştirir; %25 ihtimal -€6M ek masraf.",
   bu_adam:"COMMON: 70-79 güçlü rastgele bir oyuncuyu yedeğe ekler. DARK: 80-89 güçlü oyuncu; %25 ihtimalle €6M ek masraf.",
   gec_gec:"COMMON: Rakip güçlüyse +5, değilse +2. DARK: Bunlara +2; her tur %25 sakatlık riski ve finalde -3 güç.",
   nasip_kismet:"COMMON: Sonraki tur kart fiyatları -%25. DARK: -%40; %25 ihtimal -€4M.",
   yildiz_krizi:"COMMON: Medya ilgisi bu maç +3 güç. DARK: Bu maç +4 güç; %20 ihtimal -€4M.",
   kasiga_para:"COMMON: Rakip -4 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%25. DARK: Rakip -8 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%50 ve güven -1."
  },
  en:{
   taraftar:"COMMON: Rounds 1/2/3+ grant +2/+3/+4. DARK: +3/+5/+6; 25% trust -1, -6 in final.",
   genc:"COMMON: Power equals the round number. DARK: Adds +3 more and carries a final penalty.",
   ch_momentum:"COMMON: Late-run momentum. DARK: Stronger late momentum with final pressure.",
   kontra:"COMMON: +1 power per forward. DARK: +2 power per forward; 25% chance -€10M fine.",
   buyuk_mac:"COMMON: +6 power this match. DARK: +10 power this match; 20% chance -€12M fine.",
   yildiz:"COMMON: One-match power from highest-power player. DARK: Stronger; 25% chance -€6M fine.",
   otobus:"COMMON: +3 per starting CB, max +9. DARK: +4 per CB, max +12; 10% chance -€6M, -3 in final.",
   kaleci_kalesi:"COMMON: Goalkeeper rating +5. DARK: +9; 15% chance -€15M, -8 in final.",
   anadolu:"+1 per sub-70 starter. COMMON max +3. DARK max +5; 20% chance of an extra €5M cost.",
   altyapi_plani:"COMMON: +1 per age-23-or-under starter, max +4. DARK: +2 each, max +6; -4 in the final.",
   tecrubeli_omurga:"COMMON: +1 per age-32+ starter, max +4. DARK: +2 each, max +6; -4 in the final.",
   yerli_blok:"COMMON: +1 per local starter, max +5. DARK: +2 each, max +5; -3 in the final.",
   kanat_akini:"COMMON: +1 per wide starter, max +4. DARK: +2 each, max +6; -5 in the final.",
   cift_forvet:"COMMON: +2 per ST, max +4. DARK: +4 per ST, max +8; -4 in the final.",
   derbi:"COMMON: QF +2, semi +4, final +8. DARK: QF +4, semi +7, final +6; 25% chance of an extra €7M cost.",
   final_provasi:"Final only. COMMON: +5 team power. DARK: +9 team power; 25% chance of an extra €3M cost on acquisition.",
   son_dans:"COMMON: Healthy final squad +8. DARK: Healthy final squad +14, punished hard by injuries.",
   taksit_transfer:"COMMON: +€10M now, -€4M for 2 rounds. DARK: +€18M, -€7M for 2 rounds; trust -1, final -6.",
   son_kredi:"COMMON: +€15M below -€10M. DARK: +€20M and trust -1. Both tighten the sack limit by €5M.",
   kara_borsa:"COMMON: 1 free COMMON persistent card. DARK: 2 free persistent cards; 40% chance -€10M fine.",
   sahte_evrak:"COMMON: +6/round; 18% trust risk on acquisition. DARK: +10/round, trust -1 and -10 in the final.",
   kumarbaz:"COMMON: +€15M now, 2 rounds -€5M. DARK: +€25M now, 2 rounds -€10M and trust -1.",
   gecici_prim:"COMMON: +6, 30% injury risk; next match -2. DARK: +12, 60% injury risk; next match -2.",
   kisa_kamp:"COMMON: +4 this match, next match -2. DARK: +6 this match, next match -4.",
   doping:"COMMON: +6/round; 20% trust risk, 35% chance -€15M each round. DARK: +10/round, trust -1, 25% chance -€25M and -6 in the final.",
   kriz:"COMMON: Offsets 50% of the final penalty. DARK: Offsets 75%; 20% chance of an extra €5M cost.",
   primler_yatinca:"COMMON: +4 power now, next round −€8M. DARK: +8 power now, next round −€16M.",
   vur_igneyi:"COMMON: Heals 1 injured player; no extra cost beyond the card price. DARK: Heals 2 injured players; 25% chance -€6M extra cost.",
   bu_adam:"COMMON: Adds a random Power 70-79 player. DARK: Adds an Power 80-89 player; 25% chance of an extra €6M cost.",
   gec_gec:"COMMON: +5 if opponent is stronger, otherwise +2. DARK: +2 extra; 25% injury risk each round and -3 final power.",
   nasip_kismet:"COMMON: Next-round card prices -25%. DARK: -40%; 25% chance -€4M fine.",
   yildiz_krizi:"COMMON: Media attention grants +3 this match. DARK: +4 this match; 20% chance -€4M fine.",
   kasiga_para:"COMMON: Opponent -4 power; next market closes, the next open market has card prices +25%. DARK: Opponent -8 power; next market closes, the next open market has card prices +50%, trust -1."
  }
 };
 for(const lang of Object.keys(split)){
  const cards=T[lang]&&T[lang].cards;
  if(!cards)continue;
  for(const key of Object.keys(split[lang])){
   if(cards[key])cards[key].d=split[lang][key];
  }
 }
}
_patchVariantDescriptions();
function _patchBackroomPressureCopy(){
 const tr=T.tr.cards,en=T.en.cards;
 if(tr&&tr.kasiga_para){
  tr.kasiga_para.n="Saha Dışı Baskı";
  tr.kasiga_para.d="COMMON: Rakip -4 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%25. DARK: Rakip -8 güç; gelecek pazar kapalı, sonraki açık pazarda kart fiyatları +%50 ve güven -1.";
 }
 if(en&&en.kasiga_para){
  en.kasiga_para.n="Backroom Pressure";
  en.kasiga_para.d="COMMON: Opponent -4 power; next market closes, the next open market has card prices +25%. DARK: Opponent -8 power; next market closes, the next open market has card prices +50%, trust -1.";
 }
}
_patchBackroomPressureCopy();
function _patchVisibleCardCostCopy(){
 const tr=T.tr.cards,en=T.en.cards;
 if(tr.yildiz_krizi)tr.yildiz_krizi.d="COMMON: Bu maç +3 güç; kimya -1. DARK: Bu maç +4 güç; kimya -2 ve %20 ihtimal -€4M medya cezası.";
 if(en.yildiz_krizi)en.yildiz_krizi.d="COMMON: +3 power this match; chemistry -1. DARK: +4 power this match; chemistry -2 and a 20% chance of a €4M media fine.";
 if(tr.kasiga_para)tr.kasiga_para.d="COMMON: Rakip -4 güç; kimya -1 ve sonraki açık pazarda fiyatlar +%25. DARK: Rakip -8 güç; kimya -1, güven -1, sonraki açık pazarda fiyatlar +%50.";
 if(en.kasiga_para)en.kasiga_para.d="COMMON: Opponent -4 power; chemistry -1 and next open market prices +25%. DARK: Opponent -8 power; chemistry -1, trust -1, next open market prices +50%.";
 if(tr.kara_borsa)tr.kara_borsa.d="COMMON: Bir kart yak; 2 kalıcı kart al. DARK: Bir kart yak; 2 kart al, %35 ihtimal -€10M ceza.";
 if(en.kara_borsa)en.kara_borsa.d="COMMON: Burn one card; take 2 persistent cards. DARK: Burn one card; take 2 cards, 35% chance of a €10M fine.";
}
_patchVisibleCardCostCopy();

var COPA_SUPPORTED_LANGS=["tr","en","es","de","it"];

function _cloneLocaleValue(value){
 if(Array.isArray(value))return value.map(_cloneLocaleValue);
 if(value&&typeof value==="object"){
  var copy={};
  Object.keys(value).forEach(function(key){copy[key]=_cloneLocaleValue(value[key]);});
  return copy;
 }
 return value;
}

function _createLocale(base,patch){
 var locale=_cloneLocaleValue(base);
 Object.keys(patch||{}).forEach(function(key){
  var value=patch[key];
  if(value&&typeof value==="object"&&!Array.isArray(value)&&locale[key]&&typeof locale[key]==="object"&&!Array.isArray(locale[key])){
   Object.assign(locale[key],value);
  }else locale[key]=value;
 });
 return locale;
}

/* New locales inherit the complete English dictionary, then replace the primary UI copy.
   Card and event copy can safely fall back to English until a dedicated translation exists. */
T.es=_createLocale(T.en,{
 tagline:"el juego de gestión de plantilla donde desafías al destino",
 budget:"Caja",coverTitle:"copa.life",coverSub:"Copa de Turquia",
 coverBlurb:"Tira los dados. Forma tu equipo. Desafia al destino.",
 pickhdr:"ELIGE FORMACIÓN Y PRESIDENTE",rollHint:"Tira el dado. Se abre una posición al azar.",
 roll:"TIRAR EL DADO",allBtn:"FORMAR EQUIPO AUTOMATICAMENTE",undo:"DESHACER",
 startBtn:"EMPEZAR",quickStartBtn:"INICIO ALEATORIO",cNamePh:"Nombre del club",
 youLbl:"TU EQUIPO",oppLbl:"RIVAL",shopLbl:"MERCADO DE CARTAS",talk:"HABLA AL EQUIPO",
 play:"JUGAR EL PARTIDO",playFinal:"JUGAR LA FINAL",cardsLbl:"EFECTOS ACTIVOS",
 squad:"PLANTILLA",free:"GRATIS",tooexp:"FONDOS INSUFICIENTES"
});
T.de=_createLocale(T.en,{
 tagline:"das Kadermanagementspiel, in dem du das Schicksal herausforderst",
 budget:"Kasse",coverTitle:"copa.life",coverSub:"Türkischer Pokal",
 coverBlurb:"Würfle. Baue dein Team. Fordere das Schicksal heraus.",
 pickhdr:"FORMATION UND PRÄSIDENT WÄHLEN",rollHint:"Würfle. Eine zufällige Position wird freigeschaltet.",
 roll:"WÜRFELN",allBtn:"TEAM AUTOMATISCH FÜLLEN",undo:"RÜCKGÄNGIG",
 startBtn:"STARTEN",quickStartBtn:"ZUFALLSSTART",cNamePh:"Vereinsname",
 youLbl:"DEIN TEAM",oppLbl:"GEGNER",shopLbl:"KARTENMARKT",talk:"ZUR MANNSCHAFT SPRECHEN",
 play:"SPIELEN",playFinal:"FINALE SPIELEN",cardsLbl:"AKTIVE EFFEKTE",
 squad:"KADER",free:"KOSTENLOS",tooexp:"NICHT GENUG GELD"
});
T.it=_createLocale(T.en,{
 tagline:"il gioco di gestione rosa dove sfidi il destino",
 budget:"Cassa",coverTitle:"copa.life",coverSub:"Coppa di Turchia",
 coverBlurb:"Lancia i dadi. Costruisci la squadra. Sfida il destino.",
 pickhdr:"SCEGLI MODULO E PRESIDENTE",rollHint:"Lancia il dado. Si apre un ruolo casuale.",
 roll:"LANCIA IL DADO",allBtn:"CREA LA SQUADRA AUTOMATICAMENTE",undo:"ANNULLA",
 startBtn:"INIZIA",quickStartBtn:"INIZIO CASUALE",cNamePh:"Nome del club",
 youLbl:"LA TUA SQUADRA",oppLbl:"AVVERSARIO",shopLbl:"MERCATO CARTE",talk:"PARLA ALLA SQUADRA",
 play:"GIOCA LA PARTITA",playFinal:"GIOCA LA FINALE",cardsLbl:"EFFETTI ATTIVI",
 squad:"ROSA",free:"GRATIS",tooexp:"FONDI INSUFFICIENTI"
});

/* Keep the non-English editions as real locale packs.  These keys cover the
   setup, draft, hub, match and result loop; specialist event copy can still
   opt into the English fallback without turning the whole interface English. */
T.es=_createLocale(T.es,{
 artNote:"Pintado en 1953, 'Going to the Match' de L. S. Lowry muestra a aficionados camino de Burnden Park, el antiguo estadio del Bolton Wanderers.",
 patreonText:"copa.life es un proyecto de una sola persona. Puedes apoyar la idea y su desarrollo en Patreon. Significaría mucho.",
 proto:"prototipo de copa.life · 5 países · 10 ligas · 9.264 jugadores",
 formSub:{"4-3-3":"clásico","4-4-2":"tradicional","4-2-3-1":"moderno","3-5-2":"bandas","5-3-2":"defensivo","3-4-3":"ataque","4-5-1":"cerrojo"},
 rollPrompt:"TIRADA › posición",afford:"asequible",noAfford:"fondos bajos: aún puedes elegir al más barato",
 pos:{GK:"Portero",LB:"Lateral izquierdo",RB:"Lateral derecho",CB:"Defensa central",CM:"Centrocampista",DM:"Mediocentro defensivo",LM:"Interior izquierdo",RM:"Interior derecho",LW:"Extremo izquierdo",RW:"Extremo derecho",AM:"Mediapunta",ST:"Delantero",WB:"Carrilero"},
 grp:{GK:"Portería",DEF:"Defensa",MID:"Centrocampo",FWD:"Ataque"},
 capRoll:"TIRANDO",youLbl:"Potencia",oppLbl:"Rival",shopLbl:"Mercado de cartas",
 pres:T.en.pres.replace("Chairman","Presidente"),train:"Entrenamiento",scout:"Observar rival",owned:"en propiedad",autoOn:"Auto: SÍ",autoOff:"Auto: NO",ddTitle:"CIERRE DEL<br>MERCADO",squad:"plantilla",
 rounds:["RONDA 1","RONDA 2","OCTAVOS","CUARTOS","SEMIFINAL","FINAL"],rabbr:["R1","R2","OCT","CF","SF","F"],vsword:"te enfrentas a",
 matchWin:"AVANZAS",matchLose:"ELIMINADO",matchPen:"¡PASAS EN PENALTIS!",teleHead:"RESULTADO DEL PARTIDO",cont:"Continuar",toFinal:"¡A la final!",us:"NOSOTROS",champTitle:"CAMPEONES",champV:"levantaste la copa. Este equipo hizo historia.",outTitle:"ELIMINADO",
 lblTur:"Ronda alcanzada",lblGuc:"Potencia",lblKart:"Cartas",copyfail:"no se pudo copiar",again:"NUEVA PARTIDA DE copa.life",presHead:"BOLETÍN DEL PRESIDENTE",presThink:"EL PRESIDENTE ESTÁ DECIDIENDO...",presClose:"VALE",
 kitHdr:"Elige los colores de la equipación",kitSub:"jugarás con estos colores",spd:"VELOCIDAD",styleHdr:"Elige tu filosofía",styleSub:"aplica una pequeña bonificación de estilo",motm:"JUGADOR DEL PARTIDO",yourXi:"TU ONCE",oppXi:"ONCE RIVAL",scoutHead:"PLANTILLA RIVAL",
 flanks:{L:"IZQUIERDA",C:"CENTRO",R:"DERECHA"},matchupMsg:"atacas su banda débil (+potencia)",injHead:"¡LESIÓN!",backupHead:"ELEGIR SUPLENTE",trainCant:"entrenamiento: sin fondos/usos",
 rar:{bronze:"BRONCE",silver:"PLATA",gold:"ORO",ch:"RETO"},startHead:"DESBLOQUEADO: carta inicial",startSub:"empieza esta partida con una carta gratis",locked:"bloqueado",lockedHint:"gana copas para desbloquear formaciones",chLbl:"Retos",chUnlock:"Carta desbloqueada:",objHdr:"OBJETIVOS",
 feedHdr:"NOVEDADES",feedEmpty:"todavía no hay noticias...",feedBuy:"fichado",feedUnlock:"desbloqueado",chairHdr:"PRESIDENTE",hiddenName:"Jugador misterioso",hiddenMeta:"??? · joya o fiasco",cevher:"¡Joya!",balon:"Fiasco:",reveal:"revelado:",
 trait:{hizli:"Veloz",lider:"Líder",buyukmac:"Partidos grandes",sorunlu:"Conflictivo",cam:"Frágil",wonderkid:"Joven promesa"},panicHead:"¡FICHAJE DE PÁNICO!",panicFeed:"se agotó el plazo: fichaje forzado",mgrDefault:"SEMILLA",metaLine:(b,r)=>`mejor: <b>${b}</b> · partidas: <b>${r}</b>`,storyHdr:"HISTORIA DE LA TEMPORADA",
 chem:{hdr:"QUÍMICA",young:"joven",tr:"local",vet:"líder",none:"ninguno",scattered:"Plantilla dispersa",localGap:"Sin núcleo local",leaderGap:"Sin líder en el campo"},fan:{hdr:"AFICIÓN",s:["Furiosa","Inquieta","Feliz","Eufórica"]},
 talkSub:"Elige un efecto de moral para este partido:",talkUnder:"Son favoritos: motivar al equipo funcionó.",talkFav:"Sois favoritos: importan la concentración y la disciplina.",talkDelta:"Potencia",powHdr:"POTENCIA DE LA PLANTILLA",powHint:"detalle →",powHdr2:"DESGLOSE DE POTENCIA",quickAgain:"Repetir la misma configuración",presWord:"Presidente",cupTitle:"FINAL DE COPA",tcHdr:"CENTRO DE FICHAJES",assistLbl:"Asistencia:",stDraft:"Creado desde cero el día del cierre",
 pbPlayers:"Jugadores",pbCards:"Estilo + Cartas",pbChem:"Química",pbFan:"Afición",pbTotal:"TOTAL",ctxHidden:"jugador misterioso: asume el riesgo",ctxWonder:"futura superestrella",ctxStar:"referente del equipo",ctxBig:"jugador de grandes partidos",ctxLead:"líder del vestuario",ctxYoung:"joven talento",ctxLocal:"orgullo local",ctxVet:"veterano experto",ctxForm:"en plena forma",ctxSolid:"nombre fiable",
 ch:{c1:"gana por 3+ goles",c2:"gana sin encajar",c3:"vence a un rival más fuerte",c4:"llega a cuartos",c5:"llega a la final"},clubHdr:"Detalles del club",colP:"Color principal",colS:"Color secundario",clubGo:"Empezar la copa",
 catName:{hucum:"Ataque",savunma:"Defensa",ekonomi:"Economía",taraftar:"Afición",baskan:"Presidente",risk:"Riesgo",gorev:"Reto"},fanLbl:["Furiosa","Inquieta","Feliz","Eufórica"],runNames:{youth:"Partida joven",fan:"Partida de afición",wall:"Partida muro de hierro",attack:"Partida ofensiva",economy:"Partida económica",risk:"Partida de riesgo"},
 ui:{collectionHdr:"COLECCIÓN DE CARTAS",cardSlotFull:"🃏 espacios de cartas activas llenos",style:"Estilo",cards:"Cartas",matchup:"Emparejamiento",riskDebt:"Riesgo / deuda final",traitMorale:"Rasgos + moral",bonusEfficiency:"Eficiencia de bonificación",softCap:"Límite suave reducido",lockedCard:"Carta bloqueada",lockedCaps:"BLOQUEADA",activeRemove:"activa · clic para quitar",clickEquip:"clic para equipar",slotFull:"espacios llenos",unlockFrom:"desbloquear en el mercado",copies:"Copias",effect:"Efecto",seeChair:"VER PRESIDENTE",unlocksQf:"se desbloquea en cuartos",less:"− menos",deal:" · 🔥 oferta",cup:"LA COPA",shareLine:"¿puedes llegar a la final?",postBand:"copa.life · PLANTILLA LISTA",finalPower:"potencia",playFinalCta:"JUGAR LA FINAL 🏆"},
 talkHead:"VESTUARIO",talkThink:"DANDO LA CHARLA..."
});

T.de=_createLocale(T.de,{
 artNote:"Das 1953 entstandene Gemälde 'Going to the Match' von L. S. Lowry zeigt Fußballfans auf dem Weg zum Burnden Park, der damaligen Heimat der Bolton Wanderers.",
 patreonText:"copa.life ist ein Ein-Personen-Projekt. Du kannst die Idee und ihre Entwicklung auf Patreon unterstützen. Das würde viel bedeuten.",
 proto:"copa.life Prototyp · 5 Länder · 10 Ligen · 9.264 Spieler",
 formSub:{"4-3-3":"klassisch","4-4-2":"traditionell","4-2-3-1":"modern","3-5-2":"Flügel","5-3-2":"defensiv","3-4-3":"Angriff","4-5-1":"Abwehrriegel"},
 rollPrompt:"WURF › Position",afford:"bezahlbar",noAfford:"wenig Geld: der Günstigste ist noch verfügbar",
 pos:{GK:"Torwart",LB:"Linksverteidiger",RB:"Rechtsverteidiger",CB:"Innenverteidiger",CM:"Mittelfeldspieler",DM:"Defensives Mittelfeld",LM:"Linkes Mittelfeld",RM:"Rechtes Mittelfeld",LW:"Linksaußen",RW:"Rechtsaußen",AM:"Offensives Mittelfeld",ST:"Stürmer",WB:"Flügelverteidiger"},
 grp:{GK:"Tor",DEF:"Abwehr",MID:"Mittelfeld",FWD:"Angriff"},
 capRoll:"WÜRFELT",youLbl:"Stärke",oppLbl:"Gegner",shopLbl:"Kartenmarkt",pres:T.en.pres.replace("Chairman","Präsident"),train:"Training",scout:"Gegner beobachten",owned:"im Besitz",autoOn:"Auto: AN",autoOff:"Auto: AUS",ddTitle:"TRANSFER-<br>SCHLUSS",squad:"Kader",
 rounds:["RUNDE 1","RUNDE 2","ACHTELFINALE","VIERTELFINALE","HALBFINALE","FINALE"],rabbr:["R1","R2","AF","VF","HF","F"],vsword:"du triffst auf",
 matchWin:"DU BIST WEITER",matchLose:"AUSGESCHIEDEN",matchPen:"WEITER IM ELFERSCHIESSEN!",teleHead:"SPIELERGEBNIS",cont:"Weiter",toFinal:"Ins Finale!",us:"WIR",champTitle:"MEISTER",champV:"Du hast den Pokal gewonnen. Dieser Kader schrieb Geschichte.",outTitle:"AUSGESCHIEDEN",
 lblTur:"Erreichte Runde",lblGuc:"Stärke",lblKart:"Karten",copyfail:"Kopieren fehlgeschlagen",again:"NEUE copa.life PARTIE",presHead:"MITTEILUNG DES PRÄSIDENTEN",presThink:"DER PRÄSIDENT ENTSCHEIDET...",presClose:"OK",
 kitHdr:"Trikotfarben wählen",kitSub:"in diesen Farben spielst du",spd:"TEMPO",styleHdr:"Philosophie wählen",styleSub:"gibt einen kleinen Stilbonus",motm:"SPIELER DES SPIELS",yourXi:"DEINE ELF",oppXi:"GEGNERISCHE ELF",scoutHead:"GEGNERISCHER KADER",
 flanks:{L:"LINKS",C:"MITTE",R:"RECHTS"},matchupMsg:"du greifst ihre schwache Seite an (+Stärke)",injHead:"VERLETZUNG!",backupHead:"ERSATZ ZIEHEN",trainCant:"Training: kein Geld/keine Nutzung",
 rar:{bronze:"BRONZE",silver:"SILBER",gold:"GOLD",ch:"AUFGABE"},startHead:"FREIGESCHALTET: Startkarte",startSub:"beginne diese Partie mit einer kostenlosen Karte",locked:"gesperrt",lockedHint:"gewinne Pokale, um Formationen freizuschalten",chLbl:"Aufgaben",chUnlock:"Karte freigeschaltet:",objHdr:"ZIELE",
 feedHdr:"NEUIGKEITEN",feedEmpty:"noch keine Neuigkeiten...",feedBuy:"verpflichtet",feedUnlock:"freigeschaltet",chairHdr:"PRÄSIDENT",hiddenName:"Mystery-Spieler",hiddenMeta:"??? · Juwel oder Flop",cevher:"Juwel!",balon:"Flop:",reveal:"aufgedeckt:",
 trait:{hizli:"Schnell",lider:"Führungsspieler",buyukmac:"Große Spiele",sorunlu:"Schwierig",cam:"Verletzungsanfällig",wonderkid:"Wundertalent"},panicHead:"PANIKKAUF!",panicFeed:"Frist abgelaufen, Zwangstransfer",mgrDefault:"SEED",metaLine:(b,r)=>`Bestwert: <b>${b}</b> · Partien: <b>${r}</b>`,storyHdr:"SAISONGESCHICHTE",
 chem:{hdr:"CHEMIE",young:"jung",tr:"lokal",vet:"Führung",none:"keine",scattered:"Zerstreuter Kader",localGap:"Kein lokaler Kern",leaderGap:"Kein Anführer auf dem Platz"},fan:{hdr:"FANS",s:["Wütend","Unruhig","Zufrieden","Begeistert"]},
 talkSub:"Wähle einen Moral-Effekt für dieses Spiel:",talkUnder:"Sie sind Favorit – die Ansprache hat gezündet.",talkFav:"Ihr seid Favorit – Fokus und Disziplin zählen.",talkDelta:"Stärke",powHdr:"KADERSTÄRKE",powHint:"Details →",powHdr2:"STÄRKE-AUFSCHLÜSSELUNG",quickAgain:"Gleiche Konfiguration wiederholen",presWord:"Präsident",cupTitle:"POKALFINALE",tcHdr:"TRANSFERZENTRALE",assistLbl:"Vorlage:",stDraft:"Am Deadline-Tag neu aufgebaut",
 pbPlayers:"Spieler",pbCards:"Stil + Karten",pbChem:"Chemie",pbFan:"Fans",pbTotal:"GESAMT",ctxHidden:"Mystery-Spieler – riskiere es",ctxWonder:"künftiger Superstar",ctxStar:"Schlüsselspieler",ctxBig:"Spieler für große Spiele",ctxLead:"Kabinenchef",ctxYoung:"junges Talent",ctxLocal:"Lokalmatador",ctxVet:"erfahrener Kopf",ctxForm:"in Topform",ctxSolid:"verlässlicher Name",
 ch:{c1:"mit 3+ Toren gewinnen",c2:"ohne Gegentor gewinnen",c3:"einen stärkeren Gegner schlagen",c4:"das Viertelfinale erreichen",c5:"das Finale erreichen"},clubHdr:"Vereinsdetails",colP:"Primärfarbe",colS:"Sekundärfarbe",clubGo:"Pokal starten",
 catName:{hucum:"Angriff",savunma:"Abwehr",ekonomi:"Finanzen",taraftar:"Fans",baskan:"Präsident",risk:"Risiko",gorev:"Aufgabe"},fanLbl:["Wütend","Unruhig","Zufrieden","Begeistert"],runNames:{youth:"Jugendlauf",fan:"Fanlauf",wall:"Eiserne-Mauer-Lauf",attack:"Angriffslauf",economy:"Sparlauf",risk:"Risikolauf"},
 ui:{collectionHdr:"KARTENSAMMLUNG",cardSlotFull:"🃏 aktive Kartenplätze voll",style:"Stil",cards:"Karten",matchup:"Duell",riskDebt:"Risiko / Finalschuld",traitMorale:"Eigenschaften + Moral",bonusEfficiency:"Bonuswirkung",softCap:"Soft Cap reduziert",lockedCard:"Gesperrte Karte",lockedCaps:"GESPERRT",activeRemove:"aktiv · zum Entfernen klicken",clickEquip:"zum Ausrüsten klicken",slotFull:"Plätze voll",unlockFrom:"im Markt freischalten",copies:"Exemplare",effect:"Effekt",seeChair:"PRÄSIDENT ANSEHEN",unlocksQf:"ab Viertelfinale",less:"− weniger",deal:" · 🔥 Angebot",cup:"DER POKAL",shareLine:"schaffst du es ins Finale?",postBand:"copa.life · KADER STEHT",finalPower:"Stärke",playFinalCta:"FINALE SPIELEN 🏆"},
 talkHead:"KABINE",talkThink:"ANSPRACHE LÄUFT..."
});

T.it=_createLocale(T.it,{
 artNote:"Dipinto nel 1953, 'Going to the Match' di L. S. Lowry mostra i tifosi diretti a Burnden Park, allora casa del Bolton Wanderers.",
 patreonText:"copa.life è un progetto realizzato da una sola persona. Puoi sostenere l'idea e il suo sviluppo su Patreon. Significherebbe molto.",
 proto:"prototipo copa.life · 5 paesi · 10 campionati · 9.264 giocatori",
 formSub:{"4-3-3":"classico","4-4-2":"tradizionale","4-2-3-1":"moderno","3-5-2":"fasce","5-3-2":"difensivo","3-4-3":"attacco","4-5-1":"catenaccio"},
 rollPrompt:"LANCIO › ruolo",afford:"accessibile",noAfford:"fondi bassi: il più economico è ancora disponibile",
 pos:{GK:"Portiere",LB:"Terzino sinistro",RB:"Terzino destro",CB:"Difensore centrale",CM:"Centrocampista",DM:"Mediano",LM:"Esterno sinistro",RM:"Esterno destro",LW:"Ala sinistra",RW:"Ala destra",AM:"Trequartista",ST:"Attaccante",WB:"Quinto"},
 grp:{GK:"Porta",DEF:"Difesa",MID:"Centrocampo",FWD:"Attacco"},
 capRoll:"LANCIO",youLbl:"Forza",oppLbl:"Avversario",shopLbl:"Mercato carte",pres:T.en.pres.replace("Chairman","Presidente"),train:"Allenamento",scout:"Osserva avversario",owned:"posseduta",autoOn:"Auto: ON",autoOff:"Auto: OFF",ddTitle:"CHIUSURA<br>MERCATO",squad:"rosa",
 rounds:["TURNO 1","TURNO 2","OTTAVI","QUARTI","SEMIFINALE","FINALE"],rabbr:["T1","T2","OTT","QF","SF","F"],vsword:"affronti",
 matchWin:"PASSI IL TURNO",matchLose:"ELIMINATO",matchPen:"PASSI AI RIGORI!",teleHead:"RISULTATO PARTITA",cont:"Continua",toFinal:"In finale!",us:"NOI",champTitle:"CAMPIONI",champV:"Hai alzato la coppa. Questa rosa ha fatto la storia.",outTitle:"ELIMINATO",
 lblTur:"Turno raggiunto",lblGuc:"Forza",lblKart:"Carte",copyfail:"copia non riuscita",again:"NUOVA PARTITA copa.life",presHead:"BOLLETTINO DEL PRESIDENTE",presThink:"IL PRESIDENTE STA DECIDENDO...",presClose:"OK",
 kitHdr:"Scegli i colori della divisa",kitSub:"giocherai con questi colori",spd:"VELOCITÀ",styleHdr:"Scegli la filosofia",styleSub:"assegna un piccolo bonus stile",motm:"MIGLIORE IN CAMPO",yourXi:"IL TUO UNDICI",oppXi:"UNDICI AVVERSARIO",scoutHead:"ROSA AVVERSARIA",
 flanks:{L:"SINISTRA",C:"CENTRO",R:"DESTRA"},matchupMsg:"attacchi la loro fascia debole (+forza)",injHead:"INFORTUNIO!",backupHead:"PESCA RISERVA",trainCant:"allenamento: fondi/utilizzi esauriti",
 rar:{bronze:"BRONZO",silver:"ARGENTO",gold:"ORO",ch:"SFIDA"},startHead:"SBLOCCATA: carta iniziale",startSub:"inizia questa partita con una carta gratuita",locked:"bloccato",lockedHint:"vinci coppe per sbloccare i moduli",chLbl:"Sfide",chUnlock:"Carta sbloccata:",objHdr:"OBIETTIVI",
 feedHdr:"NOTIZIE",feedEmpty:"ancora nessuna notizia...",feedBuy:"ingaggiato",feedUnlock:"sbloccato",chairHdr:"PRESIDENTE",hiddenName:"Giocatore misterioso",hiddenMeta:"??? · talento o bidone",cevher:"Talento!",balon:"Bidone:",reveal:"rivelato:",
 trait:{hizli:"Veloce",lider:"Leader",buyukmac:"Grandi partite",sorunlu:"Difficile",cam:"Fragile",wonderkid:"Talento"},panicHead:"ACQUISTO DI PANICO!",panicFeed:"tempo scaduto, acquisto forzato",mgrDefault:"SEED",metaLine:(b,r)=>`migliore: <b>${b}</b> · partite: <b>${r}</b>`,storyHdr:"STORIA DELLA STAGIONE",
 chem:{hdr:"INTESA",young:"giovane",tr:"locale",vet:"leader",none:"nessuna",scattered:"Rosa disunita",localGap:"Nessun nucleo locale",leaderGap:"Nessun leader in campo"},fan:{hdr:"TIFOSI",s:["Furiosi","Inquieti","Felici","Entusiasti"]},
 talkSub:"Scegli un effetto morale per questa partita:",talkUnder:"Sono favoriti: la carica ha funzionato.",talkFav:"Siete favoriti: contano concentrazione e disciplina.",talkDelta:"Forza",powHdr:"FORZA DELLA ROSA",powHint:"dettagli →",powHdr2:"DETTAGLIO FORZA",quickAgain:"Ripeti la stessa configurazione",presWord:"Presidente",cupTitle:"FINALE DI COPPA",tcHdr:"CENTRO TRASFERIMENTI",assistLbl:"Assist:",stDraft:"Costruita da zero nell'ultimo giorno di mercato",
 pbPlayers:"Giocatori",pbCards:"Stile + Carte",pbChem:"Intesa",pbFan:"Tifosi",pbTotal:"TOTALE",ctxHidden:"giocatore misterioso: accetta il rischio",ctxWonder:"futura superstar",ctxStar:"uomo simbolo",ctxBig:"giocatore da grandi partite",ctxLead:"leader dello spogliatoio",ctxYoung:"giovane talento",ctxLocal:"orgoglio locale",ctxVet:"veterano esperto",ctxForm:"in forma smagliante",ctxSolid:"nome affidabile",
 ch:{c1:"vinci con 3+ gol",c2:"vinci senza subire gol",c3:"batti un avversario più forte",c4:"raggiungi i quarti",c5:"raggiungi la finale"},clubHdr:"Dettagli club",colP:"Colore primario",colS:"Colore secondario",clubGo:"Inizia la coppa",
 catName:{hucum:"Attacco",savunma:"Difesa",ekonomi:"Economia",taraftar:"Tifosi",baskan:"Presidente",risk:"Rischio",gorev:"Sfida"},fanLbl:["Furiosi","Inquieti","Felici","Entusiasti"],runNames:{youth:"Partita giovani",fan:"Partita tifosi",wall:"Partita muro di ferro",attack:"Partita offensiva",economy:"Partita economica",risk:"Partita rischiosa"},
 ui:{collectionHdr:"COLLEZIONE CARTE",cardSlotFull:"🃏 slot carte attive pieni",style:"Stile",cards:"Carte",matchup:"Duello",riskDebt:"Rischio / debito finale",traitMorale:"Tratti + morale",bonusEfficiency:"Efficienza bonus",softCap:"Soft cap ridotto",lockedCard:"Carta bloccata",lockedCaps:"BLOCCATA",activeRemove:"attiva · clicca per rimuovere",clickEquip:"clicca per equipaggiare",slotFull:"slot pieni",unlockFrom:"sblocca dal mercato",copies:"Copie",effect:"Effetto",seeChair:"VEDI PRESIDENTE",unlocksQf:"si sblocca ai quarti",less:"− meno",deal:" · 🔥 offerta",cup:"LA COPPA",shareLine:"riesci ad arrivare in finale?",postBand:"copa.life · ROSA PRONTA",finalPower:"forza",playFinalCta:"GIOCA LA FINALE 🏆"},
 talkHead:"SPOGLIATOIO",talkThink:"DISCORSO IN CORSO..."
});

var _COPA_CHAIR_NAMES={
 es:{babacan:["El Patrón","Gran Patrón"],leydi:["El Diplomático","Mano Justa"],pinti:["El Tacaño","Caja Fuerte"],sansasyoncu:["El Showman","Hora del espectáculo"],torpilci:["El Arreglador","Negocio familiar"],cilgin:["El Profesor","Comodín"]},
 de:{babacan:["Der Patron","Großer Patron"],leydi:["Der Diplomat","Die faire Hand"],pinti:["Der Geizhals","Eiserne Kasse"],sansasyoncu:["Der Showman","Showtime"],torpilci:["Der Strippenzieher","Familienbetrieb"],cilgin:["Der Professor","Joker"]},
 it:{babacan:["Il Patron","Grande Patron"],leydi:["Il Diplomatico","Mano giusta"],pinti:["Il Tirchio","Cassaforte"],sansasyoncu:["Lo Showman","Spettacolo"],torpilci:["Il Faccendiere","Affari di famiglia"],cilgin:["Il Professore","Jolly"]}
};
Object.keys(_COPA_CHAIR_NAMES).forEach(function(locale){Object.keys(_COPA_CHAIR_NAMES[locale]).forEach(function(id){var chair=T[locale].chair&&T[locale].chair[id],value=_COPA_CHAIR_NAMES[locale][id];if(chair){chair.n=value[0];chair.role=value[1];}});});

function _detectCopaLocale(){
 try{
  var saved=localStorage.getItem("copa.language");
  if(COPA_SUPPORTED_LANGS.indexOf(saved)!==-1)return saved;
 }catch(error){}

 var locales=[];
 try{
  if(typeof navigator!=="undefined"){
   if(Array.isArray(navigator.languages))locales=locales.concat(navigator.languages);
   if(navigator.language)locales.push(navigator.language);
  }
  if(typeof Intl!=="undefined")locales.push(Intl.DateTimeFormat().resolvedOptions().locale);
 }catch(error){}
 for(var index=0;index<locales.length;index++){
  var language=String(locales[index]||"").toLowerCase().split("-")[0];
  if(COPA_SUPPORTED_LANGS.indexOf(language)!==-1)return language;
 }

 try{
  var zone=Intl.DateTimeFormat().resolvedOptions().timeZone||"";
  if(zone==="Europe/Istanbul")return "tr";
  if(zone==="Europe/Madrid"||zone==="Atlantic/Canary")return "es";
  if(zone==="Europe/Rome")return "it";
  if(zone==="Europe/Berlin"||zone==="Europe/Vienna"||zone==="Europe/Zurich")return "de";
  if(zone==="Europe/London")return "en";
 }catch(error){}
 return "en";
}

var LANG=_detectCopaLocale();
var L=()=>T[LANG]||T.en;
function LT(tr,en,es,de,it){
 var values=tr&&typeof tr==="object"&&!Array.isArray(tr)?tr:{tr:tr,en:en,es:es,de:de,it:it};
 var value=values[LANG];
 if(value===undefined||value===null)value=values.en;
 if(value===undefined||value===null)value=values.tr;
 return value;
}
if(typeof window!=="undefined")window.LT=LT;

var COPA_LOCALE_UI={
 tr:{label:"DİL",a11y:"ERİŞİLEBİLİRLİK",sound:"SES VE MÜZİK",guide:"NASIL OYNANIR?",anim:"ANİMASYONU AZALT",audio:"SES",music:"MÜZİK",advanced:"GELİŞMİŞ AYARLAR",country:"ÜLKENİ SEÇ",title:"copa.life — Roguelite futbol kadro yönetim oyunu",contact:"İLETİŞİM",settings:"Ayarlar",reduceMotion:"Animasyonu azalt",soundEffects:"Ses efektleri",heroTitle:"Zar at. Kadronu kur.<br><span class=\"v7-tagline-accent\">Kadere meydan oku.</span>",heroDesc:"Roguelite futbol kadro yönetim oyunu — her run farklı, hiçbir final kolay değil.",newLabel:"YENİ",contactPrompt:"Soru, fikir, hata? · ",activeEffects:"AKTİF ETKİLER",noEvents:"Henüz olay yok"},
 en:{label:"LANGUAGE",a11y:"ACCESSIBILITY",sound:"SOUND & MUSIC",guide:"HOW TO PLAY?",anim:"REDUCE MOTION",audio:"SOUND",music:"MUSIC",advanced:"ADVANCED SETTINGS",country:"PICK YOUR COUNTRY",title:"copa.life — Roguelite football squad management game",contact:"CONTACT",settings:"Settings",reduceMotion:"Reduce motion",soundEffects:"Sound effects",heroTitle:"Roll the dice. Build your squad.<br><span class=\"v7-tagline-accent\">Defy fate.</span>",heroDesc:"A roguelite football squad management game — every run is different, no final comes easy.",newLabel:"NEW",contactPrompt:"Question, idea, bug? · ",activeEffects:"ACTIVE EFFECTS",noEvents:"No events yet"},
 es:{label:"IDIOMA",a11y:"ACCESIBILIDAD",sound:"SONIDO Y MÚSICA",guide:"¿CÓMO SE JUEGA?",anim:"REDUCIR ANIMACIONES",audio:"SONIDO",music:"MÚSICA",advanced:"AJUSTES AVANZADOS",country:"ELIGE TU PAÍS",title:"copa.life — Gestión de plantilla de fútbol roguelite",contact:"CONTACTO",settings:"Ajustes",reduceMotion:"Reducir animaciones",soundEffects:"Efectos de sonido",heroTitle:"Lanza el dado. Forma tu equipo.<br><span class=\"v7-tagline-accent\">Desafía al destino.</span>",heroDesc:"Un juego roguelite de gestión de plantilla: cada partida es distinta y ninguna final es fácil.",newLabel:"NUEVO",contactPrompt:"¿Pregunta, idea o error? · ",activeEffects:"EFECTOS ACTIVOS",noEvents:"Aún no hay eventos"},
 de:{label:"SPRACHE",a11y:"BARRIEREFREIHEIT",sound:"SOUND UND MUSIK",guide:"WIE SPIELT MAN?",anim:"ANIMATIONEN REDUZIEREN",audio:"SOUND",music:"MUSIK",advanced:"ERWEITERTE EINSTELLUNGEN",country:"LAND AUSWÄHLEN",title:"copa.life — Roguelite-Fußball-Kaderverwaltung",contact:"KONTAKT",settings:"Einstellungen",reduceMotion:"Animationen reduzieren",soundEffects:"Soundeffekte",heroTitle:"Würfle. Baue deinen Kader.<br><span class=\"v7-tagline-accent\">Fordere das Schicksal heraus.</span>",heroDesc:"Ein Roguelite zur Fußball-Kaderverwaltung: Jede Partie ist anders und kein Finale ist leicht.",newLabel:"NEU",contactPrompt:"Frage, Idee oder Fehler? · ",activeEffects:"AKTIVE EFFEKTE",noEvents:"Noch keine Ereignisse"},
 it:{label:"LINGUA",a11y:"ACCESSIBILITÀ",sound:"AUDIO E MUSICA",guide:"COME SI GIOCA?",anim:"RIDUCI ANIMAZIONI",audio:"AUDIO",music:"MUSICA",advanced:"IMPOSTAZIONI AVANZATE",country:"SCEGLI IL PAESE",title:"copa.life — Gestione rosa calcio roguelite",contact:"CONTATTI",settings:"Impostazioni",reduceMotion:"Riduci animazioni",soundEffects:"Effetti sonori",heroTitle:"Lancia il dado. Crea la rosa.<br><span class=\"v7-tagline-accent\">Sfida il destino.</span>",heroDesc:"Un gioco roguelite di gestione della rosa: ogni partita è diversa e nessuna finale è facile.",newLabel:"NUOVO",contactPrompt:"Domanda, idea o errore? · ",activeEffects:"EFFETTI ATTIVI",noEvents:"Nessun evento"}
};

var COPA_LOCALE_BUTTONS=[
 {code:"tr",flag:"TR.png",short:"TR",name:"Türkçe"},
 {code:"en",flag:"GB.png",short:"EN",name:"English"},
 {code:"es",flag:"ES.png",short:"ES",name:"Espa\u00f1ol"},
 {code:"de",flag:"DE.png",short:"DE",name:"Deutsch"},
 {code:"it",flag:"IT.png",short:"IT",name:"Italiano"}
];

var COPA_HOWTO_TRANSLATIONS={
 es:{title:"\u00bfC\u00d3MO SE JUEGA?",subtitle:"6 PASOS EN COPA",close:"Cerrar",back:"VOLVER AL JUEGO",steps:[
  ["ELIGE FORMACI\u00d3N Y PRESIDENTE","La formaci\u00f3n define los puestos. El presidente modifica el presupuesto, bonificaciones y l\u00edmite de deuda."],
  ["TIRA Y ELIGE JUGADORES","Cada puesto muestra tres candidatos. Elige con cuidado: presupuesto y qu\u00edmica importan."],
  ["JUEGA SEIS RONDAS","Ganar mejora tus opciones, pero nunca garantiza el siguiente partido."],
  ["EL PRESIDENTE INTERVIENE","Puede ayudarte o crear una crisis. Cada presidente tiene su propio estilo."],
  ["GESTIONA LESIONES Y SUPLENTES","Las lesiones reducen la fuerza. Usa suplentes o paga un tratamiento."],
  ["LAS CARTAS CAMBIAN EL PLAN","Compra efectos permanentes o de un uso. La carta correcta importa m\u00e1s que la suerte."]
 ]},
 de:{title:"WIE SPIELT MAN?",subtitle:"6 SCHRITTE IN COPA",close:"Schließen",back:"ZURÜCK ZUM SPIEL",steps:[
  ["FORMATION UND PR\u00c4SIDENT W\u00c4HLEN","Die Formation bestimmt die ben\u00f6tigten Positionen. Der Pr\u00e4sident ver\u00e4ndert Budget, Boni und Schuldenlimit."],
  ["W\u00dcRFELN UND SPIELER W\u00c4HLEN","Jede Position bietet drei Kandidaten. Budget und Chemie entscheiden mit."],
  ["SECHS RUNDEN SPIELEN","Mehr Stärke verbessert die Chancen, garantiert aber keinen Sieg."],
  ["DER PR\u00c4SIDENT GREIFT EIN","Er kann helfen oder eine Krise ausl\u00f6sen. Jeder Pr\u00e4sident spielt anders."],
  ["VERLETZUNGEN UND BANK VERWALTEN","Verletzungen senken die Stärke. Nutze Ersatzspieler oder zahle für Behandlung."],
  ["KARTEN VER\u00c4NDERN DEN PLAN","Kaufe dauerhafte oder einmalige Effekte. Der richtige Moment z\u00e4hlt."]
 ]},
 it:{title:"COME SI GIOCA?",subtitle:"6 PASSI IN COPA",close:"Chiudi",back:"TORNA AL GIOCO",steps:[
  ["SCEGLI MODULO E PRESIDENTE","Il modulo definisce i ruoli necessari. Il presidente modifica budget, bonus e limite debiti."],
  ["LANCIA E SCEGLI I GIOCATORI","Ogni ruolo offre tre candidati. Budget e chimica contano."],
  ["GIOCA SEI TURNI","Pi\u00f9 forza migliora le possibilit\u00e0, ma non garantisce una vittoria."],
  ["IL PRESIDENTE INTERVIENE","Pu\u00f2 aiutare o creare una crisi. Ogni presidente ha il suo stile."],
  ["GESTISCI INFORTUNI E PANCHINA","Gli infortuni riducono la forza. Usa le riserve o paga una cura."],
  ["LE CARTE CAMBIANO IL PIANO","Compra effetti permanenti o monouso. Il momento giusto conta."]
 ]}
};

function _copaText(){return COPA_LOCALE_UI[LANG]||COPA_LOCALE_UI.en;}

function _setCopaText(id,value){
 var node=document.getElementById(id);
 if(node&&value)node.textContent=value;
}

function _setCopaSelectorText(selector,value){
 var node=document.querySelector(selector);
 if(node&&value)node.textContent=value;
}

function _syncCopaLanguageControls(){
 var grid=document.querySelector("#settingsDrop .sdgrid");
 if(!grid)return;
 grid.classList.add("langgrid");
 grid.innerHTML=COPA_LOCALE_BUTTONS.map(function(item){
  var active=item.code===LANG?" on":"";
  return '<button id="lg'+item.code.toUpperCase()+'" class="sdbtn langbtn'+active+'" type="button" onclick="setLang(\''+item.code+'\')" aria-label="'+item.name+'" aria-pressed="'+(item.code===LANG)+'"><img src="assets/flags/'+item.flag+'" alt="" aria-hidden="true"><span>'+item.short+'</span></button>';
 }).join("");
}

function _installCopaHowtoTranslations(){
 if(typeof _HOWTO==="undefined")return;
 ["es","de","it"].forEach(function(locale){
  var translation=COPA_HOWTO_TRANSLATIONS[locale];
  if(!translation)return;
  var base=_cloneLocaleValue(_HOWTO.en||_HOWTO.tr||{});
  base.title=translation.title;
  base.subtitle=translation.subtitle;
  base.close=translation.close;
  base.back=translation.back;
  base.toggle=translation.title;
  if(Array.isArray(base.steps))base.steps=translation.steps.map(function(step){return [step[0],step[1]];});
  _HOWTO[locale]=base;
 });
}

function _applyCopaLocaleUi(){
 var copy=_copaText();
 document.documentElement.lang=LANG;
 document.title=copy.title;
 _setCopaText("sdHdrLang",copy.label);
 _setCopaText("sdHdrA11y",copy.a11y);
 _setCopaText("sdHdrSound",copy.sound);
 _setCopaText("animBtnLbl",copy.anim);
 _setCopaText("muteBtnLbl",copy.audio);
 _setCopaText("countryhdr",copy.country);
 _setCopaText("advancedToggle",copy.advanced);
 var settings=document.getElementById("settingsBtn");
 if(settings){settings.title=copy.settings;settings.setAttribute("aria-label",copy.settings);}
 var anim=document.getElementById("animBtn");
 if(anim){anim.title=copy.reduceMotion;anim.setAttribute("aria-label",copy.reduceMotion);}
 var mute=document.getElementById("muteBtn");
 if(mute){mute.title=copy.soundEffects;mute.setAttribute("aria-label",copy.soundEffects);}
 var tagline=document.querySelector(".v7-tagline");if(tagline)tagline.innerHTML=copy.heroTitle;
 var heroDesc=document.querySelector(".v7-hero-desc");if(heroDesc)heroDesc.textContent=copy.heroDesc;
 _setCopaText("contactIntroLabel",copy.contact);
 _setCopaText("contactIntroText",copy.contactPrompt);
 var footerContact=document.querySelector(".footer-link[onclick*='openContactForm']");
 if(footerContact){var footerIcon=footerContact.querySelector("svg");footerContact.replaceChildren();if(footerIcon)footerContact.appendChild(footerIcon);footerContact.appendChild(document.createTextNode(copy.contact));}
 var ribbon=document.querySelector(".country-new-ribbon");if(ribbon){ribbon.textContent=copy.newLabel;ribbon.setAttribute("aria-label",copy.newLabel);}
 document.documentElement.style.setProperty("--copa-active-effects",JSON.stringify(copy.activeEffects));
 document.documentElement.style.setProperty("--copa-no-events",JSON.stringify(copy.noEvents));
 var guide=document.getElementById("howtoToggle");
 if(guide){
  var icon=guide.querySelector("svg");
  guide.replaceChildren();
  if(icon)guide.appendChild(icon);
  guide.appendChild(document.createTextNode(" "+copy.guide));
  guide.setAttribute("aria-label",copy.guide);
 }
 var music=document.getElementById("musicBtnLbl");
 if(music)music.textContent=copy.music;
 _installCopaHowtoTranslations();
 if(typeof _applyHowtoLang==="function")_applyHowtoLang();
}

function _installCopaHowtoModalRuntime(){
 if(window.__copaHowtoModalRuntimeInstalled||typeof window.openHowtoModal!=="function")return;
 window.__copaHowtoModalRuntimeInstalled=true;
 var originalOpenHowtoModal=window.openHowtoModal;
 window.openHowtoModal=function(){
  originalOpenHowtoModal();
  var translation=COPA_HOWTO_TRANSLATIONS[LANG];
  if(!translation)return;
  window.requestAnimationFrame(function(){
   _setCopaSelectorText(".howto-mhdr-title",translation.title);
   _setCopaSelectorText(".howto-mhdr-sub",translation.subtitle);
   _setCopaSelectorText(".howto-mfoot .btn",translation.back);
   var close=document.querySelector(".howto-mhdr-close");
   if(close)close.setAttribute("aria-label",translation.close);
  });
 };
}

function _installCopaLocaleRuntime(){
 if(window.__copaLocaleRuntimeInstalled)return;
 if(typeof window.setLang!=="function"){
  window.setTimeout(_installCopaLocaleRuntime,0);
  return;
 }
 window.__copaLocaleRuntimeInstalled=true;
 var originalSetLang=window.setLang;
 window.setLang=function(locale){
  var next=COPA_SUPPORTED_LANGS.indexOf(locale)!==-1?locale:"en";
  LANG=next;
  try{localStorage.setItem("copa.language",next);}catch(error){}
  originalSetLang(next);
  _syncCopaLanguageControls();
  _applyCopaLocaleUi();
  if(window.PlayerProfiles&&typeof window.PlayerProfiles.refresh==="function")window.PlayerProfiles.refresh();
 };
 _installCopaHowtoModalRuntime();
 window.setLang(LANG);
}

if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",_installCopaLocaleRuntime,{once:true});
 else _installCopaLocaleRuntime();
}
