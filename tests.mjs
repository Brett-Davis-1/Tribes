import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,active,owned,income,aiAction,MAP,neighbors,LEADERS,TECHS,combatBonuses,buildCost,diceSides} from './engine.mjs';
import {gameAudit,auditState,ensureAudit,aiBattleAction,HARD_BOT_VERSION,RULES_REVISION,spiritCardCost} from './engine.mjs';
import {auditCSV,auditHTML} from './audit.mjs';
function ready(seed=123){const s=createGame({human:'asinya',opponents:1,seed});while(s.phase==='draft')assert.ok(act(s,{type:'place',tile:active(s).id*4}).ok);s.turnIndex=s.order.indexOf(0);s.tiles[0].biome=0;return s;}
function success(s,a){if(a.type==='resolve'&&s.phase==='battle'){const b=s.battle;for(const id of [b.attacker,b.defender])if(!b.ready[id])assert.ok(act(s,{type:'battleReady',player:id,turtle:id===b.defender&&!!a.turtle}).ok);}const result=act(s,a);assert.ok(result.ok,result.message);return result;}

test('Hard planning ignores hidden yields, rival hands, deck order and random state',()=>{
 for(const draft of [true,false]){
  const a=draft?createGame({seed:593,difficulty:'hard'}):ready(593);a.difficulty='hard';
  const b=structuredClone(a),id=active(a).id;
  b.tiles.filter(t=>!t.revealed).forEach(t=>t.yield={type:'kn',amount:99});
  b.players.filter(p=>p.id!==id).forEach(p=>p.cards=['turtle','tiger','owl']);b.deck.reverse();b.seed=777;
  const before=JSON.stringify(a);assert.deepEqual(aiAction(a),aiAction(b));assert.equal(JSON.stringify(a),before);
 }
});
test('Hard takes immediate Science and interrupts a pending city with Tiger',()=>{
 const s=ready(),p=active(s);s.difficulty='hard';p.kn=36;p.cards=['owl','tiger'];s.tiles[4].owner=1;s.tiles[4].city=true;s.players[1].claim.cities[4]=s.turn;
 assert.deepEqual(aiAction(s),{type:'card',card:'owl'});
 p.kn=10;p.pop=50;s.players[1].pop=0;
 assert.deepEqual(aiAction(s),{type:'card',card:'tiger',tile:4});
});
test('Hard holds science savings, guards its city and follows an affordable City path',()=>{
 const s=ready(),p=active(s);s.difficulty='hard';p.pos=0;p.ap=2;p.kn=39;p.cards=[];p.techs=['nomad','stamina','tent'];
 assert.deepEqual(aiAction(s),{type:'rest'});
 p.kn=10;p.pop=10;p.turns=4;s.tiles[0].owner=p.id;
 assert.deepEqual(aiAction(s),{type:'research',tech:'city'});success(s,aiAction(s));
 assert.deepEqual(aiAction(s),{type:'city'});success(s,aiAction(s));
 assert.deepEqual(aiAction(s),{type:'rest'});success(s,aiAction(s));assert.deepEqual(aiAction(s),{type:'end'});
});
test('Hard combat offers stay legal and terminate even against large counteroffers',()=>{
 const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.pos=0;p.ap=1;p.pop=80;d.pop=80;p.cards=[];d.cards=[];s.tiles[0].owner=d.id;s.tiles[0].city=true;d.claim.cities[0]=s.turn;
 success(s,{type:'attack'});
 let steps=0;while(s.phase==='battle'&&steps++<100){const action=aiBattleAction(s,p.id)||aiBattleAction(s,d.id)||{type:'resolve'};assert.ok(act(s,action).ok);}
 assert.notEqual(s.phase,'battle');assert.ok(p.pop>=0&&d.pop>=0);
});
test('Ku invests in Spoils and raids an exposed neighbor during his early turn',()=>{
 const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.leader='ku';p.techs=['hunter'];p.cards=[];p.kn=2;p.pop=16;p.ap=4;p.pos=0;p.turns=1;
 d.pop=0;d.techs=[];d.pos=4;s.tiles[0].owner=p.id;s.tiles[0].revealed=true;
 Object.assign(s.tiles[8],{owner:d.id,biome:0,revealed:true,yield:{type:'kn',amount:1}});
 assert.deepEqual(aiAction(s),{type:'research',tech:'spoils'});success(s,aiAction(s));
 assert.deepEqual(aiAction(s),{type:'move',tile:8});success(s,aiAction(s));
 assert.deepEqual(aiAction(s),{type:'attack'});
});
test('Hard counters a six-settlement claim here instead of chasing a distant weaker tile',()=>{
 // Reproduces Tao's missed response in Brett's Hecatl game: four population,
 // two actions, standing on the enemy's newly captured sixth settlement.
 const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.leader='tao';p.techs=['spiritual','growth','wisdom','city'];p.cards=[];p.pos=1;p.ap=2;p.pop=4;p.kn=3;
 d.leader='hecatl';d.techs=['nomad','hunter','spoils'];d.pos=1;d.pop=3;d.claim.settler=s.turn;
 for(const id of [1,7,14,15,22,23])Object.assign(s.tiles[id],{owner:d.id,biome:id===1?1:0,revealed:true});
 assert.deepEqual(aiAction(s),{type:'attack'});
});
test('Hecatl keeps Wayfinder during ordinary expansion and spends it to intercept a city',()=>{
 const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.leader='hecatl';p.techs=['nomad','wayfinder','tent','stamina'];p.cards=[];p.pos=0;p.ap=3;p.pop=8;p.kn=0;p.teleports=1;s.tiles[0].owner=p.id;
 assert.notEqual(aiAction(s).type,'teleport');
 Object.assign(s.tiles[4],{owner:d.id,city:true,revealed:true,biome:0});d.pop=0;d.claim.cities[4]=s.turn;
 assert.deepEqual(aiAction(s),{type:'teleport',tile:4});
});
test('Tao combines Tiger and Owl in one turn while preserving AP for a follow-up',()=>{
 const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.leader='tao';p.techs=['spiritual','hunter','ferocity'];p.cards=['tiger','owl'];p.pos=0;p.ap=2;p.pop=20;p.kn=4;p.played=0;
 Object.assign(s.tiles[4],{owner:d.id,city:true,revealed:true,biome:0});d.pos=5;d.techs=[];d.pop=0;d.claim.cities[4]=s.turn;
 assert.deepEqual(aiAction(s),{type:'card',card:'tiger',tile:4});success(s,aiAction(s));s.seed=0;success(s,{type:'resolve'});
 assert.equal(s.tiles[4].owner,p.id);assert.equal(p.ap,2);assert.equal(p.played,1);
 assert.deepEqual(aiAction(s),{type:'card',card:'owl'});success(s,aiAction(s));assert.equal(p.played,2);assert.equal(p.ap,2);
});
test('Each leader policy respects hidden information in a contested position',()=>{
 for(const l of LEADERS){
  const s=ready(),p=active(s),d=s.players[1];s.difficulty='hard';p.leader=l.id;p.techs=l.tech?[l.tech]:[];p.cards=['owl'];p.pos=0;p.kn=8;p.pop=16;p.ap=3;
  Object.assign(s.tiles[8],{owner:d.id,revealed:true});d.pos=8;
  const other=structuredClone(s);other.seed=999;other.deck.reverse();other.players[d.id].cards=['turtle','tiger'];
  other.tiles.filter(t=>!t.revealed).forEach(t=>t.yield={type:'kn',amount:99});
  const before=JSON.stringify(s);assert.deepEqual(aiAction(s),aiAction(other),l.id);assert.equal(JSON.stringify(s),before);
 }
});
test('Bot decisions carry their policy in the audit without relabeling earlier events',()=>{
 const s=ready(),count=s.audit.events.length;
 success(s,{type:'rest',botPolicy:HARD_BOT_VERSION});
 const report=gameAudit(s);
 assert.equal(report.events[count].details.botPolicy,HARD_BOT_VERSION);
 assert.equal(report.events[count].action.botPolicy,HARD_BOT_VERSION);
 assert.ok(report.events.slice(0,count).every(e=>e.details.botPolicy===undefined));
});
test('Hard games complete across every leader and rival count with legal actions',()=>{
 for(let i=0;i<36;i++){
  const s=createGame({human:LEADERS[i%6].id,opponents:Math.floor(i/6)%3+1,seed:Math.imul(i+1,2654435761)>>>0,difficulty:'hard'});
  let steps=0;while(s.phase!=='won'&&steps++<3000){const a=aiAction(s),result=act(s,a);assert.ok(result.ok,JSON.stringify({i,a,error:result.message}));for(const p of s.players)assert.ok(p.pop>=0&&p.kn>=0&&p.ap>=0);}
  assert.equal(s.phase,'won',`Hard seed ${i} stalled`);assert.equal(gameAudit(s).difficulty,'hard');
 }
});
test('setup selects 24 unique tiles from a pooled 30, with randomized biomes and a finite spirit deck',()=>{
 for(let seed=1;seed<=30;seed++){const s=createGame({seed});assert.equal(s.tiles.length,24);assert.equal(new Set(s.tiles.map(t=>t.tileId)).size,24);for(let r=0;r<3;r++){assert.equal(s.tiles.filter(t=>t.ring===r).length,8);const tiles=s.tiles.filter(t=>t.biome===r);assert.ok(tiles.length<=10);for(const kind of ['pop','kn'])assert.ok(tiles.filter(t=>t.yield.type===kind).length<=5);}assert.ok(s.tiles.some(t=>t.biome!==t.ring));assert.ok(s.tiles.every(t=>!t.revealed));assert.equal(s.deck.length+s.players.reduce((n,p)=>n+p.cards.length,0),36);}
});
test('all locations are reachable through standard trails',()=>{
 const s=ready(),p=active(s);const visited=new Set([0]),queue=[0];while(queue.length)for(const n of neighbors(s,p,queue.shift()))if(!visited.has(n)){visited.add(n);queue.push(n);}assert.equal(visited.size,MAP.length);
});
test('illegal actions do not charge resources; building delays income until next turn',()=>{
 const s=ready(),p=active(s);p.pos=0;p.ap=2;p.pop=20;s.tiles[0].yield={type:'pop',amount:1};
 const before=JSON.stringify(s);assert.equal(act(s,{type:'move',tile:4}).ok,false);assert.equal(JSON.stringify(s),before);
 success(s,{type:'build'});assert.equal(p.pop,16);assert.equal(p.ap,1);assert.equal(income(s,p).pop,2);
 success(s,{type:'end'});success(s,{type:'end'});assert.equal(p.pop,18);
});
test('tied combat favors defender, charges attacker, transfers neither tile nor yield',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=20;p.techs=['hunter'];d.techs=[];d.pos=1;s.tiles[0].owner=1;s.tiles[0].revealed=true;
 success(s,{type:'attack'});assert.equal(p.pop,20);assert.equal(p.ap,1);s.seed=0;const dp=d.pop;
 success(s,{type:'resolve'});assert.equal(s.result.at,s.result.dt);assert.equal(s.tiles[0].owner,1);assert.equal(d.pop,dp);
});
test('capturing a city removes its upgrade and transfers future income',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=20;p.techs=['hunter','ferocity','wartribe'];d.techs=[];d.pos=1;
 const t=s.tiles[0];t.owner=1;t.revealed=true;t.city=true;t.yield={type:'kn',amount:1};
 success(s,{type:'attack'});s.seed=0;success(s,{type:'resolve'});assert.equal(t.owner,0);assert.equal(t.city,false);assert.equal(income(s,p).kn,2);assert.equal(income(s,d).kn,1);
});
test('Guardian Turtle is a defensive interruption and does not consume the defender’s turn card allowance',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=20;s.tiles[0].owner=1;d.cards=['turtle'];d.played=1;
 success(s,{type:'attack'});success(s,{type:'resolve',turtle:true});assert.equal(s.tiles[0].owner,1);assert.equal(d.cards.length,0);assert.equal(d.played,1);assert.equal(s.result.turtle,true);
});
test('repeated attacks have no exhaustion and still consume AP',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=3;p.pop=20;d.cards=['turtle','turtle'];s.tiles[0].owner=1;
 success(s,{type:'attack'});const first=combatBonuses(s).attack;success(s,{type:'resolve',turtle:true});success(s,{type:'attack'});assert.equal(combatBonuses(s).attack,first);assert.equal(p.ap,1);assert.equal(p.pop,20);success(s,{type:'resolve',turtle:true});success(s,{type:'end'});success(s,{type:'end'});assert.equal(p.attacks,0);
});
test('settler victory must survive until next turn and a capture cancels it',()=>{
 const s=ready(),p=active(s);p.ap=2;p.pop=20;for(let i=0;i<6;i++){s.tiles[i].owner=0;s.tiles[i].revealed=true;}success(s,{type:'rest'});assert.equal(s.phase,'playing');success(s,{type:'end'});
 const d=active(s);d.pos=0;d.ap=2;d.pop=20;d.techs=['hunter','ferocity','wartribe'];p.techs=[];p.pos=7;
 success(s,{type:'attack'});s.seed=0;success(s,{type:'resolve'});assert.equal(owned(s,p).length,5);assert.equal(p.claim.settler,null);success(s,{type:'end'});assert.equal(s.phase,'playing');
});
test('holding a newly upgraded city yields victory at the start of the next turn',()=>{
 const s=ready(),p=active(s);p.pos=0;p.ap=2;p.pop=20;p.techs=['city'];s.tiles[0].owner=0;success(s,{type:'city'});assert.equal(s.phase,'playing');success(s,{type:'end'});success(s,{type:'end'});assert.equal(s.phase,'won');assert.equal(s.winner,0);assert.equal(s.victory,'City');
});
test('research with zero actions is legal; Stamina immediately grants an action',()=>{
 const s=ready(),p=active(s);p.ap=0;p.kn=20;p.techs=['nomad'];success(s,{type:'research',tech:'stamina'});assert.equal(p.ap,1);success(s,{type:'research',tech:'tent'});assert.equal(p.ap,1);assert.equal(p.kn,13);
});
test('Fox learns for free, requires prerequisites, and cannot repeat an owned reward',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.ap=1;p.kn=0;p.cards=['fox','fox'];p.techs=[];d.techs=['city','spiritual','growth'];const before=JSON.stringify(s);
 assert.equal(act(s,{type:'card',card:'fox',player:1,tech:'city'}).ok,false);assert.equal(JSON.stringify(s),before);
 p.techs=['spiritual'];const pop=p.pop,source=structuredClone(d);
 success(s,{type:'card',card:'fox',player:1,tech:'growth'});
 assert.equal(p.pop,pop+5);assert.equal(p.kn,0);assert.equal(p.ap,1);assert.ok(p.techs.includes('growth'));assert.deepEqual(d,source);assert.equal(p.played,1);assert.deepEqual(p.cards,['fox']);
 const after=JSON.stringify(s);assert.equal(act(s,{type:'card',card:'fox',player:1,tech:'growth'}).ok,false);assert.equal(JSON.stringify(s),after);
});
test('Fox preserves the source player for every technology and grants normal learning effects',()=>{
 for(const t of TECHS){
  const s=ready(),p=active(s),d=s.players[1];p.ap=2;p.kn=0;p.pop=20;p.techs=t.parents.length?[t.parents[0]]:[];p.cards=['fox'];p.teleports=0;p.tribute=false;p.warcry=false;
  d.techs=TECHS.map(t=>t.id);d.ap=3;d.teleports=1;d.tribute=true;d.warcry=true;
  const source=structuredClone(d),deckCount=s.deck.length;
  success(s,{type:'card',card:'fox',player:d.id,tech:t.id});
  assert.deepEqual(d,source,t.id+' changed the source tribe');assert.ok(p.techs.includes(t.id));assert.equal(p.kn,0);assert.equal(p.ap,t.id==='stamina'?3:2);
  assert.equal(p.pop,t.id==='growth'?25:20);assert.equal(p.teleports,t.id==='wayfinder'?1:0);assert.equal(p.tribute,t.id==='tribute');assert.equal(p.warcry,t.id==='warcry');
  assert.equal(p.cards.length,t.id==='offering'?1:0);assert.equal(s.deck.length,deckCount-(t.id==='offering'?1:0));
  if(t.id==='archery'){assert.deepEqual(diceSides(p),[6,6]);assert.deepEqual(diceSides(d),[6,6]);}
  if(t.id==='shields'){assert.deepEqual(diceSides(p,true),[6,6]);assert.deepEqual(diceSides(d,true),[6,6]);}
  if(t.id==='wisdom')assert.equal(income(s,p).kn,3);
  if(t.id==='fertility')assert.equal(income(s,p).pop,3);
  const event=s.audit.events.at(-1);assert.equal(event.details.technologyLearning.sourceKeepsTechnology,true);assert.equal(event.details.technologyLearning.knowledgeCost,0);assert.equal(event.changes.some(c=>c.player===d.id),false);
 }
});
test('resumed audit retains historical records and labels corrected Fox actions',()=>{
 const s=ready(),p=active(s),d=s.players[1];delete s.rulesRevision;s.audit.catalog.rulesRevision='pre-correction';
 const history=JSON.stringify(s.audit.events);p.techs=['hunter','spoils'];p.cards=['fox'];d.techs=['hunter','ferocity'];
 const count=s.audit.events.length;success(s,{type:'card',card:'fox',player:1,tech:'ferocity'});
 assert.equal(JSON.stringify(s.audit.events.slice(0,count)),history);assert.equal(s.audit.catalog.rulesRevision,'pre-correction');
 assert.equal(s.audit.events.at(-1).details.rulesRevision,RULES_REVISION);assert.equal(gameAudit(s).rulesRevision,RULES_REVISION);
});
test('computer decisions cannot see unrevealed tile yields',()=>{
 const a=ready(),b=structuredClone(a);b.tiles.forEach(t=>t.yield={type:t.yield.type==='pop'?'kn':'pop',amount:99});assert.deepEqual(aiAction(a),aiAction(b));
});
test('all leaders can complete simulated games without illegal actions or stalled turns',()=>{
 for(let seed=1;seed<=18;seed++){
  const s=createGame({human:LEADERS[seed%6].id,opponents:seed%3+1,seed,difficulty:seed%2?'normal':'easy'});
  let actions=0;while(s.phase!=='won'&&actions<3000){const a=aiAction(s);assert.ok(a);const result=act(s,a);assert.ok(result.ok,`seed ${seed}: ${JSON.stringify(a)} ${result.message}`);for(const p of s.players)assert.ok(p.pop>=0&&p.kn>=0&&p.ap>=0);actions++;}
  assert.equal(s.phase,'won',`seed ${seed} did not finish`);
 }
});
test('audit identifies each game and records the setup without changing game randomness',()=>{
 const a=createGame({seed:123}),b=createGame({seed:123});assert.notEqual(a.audit.gameId,b.audit.gameId);assert.equal(a.audit.initialSeed,123);assert.equal(a.audit.coverage,'complete');assert.deepEqual(auditState(a),auditState(b));assert.equal(a.audit.events[0].type,'setup');assert.equal(a.audit.events[0].changes.length,a.players.length);
});
test('end-turn and next-player income are separate audit events with attributed sources',()=>{
 const s=ready(),p=active(s),count=s.audit.events.length;success(s,{type:'end'});const [end,start]=s.audit.events.slice(count);assert.equal(end.type,'end');assert.equal(end.actor,p.id);assert.equal(end.changes[0].delta.population,0);assert.equal(start.type,'turn_start');assert.equal(start.actor,active(s).id);assert.equal(start.changes[0].delta.population,start.details.incomeSources.reduce((n,y)=>n+y.population,0));assert.equal(start.changes[0].delta.knowledge,start.details.incomeSources.reduce((n,y)=>n+y.knowledge,0));assert.equal(end.turn+1,start.turn);
});
test('audit records gross build cost and immediate harvest independently of the net balance',()=>{
 const s=ready(),p=active(s);p.pos=0;p.ap=2;p.pop=20;p.techs=['harvest'];s.tiles[0].yield={type:'pop',amount:1};success(s,{type:'build'});const e=s.audit.events.at(-1);assert.equal(e.details.cost.population,4);assert.equal(e.details.immediateHarvest.amount,1);assert.equal(e.changes.find(c=>c.player===p.id).delta.population,-3);assert.equal(e.tileChanges[0].after.owner,p.id);
});
test('audit records Rallying Cry rewards, dice and biome modifiers',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=20;p.techs=[];d.techs=['gatherer','rally'];d.pos=0;s.tiles[0].owner=1;s.tiles[0].city=true;
 success(s,{type:'attack'});s.seed=0;success(s,{type:'resolve'});const e=s.audit.events.at(-1);assert.equal(e.type,'combat_result');assert.equal(e.actor,0);assert.equal(e.details.modifierSources.defense.city,1);assert.equal(e.details.modifierSources.defense.leaderPresent,1);assert.equal(e.details.modifierSources.defense.gatherer,1);assert.deepEqual(e.details.result.ar,[1,1]);assert.equal(e.changes.find(c=>c.player===1).delta.population,3);assert.equal(e.details.modifierSources.defense.biome,1);assert.ok(!('exhaustion' in e.details.modifierSources.attack));
});
test('partial audit migration does not invent earlier events or baseline resource gains',()=>{
 const s=ready();delete s.audit;const before=auditState(s);ensureAudit(s);assert.equal(s.audit.coverage,'partial');assert.equal(s.audit.initialSeed,null);assert.deepEqual(s.audit.initialState,before);assert.equal(s.audit.events[0].changes.length,0);assert.match(s.audit.coverageNote,/cannot be reconstructed/);const oldId=s.audit.gameId;const resumed=JSON.parse(JSON.stringify(s));ensureAudit(resumed);assert.equal(resumed.audit.gameId,oldId);
});
test('complete-game audit changes reconcile to final balances and remain untruncated through save/resume',()=>{
 const s=createGame({seed:719,human:'ku',opponents:3});let steps=0;
 while(s.phase!=='won'&&steps++<3000)success(s,aiAction(s));assert.equal(s.phase,'won');
 const r=gameAudit(JSON.parse(JSON.stringify(s))),players=new Map(r.initialState.players.map(p=>[p.id,structuredClone(p)])),tiles=new Map(r.initialState.tiles.map(t=>[t.id,structuredClone(t)]));
 for(const [i,e] of r.events.entries()){
  assert.equal(e.sequence,i+1);
  for(const c of e.changes){if(c.before)assert.deepEqual(c.before,players.get(c.player));for(const [key,d] of [['pop','population'],['kn','knowledge'],['ap','actions']])assert.equal((c.before?.[key]||0)+c.delta[d],c.after[key]);players.set(c.player,c.after);}
  for(const c of e.tileChanges){if(c.before)assert.deepEqual(c.before,tiles.get(c.tile));tiles.set(c.tile,c.after);}
 }
 assert.deepEqual([...players.values()],r.finalState.players);assert.deepEqual([...tiles.values()],r.finalState.tiles);assert.equal(r.events.at(-1).type,'victory');assert.equal(r.status,'completed');assert.equal(r.events.length,s.audit.events.length);assert.ok(r.events.length>s.log.length);
 const html=auditHTML(r),csv=auditCSV(r);assert.ok(html.includes('Every decision. Every resource.'));assert.ok(html.includes('data-players'));assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Population before","Population change","Population after"'));assert.ok(csv.includes('combat_result')||!r.events.some(e=>e.type==='combat_result'));
});
test('HTML and CSV exports escape untrusted text safely',()=>{
 const s=createGame({seed:17}),r=gameAudit(s);r.events[0].description='=HYPERLINK("bad")\n<script>alert(1)</script>';const csv=auditCSV(r),html=auditHTML(r);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('""bad""'));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
});

