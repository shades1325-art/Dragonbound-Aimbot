import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {apiFixture} from './helpers/skybomb-fixture.mjs';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url),c=vm.createContext({Math,Date});
for(const f of ['ballistics-v2.js','turtle-ss-timing.js','turtle-skybomb.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),c);
const sky=c.__reaTurtleSky,timing=c.__reaTurtleSS;
test('seven anonymized native split events reproduce all 42 fragments',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/turtle-ss-splits.json',import.meta.url),'utf8'));assert.equal(fixture.events.length,7);let count=0;
 for(const e of fixture.events){const starts=sky.fragmentStarts(e.start,e.openingMs,e.releaseMs,e.jumps);for(const child of e.children){const found=starts.find(s=>s.ang===(child.ang%360+360)%360);assert.ok(found);for(const key of ['x','y','power','ax','ay','t'])assert.equal(found[key],child[key]);count++;}}assert.equal(count,42);
});
test('forecast follows path timing, then model timing, before observed defaults',()=>{
 const m={turtleSS:true,ratio:2,ax:0,ay:390,ssOpeningMs:2000,ssReleaseMs:2500},o={x:0,y:0,angle:90};
 let r=timing.forecast(m,o,200,{skybomb:true,opening:{x:10,y:-50,t:1.8},releaseTime:2.3});assert.equal(r.openingMs,1800);assert.equal(r.releaseMs,2300);
 r=timing.forecast(m,o,200,null);assert.equal(r.openingMs,2000);assert.equal(r.releaseMs,2500);
 r=timing.forecast(m,o,200,{hit:{type:'ground',t:1.9,x:1,y:2}});assert.equal(r.kind,'direct-impact');assert.equal(r.openingMs,null);
});
test('weather-transformed children remain associated with their own parent',()=>{
 const parent={bullet:48,isLocal:true,shotType:2,session:1,time:10,flightMs:2600,start:{x:0,y:0,ang:45,power:100,ax:10,ay:400,t:0},change:{at:2100,dur:500},special:{jumps:[[1000,100,-100,20,10,0,0]]}};
 const child={bullet:49,session:1,time:10,flightMs:1000,start:{x:122,y:-89,ang:270,power:15,ax:0,ay:0,t:2600},impact:[130,0]};
 const group=timing.describe([parent,child],1)[0];assert.equal(group.children.length,1);assert.equal(group.impacts.length,1);
 const live=timing.live({shots:[{shot:{img:49,start:child.start,time:1000,hole:child.impact},total_elapsed_time:3000,GetTimeLeft:()=>600}]},[parent,child],1);assert.equal(live.impactCount,1);assert.equal(live.firstImpactRemainingMs,600);
});
test('opening marker fallback includes velocity bias and weather jumps',()=>{
 const m={turtleSS:true,ratio:1,ax:0,ay:100,velocityBiasX:10,velocityBiasY:20,ssOpeningMs:2000,ssReleaseMs:2500};
 let r=timing.forecast(m,{x:0,y:0,angle:90},100,null);assert.ok(Math.abs(r.point.x-20)<1e-8);assert.ok(Math.abs(r.point.y-40)<1e-8);
 r=timing.forecast(m,{x:0,y:0,angle:90},100,{jumps:[[1000,50,-100,20,10,0,0]]});assert.equal(r.point.x,70);assert.equal(r.point.y,-90);
});
test('descending plane crossings survive zero-gravity weather segments',()=>{
 const start={x:0,y:-100,ang:270,power:100,ax:0,ay:390};
 const r=sky.planeLanding(start,0,3,[[500,20,-50,30,100,0,0]]);assert.equal(r.t,1);assert.equal(r.x,35);
 assert.equal(sky.planeLanding({...start,vy:-100,vx:0,ay:0},0,3),null);
});
test('bounded refined search keeps six paths, timing and estimates consistent',()=>{
 const h=apiFixture(),r=sky.find(h.api,h.d,h.m,h.p,h.target,{now:()=>0});assert.ok(r.ready,r.reason);assert.equal(r.predictedHit,false);assert.equal(r.path.childPaths.length,6);assert.ok(r.predictedNearCount>=3);assert.ok(r.search.fullCandidates<=12);assert.ok(Number.isFinite(r.impactTiltDegrees));assert.ok(sky.stats().refinedPowers>0);
 const f=timing.forecast(h.m,r.origin,r.power,r.path);assert.equal(f.openingMs,r.openingMs);assert.equal(f.releaseMs,r.releaseMs);
});
test('Timebomb opens near the target while descending, without requiring an apex',()=>{
 const h=apiFixture({targetX:400}),r=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'timebomb',now:()=>1000});
 assert.ok(r.ready,r.reason);assert.equal(r.turtleTimebomb,true);assert.equal(r.ssMode,'timebomb');assert.equal(r.predictedHit,false);
 assert.ok(r.openingDistance<=160);assert.ok(r.apexErrorMs>300);assert.equal(r.path.childPaths.length,6);assert.ok(r.predictedNearCount>=3);assert.ok(r.search.fullCandidates<=12);
 assert.equal(r.openingMs,2100);assert.equal(r.releaseMs,2600);assert.ok(h.calls.every(call=>call.ratio!==1||call.duration===1.2));
 assert.ok(r.path.childPaths.every(child=>!child.hit||child.hit.t>=2.6));
});
test('Timebomb and Skybomb keep independent cache entries and preserve angle lock',()=>{
 const h=apiFixture({targetX:400}),r=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'timebomb',now:()=>2000});assert.ok(r.ready,r.reason);
 const cached=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'timebomb',now:()=>2100});assert.equal(cached.cacheHit,true);
 const other=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'skybomb',now:()=>2100});assert.notEqual(other.cacheHit,true);assert.notEqual(other.turtleTimebomb,true);
 const locked=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'timebomb',mode:'fixed',fixedDisplay:r.displayAngle,fixedLook:r.look,now:()=>2200});assert.ok(locked.ready,locked.reason);assert.equal(locked.look,r.look);assert.ok(Math.abs(locked.displayAngle-r.displayAngle)<1e-8);
});
test('Timebomb recomputes wind/elevation and rejects a blocked carrier',()=>{
 for(const [ax,ay,y]of [[20,410,-60],[-15,380,60]]){
  const h=apiFixture({targetX:400});h.m.ax=ax;h.m.ay=ay;h.target.y=y;
  h.d.groundHeightAt=x=>x>200?y:0;
  const r=sky.find(h.api,h.d,h.m,h.p,h.target,{turtleSSMode:'timebomb',now:()=>3000});assert.ok(r.ready,r.reason);assert.ok(r.predictedNearCount>=3);assert.ok(r.openingDistance<=160);assert.equal(r.model.ax,ax);assert.equal(r.model.ay,ay);
 }
 const blocked=apiFixture({targetX:400,wall:true}),r=sky.find(blocked.api,blocked.d,blocked.m,blocked.p,blocked.target,{turtleSSMode:'timebomb',now:()=>4000});assert.equal(r.ready,false);
});
test('the shared solver routes Timebomb through split physics even with mirror weather',async()=>{
 const local=vm.createContext({Math,Date});let called=null;
 local.__reaTurtleSky={find(...args){called=args;return{ready:true,turtleTimebomb:true};}};
 local.__reaMirror={prefer(){throw Error('Generic direct-impact mirror search must not run');}};
 await vm.runInContext(await readFile(new URL('aduka-autoaim.js',app),'utf8'),local);
 const h=apiFixture();h.d.weathers=[{weather_type:7,x:200,size:20}];h.m.turtle=true;
 const r=local.__reaDragonAutoAim.find(h.api,h.d,h.m,h.p,h.target,null,{turtleSSMode:'timebomb'});assert.equal(r.turtleTimebomb,true);assert.equal(called[5].turtleSSMode,'timebomb');assert.equal(called[2],h.m);
});
test('the panel exposes Timebomb and changing modes invalidates previous aim',async()=>{
 const h=await overlayFixture(),select=h.nodes.get('rea-turtle-ss-mode');
 assert.deepEqual(select.children.map(o=>o.value),['skybomb','timebomb','direct']);
 let cleared=0;h.context.__reaTurtleSky={clearCache(){cleared++;}};
 h.aim.autoResult={ready:true};h.aim.models.set('old',{});select.value='timebomb';select.listeners.change();
 assert.equal(h.aim.settings.turtleSSMode,'timebomb');assert.equal(h.aim.autoResult,null);assert.equal(h.aim.models.size,0);assert.equal(cleared,1);assert.equal(h.calls.length,0);
});
