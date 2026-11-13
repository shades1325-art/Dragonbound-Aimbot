// Bounded reuse of observed current-match Boomer headwind trajectories.
// Exact angle/power only. No force/angle interpolation or native actions.
(()=>{
 const finite=Number.isFinite,rad=a=>a*Math.PI/180,normalize=a=>(a%360+360)%360,angleDistance=(a,b)=>Math.abs((a-b+540)%360-180);
 const angleOf=p=>normalize((p.look===0?180-p.ang:p.ang)-p.body),windVector=w=>({x:w.power*Math.cos(rad(w.angle)),y:-w.power*Math.sin(rad(w.angle))});
 function prepare(record,session){
  if(record?.session!==session||record.mobile!==15||!record.isLocal||![0,1,2].includes(record.shotType)||record.bullet!==(record.shotType===2?51:50)||(record.start?.t??0)!==0||!record.player||record.weatherKnown===false||!Array.isArray(record.weathers)||!Array.isArray(record.path)||record.path.length%3||record.path.length<24||!finite(record.pathDuration)||record.pathDuration<=0||!finite(record.uiPower)||record.uiPower<1||record.uiPower>400||!Number.isInteger(record.uiPower)||record.special?.wave||record.special?.orbit)return null;
  const p=record.player,w=record.wind,a=p.aim?.[record.shotType];if(!a||![p.x,p.y,p.ang,p.body,a.ang,a.size,w?.power,w?.angle].every(finite)||![0,1].includes(p.look))return null;
  const angle=angleOf(p),wind=windVector(w);if(w.power<=0||Math.cos(rad(angle))*wind.x>=-1e-8)return null;
  const count=record.path.length/3,dt=record.pathDuration/count/1000,points=[],x0=record.path[0],y0=record.path[1],bands=record.weathers.filter(v=>[6,7,8].includes(v.weather_type));
  for(let i=0;i<count;i++){const x=record.path[i*3],y=record.path[i*3+1],t=i*dt;if(![x,y,t].every(finite))return null;if(t>4.1||bands.some(v=>Math.abs(x-v.x)<=v.size/2+10))break;points.push({x:x-x0,y:y-y0,t});}
  if(points.length<8||points.at(-1).t<.35)return null;
  const phi=rad((p.look===0?180-a.ang:a.ang)-p.body),dx=x0-p.x-Math.cos(phi)*a.size,dy=y0-p.y+Math.sin(phi)*a.size;if(Math.hypot(dx,dy)>3)return null;
  return{points,angle,look:p.look,power:record.uiPower,wind:{...w},shot:record.shotType,horizon:points.at(-1).t,dx,dy};
 }
 function transfer(source,wind,t){const w=windVector(wind),base=windVector(source.wind);return{x:2*(w.x-base.x)*t*t,y:2*(w.y-base.y)*t*t};}
 function position(source,wind,t){
  if(!finite(t)||t<0||t>source.horizon+1e-8)return null;
  const points=source.points,dt=points[1].t,index=Math.min(points.length-1,Math.floor(t/dt)),a=points[index],b=points[Math.min(index+1,points.length-1)],f=b.t>a.t?(t-a.t)/(b.t-a.t):0,c=transfer(source,wind,t);
  return{x:a.x+(b.x-a.x)*f+c.x,y:a.y+(b.y-a.y)*f+c.y,t};
 }
 function compatible(source,wind,angle,power){return source&&finite(wind?.power)&&finite(wind?.angle)&&wind.power>0&&Math.abs(wind.power-source.wind.power)<=1&&angleDistance(wind.angle,source.wind.angle)<1e-6&&angleDistance(angle,source.angle)<1e-6&&power===source.power&&Math.cos(rad(angle))*windVector(wind).x< -1e-8;}
 function trace(api,d,source,origin,wind,target,options={}){
  const points=[],bands=(d.weathers??[]).filter(w=>[7,8].includes(w.weather_type)),clearance=Math.max(0,Math.min(20,options.clearance??0));let hit=null,weatherEntry=null,turn=null,previous=null,lastSign=0;
  for(let t=0;t<=source.horizon+1e-8;){
   const q=position(source,wind,t),point={x:origin.x+q.x,y:origin.y+q.y,t};
   if(previous){const sign=Math.sign(point.x-previous.x);if(lastSign&&sign&&sign!==lastSign&&!turn)turn={...previous,observedTemplate:true};if(sign)lastSign=sign;}
   const band=bands.find(w=>Math.abs(point.x-w.x)<=w.size/2+10);if(t>.025&&band){weatherEntry={...point,type:band.weather_type};points.push(point);break;}
   if(!points.length||t===source.horizon||Math.hypot(point.x-points.at(-1).x,point.y-points.at(-1).y)>2.5)points.push(point);
   const inTarget=target&&Math.abs(point.x-target.x)<=22&&point.y>=target.y-36&&point.y<=target.y+3;
   if(t>.025&&inTarget){hit={...point,type:'target'};points.push(hit);break;}
   const solid=api.terrain(d,point.x,point.y),margin=clearance>0&&t>.08&&Math.hypot(q.x,q.y)>35&&(!target||Math.hypot(point.x-target.x,point.y-target.y+14)>45)&&[[clearance,0],[-clearance,0],[0,clearance],[0,-clearance]].some(([x,y])=>api.terrain(d,point.x+x,point.y+y));
   if(t>.035&&(solid||margin)){hit={...point,type:'ground',clearanceOnly:!solid};points.push(hit);break;}
   previous=point;if(t===source.horizon)break;
   const ahead=Math.min(source.horizon,t+.005),next=position(source,wind,ahead),speed=Math.hypot(next.x-q.x,next.y-q.y)/(ahead-t);t=Math.min(source.horizon,t+Math.max(.001,Math.min(.008,2.5/Math.max(1,speed))));
  }
  return{points,hit,horizon:source.horizon,weatherEntry,tornadoEntry:weatherEntry?.type===8?weatherEntry:null,turn,boomerPathTemplate:true,provisional:true};
 }
 function find(api,d,p,target,records,session,options={}){
  if(p?.mobile!==15||![0,1,2].includes(p.selected_shot)||!target||![p.x,p.y,p.body,target.x,target.y].every(finite)||typeof api?.launch!=='function'||typeof api?.terrain!=='function')return null;
  const wind={power:d.wind_power,angle:d.wind_angle},candidates=[],seen=new Set();
  for(let i=records.length-1;i>=0&&candidates.length<64;i--){
   const source=prepare(records[i],session);if(!source||!compatible(source,wind,source.angle,source.power)||(p.selected_shot===2)!==(source.shot===2)||source.shot===2&&wind.power!==source.wind.power)continue;
   const look=source.look,angle=look===0?180-source.angle-p.body:source.angle+p.body;if(angle<(p.minang??0)-1e-6||angle>(p.maxang??90)+1e-6)continue;
   if(options.mode==='fixed'&&[0,1].includes(options.fixedLook)&&look!==options.fixedLook)continue;
   const origin=api.launch({...p,look,ang:angle});if(!origin||angleDistance(origin.angle,source.angle)>1e-6)continue;
   const displayAngle=origin.angle>90?180-origin.angle:origin.angle;if(options.mode==='fixed'&&finite(options.fixedDisplay)&&Math.abs(displayAngle-options.fixedDisplay)>1e-6)continue;
   origin.x+=source.dx;origin.y+=source.dy;const key=look+':'+angle+':'+source.power+':'+source.wind.power+':'+source.horizon;if(seen.has(key))continue;seen.add(key);
   let distance=Infinity;for(const q of source.points){const at=position(source,wind,q.t);distance=Math.min(distance,Math.hypot(origin.x+at.x-target.x,origin.y+at.y-(target.y-14)));}
   if(distance>70)continue;candidates.push({source,look,angle,origin,displayAngle,distance});
  }
  candidates.sort((a,b)=>a.distance-b.distance);let best=null,tried=0;
  for(const c of candidates.slice(0,16)){tried++;const path=trace(api,d,c.source,c.origin,wind,target,options);if(path.hit?.type!=='target')continue;const delta=wind.power-c.source.wind.power,score=path.hit.t+.1*Math.abs(delta)+.003*Math.abs(c.angle-p.ang);
   const found={ready:true,mobile:15,provisional:true,predictedHit:false,boomerPathTemplate:true,power:c.source.power,angle:c.angle,look:c.look,displayAngle:c.displayAngle,origin:c.origin,targetNumber:target.n,target:{n:target.n,x:target.x,y:target.y},t:path.hit.t,path,score,template:{sourceShot:c.source.shot,sourcePower:c.source.power,worldAngle:c.source.angle,windDelta:delta,horizon:c.source.horizon,sourceWind:c.source.wind},model:{valid:true,provisional:true,pathBased:true,randomWeatherIgnored:d.weathers?.some(w=>w.weather_type===6),boomerSS:c.source.shot===2,ssTimingUnknown:c.source.shot===2,boomerPathTemplate:true,sampleCount:1,maxTime:c.source.horizon,dx:c.source.dx,dy:c.source.dy,errorRadius:Math.abs(delta)>0?15:8,windInferred:delta!==0,positionAllowance:(_power,t)=>8+Math.abs(delta)*t*t},search:{fullCandidates:tried,maxCandidates:16}};
   if(!best||score<best.score)best=found;
  }
  if(best)best.search.fullCandidates=tried;return best;
 }
 Object.defineProperty(globalThis,'__reaBoomerPaths',{value:Object.freeze({version:3,prepare,position,compatible,trace,find}),configurable:true});return{installed:true,version:3};
})()