test('latest supplied tree has all 22 costs and incoming arrows; Armor is absent',()=>{
 const expected=[['nomad',5,[]],['stamina',2,['nomad']],['wayfinder',1,['nomad']],['tent',5,['stamina','wayfinder']],['rally',2,['tent']],['tribute',2,['tent','wisdom']],['spiritual',5,[]],['growth',1,['spiritual']],['favor',3,['spiritual']],['wisdom',5,['growth','favor']],['shields',7,['wisdom','fertility']],['gatherer',5,[]],['harvest',2,['gatherer']],['offering',1,['gatherer']],['fertility',5,['harvest','offering']],['wartribe',8,['fertility','ferocity']],['hunter',5,[]],['spoils',2,['hunter']],['warcry',2,['hunter']],['ferocity',5,['spoils','warcry']],['archery',7,['ferocity']],['city',10,['tent','wisdom','fertility','ferocity']]];
 assert.deepEqual(TECHS.map(t=>[t.id,t.cost,t.parents]),expected);assert.ok(!TECHS.some(t=>t.id==='armor'));
 for(const l of LEADERS){const s=createGame({human:l.id});assert.equal(s.players[0].pop,l.id==='asinya'?18:10);assert.equal(s.players[0].kn,l.id==='tao'?3:5);}
});

