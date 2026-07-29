const api=(process.env.COPA_ARENA_API||"https://copa-life-arena.mertonses-copa.workers.dev").replace(/\/$/,"");
const wsApi=api.replace(/^http/,"ws");
const stamp=Date.now().toString(36).toUpperCase();
const identities=[0,1].map(index=>({
  client:`GCL-SMOKE${index}${stamp}`.slice(0,40),
  token:`CAR-SMOKE${index}${stamp}`.padEnd(28,"A"),
  clubName:`Arena QA ${stamp.slice(-5)} ${index+1}`
}));
const headers=id=>({"content-type":"application/json","x-copa-client":id.client,"x-copa-arena-token":id.token});
const request=async(id,path,options={})=>{
  const response=await fetch(api+path,{...options,headers:{...headers(id),...(options.headers||{})}});
  const data=response.status===204?null:await response.json();
  if(!response.ok)throw new Error(`${path}:${response.status}:${JSON.stringify(data)}`);
  return data;
};
const timeout=(label,ms=45_000)=>new Promise((_,reject)=>setTimeout(()=>reject(new Error(`timeout:${label}`)),ms));
const waitEvent=(socket,type)=>Promise.race([
  new Promise((resolve,reject)=>{
    const onMessage=event=>{const data=JSON.parse(event.data);if(data.type===type){socket.removeEventListener("message",onMessage);resolve(data);}};
    socket.addEventListener("message",onMessage);socket.addEventListener("error",()=>reject(new Error(`socket:${type}`)),{once:true});
  }),
  timeout(type)
]);
class RoomPeer{
  constructor(url){this.socket=new WebSocket(url);this.state=null;this.waiters=[];this.messages=[];this.socket.addEventListener("message",event=>{const data=JSON.parse(event.data);this.messages.push(data);if(data.type!=="state")return;this.state=data.state;this.flush();});}
  flush(){this.waiters=[...this.waiters].filter(item=>{if(!item.predicate(this.state))return true;item.resolve(this.state);return false;});}
  wait(predicate,label){if(this.state&&predicate(this.state))return Promise.resolve(this.state);return Promise.race([new Promise(resolve=>this.waiters.push({predicate,resolve})),timeout(label)]);}
  send(type,choice){this.socket.send(JSON.stringify({type,choice,actionId:`AA-${crypto.randomUUID().replaceAll("-","")}`}));}
}

const sessions=await Promise.all(identities.map(id=>request(id,"/v1/arena/session",{method:"POST",body:JSON.stringify({clubName:id.clubName,mode:"ranked",region:"weur"})})));
const queues=sessions.map(session=>new WebSocket(`${wsApi}/v1/arena/connect?ticket=${encodeURIComponent(session.ticket)}`));
const matches=await Promise.all(queues.map(socket=>waitEvent(socket,"matched")));
if(matches[0].matchId!==matches[1].matchId)throw new Error("match_ids_differ");
queues.forEach(socket=>socket.close(1000,"matched"));
const peers=matches.map(match=>new RoomPeer(`${wsApi}/v1/arena/rooms/${match.matchId}/connect?token=${encodeURIComponent(match.roomToken)}`));
await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="lobby","lobby")));
peers.forEach(peer=>peer.send("ready"));
await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="setup","setup"))).catch(error=>{
  console.error(JSON.stringify(peers.map(peer=>peer.messages.slice(-6))));
  throw error;
});
peers.forEach(peer=>peer.send("setup",{formation:"4-4-2",style:"balanced"}));
for(let step=0;step<11;step++){
  await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="draft"&&state.draftStep===step,`draft-${step}`)));
  if(peers.some(peer=>peer.state.self.setup.chairman!=="babacan"))throw new Error("chairman_not_babacan");
  peers.forEach(peer=>peer.send("draft",[...peer.state.offers].sort((a,b)=>a.cost-b.cost)[0].id));
}
await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="market","market")));
if(peers.some(peer=>peer.state.self.draft.length!==11||peer.state.draftStatus.total!==11))throw new Error("starting_xi_not_complete");
peers.forEach(peer=>peer.send("market",peer.state.offers.find(item=>item.id==="none").id));
await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="training","training")));
peers.forEach(peer=>peer.send("training","chemistry"));
for(let window=0;window<4;window++){
  await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="live"&&state.window===window,`live-${window}`)));
  peers.forEach(peer=>peer.send("tactic",window%2?"counter":"press"));
}
let previousPenaltyKick=-1;
for(let attempt=0;attempt<30&&!peers.every(peer=>peer.state&&peer.state.phase==="result");attempt++){
  const states=await Promise.all(peers.map(peer=>peer.wait(
    state=>state.phase==="result"||(state.phase==="penalty"&&state.penalty&&state.penalty.stage==="choice"&&state.penalty.kick>previousPenaltyKick),
    `result-or-penalty-${attempt}`
  )));
  if(states.every(state=>state.phase==="result"))break;
  if(states.some(state=>state.phase!=="penalty"||!state.penalty||state.penalty.stage!=="choice"))throw new Error("penalty_state_mismatch");
  previousPenaltyKick=states[0].penalty.kick;
  const zones=["leftHigh","rightLow","center","rightHigh","leftLow"];
  peers.forEach((peer,index)=>peer.send("penalty",zones[(previousPenaltyKick+index)%zones.length]));
}
const results=await Promise.all(peers.map(peer=>peer.wait(state=>state.phase==="result","result")));
if(results.some(state=>!state.result||!Array.isArray(state.result.outcomes)))throw new Error("missing_result");
const profiles=await Promise.all(identities.map(id=>request(id,"/v1/arena/profile")));
if(profiles.some(value=>value.profile.wins+value.profile.draws+value.profile.losses!==1))throw new Error("profile_not_recorded");
await Promise.all(identities.map(id=>request(id,"/v1/arena/profile",{method:"DELETE"})));
peers.forEach(peer=>peer.socket.close(1000,"complete"));
console.log(JSON.stringify({ok:true,matchId:matches[0].matchId,score:results[0].result.score,ratings:profiles.map(value=>value.profile.rating)}));
