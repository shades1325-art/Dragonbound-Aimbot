// Boomer SS flight geometry. SS launch descriptors are not ordinary ballistic
// coefficients; calibration uses native path samples. Transformation timing
// remains observational and is not inferred from the flight-duration pause.
(()=>{
 let cached=null;
 function fit(samples,d,p,session){
  if(p?.mobile!==15||p.selected_shot!==2)return null;
  const last=samples.at(-1);if(!cached||cached.samples!==samples||cached.last!==last||cached.length!==samples.length||cached.session!==session){
   const ss=samples.filter(r=>r.session===session&&r.mobile===15&&r.isLocal&&r.shotType===2&&r.bullet===51&&(r.start?.t??0)===0);
   const observed=ss.findLast(r=>Number.isFinite(r.change?.at)&&Number.isFinite(r.change?.dur));
   cached={samples,last,length:samples.length,session,zero:globalThis.__reaBoomerZeroPrior?.fit(samples,session),observations:ss.length,observed:observed?{at:observed.change.at,dur:observed.change.dur,img:observed.change.img}:null};
  }
  const ordinary={...p,selected_shot:1},base=d.wind_power===0?(cached.zero??globalThis.__reaBoomerZeroPrior?.seed(d,ordinary)):globalThis.__reaBoomerLive?.fit(samples,d,ordinary,session);
  if(!base?.valid)return{valid:false,provisional:true,boomerSS:true,reason:'Boomer SS gió ngược: cần đường SS cùng góc/lực/gió trong trận hoặc chọn công thức tham khảo',sampleCount:cached.observations};
  return{...base,boomerSS:true,boomerOrdinary:true,boomerZeroPrior:false,pathBased:true,provisional:true,ssTimingUnknown:true,ssObservedTransform:cached.observed,ssObservedSamples:cached.observations,maxTime:Math.min(d.wind_power===0?4.1:3,base.maxTime??4.1),source:'boomer-SS-shared-path-geometry',reason:null};
 }
 Object.defineProperty(globalThis,'__reaBoomerSS',{value:Object.freeze({version:1,fit}),configurable:true});return{installed:true,version:1};
})()
