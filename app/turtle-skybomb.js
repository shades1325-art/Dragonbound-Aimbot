// Empirical Turtle SS Skybomb / Timebomb search. Installing exposes math only.
// Six-fragment law matches ten observed splits, including both directions
// near apex. Weather transitions remain provisional. No native controls,
// timers or network calls are used.
(() => {
 const DEG=Math.PI/180,finite=Number.isFinite,normalize=a=>(a%360+360)%360,offsets=[-20,-12,-4,4,12,20];
 const jobs=new Map(),cache=new Map(),identities=new WeakMap();let nextIdentity=0;
 const counters={searches:0,cacheHits:0,analyticCandidates:0,sampledPowers:0,refinedPowers:0,fullCandidates:0,trajectoryCalls:0};
 const identity=o=>o&&['object','function'].includes(typeof o)?(identities.has(o)?identities.get(o):(identities.set(o,++nextIdentity),nextIdentity)):null;
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
  const edges=[...new Set([0,...jumps.map(j=>j[0]/1000).filter(t=>t>0&&t<horizon),horizon])].sort((a,b)=>a-b);
  for(let i=0;i<edges.length-1;i++){
   const at=edges[i],end=edges[i+1],s=stateAt(start,at*1000,jumps),c=s.y-y;
   let roots=[];
   if(Math.abs(s.ay)<1e-10){if(Math.abs(s.vy)>1e-10)roots=[-c/s.vy];}
   else{const discriminant=s.vy*s.vy-2*s.ay*c;if(discriminant>=0){const q=Math.sqrt(discriminant);roots=[(-s.vy-q)/s.ay,(-s.vy+q)/s.ay];}}
   for(const t of roots.sort((a,b)=>a-b))if(t>=-1e-9&&at+t>1e-8&&t<=end-at+1e-9&&s.vy+s.ay*t>1e-8)return{x:s.x+s.vx*t+s.ax*t*t/2,y,t:at+t};
  }
  return null;
 }
 // A collision near the target is possible only if the analytic child enters
 // its full contact rectangle. This rejects misses without sampling terrain.
 function canReach(s,target,radius,vertical,horizon){
  const vx=s.power*Math.cos(s.ang*DEG),vy=-s.power*Math.sin(s.ang*DEG),roots=(a,b,c)=>{if(Math.abs(a)<1e-10)return Math.abs(b)<1e-10?[]:[-c/b];const disc=b*b-4*a*c;if(disc<0)return[];const q=Math.sqrt(disc);return[(-b-q)/(2*a),(-b+q)/(2*a)];},times=[0,horizon,...[target.x-radius,target.x+radius].flatMap(x=>roots(s.ax/2,vx,s.x-x)),...[target.y-vertical,target.y+vertical].flatMap(y=>roots(s.ay/2,vy,s.y-y))].filter(t=>t>=0&&t<=horizon).sort((a,b)=>a-b);
  const inside=t=>{const x=s.x+vx*t+s.ax*t*t/2,y=s.y+vy*t+s.ay*t*t/2;return Math.abs(x-target.x)<=radius+1e-7&&Math.abs(y-target.y)<=vertical+1e-7;};
  return times.some((t,i)=>inside(t)||i+1<times.length&&inside((t+times[i+1])/2));
 }
 function failed(reason,extra={}){return{ready:false,provisional:true,turtleSkybomb:true,predictedHit:false,reason,...extra};}
 // Tight/core and wide/near are engineering geometry windows, not blast radii.
 // Rank the centered cluster before fringe contacts; six fringe landings must
 // not beat five centered landings merely because they fit the wider window.
 function footprint(contacts,target,radius=28,vertical=25,coreRadius=14){
  const near=contacts.filter(q=>Math.abs(q.x-target.x)<=radius&&Math.abs(q.y-target.y)<=vertical),core=near.filter(q=>Math.abs(q.x-target.x)<=coreRadius&&Math.abs(q.y-target.y)<=Math.min(vertical,18));
  const xs=near.map(q=>q.x),center=xs.reduce((a,b)=>a+b,0)/(xs.length||1),span=xs.length?Math.max(...xs)-Math.min(...xs):Infinity;
  return{nearCount:near.length,coreCount:core.length,center,span,centerError:near.length?Math.abs(center-target.x):Infinity,worstNearError:near.length?Math.max(...near.map(q=>Math.hypot(q.x-target.x,q.y-target.y))):Infinity};
 }
 function accuracyScore(q,{carrierAllowance=0,powerSensitivity=0,childTime=0}={}){return(6-q.coreCount)*10000+(6-q.nearCount)*500+q.centerError*4+q.span*.5+q.worstNearError*2+carrierAllowance*.4+powerSensitivity*2+childTime*3;}
 function terrainSignature(api,d,result){let hash=2166136261;for(const branch of result?.path?.branches??[]){const points=branch.points??[],step=Math.max(1,Math.ceil(points.length/64));for(let i=0;i<points.length;i+=step)hash=Math.imul(hash^Number(!!api.terrain(d,points[i].x,points[i].y)),16777619);if(branch.hit)for(const [x,y]of [[0,0],[0,2],[2,0],[-2,0]])hash=Math.imul(hash^Number(!!api.terrain(d,branch.hit.x+x,branch.hit.y+y)),16777619);}return hash;}
 function* search(api,d,m,p,target,options={}){
  const requestedMode=options.turtleSSMode??m?.turtleSSMode??'auto';
  if(requestedMode==='auto'){
   const maxCandidates=Math.max(2,Math.min(16,Math.floor(options.maxCandidates??12))),timebomb=yield* search(api,d,m,p,target,{...options,turtleSSMode:'timebomb',maxCandidates:Math.ceil(maxCandidates/2)}),skybomb=yield* search(api,d,m,p,target,{...options,turtleSSMode:'skybomb',maxCandidates:Math.floor(maxCandidates/2)}),results=[timebomb,skybomb],ready=results.filter(r=>r.ready).sort((a,b)=>a.accuracyScore-b.accuracyScore),best=ready[0];
   const alternatives=results.map((r,i)=>({mode:i===0?'timebomb':'skybomb',ready:r.ready,coreCount:r.predictedCoreCount??0,nearCount:r.predictedNearCount??0,score:r.accuracyScore??null,reason:r.reason??null}));
   const choice=ready.length===2&&options.preferMirror!==false&&d?.weathers?.some(w=>w.weather_type===7)&&globalThis.__reaMirror?.prefer&&ready[0].predictedCoreCount===ready[1].predictedCoreCount&&ready[0].predictedNearCount===ready[1].predictedNearCount?globalThis.__reaMirror.prefer(ready[1],best,target,{nearRadius:options.nearRadius??28,verticalTolerance:options.verticalTolerance??25}):best;
   return choice?{...choice,ssSelectionAuto:true,ssAlternatives:alternatives}:failed('SS tự chọn: chưa có chùm mảnh đủ sát mục tiêu ở cả Timebomb và Skybomb',{ssSelectionAuto:true,ssAlternatives:alternatives});
  }
  const timebomb=requestedMode==='timebomb',label=timebomb?'Timebomb':'Skybomb';
  if((p?.mobile!==14&&p?.mobile_data?.name!=='Turtle')||p?.selected_shot!==2)return failed(label+' chỉ dùng cho Turtle SS');
  if(!m?.valid||![m.ratio,m.ax,m.ay].every(finite)||m.ratio<=0||m.ay<=0)return failed(label+': chưa có mô hình vận tốc và gia tốc Turtle phù hợp');
  if(!target||![target.x,target.y,p.x,p.y,p.body].every(finite))return failed(label+': chờ vị trí xe và mục tiêu');
  if(typeof api?.launch!=='function'||typeof api?.trajectory!=='function'||typeof api?.terrain!=='function')return failed(label+': chưa có bộ tính đường đạn');
  const openingMs=Math.max(100,Math.min(10000,options.openingMs??m.ssOpeningMs??2100)),releaseMs=Math.max(openingMs,options.releaseMs??m.ssReleaseMs??openingMs+500),T=openingMs/1000,release=releaseMs/1000;
  const radius=Math.max(8,Math.min(60,options.nearRadius??28)),verticalTolerance=Math.max(5,Math.min(60,options.verticalTolerance??25)),apexTolerance=Math.max(10,Math.min(600,options.apexToleranceMs??300)),minNear=Math.max(3,Math.min(6,options.minNearCount??3)),maxCandidates=Math.max(1,Math.min(16,Math.floor(options.maxCandidates??12))),childHorizon=Math.max(.1,Math.min(5,options.childHorizon??(timebomb?1.2:5))),openingRadius=Math.max(30,Math.min(240,options.openingRadius??160));
  const coreRadius=Math.max(8,Math.min(radius,options.coreRadius??14)),minCore=Math.max(1,Math.min(6,options.minCoreCount??3));
  const openingAllowed=(opening,apexErrorMs)=>timebomb?opening.vy>0&&opening.y<target.y-4&&Math.hypot(opening.x-target.x,opening.y-target.y)<=openingRadius:apexErrorMs<=apexTolerance&&opening.y<=target.y-36;
  const now=typeof options.now==='function'?options.now():typeof performance!=='undefined'?performance.now():Date.now(),fixed=options.mode==='fixed'&&finite(options.fixedDisplay),weather=(d.weathers??[]).map(w=>[w.weather_type,w.x,w.size]),preferMirror=options.preferMirror!==false&&weather.some(w=>w[0]===7)&&!!globalThis.__reaMirror?.prefer;
  const key=JSON.stringify([identity(api),identity(d.ground),identity(d.ground?.data),identity(d.ground?.pixels),identity(d.ground?.imageData?.data),d.ground?.revision,d.ground?.version,p.x,p.y,p.body,p.minang,p.maxang,p.aim?.[2],target.n,target.x,target.y,m.ratio,m.speedQuantization,m.ax,m.ay,m.velocityBiasX,m.velocityBiasY,m.dx,m.dy,m.sampleCount,identity(m.positionAllowance),d.wind_power,d.wind_angle,weather,openingMs,releaseMs,radius,coreRadius,minCore,verticalTolerance,apexTolerance,minNear,maxCandidates,childHorizon,options.mode,options.fixedDisplay,options.fixedLook,options.clearance,preferMirror,timebomb,openingRadius]);
  const saved=cache.get(key);if(saved&&now>=saved.time&&now-saved.time<400){counters.cacheHits++;return{...saved.value,cacheHit:true};}
  counters.searches++;
  const save=value=>{cache.set(key,{time:typeof options.now==='function'?options.now():typeof performance!=='undefined'?performance.now():Date.now(),value});while(cache.size>16)cache.delete(cache.keys().next().value);return value;};
  const min=finite(p.minang)?p.minang:0,max=finite(p.maxang)?p.maxang:90,looks=fixed&&[0,1].includes(options.fixedLook)?[options.fixedLook]:[...new Set([p.look,1-p.look].filter(v=>v===0||v===1))],candidates=[],seen=new Set(),windows=[],hasWeather=weather.some(w=>[7,8].includes(w[0])),hasTornado=weather.some(w=>w[0]===8);
  function evaluate(look,angle,origin,power,refined=false){
   if(power<1||power>400)return;const id=look+':'+angle+':'+power;if(seen.has(id))return;seen.add(id);counters.sampledPowers++;if(refined)counters.refinedPowers++;
   const start=startOf(m,origin,power),parentWeather=hasWeather?globalThis.__reaTornadoMethod?.predict(start,d.weathers,T):null,candidateJumps=parentWeather?.jumps??[],opening=stateAt(start,openingMs,candidateJumps),apexErrorMs=Math.abs(opening.vy/(opening.ay||m.ay))*1000;
   if(!openingAllowed(opening,apexErrorMs))return;
   const starts=fragmentStarts(start,openingMs,releaseMs,candidateJumps);
   if(!hasWeather){let potential=0;for(let i=0;i<starts.length;i++){if(canReach(starts[i],target,radius,verticalTolerance,childHorizon))potential++;if(potential+starts.length-i-1<minNear)return;}}
   const childWeather=starts.map(s=>hasWeather?globalThis.__reaTornadoMethod?.predict(s,d.weathers,childHorizon):null),landings=starts.map((s,i)=>planeLanding(s,target.y,childHorizon,childWeather[i]?.jumps??[])),supported=landings.filter(Boolean);if(supported.length<minNear)return;
   const xs=supported.map(v=>v.x),center=xs.reduce((a,b)=>a+b,0)/xs.length,span=Math.max(...xs)-Math.min(...xs),near=xs.filter(x=>Math.abs(x-target.x)<=radius).length,core=xs.filter(x=>Math.abs(x-target.x)<=coreRadius).length;
   const openingDistance=Math.hypot(opening.x-target.x,opening.y-target.y),timingScore=timebomb?openingDistance*.3:apexErrorMs*.04;
   const score=(6-core)*10000+(6-near)*500+Math.abs(center-target.x)*4+span*.5+timingScore+power*.0001;
   const mirrorHint=!!parentWeather?.reflections?.length||childWeather.some((w,i)=>landings[i]&&w?.reflections?.some(r=>r.timeMs<=landings[i].t*1000));
   candidates.push({look,angle,power,origin,start,opening,apexErrorMs,score,analyticNear:near,analyticCore:core,analyticSpan:span,mirrorHint});
  }
  for(const look of looks){
   const angles=fixed?[options.fixedDisplay,180-options.fixedDisplay].map(theta=>look===0?180-theta-p.body:theta+p.body).filter(a=>a>=min-1e-6&&a<=max+1e-6):Array.from({length:Math.max(0,Math.floor(max)-Math.ceil(min)+1)},(_,i)=>Math.ceil(min)+i);
   for(const angle of [...new Set(angles)]){
    const origin=api.launch({...p,look,ang:angle});if(!origin||![origin.x,origin.y,origin.angle].every(finite))continue;origin.x+=m.dx||0;origin.y+=m.dy||0;
    const sine=Math.sin(origin.angle*DEG);if(sine<=.01)continue;
    // Invert the current wind/elevation model at opening time. Historic
    // Gunbound bars and windchart constants are not DragonBound calibration.
    const cosine=Math.cos(origin.angle*DEG),ideal=timebomb?((target.x-origin.x-(m.velocityBiasX||0)*T-m.ax*T*T/2)*cosine-(target.y-45-origin.y-(m.velocityBiasY||0)*T-m.ay*T*T/2)*sine)/(m.ratio*T):(m.ay*T+(m.velocityBiasY||0))/(m.ratio*sine),base=Math.max(1,Math.min(400,Math.round(ideal))),range=timebomb?openingRadius/(m.ratio*T):(m.ay*apexTolerance/1000+1)/(m.ratio*sine),low=Math.max(1,Math.ceil(ideal-range)),high=Math.min(400,Math.floor(ideal+range));
    for(const delta of [-24,-16,-8,-4,-2,-1,0,1,2,4,8,16,24]){evaluate(look,angle,origin,base+delta);yield;}
    if(hasTornado)for(let power=1;power<=36;power+=3){evaluate(look,angle,origin,power);yield;}
    windows.push({look,angle,origin,low,high});
   }
  }
  // Expand only when the cheap seeds cannot place all six near the target.
  if(!candidates.some(c=>c.analyticCore===6&&(!preferMirror||c.mirrorHint)))for(const w of windows)for(let power=hasWeather?1:w.low;power<=(hasWeather?400:w.high);power+=hasWeather?12:4){evaluate(w.look,w.angle,w.origin,power);yield;}
  const order=(a,b)=>b.analyticCore-a.analyticCore||b.analyticNear-a.analyticNear||(preferMirror?Number(b.mirrorHint)-Number(a.mirrorHint):0)||(a.score-b.score);
  candidates.sort(order);const refinementAngles=new Set(),refine=[];for(const candidate of candidates){const group=candidate.look+':'+candidate.angle;if(refinementAngles.has(group))continue;refinementAngles.add(group);refine.push(candidate);if(refine.length>=8)break;}
  for(const candidate of refine)for(let delta=-3;delta<=3;delta++)if(delta){evaluate(candidate.look,candidate.angle,candidate.origin,candidate.power+delta,true);yield;}
  counters.analyticCandidates+=candidates.length;
  if(!candidates.length)return save(failed(timebomb?'Timebomb: chưa có điểm bung sát mục tiêu; thử đổi góc hoặc chọn Skybomb':fixed?'Skybomb: góc đang giữ chưa đủ để bung gần đỉnh; đổi góc hoặc chọn Tự động':'Skybomb: giới hạn góc/lực hiện tại chưa tạo được điểm bung gần đỉnh trên mục tiêu'));
  candidates.sort(order);let best=null,bestNear=0,bestApex=null,tried=0;
  const parentModel={...m,turtleSS:false,turtlePair:false,turtleSkybomb:false,maxTime:T},shortlist=[],selected=new Set(),groups=new Set();
  if(preferMirror)for(const candidate of candidates.filter(c=>c.mirrorHint)){const group=candidate.look+':'+candidate.angle;if(groups.has(group))continue;groups.add(group);shortlist.push(candidate);selected.add(candidate);if(shortlist.length>=Math.ceil(maxCandidates/2))break;}
  if(!fixed)for(const candidate of candidates){const group=candidate.look+':'+candidate.angle;if(shortlist.length>=maxCandidates)break;if(groups.has(group))continue;groups.add(group);shortlist.push(candidate);selected.add(candidate);if(shortlist.length>=Math.max(1,Math.floor(maxCandidates*2/3)))break;}
  for(const candidate of candidates){if(shortlist.length>=maxCandidates)break;if(!selected.has(candidate)){shortlist.push(candidate);selected.add(candidate);}}
  shortlist.sort((a,b)=>a.score-b.score);
  for(const candidate of shortlist){
   tried++;counters.fullCandidates++;counters.trajectoryCalls++;
   const parent=api.trajectory(d,parentModel,candidate.origin,candidate.power,target,T,{clearance:Math.max(0,Math.min(20,options.clearance??0)),searchOnly:false,ignorePlayerContact:false});
   yield;
   if(parent?.hit||!parent?.points?.length)continue;
   const jumps=parent.jumps??[],opening=stateAt(candidate.start,openingMs,jumps),apexErrorMs=Math.abs(opening.vy/(opening.ay||m.ay))*1000;
   if(!openingAllowed(opening,apexErrorMs)||api.terrain(d,opening.x,opening.y))continue;
   const starts=fragmentStarts(candidate.start,openingMs,releaseMs,jumps),children=[],near=[];
   for(const start of starts){
    const childModel={...m,ratio:1,speedQuantization:'floor',velocityBiasX:0,velocityBiasY:0,dx:0,dy:0,ax:start.ax,ay:start.ay,turtleSS:false,turtlePair:false,turtleSkybomb:false,pathBased:false,provisional:true,maxTime:childHorizon};
    counters.trajectoryCalls++;const local=api.trajectory(d,childModel,{x:start.x,y:start.y,angle:start.ang},start.power,target,childHorizon,{clearance:0,searchOnly:true,ignorePlayerContact:true});
    const hit=local.hit?{...local.hit,t:release+local.hit.t}:null,child={...local,points:(local.points??[]).map(q=>({...q,t:release+q.t})),hit,localHit:local.hit??null,start,skybombFragment:true};children.push(child);
    if(hit?.type==='ground'&&!hit.clearanceOnly&&Math.abs(hit.x-target.x)<=radius&&Math.abs(hit.y-target.y)<=verticalTolerance)near.push(child);
    yield;
   }
   const count=near.length,q=footprint(near.map(c=>c.hit),target,radius,verticalTolerance,coreRadius);bestNear=Math.max(bestNear,count);bestApex=bestApex===null?apexErrorMs:Math.min(bestApex,apexErrorMs);if(count<minNear||q.coreCount<minCore)continue;
   const contacts=children.filter(c=>c.hit?.type==='ground'&&!c.hit.clearanceOnly),xs=contacts.map(c=>c.hit.x),span=xs.length?Math.max(...xs)-Math.min(...xs):Infinity,center=xs.reduce((a,b)=>a+b,0)/(xs.length||1),nearest=near.toSorted((a,b)=>Math.hypot(a.hit.x-target.x,a.hit.y-target.y)-Math.hypot(b.hit.x-target.x,b.hit.y-target.y))[0];
   const parentPoints=[...parent.points.filter(q=>q.t<T),{x:opening.x,y:opening.y,t:T},{x:opening.x,y:opening.y,t:release}],parentBranch={...parent,points:parentPoints,hit:null,skybombCarrier:true},path={points:parentPoints,hit:nearest.hit,branches:[parentBranch,...children],childPaths:children,skybomb:true,opening:{x:opening.x,y:opening.y,t:T},releaseTime:release,horizon:release+childHorizon,weatherHandled:!!parent.weatherHandled||children.some(c=>c.weatherHandled)};
   const tilts=near.map(child=>{const v=stateAt(child.start,child.localHit.t*1000,child.jumps??[]);return Math.atan2(Math.abs(v.vx),Math.max(0,v.vy))/DEG;}),impactTiltDegrees=tilts.reduce((a,b)=>a+b,0)/tilts.length;
   const openingDistance=Math.hypot(opening.x-target.x,opening.y-target.y),openingInsideTornado=weather.some(w=>w[0]===8&&Math.abs(opening.x-w[1])<=w[2]/4);
   // +/-1 UI power sensitivity at the target plane is a diagnostic, not a
   // collision probability. Keep it separate from model uncertainty and do
   // not pretend that weather-transformed fragments have been validated.
   let powerSensitivity=0;
   if(!hasWeather)for(const delta of [-1,1]){const power=candidate.power+delta;if(power<1||power>400)continue;const shifted=fragmentStarts(startOf(m,candidate.origin,power),openingMs,releaseMs).map(s=>planeLanding(s,target.y,childHorizon));for(let i=0;i<shifted.length;i++)if(shifted[i]&&candidate.start){const baseline=planeLanding(starts[i],target.y,childHorizon);if(baseline)powerSensitivity=Math.max(powerSensitivity,Math.abs(shifted[i].x-baseline.x));else powerSensitivity=Math.max(powerSensitivity,radius*2);}else powerSensitivity=Math.max(powerSensitivity,radius*2);}
   const allowance=typeof m.positionAllowance==='function'?m.positionAllowance(candidate.power,T):0,carrierAllowance=finite(allowance)?Math.max(0,allowance):0,childTime=near.reduce((n,c)=>n+c.localHit.t,0)/count,quality={...q,carrierAllowance,powerSensitivity:hasWeather?null:powerSensitivity,childTime,uncertaintyKnown:typeof m.positionAllowance==='function',sensitivityEstimated:!hasWeather},score=accuracyScore(q,{carrierAllowance,powerSensitivity,childTime});
   const found={ready:true,provisional:true,predictedHit:false,turtleSkybomb:true,predictedNearCount:count,apexErrorMs,landingSpan:span,landingCenter:center,impactTiltDegrees,openingMs,releaseMs,origin:candidate.origin,angle:candidate.angle,displayAngle:candidate.origin.angle>90?180-candidate.origin.angle:candidate.origin.angle,look:candidate.look,power:candidate.power,target:{n:target.n,x:target.x,y:target.y},targetNumber:target.n,mobile:14,model:{...m,turtleSkybomb:true,provisional:true,mirrorEstimate:!!parent.mirrorReflections?.length||children.some(c=>c.mirrorReflections?.length),randomWeatherIgnored:weather.some(w=>w[0]===6)},path,t:nearest.hit.t,score,candidateLaw:'empirical-vx-half-scalar-round',search:{analyticCandidates:candidates.length,fullCandidates:tried,maxCandidates}};
   Object.assign(found,{turtleTimebomb:timebomb,ssMode:timebomb?'timebomb':'skybomb',openingDistance,openingInsideTornado,predictedCoreCount:q.coreCount,accuracyScore:score,ssQuality:quality,ssLowConfidence:carrierAllowance>coreRadius||powerSensitivity>coreRadius||hasWeather});
   found.model.tornadoEstimate=(parent.tornadoTransitions??parent.weatherTransitions??0)>0||children.some(c=>c.tornadoTransitions>0)||openingInsideTornado;
   if(best&&found.predictedCoreCount!==best.predictedCoreCount){if(found.predictedCoreCount>best.predictedCoreCount)best=preferMirror?globalThis.__reaMirror.prefer(found,null,target,{nearRadius:radius,verticalTolerance}):found;}
   else if(preferMirror)best=globalThis.__reaMirror.prefer(found,best,target,{nearRadius:radius,verticalTolerance});else if(!best||score<best.score)best=found;
   if(q.coreCount===6&&q.centerError<=coreRadius*.35&&powerSensitivity<=coreRadius&&(!preferMirror||best?.mirrorBenefit?.hasMirror))break;
  }
  return save(best??failed(label+': chưa có chùm với ít nhất '+minCore+' mảnh trong vùng sát '+coreRadius+' px',{bestNearCount:bestNear,bestApexErrorMs:bestApex,search:{analyticCandidates:candidates.length,fullCandidates:tried,maxCandidates}}));
 }
 function find(api,d,m,p,target,options={}){
  if(!options.cooperative){const iterator=search(api,d,m,p,target,options);let next;do{next=iterator.next();}while(!next.done);return next.value;}
  const clock=typeof options.sliceNow==='function'?options.sliceNow:()=>typeof performance!=='undefined'?performance.now():Date.now(),now=clock();
  const key=JSON.stringify([identity(api),identity(d?.ground),identity(d?.ground?.imageData?.data),d?.ground?.version,d?.ground?.revision,p?.x,p?.y,p?.body,p?.selected_shot,p?.minang,p?.maxang,p?.aim?.[2],target?.n,target?.x,target?.y,m?.ratio,m?.ax,m?.ay,m?.speedQuantization,m?.velocityBiasX,m?.velocityBiasY,m?.dx,m?.dy,m?.sampleCount,m?.valid,m?.ssOpeningMs,m?.ssReleaseMs,m?.turtleSSMode,identity(m?.positionAllowance),d?.wind_power,d?.wind_angle,d?.weathers?.map(w=>[w.weather_type,w.x,w.size]),options.mode,options.fixedDisplay,options.fixedLook,options.clearance,options.turtleSSMode,options.preferMirror,options.maxCandidates,options.openingMs,options.releaseMs,options.nearRadius,options.coreRadius,options.minCoreCount,options.minNearCount,options.verticalTolerance,options.apexToleranceMs,options.childHorizon,options.openingRadius]);
  let job=jobs.get(key);if(job?.done&&now-job.time<(job.value?.ready?10000:400)&&(!job.value?.ready||job.terrain===terrainSignature(api,d,job.value)))return{...job.value,cacheHit:true};
  if(!job||job.done){if(job?.done)cache.clear();job={iterator:search(api,d,m,p,target,options),slices:0,steps:0,done:false};jobs.set(key,job);while(jobs.size>8)jobs.delete(jobs.keys().next().value);}
  const budget=Math.max(2,Math.min(12,options.sliceBudgetMs??8)),limit=Math.max(1,Math.min(512,options.maxSliceSteps??512));let steps=0,next;
  do{next=job.iterator.next();steps++;job.steps++;if(next.done){job.done=true;job.value=next.value;job.time=clock();job.terrain=next.value?.ready?terrainSignature(api,d,next.value):null;return next.value;}}while(steps<limit&&clock()-now<budget);
  job.slices++;if(job.slices>=256){job.iterator.return();job.done=true;job.time=clock();job.value=failed('SS: đã hết lượt tìm cho cảnh này; thử đổi vị trí hoặc góc');return job.value;}
  return{ready:false,pending:true,provisional:true,turtleSkybomb:true,predictedHit:false,reason:'SS: đang so sánh góc, lực và chùm mảnh',search:{slices:job.slices,steps:job.steps,sliceSteps:steps}};
 }
 const fragmentLaw=Object.freeze({provisional:true,observedEvents:10,horizontalScale:.5,scalarQuantization:'round',angleQuantization:'round',offsets:Object.freeze([...offsets])});
 Object.defineProperty(globalThis,'__reaTurtleSky',{value:Object.freeze({version:7,fragmentLaw,fragmentStarts,planeLanding,footprint,accuracyScore,find,clearCache(){cache.clear();jobs.clear();},stats(){return{...counters,cacheEntries:cache.size};}}),configurable:true});
 return{installed:true,version:7};
})()
