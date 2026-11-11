// Exact replay transform for native Raon S1 wave IDs5/6/7.
// Captured source: scripts/script-842-2ce38357c1ea.js. No native controls.
(()=>{
 const DEG=Math.PI/180,cache=new Map(),phases=[0,2*Math.PI/3,4*Math.PI/3];
 function amplitudeAt(ms,type=5){if(!Number.isFinite(ms))throw TypeError('Wave time must be finite milliseconds');if(![5,6,7].includes(type))throw RangeError('Raon S1 requires native wave5/6/7');return 15*Math.sin(ms/60+phases[type-5]);}
 function roots(a,b,c){if(Math.abs(a)<1e-10)return Math.abs(b)<1e-10?[]:[-c/b];const d=b*b-4*a*c;if(d<0)return[];const s=Math.sqrt(d);return[(-b-s)/(2*a),(-b+s)/(2*a)];}
 function prepare(start,jumps=[]){
  const key=JSON.stringify([start.x,start.y,start.ang,start.power,start.vx,start.vy,start.ax,start.ay,jumps]);if(cache.has(key))return cache.get(key);
  const rad=start.ang*DEG,segments=[{at:0,x:start.x,y:start.y,vx:start.vx??Math.cos(rad)*start.power,vy:start.vy??-Math.sin(rad)*start.power,ax:start.ax,ay:start.ay,z:0},...jumps.map(j=>({at:j[0],x:j[1],y:j[2],vx:j[3],vy:j[4],ax:j[5]??start.ax,ay:j[6]??start.ay,z:j[7]??0}))],masks=new Map();
  function state(ms){let lo=0,hi=segments.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(segments[mid].at<=ms)lo=mid;else hi=mid-1;}const s=segments[lo],t=(ms-s.at)/1000;return{s,t};}
  function carrierAt(ms){const {s,t}=state(ms),x=s.x+s.vx*t+s.ax*t*t/2,y=s.y+s.vy*t+s.ay*t*t/2,hx=s.vx+s.ax*(t-.0025),hy=s.vy+s.ay*(t-.0025);return{x,y,a:Math.atan2(hy,hx)/DEG,z:s.z};}
  function at(ms){const {s,t}=state(ms),x=s.x+s.vx*t+s.ax*t*t/2,y=s.y+s.vy*t+s.ay*t*t/2,hx=s.vx+s.ax*(t-.0025),hy=s.vy+s.ay*(t-.0025),length=Math.hypot(hx,hy),dx=length?hx/length:1,dy=length?hy/length:0;return phases.map(phase=>{const a=15*Math.sin(ms/60+phase);return{x:x+a*dy,y:y-a*dx,z:s.z};});}
  function computePotential(target,duration){if(!target)return 7;const left=target.x-37.1,right=target.x+37.1,top=target.y-51.1,bottom=target.y+18.1;let mask=0;
   for(let i=0;i<segments.length;i++){const s=segments[i],startTime=s.at/1000,endTime=Math.min(duration,(segments[i+1]?.at??duration*1000)/1000);if(endTime<startTime)continue;const horizon=endTime-startTime,times=[0,horizon,...[left,right].flatMap(x=>roots(s.ax/2,s.vx,s.x-x)),...[top,bottom].flatMap(y=>roots(s.ay/2,s.vy,s.y-y))].filter(t=>t>=0&&t<=horizon).sort((a,b)=>a-b);
    for(let j=0;j<times.length;j++){const a=times[j],b=times[j+1]??a,mid=(a+b)/2,x=s.x+s.vx*mid+s.ax*mid*mid/2,y=s.y+s.vy*mid+s.ay*mid*mid/2;if(x<left-.1||x>right+.1||y<top-.1||y>bottom+.1)continue;const step=Math.max(.0001,Math.min(.001,.35/(Math.hypot(s.vx,s.vy)+Math.hypot(s.ax,s.ay)*duration+260)));for(let t=a;t<=b+step/2;t+=step){const global=Math.min(t,b)+startTime;if(global<.025)continue;const points=at(global*1000);for(let k=0;k<3;k++)if(Math.abs(points[k].x-target.x)<=22.5&&points[k].y>=target.y-36.5&&points[k].y<=target.y+3.5)mask|=1<<k;if(mask===7)return mask;}}
   }return mask;
  }
  function potential(target,duration){if(!target)return 7;const k=JSON.stringify([target.x,target.y,duration]);if(masks.has(k))return masks.get(k);const v=computePotential(target,duration);masks.set(k,v);if(masks.size>8)masks.delete(masks.keys().next().value);return v;}
  const result=Object.freeze({at,carrierAt,potential});cache.set(key,result);if(cache.size>256)cache.delete(cache.keys().next().value);return result;
 }
 function positionAt(start,ms,type=5,jumps=[]){amplitudeAt(ms,type);return prepare(start,jumps).at(ms)[type-5];}
 function carrierAt(start,ms,jumps=[]){return prepare(start,jumps).carrierAt(ms);}
 Object.defineProperty(globalThis,'__reaRaonWave',{value:Object.freeze({version:1,amplitudeAt,positionAt,carrierAt,prepare,clearCache(){cache.clear();},stats(){return{cacheEntries:cache.size};}}),configurable:true});return{installed:true,version:1};
})()
