// Ordinary Nak launch calibration. S2 underground motion is handled separately.
// The archive prior comes from seven S1/S2 launches in one zero-wind match.
// Its wind factor4 is an explicit inference, not a measured Nak wind law.
(() => {
 const finite=Number.isFinite,rad=a=>a*Math.PI/180;
 const prior=Object.freeze({ratio:2.09,gravity:353,windFactor:4,windFactorKnown:false,ratioError:.12,gravityError:24,windErrorX:16,records:7,sessions:1,source:'nak-v25-initial.json'});
 const isNak=p=>p?.mobile===11||p?.mobile_data?.name==='Nak';
 const median=values=>{const a=values.toSorted((x,y)=>x-y);return(a[(a.length-1)>>1]+a[a.length>>1])/2;};
 const wind=w=>({x:Math.floor(w.power*Math.cos(rad(w.angle))),y:Math.floor(-w.power*Math.sin(rad(w.angle)))});
 const validScene=(d,p)=>isNak(p)&&[0,1,2].includes(p.selected_shot)&&finite(d?.wind_power)&&d.wind_power>=0&&d.wind_power<=26&&finite(d.wind_angle);
 const expected=(p,shot)=>{const list=p.mobile_data?.bullets??[34,35,36,37];return list[shot===2?3:shot];};
 function annotate(model,p,specific=0){
  const air=p.selected_shot===1,unverifiedSS=p.selected_shot===2&&specific===0;
  return{...model,nak:true,nakShot:p.selected_shot,nakAirOnly:air,nakSSUnverified:unverifiedSS,provisional:!!model.provisional||air||unverifiedSS,maxTime:6.5};
 }
 function seed(d,p){
  if(!validScene(d,p))return null;const w=wind({power:d.wind_power,angle:d.wind_angle}),uncertainty=Math.hypot(prior.windErrorX,prior.gravityError);
  return annotate({valid:true,bootstrap:true,nakPrior:true,ratio:prior.ratio,speedQuantization:'round',speedQuantizationEstimated:true,quantizationAmbiguous:true,speedQuantizationCandidates:['round','floor'],ax:d.wind_power===0?0:prior.windFactor*w.x,ay:prior.gravity+prior.windFactor*w.y,dx:0,dy:0,sampleCount:0,exactWindSamples:0,minPower:14,maxPower:400,ratioError:prior.ratioError,gravityError:prior.gravityError,windErrorX:prior.windErrorX,windFactor:prior.windFactor,windFactorKnown:false,windInferred:d.wind_power!==0,windFallback:d.wind_power!==0,windExtrapolated:d.wind_power!==0,provisional:true,positionAllowance:(power,t)=>5+(prior.ratioError*power+2)*t+uncertainty*t*t/2,reason:'Nak: ước tính từ mẫu S1/S2 gió 0; hệ số gió chưa được kiểm chứng'},p);
 }
 function ordinaryCheck(r){
  if(!r.physicsChecks?.length)return false;const s=r.start,vx=s.power*Math.cos(rad(s.ang)),vy=-s.power*Math.sin(rad(s.ang));
  return r.physicsChecks.every(c=>{if(!finite(c.time)||!finite(c.pos?.x)||!finite(c.pos?.y))return false;const t=c.time/1000;return Math.hypot(s.x+vx*t+s.ax*t*t/2-c.pos.x,s.y+vy*t+s.ay*t*t/2-c.pos.y)<1;});
 }
 function fit(samples,d,p,session){
  if(!validScene(d,p))return null;const seen=new Set();
  const rows=(samples??[]).filter(r=>{
   if(r.session!==session||r.mobile!==11||!r.isLocal||![0,1,2].includes(r.shotType)||r.bullet!==expected(p,r.shotType)||(r.start?.t??0)!==0||!(r.uiPower>0&&r.uiPower<=400)||r.special?.path||r.special?.wave||r.special?.orbit)return false;
   if(!['x','y','ang','power','ax','ay'].every(k=>finite(r.start?.[k]))||!(r.start.power>0)||!finite(r.wind?.power)||!finite(r.wind?.angle)||!ordinaryCheck(r))return false;
   const key=JSON.stringify([r.session,r.bullet,r.start,r.uiPower,r.shotType]);if(seen.has(key))return false;seen.add(key);return true;
  });
  if(!rows.length)return seed(d,p);
  const candidates=[];for(const [mode,offset]of [['round',.5],['floor',0]]){const low=Math.max(...rows.map(r=>(r.start.power-offset)/r.uiPower)),high=Math.min(...rows.map(r=>(r.start.power+1-offset)/r.uiPower));if(low<high)candidates.push({mode,low,high});}
  const chosen=candidates[0],ratio=chosen?(chosen.low+chosen.high)/2:rows.reduce((sum,r)=>sum+r.uiPower*r.start.power,0)/rows.reduce((sum,r)=>sum+r.uiPower*r.uiPower,0),quantization=chosen?.mode??null;
  const speed=power=>quantization==='round'?Math.round(power*ratio):quantization==='floor'?Math.floor(power*ratio):power*ratio,velocityError=Math.max(...rows.map(r=>Math.abs(speed(r.uiPower)-r.start.power)));
  if(!(ratio>0&&ratio<10)||velocityError>1.2)return seed(d,p);
  const values=rows.map(r=>({...wind(r.wind),ax:r.start.ax,ay:r.start.ay})),distinct=new Set(values.map(v=>v.x+':'+v.y)),mean=k=>values.reduce((n,v)=>n+v[k],0)/values.length,mx=mean('x'),my=mean('y'),ma=mean('ax'),mg=mean('ay'),den=values.reduce((n,v)=>n+(v.x-mx)**2+(v.y-my)**2,0);
  let law=null;if(rows.length>=3&&distinct.size>=2&&den>1){const factor=values.reduce((n,v)=>n+(v.x-mx)*(v.ax-ma)+(v.y-my)*(v.ay-mg),0)/den,biasX=ma-factor*mx,gravity=mg-factor*my,residual=Math.max(...values.map(v=>Math.hypot(v.ax-biasX-factor*v.x,v.ay-gravity-factor*v.y)));if(factor>0&&factor<20&&residual<=2)law={factor,biasX,gravity,residual,observedWindStates:distinct.size};}
  const current=wind({power:d.wind_power,angle:d.wind_angle}),exact=rows.filter(r=>r.wind.power===d.wind_power&&(d.wind_power===0||Math.abs(((r.wind.angle-d.wind_angle+540)%360)-180)<.01));
  let ax,ay,windInferred=false;
  if(exact.length){ax=median(exact.map(r=>r.start.ax));ay=median(exact.map(r=>r.start.ay));if(exact.some(r=>Math.hypot(r.start.ax-ax,r.start.ay-ay)>2))return seed(d,p);}
  else if(law){ax=law.biasX+law.factor*current.x;ay=law.gravity+law.factor*current.y;}
  else{const anchor=rows.toSorted((a,b)=>(b.time??0)-(a.time??0))[0],w=wind(anchor.wind);ax=anchor.start.ax+prior.windFactor*(current.x-w.x);ay=anchor.start.ay+prior.windFactor*(current.y-w.y);windInferred=true;}
  const specific=rows.filter(r=>r.shotType===p.selected_shot),quantizationAmbiguous=candidates.length!==1,extrapolated=!exact.length&&(windInferred||current.x<Math.min(...values.map(v=>v.x))||current.x>Math.max(...values.map(v=>v.x))||current.y<Math.min(...values.map(v=>v.y))||current.y>Math.max(...values.map(v=>v.y))),estimated=!exact.length||rows.length<2||specific.length===0||quantizationAmbiguous,ratioError=windInferred?prior.ratioError:chosen?(chosen.high-chosen.low)/2:velocityError/Math.max(1,...rows.map(r=>r.uiPower)),accelerationError=windInferred?Math.hypot(prior.windErrorX,prior.gravityError):!exact.length?Math.max(2,law?.residual??2):1;
  return annotate({valid:true,nakPrior:false,ratio,speedQuantization:quantization,speedQuantizationEstimated:quantizationAmbiguous,quantizationAmbiguous,speedQuantizationCandidates:candidates.map(c=>c.mode),speedQuantizationIntervals:candidates.map(c=>({...c})),ax,ay,dx:0,dy:0,sampleCount:rows.length,exactWindSamples:exact.length,minPower:Math.min(...rows.map(r=>r.uiPower)),maxPower:Math.max(...rows.map(r=>r.uiPower)),velocityError,ratioError,gravityError:windInferred?prior.gravityError:accelerationError,windErrorX:windInferred?prior.windErrorX:accelerationError,windModel:law,windFactor:law?.factor??prior.windFactor,windFactorKnown:!!law,windInferred,windFallback:!exact.length,windExtrapolated:extrapolated,provisional:estimated,positionAllowance:(power,t)=>5+(Math.max(1,velocityError+1)+ratioError*power)*t+accelerationError*t*t/2,reason:null},p,specific.length);
 }
 Object.defineProperty(globalThis,'__reaNakModel',{value:Object.freeze({version:1,isNak,seed,fit,prior}),configurable:true});return{installed:true,version:1};
})()
