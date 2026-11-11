(()=>{
 const rad=a=>a*Math.PI/180,finite=Number.isFinite,median=values=>{const a=values.toSorted((x,y)=>x-y);return(a[(a.length-1)>>1]+a[a.length>>1])/2;},isTurtle=p=>p?.mobile===14||p?.mobile_data?.name==='Turtle';
 const vector=w=>({x:Math.floor(w.power*Math.cos(rad(w.angle))),y:Math.floor(-w.power*Math.sin(rad(w.angle)))});
 function annotate(model,p){const pair=p.selected_shot===1,ss=p.selected_shot===2,c=globalThis.__reaDragonCollector,ssMode=ss?(globalThis.__reaDragonAim?.settings?.turtleSSMode??'skybomb'):null,timing=ss?globalThis.__reaTurtleSS?.fuse([...(c?.calibration??[]),...(c?.samples??[])],c?.session):null;return{...model,turtle:true,turtlePair:pair,turtleSS:ss,turtleSSMode:ssMode,ssOpeningMs:timing?.openingMs,ssReleaseMs:timing?.releaseMs,ssTimingEstimated:!!timing,provisional:model.provisional||pair||ss,waveMappingEstimated:pair,maxTime:ss&&timing?timing.openingMs/1000:6.5};}
 function fit(samples,d,p,session){
  if(!isTurtle(p)||![0,1,2].includes(p.selected_shot)||!finite(d.wind_power)||d.wind_power<0||d.wind_power>26||!finite(d.wind_angle))return null;
  const kernel=globalThis.__reaDragonBallistics,seen=new Set(),rows=samples.filter(r=>{
   if(r.session!==session||!r.isLocal||r.mobile!==14||![0,1,2].includes(r.shotType)||(r.start?.t??0)!==0||r.uiPower<20||r.uiPower>400||r.special?.path||r.special?.orbit||!(kernel.bulletsOf(p,r.shotType).includes(r.bullet)))return false;
   if(r.shotType===2&&r.bullet!==p.mobile_data.bullets[3])return false;
   if(!['power','ang','ax','ay','x','y'].every(k=>finite(r.start[k]))||!finite(r.wind?.power)||!finite(r.wind?.angle))return false;
   if(!r.physicsChecks?.length||!r.physicsChecks.every(c=>{const q=kernel.positionAt(r.start,c.time);return Math.hypot(q.x-c.pos.x,q.y-c.pos.y)<1;}))return false;
   const key=JSON.stringify([r.session,r.start,r.shotType,r.uiPower]);if(seen.has(key))return false;seen.add(key);return true;
  });
  if(!rows.length)return seed(d,p);
  let ratio=rows.reduce((n,r)=>n+r.uiPower*r.start.power,0)/rows.reduce((n,r)=>n+r.uiPower*r.uiPower,0),quantization=null;
  for(const [mode,offset] of [['round',.5],['floor',0]]){const low=Math.max(...rows.map(r=>(r.start.power-offset)/r.uiPower)),high=Math.min(...rows.map(r=>(r.start.power+1-offset)/r.uiPower));if(low<high){ratio=(low+high)/2;quantization=mode;break;}}
  const speed=force=>quantization==='round'?Math.round(force*ratio):quantization==='floor'?Math.floor(force*ratio):force*ratio,velocityError=Math.max(...rows.map(r=>Math.abs(speed(r.uiPower)-r.start.power)));
  if(!(ratio>0)||velocityError>1.2)return seed(d,p);
  const values=rows.map(r=>({...vector(r.wind),ax:r.start.ax,ay:r.start.ay})),mean=k=>values.reduce((n,v)=>n+v[k],0)/values.length,mx=mean('x'),my=mean('y'),ma=mean('ax'),mg=mean('ay'),den=values.reduce((n,v)=>n+(v.x-mx)**2+(v.y-my)**2,0);
  let law=null;
  if(den>1){const factor=values.reduce((n,v)=>n+(v.x-mx)*(v.ax-ma)+(v.y-my)*(v.ay-mg),0)/den,biasX=ma-factor*mx,gravity=mg-factor*my,residual=Math.max(...values.map(v=>Math.hypot(v.ax-biasX-factor*v.x,v.ay-gravity-factor*v.y)));if(factor>0&&factor<20&&residual<=2)law={factor,biasX,gravity,residual};}
  const current=vector({power:d.wind_power,angle:d.wind_angle}),exact=rows.filter(r=>r.wind.power===d.wind_power&&(d.wind_power===0||Math.abs(((r.wind.angle-d.wind_angle+540)%360)-180)<.01));
  let ax,ay,windInferred=false;
  if(exact.length){ax=median(exact.map(r=>r.start.ax));ay=median(exact.map(r=>r.start.ay));if(exact.some(r=>Math.hypot(r.start.ax-ax,r.start.ay-ay)>2))return seed(d,p);}
  else if(law){ax=law.biasX+law.factor*current.x;ay=law.gravity+law.factor*current.y;}
  else{const anchor=rows.toSorted((a,b)=>b.time-a.time)[0],v=vector(anchor.wind),factor=globalThis.__reaTurtlePrior?.data?.windFactor??4;ax=anchor.start.ax+factor*(current.x-v.x);ay=anchor.start.ay+factor*(current.y-v.y);windInferred=true;}
  const specific=rows.filter(r=>r.shotType===p.selected_shot),estimated=!exact.length||specific.length===0||rows.length<2;
  return annotate({valid:true,ratio,speedQuantization:quantization,ax,ay,dx:0,dy:0,sampleCount:rows.length,exactWindSamples:exact.length,minPower:Math.min(...rows.map(r=>r.uiPower)),maxPower:Math.max(...rows.map(r=>r.uiPower)),velocityError,windModel:law,windFallback:!exact.length,windInferred,provisional:estimated,positionAllowance:(power,t)=>3+(velocityError+1)*t+(windInferred?12:!exact.length?3:1)*t*t,reason:null},p);
 }
 function seed(d,p){
  const q=globalThis.__reaTurtlePrior?.data;if(!isTurtle(p)||!q||!finite(d.wind_power)||d.wind_power<0||d.wind_power>26||!finite(d.wind_angle))return null;
  const w=vector({power:d.wind_power,angle:d.wind_angle});return annotate({valid:true,ratio:q.ratio,speedQuantization:'round',ax:d.wind_power===0?0:(q.biasX??0)+q.windFactor*w.x,ay:q.gravity+q.windFactor*w.y,dx:0,dy:0,sampleCount:0,exactWindSamples:0,minPower:20,maxPower:400,bootstrap:true,turtlePrior:true,windInferred:d.wind_power!==0&&!q.windFactorKnown,windExtrapolated:d.wind_power>25,provisional:true,positionAllowance:(power,t)=>5+((q.ratioError??.15)*power+2)*t+(q.gravityError??24)*t*t/2,reason:'Turtle: ước tính ban đầu; cập nhật từ phát bắn thực'},p);
 }
 function tracePair(api,d,m,origin,power,target,maxTime=6.5,options={}){
  const wave=globalThis.__reaTurtleWave;if(!wave)return{points:[],hit:null,branches:[],pairHits:0};
  const speed=m.speedQuantization==='round'?Math.round(power*m.ratio):m.speedQuantization==='floor'?Math.floor(power*m.ratio):power*m.ratio,start={x:origin.x,y:origin.y,ang:origin.angle,power:speed,ax:m.ax,ay:m.ay},duration=Math.min(maxTime,m.maxTime??6.5),weather=d.weathers?.some(w=>w.weather_type===8)?globalThis.__reaTornadoMethod?.predict(start,d.weathers,duration):null,jumps=weather?.jumps??[],clearance=Math.max(0,Math.min(20,options.clearance??0)),dt=Math.max(.0015,Math.min(.009,2.5/(speed+Math.hypot(m.ax,m.ay)*duration))),branches=[];
  for(const type of [3,4]){const points=[];let hit=null,previous=null;for(let t=0;t<=duration;t+=dt){const q={...wave.positionAt(start,t*1000,type,jumps),t};if(!previous||Math.hypot(q.x-previous.x,q.y-previous.y)>3){points.push(q);previous=q;}
    if(t>.025&&target&&Math.abs(q.x-target.x)<=22&&q.y>=target.y-36&&q.y<=target.y+3){hit={...q,type:'target'};points.push(hit);break;}
    const margin=clearance>0&&t>.08&&Math.hypot(q.x-origin.x,q.y-origin.y)>35&&(!target||Math.hypot(q.x-target.x,q.y-target.y+14)>45)&&[[clearance,0],[-clearance,0],[0,clearance],[0,-clearance]].some(([x,y])=>api.terrain(d,q.x+x,q.y+y));
    if(t>.035&&(api.terrain(d,q.x,q.y)||margin)){hit={...q,type:'ground'};points.push(hit);break;}
    if(q.y>Math.max(2000,d.ground.h+400)||q.x< -2000||q.x>d.ground.w+2000)break;
   }branches.push({points,hit,waveType:type});}
  const hits=branches.filter(b=>b.hit?.type==='target'),hit=hits.toSorted((a,b)=>b.hit.t-a.hit.t)[0]?.hit??branches.find(b=>b.hit)?.hit??null;
  return{points:branches[0].points,hit,branches,pairHits:hits.length,turtlePair:true,waveMappingEstimated:true,horizon:duration,tornadoEntry:null,weatherHandled:jumps.length>0,weatherTransitions:jumps.length};
 }
 Object.defineProperty(globalThis,'__reaTurtleModel',{value:{version:2,fit,seed,tracePair,isTurtle},configurable:true});return{installed:true,mobile:'Turtle',version:2};
})()
