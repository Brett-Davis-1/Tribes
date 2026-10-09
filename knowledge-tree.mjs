import {TECHS,leader,has,canResearch} from './engine.mjs';
import {resourceIcon} from './resource-icons.mjs';

export const TREE_SIZE={width:1500,height:900};
// Coordinates follow the supplied tree: four roots, paired branches, shared
// middle technologies, and four paths into City at the top.
const nodes={
 nomad:[180,815,250,130],spiritual:[560,815,250,130],gatherer:[940,815,250,130],hunter:[1320,815,250,130],
 stamina:[90,605,170,145],wayfinder:[270,605,170,145],growth:[470,605,170,145],favor:[650,605,170,145],
 harvest:[850,605,170,145],offering:[1030,605,170,145],spoils:[1230,605,170,145],warcry:[1410,605,170,145],
 tent:[110,370,160,155],tribute:[320,370,160,155],wisdom:[530,370,160,155],shields:[740,370,160,155],
 fertility:[950,370,160,155],wartribe:[1160,370,160,155],ferocity:[1380,370,160,155],
 rally:[110,140,180,130],archery:[1380,140,180,130],city:[750,110,320,155]
};
const summaries={nomad:'Travel hidden sea routes',spiritual:'Play 2 spirits per turn',gatherer:'+1 defense',hunter:'+1 attack',stamina:'+1 action per turn',wayfinder:'Teleport anywhere, once',growth:'+5 population, once',favor:'Draw a spirit after a capture',harvest:'Collect new settlement yield now',offering:'Draw 1 spirit, once',spoils:'+1 pop & knowledge per capture',warcry:'+3 attack this turn',tent:'Settlements cost 3 less pop',tribute:'Collect 2 settlements, once',wisdom:'+2 knowledge per turn',shields:'2D6 defensive rolls',fertility:'+2 population per turn',wartribe:'+2 attack & defense',ferocity:'+2 attack',rally:'+3 pop on defensive wins',archery:'2D6 offensive rolls',city:'Upgrade for 10 pop · +1 defense · hold to win'};
function portraits(game,tech,portrait){
 const owners=game.players.filter(p=>has(p,tech));
 return owners.length?owners.map(p=>`<span class="skill-owner" role="img" aria-label="${leader(p).name}${p.human?' (you)':''}" title="${leader(p).name}${p.human?' (you)':''}" style="--owner:${leader(p).color}">${portrait(p)}</span>`).join(''):'<span class="no-skill-owners">Unclaimed</span>';
}
function arrow(parent,child){
 const [x,y,w,h]=nodes[parent],[tx,ty,tw,th]=nodes[child];
 if(y===ty){const dir=Math.sign(tx-x);return `M ${x+dir*w/2+dir*4} ${y} L ${tx-dir*tw/2-dir*9} ${ty}`;}
 const parents=TECHS.find(t=>t.id===child).parents;
 const endX=child==='city'?tx+({tent:-120,wisdom:-40,fertility:40,ferocity:120}[parent]||0):tx+(parents.length>1?(parents.indexOf(parent)===0?-22:22):0);
 const startY=y-h/2-4,endY=ty+th/2+10,midY=(startY+endY)/2;
 return `M ${x} ${startY} C ${x} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
}
export function knowledgeTree(game,p,selected,portrait){
 const edges=TECHS.flatMap(t=>t.parents.map(parent=>`<path data-from="${parent}" data-to="${t.id}" class="${has(p,parent)?'path-open':''} ${selected===parent||selected===t.id?'path-focus':''}" d="${arrow(parent,t.id)}" marker-end="url(#knowledge-arrow)"/>`)).join('');
 const cards=TECHS.map(t=>{
  const [x,y,w,h]=nodes[t.id],owned=has(p,t.id),ready=canResearch(p,t.id);
  return `<button class="skill-node branch-${t.branch.toLowerCase()} ${t.parents.length?'':'root-skill'} ${owned?'skill-owned':''} ${t.id===selected?'skill-selected':''}" data-tree-skill="${t.id}" aria-pressed="${t.id===selected}" style="left:${x-w/2}px;top:${y-h/2}px;width:${w}px;height:${h}px" aria-label="${t.name}, ${t.cost} knowledge. ${owned?'You own this skill.':ready?'Available to research.':'View prerequisites.'}"><span class="skill-cost">${resourceIcon('kn')}${t.cost}</span><strong>${t.name}</strong><span class="skill-summary">${summaries[t.id]}</span><span class="skill-owners">${portraits(game,t.id,portrait)}</span><span class="skill-state">${owned?'✓ Yours':ready?'Available':'View skill'}</span></button>`;
 }).join('');
 return `<div class="tree-frame"><div class="knowledge-map"><svg class="knowledge-arrows" viewBox="0 0 1500 900" aria-hidden="true"><defs><marker id="knowledge-arrow" viewBox="0 0 14 14" refX="11" refY="7" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M 3 2 L 11 7 L 3 12" fill="none" stroke="context-stroke" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>${edges}</svg>${cards}</div></div>`;
}
export function knowledgeDetail(game,p,id,portrait,turn){
 const t=TECHS.find(t=>t.id===id)||TECHS[0],owned=has(p,t.id),ready=canResearch(p,t.id);
 return `<div class="eyebrow">Selected skill</div><h3>${t.name}</h3><div class="skill-detail-cost">${resourceIcon('kn')} ${t.cost} knowledge</div><p>${t.description}</p><p class="skill-prerequisites">${t.parents.length?`Requires any one:<br>${t.parents.map(parent=>`<span>${has(p,parent)?'✓ ':''}${TECHS.find(t=>t.id===parent).name}</span>`).join(' or ')} `:'Starting skill · no prerequisite'}</p><div class="eyebrow">Who has this skill</div><div class="skill-owner-list">${game.players.filter(q=>has(q,t.id)).map(q=>`<div class="row"><span class="skill-owner" style="--owner:${leader(q).color}">${portrait(q)}</span><span>${leader(q).name}${q.human?' (you)':''}</span></div>`).join('')||'<p>No tribe has learned it yet.</p>'}</div><button class="primary" data-tech="${t.id}" ${owned||!ready||!turn?'disabled':''}>${owned?'✓ Unlocked':!turn?'Wait for your turn':ready?'Unlock technology':p.kn<t.cost?'Not enough knowledge':'Prerequisite needed'}</button>`;
}
