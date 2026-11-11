(()=>{
 const rad=x=>x*Math.PI/180,median=values=>{const v=values.toSorted((a,b)=>a-b);return(v[(v.length-1)>>1]+v[v.length>>1])/2};
 function fit(samples,d,p,session){
  if(p.mobile_data?.name!=='Ice')return null;
  const api=globalThis.__reaDragonBallistics,seen=new Set();
  const rows=samples.filter(s=>{const key=JSON.stringify([s.session,s.shotType,s.start,s.uiPower]);if(seen.has(key))return false;seen.add(key);return s.session===session&&s.isLocal&&s.mobile===p.mobile&&s.shotType>=0&&s.shotType<=2&&s.bullet===p.mobile_data.bullets[s.shotType]&&s.uiPower>=20&&s.uiPower<=400&&(s.start.t||0)===0&&!s.special.path&&!s.special.orbit&&!s.special.wave&&s.physicsChecks?.length>=3&&s.physicsChecks.every(c=>{const q=api.positionAt(s.start,c.time);return Math.hypot(q.x-c.pos.x,q.y-c.pos.y)<1;});});
  if(!rows.length)return null;
  let quantization=null,ratio=rows.reduce((n,r)=>n+r.uiPower*r.start.power,0)/rows.reduce((n,r)=>n+r.uiPower*r.uiPower,0);
  for(const [mode,offset]of [['round',.5],['floor',0]]){const low=Math.max(...rows.map(r=>(r.start.power-offset)/r.uiPower)),high=Math.min(...rows.map(r=>(r.start.power+1-offset)/r.uiPower));if(low<high){ratio=(low+high)/2;quantization=mode;break;}}
  const speed=force=>quantization==='round'?Math.round(force*ratio):quantization==='floor'?Math.floor(force*ratio):force*ratio,velocityError=Math.max(...rows.map(r=>Math.abs(speed(r.uiPower)-r.start.power)));if(velocityError>1.2)return null;
  const exact=rows.filter(r=>r.wind.power===d.wind_power&&(d.wind_power===0||Math.abs(((r.wind.angle-d.wind_angle+540)%360)-180)<.001));
  const vectors=rows.map(r=>({x:Math.floor(r.wind.power*Math.cos(rad(r.wind.angle))),y:Math.floor(-r.wind.power*Math.sin(rad(r.wind.angle))),ax:r.start.ax,ay:r.start.ay})),mean=k=>vectors.reduce((n,v)=>n+v[k],0)/vectors.length;
  const mx=mean('x'),my=mean('y'),ma=mean('ax'),mg=mean('ay'),den=vectors.reduce((n,v)=>n+(v.x-mx)**2+(v.y-my)**2,0);
  let windModel=null,ax,ay;
  if(den>1){const factor=vectors.reduce((n,v)=>n+(v.x-mx)*(v.ax-ma)+(v.y-my)*(v.ay-mg),0)/den,biasX=ma-factor*mx,gravity=mg-factor*my,residual=Math.max(...vectors.map(v=>Math.hypot(v.ax-biasX-factor*v.x,v.ay-gravity-factor*v.y)));if(factor>0&&factor<20&&residual<=1){windModel={factor,biasX,gravity,residual};}}
  if(!windModel){const factor=4,biasX=median(vectors.map(v=>v.ax-factor*v.x)),gravity=median(vectors.map(v=>v.ay-factor*v.y)),residual=Math.max(...vectors.map(v=>Math.hypot(v.ax-biasX-factor*v.x,v.ay-gravity-factor*v.y)));if(residual<=1)windModel={factor,biasX,gravity,residual,empiricalFactor:true};}
  if(exact.length){ax=median(exact.map(r=>r.start.ax));ay=median(exact.map(r=>r.start.ay));if(Math.max(...exact.map(r=>Math.hypot(r.start.ax-ax,r.start.ay-ay)))>1)return null;}
  else{if(!windModel||d.wind_power>26||d.wind_power<0)return null;ax=windModel.biasX+windModel.factor*Math.floor(d.wind_power*Math.cos(rad(d.wind_angle)));ay=windModel.gravity+windModel.factor*Math.floor(-d.wind_power*Math.sin(rad(d.wind_angle)));}
  const specific=rows.filter(r=>r.shotType===p.selected_shot),offsets=specific.map(r=>{const q=r.player,a=q?.aim?.[r.shotType];if(!a)return null;const phi=rad((q.look===0?180-a.ang:a.ang)-q.body);return{x:r.start.x-q.x-Math.cos(phi)*a.size,y:r.start.y-q.y+Math.sin(phi)*a.size};}).filter(Boolean),dx=offsets.length?median(offsets.map(o=>o.x)):0,dy=offsets.length?median(offsets.map(o=>o.y)):0;
  if(offsets.some(o=>Math.hypot(o.x-dx,o.y-dy)>3))return null;
  const estimated=!exact.length||!specific.length,minPower=Math.min(...rows.map(r=>r.uiPower)),maxPower=Math.max(...rows.map(r=>r.uiPower));
  return{valid:true,iceWind:true,ratio,speedQuantization:quantization,ax,ay,dx,dy,sampleCount:rows.length,exactWindSamples:exact.length,windModel,windFallback:!exact.length,provisional:estimated||rows.length<5,maxTime:4,minPower,maxPower,velocityError,positionAllowance:estimated?(power,t)=>3+2*t+3*t*t:undefined,reason:null};
 }
 Object.defineProperty(globalThis,'__reaIceWind',{value:{fit,version:2},configurable:true});return{installed:true,version:2};
})()
