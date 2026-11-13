import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
async function scene(wind){const h=await overlayFixture();for(const f of ['boomer-live-model.js','boomer-guide-methods.js'])vm.runInContext(await readFile(new URL('../app/'+f,import.meta.url),'utf8'),h.context);
 Object.assign(h.p,{mobile:15,mobile_data:{name:'Boomer',bullets:[50,51]},selected_shot:1,x:300,y:100,look:0,ang:45,body:0,minang:10,maxang:90,aim:[0,1,2].map(()=>({ang:70,size:30}))});Object.assign(h.target,{x:700,y:100});h.collector.samples=[];h.collector.calibration=[];h.renderer.wind_power=wind;h.renderer.wind_angle=180;h.nodes.get('rea-aduka-auto-adjust').checked=false;h.step(1100);return h;}
test('left winds20/26/27 do not suppress Hook fallback merely because current facing has a valid tailwind model',async()=>{
 for(const w of [20,26,27]){const h=await scene(w),m=h.context.__reaBoomerLive.fit([],{wind_power:w,wind_angle:180},h.p,1);assert.ok(m?.valid);assert.ok(h.aim.autoResult?.ready,h.aim.autoResult?.reason);assert.equal(h.aim.autoResult.guideEstimate,true);assert.equal(h.aim.autoResult.method,'hook400');assert.equal(h.aim.autoResult.power,400);assert.equal(h.aim.autoResult.path,null);assert.equal(h.aim.errors.length,0);}
});
test('guide fallback preserves a valid measured solution and does not bypass unrelated blocked terrain',async()=>{
 const h=await scene(20),g=h.context.__reaBoomerGuide,m={valid:true};assert.equal(g.shouldFallback(h.renderer,h.p,h.target,m,{ready:true}),false);
 assert.equal(g.shouldFallback({...h.renderer,wind_angle:0},h.p,h.target,m,{ready:false}),false);assert.equal(g.shouldFallback(h.renderer,h.p,h.target,{valid:false},{ready:false}),true);
});
test('trusted aim shooting sends the selected fallback power after target-directed coverage fails',async()=>{
 const h=await scene(27),sent=[],facade={};h.p.dn={Shoot(power){sent.push(power);}};
 Object.assign(h.context,{__reaDragonNetwork:{game:facade},__reaDragonRuntimeLink:{facade},__reaDragonGame:{players:[h.p],my_player_index:0,my_player_number:0,turn:0,selectedShot:1,curUIPower:2}});
 const r=h.nodes.get('rea-aduka-fire').listeners.click({isTrusted:true});assert.equal(r.fired,true,r.reason);assert.deepEqual(sent,[400]);assert.equal(h.aim.lastShot.power,400);assert.equal(h.aim.lastShot.wind.power,27);
});
test('wind27 is retained as a labelled ordinary extrapolation instead of rejected by a cap',async()=>{
 const h=await scene(27),m=h.context.__reaBoomerLive.prior({wind_power:27,wind_angle:180},h.p);assert.ok(m?.valid);assert.equal(m.windExtrapolated,true);assert.equal(m.maxTime,2.1);
});
