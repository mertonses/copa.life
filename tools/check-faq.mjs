import fs from "node:fs";

const failures=[];
const read=file=>fs.readFileSync(file,"utf8");
const index=read("index.html");
const page=read("faq.html");
const runtime=read("src/ui/faq.js");
const styles=read("src/styles/faq.css");
const pagesBuild=read("tools/build-pages.mjs");
const nativeBuild=read("tools/build-native-package.mjs");
const fail=message=>failures.push(message);

for(const marker of ['id="footerFaqBtn"','onclick="openFaq()"',"src/ui/faq.js","src/styles/faq.css"]){
  if(!index.includes(marker))fail(`index is missing ${marker}`);
}
for(const marker of ['rel="canonical"','"@type":"FAQPage"','id="faqPage"',"src/ui/faq.js","src/styles/faq.css"]){
  if(!page.includes(marker))fail(`faq page is missing ${marker}`);
}
for(const language of ["tr","en","es","de","it"]){
  if(!runtime.includes(`${language}:{`))fail(`FAQ runtime is missing ${language}`);
}
for(const id of ["free","run","trust","dark","save","ratings"]){
  if(!runtime.includes(`"${id}"`))fail(`quick FAQ is missing ${id}`);
}
if(!styles.includes("@media(max-width:640px)"))fail("FAQ mobile layout is missing");
if(!styles.includes("prefers-reduced-motion"))fail("FAQ reduced-motion contract is missing");
if(!pagesBuild.includes('"faq.html"'))fail("web build does not package faq.html");
if(!nativeBuild.includes('"faq.html"'))fail("native build does not package faq.html");

if(failures.length){
  failures.forEach(message=>console.error(`[faq] ${message}`));
  process.exit(1);
}
console.log("[faq] modal, page, five locales, accessibility and package checks passed");
