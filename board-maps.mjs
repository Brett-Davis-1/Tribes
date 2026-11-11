// Board layouts shared by the client, server and bots.
const coords=[[[594,318],[1024,315],[1302,619],[1302,1035],[985,1325],[577,1325],[285,1008],[305,595]],[[788,433],[1076,545],[1186,825],[1079,1098],[796,1208],[513,1098],[406,829],[520,545]],[[713,620],[885,620],[1020,742],[986,900],[876,1029],[700,1014],[588,902],[601,733]]];
export const MAP24=coords.flatMap((ring,r)=>ring.map(([x,y],i)=>({id:r*8+i,x:x/16,y:y/16,ring:r,index:i,name:['Beach','Mangrove','Caldera'][r]+' '+(i+1)})));
export const EDGES24=[];
for(let i=0;i<8;i++){
 EDGES24.push([i,8+i,false],[i,8+(i+7)%8,false]);
 EDGES24.push([8+i,16+i,false],[8+i,16+(i+1)%8,false]);
 EDGES24.push([16+i,16+(i+1)%8,false],[i,(i+1)%8,true]);
}

const radii=[500,345,190];
export const MAP30=radii.flatMap((radius,ring)=>Array.from({length:10},(_,index)=>{
 const angle=(-90+index*36+(ring===1?18:0))*Math.PI/180;
 return {id:ring*10+index,x:50+radius*Math.cos(angle)/12,y:50+radius*Math.sin(angle)/12,ring,index,name:`Space ${ring*10+index+1}`};
}));
export const EDGES30=[];
for(let i=0;i<10;i++){
 EDGES30.push([i,10+i,false],[i,10+(i+9)%10,false]);
 EDGES30.push([10+i,20+i,false],[10+i,20+(i+1)%10,false]);
 EDGES30.push([20+i,20+(i+1)%10,false]);
 EDGES30.push([i,(i+1)%10,true]);
 EDGES30.push([10+i,10+(i+1)%10,true]);
}

export const MIDDLE24=Array.from({length:8},(_,i)=>[8+i,8+(i+1)%8,true]);
