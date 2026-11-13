// Empirical Frog carrier model. Surface continuations are never launch samples.
// Native observations support a shared S1/S2/SS ratio near2.4 at low forces.
// Wind3.4, x-floor/y-ceil is a retained-data hypothesis, not server source.
(()=>{
 const finite=Number.isFinite,rad=a=>a*Math.PI/180,median=a=>{const v=a.toSorted((x,y)=>x-y);return(v[(v.length-1)>>1]+v[v.length>>1])/2;},isFrog=p=>p?.mobile===21||p?.mobile_data?.name==='Frog';
 const prior=Object.freeze({ratio:2.4,gravity:311,windFactor:3.4,ratioError:.035,gravityError:24,windError:12,launchSamples:3,minPower:1,maxPower:45,sessions:1,windStates:7,windSessions:3,observedMaxWind:25});
 const vector=w=>({x:Math.floor(w.power*Math.cos(rad(w.angle))),y:Math.ceil(-w.power*Math.sin(rad(w.angle)))}),accel=(w,g,bx=0)=>({ax:bx+Math.round(3.4*w.x),ay:g+Math.round(3.4*w.y)});
 const valid=(d,p)=>isFrog(p)&&[0,1,2].includes(p.selected_shot)&&finite(d?.wind_power)&&d.wind_power>=0&&d.wind_power<=100&&finite(d.wind_angle);
 const annotate=(m,p)=>({...m,frog:true,frogShot:p.selected_shot,frogDirection:p.selected_shot===0?-1:1,frogSurfaceSeconds:p.selected_shot===2?3:1.5,frogSurfaceEstimated:true,provisional:true,maxTime:6.5});
 function seed(d,p){if(!valid(d,p))return null;const w=vector({power:d.wind_power,angle:d.wind_angle});return annotate({valid:true,bootstrap:true,frogPrior:true,ratio:prior.ratio,speedQuantization:'round',quantizationAmbiguous:true,...accel(w,prior.gravity),dx:0,dy:0,sampleCount:0,exactWindSamples:0,minPower:1,maxPower:45,ratioError:prior.ratioError,windFactor:3.4,windFactorKnown:false,windInferred:d.wind_power!==0,windFallback:d.wind_power!==0,windExtrapolated:d.wind_power>25,positionAllowance:(power,t)=>5+(.035*power+1)*t+Math.hypot(12,24)*t*t/2,reason:'Frog: ước tính ban đầu từ mẫu lực thấp; đường trượt còn ước tính'},p);}
 function ordinary(r){const k=globalThis.__reaDragonBallistics;if(!k||!r.physicsChecks?.length)return false;return r.physicsChecks.every(q=>{const at=k.positionAt(r.start,q.time);return finite(q.time)&&finite(q.pos?.x)&&finite(q.pos?.y)&&Math.hypot(at.x-q.pos.x,at.y-q.pos.y)<1;});}
 // Fit a match-specific rounded wind factor, keeping the full feasible range.
 // The zero horizontal intercept is an empirical assumption; inconsistent
 // observations reject the fit instead of silently changing the rounding law.
 function fitWind(rows){
  const values=[...new Map(rows.map(r=>{const v={...vector(r.wind),ax:r.start.ax,ay:r.start.ay};return[JSON.stringify(v),v];})).values()].slice(-64);let low=.05,high=10,informative=false;
  function intersect(a,b){low=Math.max(low,Math.min(a,b));high=Math.min(high,Math.max(a,b));}
  for(const r of values){if(r.x){intersect((r.ax-.5)/r.x,(r.ax+.5)/r.x);informative=true;}else if(Math.abs(r.ax)>.5)return null;}
  for(let i=0;i<values.length;i++)for(let j=0;j<i;j++){const dy=values[i].y-values[j].y,da=values[i].ay-values[j].ay;if(dy){intersect((da-1)/dy,(da+1)/dy);informative=true;}else if(Math.abs(da)>=1)return null;}
  if(!informative||!(high>low))return null;const factor=(low+high)/2,gLow=Math.max(...values.map(r=>r.ay-.5-factor*r.y)),gHigh=Math.min(...values.map(r=>r.ay+.5-factor*r.y));if(!(gHigh>gLow))return null;const gravity=(gLow+gHigh)/2;
  if(values.some(r=>Math.round(factor*r.x)!==r.ax||Math.round(gravity+factor*r.y)!==r.ay))return null;
  return{factor,gravity,factorLow:low,factorHigh:high,gravityLow:gLow,gravityHigh:gHigh,assumesZeroHorizontalBias:true,observations:values.length,provisional:true};
 }
 function fit(samples,d,p,session){
  if(!valid(d,p))return null;const seen=new Set(),list=p.mobile_data?.bullets??[64,66];let rows=(samples??[]).filter(r=>{if(r.session!==session||r.mobile!==21||!r.isLocal||![0,1,2].includes(r.shotType)||r.bullet!==list[r.shotType===2?1:0]||(r.start?.t??0)!==0||!(r.uiPower>0&&r.uiPower<=400)||r.special?.path||r.special?.wave||r.special?.orbit||!['x','y','ang','power','ax','ay'].every(k=>finite(r.start?.[k]))||!finite(r.wind?.power)||!finite(r.wind?.angle)||!ordinary(r))return false;const key=JSON.stringify([r.session,r.shotType,r.start,r.uiPower]);if(seen.has(key))return false;seen.add(key);return true;});
  if(!rows.length)return seed(d,p);
  function launchFit(rows){const ranges=[];for(const[mode,offset]of [['round',.5],['floor',0]]){const low=Math.max(...rows.map(r=>(r.start.power-offset)/r.uiPower)),high=Math.min(...rows.map(r=>(r.start.power+1-offset)/r.uiPower));if(low<high)ranges.push({mode,low,high});}const chosen=ranges[0];if(!chosen)return null;const ratio=(chosen.low+chosen.high)/2;if(!(ratio>0&&ratio<10))return null;return{ratio,mode:chosen.mode,ranges,ratioError:Math.max(...ranges.flatMap(r=>[Math.abs(r.low-ratio),Math.abs(r.high-ratio)]))};}
  let launch=launchFit(rows);if(!launch){rows=rows.filter(r=>r.shotType===p.selected_shot);if(!rows.length||!(launch=launchFit(rows)))return seed(d,p);}
  const exact=rows.filter(r=>r.wind.power===d.wind_power&&(d.wind_power===0||Math.abs(((r.wind.angle-d.wind_angle+540)%360)-180)<.01)),law=fitWind(rows),anchor=rows.toSorted((a,b)=>(b.time??0)-(a.time??0))[0],aw=vector(anchor.wind),current=vector({power:d.wind_power,angle:d.wind_angle}),inferred=!exact.length,a=exact.length?{ax:median(exact.map(r=>r.start.ax)),ay:median(exact.map(r=>r.start.ay))}:law?{ax:Math.round(law.factor*current.x),ay:Math.round(law.gravity+law.factor*current.y)}:{ax:anchor.start.ax+Math.round(3.4*current.x)-Math.round(3.4*aw.x),ay:anchor.start.ay+Math.round(3.4*current.y)-Math.round(3.4*aw.y)};
  const uncertainty=!inferred?1:law?Math.max(2,Math.hypot(current.x-aw.x,current.y-aw.y)*(law.factorHigh-law.factorLow)+(law.gravityHigh-law.gravityLow)+1):Math.hypot(12,16);
  return annotate({valid:true,frogPrior:false,ratio:launch.ratio,speedQuantization:launch.mode,ratioError:launch.ratioError,speedQuantizationIntervals:launch.ranges,quantizationAmbiguous:launch.ranges.length>1,...a,dx:0,dy:0,sampleCount:rows.length,exactWindSamples:exact.length,minPower:Math.min(...rows.map(r=>r.uiPower)),maxPower:Math.max(...rows.map(r=>r.uiPower)),windFactor:law?.factor??3.4,windFactorKnown:false,windModel:law,windInferred:inferred,windFallback:inferred,windExtrapolated:d.wind_power>25,positionAllowance:(power,t)=>3+(1+launch.ratioError*power)*t+uncertainty*t*t/2,reason:null},p);
 }
 Object.defineProperty(globalThis,'__reaFrogModel',{value:Object.freeze({version:2,isFrog,seed,fit,fitWind,prior,vector}),configurable:true});return{installed:true,version:2};
})()
