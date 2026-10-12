import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readdirSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {RoomService} from './multiplayer-server.mjs';
import {createTribesServer} from './server.mjs';
import {active,aiAction,aiBattleAction,LEADERS,RULES_REVISION} from './engine.mjs';

const fresh=t=>{let seed=41001;const s=new RoomService({filename:':memory:',botDelay:1e8,seedSource:()=>seed++});t.after(()=>s.close());return s;};
const command=(s,user,body,extra={})=>s.command(user.code,user.token,{revision:s.room(user.code).revision,requestId:randomUUID(),...body,...extra});
function setup(s,leaders=['ku','daikotei']){
 const host=s.create({name:'Brett',leader:leaders[0]}),users=[host,...leaders.slice(1).map((leader,i)=>s.join(host.code,{name:'Friend '+(i+1),leader}))];
 for(const u of users)command(s,u,{type:'ready',ready:true});command(s,host,{type:'start'});return users;
}
function land(s,users){while(s.room(users[0].code).game.phase==='draft'){const g=s.room(users[0].code).game;command(s,users[active(g).id],{type:'action',action:{type:'place',tile:active(g).id}});}}
const err=(fn,pattern)=>assert.throws(fn,pattern);

test('private lobby enforces seats, unique leaders, host rights, and readiness',t=>{
 const s=fresh(t),h=s.create({name:'Host',leader:'ku'}),b=s.join(h.code,{name:'Friend',leader:'hecatl'});
 err(()=>s.join(h.code,{name:'Duplicate',leader:'ku'}),/taken/);
 err(()=>command(s,b,{type:'addBot',leader:'tao'}),/host/);
 err(()=>command(s,h,{type:'start'}),/ready/);
 command(s,h,{type:'addBot',leader:'tao'});command(s,h,{type:'addBot',leader:'herysi'});
 err(()=>s.join(h.code,{name:'Fifth',leader:'asinya'}),/full/);
 command(s,h,{type:'ready',ready:true});command(s,b,{type:'ready',ready:true});command(s,b,{type:'leader',leader:'daikotei'});
 err(()=>command(s,h,{type:'start'}),/ready/);command(s,b,{type:'ready',ready:true});command(s,h,{type:'start'});
 assert.equal(s.room(h.code).game.players.filter(p=>p.human).length,2);
 err(()=>s.join(h.code,{name:'Late',leader:'asinya'}),/started/);err(()=>command(s,h,{type:'remove',seat:1}),/locked/);
});

test('all approved leader starts and human identities enter the initial audit',t=>{
 const s=fresh(t);
 for(const l of LEADERS){const users=setup(s,[l.id,l.id==='ku'?'tao':'ku']),g=s.room(users[0].code).game,p=g.players[0];assert.equal(p.pop,l.pop);assert.equal(p.kn,l.kn);assert.equal(p.cards.length,l.cards||0);assert.deepEqual(p.techs,l.tech?[l.tech]:[]);assert.equal(p.name,'Brett');assert.equal(g.audit.initialState.players[1].human,true);assert.equal(g.rulesRevision,RULES_REVISION);}
});

test('seat authentication, turn authorization, and malformed commands cannot mutate the match',t=>{
 const s=fresh(t),u=setup(s);land(s,u);const g=s.room(u[0].code).game,id=active(g).id,me=u[id],other=u[1-id];
 const before=JSON.stringify(s.room(me.code));
 err(()=>s.view(me.code,'x'.repeat(43)),/own a seat/);
 err(()=>command(s,other,{type:'action',action:{type:'rest'}}),/turn/);
 for(const action of [{type:'resolve'},{type:'move',tile:'0'},{type:'tribute',tiles:{}},{type:'rest',pop:100},{type:'research',tech:'__proto__'},{type:'battleReady',player:id},{type:'card',card:'__proto__'}])err(()=>command(s,me,{type:'action',action}),/action|tile|settlement|technology|battle|card/i);
 assert.equal(JSON.stringify(s.room(me.code)),before);
});

