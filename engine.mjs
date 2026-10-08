import {snapshot,initializeAudit,recordAudit,exportAudit} from './audit.mjs';
export const RULESET='tribes-rules-2';
export const GAME_VERSION=2;
export const BIOMES=['Beach','Mangrove','Caldera'];
export const LEADERS=[
 {id:'ku',name:'Ku Nuele',title:'The Flamekeeper',color:'#ed795d',pop:10,kn:5,tech:'hunter',bonus:'Hunter unlocked · +2 actions on your first turn',style:'Conqueror'},
 {id:'asinya',name:'Asinya',title:'The Lifegiver',color:'#39bd91',pop:16,kn:5,bonus:'Begin with 16 population',style:'Builder'},
 {id:'herysi',name:'Herysi',title:'The Protector',color:'#99cc61',pop:10,kn:5,tech:'gatherer',bonus:'Gatherer unlocked · +1 defense',style:'Builder'},
 {id:'hecatl',name:'Hecatl',title:'The Pathfinder',color:'#e3b656',pop:10,kn:5,tech:'nomad',bonus:'Nomad unlocked · travel the sea routes',style:'Explorer'},
 {id:'tao',name:'Tao Zhe',title:'The Spiritwalker',color:'#b598ed',pop:10,kn:5,tech:'spiritual',bonus:'Spiritual unlocked · play two spirit cards per turn',style:'Scholar'},
 {id:'daikotei',name:'Daikotei',title:'The Blademaster',color:'#78b9e3',pop:10,kn:5,cards:2,bonus:'Begin with two spirit cards',style:'Conqueror'}
];
const tech=(id,name,cost,parents,branch,description)=>({id,name,cost,parents,branch,description});
export const TECHS=[
 tech('nomad','Nomad',5,[],'Journey','Use hidden sea routes between neighboring outer spaces.'),
 tech('stamina','Stamina',2,['nomad'],'Journey','Gain +1 action each turn, including this turn.'),
 tech('wayfinder','Wayfinder',1,['nomad'],'Journey','Once: teleport your leader to any location.'),
 tech('tent','Tent Culture',5,['stamina','wayfinder'],'Journey','Building settlements costs 3 less population.'),
 tech('rally','Rallying Cry',2,['tent'],'Journey','Gain 3 population after a defensive victory. Without this technology, defense awards no population.'),
 tech('tribute','Tribute',2,['tent','wisdom'],'Journey','Once: collect income from up to two of your settlements.'),
 tech('spiritual','Spiritual',5,[],'Spirit','Play up to two spirit cards per turn.'),
 tech('growth','New Followers',1,['spiritual'],'Spirit','Once: gain 5 population.'),
 tech('favor','Spirit Favor',3,['spiritual'],'Spirit','Draw a spirit card after each successful attack.'),
 tech('wisdom','Wisdom',5,['growth','favor'],'Spirit','Gain +2 knowledge per turn.'),
 tech('shields','Shields',7,['wisdom','fertility'],'Spirit','Defend with two D6s instead of a D6 and a D4.'),
 tech('gatherer','Gatherer',5,[],'Harvest','Gain +1 defense.'),
 tech('harvest','Harvest the Land',2,['gatherer'],'Harvest','Also collect a new settlement’s yield immediately when you build it.'),
 tech('offering','Spirit Offering',1,['gatherer'],'Harvest','Once: draw one spirit card.'),
 tech('fertility','Fertility',5,['harvest','offering'],'Harvest','Gain +2 population per turn.'),
 tech('wartribe','War Tribe',8,['fertility','ferocity'],'Harvest','Gain +2 attack and +2 defense.'),
 tech('hunter','Hunter',5,[],'War','Gain +1 attack.'),
 tech('spoils','Spoils of War',2,['hunter'],'War','Gain 1 population and 1 knowledge after a successful attack.'),
 tech('warcry','War Cry',2,['hunter'],'War','Gain +3 attack for the rest of this turn.'),
 tech('ferocity','Ferocity',5,['spoils','warcry'],'War','Gain +2 attack.'),
 tech('archery','Archery',7,['ferocity'],'War','Attack with two D6s instead of a D6 and a D4.'),
 tech('city','City',10,['tent','wisdom','fertility','ferocity'],'City','Upgrade a settlement for 10 population and 1 action. Hold a city until your next turn to win.')
];
export const CARDS={fox:{name:'Cunning Fox',text:'Steal an eligible technology from a rival.'},jaguar:{name:'Swift Jaguar',text:'Gain 2 extra actions this turn.'},turtle:{name:'Guardian Turtle',text:'Automatically win a defensive battle. Play before dice are rolled.'},eagle:{name:'Soaring Eagle',text:'Travel to any location, with no action cost.'},owl:{name:'Wise Owl',text:'Gain 4 knowledge immediately.'},tiger:{name:'Fighting Tiger',text:'Teleport to an enemy settlement and attack for free.'}};
const coords=[[[594,318],[1024,315],[1302,619],[1302,1035],[985,1325],[577,1325],[285,1008],[305,595]],[[788,433],[1076,545],[1186,825],[1079,1098],[796,1208],[513,1098],[406,829],[520,545]],[[713,620],[885,620],[1020,742],[986,900],[876,1029],[700,1014],[588,902],[601,733]]];
export const MAP=coords.flatMap((ring,r)=>ring.map(([x,y],i)=>({id:r*8+i,x:x/16,y:y/16,ring:r,index:i,name:['Beach','Mangrove','Caldera'][r]+' '+(i+1)})));
export const EDGES=[];
for(let i=0;i<8;i++){
 EDGES.push([i,8+i,false],[i,8+(i+7)%8,false]);
 EDGES.push([8+i,16+i,false],[8+i,16+(i+1)%8,false]);
 EDGES.push([16+i,16+(i+1)%8,false],[i,(i+1)%8,true]);
}
export const leader=p=>LEADERS.find(l=>l.id===p.leader);
export const active=s=>s.players[s.order[s.turnIndex]];
export const owned=(s,p)=>s.tiles.filter(t=>t.owner===p.id);
export const has=(p,id)=>p.techs.includes(id);
export const income=(s,p)=>owned(s,p).reduce((v,t)=>(v[t.yield.type]+=t.yield.amount,v),{pop:1+(has(p,'fertility')?2:0),kn:1+(has(p,'wisdom')?2:0)});
export const buildCost=(p,t)=>Math.max(0,[4,8,12][t.biome]-(has(p,'tent')?3:0));
export const attackCost=()=>0;
export const diceSides=(p,defense=false)=>[6,has(p,defense?'shields':'archery')?6:4];
export const neighbors=(s,p,id=p.pos)=>EDGES.filter(([a,b,h])=>(a===id||b===id)&&(!h||has(p,'nomad'))).map(([a,b])=>a===id?b:a);
export function random(s){let x=s.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296;}
function shuffle(s,list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const die=(s,n)=>1+Math.floor(random(s)*n);
function log(s,text,type='event'){s.log.unshift({text,type,turn:s.turn});s.log=s.log.slice(0,100);}
function draw(s,p){if(!s.deck.length){s.deck=shuffle(s,s.discard);s.discard=[];}if(!s.deck.length)return false;p.cards.push(s.deck.pop());return true;}
export function createGame({human='ku',opponents=2,seed=Date.now()>>>0,difficulty='normal'}={}){
 const s={version:GAME_VERSION,ruleset:RULESET,seed:seed||1,phase:'draft',turn:0,turnIndex:0,round:1,players:[],order:[],tiles:[],deck:[],discard:[],log:[],battle:null,result:null,difficulty};
 const chosen=[human,...shuffle(s,LEADERS.filter(l=>l.id!==human).map(l=>l.id)).slice(0,Math.max(1,Math.min(3,opponents)))];
 s.deck=shuffle(s,Object.keys(CARDS).flatMap(k=>Array(6).fill(k)));
 s.players=chosen.map((id,i)=>{const l=LEADERS.find(l=>l.id===id);return {id:i,human:i===0,leader:id,pop:l.pop,kn:l.kn,techs:l.tech?[l.tech]:[],cards:[],pos:null,ap:0,attacks:0,rested:false,preventedCities:[],played:0,warcry:false,teleports:0,tribute:false,turns:0,visited:[],claim:{settler:null,cities:{}},roll:die(s,6)};});
 s.players.forEach(p=>{for(let i=0;i<(leader(p).cards||0);i++)draw(s,p);});
 s.order=s.players.map(p=>p.id).sort((a,b)=>s.players[b].roll-s.players[a].roll||a-b);
 const pool=BIOMES.flatMap((_,biome)=>Array.from({length:10},(_,i)=>({tileId:`${biome}-${i}`,biome,yield:{type:i<5?'pop':'kn',amount:i<5?[1,2,4][biome]:[1,2,3][biome]}})));
 s.tiles=shuffle(s,pool).slice(0,24).map((tile,i)=>({...MAP[i],...tile,name:`${BIOMES[tile.biome]} · Space ${i+1}`,revealed:false,owner:null,city:false}));
 log(s,'24 of 30 biome tiles were shuffled across all spaces. Choose where your tribe arrives.','setup');
 ensureAudit(s,{legacy:false,seed:seed||1});
 return s;
}
export const auditState=s=>snapshot(s,income);
export function ensureAudit(s,options={legacy:true}){
 if(!s.audit)initializeAudit(s,auditState(s),{leaders:LEADERS,technologies:TECHS,cards:CARDS,assumptions:['24 randomly selected from a pooled 30 tiles, shuffled across all spaces. Pool provisionally has ten per biome, five population and five knowledge each.','Beach yields 1; mangrove 2; caldera 4 population or 3 knowledge.','Base combat D6 + D4; Archery and Shields upgrade the relevant roll to 2D6 per Brett’s clarification.','Population commitments are public, adjustable in steps of 2, and finalized when both sides confirm. Any change resets both confirmations; committed population is spent at resolution, including Guardian Turtle battles.','Nomad opens coastal routes for 1 action. Boat numbers are not applied.','Spirit deck: six of each of six card types; discards are reshuffled when empty.','Kn Tree - Current (5).png is the technology source, with the explicit dice override; Armor proposal withdrawn.','Kingmaker: capture cities during their holding period at two distinct board locations; Science: hold 40 knowledge, both immediate.','Technology theft keeps descendants and existing cities but does not replay one-time rewards.']},options);
 return s.audit;
}
export function gameAudit(s){ensureAudit(s);return exportAudit(s,auditState(s));}
function auditActionDetails(s,a){
 const p=active(s),t=s.tiles[p.pos];
 if(a.type==='build')return {cost:{population:buildCost(p,t),actions:1},tile:t.name,revealedYield:t.yield,immediateHarvest:has(p,'harvest')?t.yield:null};
 if(a.type==='attack')return {tile:t.name,defender:t.owner,cost:{population:attackCost(t),actions:1},priorAttacks:p.attacks};
 if(a.type==='city')return {tile:t.name,cost:{population:10,actions:1}};
 if(a.type==='rest')return {cost:{actions:1},reward:{population:1,knowledge:1},oncePerTurn:true};
 if(a.type==='battleOffer')return {player:a.player,proposedPopulation:a.population,bonus:a.population/2,previousPopulation:s.battle.offers[a.player],chargedNow:0};
 if(a.type==='battleReady')return {player:a.player,population:s.battle.offers[a.player],turtle:!!a.turtle};
 if(a.type==='research')return {technology:TECHS.find(t=>t.id===a.tech),cost:{knowledge:TECHS.find(t=>t.id===a.tech)?.cost}};
 if(a.type==='buyCard')return {cost:{population:5},deckCountBefore:s.deck.length,discardCountBefore:s.discard.length};
 if(a.type==='tribute')return {yields:(a.tiles||[]).map(id=>({tile:id,yield:s.tiles[id]?.yield}))};
 if(a.type==='card')return {card:CARDS[a.card],targetTile:a.tile??null,targetPlayer:a.player??null,targetTechnology:a.tech??null,cost:{actions:0,population:0}};
 if(a.type==='resolve'){
  const b=s.battle,d=s.players[b.defender],att=s.players[b.attacker],tile=s.tiles[b.tile];
  return {battle:structuredClone(b),cost:{attackerPopulation:b.offers[att.id],defenderPopulation:b.offers[d.id]},diceSides:{attacker:diceSides(att),defender:diceSides(d,true)},modifierSources:combatSources(s),preventedCity:tile.city&&d.claim.cities[tile.id]!==undefined?tile.id:null};
 }
 return {};
}
export function act(s,a){
 if(s.version!==GAME_VERSION||s.ruleset!==RULESET)return fail('This save uses earlier rules. Export its audit and start a new match.');
 const before=auditState(s),marker=s.log[0],actor=a.type==='resolve'?s.battle?.attacker:['battleOffer','battleReady'].includes(a.type)?a.player:active(s)?.id;
 // Details are computed only for actions that can enter their corresponding phase.
 const details=(s.phase==='playing'&&a.type!=='resolve')||(s.phase==='battle'&&['resolve','battleOffer','battleReady'].includes(a.type))?auditActionDetails(s,a):{};
 const result=applyAction(s,a);if(!result.ok)return result;
 // Legacy saves start a truthful baseline before the first newly recorded action.
 if(!s.audit){initializeAudit(s,before,{leaders:LEADERS,technologies:TECHS,cards:CARDS,assumptions:['Legacy match: original setup seed and earlier actions are unavailable.']},{legacy:true});}
 const after=auditState(s),markerIndex=s.log.indexOf(marker),messages=s.log.slice(0,markerIndex<0?s.log.length:markerIndex).map(e=>e.text).reverse();
 if(a.type==='resolve')details.result=structuredClone(s.result);
 recordAudit(s,{type:a.type==='resolve'?'combat_result':a.type,actor,before,after,description:messages.join(' ')||`${leader(s.players[actor]).name} ends their turn.`,details,action:a});
 const startsTurn=(before.phase==='draft'&&s.phase==='playing')||(a.type==='end'&&s.phase==='playing');
 if(startsTurn){
  const startBefore=auditState(s),p=active(s),sources=[{source:'Base income',population:1,knowledge:1},...(has(p,'fertility')?[{source:'Fertility',population:2,knowledge:0}]:[]),...(has(p,'wisdom')?[{source:'Wisdom',population:0,knowledge:2}]:[]),...owned(s,p).map(t=>({source:t.name,population:t.yield.type==='pop'?t.yield.amount:0,knowledge:t.yield.type==='kn'?t.yield.amount:0}))];
  beginTurn(s);recordAudit(s,{type:s.phase==='won'?'victory':'turn_start',actor:p.id,before:startBefore,after:auditState(s),description:s.log[0].text,details:s.phase==='won'?{winner:s.winner,victory:s.victory}:{incomeSources:sources,actionAllowance:{base:2,stamina:has(p,'stamina')?1:0,firstTurnKuNuele:p.leader==='ku'&&p.turns===1?2:0},resets:['rest allowance','attack count','spirit cards played this turn','War Cry temporary bonus']}});
 }
 checkImmediateVictory(s);
 return result;
}
function win(s,p,type){s.phase='won';s.winner=p.id;s.victory=type;log(s,`${leader(p).name} wins a ${type} victory!`,'victory');}
function checkImmediateVictory(s){
 if(s.phase!=='playing')return;
 const p=s.players.find(p=>p.kn>=40||p.preventedCities.length>=2);if(!p)return;
 const before=auditState(s);win(s,p,p.preventedCities.length>=2?'Kingmaker':'Science');
 recordAudit(s,{type:'victory',actor:p.id,before,after:auditState(s),description:s.log[0].text,details:{winner:p.id,victory:s.victory,knowledge:p.kn,preventedCities:[...p.preventedCities]}});
}
function syncClaims(s){for(const p of s.players){const tiles=owned(s,p);p.claim.settler=tiles.length>=6?(p.claim.settler??s.turn):null;const cityIds=tiles.filter(t=>t.city).map(t=>t.id);for(const id of Object.keys(p.claim.cities))if(!cityIds.includes(Number(id)))delete p.claim.cities[id];for(const id of cityIds)p.claim.cities[id]??=s.turn;}}
function beginTurn(s){
 const p=active(s);syncClaims(s);
 const victory=p.claim.settler!==null&&p.claim.settler<s.turn?'Settler':Object.values(p.claim.cities).some(v=>v<s.turn)?'City':null;
 if(victory){win(s,p,victory);return;}
 p.turns++;p.ap=2+(has(p,'stamina')?1:0)+(p.leader==='ku'&&p.turns===1?2:0);p.attacks=0;p.rested=false;p.played=0;p.warcry=false;p.visited=[p.pos];const y=income(s,p);p.pop+=y.pop;p.kn+=y.kn;
 log(s,`${leader(p).name} collects ${y.pop} population and ${y.kn} knowledge.`,'income');
}
export function canResearch(p,id){const t=TECHS.find(t=>t.id===id);return !!t&&!has(p,id)&&p.kn>=t.cost&&(!t.parents.length||t.parents.some(id=>has(p,id)));}
export function stealable(s,p){return s.players.filter(q=>q.id!==p.id).flatMap(q=>q.techs.filter(id=>{const t=TECHS.find(t=>t.id===id);return !has(p,id)&&(!t.parents.length||t.parents.some(id=>has(p,id)));}).map(id=>({player:q.id,tech:id})));}
function grantTech(s,p,id,stolen=false){p.techs.push(id);if(id==='stamina')p.ap++;if(stolen)return;if(id==='growth')p.pop+=5;if(id==='offering')draw(s,p);if(id==='wayfinder')p.teleports++;if(id==='tribute')p.tribute=true;if(id==='warcry')p.warcry=true;}
const fail=message=>({ok:false,message});
function attack(s,p,t,free=false){
 if(t.owner===null||t.owner===p.id)return fail('Choose a rival settlement.');
 if(!free&&(p.pos!==t.id||p.ap<1||p.pop<attackCost(t)))return fail('You need to stand here and afford the attack.');
 if(!free){p.ap--;p.pop-=attackCost(t);}else p.pos=t.id;
 s.battle={attacker:p.id,defender:t.owner,tile:t.id,offers:{[p.id]:0,[t.owner]:0},ready:{[p.id]:false,[t.owner]:false},turtle:false};p.attacks++;s.phase='battle';log(s,`${leader(p).name} attacks ${leader(s.players[t.owner]).name} at ${t.name}.`,'battle');return {ok:true};
}
export function combatSources(s,b=s.battle){
 const a=s.players[b.attacker],d=s.players[b.defender],t=s.tiles[b.tile];
 return {attack:{hunter:has(a,'hunter')?1:0,ferocity:has(a,'ferocity')?2:0,warTribe:has(a,'wartribe')?2:0,warCry:a.warcry?3:0,population:b.offers[a.id]/2},defense:{biome:t.biome+1,gatherer:has(d,'gatherer')?1:0,warTribe:has(d,'wartribe')?2:0,leaderPresent:d.pos===t.id?1:0,city:t.city?1:0,population:b.offers[d.id]/2}};
}
export function combatBonuses(s,b=s.battle){return Object.fromEntries(Object.entries(combatSources(s,b)).map(([side,sources])=>[side,Object.values(sources).reduce((sum,n)=>sum+n,0)]));}
function battleOffer(s,a){
 const b=s.battle,p=s.players[a.player];
 if(![b.attacker,b.defender].includes(a.player)||!Number.isInteger(a.population)||a.population<0||a.population%2||a.population>p.pop)return fail('Choose an affordable population commitment in steps of 2.');
 if(b.offers[p.id]===a.population)return fail('That commitment is already selected.');
 b.offers[p.id]=a.population;b.ready[b.attacker]=false;b.ready[b.defender]=false;b.turtle=false;
 log(s,`${leader(p).name} proposes ${a.population} population for +${a.population/2} ${p.id===b.attacker?'attack':'defense'}. Both sides may adjust.`,'battle');return {ok:true};
}
function battleReady(s,a){
 const b=s.battle;if(![b.attacker,b.defender].includes(a.player))return fail('Only the battling tribes can confirm.');
 if(a.turtle&&(a.player!==b.defender||!s.players[a.player].cards.includes('turtle')))return fail('Only the defender can use an available Guardian Turtle.');
 b.ready[a.player]=true;if(a.player===b.defender)b.turtle=!!a.turtle;
 log(s,`${leader(s.players[a.player]).name} confirms ${b.offers[a.player]} population${a.turtle?' and Guardian Turtle':''}.`,'battle');return {ok:true};
}
function resolveBattle(s){
 const b=s.battle,a=s.players[b.attacker],d=s.players[b.defender],t=s.tiles[b.tile],mods=combatBonuses(s);
 const turtle=b.turtle;
 if(!b.ready[a.id]||!b.ready[d.id])return fail('Both tribes must confirm the current commitments before rolling.');
 if([a,d].some(p=>b.offers[p.id]>p.pop))return fail('A population commitment is no longer affordable.');
 if(turtle&&!d.cards.includes('turtle'))return fail('No Guardian Turtle card available.');
 a.pop-=b.offers[a.id];d.pop-=b.offers[d.id];
 const ar=turtle?[]:diceSides(a).map(n=>die(s,n)),dr=turtle?[]:diceSides(d,true).map(n=>die(s,n));
 const at=ar.reduce((v,n)=>v+n,mods.attack),dt=dr.reduce((v,n)=>v+n,mods.defense),won=!turtle&&at>dt;
 if(turtle){d.cards.splice(d.cards.indexOf('turtle'),1);s.discard.push('turtle');}
 let preventedCity=null;
 if(won){
  if(t.city&&d.claim.cities[t.id]!==undefined&&!a.preventedCities.includes(t.id)){a.preventedCities.push(t.id);preventedCity=t.id;}
  t.owner=a.id;t.city=false;if(has(a,'spoils')){a.pop++;a.kn++;}if(has(a,'favor'))draw(s,a);
 }else if(has(d,'rally'))d.pop+=3;
 s.result={...b,ar,dr,at,dt,mods,turtle,won,preventedCity,defensiveReward:!won&&has(d,'rally')?3:0};s.battle=null;s.phase='playing';
 log(s,turtle?`${leader(d).name} invokes Guardian Turtle and holds ${t.name}.`:`${leader(won?a:d).name} wins ${at}–${dt}. ${won?'The settlement changes hands.':'The defender holds.'}`,'battle');syncClaims(s);return {ok:true};
}
function applyAction(s,a){
 if(s.phase==='won')return fail('This match has ended.');
 const p=active(s),t=s.tiles[p.pos];
 if(s.phase==='draft'){
  if(a.type!=='place'||!s.tiles[a.tile])return fail('Choose a location on the island.');
  p.pos=a.tile;log(s,`${leader(p).name} arrives at ${s.tiles[a.tile].name}.`,'setup');s.turnIndex++;
  if(s.turnIndex===s.players.length){s.turnIndex=0;s.phase='playing';s.turn=1;}return {ok:true};
 }
 if(s.phase==='battle')return a.type==='resolve'?resolveBattle(s):a.type==='battleOffer'?battleOffer(s,a):a.type==='battleReady'?battleReady(s,a):fail('Resolve the battle first.');
 switch(a.type){
 case 'move':if(p.ap<1||!neighbors(s,p).includes(a.tile))return fail('Move along a highlighted trail for 1 action.');p.ap--;p.pos=a.tile;p.visited.push(a.tile);log(s,`${leader(p).name} travels to ${s.tiles[a.tile].name}.`);break;
 case 'build':if(p.ap<1||t.owner!==null||p.pop<buildCost(p,t))return fail('You need an empty tile, 1 action, and enough population.');p.pop-=buildCost(p,t);p.ap--;t.owner=p.id;t.revealed=true;if(has(p,'harvest'))p[t.yield.type]+=t.yield.amount;log(s,`${leader(p).name} founds a settlement at ${t.name}: +${t.yield.amount} ${t.yield.type==='pop'?'population':'knowledge'} each turn.`,'build');break;
 case 'attack':return attack(s,p,t);
 case 'city':if(p.ap<1||t.owner!==p.id||t.city||!has(p,'city')||p.pop<10||owned(s,p).filter(t=>t.city).length>=2)return fail('City requires your settlement, City technology, 10 population and 1 action.');p.ap--;p.pop-=10;t.city=true;log(s,`${leader(p).name} establishes a city! Hold it until the next turn to win.`,'victory');break;
 case 'rest':if(p.ap<1||p.rested)return fail(p.rested?'You have already rested this turn.':'No actions remaining.');p.ap--;p.rested=true;p.pop++;p.kn++;log(s,`${leader(p).name} rests: +1 population, +1 knowledge.`);break;
 case 'research':if(!canResearch(p,a.tech))return fail('This technology requires more knowledge or a prerequisite.');p.kn-=TECHS.find(t=>t.id===a.tech).cost;grantTech(s,p,a.tech);log(s,`${leader(p).name} unlocks ${TECHS.find(t=>t.id===a.tech).name}.`,'research');break;
 case 'teleport':if(!p.teleports||!s.tiles[a.tile])return fail('No Wayfinder journey available.');p.teleports--;p.pos=a.tile;p.visited.push(a.tile);log(s,`${leader(p).name} uses Wayfinder to reach ${s.tiles[a.tile].name}.`);break;
 case 'tribute':{const ids=[...new Set(a.tiles||[])];if(!p.tribute||ids.length<1||ids.length>2||ids.some(id=>s.tiles[id]?.owner!==p.id))return fail('Choose one or two of your settlements.');ids.forEach(id=>{const y=s.tiles[id].yield;p[y.type]+=y.amount;});p.tribute=false;log(s,`${leader(p).name} collects Tribute.`);break;}
 case 'buyCard':if(p.pop<5||(!s.deck.length&&!s.discard.length))return fail('A spirit card costs 5 population; the deck must have a card.');p.pop-=5;draw(s,p);log(s,`${leader(p).name} draws a spirit card.`,'spirit');break;
 case 'card':{
  const k=a.card;if(!p.cards.includes(k)||k==='turtle'||p.played>=(has(p,'spiritual')?2:1))return fail('You cannot play that card now.');
  if(['eagle','tiger'].includes(k)&&!s.tiles[a.tile])return fail('Choose a target location.');
  if(k==='tiger'&&(s.tiles[a.tile].owner===null||s.tiles[a.tile].owner===p.id))return fail('Choose an enemy settlement.');
  if(k==='fox'&&!stealable(s,p).some(v=>v.player===a.player&&v.tech===a.tech))return fail('Choose an eligible rival technology.');
  p.cards.splice(p.cards.indexOf(k),1);s.discard.push(k);p.played++;log(s,`${leader(p).name} invokes ${CARDS[k].name}.`,'spirit');
  if(k==='jaguar')p.ap+=2;if(k==='owl')p.kn+=4;if(k==='eagle')p.pos=a.tile;
  if(k==='fox'){const q=s.players[a.player];q.techs=q.techs.filter(id=>id!==a.tech);if(a.tech==='stamina')q.ap=Math.max(0,q.ap-1);if(a.tech==='wayfinder')q.teleports=0;if(a.tech==='tribute')q.tribute=false;if(a.tech==='warcry')q.warcry=false;grantTech(s,p,a.tech,true);log(s,`${leader(p).name} steals ${TECHS.find(t=>t.id===a.tech).name} from ${leader(q).name}.`,'spirit');}
  if(k==='tiger')return attack(s,p,s.tiles[a.tile],true);break;
 }
 case 'end':syncClaims(s);s.turnIndex=(s.turnIndex+1)%s.players.length;s.turn++;if(!s.turnIndex)s.round++;break;
 default:return fail('Unknown action.');
 }
 syncClaims(s);return {ok:true};
}
export function route(s,p,target){const queue=[[p.pos]],seen=new Set([p.pos]);while(queue.length){const path=queue.shift(),id=path.at(-1);if(id===target)return path;for(const n of neighbors(s,p,id))if(!seen.has(n)){seen.add(n);queue.push([...path,n]);}}return [];}
export function aiBattleAction(s,id){
 const b=s.battle,p=s.players[id],defending=id===b.defender;
 if(b.ready[id])return null;
 if(defending&&p.cards.includes('turtle'))return {type:'battleReady',player:id,turtle:true};
 const mods=combatBonuses(s),own=defending?mods.defense:mods.attack,opponent=defending?mods.attack:mods.defense;
 const reserve=leader(p).style==='Conqueror'?2:4,max=Math.floor(Math.max(0,p.pop-reserve)/2)*2;
 // Public bids only. AI raises monotonically within its budget so counteroffers terminate.
 const desired=Math.min(max,b.offers[id]+Math.max(0,opponent-own+(defending?0:1))*2);
 if(desired>b.offers[id])return {type:'battleOffer',player:id,population:desired};
 return {type:'battleReady',player:id};
}
export function aiAction(s){
 const p=active(s),l=leader(p);
 if(s.phase==='draft'){
  const occupied=s.players.filter(q=>q.pos!==null).map(q=>s.tiles[q.pos]);const options=s.tiles.filter(t=>t.biome===0).map(t=>({t,v:occupied.length?Math.min(...occupied.map(o=>(o.x-t.x)**2+(o.y-t.y)**2)):random(s)*100})).sort((a,b)=>b.v-a.v);return {type:'place',tile:options[0].t.id};
 }
 if(s.phase==='battle')return aiBattleAction(s,s.battle.attacker)||aiBattleAction(s,s.battle.defender)||{type:'resolve'};
 if(s.phase!=='playing')return null;
 const t=s.tiles[p.pos],mine=owned(s,p),enemies=s.tiles.filter(t=>t.owner!==null&&t.owner!==p.id);
 const canCard=p.played<(has(p,'spiritual')?2:1);
 const imminent=enemies.filter(t=>t.city||s.players[t.owner].claim.settler!==null);
 if(canCard&&p.cards.includes('tiger')&&imminent.length)return {type:'card',card:'tiger',tile:imminent[0].id};
 if(canCard&&p.cards.includes('owl'))return {type:'card',card:'owl'};
 if(canCard&&p.cards.includes('jaguar')&&p.ap===0)return {type:'card',card:'jaguar'};
 if(canCard&&p.cards.includes('fox')){const candidates=stealable(s,p).sort((a,b)=>TECHS.find(t=>t.id===b.tech).cost-TECHS.find(t=>t.id===a.tech).cost);if(candidates.length)return {type:'card',card:'fox',...candidates[0]};}
 if(p.tribute&&mine.length)return {type:'tribute',tiles:[...mine].sort((a,b)=>b.yield.amount-a.yield.amount).slice(0,2).map(t=>t.id)};
 if(p.ap>0&&has(p,'city')&&t.owner===p.id&&!t.city&&p.pop>=10)return {type:'city'};
 const priorities=l.style==='Conqueror'?['hunter','spoils','ferocity','city','archery','wartribe']:l.style==='Explorer'?['nomad','stamina','tent','city','rally']:l.style==='Scholar'?['spiritual','growth','wisdom','city','shields']:['gatherer','harvest','fertility','city','wartribe'];
 // Easy opponents invest less consistently. Every difficulty obeys the same economy and hidden information.
 const planned=priorities.find(id=>!has(p,id));
 if(p.kn<30&&planned&&canResearch(p,planned)&&(s.difficulty!=='easy'||random(s)>.45))return {type:'research',tech:planned};
 if(p.ap===0){if(p.pop>14&&p.cards.length<3&&s.deck.length)return {type:'buyCard'};return {type:'end'};}
 if(t.owner!==null&&t.owner!==p.id&&p.pop>=attackCost(t)&&(p.attacks<2||imminent.some(e=>e.id===t.id)))return {type:'attack'};
 if(t.owner===null&&p.pop>=buildCost(p,t))return {type:'build'};
 const goals=s.tiles.filter(g=>g.id!==p.pos).map(g=>{
  const path=route(s,p,g.id),distance=path.length-1;
  let value=-100;
  if(g.owner===null&&p.pop>=buildCost(p,g))value=8+g.biome*1.5-distance*2;
  if(g.owner!==null&&g.owner!==p.id&&p.pop>=attackCost(g))value=(l.style==='Conqueror'?9:5)+(g.city?24:0)+(s.players[g.owner].claim.settler!==null?16:0)-distance*2;
  if(g.owner===p.id&&!g.city&&has(p,'city')&&p.pop>=10)value=30-distance*2;
  // Revealed yields only; never consult a hidden yield when planning.
  if(g.revealed&&g.owner!==p.id)value+=g.yield.amount*.4;
  if(p.visited.includes(g.id))value-=4;
  return {g,path,value};
 }).sort((a,b)=>b.value-a.value);
 const best=goals[0];
 if(best?.value>0){
  if(p.teleports&&best.path.length>2)return {type:'teleport',tile:best.g.id};
  if(canCard&&p.cards.includes('eagle')&&best.path.length>2)return {type:'card',card:'eagle',tile:best.g.id};
  if(best.path[1]!==undefined&&!p.visited.includes(best.path[1]))return {type:'move',tile:best.path[1]};
 }
 return {type:p.rested?'end':'rest'};
}
