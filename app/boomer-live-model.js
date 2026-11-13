(()=>{
 const rad=x=>x*Math.PI/180,finite=Number.isFinite,median=v=>{const a=v.toSorted((x,y)=>x-y);return(a[(a.length-1)>>1]+a[a.length>>1])/2},K=Math.PI/1.8;let cached=null;
 // Empirical ordinary-flight fit:79 zero/tailwind paths,20 sessions.
 // Whole-session holdout worst11.75px through<=3s; not all-wind validation.
 const archive=Object.freeze({ratio:K,velocityBiasX:-.18311624637813753,velocityBiasY:-14.9939865455479,biasX:-.07332664357723682,gravity:190.71956437063875,samples:79,sessions:20});
 const windHull=[[-15.300876095408569,4.677947275563782],[-13.457663743136461,-3.8589229814379955],[-9.64181414529809,-11.49066664678467],[22.874003593470285,2.4041546551560287],[19.416407864998735,14.10684605501936],[9.317566688177788,24.273091088927252],[-2.00458208319614,22.912478056110146],[-9.205794082570632,18.874674972282502]];
 const coveredWind=(x,y)=>windHull.every((p,i)=>{const q=windHull[(i+1)%windHull.length];return(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0])>=-1e-6;});
 function prior(d,p){
  if(p?.mobile!==15||![0,1].includes(p.selected_shot)||![p.ang,p.body,d?.wind_power,d?.wind_angle].every(finite)||![0,1].includes(p.look)||d.wind_power<=0||d.wind_power>26)return null;
  const angle=(p.look===0?180-p.ang:p.ang)-p.body,wx=d.wind_power*Math.cos(rad(d.wind_angle)),wy=-d.wind_power*Math.sin(rad(d.wind_angle));if(wx*Math.cos(rad(angle))< -1e-8)return null;
  const canonical=Math.abs(Math.atan2(Math.sin(rad(angle)),Math.abs(Math.cos(rad(angle))))/rad(1)),angleExtrapolated=canonical<13-1e-6||canonical>83+1e-6,windExtrapolated=!coveredWind(wx,wy),maxTime=windExtrapolated||angleExtrapolated?2.1:3;
  return{valid:true,liveBoomer:true,provisional:true,bootstrap:true,boomerTailwindPrior:true,boomerOrdinary:true,pathBased:true,ratio:K,velocityBiasX:archive.velocityBiasX,velocityBiasY:archive.velocityBiasY,ax:archive.biasX+4*Math.trunc(wx),ay:archive.gravity+4*Math.trunc(wy),dx:0,dy:0,sampleCount:0,archiveSampleCount:79,archiveSessionCount:20,exactWindSamples:0,minPower:1,maxPower:400,maxTime,errorRadius:15,windInferred:true,windExtrapolated,angleExtrapolated,windModel:{factor:4,quantization:'trunc',biasX:archive.biasX,gravity:archive.gravity},positionAllowance:(_power,t)=>15+Math.max(0,t-2.1)*5+(windExtrapolated?8*t*t:0)+(angleExtrapolated?5*t:0),source:'boomer-v31-ordinary-session-holdout',reason:null};
 }
 function build(samples,session){
  const kernel=globalThis.__reaDragonBallistics,seen=new Set(),rows=[];
  for(const s of samples){if(s?.session!==session||s.mobile!==15||!s.isLocal||![0,1].includes(s.shotType)||s.bullet!==50||!Array.isArray(s.path)||!s.path.length||s.path.length%3||(s.start?.t??0)!==0||!finite(s.uiPower)||s.uiPower<20||s.uiPower>400||!s.player||!Array.isArray(s.weathers)||!finite(s.pathDuration)||s.pathDuration<=0||s.special?.wave||s.special?.orbit)continue;const key=JSON.stringify([s.session,s.start,s.uiPower,s.path]);if(seen.has(key))continue;seen.add(key);
   const a=s.player.aim?.[s.shotType];if(!a||![s.player.x,s.player.y,s.player.ang,s.player.body,a.ang,a.size,s.wind?.power,s.wind?.angle].every(finite)||!s.path.every(finite)||![0,1].includes(s.player.look))continue;
   const count=s.path.length/3,step=s.pathDuration/count;let end=count;for(let i=0;i<count;i++)if(i*step>3000||s.weathers.some(w=>[6,7,8].includes(w.weather_type)&&Math.abs(s.path[i*3]-w.x)<=w.size/2+10)){end=i;break;}
   const record={...s,path:s.path.slice(0,end*3),pathDuration:step*end},fit=kernel.fitPathBallistics(record),horizon=(end-1)*step/1000;if(!fit||horizon<.7||fit.maxError>1.5)continue;
   const angle=(s.player.look===0?180-s.player.ang:s.player.ang)-s.player.body,theta=rad(angle),rawWx=s.wind.power*Math.cos(rad(s.wind.angle)),wx=Math.trunc(rawWx),wy=Math.trunc(-s.wind.power*Math.sin(rad(s.wind.angle)));
   if(rawWx*Math.cos(theta)< -1e-8)continue;const phi=rad((s.player.look===0?180-a.ang:a.ang)-s.player.body);rows.push({record,s,fit,horizon,angle,wx,wy,ux:s.uiPower*Math.cos(theta),uy:-s.uiPower*Math.sin(theta),vx:fit.power*Math.cos(rad(fit.ang)),vy:-fit.power*Math.sin(rad(fit.ang)),dx:fit.x-s.player.x-Math.cos(phi)*a.size,dy:fit.y-s.player.y+Math.sin(phi)*a.size});
  }
  if(rows.length<3)return null;
  // Keep the independently validated slope when local powers are too close.
  // Free fitting powers75/96/101 gave k1.667 and20px error at power360.
  const ratio=K,bx=median(rows.map(r=>r.vx-ratio*r.ux)),by=median(rows.map(r=>r.vy-ratio*r.uy)),velocityError=Math.max(...rows.map(r=>Math.hypot(r.vx-ratio*r.ux-bx,r.vy-ratio*r.uy-by)));if(velocityError>2.5)return null;
  const biasX=median(rows.map(r=>r.fit.ax-4*r.wx)),gravity=median(rows.map(r=>r.fit.ay-4*r.wy)),residual=Math.max(...rows.map(r=>Math.hypot(r.fit.ax-biasX-4*r.wx,r.fit.ay-gravity-4*r.wy)));if(residual>2.5)return null;
  const dx=median(rows.map(r=>r.dx)),dy=median(rows.map(r=>r.dy)),originError=Math.max(...rows.map(r=>Math.hypot(r.dx-dx,r.dy-dy)));if(originError>3)return null;
  return{rows,ratio,velocityBiasX:bx,velocityBiasY:by,velocityError,biasX,gravity,residual,dx,dy,originError,minAngle:Math.min(...rows.map(r=>r.angle)),maxAngle:Math.max(...rows.map(r=>r.angle)),minWx:Math.min(...rows.map(r=>r.wx)),maxWx:Math.max(...rows.map(r=>r.wx)),minWy:Math.min(...rows.map(r=>r.wy)),maxWy:Math.max(...rows.map(r=>r.wy)),minPower:Math.min(...rows.map(r=>r.s.uiPower)),maxPower:Math.max(...rows.map(r=>r.s.uiPower)),maxTime:Math.min(3,Math.max(...rows.map(r=>r.horizon)))};
 }
 function fit(samples,d,p,session){
  if(p?.mobile!==15||![0,1].includes(p.selected_shot)||![p.ang,p.body,d?.wind_power,d?.wind_angle].every(finite)||![0,1].includes(p.look)||d.wind_power<0||d.wind_power>26)return null;const last=samples.at(-1);if(!cached||cached.samples!==samples||cached.last!==last||cached.length!==samples.length||cached.session!==session)cached={samples,last,length:samples.length,session,base:build(samples,session)};
  const angle=(p.look===0?180-p.ang:p.ang)-p.body,rawWx=d.wind_power*Math.cos(rad(d.wind_angle)),wx=Math.trunc(rawWx),wy=Math.trunc(-d.wind_power*Math.sin(rad(d.wind_angle)));if(rawWx*Math.cos(rad(angle))< -1e-8)return null;
  const b=cached.base;if(!b||angle<b.minAngle-6||angle>b.maxAngle+6||wx<b.minWx-2||wx>b.maxWx+2||wy<b.minWy-2||wy>b.maxWy+2)return prior(d,p);
  const exact=b.rows.filter(r=>r.s.wind.power===d.wind_power&&(d.wind_power===0||r.s.wind.angle===d.wind_angle)),ax=exact.length?exact.reduce((n,r)=>n+r.fit.ax,0)/exact.length:b.biasX+4*wx,ay=exact.length?exact.reduce((n,r)=>n+r.fit.ay,0)/exact.length:b.gravity+4*wy;
  return{valid:true,liveBoomer:true,boomerOrdinary:true,pathBased:true,provisional:true,ratio:b.ratio,velocityBiasX:b.velocityBiasX,velocityBiasY:b.velocityBiasY,ax,ay,dx:b.dx,dy:b.dy,sampleCount:b.rows.length,exactWindSamples:exact.length,minPower:b.minPower,maxPower:b.maxPower,maxTime:b.maxTime,velocityError:b.velocityError,windInferred:!exact.length,windModel:{factor:4,quantization:'trunc',biasX:b.biasX,gravity:b.gravity,residual:b.residual},errorRadius:10,positionAllowance:(power,t)=>4+3*t+1.5*t*t+Math.max(0,b.minPower-power,power-b.maxPower)*.015*t,source:'boomer-current-match-fixed-slope',reason:null};
 }
 Object.defineProperty(globalThis,'__reaBoomerLive',{value:Object.freeze({fit,build,prior,archive,version:2}),configurable:true});return{installed:true,version:2};
})()
