import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {LEADERS,TECHS,CARDS,RULES_REVISION,createGame,act,active,aiAction,aiBattleAction,gameAudit,HARD_BOT_VERSION} from './engine.mjs';

export class RoomError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const requireThat=(condition,message,status=400)=>{if(!condition)throw new RoomError(message,status);};
const hash=token=>createHash('sha256').update(token).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const validLeader=id=>LEADERS.some(l=>l.id===id);
const name=value=>{requireThat(typeof value==='string'&&value.trim().length>0&&value.trim().length<=24,'Enter a name of 1–24 characters.');return value.trim();};
const clone=value=>structuredClone(value);

// A single server owns each match. Synchronous SQLite commits happen before an
// accepted command becomes visible, including its deduplication receipt.
export class RoomService {
 constructor({filename='data/tribes.sqlite',botDelay=350,seedSource=()=>randomBytes(4).readUInt32LE()}={}){
  if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
  this.db=new DatabaseSync(filename);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, body TEXT NOT NULL)');
  this.rooms=new Map(this.db.prepare('SELECT code,body FROM rooms').all().map(r=>[r.code,JSON.parse(r.body)]));
  this.saveStatement=this.db.prepare('INSERT INTO rooms(code,body) VALUES(?,?) ON CONFLICT(code) DO UPDATE SET body=excluded.body');
  this.timers=new Map();this.seen=new Map();this.botDelay=botDelay;this.seedSource=seedSource;
  for(const room of this.rooms.values())this.schedule(room.code);
 }
 close(){for(const timer of this.timers.values())clearTimeout(timer);this.timers.clear();this.db.close();}
 persist(room){this.saveStatement.run(room.code,JSON.stringify(room));this.rooms.set(room.code,room);}
 room(code){const room=this.rooms.get(String(code).toUpperCase());requireThat(room,'Room not found. Check the invite code.',404);return room;}
 authenticate(room,secret){requireThat(typeof secret==='string'&&secret.length>=32&&secret.length<=100,'Rejoin this room from the browser that holds your seat.',401);const seat=room.seats.find(s=>!s.bot&&s.tokenHash===hash(secret));requireThat(seat,'This browser does not own a seat in this room.',401);this.seen.set(room.code+':'+seat.id,Date.now());return seat;}
 create(input){
  requireThat(this.rooms.size<1000,'This server has reached its room limit.',503);
  requireThat(validLeader(input.leader),'Choose a valid leader.');
  const secret=token();let code;do{code=randomBytes(5).toString('hex').toUpperCase();}while(this.rooms.has(code));
  const room={code,revision:1,createdAt:new Date().toISOString(),rulesRevision:RULES_REVISION,host:0,nextSeat:1,seats:[{id:0,name:name(input.name),leader:input.leader,bot:false,ready:false,tokenHash:hash(secret)}],game:null,receipts:[]};
  this.persist(room);return {token:secret,...this.view(code,secret)};
 }
 join(code,input){
  const old=this.room(code);requireThat(!old.game,'This game has started. Use your saved seat to reconnect.');requireThat(old.seats.length<4,'This room is full.');
  requireThat(validLeader(input.leader)&&!old.seats.some(s=>s.leader===input.leader),'That leader is already taken. Choose another.');
  const secret=token(),room=clone(old);room.seats.push({id:room.nextSeat++,name:name(input.name),leader:input.leader,bot:false,ready:false,tokenHash:hash(secret)});room.revision++;this.persist(room);return {token:secret,...this.view(code,secret)};
 }
 publicGame(game,playerId){
  if(!game)return null;
  const result={};
  for(const key of ['version','ruleset','rulesRevision','phase','turn','turnIndex','round','order','log','battle','result','difficulty','winner','victory'])if(game[key]!==undefined)result[key]=clone(game[key]);
  result.players=game.players.map(p=>({...clone(p),human:p.id===playerId,controller:p.human?'human':'bot',cardCount:p.cards.length,cards:p.id===playerId?[...p.cards]:[]}));
  result.tiles=game.tiles.map(t=>{const {tileId,yield:tileYield,...publicTile}=t;return {...publicTile,...(t.revealed?{yield:clone(tileYield)}:{})};});
  // Only counts, never the deck order, RNG state, or the complete audit.
  result.deck={length:game.deck.length};result.discard={length:game.discard.length};
  return result;
 }
 view(code,secret){
  const room=this.room(code),seat=this.authenticate(room,secret),playerId=room.seats.findIndex(s=>s.id===seat.id);
  return {code:room.code,revision:room.revision,you:seat.id,playerId,host:room.host,createdAt:room.createdAt,rulesRevision:room.rulesRevision,compatible:room.rulesRevision===RULES_REVISION,
   seats:room.seats.map(({tokenHash,...s})=>({...s,online:s.bot||Date.now()-(this.seen.get(room.code+':'+s.id)||0)<15000})),game:this.publicGame(room.game,playerId)};
 }
 audit(code,secret){const room=this.room(code);this.authenticate(room,secret);requireThat(room.game?.phase==='won','Full audits unlock when the match ends so hidden information stays private.',403);return {...gameAudit(room.game),multiplayer:{room:room.code,seats:room.seats.map(({tokenHash,...s})=>s)}};}
 command(code,secret,input){
  const old=this.room(code),seat=this.authenticate(old,secret);
  requireThat(old.rulesRevision===RULES_REVISION,'This match uses a different rules revision. Restore the matching server version to resume.',409);
  requireThat(typeof input.requestId==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(input.requestId),'Invalid command identifier.');
  if(old.receipts.some(r=>r.id===input.requestId&&r.seat===seat.id))return this.view(code,secret);
  requireThat(Number.isInteger(input.revision)&&input.revision===old.revision,'The room changed. Review the updated board and try again.',409);
  const room=clone(old),own=room.seats.find(s=>s.id===seat.id),host=seat.id===room.host;
  if(input.type==='action'){
   requireThat(room.game,'Start the match first.');const playerId=room.seats.findIndex(s=>s.id===seat.id);
   const action=this.validateAction(room.game,playerId,input.action);
   const result=act(room.game,action);requireThat(result.ok,result.message);
   this.resolveIfReady(room.game);
  }else{
   requireThat(!room.game,'Lobby settings are locked once the match starts.');
   if(input.type==='ready'){requireThat(typeof input.ready==='boolean','Choose ready or not ready.');own.ready=input.ready;}
   else if(input.type==='leader'){requireThat(validLeader(input.leader)&&!room.seats.some(s=>s.id!==own.id&&s.leader===input.leader),'That leader is unavailable.');own.leader=input.leader;own.ready=false;}
   else if(input.type==='addBot'){requireThat(host,'Only the host can add bots.',403);requireThat(room.seats.length<4,'This room is full.');requireThat(validLeader(input.leader)&&!room.seats.some(s=>s.leader===input.leader),'That leader is unavailable.');room.seats.push({id:room.nextSeat++,name:'Hard bot',leader:input.leader,bot:true,ready:true});}
   else if(input.type==='remove'){requireThat(host,'Only the host can remove seats.',403);requireThat(input.seat!==room.host&&room.seats.some(s=>s.id===input.seat),'Choose another seat.');room.seats=room.seats.filter(s=>s.id!==input.seat);}
   else if(input.type==='start'){requireThat(host,'Only the host can start.',403);requireThat(room.seats.length>=2&&room.seats.every(s=>s.ready),'At least two seats and every human ready are required.');room.game=createGame({seats:room.seats,difficulty:'hard',seed:this.seedSource()});}
   else throw new RoomError('Unknown lobby command.');
  }
  room.revision++;room.receipts.push({id:input.requestId,seat:seat.id});room.receipts=room.receipts.slice(-256);this.persist(room);this.schedule(code);return this.view(code,secret);
 }
 validateAction(game,id,a){
  requireThat(a&&typeof a==='object'&&!Array.isArray(a),'Choose an action.');requireThat(game.phase!=='won','This match has ended.');
  const battleActions=['battleOffer','battleReady'];
  if(game.phase==='battle')requireThat(battleActions.includes(a.type)&&[game.battle.attacker,game.battle.defender].includes(id),'Only the battling players may respond.',403);
  else requireThat(active(game).id===id,'Wait for your turn.',403);
  const fields={place:['tile'],move:['tile'],build:[],attack:[],city:[],rest:[],end:[],buyCard:[],research:['tech'],teleport:['tile'],tribute:['tiles'],card:['card','tile','player','tech'],battleOffer:['player','population'],battleReady:['player','turtle']};
  requireThat(Object.hasOwn(fields,a.type),'Unknown action.');
  requireThat(Object.keys(a).every(k=>k==='type'||fields[a.type].includes(k)),'Unexpected action fields.');
  requireThat(game.phase!=='draft'||a.type==='place','Choose your landing first.');
  requireThat(game.phase!=='playing'||!battleActions.includes(a.type),'There is no battle to confirm.');
  const clean={type:a.type};for(const field of fields[a.type])if(a[field]!==undefined)clean[field]=a[field];
  if(['place','move','teleport'].includes(a.type)||('tile' in clean))requireThat(Number.isInteger(a.tile)&&a.tile>=0&&a.tile<24,'Choose a valid tile.');
  if(a.type==='research'||'tech' in clean)requireThat(TECHS.some(t=>t.id===a.tech),'Choose a valid technology.');
  if(a.type==='card')requireThat(Object.hasOwn(CARDS,a.card),'Choose a valid spirit card.');
  if('player' in clean)requireThat(Number.isInteger(a.player)&&a.player>=0&&a.player<game.players.length,'Choose a valid player.');
  if(a.type==='tribute')requireThat(Array.isArray(a.tiles)&&a.tiles.length>=1&&a.tiles.length<=2&&a.tiles.every(t=>Number.isInteger(t)&&t>=0&&t<24),'Choose one or two settlement tiles.');
  if(battleActions.includes(a.type)){requireThat(a.player===undefined||a.player===id,'You may only commit your own population.',403);clean.player=id;}
  if(a.type==='battleOffer')requireThat(Number.isInteger(a.population)&&a.population>=0&&a.population<=game.players[id].pop&&a.population%2===0,'Commit affordable population in steps of two.');
  if('turtle' in clean)requireThat(typeof a.turtle==='boolean','Invalid Guardian Turtle choice.');
  return clean;
 }
 resolveIfReady(game){if(game.phase==='battle'&&[game.battle.attacker,game.battle.defender].every(id=>game.battle.ready[id])){const result=act(game,{type:'resolve'});if(!result.ok)throw new Error(result.message);}}
 needsBot(room){const s=room.game;if(!s||s.phase==='won'||room.rulesRevision!==RULES_REVISION)return false;return s.phase==='battle'?[s.battle.attacker,s.battle.defender].some(id=>!s.players[id].human&&!s.battle.ready[id]):!active(s).human;}
 schedule(code){code=code.toUpperCase();if(this.timers.has(code)||!this.needsBot(this.rooms.get(code)))return;const timer=setTimeout(()=>{this.timers.delete(code);try{this.botStep(code);}catch(error){console.error('Bot step failed in room',code,error.message);}},this.botDelay);timer.unref?.();this.timers.set(code,timer);}
 botStep(code){
  const old=this.room(code);if(!this.needsBot(old))return;
  const room=clone(old),s=room.game;
  const action=s.phase==='battle'?aiBattleAction(s,[s.battle.attacker,s.battle.defender].find(id=>!s.players[id].human&&!s.battle.ready[id])):aiAction(s);
  requireThat(action,'Bot could not choose an action.',500);const result=act(s,{...action,botPolicy:HARD_BOT_VERSION});requireThat(result.ok,result.message,500);this.resolveIfReady(s);
  room.revision++;this.persist(room);this.schedule(code);
 }
}