test('private views conceal rival hands, seed, deck order, tile identity and full audits',t=>{
 const s=fresh(t),u=setup(s,['ku','daikotei']),v=s.view(u[0].code,u[0].token),g=v.game;
 assert.equal(g.players[1].cards.length,0);assert.equal(g.players[1].cardCount,2);assert.equal(s.view(u[1].code,u[1].token).game.players[1].cards.length,2);
 for(const key of ['seed','audit','rngState'])assert.equal(key in g,false);
 assert.deepEqual(Object.keys(g.deck),['length']);assert(g.tiles.every(t=>!('yield' in t)&&!('tileId' in t)));
 assert(!JSON.stringify(v).includes('tokenHash'));assert(!JSON.stringify(v).includes(u[1].token));
 assert.equal(g.players[0].human,true);assert.equal(g.players[1].human,false);assert.equal(g.players[1].controller,'human');
 err(()=>s.audit(u[0].code,u[0].token),/unlock/);
 land(s,u);const full=s.room(u[0].code).game,who=active(full).id;full.players[who].pop=99;command(s,u[who],{type:'action',action:{type:'build'}});
 const tile=s.view(u[0].code,u[0].token).game.tiles[who];assert(tile.yield);assert.equal('tileId' in tile,false);
});

test('duplicate commands are charged once and stale commands cannot overwrite newer turns',t=>{
 const s=fresh(t),u=setup(s);land(s,u);const room=s.room(u[0].code),who=active(room.game).id,p=room.game.players[who],pop=p.pop,events=room.game.audit.events.length;
 const input={type:'action',action:{type:'rest'},revision:room.revision,requestId:randomUUID()};
 s.command(u[who].code,u[who].token,input);s.command(u[who].code,u[who].token,input);
 assert.equal(s.room(room.code).game.players[who].pop,pop+1);assert.equal(s.room(room.code).game.audit.events.length,events+1);
 err(()=>s.command(room.code,u[who].token,{...input,requestId:randomUUID(),action:{type:'end'}}),/changed/);
});

function battleFixture(s,u){land(s,u);const r=s.room(u[0].code),g=r.game;g.turnIndex=g.order.indexOf(0);g.players[0].pos=0;g.players[0].ap=2;g.players[0].pop=20;g.players[1].pop=20;g.players[1].cards=['turtle'];g.tiles[0].owner=1;g.tiles[0].revealed=true;command(s,u[0],{type:'action',action:{type:'attack'}});}
test('human combat commitments are public, own-seat only, reset confirmations, and resolve server-side',t=>{
 const s=fresh(t),u=setup(s);battleFixture(s,u);
 const action=(id,a)=>command(s,u[id],{type:'action',action:a});
 err(()=>action(0,{type:'battleOffer',player:1,population:4}),/own population/);
 action(0,{type:'battleOffer',population:4});action(0,{type:'battleReady'});
 action(1,{type:'battleOffer',population:2});let b=s.view(u[0].code,u[0].token).game.battle;assert.equal(b.offers[1],2);assert.equal(b.ready[0],false);
 action(0,{type:'battleReady'});action(1,{type:'battleReady',turtle:true});
 const g=s.room(u[0].code).game;assert.equal(g.phase,'playing');assert.equal(g.players[0].pop,16);assert.equal(g.players[1].pop,18);assert.equal(g.result.turtle,true);assert.equal(g.tiles[0].owner,1);
 assert.equal(g.audit.events.filter(e=>e.type==='combat_result').length,1);
});

test('uninvolved humans cannot alter combat and bots wait for human confirmation',t=>{
 const s=fresh(t),u=setup(s,['ku','daikotei','tao']);battleFixture(s,u);
 err(()=>command(s,u[2],{type:'action',action:{type:'battleReady'}}),/battling/);
 const r=s.room(u[0].code);r.game.players[1].human=false;
 s.botStep(r.code);assert.equal(s.room(r.code).game.phase,'battle');assert.equal(s.room(r.code).game.battle.ready[1],true);
 command(s,u[0],{type:'action',action:{type:'battleReady'}});assert.equal(s.room(r.code).game.phase,'playing');
});

