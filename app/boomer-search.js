// Cooperative Boomer search: bounded work per call, no timers/native controls.
// Scene keys exclude the angle/look that auto-apply itself changes.
(()=>{
 const finite=Number.isFinite,clock=()=>globalThis.performance?.now?.()??Date.now(),ids=new WeakMap();let nextId=0,queues=new WeakMap();
 const id=o=>o&&typeof o==='object'?(ids.has(o)?ids.get(o):(ids.set(o,++nextId),nextId)):0;
 const counters={generated:0,slices:0,traces:0,drawTraces:0,fastTraces:0,coarseRejected:0,cacheHits:0,maxSliceMs:0};
 function traceOrdinary(api,d,c,target,options={}){
  const g=d.ground,data=g?.imageData?.data,m=c.model;if(!ArrayBuffer.isView(data)||d.weathers?.some(w=>[7,8].includes(w.weather_type))||![m.ratio,m.ax,m.ay,c.origin.x,c.origin.y,c.origin.angle,c.power].every(finite))return null;
  const ox=g.position?.x||0,oy=g.position?.y||0,w=g.w,h=g.h,solid=(x,y)=>{const ix=Math.floor(x-ox),iy=Math.floor(y-oy);return ix>=0&&iy>=0&&ix<w&&iy<h&&data[(iy*w+ix)*4+3]>128;},theta=c.origin.angle*Math.PI/180,v=m.speedQuantization==='round'?Math.round(c.power*m.ratio):m.speedQuantization==='floor'?Math.floor(c.power*m.ratio):c.power*m.ratio,vx=v*Math.cos(theta)+(m.velocityBiasX||0),vy=-v*Math.sin(theta)+(m.velocityBiasY||0),duration=Math.min(m.maxTime??10,c.t+.35),dt=Math.max(.001,Math.min(.009,2.5/(Math.hypot(vx,vy)+Math.hypot(m.ax,m.ay)*duration))),clearance=Math.max(0,Math.min(20,options.clearance??0));let hit=null;
  for(let t=0;t<=duration;t+=dt){const dx=vx*t+m.ax*t*t/2,dy=vy*t+m.ay*t*t/2,x=c.origin.x+dx,y=c.origin.y+dy,tx=x-target.x,ty=y-target.y+14;
   if(t>.025&&Math.abs(tx)<=22&&y>=target.y-36&&y<=target.y+3){hit={x,y,t,type:'target'};break;}
   if(t>.035){const center=solid(x,y),margin=!center&&clearance>0&&t>.08&&dx*dx+dy*dy>1225&&tx*tx+ty*ty>2025&&(solid(x+clearance,y)||solid(x-clearance,y)||solid(x,y+clearance)||solid(x,y-clearance));if(center||margin){hit={x,y,t,type:'ground',clearanceOnly:!center};break;}}
   if(y>Math.max(2000,h+400)||x< -2000||x>w+2000)break;
  }
  counters.fastTraces++;return{points:[],hit,horizon:duration,fastOrdinary:true};
 }
 function expanded(m,d,options){
  const high=options.mode==='high',ordinaryLong=options.allowLongArc&&!m.boomerSS&&d.wind_power===0;if(!high&&!ordinaryLong)return m;
  const limit=m.maxTime??4.1,horizon=d.wind_power===0?8:6;if(horizon<=limit)return m;
  return{...m,provisional:true,maxTime:horizon,observedHorizon:limit,longArcExtrapolated:true,positionAllowance:(power,t)=>(m.positionAllowance?.(power,Math.min(t,limit))??m.errorRadius??15)+12*Math.max(0,t-limit)**2};
 }
 function coarseBlocked(api,d,c,target){
  if(typeof api.at!=='function'||typeof api.terrain!=='function'||d.weathers?.some(w=>[7,8].includes(w.weather_type)))return false;
  for(let i=1;i<24;i++){const t=c.t*i/24;if(t<.08)continue;const q=api.at(c.model,c.origin,c.power,t);if(Math.hypot(q.x-c.origin.x,q.y-c.origin.y)<35||Math.hypot(q.x-target.x,q.y-target.y+14)<45)continue;if(api.terrain(d,q.x,q.y))return true;}return false;
 }
 function result(c,path,d,target){const m=c.model,usedLong=m.longArcExtrapolated&&(path.hit?.t??c.t)>m.observedHorizon,selected={...m,longArcExtrapolated:!!usedLong,provisional:true,mirrorEstimate:!!path.mirrorReflections?.length,tornadoEstimate:(path.tornadoTransitions??0)>0,randomWeatherIgnored:d.weathers?.some(w=>w.weather_type===6)};
  return{...c,model:selected,mobile:15,ready:true,provisional:true,predictedHit:false,t:path.hit.t,path,displayAngle:c.origin.angle>90?180-c.origin.angle:c.origin.angle,targetNumber:target.n,target:{n:target.n,x:target.x,y:target.y}};
 }
 function find(api,d,model,p,target,modelForPlayer,options={}){
  if(p?.mobile!==15||![0,1].includes(p.look)||![0,1,2].includes(p.selected_shot)||!target||![p.x,p.y,p.body,target.x,target.y,d?.wind_power,d?.wind_angle].every(finite))return{ready:false,reason:'Boomer: chờ vị trí xe, mục tiêu và gió'};
  const now=clock(),collector=globalThis.__reaDragonCollector,cal=collector?.calibration??[],samples=collector?.samples??[],fixed=options.mode==='fixed'&&finite(options.fixedDisplay),a=p.aim?.[p.selected_shot];
  const key=JSON.stringify([id(d.ground),d.ground?.revision,d.ground?.version,collector?.session,cal.length,cal.at(-1)?.time,samples.length,samples.at(-1)?.time,p.n,p.selected_shot,p.x,p.y,p.body,p.minang,p.maxang,a?.ang,a?.size,target.n,target.x,target.y,d.wind_power,d.wind_angle,d.weathers?.map(w=>[w.weather_type,w.x,w.size]),options.mode,options.fixedDisplay,options.fixedLook,options.clearance,options.allowLongArc,typeof modelForPlayer!=='function'?[model?.valid,model?.ratio,model?.ax,model?.ay,model?.velocityBiasX,model?.velocityBiasY,model?.maxTime]:null]);
  let cache=queues.get(api);if(!cache){cache=new Map();queues.set(api,cache);}let state=cache.get(key);
  if(state?.highFallback){const high=find(api,d,model,p,target,modelForPlayer,{...options,mode:'high'});return{...high,automaticHighArc:true};}
  const draw=c=>{counters.drawTraces++;return api.trajectory(d,c.model,c.origin,c.power,target,Math.min(c.model.maxTime??10,c.t+.35),{clearance:Math.max(0,Math.min(20,options.clearance??0)),searchOnly:true});},trace=c=>traceOrdinary(api,d,c,target,options)??draw(c);
  if(state?.best){if(now-state.validated<300){counters.cacheHits++;return state.best;}const path=state.best.boomerPathTemplate?null:trace(state.best);if(path?.hit?.type==='target'){if(!path.fastOrdinary)state.best=result(state.best,path,d,target);state.validated=now;return state.best;}cache.delete(key);state=null;}
  if(!state){
   const recorded=globalThis.__reaBoomerPaths?.find(api,d,p,target,[...cal,...samples],collector?.session,options);if(recorded?.ready){state={best:recorded,validated:now};cache.set(key,state);return recorded;}
   const min=Math.ceil(p.minang??0),max=Math.floor(p.maxang??90),looks=fixed&&[0,1].includes(options.fixedLook)?[options.fixedLook]:[p.look,1-p.look],centers=[{x:target.x,y:target.y-14},{x:target.x-8,y:target.y-12},{x:target.x+8,y:target.y-12},{x:target.x,y:target.y-26}],unique=new Map();
   // Reflected target seeds retain the existing mirror estimate without the
   // former unbounded angle/power weather grid. Full traces still verify them.
   for(const w of (d.weathers??[]).filter(w=>w.weather_type===7).slice(0,2))for(const center of centers.slice(0,4))centers.push({...center,mirrorX:w.x});
   let hasModels=false;for(const look of looks){const angles=fixed?[options.fixedDisplay,180-options.fixedDisplay].map(theta=>look===0?180-theta-p.body:theta+p.body).filter(v=>v>=min-1e-6&&v<=max+1e-6):Array.from({length:Math.max(0,max-min+1)},(_,i)=>min+i);
    for(const angle of [...new Set(angles)]){const variant={...p,look,ang:angle},base=typeof modelForPlayer==='function'&&(d.wind_power!==0||model?.boomerSS||model?.boomerZeroPrior)?modelForPlayer(variant):model;if(!base?.valid)continue;hasModels=true;const m=expanded(base,d,options),origin=api.launch(variant);if(!origin)continue;origin.x+=m.dx||0;origin.y+=m.dy||0;const display=origin.angle>90?180-origin.angle:origin.angle;
     for(const center of centers){const mirror=globalThis.__reaMirror?.constants,half=((mirror?.collisionHalfWidth??25)+(mirror?.ejectHalfWidth??26))/2,targetX=center.mirrorX===undefined?center.x:2*(center.mirrorX+(origin.x<center.mirrorX?-half:half))-center.x,solved=api.solve(m,origin,targetX,center.y);if(!solved||solved.t<.07||solved.t>(m.maxTime??10))continue;const power=Math.round(solved.power);if(power<1||power>400)continue;const score=(options.mode==='high'?solved.t*.1+Math.max(0,90-display)*.05:solved.t)+Math.abs(angle-p.ang)*.003+(look===p.look?0:.12),candidate={look,angle,power,t:solved.t,origin:{...origin},model:m,score};const k=look+':'+angle+':'+power;if(!unique.has(k)||unique.get(k).score>score)unique.set(k,candidate);}
    }
   }
   const sorted=[...unique.values()].sort((a,b)=>a.score-b.score),diverse=[],groups=new Set(),selected=new Set();for(const c of sorted){const group=c.look+':'+c.angle;if(groups.has(group))continue;groups.add(group);diverse.push(c);selected.add(c);if(diverse.length>=256)break;}for(const c of sorted){if(diverse.length>=256)break;if(!selected.has(c)){diverse.push(c);selected.add(c);}}diverse.sort((a,b)=>a.score-b.score);
   state={candidates:diverse,hasModels,generatedCandidates:sorted.length,index:0,traces:0,slices:0,coarseRejected:0,blockedWeather:false,created:now,completedAt:null};cache.set(key,state);while(cache.size>8)cache.delete(cache.keys().next().value);counters.generated++;
  }
  if(state.completedAt!==null&&now-state.completedAt<(state.failure?.budgetExhausted?1500:500)){counters.cacheHits++;return state.failure;}if(state.completedAt!==null){if(state.index>=state.candidates.length)state.index=0;state.slices=0;state.completedAt=null;}
  const start=now,budget=Math.max(2,Math.min(12,options.searchBudgetMs??8)),limit=Math.max(1,Math.min(8,Math.floor(options.maxCandidatesPerSlice??6))),maxSlices=Math.max(1,Math.min(64,Math.floor(options.maxSlicesPerScene??32)));let count=0;counters.slices++;state.slices++;
  const progress=()=>({processed:state.index,total:state.candidates.length,generated:state.generatedCandidates,slices:state.slices,fullTraces:state.traces,sliceTraces:count,coarseRejected:state.coarseRejected,sliceMs:clock()-start});
  while(state.index<state.candidates.length){if(count>=limit||clock()-start>=budget)break;const c=state.candidates[state.index++];if(coarseBlocked(api,d,c,target)){state.coarseRejected++;counters.coarseRejected++;continue;}count++;state.traces++;counters.traces++;let path=trace(c);if(path.weatherEntry||path.tornadoEntry&&!path.weatherHandled)state.blockedWeather=true;if(path.hit?.type!=='target'||path.tornadoEntry&&!path.weatherHandled)continue;if(path.fastOrdinary){path=draw(c);if(path.hit?.type!=='target')continue;}
   state.best=result(c,path,d,target);state.best.search=progress();state.validated=clock();counters.maxSliceMs=Math.max(counters.maxSliceMs,clock()-start);return state.best;
  }
  const search=progress();counters.maxSliceMs=Math.max(counters.maxSliceMs,search.sliceMs);
  if(state.index<state.candidates.length&&state.slices<maxSlices)return{ready:false,pending:true,provisional:true,reason:'Boomer: đang tìm đường '+state.index+'/'+state.candidates.length+' · vẫn dùng được điều khiển bắn tay',search};
  const targetHeadwind=(target.x-p.x)*d.wind_power*Math.cos(d.wind_angle*Math.PI/180)< -1e-6;
  if(options.mode==='auto'&&state.hasModels&&!targetHeadwind&&(d.wind_power!==0||model?.boomerSS||!options.allowLongArc)){state.highFallback=true;return{ready:false,pending:true,automaticHighArc:true,search,reason:'Boomer: đang tìm vòng cao khi đường thường chưa có nghiệm · vẫn dùng được điều khiển bắn tay'};}
  const budgetExhausted=state.index<state.candidates.length;state.completedAt=clock();state.failure={ready:false,pending:false,budgetExhausted,search,reason:budgetExhausted?'Boomer: tạm hết ngân sách tìm đường; thử Vòng cao hoặc giảm chừa địa hình':state.blockedWeather?'Boomer: đường gặp lốc/gương chưa có nghiệm phù hợp':!state.candidates.length&&!model?.valid?model?.reason||'Boomer: chưa có mô hình cho hướng gió/góc này':fixed?'Boomer: góc đang giữ chưa có đường tới mục tiêu; đổi góc hoặc chọn Tự động':'Boomer: đã xét các góc/lực hiện có; chưa có đường vượt địa hình trong miền dự đoán'};return state.failure;
 }
 Object.defineProperty(globalThis,'__reaBoomerSearch',{value:Object.freeze({version:1,find,expanded,traceOrdinary,clearCache(){queues=new WeakMap();},stats(){return{...counters};}}),configurable:true});return{installed:true,version:1};
})()
