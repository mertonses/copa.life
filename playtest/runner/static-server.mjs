import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".wav":"audio/wav"};
const server=http.createServer((request,response)=>{
  const url=new URL(request.url||"/","http://localhost"),relative=decodeURIComponent(url.pathname)==="/"?"index.html":decodeURIComponent(url.pathname).replace(/^\/+/,"");
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){response.writeHead(404);response.end("Not found");return;}
  response.writeHead(200,{"content-type":types[path.extname(target).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});fs.createReadStream(target).pipe(response);
});
server.listen(5500,"127.0.0.1",()=>console.log("copa test server: http://127.0.0.1:5500"));
const shutdown=()=>{
  server.close(()=>process.exit(0));
  if(typeof server.closeAllConnections==="function")server.closeAllConnections();
  setTimeout(()=>process.exit(0),1000).unref();
};
process.once("SIGINT",shutdown);
process.once("SIGTERM",shutdown);
