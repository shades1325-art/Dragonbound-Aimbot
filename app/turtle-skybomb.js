// Empirical Turtle SS Skybomb search. Installing exposes math only.
// Six-fragment law matches six observed splits, including both directions
// near apex. Weather transitions remain provisional. No native controls,
// timers or network calls are used.
(() => {
 const DEG=Math.PI/180,finite=Number.isFinite,normalize=a=>(a%360+360)%360,offsets=[-20,-12,-4,4,12,20];
 const cache=new Map(),identities=new WeakMap();let nextIdentity=0;
 const counters={searches:0,cacheHits:0,analyticCandidates:0,fullCandidates:0,trajectoryCalls:0};
 const identity=o=>o&&typeof o==='object'?(identities.has(o)?identities.get(o):(identities.set(o,++nextIdentity),nextIdentity)):null;
 function stateAt(start,timeMs,jumps=[]){
  let row=null;for(const j of jumps)if(timeMs>=j[0])row=j;
  let x=start.x,y=start.y,vx=finite(start.vx)?start.vx:Math.cos(start.ang*DEG)*start.power,vy=finite(start.vy)?start.vy:-Math.sin(start.ang*DEG)*start.power,ax=start.ax,ay=start.ay,t=timeMs/1000;
  if(row){x=row[1];y=row[2];vx=row[3];vy=row[4];if(row[5]!==undefined)ax=row[5];if(row[6]!==undefined)ay=row[6];t=(timeMs-row[0])/1000;}
  return{x:x+vx*t+ax*t*t/2,y:y+vy*t+ay*t*t/2,vx:vx+ax*t,vy:vy+ay*t,ax,ay};
 }
 function fragmentStarts(start,openingMs=2100,releaseMs=2600,jumps=[]){
  if(!start||!['x','y','ax','ay'].every(k=>finite(start[k]))||!finite(openingMs)||openingMs<0||!finite(releaseMs)||releaseMs<openingMs)throw TypeError('Invalid Turtle SS start or timing');
  const p=stateAt(start,openingMs,jumps);if(![p.x,p.y,p.vx,p.vy].every(finite))throw TypeError('Invalid Turtle SS carrier velocity');
  const power=Math.round(Math.hypot(p.vx/2,p.vy)),center=normalize(Math.round(Math.atan2(-p.vy,p.vx/2)/DEG));
  return offsets.map(offset=>({x:Math.round(p.x),y:Math.round(p.y),ang:normalize(center+offset),power,ax:p.ax,ay:p.ay,t:(start.t??0)+releaseMs}));
 }
 function startOf(model,origin,power){const speed=model.speedQuantization==='round'?Math.round(power*model.ratio):model.speedQuantization==='floor'?Math.floor(power*model.ratio):power*model.ratio;return{x:origin.x,y:origin.y,ang:origin.angle,power:speed,vx:speed*Math.cos(origin.angle*DEG)+(model.velocityBiasX||0),vy:-speed*Math.sin(origin.angle*DEG)+(model.velocityBiasY||0),ax:model.ax,ay:model.ay,t:0};}
 function planeLanding(start,y,horizon=5,jumps=[]){
  if(jumps.length){const edges=[0,...jumps.map(j=>j[0]/1000).filter(t=>t>0&&t<horizon),horizon];for(let i=0;i<edges.length-1;i++){const at=edges[i],end=edges[i+1],s=stateAt(start,at*1000,jumps),disc=s.vy*s.vy-2*s.ay*(s.y-y);if(!(s.ay>0)||disc<0)continue;const t=(-s.vy+Math.sqrt(disc))/s.ay;if(t>0&&t<=end-at)return{x:s.x+s.vx*t+s.ax*t*t/2,y,t:at+t};}return null;}
  const vx=start.power*Math.cos(start.ang*DEG),vy=-start.power*Math.sin(start.ang*DEG),c=start.y-y;
  if(!(start.ay>0))return null;const discriminant=vy*vy-2*start.ay*c;if(discriminant<0)return null;
  const t=(-vy+Math.sqrt(discriminant))/start.ay;if(!(t>0&&t<=horizon))return null;
  return{x:start.x+vx*t+start.ax*t*t/2,y,t};
 }
 // A collision near the target is possible only if the analytic child enters
 // its full contact rectangle. This rejects misses without sampling terrain.
 function canReach(s,target,radius,vertical,horizon){
  const vx=s.power*Math.cos(s.ang*DEG),vy=-s.power*Math.sin(s.ang*DEG),roots=(a,b,c)=>{if(Math.abs(a)<1e-10)return Math.abs(b)<1e-10?[]:[-c/b];const disc=b*b-4*a*c;if(disc<0)return[];const q=Math.sqrt(disc);return[(-b-q)/(2*a),(-b+q)/(2*a)];},times=[0,horizon,...[target.x-radius,target.x+radius].flatMap(x=>roots(s.ax/2,vx,s.x-x)),...[target.y-vertical,target.y+vertical].flatMap(y=>roots(s.ay/2,vy,s.y-y))].filter(t=>t>=0&&t<=horizon).sort((a,b)=>a-b);
  const inside=t=>{const x=s.x+vx*t+s.ax*t*t/2,y=s.y+vy*t+s.ay*t*t/2;return Math.abs(x-target.x)<=radius+1e-7&&Math.abs(y-target.y)<=vertical+1e-7;};
  return times.some((t,i)=>inside(t)||i+1<times.length&&inside((t+times[i+1])/2));
 }
 function failed(reason,extra={}){return{ready:false,provisional:true,turtleSkybomb:true,predictedHit:false,reason,...extra};}
 function find(api,d,m,p,target,options={}){
  if((p?.mobile!==14&&p?.mobile_data?.name!=='Turtle')||p?.selected_shot!==2)return failed('Skybomb chỉ dùng cho Turtle SS');
  if(!m?.valid||![m.ratio,m.ax,m.ay].every(finite)||m.ratio<=0||m.ay<=0)return failed('Skybomb: chưa có mô hình vận tốc và gia tốc Turtle phù hợp');
  if(!target||![target.x,target.y,p.x,p.y,p.body].every(finite))return failed('Skybomb: chờ vị trí xe và mục tiêu');
  if(typeof api?.launch!=='function'||typeof api?.trajectory!=='function'||typeof api?.terrain!=='function')return failed('Skybomb: chưa có bộ tính đường đạn');
  const openingMs=Math.max(100,Math.min(10000,options.openingMs??m.ssOpeningMs??2100)),releaseMs=Math.max(openingMs,options.releaseMs??m.ssReleaseMs??openingMs+500),T=openingMs/1000,release=releaseMs/1000;
  const radius=Math.max(8,Math.min(60,options.nearRadius??28)),verticalTolerance=Math.max(5,Math.min(60,options.verticalTolerance??25)),apexTolerance=Math.max(10,Math.min(600,options.apexToleranceMs??300)),minNear=Math.max(3,Math.min(6,options.minNearCount??3)),maxCandidates=Math.max(1,Math.min(16,Math.floor(options.maxCandidates??12))),childHorizon=Math.max(.1,Math.min(5,options.childHorizon??5));
  const now=typeof options.now==='function'?options.now():typeof performance!=='undefined'?performance.now():Date.now(),fixed=options.mode==='fixed'&&finite(options.fixedDisplay),weather=(d.weathers??[]).map(w=>[w.weather_type,w.x,w.size]);
  const key=JSON.stringify([identity(api),identity(d.ground),d.ground?.revision,d.ground?.version,p.x,p.y,p.body,p.look,p.ang,p.minang,p.maxang,p.aim?.[2],target.n,target.x,target.y,m.ratio,m.speedQuantization,m.ax,m.ay,m.velocityBiasX,m.velocityBiasY,m.dx,m.dy,m.sampleCount,d.wind_power,d.wind_angle,weather,openingMs,releaseMs,radius,verticalTolerance,apexTolerance,minNear,maxCandidates,childHorizon,options.mode,options.fixedDisplay,options.fixedLook,options.clearance]);
  const saved=cache.get(key);if(saved&&now>=saved.time&&now-saved.time<400){counters.cacheHits++;return{...saved.value,cacheHit:true};}
  counters.searches++;
  const save=value=>{cache.set(key,{time:now,value});while(cache.size>16)cache.delete(cache.keys().next().value);return value;};
  const min=finite(p.minang)?p.minang:0,max=finite(p.maxang)?p.maxang:90,looks=fixed&&[0,1].includes(options.fixedLook)?[options.fixedLook]:[...new Set([p.look,1-p.look].filter(v=>v===0||v===1))],candidates=[],seen=new Set();
  for(const look of looks){
   const angles=fixed?[options.fixedDisplay,180-options.fixedDisplay].map(theta=>look===0?180-theta-p.body:theta+p.body).filter(a=>a>=min-1e-6&&a<=max+1e-6):Array.from({length:Math.max(0,Math.floor(max)-Math.ceil(min)+1)},(_,i)=>Math.ceil(min)+i);
   for(const angle of [...new Set(angles)]){
    const origin=api.launch({...p,look,ang:angle});if(!origin||![origin.x,origin.y,origin.angle].every(finite))continue;origin.x+=m.dx||0;origin.y+=m.dy||0;
    const sine=Math.sin(origin.angle*DEG);if(sine<=.01)continue;
    const ideal=(m.ay*T+(m.velocityBiasY||0))/(m.ratio*sine),base=Math.max(1,Math.min(400,Math.round(ideal)));
    for(const delta of [-24,-16,-8,-4,-2,-1,0,1,2,4,8,16,24]){
     const power=base+delta;if(power<1||power>400)continue;const id=look+':'+angle+':'+power;if(seen.has(id))continue;seen.add(id);
     const start=startOf(m,origin,power),candidateJumps=weather.some(w=>[7,8].includes(w[0]))?(globalThis.__reaTornadoMethod?.predict(start,d.weathers,T)?.jumps??[]):[],opening=stateAt(start,openingMs,candidateJumps),apexErrorMs=Math.abs(opening.vy/m.ay)*1000;
     if(apexErrorMs>apexTolerance||opening.y>target.y-36)continue;
     const starts=fragmentStarts(start,openingMs,releaseMs,candidateJumps);if(!weather.some(w=>[7,8].includes(w[0]))&&starts.filter(s=>canReach(s,target,radius,verticalTolerance,childHorizon)).length<minNear)continue;const landings=starts.map(s=>planeLanding(s,target.y,childHorizon,weather.some(w=>[7,8].includes(w[0]))?(globalThis.__reaTornadoMethod?.predict(s,d.weathers,childHorizon)?.jumps??[]):[]));if(landings.some(v=>!v))continue;
     const xs=landings.map(v=>v.x),center=xs.reduce((a,b)=>a+b,0)/xs.length,span=Math.max(...xs)-Math.min(...xs),near=xs.filter(x=>Math.abs(x-target.x)<=radius).length;
     const score=(6-near)*10000+Math.abs(center-target.x)*2+span*.2+apexErrorMs*.04+Math.abs(angle-p.ang)*.02+(look===p.look?0:.1);
     candidates.push({look,angle,power,origin,start,opening,apexErrorMs,score,analyticNear:near,analyticSpan:span});
    }
   }
  }
  counters.analyticCandidates+=candidates.length;
  if(!candidates.length)return save(failed(fixed?'Skybomb: góc đang giữ chưa đủ để bung gần đỉnh; đổi góc hoặc chọn Tự động':'Skybomb: giới hạn góc/lực hiện tại chưa tạo được điểm bung gần đỉnh trên mục tiêu'));
  candidates.sort((a,b)=>a.score-b.score);let best=null,bestNear=0,bestApex=null,tried=0;
  const parentModel={...m,turtleSS:false,turtlePair:false,turtleSkybomb:false,maxTime:T};
  for(const candidate of candidates.slice(0,maxCandidates)){
   tried++;counters.fullCandidates++;counters.trajectoryCalls++;
   const parent=api.trajectory(d,parentModel,candidate.origin,candidate.power,target,T,{clearance:Math.max(0,Math.min(20,options.clearance??0)),searchOnly:false,ignorePlayerContact:false});
   if(parent?.hit||!parent?.points?.length)continue;
   const jumps=parent.jumps??[],opening=stateAt(candidate.start,openingMs,jumps),apexErrorMs=Math.abs(opening.vy/(opening.ay||m.ay))*1000;
   if(apexErrorMs>apexTolerance||opening.y>target.y-36||api.terrain(d,opening.x,opening.y))continue;
   const starts=fragmentStarts(candidate.start,openingMs,releaseMs,jumps),children=[],near=[];
   for(const start of starts){
    const childModel={...m,ratio:1,speedQuantization:'floor',velocityBiasX:0,velocityBiasY:0,dx:0,dy:0,ax:start.ax,ay:start.ay,turtleSS:false,turtlePair:false,turtleSkybomb:false,pathBased:false,provisional:true,maxTime:childHorizon};
    counters.trajectoryCalls++;const local=api.trajectory(d,childModel,{x:start.x,y:start.y,angle:start.ang},start.power,target,childHorizon,{clearance:0,searchOnly:true,ignorePlayerContact:true});
    const hit=local.hit?{...local.hit,t:release+local.hit.t}:null,child={...local,points:(local.points??[]).map(q=>({...q,t:release+q.t})),hit,localHit:local.hit??null,start,skybombFragment:true};children.push(child);
    if(hit?.type==='ground'&&!hit.clearanceOnly&&Math.abs(hit.x-target.x)<=radius&&Math.abs(hit.y-target.y)<=verticalTolerance)near.push(child);
   }
   const count=near.length;bestNear=Math.max(bestNear,count);bestApex=bestApex===null?apexErrorMs:Math.min(bestApex,apexErrorMs);if(count<minNear)continue;
   const contacts=children.filter(c=>c.hit?.type==='ground'&&!c.hit.clearanceOnly),xs=contacts.map(c=>c.hit.x),span=xs.length?Math.max(...xs)-Math.min(...xs):Infinity,center=xs.reduce((a,b)=>a+b,0)/(xs.length||1),nearest=near.toSorted((a,b)=>Math.hypot(a.hit.x-target.x,a.hit.y-target.y)-Math.hypot(b.hit.x-target.x,b.hit.y-target.y))[0];
   const parentPoints=[...parent.points.filter(q=>q.t<T),{x:opening.x,y:opening.y,t:T},{x:opening.x,y:opening.y,t:release}],parentBranch={...parent,points:parentPoints,hit:null,skybombCarrier:true},path={points:parentPoints,hit:nearest.hit,branches:[parentBranch,...children],childPaths:children,skybomb:true,opening:{x:opening.x,y:opening.y,t:T},releaseTime:release,horizon:release+childHorizon,weatherHandled:!!parent.weatherHandled||children.some(c=>c.weatherHandled)};
   const score=(6-count)*10000+Math.abs(center-target.x)*2+span*.2+apexErrorMs*.04;
   const found={ready:true,provisional:true,predictedHit:false,turtleSkybomb:true,predictedNearCount:count,apexErrorMs,landingSpan:span,landingCenter:center,openingMs,releaseMs,origin:candidate.origin,angle:candidate.angle,displayAngle:candidate.origin.angle>90?180-candidate.origin.angle:candidate.origin.angle,look:candidate.look,power:candidate.power,target:{n:target.n,x:target.x,y:target.y},targetNumber:target.n,mobile:14,model:{...m,turtleSkybomb:true,provisional:true,mirrorEstimate:!!parent.mirrorReflections?.length||children.some(c=>c.mirrorReflections?.length),randomWeatherIgnored:weather.some(w=>w[0]===6)},path,t:nearest.hit.t,score,candidateLaw:'empirical-vx-half-scalar-round',search:{analyticCandidates:candidates.length,fullCandidates:tried,maxCandidates}};
   if(!best||score<best.score)best=found;
   if(count===6&&apexErrorMs<=80&&span<=radius*2&&Math.abs(center-target.x)<=radius*.35)break;
  }
  return save(best??failed('Skybomb: chưa có đường bung gần đỉnh với ít nhất '+minNear+' mảnh chạm đất sát mục tiêu',{bestNearCount:bestNear,bestApexErrorMs:bestApex,search:{analyticCandidates:candidates.length,fullCandidates:tried,maxCandidates}}));
 }
 const fragmentLaw=Object.freeze({provisional:true,observedEvents:6,horizontalScale:.5,scalarQuantization:'round',angleQuantization:'round',offsets:Object.freeze([...offsets])});
 Object.defineProperty(globalThis,'__reaTurtleSky',{value:Object.freeze({version:3,fragmentLaw,fragmentStarts,find,clearCache(){cache.clear();},stats(){return{...counters,cacheEntries:cache.size};}}),configurable:true});
 return{installed:true,version:3};
})()
