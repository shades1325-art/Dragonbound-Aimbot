// Empirical ordinary-projectile mirror transitions. Server source is unavailable.
// Five retained type7 launches match trigger +/-25, eject +/-26, 25ms events,
// crossing position plus grid-time rounded velocity. Above -600/reentry and
// mixed mirror/tornado transitions remain explicitly experimental.
(() => {
 const DEG=Math.PI/180,finite=Number.isFinite,normalize=a=>(a%360+360)%360;
 const constants=Object.freeze({collisionHalfWidth:25,ejectHalfWidth:26,stepMs:25,observedLaunches:5,maxEvents:24,maxJumps:160,maxHorizon:20,visibleTop:-600,empirical:true});
 const cache=new Map(),functions=new WeakMap();let nextFunction=0,hits=0,computes=0;
 function resolve(w,index){if(Array.isArray(w))return{type:w[0]===6&&w[3]!==undefined?w[3]:w[0],x:w[1],size:w[2],index};return{type:w?.weather_type??w?.type,x:w?.x,size:w?.size,index};}
 function vector(start){return{vx:start.vx??Math.cos(start.ang*DEG)*start.power,vy:start.vy??-Math.sin(start.ang*DEG)*start.power};}
 function state(start,ms,jumps=[]){const base=vector(start);let x=start.x,y=start.y,vx=base.vx,vy=base.vy,ax=start.ax,ay=start.ay,time=ms;for(const j of jumps){if(j[0]>ms)break;x=j[1];y=j[2];vx=j[3];vy=j[4];ax=j[5]??start.ax;ay=j[6]??start.ay;time=ms-j[0];}const t=time/1000;return{x:x+vx*t+ax*t*t/2,y:y+vy*t+ay*t*t/2,vx:vx+ax*t,vy:vy+ay*t,ax,ay};}
 function roots(a,b,c){if(Math.abs(a)<1e-10)return Math.abs(b)<1e-10?[]:[-c/b];const disc=b*b-4*a*c;if(disc<0)return[];const q=Math.sqrt(disc);return[(-b-q)/(2*a),(-b+q)/(2*a)];}
 function firstMirror(start,jumps,mirrors,durationMs,cursor){
  const segments=[0,...jumps.map(j=>j[0]).filter(t=>t>=0&&t<=durationMs)],seen=new Set();let best=null;
  for(let i=0;i<segments.length;i++){
   const at=segments[i];if(seen.has(at))continue;seen.add(at);const end=Math.min(durationMs,segments[i+1]??durationMs),s=state(start,at,jumps),span=(end-at)/1000;if(span<0)continue;
   for(const mirror of mirrors){
    const choices=[];
    if(Math.abs(s.x-mirror.x)<=constants.collisionHalfWidth&&Math.abs(s.vx)>1e-8&&(s.x===mirror.x||(s.x-mirror.x)*s.vx<0))choices.push({dt:0,side:s.vx>0?-1:1,startingInside:true});
    for(const side of [-1,1])for(const dt of roots(s.ax/2,s.vx,s.x-(mirror.x+side*constants.collisionHalfWidth))){if(dt<=1e-8||dt>span+1e-9)continue;const vx=s.vx+s.ax*dt;if(vx*side>=-1e-8)continue;choices.push({dt,side,startingInside:false});}
    for(const choice of choices){const crossingMs=at+choice.dt*1000;if(crossingMs>durationMs+1e-6)continue;let eventMs=Math.ceil((cursor+crossingMs-1e-7)/constants.stepMs)*constants.stepMs-cursor;if(eventMs<=0)eventMs=constants.stepMs;if(eventMs>durationMs)continue;
     if(best&&eventMs>best.eventMs||best&&eventMs===best.eventMs&&crossingMs>=best.crossingMs)continue;
     best={mirror,eventMs,crossingMs,side:choice.side,startingInside:choice.startingInside,point:state(start,crossingMs,jumps)};
    }
   }
  }return best;
 }
 function predict(start,weathers=[],maxTime=6.5,tornadoPredict){
  const base=vector(start??{});if(!start||![start.x,start.y,start.ax,start.ay,base.vx,base.vy,maxTime].every(finite)||maxTime<0)throw TypeError('Invalid mirror launch or horizon');
  const horizon=Math.min(constants.maxHorizon,maxTime)*1000,rows=weathers.map(resolve).filter(w=>finite(w.x)&&finite(w.size)),mirrors=rows.filter(w=>w.type===7),tornadoes=rows.filter(w=>w.type===8).map(w=>({weather_type:8,x:w.x,size:w.size})),randomIgnored=rows.some(w=>w.type===6);
  const fn=typeof tornadoPredict==='function'?(functions.has(tornadoPredict)?functions.get(tornadoPredict):(functions.set(tornadoPredict,++nextFunction),nextFunction)):0;
  const key=JSON.stringify([start.x,start.y,start.ang,start.power,start.vx,start.vy,start.ax,start.ay,horizon,rows.map(w=>[w.type,w.x,w.size]),fn]);if(cache.has(key)){hits++;return{...cache.get(key),cacheHit:true};}computes++;
  const jumps=[],reflections=[],usedMirrors=new Set();let cursor=0,current={...start,vx:base.vx,vy:base.vy},tornadoEvents=0,reentryEstimate=false,eventLimit=false;
  for(let iteration=0;cursor<horizon&&iteration<constants.maxEvents;iteration++){
   const remaining=horizon-cursor,rad=Math.atan2(-current.vy,current.vx),native={x:current.x,y:current.y,ang:rad/DEG,power:Math.hypot(current.vx,current.vy),ax:current.ax,ay:current.ay},future=typeof tornadoPredict==='function'&&tornadoes.length?tornadoPredict(native,tornadoes,remaining/1000):null,local=(future?.jumps??[]).filter(j=>j[0]>0&&j[0]<=remaining).toSorted((a,b)=>a[0]-b[0]);
   const mirror=firstMirror(current,local,mirrors,remaining,cursor);
   const before=mirror?local.filter(j=>j[0]<mirror.eventMs):local;
   for(const j of before){if(jumps.length>=constants.maxJumps){eventLimit=true;break;}jumps.push([j[0]+cursor,...j.slice(1)]);tornadoEvents++;}
   if(eventLimit||!mirror)break;
   const atGrid=state(current,mirror.eventMs,local),vx=Math.round(-atGrid.vx),vy=Math.round(atGrid.vy),x=Math.round(mirror.mirror.x+mirror.side*constants.ejectHalfWidth),y=Math.round(mirror.point.y),timeMs=cursor+mirror.eventMs,jump=[timeMs,x,y,vx,vy];
   if(jumps.length>=constants.maxJumps){eventLimit=true;break;}jumps.push(jump);
   const repeated=usedMirrors.has(mirror.mirror.index);usedMirrors.add(mirror.mirror.index);reentryEstimate||=repeated;
   reflections.push({timeMs,crossingMs:cursor+mirror.crossingMs,x,y,incomingAngle:normalize(Math.atan2(-atGrid.vy,atGrid.vx)/DEG),outgoingAngle:normalize(Math.atan2(-vy,vx)/DEG),incomingVelocity:{x:atGrid.vx,y:atGrid.vy},outgoingVelocity:{x:vx,y:vy},mirrorX:mirror.mirror.x,mirrorIndex:mirror.mirror.index,side:mirror.side,startingInside:mirror.startingInside,heightUnverified:mirror.point.y<constants.visibleTop,reentryEstimate:repeated,estimated:true,source:'five-native-launch-empirical-rule'});
   cursor=timeMs;current={x,y,vx,vy,ax:start.ax,ay:start.ay};if(iteration===constants.maxEvents-1&&cursor<horizon)eventLimit=true;
  }
  const result={jumps,reflections,provisional:true,stepMs:constants.stepMs,randomIgnored,compoundEstimate:reflections.length>0&&tornadoEvents>0,reentryEstimate,eventLimit,horizonMs:horizon,heightUnverified:reflections.some(r=>r.heightUnverified),startingInsideEstimate:reflections.some(r=>r.startingInside),source:'empirical-mirror-transitions',tornadoEvents};
  cache.set(key,result);if(cache.size>128)cache.delete(cache.keys().next().value);return result;
 }
 Object.defineProperty(globalThis,'__reaMirror',{value:Object.freeze({version:1,constants,predict,clearCache(){cache.clear();},stats(){return{cacheEntries:cache.size,computes,cacheHits:hits};}}),configurable:true});return{installed:true,version:1};
})()
