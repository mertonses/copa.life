import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const OUT=path.join(ROOT,"dist-legal");
const PAGES=["privacy.html","terms.html","takedown.html"];

fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});

for(const file of PAGES){
  const source=fs.readFileSync(path.join(ROOT,file),"utf8")
    .replaceAll('href="index.html"','href="https://copa.life/"');
  fs.writeFileSync(path.join(OUT,file),source,"utf8");
  if(file==="privacy.html")fs.writeFileSync(path.join(OUT,"index.html"),source,"utf8");
}

fs.writeFileSync(path.join(OUT,"_headers"),`/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
`,"utf8");

console.log(`Legal Pages artifact built: ${PAGES.length+2} files`);
