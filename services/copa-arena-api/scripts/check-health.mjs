const url=process.argv[2]||"https://arena-api.copa.life/v1/arena/health";
const response=await fetch(url,{headers:{"user-agent":"copa-arena-health/1"}});
const data=await response.json().catch(()=>null);
if(!response.ok||!data||data.ok!==true||data.service!=="copa-arena-api")throw new Error(`Arena health failed: ${response.status}`);
console.log(JSON.stringify(data));
