import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url),c=vm.createContext({Math,Date});for(const f of ['ballistics-v2.js','boomer-zero-prior.js','boomer-live-model.js','boomer-ss.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),c);
const fixture=JSON.parse(await readFile(new URL('./fixtures/boomer-ss.json',import.meta.url),'utf8')),api=c.__reaBoomerSS,rad=a=>a*Math.PI/180;
const player=r=>({mobile:15,selected_shot:2,look:r.look,ang:r.look===0?180-r.worldAngle:r.worldAngle,body:0,x:0,y:0,aim:[0,1,2].map(()=>({ang:0,size:0}))});
test('four native SS prefixes validate ordinary geometry independently of SS launch descriptors',()=>{
 assert.equal(fixture.records.length,4);assert.equal(fixture.records.filter(r=>r.fresh).length,1);
 for(const r of fixture.records){const m=api.fit([],{wind_power:r.wind.power,wind_angle:r.wind.angle},player(r),r.sessionGroup);assert.ok(m?.valid);assert.equal(m.boomerSS,true);assert.equal(m.ssTimingUnknown,true);let max=0;
  for(let i=0;i<r.points.length/2;i++){const t=i*r.stepMs/1000,vx=m.ratio*r.power*Math.cos(rad(r.worldAngle))+(m.velocityBiasX||0),vy=-m.ratio*r.power*Math.sin(rad(r.worldAngle))+(m.velocityBiasY||0),e=Math.hypot((m.dx||0)+vx*t+m.ax*t*t/2-r.originOffset[0]-r.points[2*i],(m.dy||0)+vy*t+m.ay*t*t/2-r.originOffset[1]-r.points[2*i+1]);max=Math.max(max,e);}
  assert.ok(max<6,String(max));assert.ok(Math.abs(max-r.expectedReferenceMaxError)<1e-8);if(r.fresh)assert.equal((r.points.length/2-1)*r.stepMs/1000,3.75);
 }
});
test('SS transformation observation is retained separately from pre-shot geometry and timing certainty',()=>{
 const r=fixture.records.find(r=>r.fresh),p=player(r),sample={session:7,mobile:15,isLocal:true,shotType:2,bullet:51,start:{t:0,power:1,ax:999,ay:999},change:r.change};
 const m=api.fit([sample],{wind_power:r.wind.power,wind_angle:r.wind.angle},p,7);assert.ok(m.valid);assert.equal(m.ssObservedTransform.at,1540);assert.equal(m.ssObservedTransform.dur,500);assert.equal(m.ssTimingUnknown,true);assert.notEqual(m.ax,999);assert.notEqual(m.ay,999);assert.equal(m.maxTime,4.1);
});
test('SS rejects unmeasured headwind physics and stays separate from ordinary shot selection',()=>{
 const p={mobile:15,selected_shot:2,look:1,ang:50,body:0};assert.equal(api.fit([],{wind_power:20,wind_angle:180},p,9).valid,false);assert.equal(api.fit([],{wind_power:0,wind_angle:0},{...p,selected_shot:1},9),null);
});
async function setup(){const h=await overlayFixture();for(const f of ['boomer-zero-prior.js','boomer-live-model.js','boomer-ss.js','boomer-path-template.js','boomer-guide-methods.js','boomer-search.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);
 Object.assign(h.p,{mobile:15,selected_shot:2,look:1,ang:50,body:0,x:300,y:400,minang:10,maxang:90,mobile_data:{name:'Boomer',bullets:[50,51]},aim:[{ang:70,size:30},{ang:70,size:30},{ang:70,size:80}]});h.renderer.wind_power=0;h.renderer.weathers=[];h.collector.samples=[];h.collector.calibration=[];Object.assign(h.target,{x:800,y:400});h.nodes.get('rea-aduka-auto-adjust').checked=false;h.aim.settings.allowLongArc=true;h.step(1100);return h;}
test('SS becomes ready using its own muzzle without needing two new calibration shots',async()=>{
 const h=await setup(),r=h.aim.autoResult;assert.ok(r?.ready,r?.reason);assert.equal(r.model.boomerSS,true);assert.ok(r.model.maxTime<=4.1);assert.notEqual(r.model.longArcExtrapolated,true);assert.ok(Math.abs(r.origin.x-(300+Math.cos(rad(70))*80))<1e-8);assert.equal(h.aim.errors.length,0);
 h.p.selected_shot=1;h.step(1200);assert.notEqual(h.aim.autoResult?.model?.boomerSS,true);h.p.selected_shot=2;h.step(1300);assert.equal(h.aim.autoResult?.model?.boomerSS,true);
});
test('SS aim shooting commits computed power and explains native SS availability',async()=>{
 const h=await setup(),sent=[],facade={},game={players:[h.p],my_player_index:0,my_player_number:0,turn:0,selectedShot:2,ssEnabled:false,curUIPower:1};h.p.dn={Shoot(power){sent.push(power);}};
 Object.assign(h.context,{__reaDragonGame:game,__reaDragonNetwork:{game:facade},__reaDragonRuntimeLink:{facade}});
 const fire=()=>h.nodes.get('rea-aduka-fire').listeners.click({isTrusted:true});let result=fire();assert.equal(result.fired,false);assert.match(result.reason,/SS/);assert.equal(sent.length,0);
 game.ssEnabled=true;result=fire();assert.equal(result.fired,true,result.reason);assert.equal(sent.length,1);assert.equal(sent[0],h.aim.lastShot.power);assert.equal(h.aim.lastShot.boomerSS,true);assert.equal(h.aim.lastShot.ssTimingUnknown,true);
});
