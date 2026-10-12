import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {RoomService,roomAPI} from './multiplayer-server.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
// The public site must never expose databases, server code, or audit archives.
const publicFiles=new Set(['index.html','styles.css','app.mjs','engine.mjs','audit.mjs','audit-store.mjs','knowledge-tree.mjs','resource-icons.mjs','multiplayer-client.mjs','rules-reference.html','ui-test.html','rules-history/engine-v1/engine.mjs','rules-history/engine-v1/audit.mjs']);
export function createTribesServer(options={}){
 const rooms=new RoomService({filename:process.env.TRIBES_DB||path.join(root,'data','tribes.sqlite'),...options}),api=roomAPI(rooms);
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(await api(req,res,url))return;
   if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return;}
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   const route=decodeURIComponent(url.pathname),relative=route==='/'?'index.html':route.slice(1),target=path.resolve(root,relative);
   const allowed=publicFiles.has(relative)||(relative.startsWith('assets/')&&Object.hasOwn(mime,path.extname(relative)));
   if(!allowed||relative.includes('\\')||relative.split('/').includes('..')||!target.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return;}
   const body=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':relative.startsWith('assets/')?'public, max-age=3600':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:body);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
 });
 server.on('close',()=>rooms.close());return {server,rooms};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4178),host=process.env.HOST||(process.env.PORT?'0.0.0.0':'127.0.0.1');
 const {server,rooms}=createTribesServer();
 const launch=()=>{if(process.argv.includes('--open'))execFile('cmd',['/c','start','','http://127.0.0.1:'+port],{windowsHide:true});};
 server.on('error',error=>{rooms.close();if(error.code==='EADDRINUSE'&&process.argv.includes('--open')){http.get(`http://127.0.0.1:${port}/health`,res=>{res.resume();if(res.statusCode===200)launch();else console.error('Port is in use by another app.');});}else{console.error(error.message);process.exitCode=1;}});
 server.listen(port,host,()=>{console.log(`Tribes is ready at http://127.0.0.1:${port}/?multiplayer=1`);launch();});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
