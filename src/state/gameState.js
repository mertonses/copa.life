/* Aktif run durumu: bu dosya tur icindeki degisen oyun verilerini tutar. */
var slots=[],filled=[],picksBySlot=[],remaining=0,currentSlot=-1,budget=BUDGET,currentOpts=[],formName="4-3-3",style="gegen",selectedCountry="TR";
var round=1,cards=[],cardInv={},cardVariant={},shopOffers=[],shopVariants={},bracket=[],fixtures=[],opponent=null,lastResult=null,muted=false,autoPlay=false,kit={bg:"#d6543a",fg:"#fff",sec:"#ffffff"},talkUsed=false,talkMod={all:0,def:0,atk:0},deadlineH=24,oppXI=[],motm=null,runEnded=false;
var injuredIdx=-1,oppLineup=[],weakFlank="C",matchupBonus=0,autoTimer=null,undoData=null,undoUsed=false,lastMatchEvents=[],lastSackReason="";
var teamName="",feed=[],riskPowerMod=0,finalPenalty=0,eventSeen={},draftRerollUsed=false;
var bench=[],benchUsed=0,tempPrime=0,tempPrimePenalty=0,shortCamp=0,shortCampPenalty=0,installmentTurns=0,quietCamp=0,lastCreditActive=0,econStats={earned:0,injuries:0,president:0,finalDebt:0,spent:0,worstDebt:0,bestCard:"",bestCardValue:0,worstPresident:""};
var loanPlayer=null;
var legacyFund=0;
var pintiSavings=0,sansSpotlightIdx=-1,sansMediaPressure=0,torpilDebtPenalty=0,chairTrust=1,kaosHalfReward=false;
var NAMEP=["Anadolu","Demir","Yıldız","Kartal","Şimşek","Bordo","Gençlik","Deniz","Ankara","Toros","Çelik","Boğaz"],NAMES2=["spor","gücü FK","SK","Birliği","FK","United"];

var nativeRandom=Math.random,runRng=nativeRandom;function rand(){return runRng();}
