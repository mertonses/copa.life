import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const STORE=path.join(ROOT,"store/android");
const OUTPUT=path.join(ROOT,"outputs/google-play-localizations");
const ALT_TEXT_PATH=path.join(STORE,"asset-alt-text.md");
const LOCALES=[
  {code:"es-ES",label:"Español",listing:"listing-es.md"},
  {code:"de-DE",label:"Deutsch",listing:"listing-de.md"},
  {code:"it-IT",label:"Italiano",listing:"listing-it.md"},
];

function markdownSections(content){
  return content.split(/^##\s+/m).slice(1).map(section=>{
    const [heading,...body]=section.split(/\r?\n/);
    return {heading:heading.trim(),body:body.join("\n").trim()};
  });
}

function characters(value){
  return Array.from(value).length;
}

function copyDirectory(source,target){
  fs.mkdirSync(target,{recursive:true});
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    const sourcePath=path.join(source,entry.name);
    const targetPath=path.join(target,entry.name);
    if(entry.isDirectory())copyDirectory(sourcePath,targetPath);
    else fs.copyFileSync(sourcePath,targetPath);
  }
}

function hashFile(file){
  const data=fs.readFileSync(file);
  return {bytes:data.length,sha256:createHash("sha256").update(data).digest("hex")};
}

const altTextSections=markdownSections(fs.readFileSync(ALT_TEXT_PATH,"utf8"));
fs.rmSync(OUTPUT,{recursive:true,force:true});
fs.mkdirSync(OUTPUT,{recursive:true});

const manifest={
  generatedAt:new Date().toISOString(),
  source:"store/android",
  locales:[],
};

for(const locale of LOCALES){
  const listingPath=path.join(STORE,locale.listing);
  const listingContent=fs.readFileSync(listingPath,"utf8");
  const sections=markdownSections(listingContent);
  const [nameSection,shortSection,fullSection]=sections;
  const fields={
    locale:locale.code,
    appName:nameSection?.body||"",
    shortDescription:shortSection?.body||"",
    fullDescription:fullSection?.body||"",
  };
  fields.characterCounts={
    appName:characters(fields.appName),
    shortDescription:characters(fields.shortDescription),
    fullDescription:characters(fields.fullDescription),
  };

  if(fields.characterCounts.appName>30)throw new Error(`${locale.code}: app name exceeds 30 characters`);
  if(fields.characterCounts.shortDescription>80)throw new Error(`${locale.code}: short description exceeds 80 characters`);
  if(fields.characterCounts.fullDescription>4000)throw new Error(`${locale.code}: full description exceeds 4000 characters`);

  const localeOutput=path.join(OUTPUT,locale.code);
  const graphicsSource=path.join(STORE,"graphics/localized",locale.code);
  fs.mkdirSync(localeOutput,{recursive:true});
  fs.writeFileSync(path.join(localeOutput,"app-name.txt"),`${fields.appName}\n`);
  fs.writeFileSync(path.join(localeOutput,"short-description.txt"),`${fields.shortDescription}\n`);
  fs.writeFileSync(path.join(localeOutput,"full-description.txt"),`${fields.fullDescription}\n`);
  fs.writeFileSync(path.join(localeOutput,"fields.json"),`${JSON.stringify(fields,null,2)}\n`);
  fs.copyFileSync(listingPath,path.join(localeOutput,"listing.md"));
  copyDirectory(graphicsSource,path.join(localeOutput,"graphics"));

  const altText=altTextSections.find(section=>section.heading.includes(locale.code));
  if(!altText)throw new Error(`${locale.code}: localized alt text is missing`);
  fs.writeFileSync(path.join(localeOutput,"alt-text.md"),`# ${altText.heading}\n\n${altText.body}\n`);

  const assets=[];
  for(const relative of [
    "graphics/feature-graphic.jpg",
    ...["01-run-setup.jpg","02-player-draft.jpg","03-group-draw.jpg","04-match-hub.jpg","05-player-profile.jpg"].flatMap(file=>[
      `graphics/phone/${file}`,
      `graphics/tablet/${file}`,
    ]),
  ]){
    const file=path.join(localeOutput,relative);
    if(!fs.existsSync(file))throw new Error(`${locale.code}: missing ${relative}`);
    assets.push({file:relative,...hashFile(file)});
  }

  manifest.locales.push({
    code:locale.code,
    language:locale.label,
    listing:fields.characterCounts,
    assets,
  });
}

const readme=`# Google Play yerelleştirme teslim paketi

Bu paket, varsayılan İngilizce ve mevcut Türkçe girişe ek olarak oyunun desteklediği üç dili içerir.

Her dil klasöründe:

- \`app-name.txt\`, \`short-description.txt\` ve \`full-description.txt\`: Play Console alanlarına doğrudan yapıştırılacak metinler
- \`graphics/feature-graphic.jpg\`: 1024×500 özellik görseli
- \`graphics/phone/\`: beş adet 1080×1920 telefon ekran görüntüsü
- \`graphics/tablet/\`: beş adet 1920×1080 tablet ekran görüntüsü
- \`alt-text.md\`: özellik görseli ve ekran görüntüleri için 140 karakterin altındaki erişilebilirlik metinleri
- \`fields.json\`: metinler ve karakter sayıları

Play Console'da \`Çevirileri yönet > Kendi çevirilerinizi yönetin\` yoluyla sırasıyla \`es-ES\`, \`de-DE\` ve \`it-IT\` girişlerini ekleyin. Her klasördeki metinleri ve görselleri aynı dil girişine yükleyin.
`;

fs.writeFileSync(path.join(OUTPUT,"README.md"),readme);
fs.writeFileSync(path.join(OUTPUT,"manifest.json"),`${JSON.stringify(manifest,null,2)}\n`);
console.log(`Google Play localization packs prepared at ${OUTPUT}`);
