const target=process.argv[2]||"https://copa-life-ghost-clubs.mertonses-copa.workers.dev/v1/health";
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
try{
  const response=await fetch(target,{headers:{accept:"application/json"},signal:controller.signal});
  const body=await response.json().catch(()=>null);
  if(!response.ok||!body||body.ok!==true||body.service!=="ghost-club-api")throw new Error(`health check failed: HTTP ${response.status}`);
  console.log(JSON.stringify({status:"ok",target,service:body.service,schema_version:body.schema_version}));
}finally{clearTimeout(timer);}
