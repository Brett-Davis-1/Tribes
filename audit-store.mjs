let database;
function open(){
 if(database)return database;
 database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('tribes-audit-history',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('reports',{keyPath:'gameId'});request.result.createObjectStore('summaries',{keyPath:'gameId'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=null;reject(request.error);};request.onblocked=()=>{database=null;reject(new Error('Audit storage is blocked by another tab.'));};
 });return database;
}
export async function persistReport(report){
 const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['reports','summaries'],'readwrite');
  tx.objectStore('reports').put(report);
  tx.objectStore('summaries').put({gameId:report.gameId,startedAt:report.startedAt||report.recordingStartedAt,updatedAt:report.exportedAt,status:report.status,coverage:report.coverage,events:report.events.length,round:report.finalState.round,winner:report.winner,victory:report.victory,players:report.initialState.players.map(p=>({id:p.id,name:report.catalog.leaders.find(l=>l.id===p.leader)?.name||p.leader,human:p.human}))});
  tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Audit save was interrupted.'));
 });
}
export async function listReports(){const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction('summaries').objectStore('summaries').getAll();request.onsuccess=()=>resolve(request.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));request.onerror=()=>reject(request.error);});}
export async function readReport(id){const db=await open();return new Promise((resolve,reject)=>{const request=db.transaction('reports').objectStore('reports').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