test('base and upgraded dice use D6+D4 and 2D6 independently',()=>{
 const p={techs:[]};assert.deepEqual(diceSides(p),[6,4]);assert.deepEqual(diceSides(p,true),[6,4]);
 p.techs=['archery'];assert.deepEqual(diceSides(p),[6,6]);assert.deepEqual(diceSides(p,true),[6,4]);
 p.techs=['shields'];assert.deepEqual(diceSides(p),[6,4]);assert.deepEqual(diceSides(p,true),[6,6]);
});

test('public combat offers reset confirmations, reject overspending and charge both sides only at resolution',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=10;p.techs=['hunter'];d.techs=[];d.pos=1;d.pop=12;s.tiles[0].owner=d.id;
 success(s,{type:'attack'});assert.equal(p.pop,10);assert.equal(p.ap,1);
 for(const amount of [-2,1,3,12,NaN]){const before=JSON.stringify(s);assert.equal(act(s,{type:'battleOffer',player:p.id,population:amount}).ok,false);assert.equal(JSON.stringify(s),before);}
 success(s,{type:'battleOffer',player:p.id,population:4});success(s,{type:'battleReady',player:p.id});
 success(s,{type:'battleOffer',player:d.id,population:2});assert.equal(s.battle.ready[p.id],false);assert.equal(s.battle.ready[d.id],false);
 const before=JSON.stringify(s);assert.equal(act(s,{type:'resolve'}).ok,false);assert.equal(JSON.stringify(s),before);
 success(s,{type:'battleOffer',player:p.id,population:2});assert.equal(p.pop,10);assert.equal(d.pop,12);
 s.seed=0;success(s,{type:'resolve'});assert.equal(p.pop,8);assert.equal(d.pop,10);assert.equal(s.result.won,false);assert.equal(s.result.at,s.result.dt);
 const e=s.audit.events.at(-1);assert.deepEqual(e.details.cost,{attackerPopulation:2,defenderPopulation:2});assert.equal(e.details.modifierSources.attack.population,1);assert.equal(e.details.modifierSources.defense.population,1);
});

