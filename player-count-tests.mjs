import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as e from './engine.mjs';
import {verifyPermanentLibraries} from './library-rule-checks.mjs';
import {RoomService} from './multiplayer-server.mjs';
import {knowledgeTree,knowledgeDetail} from './knowledge-tree.mjs';

function ready(n){const s=e.createGame({seed:123,human:'ku',opponents:n-1,difficulty:'hard'});while(s.phase==='draft')assert.ok(e.act(s,{type:'place',tile:e.active(s).id}).ok);return s;}
for(const n of [2,3,4]){
 test(`${n} players: correct map, routes, settlement target and city defense`,()=>{
  const s=ready(n),p=e.active(s);assert.equal(s.tiles.length,n===4?30:24);assert.equal(e.settlementTarget(s),n===4?5:6);assert.equal(e.cityDefense(s),n===2?1:2);
  const edges=e.gameEdges(s);assert.equal(edges.filter(x=>x[2]).length,n===4?20:n===3?16:8);
  const start=n===4?10:8;p.pos=start;p.techs=['nomad'];p.ap=2;
  assert.equal(e.act(s,{type:'move',tile:start+1}).ok,n>=3);
  p.techs=[];p.pos=start;p.ap=2;assert.equal(e.act(s,{type:'move',tile:start+1}).ok,false);
  const seen=new Set([0]),queue=[0];for(const x of queue)for(const y of e.neighbors(s,p,x))if(!seen.has(y)){seen.add(y);queue.push(y);}assert.equal(seen.size,s.tiles.length);
  if(n===4)for(let b=0;b<3;b++)assert.equal(s.tiles.filter(t=>t.biome===b).length,10);
 });
 test(`${n} players: city construction stays 10 population + 1 AP on every biome`,()=>{
  for(let biome=0;biome<3;biome++){
   const s=ready(n),p=e.active(s),t=s.tiles[p.pos];t.biome=biome;t.owner=p.id;p.techs=['city','tent'];p.pop=9;p.ap=2;
   assert.equal(e.act(s,{type:'city'}).ok,false);p.pop=10;assert.ok(e.act(s,{type:'city'}).ok);assert.equal(p.pop,0);assert.equal(p.ap,1);
   const event=e.gameAudit(s).events.at(-1);assert.deepEqual(event.details.cost,{population:10,actions:1});
   const q=s.players.find(q=>q.id!==p.id);const bonus=e.combatBonuses(s,{attacker:q.id,defender:p.id,tile:t.id,offers:{[q.id]:0,[p.id]:0}});t.city=false;
   assert.equal(bonus.defense-e.combatBonuses(s,{attacker:q.id,defender:p.id,tile:t.id,offers:{[q.id]:0,[p.id]:0}}).defense,n===2?1:2);
  }
 });
 test(`${n} players: Science and visible research use the correct rule`,()=>{
  const s=ready(n),p=e.active(s);p.kn=39;p.rested=false;assert.ok(e.act(s,{type:'rest'}).ok);assert.equal(s.phase==='won',n===2);
  const technologies=e.availableTechs(s);assert.equal(technologies.filter(t=>e.LIBRARY_TECHS.includes(t.id)).length,n>=3?3:0);
  const tree=knowledgeTree(s,p,'city',()=>'<span>portrait</span>');assert.equal(tree.includes('data-tree-skill="beachLibrary"'),n>=3);assert.ok(!tree.includes('undefined'));
  assert.ok(knowledgeDetail(s,p,'city',()=>'',true).includes(`+${n===2?1:2} defense`));
  if(n===2){p.techs=['city'];assert.equal(e.canResearch(p,'beachLibrary'),false);assert.equal(e.act(s,{type:'library'}).ok,false);}
 });
 test(`${n} players: settlement win requires the correct count and a full holding interval`,()=>{
  for(const count of [5,6]){
   const s=ready(n),p=e.active(s);s.tiles.slice(0,count).forEach(t=>t.owner=p.id);assert.ok(e.act(s,{type:'rest'}).ok);
   assert.equal(s.phase,'playing');for(let i=0;i<n;i++)assert.ok(e.act(s,{type:'end'}).ok);
   assert.equal(s.phase==='won',count>=e.settlementTarget(s));
  }
 });
}
for(const n of [3,4])test(`${n} players: full library rules, copying, permanent ownership and immediate win`,()=>verifyPermanentLibraries(e,n));

test('four-player multiplayer accepts tile 29, protects library payments and shares permanent progress',t=>{
 const svc=new RoomService({filename:':memory:',botDelay:1e8,seedSource:()=>123});t.after(()=>svc.close());
 const host=svc.create({name:'Host',leader:'ku'});const users=[host,...['asinya','hecatl','tao'].map((leader,i)=>svc.join(host.code,{name:'Player '+i,leader}))];
 const cmd=(u,body)=>svc.command(u.code,u.token,{revision:svc.room(u.code).revision,requestId:randomUUID(),...body});
 for(const u of users)cmd(u,{type:'ready',ready:true});cmd(host,{type:'start'});
 while(svc.room(host.code).game.phase==='draft'){const g=svc.room(host.code).game;cmd(users[e.active(g).id],{type:'action',action:{type:'place',tile:29}});}
 let room=svc.room(host.code),g=room.game,p=e.active(g),tile=g.tiles[29],u=users[p.id];tile.owner=p.id;tile.revealed=true;p.techs=['city'];p.kn=8;p.ap=2;svc.persist(room);
 cmd(u,{type:'action',action:{type:'research',tech:e.LIBRARY_TECHS[tile.biome]}});
 const result=cmd(u,{type:'action',action:{type:'library'}});assert.equal(result.game.players[p.id].kn,0);assert.equal(result.game.players[p.id].ap,1);assert.equal(result.game.players[p.id].libraries.length,1);
 assert.equal(svc.view(host.code,users[(p.id+1)%4].token).game.players[p.id].libraries.length,1);
 const before=JSON.stringify(svc.room(host.code));assert.throws(()=>cmd(u,{type:'action',action:{type:'library'}}),/Research|Only one/);assert.equal(JSON.stringify(svc.room(host.code)),before);
 assert.throws(()=>cmd(u,{type:'action',action:{type:'move',tile:30}}),/valid tile/);
});
