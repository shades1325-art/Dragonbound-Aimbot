import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url),c=vm.createContext({Math,Date});
for(const f of ['ballistics-v2.js','boomer-live-model.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),c);
const api=c.__reaBoomerLive,fixture=JSON.parse(await readFile(new URL('./fixtures/boomer-tailwind.json',import.meta.url),'utf8')),rad=a=>a*Math.PI/180;
const player=r=>({mobile:15,selected_shot:r.shot,look:r.look,ang:r.look===0?180-r.worldAngle:r.worldAngle,body:0,x:0,y:0,aim:[0,1,2].map(()=>({ang:0,size:0}))});
const record=r=>({session:r.sessionGroup,mobile:15,isLocal:true,shotType:r.shot,bullet:50,start:{t:0,x:r.originOffset[0],y:r.originOffset[1]},uiPower:r.power,player:player(r),wind:r.wind,weathers:[],special:{path:true},pathDuration:r.points.length/2*r.stepMs,path:r.points.flatMap((v,i)=>i%2?[]:[v+r.originOffset[0],r.points[i+1]+r.originOffset[1],0])});
function error(r,m){const theta=rad(r.worldAngle),vx=m.ratio*r.power*Math.cos(theta)+m.velocityBiasX,vy=-m.ratio*r.power*Math.sin(theta)+m.velocityBiasY;let max=0,sq=0;for(let i=0;i<r.points.length/2;i++){const t=i*r.stepMs/1000,e=Math.hypot((m.dx??0)+vx*t+m.ax*t*t/2-r.originOffset[0]-r.points[2*i],(m.dy??0)+vy*t+m.ay*t*t/2-r.originOffset[1]-r.points[2*i+1]);max=Math.max(max,e);sq+=e*e;}return{max,rmse:Math.sqrt(sq/(r.points.length/2))};}
test('ordinary prior reproduces native zero/tail prefixes with bounded muzzle-based error',()=>{
 assert.equal(fixture.records.length,79);assert.equal(new Set(fixture.records.map(r=>r.sessionGroup)).size,20);let worst=0,negativeX=false,negativeY=false;
 for(const r of fixture.records){const wx=r.wind.power*Math.cos(rad(r.wind.angle)),wy=-r.wind.power*Math.sin(rad(r.wind.angle));negativeX||=wx<0;negativeY||=wy<0;const m=r.wind.power?api.prior({wind_power:r.wind.power,wind_angle:r.wind.angle},player(r)):{...api.archive,ax:api.archive.biasX,ay:api.archive.gravity};assert.ok(m);worst=Math.max(worst,error(r,m).max);if(r.wind.power){assert.equal(m.maxTime,3);assert.equal(m.provisional,true);}}
 assert.ok(worst<11.1,String(worst));assert.ok(negativeX&&negativeY);
});
test('whole-session holdout retains the ordinary law without fitting the held session',()=>{
 // Independently refit velocity/acceleration offsets at fixed archive slope.
 const fit=rows=>{const accum=()=>({a:0,b:0,d:0,u:0,v:0}),x=accum(),y=accum(),k=api.archive.ratio;
  for(const r of rows){const wx=Math.trunc(r.wind.power*Math.cos(rad(r.wind.angle))),wy=Math.trunc(-r.wind.power*Math.sin(rad(r.wind.angle))),theta=rad(r.worldAngle),weight=1/(r.points.length/2);for(let i=1;i<r.points.length/2;i++){const t=i*r.stepMs/1000,h=t*t/2;for(const [a,value]of [[x,r.points[2*i]-k*r.power*Math.cos(theta)*t-4*wx*h],[y,r.points[2*i+1]+k*r.power*Math.sin(theta)*t-4*wy*h]]){a.a+=t*t*weight;a.b+=t*h*weight;a.d+=h*h*weight;a.u+=t*value*weight;a.v+=h*value*weight;}}}
  const solve=a=>[(a.u*a.d-a.v*a.b)/(a.a*a.d-a.b*a.b),(a.v*a.a-a.u*a.b)/(a.a*a.d-a.b*a.b)];return{x:solve(x),y:solve(y)};
 };let worst=0,rmse=0;
 for(const r of fixture.records){const f=fit(fixture.records.filter(s=>s.sessionGroup!==r.sessionGroup)),m={ratio:api.archive.ratio,velocityBiasX:f.x[0],velocityBiasY:f.y[0],ax:f.x[1]+4*Math.trunc(r.wind.power*Math.cos(rad(r.wind.angle))),ay:f.y[1]+4*Math.trunc(-r.wind.power*Math.sin(rad(r.wind.angle)))};const e=error(r,m);worst=Math.max(worst,e.max);rmse+=e.rmse;}
 assert.ok(worst<11.8,String(worst));assert.ok(rmse/79<2.2,String(rmse/79));
});
test('nearby low powers cannot distort the launch slope for a later high-power shot',()=>{
 const held=fixture.records.find(r=>r.worldAngle===138&&r.power===360),train=fixture.records.filter(r=>r.sessionGroup===held.sessionGroup&&[75,96,101].includes(r.power));assert.equal(train.length,3);
 const m=api.fit(train.map(record),{wind_power:held.wind.power,wind_angle:held.wind.angle},player(held),held.sessionGroup);assert.ok(m?.valid);assert.equal(m.ratio,Math.PI/1.8);assert.ok(error(held,m).max<6,String(error(held,m).max));
});
test('ordinary law rejects headwind, SS, malformed inputs and tiny opposing wind',()=>{
 const p={mobile:15,selected_shot:1,look:0,ang:35,body:0};assert.equal(api.fit([],{wind_power:20,wind_angle:40},p,1),null);
 assert.equal(api.prior({wind_power:20,wind_angle:40},p),null);assert.equal(api.prior({wind_power:.01,wind_angle:0},p),null);assert.equal(api.fit([],{wind_power:20,wind_angle:40},{...p,selected_shot:2},1),null);
 assert.equal(api.prior({wind_power:NaN,wind_angle:0},p),null);assert.doesNotThrow(()=>api.build([{session:1,mobile:15,isLocal:true,shotType:1,bullet:50,path:[0,0,0],uiPower:NaN}],1));
});
test('unmeasured wind and angle coverage stays labelled with a shorter horizon',()=>{
 const p={mobile:15,selected_shot:1,look:1,ang:45,body:0},m=api.prior({wind_power:20,wind_angle:40},p);assert.ok(m?.valid);assert.equal(m.windExtrapolated,true);assert.equal(m.maxTime,2.1);
 const high=api.prior({wind_power:15,wind_angle:319},{...p,ang:89});assert.ok(high.angleExtrapolated);assert.equal(high.maxTime,2.1);assert.ok(high.positionAllowance(200,2)>15);
});
test('ordinary Boomer forecasts stop at unvalidated special-weather columns',async()=>{
 const h=await overlayFixture(),m=api.prior({wind_power:15,wind_angle:319},{mobile:15,selected_shot:1,look:1,ang:38,body:0});h.context.__reaTornadoMethod={trace(){throw Error('Do not invent post-weather headwind physics');}};
 for(const type of [6,7,8]){h.renderer.weathers=[{weather_type:type,x:400,size:40}];const path=h.aim.api.trajectory(h.renderer,m,{x:300,y:100,angle:38},200,{x:900,y:100},2);assert.equal(path.hit,null);assert.equal(path.weatherEntry.type,type);assert.ok(path.points.at(-1).x<400);}
});