test('randomized biome determines building cost and defense independently of board ring',()=>{
 const s=ready(),p=active(s),d=s.players[1],t=s.tiles[0];p.pos=0;p.ap=3;p.pop=0;p.techs=[];d.techs=[];d.pos=1;t.owner=1;t.biome=2;
 assert.equal(t.ring,0);assert.equal(buildCost(p,t),12);success(s,{type:'attack'});assert.equal(combatBonuses(s).defense,3);t.city=true;assert.equal(combatBonuses(s).defense,4);assert.equal(p.pop,0);
});

test('every tribe can rest once, retain remaining AP, and rest again next own turn',()=>{
 for(const techs of [[],['nomad']]){const s=ready(),p=active(s);p.ap=3;p.techs=techs;const pop=p.pop,kn=p.kn;
 success(s,{type:'rest'});assert.equal(p.ap,2);assert.equal(p.pop,pop+1);assert.equal(p.kn,kn+1);const before=JSON.stringify(s);assert.equal(act(s,{type:'rest'}).ok,false);assert.equal(JSON.stringify(s),before);
 success(s,{type:'end'});success(s,{type:'end'});assert.equal(p.rested,false);success(s,{type:'rest'});}
});

test('Science wins immediately on card, rest, Tribute, Spoils and turn income reaching 40 knowledge',()=>{
 for(const source of ['owl','rest','tribute','spoils','income']){
  const s=ready(),p=active(s),d=s.players[1];p.ap=3;p.kn=source==='owl'?36:39;p.cards=['owl'];
  if(source==='owl')success(s,{type:'card',card:'owl'});
  if(source==='rest')success(s,{type:'rest'});
  if(source==='tribute'){p.tribute=true;s.tiles[0].owner=p.id;s.tiles[0].yield={type:'kn',amount:1};success(s,{type:'tribute',tiles:[0]});}
  if(source==='spoils'){p.pos=0;p.techs=['hunter','ferocity','wartribe','spoils'];d.techs=[];d.pos=1;s.tiles[0].owner=d.id;success(s,{type:'attack'});s.seed=0;success(s,{type:'resolve'});}
  if(source==='income'){success(s,{type:'end'});success(s,{type:'end'});}
  assert.equal(p.kn,40,source);assert.equal(s.phase,'won',source);assert.equal(s.victory,'Science');assert.equal(s.winner,p.id);assert.equal(s.audit.events.at(-1).type,'victory');assert.equal(s.audit.events.at(-1).details.knowledge,40);
 }
});

