import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url);
async function context(){let clock=0;const c=vm.createContext({Math,Date,performance:{now:()=>clock}});vm.runInContext(await readFile(new URL('boomer-search.js',app),'utf8'),c);return{c,search:c.__reaBoomerSearch,tick(ms){clock+=ms;}};}
function fake(){const p={mobile:15,n:0,selected_shot:1,x:0,y:0,body:0,look:1,ang:30,minang:10,maxang:80,aim:[{},{}]},d={wind_power:0,wind_angle:0,weathers:[],ground:{}},m={valid:true,ratio:2,ax:0,ay:200,maxTime:3},target={n:1,x:500,y:0};let calls=0;
 const api={launch(q){return{x:q.x,y:q.y,angle:q.look===0?180-q.ang:q.ang}},solve(_m,o){return{power:100+o.angle,t:1}},at(_m,o,_power,t){return{x:o.x+500*t,y:-100*t}},terrain(){return false},trajectory(){calls++;return{points:[],hit:null}}};return{p,d,m,target,api,get calls(){return calls}};}
test('blocked searches make bounded progress across calls instead of tracing the entire grid',async()=>{
 const h=await context(),s=fake();let n=0,result;do{const before=s.calls;result=h.search.find(s.api,s.d,s.m,s.p,s.target,null,{maxCandidatesPerSlice:3,maxSlicesPerScene:64});assert.ok(s.calls-before<=3);if(result.pending)h.tick(80);n++;assert.ok(n<100);}while(result.pending);
 assert.equal(result.ready,false);assert.ok(n>1);assert.equal(result.search.processed,result.search.total);const total=s.calls;h.search.find(s.api,s.d,s.m,s.p,s.target,null,{maxCandidatesPerSlice:3});assert.equal(s.calls,total);
});
test('a difficult scene ends its search burst instead of consuming the whole turn indefinitely',async()=>{
 const h=await context(),s=fake();let r,n=0;do{r=h.search.find(s.api,s.d,s.m,s.p,s.target,null,{maxCandidatesPerSlice:1});n++;if(r.pending)h.tick(80);}while(r.pending&&n<100);assert.ok(n<=32);assert.equal(r.pending,false);assert.equal(r.budgetExhausted,true);const before=s.calls;h.search.find(s.api,s.d,s.m,s.p,s.target,null);assert.equal(s.calls,before);
});
test('the clock budget yields after a slow trace and does not invoke a weather brute-force fallback',async()=>{
 const h=await context(),s=fake();s.d.weathers=[{weather_type:8,x:200,size:40}];h.c.__reaTornadoMethod={find(){throw Error('Unbounded weather grid must not run');}};
 s.api.trajectory=()=>{h.tick(5);return{points:[],hit:null}};const r=h.search.find(s.api,s.d,s.m,s.p,s.target,null,{searchBudgetMs:8});assert.equal(r.pending,true);assert.ok(r.search.sliceTraces<=2);assert.ok(r.search.sliceMs<=10);
});
test('auto-applied angle and look do not rebuild the same scene search',async()=>{
 const h=await context(),s=fake();s.api.trajectory=()=>({points:[],hit:{type:'target',x:500,y:0,t:1}});let r=h.search.find(s.api,s.d,s.m,s.p,s.target,null);assert.ok(r.ready);const generated=h.search.stats().generated;s.p.ang=r.angle;s.p.look=r.look;h.tick(80);r=h.search.find(s.api,s.d,s.m,s.p,s.target,null);assert.ok(r.ready);assert.equal(h.search.stats().generated,generated);s.target.x+=10;h.search.find(s.api,s.d,s.m,s.p,s.target,null);assert.equal(h.search.stats().generated,generated+1);
});
test('cached successful paths are rechecked when terrain changes',async()=>{
 const h=await context(),s=fake();let blocked=false;s.api.trajectory=()=>({points:[],hit:blocked?{type:'ground',x:100,y:0,t:.2}:{type:'target',x:500,y:0,t:1}});assert.ok(h.search.find(s.api,s.d,s.m,s.p,s.target,null).ready);blocked=true;h.tick(400);const r=h.search.find(s.api,s.d,s.m,s.p,s.target,null,{maxCandidatesPerSlice:1});assert.equal(r.ready,false);assert.equal(r.pending,true);
});
test('coarse terrain rejection reduces expensive full traces',async()=>{
 const h=await context(),s=fake();s.api.terrain=(_d,x)=>x>50&&x<350;const r=h.search.find(s.api,s.d,s.m,s.p,s.target,null);assert.equal(r.ready,false);assert.equal(r.pending,false);assert.equal(s.calls,0);assert.ok(r.search.coarseRejected>50);
});
test('high-arc mode can find a long flight excluded by the short ordinary horizon',async()=>{
 const h=await overlayFixture();for(const f of ['boomer-zero-prior.js','boomer-live-model.js','boomer-guide-methods.js','boomer-search.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);
 Object.assign(h.p,{mobile:15,mobile_data:{name:'Boomer',bullets:[50,51]},selected_shot:1,x:300,y:500,body:0,ang:85,look:1,minang:83,maxang:86,aim:[0,1,2].map(()=>({ang:70,size:30}))});Object.assign(h.target,{x:700,y:500});h.renderer.wind_power=0;h.collector.samples=[];h.collector.calibration=[];h.nodes.get('rea-aduka-auto-adjust').checked=false;
 h.step(1100);assert.equal(h.aim.autoResult.ready,false);h.aim.settings.mode='high';for(let i=0;i<20;i++){h.step(1200+i*100);if(h.aim.autoResult?.ready)break;}const r=h.aim.autoResult;assert.ok(r?.ready,r?.reason);assert.ok(r.t>4.1);assert.equal(r.model.longArcExtrapolated,true);assert.equal(r.model.maxTime,8);assert.equal(r.provisional,true);assert.equal(h.aim.errors.length,0);
});
test('automatic mode escalates to a long high arc when the short horizon has no solution',async()=>{
 const h=await overlayFixture();for(const f of ['boomer-zero-prior.js','boomer-live-model.js','boomer-search.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);
 Object.assign(h.p,{mobile:15,mobile_data:{name:'Boomer',bullets:[50,51]},selected_shot:1,x:300,y:500,body:0,ang:85,look:1,minang:83,maxang:86,aim:[0,1,2].map(()=>({ang:70,size:30}))});Object.assign(h.target,{x:700,y:500});h.renderer.wind_power=0;h.collector.samples=[];h.collector.calibration=[];h.nodes.get('rea-aduka-auto-adjust').checked=false;
 for(let i=0;i<20;i++){h.step(1100+i*100);if(h.aim.autoResult?.ready)break;}assert.ok(h.aim.autoResult?.ready,h.aim.autoResult?.reason);assert.equal(h.aim.settings.mode,'auto');assert.equal(h.aim.autoResult.automaticHighArc,true);assert.ok(h.aim.autoResult.t>4.1);
});
test('automatic Boomer aim does not also compute duplicate manual angle and force previews',async()=>{
 const h=await overlayFixture();for(const f of ['boomer-zero-prior.js','boomer-live-model.js','boomer-search.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);let calls=0;
 h.context.__reaTornadoMethod={trace(_api,_d,_m,origin,_power,target,duration){calls++;const t=Math.min(.2,duration/2);return{points:[{...origin,t:0},{x:target.x,y:target.y-14,t}],hit:{type:'target',x:target.x,y:target.y-14,t},weatherHandled:true,mirrorReflections:[{timeMs:t*500}],tornadoTransitions:0};}};
 Object.assign(h.p,{mobile:15,mobile_data:{name:'Boomer',bullets:[50,51]},selected_shot:1,body:0,look:1,ang:45,minang:10,maxang:90,aim:[0,1,2].map(()=>({ang:70,size:30}))});h.renderer.wind_power=0;h.renderer.weathers=[{weather_type:7,x:900,size:80}];h.collector.samples=[];h.collector.calibration=[];h.nodes.get('rea-aduka-auto-adjust').checked=true;h.step(1100);assert.ok(h.aim.autoResult?.ready);assert.equal(calls,1);h.step(1200);assert.equal(calls,1);assert.equal(h.aim.errors.length,0);
});
test('a pending search never triggers an early guide fallback',async()=>{
 const h=await context();vm.runInContext(await readFile(new URL('boomer-guide-methods.js',app),'utf8'),h.c);assert.equal(h.c.__reaBoomerGuide.shouldFallback({wind_power:27,wind_angle:180},{x:0},{x:500},{valid:false},{ready:false,pending:true}),false);
});
test('mirror target seeds retain reflected paths without a synchronous angle/power grid',async()=>{
 const h=await overlayFixture();for(const f of ['boomer-zero-prior.js','boomer-live-model.js','mirror-predictor.js','tornado-method.js','boomer-search.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);
 Object.assign(h.p,{mobile:15,mobile_data:{name:'Boomer',bullets:[50,51]},selected_shot:1,x:100,y:400,body:0,ang:60,look:1,minang:10,maxang:80,aim:[0,1,2].map(()=>({ang:70,size:30}))});Object.assign(h.target,{x:-100,y:400});h.renderer.wind_power=0;h.renderer.weathers=[{weather_type:7,x:400,size:80}];h.collector.samples=[];h.collector.calibration=[];h.nodes.get('rea-aduka-auto-adjust').checked=false;Object.assign(h.aim.settings,{mode:'fixed',fixedDisplay:60,fixedLook:1,clearance:0});
 for(let i=0;i<20;i++){h.step(1100+i*100);if(!h.aim.autoResult?.pending)break;}const r=h.aim.autoResult;assert.ok(r?.ready,r?.reason);assert.ok(r.path.mirrorReflections.length>0);assert.equal(r.model.mirrorEstimate,true);assert.equal(h.aim.errors.length,0);
});
test('the fast terrain check agrees with the full trajectory on target and clearance contacts',async()=>{
 const h=await overlayFixture();vm.runInContext(await readFile(new URL('boomer-search.js',app),'utf8'),h.context);Object.assign(h.ground,{w:1000,h:800,position:{x:0,y:0},imageData:{data:new Uint8ClampedArray(1000*800*4)}});
 for(let y=250;y<800;y++)for(let x=450;x<453;x++)h.ground.imageData.data[(y*1000+x)*4+3]=255;
 const m={valid:true,ratio:2,velocityBiasY:-15,ax:0,ay:200,maxTime:4,pathBased:true,boomerOrdinary:true},origin={x:100,y:400,angle:45},target={n:1,x:700,y:400},solved=h.aim.api.solve(m,origin,700,386),c={model:m,origin,power:Math.round(solved.power),t:solved.t};
 for(const clearance of [0,20]){const fast=h.context.__reaBoomerSearch.traceOrdinary(h.aim.api,h.renderer,c,target,{clearance}),full=h.aim.api.trajectory(h.renderer,m,origin,c.power,target,c.t+.35,{clearance,searchOnly:true});assert.ok(fast.fastOrdinary);assert.equal(fast.hit.type,full.hit.type);assert.equal(fast.hit.clearanceOnly,full.hit.clearanceOnly);assert.ok(Math.abs(fast.hit.t-full.hit.t)<1e-9);}
});