test('Science remains immediate at 40 and only participants can export completed audits',t=>{
 const s=fresh(t),u=setup(s);land(s,u);const g=s.room(u[0].code).game,who=active(g).id;g.players[who].kn=39;
 command(s,u[who],{type:'action',action:{type:'rest'}});const v=s.view(u[who].code,u[who].token);assert.equal(v.game.victory,'Science');assert.equal(v.game.phase,'won');
 const audit=s.audit(u[0].code,u[0].token);assert.equal(audit.status,'completed');assert.equal(audit.finalState.players[who].kn,40);assert(audit.initialSeed);assert.equal(audit.multiplayer.seats.length,2);
 err(()=>s.audit(u[0].code,'x'.repeat(43)),/own a seat/);
});

test('database failure does not publish or charge an unsaved action',t=>{
 const s=fresh(t),u=setup(s);land(s,u);const r=s.room(u[0].code),who=active(r.game).id,before=JSON.stringify(r),original=s.persist;
 s.persist=()=>{throw Error('Disk full');};err(()=>command(s,u[who],{type:'action',action:{type:'rest'}}),/Disk full/);s.persist=original;assert.equal(JSON.stringify(s.room(r.code)),before);
});

test('SQLite restart preserves room, seat secrets, resources, audits and duplicate receipts',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'tribes-multiplayer-')),filename=path.join(dir,'rooms.sqlite');let s;
 try{
  s=new RoomService({filename,botDelay:1e8});const u=setup(s);land(s,u);const r=s.room(u[0].code),who=active(r.game).id,input={type:'action',action:{type:'rest'},revision:r.revision,requestId:randomUUID()};s.command(r.code,u[who].token,input);const before=JSON.stringify(s.room(r.code));s.close();
  s=new RoomService({filename,botDelay:1e8});assert.equal(JSON.stringify(s.room(r.code)),before);assert.equal(s.view(r.code,u[1].token).playerId,1);s.command(r.code,u[who].token,input);assert.equal(JSON.stringify(s.room(r.code)),before);
  s.room(r.code).rulesRevision='older-revision';err(()=>command(s,u[who],{type:'action',action:{type:'end'}}),/rules revision/);
 }finally{if(s)s.close();for(const f of readdirSync(dir))unlinkSync(path.join(dir,f));rmdirSync(dir);}
});

test('six full multiplayer simulations finish with valid commands and complete audits',t=>{
 const s=fresh(t);
 for(let n=0;n<6;n++){
  const ids=Array.from({length:2+n%3},(_,i)=>LEADERS[(n+i)%6].id),u=setup(s,ids);let count=0;
  while(s.room(u[0].code).game.phase!=='won'&&count++<2200){
   const g=s.room(u[0].code).game;let id,a;
   if(g.phase==='battle'){id=[g.battle.attacker,g.battle.defender].find(id=>!g.battle.ready[id]);a=aiBattleAction(g,id);}else{id=active(g).id;a=aiAction(g);}
   assert(a);command(s,u[id],{type:'action',action:a});
  }
  const r=s.audit(u[0].code,u[0].token);assert.equal(r.status,'completed');assert.equal(r.coverage,'complete');assert(r.events.length>10);
 }
});

test('HTTP API authenticates and static serving cannot expose database or server files',async t=>{
 const {server}=createTribesServer({filename:':memory:',botDelay:1e8});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(url,body,headers={})=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const made=await post('/api/rooms',{name:'Brett',leader:'ku'});assert.equal(made.status,201);const host=await made.json();
 assert.equal((await fetch(base+`/api/rooms/${host.code}`)).status,401);
 const auth=await fetch(base+`/api/rooms/${host.code}`,{headers:{Authorization:`Bearer ${host.token}`}});assert.equal(auth.status,200);
 assert.equal((await post('/api/rooms',{name:'Cross-site',leader:'ku'},{Origin:'https://unrelated.example'})).status,403);
 for(const url of ['/data/tribes.sqlite','/server.mjs','/multiplayer-server.mjs','/server-output.log','/package.json','/source-assets/test.png','/assets/../data/tribes.sqlite'])assert.equal((await fetch(base+url)).status,404,url);
 assert.equal((await fetch(base+'/multiplayer-client.mjs')).status,200);assert.equal((await fetch(base+'/engine.mjs')).status,200);assert.equal((await fetch(base+'/health')).status,200);
});