test('Kingmaker counts distinct city locations and wins on the second qualifying capture',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.ap=4;p.techs=['hunter','ferocity','wartribe'];d.techs=[];d.pos=7;
 for(const id of [0,0,1]){const t=s.tiles[id];t.biome=0;t.owner=d.id;t.city=true;t.revealed=true;d.claim.cities[id]=s.turn;p.pos=id;
 success(s,{type:'attack'});s.seed=0;success(s,{type:'resolve'});assert.equal(t.city,false);assert.equal(t.owner,p.id);
 if(id===0){assert.deepEqual(p.preventedCities,[0]);assert.equal(s.phase,'playing');}}
 assert.deepEqual(p.preventedCities,[0,1]);assert.equal(s.phase,'won');assert.equal(s.victory,'Kingmaker');assert.equal(s.winner,p.id);assert.deepEqual(s.audit.events.at(-1).details.preventedCities,[0,1]);
});

test('city research costs 10 knowledge and each conversion costs only 10 population and 1 AP',()=>{
 const s=ready(),p=active(s);p.pos=0;p.techs=['tent'];p.kn=20;p.pop=20;p.ap=2;s.tiles[0].owner=p.id;
 success(s,{type:'research',tech:'city'});assert.equal(p.kn,10);assert.equal(p.pop,20);assert.equal(p.ap,2);
 success(s,{type:'city'});assert.equal(p.kn,10);assert.equal(p.pop,10);assert.equal(p.ap,1);assert.equal(s.phase,'playing');
});

