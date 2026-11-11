// Empirical Nak S2 handoff from two received air/underground pairs.
// This module exposes math only; no native controls, timers or firing.
(()=>{
 const DEG=Math.PI/180,UG=-1440,GRID=25,cache=new Map(),ids=new WeakMap();let serial=0;
 const stats={searches:0,cacheHits:0,fullTraces:0},id=o=>o&&typeof o==='object'?(ids.has(o)?ids.get(o):(ids.set(o,++serial),serial)):null;
 const speed=(m,p)=>m.speedQuantization==='round'?Math.round(p*m.ratio):m.speedQuantization==='floor'?Math.floor(p*m.ratio):p*m.ratio;
 function startOf(m,o,power){const v=speed(m,power);return{x:Math.round(o.x),y:Math.round(o.y),ang:o.angle,power:v,ax:m.ax,ay:m.ay};}
 function handoff(start,contact,jumps=[]){const k=globalThis.__reaDragonBallistics,timeMs=Math.ceil((contact.t*1000-1e-7)/GRID)*GRID,v=k.velocityAt(start,timeMs,jumps);return{x:Math.round(contact.x),y:Math.round(contact.y),vx:v.x,vy:v.y,ax:0,ay:UG,t:timeMs/1000,timeMs,contactTime:contact.t};}
 function trace(api,d,m,origin,power,target,maxTime=12,options={}){
  const start=startOf(m,origin,power),airOrigin={x:start.x,y:start.y,angle:origin.angle},ordinary={...m,nakAirOnly:false,nakUnderground:false},air=api.trajectory(d,ordinary,airOrigin,power,target,Math.min(maxTime,m.maxTime??6.5),{...options,clearance:0,ignorePlayerContact:true});
  if(air.hit?.type!=='ground'||air.hit.clearanceOnly)return{...air,nakS2:true,nakNoEntry:true,hit:null,branches:[{...air,hit:null,nakAir:true}]};
  const k=globalThis.__reaDragonBallistics,jumps=d.weathers?.some(w=>[7,8].includes(w.weather_type))?(globalThis.__reaTornadoMethod?.predict(start,d.weathers,Math.ceil(air.hit.t*40)/40)?.jumps??air.jumps??[]):air.jumps??[],s=handoff(start,air.hit,jumps),points=[{x:s.x,y:s.y,t:s.t}],limit=3,dt=Math.max(.0005,Math.min(.004,.85/(Math.hypot(s.vx,s.vy)+1440*limit)));let hit=null,entered=api.terrain(d,s.x,s.y),last={x:s.x,y:s.y,t:0},previousDraw=last;
  const pos=t=>({x:s.x+s.vx*t,y:s.y+s.vy*t+UG*t*t/2,t});
  for(let t=dt;t<=limit;t+=dt){const q=pos(t),solid=api.terrain(d,q.x,q.y);if(solid)entered=true;
   if(entered&&!solid){let lo=last.t,hi=t;for(let i=0;i<10;i++){const mid=(lo+hi)/2,p=pos(mid);if(api.terrain(d,p.x,p.y))lo=mid;else hi=mid;}const contact=pos(hi),endMs=Math.ceil((hi*1000-1e-7)/GRID)*GRID;hit={x:contact.x,y:contact.y,t:s.t+endMs/1000,type:'ground',clearanceOnly:false,nakExit:true,contactTime:s.t+hi};points.push(hit);break;}
   if(!entered&&t>.05)break;if(Math.hypot(q.x-previousDraw.x,q.y-previousDraw.y)>2){points.push({...q,t:s.t+t});previousDraw=q;}last=q;
   const g=d.ground,left=g.position?.x??0,top=g.position?.y??0;if(q.x<left||q.x>=left+g.w||q.y<top||q.y>=top+g.h)break;
  }
  const airBranch={...air,nakAir:true,hit:null},under={points,hit,nakUnderground:true,start:s},entry={x:s.x,y:s.y,t:s.t};return{points:air.points,hit,branches:[airBranch,under],nakS2:true,nakEntry:entry,nakUndergroundStart:s,mirrorReflections:air.mirrorReflections??[],tornadoTransitions:air.tornadoTransitions??0,weatherHandled:!!air.weatherHandled,weatherTransitions:air.weatherTransitions??0,horizon:s.t+limit,provisional:true};
 }
 function planeEndpoint(m,o,power,y,weathers=[]){
  const k=globalThis.__reaDragonBallistics,start=startOf(m,o,power),horizon=m.maxTime??6.5,jumps=weathers.some(w=>[7,8].includes(w.weather_type))?(globalThis.__reaTornadoMethod?.predict(start,weathers,horizon)?.jumps??[]):[],edges=[0,...jumps.map(j=>j[0]/1000).filter(t=>t>0&&t<horizon),horizon];
  for(let i=0;i<edges.length-1;i++){const at=edges[i],q=k.positionAt(start,at*1000,jumps),v=k.velocityAt(start,at*1000,jumps),segment=k.segment(start,at*1000,jumps);for(const t of k.roots(segment.ay/2,v.y,q.y-y)){if(t<0||at+t<.04||at+t>edges[i+1]||v.y+segment.ay*t<=0)continue;const contact={x:q.x+v.x*t+segment.ax*t*t/2,y,t:at+t},s=handoff(start,contact,jumps),under=Math.max(0,2*s.vy/1440);return{x:s.x+s.vx*under,t:s.t+under};}}
  return null;
 }
 function find(api,d,m,p,target,options={}){
  if(!m?.valid||!target||p.selected_shot!==1)return{ready:false,reason:'Nak S2: chờ mô hình và mục tiêu'};
  const pixels=d.ground?.imageData?.data;if((Array.isArray(pixels)||ArrayBuffer.isView(pixels))&&pixels.length===0)return{ready:false,nakS2:true,provisional:true,reason:'Nak S2: đang chờ dữ liệu địa hình'};
  const now=typeof performance!=='undefined'?performance.now():Date.now(),key=JSON.stringify([id(api),id(d.ground),d.ground?.revision,d.ground?.version,p.x,p.y,p.body,p.look,p.ang,p.minang,p.maxang,p.aim?.[1],target.n,target.x,target.y,m.ratio,m.speedQuantization,m.ax,m.ay,m.dx,m.dy,m.sampleCount,d.wind_power,d.wind_angle,d.weathers?.map(w=>[w.weather_type,w.x,w.size]),options.mode,options.fixedDisplay,options.fixedLook]),old=cache.get(key);
  if(old&&now-old.time<400){stats.cacheHits++;return{...old.value,cacheHit:true};}stats.searches++;
  const save=value=>{cache.set(key,{time:now,value});if(cache.size>16)cache.delete(cache.keys().next().value);return value;},fixed=options.mode==='fixed'&&Number.isFinite(options.fixedDisplay),min=Math.ceil(p.minang??0),max=Math.floor(p.maxang??180),looks=fixed&&[0,1].includes(options.fixedLook)?[options.fixedLook]:[p.look,1-p.look],candidates=[],seen=new Set();
  function evaluate(look,angle,power){power=Math.round(power);if(angle<min||angle>max||power<1||power>400)return;const tag=look+':'+angle+':'+power;if(seen.has(tag))return;seen.add(tag);const origin=api.launch({...p,look,ang:angle});if(!origin)return;origin.x+=m.dx||0;origin.y+=m.dy||0;const q=planeEndpoint(m,origin,power,target.y,d.weathers??[]);if(!q)return;const score=Math.abs(q.x-target.x)+Math.abs(angle-p.ang)*.005+(options.mode==='high'?Math.max(0,90-Math.min(origin.angle,180-origin.angle))*.03:0);candidates.push({look,angle,power,origin,score,flat:q});}
  for(const look of looks){const angles=fixed?[options.fixedDisplay,180-options.fixedDisplay].map(a=>look===0?180-a-p.body:a+p.body):Array.from({length:Math.max(0,max-min+1)},(_,i)=>min+i);for(const angle of [...new Set(angles)]){for(let power=8;power<400;power+=16)evaluate(look,angle,power);evaluate(look,angle,400);}}
  candidates.sort((a,b)=>a.score-b.score);for(const seed of candidates.slice(0,8))for(let da=fixed?0:-1;da<=(fixed?0:1);da++)for(let dp=-15;dp<=15;dp++)evaluate(seed.look,seed.angle+da,seed.power+dp);candidates.sort((a,b)=>a.score-b.score);
  const selected=[],chosen=new Set(),buckets=new Set();for(const c of candidates){const bucket=c.look+':'+Math.floor(c.angle/4);if(buckets.has(bucket))continue;buckets.add(bucket);selected.push(c);chosen.add(c);if(selected.length>=14)break;}for(const c of candidates){if(!chosen.has(c)){selected.push(c);chosen.add(c);}if(selected.length>=24)break;}
  let best=null,closest=null,tries=0;const tested=new Set();
  function full(c){const tag=c.look+':'+c.angle+':'+c.power;if(tested.has(tag)||tries>=32)return;tested.add(tag);tries++;stats.fullTraces++;const path=trace(api,d,m,c.origin,c.power,target,12,options);if(!path.hit?.nakExit)return;const error=Math.hypot(path.hit.x-target.x,path.hit.y-target.y),r={...c,path,error};if(!closest||error<closest.error)closest=r;if(Math.abs(path.hit.x-target.x)>18||Math.abs(path.hit.y-target.y)>22)return;const found={...c,ready:true,mobile:11,targetNumber:target.n,target:{n:target.n,x:target.x,y:target.y},displayAngle:c.origin.angle>90?180-c.origin.angle:c.origin.angle,model:{...m,nakUnderground:true,provisional:true,mirrorEstimate:!!path.mirrorReflections?.length,tornadoEstimate:path.tornadoTransitions>0,randomWeatherIgnored:d.weathers?.some(w=>w.weather_type===6)},path,t:path.hit.t,impactError:error,predictedHit:false,provisional:true,nakS2:true};if(!best||error<best.impactError)best=found;}
  for(const c of selected){full(c);if(best?.impactError<=3)break;}
  if((!best||best.impactError>3)&&closest){const seed=closest;for(const delta of [-8,8,-4,4,-2,2,-1,1]){const power=seed.power+delta;if(power<1||power>400)continue;full({...seed,power});if(best?.impactError<=3)break;}}
  if(best)return save({...best,search:{analyticCandidates:candidates.length,fullTraces:tries}});return save({ready:false,nakS2:true,provisional:true,reason:'Nak S2: chưa tìm được điểm thoát đất sát mục tiêu; đổi góc hoặc vị trí',closestExit:closest?.path.hit,search:{analyticCandidates:candidates.length,fullTraces:tries}});
 }
 Object.defineProperty(globalThis,'__reaNakShot',{value:Object.freeze({version:1,constants:Object.freeze({undergroundAcceleration:UG,gridMs:GRID,observedPairs:2,provisional:true}),handoff,trace,find,stats:()=>({...stats,cacheEntries:cache.size}),clearCache(){cache.clear();}}),configurable:true});return{installed:true,version:1};
})()
