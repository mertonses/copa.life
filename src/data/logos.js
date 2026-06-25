/* Kulüp logosu path haritası. VS bar için büyük, fikstür için küçük. */
var CLUB_LOGOS={
 "Galatasaray":"assets/clubs/Galatasaray.png",
 "Fenerbahçe":"assets/clubs/Fenerbahçe.png",
 "Beşiktaş":"assets/clubs/Beşiktaş.png",
 "Trabzonspor":"assets/clubs/Trabzonspor.png",
 "Başakşehir FK":"assets/clubs/Başakşehir FK.png",
 "Samsunspor":"assets/clubs/Samsunspor.png",
 "Sivasspor":"assets/clubs/Sivasspor.png",
 "Konyaspor":"assets/clubs/Konyaspor.png",
 "Alanyaspor":"assets/clubs/Alanyaspor.png",
 "Kayserispor":"assets/clubs/Kayserispor.png",
 "Antalyaspor":"assets/clubs/Antalyaspor.png",
 "Göztepe":"assets/clubs/Göztepe.png",
 "Kasımpaşa":"assets/clubs/Kasımpaşa.png",
 "Gaziantep FK":"assets/clubs/Gaziantep FK.png",
 "Rizespor":"assets/clubs/Çaykur Rizespor.png",
 "Eyüpspor":"assets/clubs/Eyüpspor.png",
 "Bodrum FK":"assets/clubs/Bodrum FK.png",
 "Hatayspor":"assets/clubs/Hatayspor.png",
 "Adana Demirspor":"assets/clubs/Adana Demirspor.png",
 "Boluspor":"assets/clubs/Boluspor.png",
 "Bandırma FK":"assets/clubs/Bandırmaspor.png",
 "Sakaryaspor":"assets/clubs/Sakaryaspor.png",
 "Erzurumspor FK":"assets/clubs/Erzurumspor FK.png",
 "Manisa FK":"assets/clubs/Manisa FK.png",
 "Ümraniyespor":"assets/clubs/Ümraniyespor.png",
 "Gençlerbirliği":"assets/clubs/Gençlerbirliği.png",
 "Keçiörengücü":"assets/clubs/Ankara Keçiörengücü.png",
 "Çorum FK":"assets/clubs/Çorum FK.png",
 "Pendikspor":"assets/clubs/Pendikspor.png",
 "Kocaelispor":"assets/clubs/Kocaelispor.png",
 "İstanbulspor":"assets/clubs/İstanbulspor.png"
};
var CLUB_LOGOS_SM={};
Object.keys(CLUB_LOGOS).forEach(k=>{CLUB_LOGOS_SM[k]=CLUB_LOGOS[k].replace("assets/clubs/","assets/clubs/small/");});

/* England Premier League + Championship logos */
var CLUB_LOGOS_EN={
 "Arsenal":"assets/clubs/Arsenal.png",
 "Chelsea":"assets/clubs/Chelsea.png",
 "Liverpool":"assets/clubs/Liverpool.png",
 "Manchester City":"assets/clubs/Manchester City.png",
 "Manchester United":"assets/clubs/Manchester United.png",
 "Tottenham Hotspur":"assets/clubs/Tottenham Hotspur.png",
 "Newcastle United":"assets/clubs/Newcastle United.png",
 "Aston Villa":"assets/clubs/Aston Villa.png",
 "West Ham United":"assets/clubs/West Ham United.png",
 "Brighton & Hove Albion":"assets/clubs/Brighton.png",
 "Fulham":"assets/clubs/Fulham.png",
 "Brentford":"assets/clubs/Brentford.png",
 "Crystal Palace":"assets/clubs/Crystal Palace.png",
 "Wolverhampton Wanderers":"assets/clubs/Wolverhampton Wanderers.png",
 "Everton":"assets/clubs/Everton.png",
 "Nottingham Forest":"assets/clubs/Nottingham Forest.png",
 "Burnley":"assets/clubs/Burnley.png",
 "Leeds United":"assets/clubs/Leeds United.png",
 "Sunderland":"assets/clubs/Sunderland.png",
 "AFC Bournemouth":"assets/clubs/Bournemouth.png",
 "Leicester City":"assets/clubs/Leicester City.png",
 "Sheffield United":"assets/clubs/Sheffield United.png",
 "Ipswich Town":"assets/clubs/Ipswich Town.png",
 "Southampton":"assets/clubs/Southampton.png",
 "Coventry City":"assets/clubs/Coventry City.png",
 "Middlesbrough":"assets/clubs/Middlesbrough.png",
 "Watford":"assets/clubs/Watford.png",
 "Norwich City":"assets/clubs/Norwich City.png",
 "West Bromwich Albion":"assets/clubs/West Bromwich Albion.png",
 "Stoke City":"assets/clubs/Stoke City.png",
 "Birmingham City":"assets/clubs/Birmingham City.png",
 "Blackburn Rovers":"assets/clubs/Blackburn Rovers.png",
 "Bristol City":"assets/clubs/Bristol City.png",
 "Hull City":"assets/clubs/Hull City.png",
 "Millwall":"assets/clubs/Millwall.png",
 "Queens Park Rangers":"assets/clubs/Queens Park Rangers.png",
 "Sheffield Wednesday":"assets/clubs/Sheffield Wednesday.png",
 "Swansea City":"assets/clubs/Swansea City.png",
 "Preston North End":"assets/clubs/Preston North End.png",
 "Cardiff City":"assets/clubs/Cardiff City.png"
};
var CLUB_LOGOS_EN_SM={};
Object.keys(CLUB_LOGOS_EN).forEach(k=>{CLUB_LOGOS_EN_SM[k]=CLUB_LOGOS_EN[k].replace("assets/clubs/","assets/clubs/small/");});

