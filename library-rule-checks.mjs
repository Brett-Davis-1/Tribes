import assert from 'node:assert/strict';
export function verifyPermanentLibraries(e,players=4){
 function ready(){const s=e.createGame({seed:123,human:'ku',opponents:players-1,difficulty:'hard'});while(s.phase==='draft')assert.ok(e.act(s,{type:'place',tile:e.active(s).id*4}).ok);return s;}
 function setup(){const s=ready(),p=e.active(s),t=s.tiles[p.pos];t.owner=p.id;p.kn=24;p.pop=0;p.cards=[];p.techs=['city'];return {s,p,t};}
 const tech=t=>e.LIBRARY_TECHS[t.biome];
 function build(s){assert.ok(e.act(s,{type:'library'}).ok);}
 function end(s){assert.ok(e.act(s,{type:'end'}).ok);}
 function capture(s,a,d,t){a.pop=200;a.pos=t.id;a.ap=2;a.cards=[];d.cards=[];assert.ok(e.act(s,{type:'attack'}).ok);assert.ok(e.act(s,{type:'battleOffer',player:a.id,population:200}).ok);assert.ok(e.act(s,{type:'battleReady',player:a.id}).ok);assert.ok(e.act(s,{type:'battleReady',player:d.id}).ok);assert.ok(e.act(s,{type:'resolve'}).ok);assert.ok(s.result.won);}
 // City precedes research; each type costs 8 knowledge and zero AP.
 for(const biome of [0,1,2]){const {s,p,t}=setup();t.biome=biome;p.techs=[];p.kn=100;assert.equal(e.act(s,{type:'research',tech:tech(t)}).ok,false);p.techs=['city'];p.kn=7;assert.equal(e.act(s,{type:'research',tech:tech(t)}).ok,false);p.kn=8;const ap=p.ap;assert.ok(e.act(s,{type:'research',tech:tech(t)}).ok);assert.equal(p.kn,0);assert.equal(p.ap,ap);build(s);assert.equal(p.kn,0);assert.equal(p.pop,0);assert.equal(p.ap,ap-1);assert.deepEqual(p.libraries.map(l=>l.biome),[biome]);assert.deepEqual(t.libraryOwners,[p.id]);assert.equal(s.phase,'playing');}
 for(const invalid of ['city','technology','wrongType','empty','enemy','ap']){const {s,p,t}=setup();p.techs=['city',tech(t)];if(invalid==='city')p.techs=[tech(t)];if(invalid==='technology')p.techs=['city'];if(invalid==='wrongType')p.techs=['city',e.LIBRARY_TECHS[(t.biome+1)%3]];if(invalid==='empty')t.owner=null;if(invalid==='enemy')t.owner=(p.id+1)%4;if(invalid==='ap')p.ap=0;const before=e.auditState(s);assert.equal(e.act(s,{type:'library'}).ok,false);assert.deepEqual(e.auditState(s),before);}
 // One credit per biome, even on a different settlement.
 {const {s,p,t}=setup();p.techs.push(tech(t));build(s);const other=s.tiles.find(x=>x.id!==t.id&&x.biome===t.biome);other.owner=p.id;p.pos=other.id;assert.equal(e.act(s,{type:'library'}).ok,false);assert.equal(p.libraries.length,1);}
 // Capture, build at the same location, capture again: both libraries stay with their builders.
 {const {s,p,t}=setup();p.techs.push(tech(t));build(s);const original=structuredClone(p.libraries);end(s);const a=e.active(s);a.techs=['city',tech(t)];capture(s,a,p,t);assert.deepEqual(p.libraries,original);assert.deepEqual(a.libraries,[]);assert.deepEqual(t.libraryOwners,[p.id]);assert.equal(s.result.preventedCity,null);build(s);assert.deepEqual(t.libraryOwners,[p.id,a.id]);end(s);const b=e.active(s);capture(s,b,a,t);assert.deepEqual(t.libraryOwners,[p.id,a.id]);assert.deepEqual(p.libraries,original);assert.equal(a.libraries.length,1);assert.equal(b.libraries.length,0);assert.equal(b.preventedCities.length,0);}
 // Copy research only: source retains its library, recipient still must construct their own.
 {const {s,p,t}=setup(),q=s.players.find(q=>q.id!==p.id);q.techs=['city',tech(t)];q.libraries=[{biome:t.biome,tile:23,turn:1}];p.cards=['fox'];const kn=p.kn;assert.ok(e.act(s,{type:'card',card:'fox',player:q.id,tech:tech(t)}).ok);assert.equal(p.kn,kn);assert.ok(p.techs.includes(tech(t)));assert.ok(q.techs.includes(tech(t)));assert.equal(p.libraries.length,0);assert.equal(q.libraries.length,1);build(s);assert.equal(p.libraries.length,1);}
 // Researching all three does not win. Completing the third wins immediately, without holding old tiles.
 {const {s,p}=setup();p.ap=3;for(const id of e.LIBRARY_TECHS)assert.ok(e.act(s,{type:'research',tech:id}).ok);assert.equal(p.kn,0);assert.equal(s.phase,'playing');const turn=s.turn;
  for(const biome of [0,1,2]){const t=s.tiles.find(t=>t.biome===biome);t.owner=p.id;p.pos=t.id;build(s);if(biome<2){assert.equal(s.phase,'playing');t.owner=(p.id+1)%4;}else{assert.equal(s.phase,'won');assert.equal(s.victory,'Science');assert.equal(s.winner,p.id);assert.equal(s.turn,turn);}}
 }
 // Existing rules and defense remain unchanged; old automatic 40-knowledge victory stays off.
 {const {s,p,t}=setup();p.kn=100;assert.ok(e.act(s,{type:'rest'}).ok);assert.equal(s.phase,'playing');const q=s.players.find(q=>q.id!==p.id),battle={attacker:q.id,defender:p.id,tile:t.id,offers:{[q.id]:0,[p.id]:0}},before=e.combatBonuses(s,battle);p.techs.push(tech(t));build(s);assert.deepEqual(e.combatBonuses(s,battle),before);t.city=true;assert.equal(e.combatBonuses(s,battle).defense,before.defense+2);}
 for(const kind of ['City','Settler','Kingmaker']){const {s,p,t}=setup();if(kind==='Kingmaker'){p.preventedCities=[0,1];assert.ok(e.act(s,{type:'rest'}).ok);}else{if(kind==='City'){p.pop=e.cityCost?e.cityCost(t):5;assert.ok(e.act(s,{type:'city'}).ok);assert.equal(p.pop,0);}else{s.tiles.slice(0,e.settlementTarget(s)).forEach(t=>t.owner=p.id);assert.ok(e.act(s,{type:'rest'}).ok);}for(let i=0;i<players;i++)end(s);}assert.equal(s.victory,kind);}
 // Bot construction of the final biome and denial of a rival's unbuilt third type.
 {const {s,p,t}=setup();p.techs=['city',...e.LIBRARY_TECHS];p.libraries=[0,1,2].filter(b=>b!==t.biome).map((biome,i)=>({biome,tile:20+i,turn:0}));assert.equal(e.aiAction(s).type,'library');}
 {const {s,p,t}=setup(),q=s.players.find(q=>q.id!==p.id);p.techs=[];p.kn=0;q.techs=['city',tech(t)];q.libraries=[0,1,2].filter(b=>b!==t.biome).map((biome,i)=>({biome,tile:20+i,turn:0}));q.pos=t.id;t.owner=q.id;assert.equal(e.aiAction(s).type,'attack');}
 return {permanentLibraryRuleChecksPassed:true};
}
