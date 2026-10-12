import {LEADERS} from './engine.mjs';
const params=new URLSearchParams(location.search),key='tribes-private-seats-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const leaderName=id=>LEADERS.find(l=>l.id===id)?.name||id;
const choices=(selected,taken=[])=>LEADERS.map(l=>`<option value="${l.id}" ${selected===l.id?'selected':''} ${taken.includes(l.id)?'disabled':''}>${l.name}</option>`).join('');
let root,hooks,pollTimer,secret='',savedSeats={},polling=false;
export const multiplayer={enabled:params.has('multiplayer')||params.has('room'),room:null,busy:false,offline:false,pending:null,
 async boot(callbacks){
  root=document.querySelector('#app');hooks=callbacks;
  try{savedSeats=JSON.parse(localStorage.getItem(key)||'{}');}catch{savedSeats={};}
  root.addEventListener('click',handleClick);
  const code=(params.get('room')||'').toUpperCase();
  if(code&&savedSeats[code]){secret=savedSeats[code].token;this.code=code;try{await this.refresh();}catch(error){if([401,404].includes(error.status))this.forgetSeat(code);this.home(code,error.message);} }
  else this.home(code);
  pollTimer=setInterval(()=>this.poll(),1000);window.addEventListener('online',()=>this.poll());
 },
 home(code='',error=''){
  this.room=null;this.code='';secret='';
  root.innerHTML=`<header class="topbar"><div class="brand">TRIBES<small>PRIVATE ROOMS</small></div><a class="mp-link" href="./">Single-player</a></header><section class="landing mp-home"><div class="eyebrow">An island shared with friends</div><h1>Meet on the island.</h1><p>Create a room, invite your friends, and choose your leaders. Two to four seats, with optional hard bots.</p><p class="mp-error" role="alert">${esc(error)}</p><div class="mp-home-grid"><section class="mp-panel"><h2>Your tribe</h2><label>Your name<input id="mp-name" maxlength="24" autocomplete="nickname" placeholder="Your name"></label><label>Leader<select id="mp-leader">${choices('ku')}</select></label><button class="primary" data-mp="create">Create private room</button></section><section class="mp-panel"><h2>Have an invite?</h2><label>Room code<input id="mp-code" maxlength="10" value="${esc(code)}" placeholder="10-character room code" autocapitalize="characters"></label><p>Enter your name and leader, then join. Each leader can appear once.</p><button data-mp="join">Join room</button></section></div><h2>Your saved seats</h2><div class="mp-saved">${Object.entries(savedSeats).map(([c,s])=>`<a class="mp-link" href="?multiplayer=1&room=${encodeURIComponent(c)}">${esc(c)} · ${esc(s.name)} · ${esc(leaderName(s.leader))}</a>`).join('')||'<p>No saved multiplayer seats yet.</p>'}</div><p class="subtle-note">Your browser remembers your seat. Matches and audits are saved by the server. Reopen an invite in this browser to reconnect. To test two human players on this computer, open the invite in another browser or a private window.</p></section>`;
 },
 lobby(){
  const r=this.room,me=r.seats.find(s=>s.id===r.you),host=r.you===r.host,free=LEADERS.filter(l=>!r.seats.some(s=>s.leader===l.id));
  root.innerHTML=`<header class="topbar"><div class="brand">TRIBES<small>PRIVATE ROOM</small></div><a class="mp-link" href="?multiplayer=1">All rooms</a></header><section class="landing mp-lobby"><div class="eyebrow">Gather your tribe</div><h1>Room ${r.code}</h1><div class="mp-status" role="status"></div><p>Send this invite to your friends. Everyone chooses a leader and marks ready before the host starts.</p><div class="mp-invite"><input aria-label="Room invite link" readonly value="${esc(this.invite())}"><button data-mp="copy">Copy invite</button></div><div class="mp-seats">${r.seats.map(s=>`<section class="mp-seat"><img src="assets/${s.leader}.png" alt="${esc(leaderName(s.leader))}"><div><strong>${esc(s.name)}${s.id===r.you?' · You':''}${s.id===r.host?' · Host':''}</strong><p>${esc(leaderName(s.leader))}</p><span class="pill">${s.ready?'Ready':'Choosing a leader'}</span> <span class="mp-presence" data-presence="${s.id}">${s.bot?'Hard bot':s.online?'Connected':'Away'}</span></div>${host&&s.id!==r.host?`<button class="small ghost" data-mp="remove" data-seat="${s.id}">Remove</button>`:''}</section>`).join('')}</div><div class="mp-controls"><label>Your leader<select id="mp-own-leader">${choices(me.leader,r.seats.filter(s=>s.id!==r.you).map(s=>s.leader))}</select></label><button data-mp="leader">Change leader</button><button class="primary" data-mp="ready">${me.ready?'Not ready':'I’m ready'}</button></div>${host?`<div class="mp-controls"><label>Add a hard bot<select id="mp-bot-leader" ${!free.length?'disabled':''}>${free.map(l=>`<option value="${l.id}">${l.name}</option>`).join('')}</select></label><button data-mp="addBot" ${r.seats.length>=4?'disabled':''}>Add bot</button><button class="primary" data-mp="start" ${r.seats.length<2||r.seats.some(s=>!s.ready)?'disabled':''}>Start match</button></div>`:'<p>The host will start when everyone is ready.</p>'}<p class="subtle-note">All four victories are enabled, including Science at 40 knowledge. If someone disconnects during play, their seat stays reserved and the game waits when they must act.</p><p class="mp-error" role="alert"></p></section>`;
  this.status();
 },
 invite(){return `${location.origin}${location.pathname}?multiplayer=1&room=${this.code}`;},
 forgetSeat(code){delete savedSeats[code];try{localStorage.setItem(key,JSON.stringify(savedSeats));}catch{}},
 accept(r){
  if(this.room&&r.revision<this.room.revision)return;
  const changed=!this.room||r.revision!==this.room.revision||this.offline;this.room=r;this.offline=false;
  if(changed){if(r.game)hooks.onGame(r.game);else this.lobby();}
  for(const s of r.seats){const e=root.querySelector(`[data-presence="${s.id}"]`);if(e)e.textContent=s.bot?'Hard bot':s.online?'Connected':'Away';}
  this.status();
 },
 status(){
  const message=this.offline?'Connection lost. Reconnecting… Your seat and saved match are safe.':this.busy?'Saving action…':this.room&&!this.room.compatible?'This room needs its original rules version to resume.':this.room?.game?'Connected · Match saved on server':'Connected · Lobby saved';
  document.querySelectorAll('.mp-status').forEach(e=>{e.textContent=message;e.classList.toggle('mp-offline',this.offline);});
  document.querySelectorAll('[data-mp]').forEach(b=>{if(this.busy){if(!b.disabled)b.dataset.mpBusy='1';b.disabled=true;}else if(b.dataset.mpBusy){b.disabled=false;delete b.dataset.mpBusy;}});
 },
 async request(url,body){
  let response;try{response=await fetch(url,{method:body?'POST':'GET',headers:{...(secret?{Authorization:`Bearer ${secret}`} :{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000),cache:'no-store'});}catch{const e=new Error('Cannot reach the game server. Keep this page open to reconnect.');e.network=true;throw e;}
  let value;try{value=await response.json();}catch{throw new Error('Multiplayer needs the updated Node server. Start Tribes locally, then reopen this link.');}
  if(!response.ok){const e=new Error(value.error||'Request failed.');e.status=response.status;throw e;}return value;
 },
 async refresh(){this.accept(await this.request(`/api/rooms/${this.code}`));},
 async poll(){if(!this.code||polling||this.busy)return;polling=true;try{if(this.pending)await this.retryPending();else await this.refresh();}catch(error){this.offline=true;this.status();if(error.status===401||error.status===404){const code=this.code;this.forgetSeat(code);this.home(code,error.message);}}finally{polling=false;}},
 async send(command){
  if(this.busy||this.pending||!this.room){hooks.toast('Wait for the previous action to finish.');return;}
  this.pending={...command,revision:this.room.revision,requestId:crypto.randomUUID()};await this.retryPending();
 },
 async retryPending(){
  this.busy=true;this.status();
  try{const r=await this.request(`/api/rooms/${this.code}/command`,this.pending);this.pending=null;this.busy=false;this.accept(r);}
  catch(error){this.busy=false;if(error.network){this.offline=true;hooks.toast(error.message);}else{this.pending=null;hooks.toast(error.message);await this.refresh().catch(()=>{this.offline=true;});}}
  finally{this.busy=false;this.status();}
 },
 async audit(){return this.request(`/api/rooms/${this.code}/audit`);},
 async enter(kind){
  const playerName=root.querySelector('#mp-name').value,leader=root.querySelector('#mp-leader').value,code=root.querySelector('#mp-code').value.trim().toUpperCase();
  if(kind==='join'&&savedSeats[code]){location.href=`?multiplayer=1&room=${code}`;return;}
  if(kind==='join'&&!/^[A-F0-9]{10}$/.test(code))throw new Error('Enter the 10-character room code from the invite.');
  // Confirm browser storage is usable before creating an unrecoverable seat.
  localStorage.setItem(key,JSON.stringify(savedSeats));
  const r=await this.request(kind==='create'?'/api/rooms':`/api/rooms/${code}/join`,{name:playerName,leader});
  this.code=r.code;secret=r.token;savedSeats[r.code]={token:secret,name:playerName,leader};localStorage.setItem(key,JSON.stringify(savedSeats));
  history.replaceState(null,'',`?multiplayer=1&room=${r.code}`);this.accept(r);
 }
};
async function handleClick(event){
 const b=event.target.closest('[data-mp]');if(!b||b.disabled)return;const action=b.dataset.mp;
 try{
  if(['create','join'].includes(action)){multiplayer.busy=true;multiplayer.status();try{await multiplayer.enter(action);}finally{multiplayer.busy=false;multiplayer.status();}return;}
  if(action==='copy'){try{await navigator.clipboard.writeText(multiplayer.invite());hooks.toast('Invite link copied.');}catch{root.querySelector('.mp-invite input').select();hooks.toast('Select and copy the invite link.');}return;}
  const r=multiplayer.room,me=r.seats.find(s=>s.id===r.you);
  const command=action==='ready'?{type:'ready',ready:!me.ready}:action==='leader'?{type:'leader',leader:root.querySelector('#mp-own-leader').value}:action==='addBot'?{type:'addBot',leader:root.querySelector('#mp-bot-leader').value}:action==='remove'?{type:'remove',seat:Number(b.dataset.seat)}:{type:action};
  await multiplayer.send(command);
 }catch(error){hooks.toast(error.message);const e=root.querySelector('.mp-error');if(e)e.textContent=error.message;}
}
