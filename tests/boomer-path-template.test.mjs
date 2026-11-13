import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url),c=vm.createContext({Math,Date});vm.runInContext(await readFile(new URL('boomer-path-template.js',app),'utf8'),c);
const api=c.__reaBoomerPaths,fixture=JSON.parse(await readFile(new URL('./fixtures/boomer-headwind-pairs.json',import.meta.url),'utf8'));
function record(r){const look=r.worldAngle>90?0:1,ang=look===0?180-r.worldAngle:r.worldAngle;return{...r,mobile:15,bullet:50,isLocal:true,start:{t:0,x:0,y:0},weathers:[],special:{path:true},player:{x:0,y:0,body:0,ang,look,aim:[0,1,2].map(()=>({ang:0,size:0}))}};}
function scene(r){const s=record(r),p={...s.player,mobile:15,selected_shot:1,minang:0,maxang:90,is_alive:true,isAiming:true},d={wind_power:r.wind.power,wind_angle:r.wind.angle,weathers:[]},math={launch(q){return{x:q.x,y:q.y,angle:(q.look===0?180-q.ang:q.ang)-q.body};},terrain(){return false;}};return{s,p,d,math};}
test('nine native headwind S1/S2 pairs support exact-input and near-wind displacement reuse',()=>{
 assert.equal(fixture.pairs.length,9);let exact=0,worst=0;
 for(const pair of fixture.pairs){const source=api.prepare(record(pair.source),pair.source.session);assert.ok(source);let max=0;
  for(let t=0;t<=pair.commonHorizonMs;t+=pair.source.dtMs){const p=api.position(source,pair.target.wind,t/1000),i=t/pair.target.dtMs;max=Math.max(max,Math.hypot(p.x-pair.target.path[3*i],p.y-pair.target.path[3*i+1]));}
  assert.ok(Math.abs(max-pair.expectedTransferMaxError)<1e-6,pair.id+': '+max);worst=Math.max(worst,max);if(pair.source.wind.power===pair.target.wind.power){exact++;assert.ok(max<1e-9);}
 }assert.equal(exact,4);assert.ok(worst<6.73);
});
test('templates cannot extrapolate angle, power, session, wind sector or shot family',()=>{
 const r=fixture.pairs[0].source,s=record(r),source=api.prepare(s,r.session);assert.ok(api.compatible(source,r.wind,r.worldAngle,r.uiPower));
 assert.equal(api.compatible(source,r.wind,r.worldAngle+1,r.uiPower),false);assert.equal(api.compatible(source,r.wind,r.worldAngle,r.uiPower+1),false);assert.equal(api.compatible(source,{...r.wind,power:r.wind.power+2},r.worldAngle,r.uiPower),false);assert.equal(api.compatible(source,{...r.wind,angle:r.wind.angle+1},r.worldAngle,r.uiPower),false);
 assert.equal(api.prepare(s,r.session+100),null);assert.equal(api.prepare({...s,shotType:2},r.session),null);assert.equal(api.prepare({...s,weathers:undefined},r.session),null);assert.equal(api.position(source,r.wind,source.horizon+.01),null);
});
test('template search translates launch/movement, checks terrain and respects angle lock',()=>{
 const r=fixture.pairs[0].source,h=scene(r),source=api.prepare(h.s,r.session),q=api.position(source,r.wind,.8),target={n:1,x:q.x,y:q.y+14};
 let a=api.find(h.math,h.d,h.p,target,[h.s],r.session);assert.ok(a?.ready);assert.equal(a.boomerPathTemplate,true);assert.equal(a.predictedHit,false);assert.equal(a.power,r.uiPower);assert.ok(a.search.fullCandidates<=16);
 h.p.x=80;h.p.y=30;Object.assign(target,{x:target.x+80,y:target.y+30});a=api.find(h.math,h.d,h.p,target,[h.s],r.session,{mode:'fixed',fixedDisplay:r.worldAngle>90?180-r.worldAngle:r.worldAngle,fixedLook:h.p.look});assert.ok(a?.ready);assert.equal(a.origin.x,80);assert.equal(a.origin.y,30);
 assert.equal(api.find(h.math,h.d,h.p,target,[h.s],r.session,{mode:'fixed',fixedDisplay:10}),null);h.math.terrain=(_d,x,y)=>Math.hypot(x-h.p.x,y-h.p.y)>5;assert.equal(api.find(h.math,h.d,h.p,target,[h.s],r.session),null);
});
test('unknown special-weather entry stops template tracing before a later target',()=>{
 const r=fixture.pairs[0].source,h=scene(r),source=api.prepare(h.s,r.session),q=api.position(source,r.wind,.9),target={n:1,x:q.x,y:q.y+14},entry=api.position(source,r.wind,.3);h.d.weathers=[{weather_type:8,x:entry.x,size:8}];
 const path=api.trace(h.math,h.d,source,{x:0,y:0},r.wind,target);assert.equal(path.hit,null);assert.equal(path.weatherEntry.type,8);assert.ok(path.points.at(-1).t<.9);assert.equal(api.find(h.math,h.d,h.p,target,[h.s],r.session),null);
});
test('random weather keeps the requested ordinary-template calculation with an estimate label',()=>{
 const r=fixture.pairs[0].source,h=scene(r),source=api.prepare(h.s,r.session),q=api.position(source,r.wind,.9),entry=api.position(source,r.wind,.3),target={n:1,x:q.x,y:q.y+14};h.d.weathers=[{weather_type:6,x:entry.x,size:8}];const a=api.find(h.math,h.d,h.p,target,[h.s],r.session);assert.ok(a?.ready);assert.equal(a.model.randomWeatherIgnored,true);assert.equal(a.provisional,true);
});
test('a recorded return segment remains a return path through the target',()=>{
 const path=Array.from({length:41},(_,i)=>{const t=i*.05;return[-200*t+200*t*t,-300*t+150*t*t,0];}).flat(),r={session:9,shotType:0,uiPower:100,worldAngle:150,wind:{power:10,angle:0},pathDuration:2050,path},h=scene(r),source=api.prepare(h.s,9),q=api.position(source,r.wind,1.4),target={n:1,x:q.x,y:q.y+14};
 const a=api.find(h.math,h.d,h.p,target,[h.s],9);assert.ok(a?.ready);assert.ok(a.path.turn);assert.ok(a.path.turn.t>.45&&a.path.turn.t<.55);assert.ok(a.path.hit.t>1.2);assert.equal(a.power,100);
});
test('synthetic SS templates stay in their own shot family and require exact wind',()=>{
 const r=fixture.pairs[0].source,h=scene(r);h.s.shotType=2;h.s.bullet=51;h.p.selected_shot=2;const source=api.prepare(h.s,r.session),q=api.position(source,r.wind,.8),target={n:1,x:q.x,y:q.y+14};
 let a=api.find(h.math,h.d,h.p,target,[h.s],r.session);assert.ok(a?.ready);assert.equal(a.model.boomerSS,true);h.d.wind_power+=1;assert.equal(api.find(h.math,h.d,h.p,target,[h.s],r.session),null);h.d.wind_power=r.wind.power;h.p.selected_shot=1;assert.equal(api.find(h.math,h.d,h.p,target,[h.s],r.session),null);
});
test('shared solver can use a recorded headwind path without a quadratic model',async()=>{
 const r=fixture.pairs[0].source,h=scene(r),source=api.prepare(h.s,r.session),q=api.position(source,r.wind,.8),target={n:1,x:q.x,y:q.y+14};c.__reaDragonCollector={session:r.session,calibration:[h.s],samples:[]};vm.runInContext(await readFile(new URL('aduka-autoaim.js',app),'utf8'),c);
 const a=c.__reaDragonAutoAim.find(h.math,h.d,{valid:false},h.p,target,()=>null);assert.ok(a?.ready);assert.equal(a.boomerPathTemplate,true);
});
test('panel renders a template estimate without inventing acceleration fields',async()=>{
 const h=await overlayFixture(),r=fixture.pairs[0].source,s=record(r),source=api.prepare(s,r.session),q=api.position(source,r.wind,.8);
 Object.assign(h.p,s.player,{mobile:15,selected_shot:1,minang:0,maxang:90,mobile_data:{name:'Boomer',bullets:[50,51]},x:0,y:0});Object.assign(h.target,{x:q.x,y:q.y+14});Object.assign(h.renderer,{wind_power:r.wind.power,wind_angle:r.wind.angle});h.collector.session=r.session;h.collector.samples=[s];h.collector.calibration=[s];h.nodes.get('rea-aduka-auto-adjust').checked=false;
 vm.runInContext(await readFile(new URL('boomer-path-template.js',app),'utf8'),h.context);h.step(1100);assert.equal(h.aim.errors.length,0);assert.ok(h.aim.autoResult?.boomerPathTemplate);assert.equal(h.aim.status().autoaim.boomerTemplate.sourcePower,r.uiPower);
});
