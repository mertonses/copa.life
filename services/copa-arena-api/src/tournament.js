const VALID_SIZES=new Set([4,8]);

export const TOURNAMENT_LOBBY_MS=30*60_000;
export const TOURNAMENT_LIFETIME_MS=4*60*60_000;

const safeNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const participantPublic=player=>({
  slot:Number(player.slot),clubName:String(player.clubName||""),rating:Math.round(safeNumber(player.rating)),
  eliminated:!!player.eliminated,place:Number(player.place)||null
});

export function validTournamentSize(value){return VALID_SIZES.has(Number(value));}

export function createTournamentState(code,size,host,now=Date.now()){
  if(!validTournamentSize(size))throw new Error("invalid_tournament_size");
  return {
    code:String(code),size:Number(size),hostOwner:host.owner,status:"waiting",round:0,
    participants:[{...host,slot:1,joinedAt:now,eliminated:false,place:null}],rounds:[],assignments:{},
    champion:null,advancing:false,createdAt:now,expiresAt:now+TOURNAMENT_LOBBY_MS,hardExpiresAt:now+TOURNAMENT_LIFETIME_MS
  };
}

export function addTournamentParticipant(state,player,now=Date.now()){
  if(!state||state.status!=="waiting")return {ok:false,reason:"tournament_started"};
  if(now>=Number(state.expiresAt||0))return {ok:false,reason:"room_expired"};
  if(state.participants.some(item=>item.owner===player.owner))return {ok:false,reason:"already_joined"};
  if(state.participants.length>=state.size)return {ok:false,reason:"room_full"};
  const joined={...player,slot:state.participants.length+1,joinedAt:now,eliminated:false,place:null};
  state.participants.push(joined);
  return {ok:true,participant:joined,full:state.participants.length===state.size};
}

export function roundPairs(owners){
  if(!Array.isArray(owners)||owners.length<2||owners.length%2!==0)throw new Error("invalid_round_entrants");
  const pairs=[];for(let index=0;index<owners.length;index+=2)pairs.push([owners[index],owners[index+1]]);
  return pairs;
}

export function tournamentPublicState(state,owner){
  if(!state)return null;
  const participant=state.participants.find(item=>item.owner===owner);if(!participant)return null;
  const assignment=state.assignments&&state.assignments[owner];
  const rounds=(state.rounds||[]).map(round=>({
    number:round.number,
    matches:round.matches.map(match=>({
      matchId:match.matchId,status:match.status,winnerSlot:match.winnerOwner?state.participants.find(item=>item.owner===match.winnerOwner)?.slot||null:null,
      score:Array.isArray(match.score)?match.score:null,
      players:match.players.map(playerOwner=>{
        const player=state.participants.find(item=>item.owner===playerOwner);return player?participantPublic(player):null;
      }).filter(Boolean)
    }))
  }));
  return {
    code:state.code,size:state.size,status:state.status,round:state.round,joined:state.participants.length,
    expiresAt:new Date(Number(state.expiresAt)).toISOString(),hardExpiresAt:new Date(Number(state.hardExpiresAt)).toISOString(),
    self:participantPublic(participant),host:state.hostOwner===owner,participants:state.participants.map(participantPublic),rounds,
    eliminated:!!participant.eliminated,championSlot:state.champion?state.participants.find(item=>item.owner===state.champion)?.slot||null:null,
    champion:state.champion===owner,
    directMatch:assignment&&assignment.status==="ready"?{matchId:assignment.matchId,roomToken:assignment.roomToken,round:assignment.round}:null
  };
}
