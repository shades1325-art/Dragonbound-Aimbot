(() => {
 // Archive-derived ordinary zero-wind estimate; native/current-match models take precedence.
 const prior=Object.freeze({ratio:1.7448726884377395,velocityBiasX:0,velocityBiasY:-14.326996046275212,ax:0,ay:190.52541533903394,samples:14,sessions:5});
 function seed(renderer,player){
  if(player?.mobile!==15||![0,1].includes(player.selected_shot)||renderer?.wind_power!==0)return null;
  const angle=(player.look===0?180-player.ang:player.ang)-(player.body||0),normalized=((angle%360)+360)%360;
  const angleExtrapolated=normalized<51||normalized>154;
  return{valid:true,provisional:true,bootstrap:true,boomerZeroPrior:true,boomerEmpirical:true,ratio:prior.ratio,velocityBiasX:prior.velocityBiasX,velocityBiasY:prior.velocityBiasY,ax:prior.ax,ay:prior.ay,dx:0,dy:0,sampleCount:0,archiveSampleCount:prior.samples,archiveSessionCount:prior.sessions,minPower:11,maxPower:400,maxTime:4.1,errorRadius:angleExtrapolated?20:10,angleExtrapolated,source:'boomer-zero-optimize.json',reason:'Boomer không gió: ước tính S1/S2 từ5trận, tối đa4,1giây'};
 }
 function least(rows){
  const A=Array.from({length:3},()=>[0,0,0,0]);
  for(const r of rows)for(let i=0;i<3;i++){for(let j=0;j<3;j++)A[i][j]+=r.x[i]*r.x[j];A[i][3]+=r.x[i]*r.y;}
  for(let i=0;i<3;i++){let k=i;for(let j=i+1;j<3;j++)if(Math.abs(A[j][i])>Math.abs(A[k][i]))k=j;if(Math.abs(A[k][i])<1e-9)return null;[A[k],A[i]]=[A[i],A[k]];const v=A[i][i];for(let j=i;j<4;j++)A[i][j]/=v;for(let k=0;k<3;k++)if(k!==i){const v=A[k][i];for(let j=i;j<4;j++)A[k][j]-=v*A[i][j];}}
  return A.map(r=>r[3]);
 }
 function fit(records,session){
  const samples=[],seen=new Set(),rad=a=>a*Math.PI/180;
  for(const s of records){
   if(s.session!==session||!s.isLocal||s.mobile!==15||![0,1].includes(s.shotType)||s.bullet!==50||s.wind?.power!==0||(s.start?.t||0)!==0||!(s.uiPower>0&&s.uiPower<=400)||!s.path?.length||!(s.pathDuration>0)||!Array.isArray(s.weathers)||s.special?.wave||s.special?.orbit)continue;
   const key=JSON.stringify([s.session,s.start,s.uiPower,s.shotType,s.path]);if(seen.has(key))continue;seen.add(key);
   const angle=s.angle??(s.player?((s.player.look===0?180-s.player.ang:s.player.ang)-s.player.body):NaN);if(!Number.isFinite(angle))continue;
   const n=Math.floor(s.path.length/3),dt=s.pathDuration/n/1000,bands=s.weathers.filter(w=>[6,7,8].includes(w.weather_type)),p=[];
   for(let i=0;i<n;i++){const t=i*dt,x=s.path[i*3],y=s.path[i*3+1];if(t>4.1||bands.some(w=>Math.abs(x-w.x)<=w.size/2+10))break;p.push({t,x:x-s.path[0],y:y-s.path[1]});}
   if(p.length<11||p.at(-1).t<.5)continue;
   let offset={x:0,y:0};const muzzle=s.player?.aim?.[s.shotType];if(muzzle){const phi=rad((s.player.look===0?180-muzzle.ang:muzzle.ang)-s.player.body);offset={x:s.path[0]-(s.player.x+Math.cos(phi)*muzzle.size),y:s.path[1]-(s.player.y-Math.sin(phi)*muzzle.size)};}
   samples.push({record:s,p,angle,offset});
  }
  const selected=samples.slice(-24);if(selected.length<2)return null;const rows=[];
  for(const s of selected){const ux=s.record.uiPower*Math.cos(rad(s.angle)),uy=-s.record.uiPower*Math.sin(rad(s.angle)),scale=1/Math.sqrt(s.p.length);for(const p of s.p){const t=p.t;if(!t)continue;rows.push({x:[ux*t*scale,0,0],y:p.x*scale},{x:[uy*t*scale,t*scale,t*t/2*scale],y:p.y*scale});}}
  const coefficients=least(rows);if(!coefficients)return null;const [ratio,velocityBiasY,ay]=coefficients;
  if(!(ratio>=1.5&&ratio<=2&&velocityBiasY>=-30&&velocityBiasY<=0&&ay>=170&&ay<=210))return null;
  let maximum=0,squared=0,count=0;for(const s of selected){const vx=ratio*s.record.uiPower*Math.cos(rad(s.angle)),vy=-ratio*s.record.uiPower*Math.sin(rad(s.angle))+velocityBiasY;for(const p of s.p){const error=Math.hypot(p.x-vx*p.t,p.y-vy*p.t-ay*p.t*p.t/2);maximum=Math.max(maximum,error);squared+=error*error;count++;}}
  const dx=selected.reduce((n,s)=>n+s.offset.x,0)/selected.length,dy=selected.reduce((n,s)=>n+s.offset.y,0)/selected.length,originError=Math.max(...selected.map(s=>Math.hypot(s.offset.x-dx,s.offset.y-dy)));
  if(maximum>8||originError>4)return null;
  const powers=selected.map(s=>s.record.uiPower);
  return{valid:true,provisional:true,bootstrap:false,sharedBoomerZero:true,pathBased:true,ratio,velocityBiasX:0,velocityBiasY,ax:0,ay,dx,dy,originError,sampleCount:selected.length,exactWindSamples:selected.length,span:Math.max(...powers)-Math.min(...powers),minPower:Math.min(...powers),maxPower:Math.max(...powers),maxTime:4.1,maxPathResidual:maximum,trainingRMSE:Math.sqrt(squared/count),errorRadius:Math.max(10,Math.ceil(maximum*2)),reason:null,source:'boomer-calibration-review.json'};
 }
 const api={version:2,prior,seed,fit};Object.defineProperty(globalThis,'__reaBoomerZeroPrior',{value:api,configurable:true});return{installed:true,version:2,samples:prior.samples,sessions:prior.sessions};
})()
