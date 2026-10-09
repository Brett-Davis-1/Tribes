import {GAME_VERSION,BIOMES,diceSides,aiBattleAction,LEADERS,TECHS,CARDS,MAP,EDGES,leader,active,owned,has,income,buildCost,attackCost,neighbors,createGame,act,canResearch,stealable,combatBonuses,aiAction,ensureAudit,gameAudit} from './engine.mjs';
import {gameAudit as legacyAudit} from './rules-history/engine-v1/engine.mjs';
import {auditCSV,auditHTML} from './audit.mjs';
import {persistReport,listReports,readReport} from './audit-store.mjs';
import {HARD_BOT_VERSION} from './engine.mjs';
import {resourceIcon} from './resource-icons.mjs';
import {TREE_SIZE,knowledgeTree,knowledgeDetail} from './knowledge-tree.mjs';
const root=document.querySelector('#app'),dialog=document.querySelector('#dialog'),playtest=new URLSearchParams(location.search).has('playtest'),SAVE=playtest?'tribes-island-ui-test':'tribes-island-v1';
let game=null,selected=null,picked='ku',opponents=2,difficulty=new URLSearchParams(location.search).get('difficulty')==='hard'?'hard':'normal',mode=null,timer=null,fast=false,modal=null,storageOK=true;
let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE)||'null');if(saved&&![1,GAME_VERSION].includes(saved.version))saved=null;}catch{storageOK=false;}
let lastArchived='',archiveError='',archivePending=Promise.resolve(),reportToExport=null;
let selectedSkill='city',treeZoom='fit';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const human=()=>game.players.find(p=>p.human);
const isTurn=()=>game?.phase==='playing'&&active(game).human;
const disabled=b=>b?' disabled':'';
const techName=id=>TECHS.find(t=>t.id===id)?.name||id;
const asset=id=>`assets/${id}.png`;
// Frame each face from the original card art without duplicating image assets.
const faceFrames={ku:[900,335,400,230],asinya:[900,325,395,265],herysi:[900,325,360,230],hecatl:[825,300,280,205],tao:[825,305,255,200],daikotei:[825,300,295,205]};
function ownerPortrait(p){const [width,x,y,size]=faceFrames[p.leader];return `<span class="tile-owner" aria-hidden="true"><img src="${asset(p.leader)}" alt="" style="width:${width/size*100}%;left:${-x/size*100}%;top:${-y/size*100}%"></span>`;}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function archiveGame(s){
 if(playtest)return Promise.resolve();
 if(s.version===GAME_VERSION)ensureAudit(s);else if(!s.audit)legacyAudit(s);const signature=`${s.audit.gameId}:${s.audit.events.length}:${s.phase}`;if(signature===lastArchived)return archivePending;
 lastArchived=signature;const report=s.version===GAME_VERSION?gameAudit(s):legacyAudit(s);
 archivePending=archivePending.catch(()=>{}).then(()=>persistReport(report)).then(()=>{archiveError='';}).catch(error=>{lastArchived='';archiveError=error.message||'Local audit history is unavailable.';toast('Audit history could not be saved. Download this game’s report before starting another.');});return archivePending;
}
function save(){if(!game)return;ensureAudit(game);archiveGame(game);try{localStorage.setItem(SAVE,JSON.stringify(game));saved=game;}catch{if(storageOK)toast('Browser storage is unavailable. Keep this tab open and export your audit before leaving.');storageOK=false;}}
function header(playing=false){return `<header class="topbar"><div class="brand">TRIBES<small>OF THE LOST ISLAND</small></div><div class="row">${playing?`<span class="pill">Round ${game.round}</span><span class="pill">${game.difficulty==='hard'?'Hard bots':game.difficulty==='easy'?'Relaxed bots':'Standard bots'}</span><button class="small ghost" data-action="speed">${fast?'Fast turns':'Normal speed'}</button><button class="small ghost" data-action="menu">Menu</button><button class="small ghost" data-action="audit">Export audit</button>`:'<span class="pill">Single-player strategy</span><button class="small ghost" data-action="auditHistory">Game audits</button>'}<button class="small ghost" data-action="rules">How to play</button></div></header>`;}
function landing(){
 clearTimeout(timer);game=null;mode=null;selected=null;
 const l=LEADERS.find(l=>l.id===picked);
 root.innerHTML=header()+`<section class="landing"><div class="intro"><div class="intro-copy"><div class="eyebrow">An island. Six tribes. Your legacy.</div><h1 style="margin-top:18px">Claim your place<br>on the lost island.</h1><p>Lead your tribe from a first settlement to a lasting civilization. Explore the island, awaken ancient spirits, and outwit rival leaders.</p><div class="row"><span class="pill">Explore</span><span class="pill">Build</span><span class="pill">Discover</span><span class="pill">Conquer</span></div></div><div class="intro-art"><img src="assets/board.png" alt="The Lost Island: beaches, mangroves and a glowing caldera"></div></div><div class="row between setup-title"><h2>Choose your leader</h2><span class="eyebrow">01 / Your tribe</span></div><div class="leaders">${LEADERS.map(l=>`<button class="leader-choice ${picked===l.id?'selected':''}" data-leader="${l.id}" aria-pressed="${picked===l.id}"><img class="portrait" src="${asset(l.id)}" alt="${l.name}" loading="lazy">${picked===l.id?'<span class="check">✓</span>':''}<div class="copy"><strong>${l.name}</strong><div class="subtitle">${l.title}</div></div></button>`).join('')}</div><div class="launch"><div><p><strong>${l.name}</strong> · ${l.pop} population · ${l.kn} knowledge</p><p style="margin-top:6px">${l.bonus}</p></div><div class="setup-options"><label>Rival tribes<select id="opponents"><option value="1" ${opponents===1?'selected':''}>1 computer tribe</option><option value="2" ${opponents===2?'selected':''}>2 computer tribes</option><option value="3" ${opponents===3?'selected':''}>3 computer tribes</option></select></label><label>Difficulty<select id="difficulty"><option value="easy" ${difficulty==='easy'?'selected':''}>Relaxed</option><option value="normal" ${difficulty==='normal'?'selected':''}>Standard</option><option value="hard" ${difficulty==='hard'?'selected':''}>Hard</option></select></label><div>${saved&&saved.phase!=='won'?(saved.version===GAME_VERSION?'<button class="resume" data-action="resume">Resume</button>':'<button class="resume" data-action="legacyAudit">Export earlier match</button>'):''}<button class="primary" data-action="start">Begin your journey →</button></div></div></div><p class="subtle-note">Rules edition 2 · Matches save automatically on this browser.${saved?.version===1?' Your earlier match remains available for audit export. Start a new match to use the updated rules.':''}</p></section>`;
}
function board(){
 const p=active(game),can=isTurn(),adj=can&&p.ap>0?neighbors(game,p):[],isDraft=game.phase==='draft';
 let lines=EDGES.filter(([a,b,h])=>(a===p.pos||b===p.pos)&&(!h||has(p,'nomad'))).map(([a,b,h])=>`<line x1="${MAP[a].x}" y1="${MAP[a].y}" x2="${MAP[b].x}" y2="${MAP[b].y}" class="${h?'hidden-route':''}"/>`).join('');
 if(isDraft)lines='';
 return `<div class="board-wrap"><img class="board-art" src="assets/board.png" alt="Lost Island game board"><svg class="routes" viewBox="0 0 100 100" aria-hidden="true">${lines}</svg>${game.tiles.map(t=>{
  const owner=t.owner===null?null:game.players[t.owner],target=mode?.kind==='eagle'||mode?.kind==='teleport'||(mode?.kind==='tiger'&&owner&&owner.id!==human().id);
  const highlight=(isDraft&&p.human)||adj.includes(t.id)||target;
  const label=`${t.name}${t.owner===null?', unexplored':`, ${leader(owner).name} ${t.city?'city':'settlement'}, yields ${t.yield.amount} ${t.yield.type==='pop'?'population':'knowledge'}`}`;
  return `<button class="tile biome-${t.biome} ${highlight?'reachable':''} ${t.id===selected?'selected':''} ${owner?'settled':''}" style="left:${t.x}%;top:${t.y}%;${owner?`--owner:${leader(owner).color}`:''}" data-tile="${t.id}" aria-label="${label}" title="${label}">${owner?ownerPortrait(owner):`<span class="biome-mark" aria-hidden="true">${['B','M','C'][t.biome]}</span>`}${owner?`<span class="yield" aria-hidden="true" style="--yield-columns:${t.yield.amount===4?2:t.yield.amount}">${resourceIcon(t.yield.type,true).repeat(t.yield.amount)}</span>${t.city?'<span class="city-symbol">♜</span>':''}`:''}</button>`;
 }).join('')}${game.players.filter(p=>p.pos!==null).map(p=>{const t=game.tiles[p.pos],stack=game.players.filter(q=>q.pos===p.pos),j=stack.indexOf(p),dx=(j-(stack.length-1)/2)*3.7;return `<div data-pawn="${p.id}" class="pawn ${active(game).id===p.id?'current':''}" style="left:${t.x+dx}%;top:${t.y+3.1}%;--tribe:${leader(p).color}" title="${leader(p).name}"><img src="${asset(p.leader)}" alt="${leader(p).name} leader"></div>`;}).join('')}</div>`;
}
function tribeCombat(q){
 const attack=[['hunter',1],['ferocity',2],['wartribe',2]].filter(([id])=>has(q,id)).map(([id,value])=>({name:techName(id),value}));
 const defense=[['gatherer',1],['wartribe',2]].filter(([id])=>has(q,id)).map(([id,value])=>({name:techName(id),value}));
 if(q.warcry&&active(game).id===q.id)attack.push({name:'War Cry (this turn)',value:3});
 const row=(label,sources,isDefense)=>{
  const upgrade=has(q,isDefense?'shields':'archery'),dice=upgrade?'2D6':'D6 + D4';
  return `<div class="combat-line"><strong>${label} +${sources.reduce((n,s)=>n+s.value,0)}</strong><span>${dice}</span></div>${sources.length?`<div class="combat-sources">${sources.map(s=>`${s.name} +${s.value}`).join(' · ')}</div>`:''}${upgrade?`<div class="combat-upgrade">${isDefense?'Shields':'Archery'} · 2D6</div>`:''}`;
 };
 return `<div class="tribe-combat" aria-label="${leader(q).name} combat advantages">${row('Attack',attack,false)}${row('Defense',defense,true)}<div class="combat-context">Terrain, city &amp; leader defense added in battle.</div></div>`;
}
function pendingVictory(q){return q.claim.settler!==null||Object.keys(q.claim.cities).length>0;}
function pendingVictoryDetail(q){
 const cities=Object.keys(q.claim.cities).map(Number).map(id=>game.tiles[id]?.name).filter(Boolean);
 return cities.length?`City at ${cities.join(', ')} · hold until next turn`:'6 settlements · hold until next turn';
}
function applyPendingWarnings(me){
 const pending=game.players.filter(q=>pendingVictory(q));
 const cards=[...root.querySelectorAll('.tribe')];
 game.order.forEach((id,index)=>{
  const q=game.players[id],card=cards[index];
  if(!card||!pendingVictory(q))return;
  card.querySelector('.claim')?.remove();
  const warning=document.createElement('div');warning.className='win-warning';warning.setAttribute('role','status');warning.textContent='⚠ Player at win condition';
  const detail=document.createElement('div');detail.className='claim';detail.textContent=pendingVictoryDetail(q);
  card.append(warning,detail);
 });
 const threats=pending.filter(q=>q.id!==me.id);
 if(threats.length){
  const warning=document.createElement('div');warning.className='win-warning main-warning';warning.setAttribute('role','alert');warning.textContent='⚠ Player at win condition';
  const names=document.createElement('small');names.textContent=threats.map(q=>leader(q).name).join(' · ');warning.append(names);
  root.querySelector('.center-top')?.after(warning);
 }
 for(const tile of game.tiles){
  const owner=tile.owner===null?null:game.players[tile.owner];
  const threatened=owner&&pendingVictory(owner);
  if(!threatened)continue;
  const button=root.querySelector(`[data-tile="${tile.id}"]`);if(!button)continue;
  button.classList.add('win-threat');
  const label=`${button.getAttribute('aria-label')}, player at win condition`;
  button.setAttribute('aria-label',label);button.title=label;
  const badge=document.createElement('span');badge.className='tile-win-warning';badge.setAttribute('aria-hidden','true');badge.textContent='⚠';button.append(badge);
 }
}
function render(){
 if(!game)return landing();
 const previous=new Map([...root.querySelectorAll('[data-pawn]')].map(el=>[el.dataset.pawn,{x:parseFloat(el.style.left),y:parseFloat(el.style.top)}]));
 const me=human(),p=active(game),l=leader(p),my=income(game,me),draft=game.phase==='draft',turn=isTurn(),t=game.tiles[selected??me.pos],here=t?.id===me.pos;
 const heading=draft?(p.human?'Choose your landing':'The tribes are arriving'):game.phase==='won'?'A new legacy begins':p.human?'Your tribe awaits':'The island is in motion';
 const subtitle=draft?`${l.name} rolled ${p.roll}. ${p.human?'Select any space, then establish your arrival.':'Choosing a starting location…'}`:p.human?'Select a space to inspect it. Highlighted trails show where you can move.':`${l.name} is taking a turn · ${l.style}`;
 root.innerHTML=header(true)+`<div class="game"><aside class="left-panel"><div class="eyebrow" style="margin-bottom:16px">Tribes of the island</div>${game.order.map(id=>{
  const q=game.players[id],count=owned(game,q).length,cities=owned(game,q).filter(t=>t.city).length;return `<section class="tribe ${q.id===p.id?'active':''}" style="--tribe:${leader(q).color}"><div class="row"><img class="avatar" src="${asset(q.leader)}" alt=""><div><div class="name">${leader(q).name}</div><div class="role">${q.human?'Your tribe':leader(q).style+' · Computer'}</div></div></div><div class="tribe-stats" title="Population · Knowledge · Settlements"><span aria-label="${q.pop} population">${resourceIcon('pop')} ${q.pop}</span><span aria-label="${q.kn} knowledge">${resourceIcon('kn')} ${q.kn}</span><span>⌂ ${count}${cities?' · ♜ '+cities:''}</span></div>${tribeCombat(q)}<div class="settler-track" aria-label="${count} of 6 settlements">${Array.from({length:6},(_,i)=>`<i class="${i<count?'filled':''}"></i>`).join('')}</div><div class="science-track">Science ${q.kn}/40 · Kingmaker ${q.preventedCities.length}/2</div>${q.claim.settler!==null||Object.keys(q.claim.cities).length?'<div class="claim">◈ Victory pending · hold until next turn</div>':''}</section>`;
 }).join('')}<div class="divider"></div><div class="win-goal"><div class="eyebrow" style="margin-bottom:10px">Four paths to victory</div><strong>Build a civilization.</strong><br>Hold 6 settlements until your next turn.<div style="height:12px"></div><strong>Raise a city.</strong><br>Research City, upgrade a settlement, and defend it until your next turn.<div style="height:12px"></div><strong>Science.</strong><br>Reach 40 knowledge to win immediately.<div style="height:12px"></div><strong>Kingmaker.</strong><br>Capture cities at two different locations before their owners win. Immediate victory.</div></aside><section class="center"><div class="center-top"><div class="eyebrow">${draft?'The arrival':`Round ${game.round} / ${p.human?'Your turn':l.name}`}</div><h2>${!p.human&&game.phase!=='won'?'<span class="thinking"></span>':''}${heading}</h2><p>${subtitle}</p></div>${mode?`<div class="instruction">${mode.kind==='tiger'?'Choose a rival settlement to teleport and attack.':mode.kind==='tribute'?'Choose up to two of your settlements to collect their yields.':'Choose any destination on the island.'} <button class="small ghost" data-action="cancelMode">Cancel</button></div>`:''}${board()}<div class="board-caption"><span>Portrait = owner · B Beach · M Mangrove · C Caldera</span><span>${storageOK?'Progress saved on this browser':'Session only · storage unavailable'} · 24 randomized tiles</span></div></section><aside class="right-panel"><div class="eyebrow" style="margin-bottom:12px">${leader(me).name} / Your tribe</div><div class="resources"><div class="resource"><div class="label">Population</div><span class="value">${resourceIcon('pop')} ${me.pop}</span><small>+${my.pop} each turn</small></div><div class="resource"><div class="label">Knowledge</div><span class="value">${resourceIcon('kn')} ${me.kn}</span><small>+${my.kn} each turn</small></div></div><button class="research-open" data-action="research"><span>Knowledge tree</span><span class="mint">${me.techs.length} unlocked ↗</span></button><div class="action-points"><span>Actions</span>${Array.from({length:Math.max(2,Math.min(8,me.ap))},(_,i)=>`<i class="ap-dot ${i<me.ap&&turn?'on':''}"></i>`).join('')}<span style="margin-left:auto">${turn?me.ap:0} remaining</span></div>${draft&&p.human?'<div class="instruction">Your first decision: land on any space. Biomes are shuffled: B = Beach, M = Mangrove, C = Caldera. Beach tiles are cheaper wherever they appear.</div>':''}<div class="location"><div class="eyebrow">${t?'Selected location':'Explore the island'}</div><h3>${t?t.name:'Choose a space'}</h3><p>${t?(t.owner===null?'Unexplored land. Its yield is revealed when a settlement is built.':`${leader(game.players[t.owner]).name} ${t.city?'city':'settlement'} · +${t.yield.amount} ${t.yield.type==='pop'?'population':'knowledge'} / turn.`):'Inspect a location to see its available actions.'}</p><div class="actions">${draft&&p.human?`<button class="primary" data-action="place"${disabled(!t)}>Land here <small>Choose starting position</small></button>`:t?`${!here?`<button class="primary" data-action="move"${disabled(!turn||me.ap<1||!neighbors(game,me).includes(t.id))}>Move here <small>1 action</small></button>`:''}${here&&t.owner===null?`<button class="primary" data-action="build"${disabled(!turn||me.ap<1||me.pop<buildCost(me,t))}>Build settlement <small>1 action · ${buildCost(me,t)} pop</small></button>`:''}${here&&t.owner!==null&&t.owner!==me.id?`<button class="primary" data-action="attack"${disabled(!turn||me.ap<1||me.pop<attackCost(t))}>Attack settlement <small>1 action · ${attackCost(t)} pop</small></button>`:''}${here&&t.owner===me.id&&!t.city?`<button class="primary" data-action="city"${disabled(!turn||me.ap<1||!has(me,'city')||me.pop<10||owned(game,me).filter(t=>t.city).length>=2)}>Raise a city <small>${has(me,'city')?'1 action · 10 pop':'Requires City technology'}</small></button>`:''}<button data-action="rest"${disabled(!turn||me.ap<1||me.rested)}>Rest <small>${me.rested?'Used this turn':'1 action · +1 pop, +1 knowledge · once/turn'}</small></button>`:''}${me.teleports?`<button data-action="wayfinder"${disabled(!turn)}>Wayfinder <small>One free journey</small></button>`:''}${me.tribute?`<button data-action="tribute"${disabled(!turn||!owned(game,me).length)}>Collect Tribute <small>Two settlements</small></button>`:''}</div></div>${!draft?`<button class="end-turn ${turn?'primary':''}" data-action="end"${disabled(!turn)}>${game.phase==='won'?'Match complete':turn?'End turn →':'Waiting for rival tribes…'}</button>`:''}<div class="section-label"><span>Spirit cards · ${me.cards.length}</span><button class="small ghost" data-action="buyCard"${disabled(!turn||me.pop<5||!game.deck.length&&!game.discard.length)}>Draw · 5 pop</button></div><div class="hand">${me.cards.length?[...new Set(me.cards)].map(k=>`<button data-card="${k}" aria-label="${CARDS[k].name}"><img src="${asset(k)}" alt="${CARDS[k].name}"><span class="count">${me.cards.filter(c=>c===k).length}</span></button>`).join(''):'<span class="empty-hand">Call upon the island’s spirits for a powerful advantage.</span>'}</div><div class="log"><h3>Island chronicle</h3>${game.log.slice(0,7).map(e=>`<div class="log-entry ${e.type}">${escape(e.text)}</div>`).join('')}</div></aside></div>`;
 applyPendingWarnings(me);
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const width=root.querySelector('.board-wrap').clientWidth;for(const el of root.querySelectorAll('[data-pawn]')){const from=previous.get(el.dataset.pawn);if(!from)continue;const dx=(from.x-parseFloat(el.style.left))*width/100,dy=(from.y-parseFloat(el.style.top))*width/100;if(dx||dy)el.animate([{transform:`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`},{transform:'translate(-50%, -50%)'}],{duration:fast?100:420,easing:'ease-in-out'});}}
 save();schedule();
}
function showModal(kind,html){clearTimeout(timer);modal=kind;dialog.dataset.kind=kind;dialog.innerHTML=`<button class="close ghost" data-action="close" aria-label="Close dialog">✕</button>${html}`;if(!dialog.open)dialog.showModal();}
function closeModal(){dialog.close();modal=null;if(game?.phase==='won')return;schedule();}
dialog.addEventListener('cancel',e=>{if(modal==='combat'){e.preventDefault();return;}modal=null;schedule();});
dialog.addEventListener('click',e=>{if(e.target===dialog&&modal!=='combat')closeModal();});
function sizeKnowledgeTree(){
 const viewport=dialog.querySelector('.tree-viewport');if(!viewport)return;
 const scale=treeZoom==='fit'?Math.min(1,(viewport.clientWidth-18)/TREE_SIZE.width):treeZoom;
 const frame=viewport.querySelector('.tree-frame');frame.style.width=`${TREE_SIZE.width*scale}px`;frame.style.height=`${TREE_SIZE.height*scale}px`;
 viewport.querySelector('.knowledge-map').style.transform=`scale(${scale})`;
 dialog.querySelector('[data-action="treeZoom"]').textContent=treeZoom==='fit'?'Enlarge':'Fit tree';
}
window.addEventListener('resize',()=>{if(modal==='research')sizeKnowledgeTree();});
function research(skill=selectedSkill){
 selectedSkill=skill;
 const old=dialog.querySelector('.tree-viewport'),scroll={left:old?.scrollLeft||0,top:old?.scrollTop||0},p=human();
 showModal('research',`<div class="eyebrow">Knowledge is your advantage</div><h2>The knowledge tree</h2><p class="tree-intro">${resourceIcon('kn')} <strong>${p.kn} knowledge</strong> · Research uses no actions. Follow arrows upward; any one incoming prerequisite unlocks a path.</p><div class="tree-toolbar"><span>Portraits show every tribe that owns a skill. Select a skill for details.</span><button class="small ghost" data-action="treeZoom">Enlarge</button><button class="small ghost" data-action="originalTree">Original artwork</button></div><div class="research-layout"><div class="tree-viewport" tabindex="0" role="region" aria-label="Knowledge tree; scroll to explore when enlarged">${knowledgeTree(game,p,selectedSkill,ownerPortrait)}</div><aside class="skill-detail">${knowledgeDetail(game,p,selectedSkill,ownerPortrait,isTurn())}</aside></div>`);
 sizeKnowledgeTree();const viewport=dialog.querySelector('.tree-viewport');viewport.scrollLeft=scroll.left;viewport.scrollTop=scroll.top;
}
function auditMenu(report=null){
 reportToExport=report||gameAudit(game);const r=reportToExport;
 showModal('audit',`<div class="eyebrow">Playtest records</div><h2>Audit this game</h2><p>${r.events.length} recorded events · ${r.status==='completed'?'Completed':'In progress'} · ${r.coverage==='complete'?'Recorded from setup':'Partial recording'}</p><p class="${r.coverage==='partial'?'instruction':'muted'}">${escape(r.coverageNote)}</p><div class="audit-downloads"><button class="primary" data-export="html">Readable report <small>HTML · filter by player or search events</small></button><button data-export="csv">Spreadsheet log <small>CSV · before, change and after balances</small></button><button data-export="json">Full audit data <small>JSON · setup, dice, actions and exact state changes</small></button></div><p>Reports include every tribe’s actions, turn income, population, knowledge, action points, cards, technologies and settlement changes. Combat records include dice, modifiers and results.</p><p class="subtle-note">Exports reveal all players’ hands and hidden tile yields. All timestamps in the files are UTC. The audit history stays on this browser; download reports to keep an independent copy.</p>${archiveError?`<p class="instruction">Local history could not be saved: ${escape(archiveError)}. The download buttons still work.</p>`:''}<div class="modal-actions"><button data-action="auditHistory">All game audits</button><button data-action="close">Return to game</button></div>`);
}
async function auditHistory(){
 showModal('auditHistory','<h2>Game audit history</h2><p>Loading saved reports…</p>');
 try{
  if(game)await archiveGame(game);else if(saved)await archiveGame(saved);await archivePending;
  const reports=await listReports();if(modal!=='auditHistory')return;
  const date=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
  showModal('auditHistory',`<div class="eyebrow">Your playtesting archive</div><h2>Game audit history</h2><p>Every recorded game is kept here, including unfinished matches. Dates below use Central Time.</p>${archiveError?`<p class="instruction">${escape(archiveError)}</p>`:''}<div class="audit-history">${reports.length?reports.map(r=>`<section class="audit-history-row"><div><strong>${escape(r.players.map(p=>p.name+(p.human?' (you)':'')).join(' · '))}</strong><p>${date(r.startedAt)} · Round ${r.round} · ${r.events} events<br>${r.status==='completed'?escape(r.players.find(p=>p.id===r.winner)?.name)+' wins by '+escape(r.victory):'Unfinished match'} · ${r.coverage==='partial'?'Partial recording':'Complete recording'}</p></div><button data-report="${escape(r.gameId)}">View exports</button></section>`).join(''):'<p>No recorded games yet. Start a match to begin recording.</p>'}</div><p class="subtle-note">History is stored locally and can be lost if browser data is cleared. Reports already downloaded remain yours.</p>`);
 }catch(error){if(modal==='auditHistory')showModal('auditHistory',`<h2>Audit history is unavailable</h2><p>${escape(error.message)}</p>${game?'<button data-action="audit">Export the current game instead</button>':''}`);}
}
function downloadAudit(format){
 const r=reportToExport;if(!r)return;
 const content=format==='html'?auditHTML(r):format==='csv'?auditCSV(r):JSON.stringify(r,null,2);
 const type={html:'text/html;charset=utf-8',csv:'text/csv;charset=utf-8',json:'application/json'}[format];
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=`${r.gameId}-event-${r.events.length}.${format}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast(`${format.toUpperCase()} audit download requested.`);
}
function cardModal(k){const p=human(),available=isTurn()&&p.played<(has(p,'spiritual')?2:1)&&k!=='turtle';showModal('card',`<div class="card-detail"><img src="${asset(k)}" alt="${CARDS[k].name} card"><div><div class="eyebrow">Spirit of the island</div><h2>${CARDS[k].name}</h2><p>${CARDS[k].text}</p><p>${k==='turtle'?'You will be offered this card before a rival rolls an attack against you.':`${p.played} of ${has(p,'spiritual')?2:1} spirit cards played this turn.`}</p>${k!=='turtle'?`<button class="primary" data-play="${k}"${disabled(!available)}>Invoke spirit</button>`:''}</div></div>`);}
function rules(){showModal('rules',`<div class="eyebrow">Rules edition 2</div><h2>Build a tribe. Leave a legacy.</h2><p><a href="rules-reference.html" target="_blank" rel="noopener" style="color:var(--gold)">Open the complete living rules document ↗</a></p><div class="rules-grid"><section><h3>Every turn</h3><p>Collect income, then use 2 AP (+1 with Stamina). All leaders begin with 10 population and 5 knowledge, except Asinya begins with 16 population.</p><ul><li><strong>Move:</strong> 1 AP along a trail.</li><li><strong>Build:</strong> 1 AP and 4 / 8 / 12 population for beach / mangrove / caldera. Biomes are randomized across all spaces.</li><li><strong>Attack:</strong> 1 AP, no population entry cost. No exhaustion penalty.</li><li><strong>Rest:</strong> once per own turn, 1 AP for +1 population and +1 knowledge. You may continue your turn.</li></ul><h3>Research and spirits</h3><p>Research uses no AP. The latest supplied tree is used, with your dice clarification below. Drawing a spirit costs 5 population. Play 1 spirit per turn, or 2 with Spiritual. Nomad opens coastal routes for 1 AP.</p></section><section><h3>Four victories</h3><p><strong>Settlement:</strong> hold 6 until your next turn.<br><strong>City:</strong> research for 10 knowledge, upgrade for 10 population + 1 AP, then hold until your next turn.<br><strong>Science:</strong> 40 knowledge held at once; immediate.<br><strong>Kingmaker:</strong> capture cities at two distinct locations during their holding period; immediate.</p><h3>Battle</h3><p>Base D6 + D4. Archery gives 2D6 attack; Shields gives 2D6 defense. Ties favor defense. Beach / mangrove / caldera add +1 / +2 / +3 defense; a city adds +1.</p><p>Both sides may publicly commit 2 population per +1 to their roll. Adjustments reset both confirmations. Once both sides confirm, spending is charged and combat resolves. Guardian Turtle is selected with the defender's confirmation. No defensive payout unless Rallying Cry grants +3 population.</p><h3>Tile pool</h3><p>Choose 24 from a pooled 30. The provisional pool has 10 per biome, five population and five knowledge tiles each. Yields: beach 1; mangrove 2; caldera 4 population or 3 knowledge. Printed board scenery does not determine the tile biome.</p></section></div>`);}
function combatDialog(){
 const b=game.battle,mods=combatBonuses(game),me=human(),mine=b.offers[me.id];
 showModal('combat',`<div class="battle-heading"><div class="eyebrow">${game.tiles[b.tile].name}</div><h2>Commit your population</h2><p>2 population adds +1 to your roll. Both sides see every adjustment.<br>Changing either offer resets both confirmations. Population is charged when combat resolves.</p></div><div class="combat-offers">${[b.attacker,b.defender].map((id,i)=>{const p=game.players[id],amount=b.offers[id];return `<section><div class="eyebrow">${i?'Defense':'Attack'} · ${diceSides(p,!!i).map(n=>'D'+n).join(' + ')}</div><h3>${leader(p).name}</h3><p>${p.pop} population available</p><strong>${amount} population → +${amount/2}</strong><p>Total modifier: +${i?mods.defense:mods.attack}</p><span class="pill">${b.ready[id]?'Confirmed':'Adjusting / awaiting confirmation'}</span>${id===me.id?`<div class="bid-controls"><button data-action="bidLess" aria-label="Commit 2 less population"${disabled(amount<2)}>−2</button><button data-action="bidMore" aria-label="Commit 2 more population"${disabled(amount+2>p.pop)}>+2</button></div>`:''}</section>`;}).join('')}</div><p class="subtle-note">Biome defense +${game.tiles[b.tile].biome+1}${game.tiles[b.tile].city?' · City +1':''}. Ties favor the defender. No exhaustion penalty.${b.turtle?' Guardian Turtle declared.':''}</p><div class="modal-actions">${me.id===b.defender&&me.cards.includes('turtle')?'<button data-action="turtle">Confirm with Guardian Turtle</button>':''}<button class="primary" data-action="battleConfirm"${disabled(b.ready[me.id])}>${b.ready[me.id]?'Waiting for rival confirmation…':`Confirm ${mine} population`}</button></div>`);
 dialog.querySelector('.close').remove();
}
function battleResult(){const b=game.result;if(!b)return;const a=game.players[b.attacker],d=game.players[b.defender];showModal('result',`<div class="battle-heading"><div class="eyebrow">${game.tiles[b.tile].name}</div><h2>${leader(b.won?a:d).name} ${b.won?'takes the settlement':'holds the line'}</h2><p>${b.turtle?'Guardian Turtle protects the settlement.':b.won?'The settlement and its future income change hands.':`The defender wins ties.${b.defensiveReward?' Rallying Cry grants 3 population.':' No population reward.'}`}</p></div>${!b.turtle?`<div class="dice-row">${[[a,b.ar,b.mods.attack,b.at,'Attack'],[d,b.dr,b.mods.defense,b.dt,'Defense']].map(([p,rolls,mod,total,label])=>`<div class="dice-side"><div class="eyebrow">${label}</div><h3>${leader(p).name}</h3><div>${rolls.map(n=>`<span class="dice">${n}</span>`).join('')}</div><p>Modifiers: ${mod>=0?'+':''}${mod}</p><div class="total">${total}</div></div>`).join('')}</div>`:''}<div class="modal-actions"><button class="primary" data-action="close">Continue →</button></div>`);}
function winner(){const p=game.players[game.winner];showModal('winner',`<div class="battle-heading"><div class="eyebrow">${game.victory} victory · Round ${game.round}</div><img class="winner-art" src="${asset(p.leader)}" alt="${leader(p).name}"><h2>${p.human?'The island remembers your name.':`${leader(p).name} claims the island.`}</h2><p>${p.human?'Your tribe has secured its place on the Lost Island.':'A rival tribe has met the winning condition.'}</p><p>${owned(game,p).length} settlements · ${p.kn} knowledge · ${p.preventedCities.length} cities prevented</p><div class="modal-actions"><button data-action="audit">Export game audit</button><button class="primary" data-action="newGame">Another journey →</button></div></div>`);}
function perform(action,computer=false){
 if(computer)action={...action,botPolicy:game.difficulty==='hard'?HARD_BOT_VERSION:game.difficulty};
 const result=act(game,action);if(!result.ok){toast(result.message);return false;}
 if(modal==='combat'&&game.phase!=='battle'){dialog.close();modal=null;}
 if(['move','teleport','place','card'].includes(action.type))selected=active(game).human?active(game).pos:human().pos;
 if(action.type==='end')mode=null;
 render();if(game.phase==='won')winner();else if(action.type==='resolve'&&[game.result.attacker,game.result.defender].includes(human().id))battleResult();
 return true;
}
function schedule(){
 clearTimeout(timer);if(!game||game.phase==='won')return;
 if(dialog.open&&modal!=='combat')return;
 if(game.phase==='battle'){
  const b=game.battle,participants=[b.attacker,b.defender],involved=participants.includes(human().id);
  if(involved)combatDialog();
  if(participants.every(id=>b.ready[id])){timer=setTimeout(()=>perform({type:'resolve'}),fast?150:700);return;}
  const id=participants.find(id=>!game.players[id].human&&!b.ready[id]);
  if(id!==undefined)timer=setTimeout(()=>perform(aiBattleAction(game,id),true),fast?150:500);
  return;
 }
 if(!active(game).human){timer=setTimeout(()=>{const a=aiAction(game);if(a&&!perform(a,true)){toast('The rival could not complete an action. Passing its turn.');perform({type:'end'},true);}},fast?100:650);}
}
function start(){if(saved)archiveGame(saved);game=createGame({human:picked,opponents,difficulty});selected=null;render();window.scrollTo(0,0);}
function selectTile(id){
 if(!game)return;selected=id;
 if(mode&&isTurn()){
  if(mode.kind==='tribute'){if(game.tiles[id].owner!==human().id){toast('Choose one of your settlements.');return;}if(mode.tiles.includes(id))mode.tiles=mode.tiles.filter(t=>t!==id);else mode.tiles.push(id);if(mode.tiles.length>=Math.min(2,owned(game,human()).length)){const tiles=mode.tiles;mode=null;perform({type:'tribute',tiles});return;}toast('Choose one more settlement.');}
  else{const a=mode.kind==='teleport'?{type:'teleport',tile:id}:{type:'card',card:mode.kind,tile:id};if(perform(a)){mode=null;render();}return;}
 }
 render();
}
function playCard(k){
 if(!isTurn())return;
 if(k==='fox'){
  const options=stealable(game,human());if(!options.length){toast('No rival technology meets your prerequisites.');return;}
  showModal('fox',`<div class="eyebrow">Cunning Fox</div><h2>Claim a rival’s knowledge</h2><p>Steal a technology whose prerequisite you already own.</p><div class="fox-targets">${options.map(o=>`<button data-steal="${o.player}:${o.tech}">${techName(o.tech)} <span class="muted">· ${leader(game.players[o.player]).name}</span></button>`).join('')}</div>`);return;
 }
 closeModal();if(['eagle','tiger'].includes(k)){mode={kind:k};render();}else perform({type:'card',card:k});
}
document.addEventListener('change',e=>{if(e.target.id==='opponents')opponents=Number(e.target.value);if(e.target.id==='difficulty')difficulty=e.target.value;});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||b.disabled)return;
 if(b.dataset.export){downloadAudit(b.dataset.export);return;}
 if(b.dataset.report){readReport(b.dataset.report).then(r=>{if(r)auditMenu(r);else toast('This report could not be found.');}).catch(()=>toast('Could not read the saved report.'));return;}
 if(b.dataset.leader){picked=b.dataset.leader;landing();return;}
 if(b.dataset.tile!==undefined){selectTile(Number(b.dataset.tile));return;}
 if(b.dataset.card){cardModal(b.dataset.card);return;}
 if(b.dataset.play){playCard(b.dataset.play);return;}
 if(b.dataset.treeSkill){research(b.dataset.treeSkill);return;}
 if(b.dataset.tech){if(isTurn()&&perform({type:'research',tech:b.dataset.tech}))research();return;}
 if(b.dataset.steal){const [id,tech]=b.dataset.steal.split(':');closeModal();perform({type:'card',card:'fox',player:Number(id),tech});return;}
 const action=b.dataset.action;if(!action)return;
 if(action==='close'){closeModal();return;}
 if(action==='rules'){rules();return;}
 if(action==='audit'){auditMenu();return;}
 if(action==='legacyAudit'){if(saved)auditMenu(legacyAudit(saved));return;}
 if(action==='auditHistory'){auditHistory();return;}
 if(action==='start'){if(saved&&saved.phase!=='won'){showModal('replace',`<h2>Begin a new journey?</h2><p>A saved match already exists. Starting a new journey replaces it.</p><div class="modal-actions"><button data-action="close">Keep saved match</button><button class="primary" data-action="confirmStart">Start new match</button></div>`);}else start();return;}
 if(action==='confirmStart'){closeModal();start();return;}
 if(action==='resume'){try{game=JSON.parse(localStorage.getItem(SAVE));if(game.version!==GAME_VERSION)throw Error();selected=human().pos;render();if(game.phase==='won')winner();}catch{toast('Could not load this saved match. Please start a new journey.');}return;}
 if(action==='newGame'){closeModal();landing();return;}
 if(action==='speed'){fast=!fast;render();return;}
 if(action==='menu'){showModal('menu',`<h2>Your journey is saved.</h2><p>Resume whenever you are ready, on this browser.</p><div class="modal-actions"><button data-action="audit">Export audit</button><button data-action="auditHistory">Game history</button><button data-action="newGame">Leader selection</button><button class="primary" data-action="close">Return to the island</button></div>`);return;}
 if(action==='research'){research();return;}
 if(action==='treeZoom'){treeZoom=treeZoom==='fit'?1:'fit';sizeKnowledgeTree();return;}
 if(action==='originalTree'){showModal('tree',`<h2>Current knowledge tree</h2><p>Your latest dice clarification overrides the image: base D6 + D4; Archery and Shields use 2D6.</p><img class="tree-image" src="assets/knowledge-tree-current-5.png" alt="Current supplied knowledge tree with technology prerequisites and costs"><div class="modal-actions"><button data-action="research">Back to research</button></div>`);return;}
 if(action==='cancelMode'){mode=null;render();return;}
 if(game.phase==='battle'&&['bidLess','bidMore','battleConfirm','turtle'].includes(action)){const id=human().id;if(['bidLess','bidMore'].includes(action))perform({type:'battleOffer',player:id,population:game.battle.offers[id]+(action==='bidMore'?2:-2)});else perform({type:'battleReady',player:id,turtle:action==='turtle'});return;}
 if(action==='place'&&game.phase==='draft'&&active(game).human){perform({type:'place',tile:selected});return;}
 if(!isTurn())return;
 if(action==='wayfinder'){mode={kind:'teleport'};render();return;}
 if(action==='tribute'){mode={kind:'tribute',tiles:[]};render();return;}
 if(action==='move'){perform({type:'move',tile:selected});return;}
 if(['build','attack','city','rest','end','buyCard'].includes(action))perform({type:action});
});
landing();