/* Spain — La Liga */
var CLUB_LOGOS_ES={
 "Real Madrid C.F.":"assets/clubs/Real Madrid.png",
 "F.C. Barcelona":"assets/clubs/Barcelona.png",
 "Club Atlético de Madrid":"assets/clubs/Atletico Madrid.png",
 "Sevilla F.C.":"assets/clubs/Sevilla.png",
 "Real Betis Balompié":"assets/clubs/Real Betis.png",
 "Villarreal C.F.":"assets/clubs/Villarreal.png",
 "Athletic Club":"assets/clubs/Athletic Bilbao.png",
 "Real Sociedad de Fútbol":"assets/clubs/Real Sociedad.png",
 "Valencia C.F.":"assets/clubs/Valencia.png",
 "Girona F.C.":"assets/clubs/Girona.png",
 "R.C. Celta de Vigo":"assets/clubs/Celta Vigo.png",
 "Getafe C.F.":"assets/clubs/Getafe.png",
 "Club Atlético Osasuna":"assets/clubs/Osasuna.png",
 "Rayo Vallecano de Madrid":"assets/clubs/Rayo Vallecano.png",
 "R.C.D. Mallorca":"assets/clubs/Mallorca.png",
 "Deportivo Alavés":"assets/clubs/Deportivo Alaves.png",
 "R.C.D. Espanyol de Barcelona":"assets/clubs/Espanyol.png",
 "Levante U.D.":"assets/clubs/Levante.png",
 "Elche C.F.":"assets/clubs/Elche.png",
 "Real Oviedo":"assets/clubs/Real Oviedo.png"
};
var CLUB_LOGOS_ES_SM={};
Object.keys(CLUB_LOGOS_ES).forEach(k=>{CLUB_LOGOS_ES_SM[k]=CLUB_LOGOS_ES[k].replace("assets/clubs/","assets/clubs/small/");});

/* Italy — Serie A */
var CLUB_LOGOS_IT={
 "F.C. Internazionale Milano":"assets/clubs/Inter.png",
 "A.C. Milan":"assets/clubs/AC Milan.png",
 "Juventus F.C.":"assets/clubs/Juventus.png",
 "A.S. Roma":"assets/clubs/AS Roma.png",
 "S.S. Lazio":"assets/clubs/Lazio.png",
 "Atalanta Bergamasca Calcio":"assets/clubs/Atalanta.png",
 "S.S.C. Napoli":"assets/clubs/Napoli.png",
 "A.C.F. Fiorentina":"assets/clubs/Fiorentina.png",
 "Bologna F.C. 1909":"assets/clubs/Bologna.png",
 "Torino F.C.":"assets/clubs/Torino.png",
 "Udinese Calcio":"assets/clubs/Udinese.png",
 "Genoa C.F.C.":"assets/clubs/Genoa.png",
 "Cagliari Calcio":"assets/clubs/Cagliari.png",
 "Hellas Verona F.C.":"assets/clubs/Hellas Verona.png",
 "U.S. Lecce":"assets/clubs/Lecce.png",
 "U.S. Sassuolo Calcio":"assets/clubs/Sassuolo.png",
 "U.S. Cremonese":"assets/clubs/Cremonese.png",
 "Parma Calcio 1913":"assets/clubs/Parma.png",
 "Como 1907":"assets/clubs/Como.png",
 "Pisa S.C.":"assets/clubs/Pisa.png"
};
var CLUB_LOGOS_IT_SM={};
Object.keys(CLUB_LOGOS_IT).forEach(k=>{CLUB_LOGOS_IT_SM[k]=CLUB_LOGOS_IT[k].replace("assets/clubs/","assets/clubs/small/");});

/* Germany — Bundesliga + Bundesliga 2 */
var CLUB_LOGOS_DE={
 "FC Bayern München":"assets/clubs/Bayern Munich.png",
 "Borussia Dortmund":"assets/clubs/Borussia Dortmund.png",
 "RasenBallsport Leipzig":"assets/clubs/RB Leipzig.png",
 "Bayer 04 Leverkusen":"assets/clubs/Bayer Leverkusen.png",
 "Eintracht Frankfurt":"assets/clubs/Eintracht Frankfurt.png",
 "1. FC Union Berlin":"assets/clubs/Union Berlin.png",
 "Sport-Club Freiburg":"assets/clubs/SC Freiburg.png",
 "Borussia Mönchengladbach":"assets/clubs/Borussia Monchengladbach.png",
 "VfB Stuttgart":"assets/clubs/VfB Stuttgart.png",
 "VfL Wolfsburg":"assets/clubs/VfL Wolfsburg.png",
 "SV Werder Bremen":"assets/clubs/Werder Bremen.png",
 "TSG 1899 Hoffenheim":"assets/clubs/TSG Hoffenheim.png",
 "1. FSV Mainz 05":"assets/clubs/Mainz 05.png",
 "FC Augsburg":"assets/clubs/FC Augsburg.png",
 "1. FC Heidenheim 1846":"assets/clubs/Heidenheim.png",
 "1. FC Köln":"assets/clubs/FC Koln.png",
 "Hamburger SV":"assets/clubs/Hamburger SV.png",
 "FC St. Pauli":"assets/clubs/FC St Pauli.png"
};
var CLUB_LOGOS_DE_SM={};
Object.keys(CLUB_LOGOS_DE).forEach(k=>{CLUB_LOGOS_DE_SM[k]=CLUB_LOGOS_DE[k].replace("assets/clubs/","assets/clubs/small/");});