test('Turtle spends confirmed commitments and Rallying Cry is the only defensive payout',()=>{
 const s=ready(),p=active(s),d=s.players[1];p.pos=0;p.ap=2;p.pop=10;d.pop=10;d.cards=['turtle'];d.techs=['rally'];s.tiles[0].owner=d.id;
 success(s,{type:'attack'});success(s,{type:'battleOffer',player:p.id,population:4});success(s,{type:'battleOffer',player:d.id,population:2});
 success(s,{type:'resolve',turtle:true});assert.equal(p.pop,6);assert.equal(d.pop,11);assert.equal(s.result.defensiveReward,3);assert.deepEqual(s.result.ar,[]);
});

test('an earlier-rules save is rejected without mutation and new audits identify rules edition 2',()=>{
 const s=ready();assert.equal(s.audit.ruleset,'tribes-rules-2');s.version=1;const before=JSON.stringify(s);assert.equal(act(s,{type:'rest'}).ok,false);assert.equal(JSON.stringify(s),before);
});


test('approved leader roster has exact starts, two ordinary AP and auditable setup',()=>{
 const expected={ku:[10,5,['hunter'],0],asinya:[18,5,[],0],herysi:[10,5,['gatherer'],0],hecatl:[10,5,['nomad'],0],tao:[10,3,['spiritual'],0],daikotei:[10,5,[],2]};
 for(const id of Object.keys(expected)){
  const s=createGame({human:id,opponents:1,seed:123,difficulty:'hard'}),p=s.players[0],[pop,kn,techs,cards]=expected[id];
  assert.equal(p.pop,pop,id);assert.equal(p.kn,kn,id);assert.deepEqual(p.techs,techs,id);assert.equal(p.cards.length,cards,id);assert.equal(s.rulesRevision,RULES_REVISION);
  const initial=s.audit.initialState.players[0];assert.equal(initial.pop,pop);assert.equal(initial.kn,kn);assert.deepEqual(initial.techs,techs);
  while(s.phase==='draft')success(s,{type:'place',tile:active(s).id*4});while(active(s).id!==p.id)success(s,{type:'end'});
  assert.equal(p.pop,pop+1);assert.equal(p.kn,kn+1);assert.equal(p.ap,2);assert.equal(p.turns,1);
  const e=s.audit.events.find(e=>e.type==='turn_start'&&e.actor===p.id);assert.equal(e.details.actionAllowance.firstTurnKuNuele,0);
  success(s,{type:'end'});success(s,{type:'end'});assert.equal(p.ap,2);assert.equal(p.turns,2);
 }
});

