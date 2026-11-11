(()=>{
 const rad=x=>x*Math.PI/180,median=v=>{const a=v.toSorted((x,y)=>x-y);return(a[(a.length-1)>>1]+a[a.length>>1])/2};let cached=null;
 function build(samples,session){
  const kernel=globalThis.__reaDragonBallistics,seen=new Set(),rows=[];
  for(const s of samples){if(s.session!==session||s.mobile!==15||!s.isLocal||s.shotType>1||s.bullet!==50||!s.path?.length||(s.start.t||0)!==0||s.uiPower<20||s.uiPower>400||!s.player||s.special.wave||s.special.orbit)continue;const key=JSON.stringify([s.session,s.start,s.uiPower]);if(seen.has(key))continue;seen.add(key);
   const count=s.path.length/3,step=s.pathDuration/count;let end=count;for(let i=1;i<count;i++)if(s.weathers?.some(w=>[6,7,8].includes(w.weather_type)&&Math.abs(s.path[i*3]-w.x)<=w.size/2+10)){end=i;break;}
   const record={...s,path:s.path.slice(0,end*3),pathDuration:step*end},fit=kernel.fitPathBallistics(record);if(!fit||fit.duration<.7||fit.maxError>1.5)continue;
   const angle=(s.player.look===0?180-s.player.ang:s.player.ang)-s.player.body,theta=rad(angle),wx=Math.floor(s.wind.power*Math.cos(rad(s.wind.angle))),wy=Math.floor(-s.wind.power*Math.sin(rad(s.wind.angle)));
   if(wx*Math.cos(theta)<0)continue;const a=s.player.aim?.[s.shotType];if(!a)continue;const phi=rad((s.player.look===0?180-a.ang:a.ang)-s.player.body);rows.push({record,s,fit,angle,wx,wy,ux:s.uiPower*Math.cos(theta),uy:-s.uiPower*Math.sin(theta),vx:fit.power*Math.cos(rad(fit.ang)),vy:-fit.power*Math.sin(rad(fit.ang)),dx:fit.x-s.player.x-Math.cos(phi)*a.size,dy:fit.y-s.player.y+Math.sin(phi)*a.size});
  }
  if(rows.length<3)return null;const avg=k=>rows.reduce((n,r)=>n+r[k],0)/rows.length,mux=avg('ux'),muy=avg('uy'),mvx=avg('vx'),mvy=avg('vy'),den=rows.reduce((n,r)=>n+(r.ux-mux)**2+(r.uy-muy)**2,0);if(den<100)return null;
  const ratio=rows.reduce((n,r)=>n+(r.ux-mux)*(r.vx-mvx)+(r.uy-muy)*(r.vy-mvy),0)/den,bx=mvx-ratio*mux,by=mvy-ratio*muy,velocityError=Math.max(...rows.map(r=>Math.hypot(r.vx-ratio*r.ux-bx,r.vy-ratio*r.uy-by)));if(ratio<1.5||ratio>2||velocityError>2.5)return null;
  const biasX=median(rows.map(r=>r.fit.ax-4*r.wx)),gravity=median(rows.map(r=>r.fit.ay-4*r.wy)),residual=Math.max(...rows.map(r=>Math.hypot(r.fit.ax-biasX-4*r.wx,r.fit.ay-gravity-4*r.wy)));if(residual>2.5)return null;
  const dx=median(rows.map(r=>r.dx)),dy=median(rows.map(r=>r.dy)),originError=Math.max(...rows.map(r=>Math.hypot(r.dx-dx,r.dy-dy)));if(originError>3)return null;
  return{rows,ratio,velocityBiasX:bx,velocityBiasY:by,velocityError,biasX,gravity,residual,dx,dy,originError,minAngle:Math.min(...rows.map(r=>r.angle)),maxAngle:Math.max(...rows.map(r=>r.angle)),minWx:Math.min(...rows.map(r=>r.wx)),maxWx:Math.max(...rows.map(r=>r.wx)),minWy:Math.min(...rows.map(r=>r.wy)),maxWy:Math.max(...rows.map(r=>r.wy)),minPower:Math.min(...rows.map(r=>r.s.uiPower)),maxPower:Math.max(...rows.map(r=>r.s.uiPower)),maxTime:Math.min(4.1,Math.max(...rows.map(r=>r.fit.duration)))};
 }
 function fit(samples,d,p,session){
  if(p.mobile!==15||p.selected_shot>1)return null;const last=samples.at(-1);if(!cached||cached.samples!==samples||cached.last!==last||cached.session!==session)cached={samples,last,session,base:build(samples,session)};
  const angle=(p.look===0?180-p.ang:p.ang)-p.body,wx=Math.floor(d.wind_power*Math.cos(rad(d.wind_angle))),wy=Math.floor(-d.wind_power*Math.sin(rad(d.wind_angle)));
  const b=[cached.base,...(globalThis.__reaBoomerLearnedProfiles??[])].find(b=>b&&angle>=b.minAngle-6&&angle<=b.maxAngle+6&&wx*Math.cos(rad(angle))>=0&&wx>=b.minWx-2&&wx<=b.maxWx+2&&wy>=b.minWy-2&&wy<=b.maxWy+2);if(!b)return null;
  const exact=b.rows.filter(r=>r.s.wind.power===d.wind_power&&(d.wind_power===0||r.s.wind.angle===d.wind_angle)),ax=exact.length?exact.reduce((n,r)=>n+r.fit.ax,0)/exact.length:b.biasX+4*wx,ay=exact.length?exact.reduce((n,r)=>n+r.fit.ay,0)/exact.length:b.gravity+4*wy;
  return{valid:true,liveBoomer:true,pathBased:true,provisional:true,ratio:b.ratio,velocityBiasX:b.velocityBiasX,velocityBiasY:b.velocityBiasY,ax,ay,dx:b.dx,dy:b.dy,sampleCount:b.rows.length,exactWindSamples:exact.length,minPower:b.minPower,maxPower:b.maxPower,maxTime:b.maxTime,velocityError:b.velocityError,windFallback:!exact.length,windModel:{factor:4,biasX:b.biasX,gravity:b.gravity,residual:b.residual},errorRadius:10,positionAllowance:(power,t)=>4+3*t+1.5*t*t,reason:null};
 }
 Object.defineProperty(globalThis,'__reaBoomerLive',{value:{fit,build,version:1},configurable:true});return{installed:true,version:1};
})()