export function roomAPI(service){
 const limits=new Map();
 const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/'))return false;
  try{
   requireThat(!req.headers.origin||req.headers.origin===`http://${req.headers.host}`||req.headers.origin===`https://${req.headers.host}`,'Cross-site requests are not allowed.',403);
   const ip=req.socket.remoteAddress,now=Date.now();let rate=limits.get(ip);if(!rate||now-rate.at>60000){rate={at:now,count:0};limits.set(ip,rate);}requireThat(++rate.count<=600,'Too many requests. Please wait a minute.',429);
   if(limits.size>2000)for(const [key,r] of limits)if(now-r.at>60000)limits.delete(key);
   const secret=req.headers.authorization?.replace(/^Bearer /,'');
   let body={};if(req.method==='POST'){
    requireThat(req.headers['content-type']?.startsWith('application/json'),'Send JSON commands.',415);
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;requireThat(size<=8192,'Command too large.',413);chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new RoomError('Invalid JSON.');}
    requireThat(body&&typeof body==='object'&&!Array.isArray(body),'Invalid command.');
   }
   if(url.pathname==='/api/rooms'&&req.method==='POST'){send(res,201,service.create(body));return true;}
   const match=url.pathname.match(/^\/api\/rooms\/([A-Fa-f0-9]{10})(?:\/(join|command|audit))?$/);requireThat(match,'Endpoint not found.',404);
   const [,code,operation]=match;
   if(req.method==='POST'&&operation==='join')send(res,200,service.join(code,body));
   else if(req.method==='POST'&&operation==='command')send(res,200,service.command(code,secret,body));
   else if(req.method==='GET'&&operation==='audit')send(res,200,service.audit(code,secret));
   else if(req.method==='GET'&&!operation)send(res,200,service.view(code,secret));
   else throw new RoomError('Method not allowed.',405);
  }catch(error){send(res,error.status||500,{error:error.status?error.message:'Server could not save this action. Please retry.'});if(!error.status)console.error(error);}
  return true;
 };
}