test('Daikotei cards cost 3, others cost 5, with exact affordability and audit charges',()=>{
 for(const l of LEADERS){
  const s=ready(),p=active(s);p.leader=l.id;p.cards=[];p.ap=0;const cost=l.id==='daikotei'?3:5;
  assert.equal(spiritCardCost(p),cost);p.pop=cost-1;const before=JSON.stringify(s);assert.equal(act(s,{type:'buyCard'}).ok,false);assert.equal(JSON.stringify(s),before);
  p.pop=cost;success(s,{type:'buyCard'});assert.equal(p.pop,0);assert.equal(p.ap,0);assert.equal(p.cards.length,1);
  const e=s.audit.events.at(-1);assert.equal(e.details.cost.population,cost);assert.equal(e.changes.find(c=>c.player===p.id).delta.population,-cost);
 }
});

test('bot card purchases honor Daikotei discount and preserve existing reserves',()=>{
 for(const difficulty of ['hard','normal'])for(const pending of [false,true]){
  const s=ready(),p=active(s);s.difficulty=difficulty;p.leader='daikotei';p.ap=0;p.kn=0;p.cards=[];p.techs=[];p.pop=difficulty==='hard'&&!pending?11:13;
  if(pending){s.tiles[p.pos].owner=p.id;s.tiles[p.pos].city=true;}
  assert.equal(aiAction(s).type,'buyCard');success(s,aiAction(s));assert.equal(p.pop,difficulty==='hard'&&!pending?8:10);
 }
});
