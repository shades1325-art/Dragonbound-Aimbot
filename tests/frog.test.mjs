import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {overlayFixture} from './helpers/overlay-fixture.mjs';
const app=new URL('../app/',import.meta.url),c=vm.createContext({Math,Date});
for(const f of ['ballistics-v2.js','frog-model.js','frog-shot.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),c);
const model=c.__reaFrogModel,shot=c.__reaFrogShot,kernel=c.__reaDragonBallistics,player={mobile:21,mobile_data:{name:'Frog',bullets:[64,66]},selected_shot:0},fixture=JSON.parse(await readFile(new URL('./fixtures/frog-native.json',import.meta.url),'utf8'));
function record(q){return{session:1,time:1,isLocal:true,mobile:21,shotType:q.shot,bullet:q.bullet,start:q.start,wind:q.wind,uiPower:q.uiPower,special:{},physicsChecks:q.checks.map(v=>({time:v.time,pos:{x:v.x,y:v.y}}))};}
async function scene(type=0){const h=await overlayFixture();for(const f of ['frog-model.js','frog-shot.js'])vm.runInContext(await readFile(new URL(f,app),'utf8'),h.context);Object.assign(h.p,{mobile:21,selected_shot:type,mobile_data:{name:'Frog',bullets:[64,66]},minang:25,maxang:60,x:300,y:400,body:0,ang:40,look:1});h.p.aim=[0,1,2].map(()=>({ang:54,size:25}));Object.assign(h.target,{x:800,y:400});h.collector.samples=[];h.collector.calibration=[];h.ground.imageData.data=new Proxy({}, {get:(_o,key)=>Number(key)%4===3&&Math.floor(Number(key)/4/h.ground.w)>=Math.floor(400-h.ground.position.y)?255:0});return h;}
test('Frog S1/S2 share the ordinary carrier and SS selects its own carrier',()=>{for(const [type,bullet]of [[0,64],[1,64],[2,66]]){assert.equal(kernel.bulletOf({...player,selected_shot:type}),bullet);assert.deepEqual([...kernel.bulletsOf(player,type)],[bullet]);}});
test('retained Frog ordinary launches and empirical wind states replay without fitting walkers',()=>{
 assert.equal(fixture.launches.length,3);for(const q of fixture.launches){const m=model.seed({wind_power:q.wind.power,wind_angle:q.wind.angle},{...player,selected_shot:q.shot});assert.equal(Math.round(q.uiPower*m.ratio),q.start.power);assert.equal(m.ax,q.start.ax);assert.equal(m.ay,q.start.ay);for(const check of q.checks){const p=kernel.positionAt(q.start,check.time);assert.ok(Math.hypot(p.x-check.x,p.y-check.y)<1e-8);}}
 for(const q of fixture.winds){const w=model.vector(q.wind);assert.equal(Math.round(3.4*w.x),q.ax);assert.equal(q.gravity+Math.round(3.4*w.y),q.ay);}
});
test('low-force calibration retains quantization ambiguity and excludes foreign matches and continuations',()=>{
 const rows=fixture.launches.map(record),d={wind_power:0,wind_angle:301},fit=model.fit(rows,d,player,1);assert.equal(fit.sampleCount,3);assert.equal(fit.ay,311);assert.ok(fit.ratioError>.01);assert.ok(fit.positionAllowance(350,2)>fit.positionAllowance(18,2));
 const extra=[...rows.map(r=>({...r,session:2})),{...rows[0],bullet:65,start:{...rows[0].start,t:500,power:0},special:{path:true}}];assert.equal(model.fit([...rows,...extra],d,player,1).sampleCount,3);
 for(const type of [1,2])assert.equal(model.fit(rows,d,{...player,selected_shot:type},1).sampleCount,3);
});
test('received Frog continuations retain distinct direction, duration and final impact',()=>{
 assert.ok(fixture.continuations.length>=8);for(const q of fixture.continuations){const end=q.points.slice(-3),dx=end[0];assert.ok(q.shot===0?dx<0:dx>0);assert.ok(q.bullet===67?q.durationMs===3000:q.durationMs>=1500&&q.durationMs<=1520);if(q.impact)assert.ok(Math.hypot(end[0]-q.impact[0],end[1]-q.impact[1])<=1.01);}
});
test('Frog aim solves the estimated post-surface endpoint for all three shots',async()=>{
 for(const type of [0,1,2]){const h=await scene(type),m=h.context.__reaFrogModel.seed(h.renderer,h.p),r=h.context.__reaFrogShot.find(h.aim.api,h.renderer,m,h.p,h.target,{cooperative:false,clearance:4});assert.ok(r.ready,r.reason);assert.equal(r.mobile,21);assert.equal(r.predictedHit,false);assert.equal(r.path.hit.type,'frog-estimate');assert.ok(Math.abs(r.path.frogEndpoint.x-h.target.x)<=28);assert.ok(type===0?r.path.frogEndpoint.x<r.path.frogLanding.x:r.path.frogEndpoint.x>r.path.frogLanding.x);assert.equal(r.path.branches[1].frogSurface,true);assert.equal(r.model.provisional,true);}
});
test('estimated Frog walking stops at an unknown edge instead of inventing a jump',()=>{
 const api={terrain:(_d,x,y)=>x<10&&y>=0},r=shot.walk(api,{}, {x:0,y:0,t:1},{frogShot:1,frogDirection:1,frogSurfaceSeconds:1.5});assert.equal(r.blocked,'edge-or-wall');assert.ok(r.endpoint.x<10);assert.equal(r.estimated,true);
});
test('cooperative Frog search preserves a ready path across automatic angle changes and refreshes on movement',async()=>{
 const h=await scene(),m=h.context.__reaFrogModel.seed(h.renderer,h.p),api=h.context.__reaFrogShot;let r,calls=0;do{r=api.find(h.aim.api,h.renderer,m,h.p,h.target,{});calls++;}while(r.pending&&calls<100);assert.ok(r.ready,r.reason);assert.ok(calls<100);assert.ok(api.stats().traces<=24);h.p.ang=r.angle;h.p.look=r.look;assert.equal(api.find(h.aim.api,h.renderer,m,h.p,h.target,{}).cacheHit,true);h.target.x+=50;assert.notEqual(api.find(h.aim.api,h.renderer,m,h.p,h.target,{}).cacheHit,true);
});
test('shared solver routes Frog and trusted firing commits its selected power',async()=>{
 const h=await scene(2),sent=[],g={players:[h.p],my_player_index:0,my_player_number:0,turn:0,curUIPower:0,selectedShot:2,ssEnabled:true};h.p.dn={Shoot(power){sent.push(power)}};h.context.__reaDragonGame=g;h.context.__reaDragonNetwork={game:{}};h.context.__reaDragonRuntimeLink={facade:h.context.__reaDragonNetwork.game};
 for(let i=0;i<100;i++){h.step(1200+i*100);if(h.aim.autoResult?.ready&&!h.aim.autoResult.pending)break;}
 assert.ok(h.aim.autoResult.ready,h.aim.autoResult.reason);const r=h.nodes.get('rea-aduka-fire').listeners.click({isTrusted:true});assert.equal(r.fired,true,r.reason);assert.equal(sent.length,1);assert.equal(sent[0],h.aim.lastShot.power);assert.ok(Number.isInteger(sent[0]));assert.equal(h.aim.lastShot.frog,true);
});
test('received Frog continuations inherit unique parent ownership instead of the nearest player',async()=>{
 for(const type of [0,1,2]){const h=await scene(type),k=h.context.__reaDragonBallistics,o=h.aim.api.launch(h.p),start={x:o.x,y:o.y,ang:o.angle,power:240,ax:0,ay:311,t:0},end=k.positionAt(start,1000),walker={x:end.x+2,y:end.y,ang:1,power:0,ax:0,ay:0,t:1000},parentBullet=type===2?66:64,childBullet=parentBullet+1;
  const object=(s,img,path=null)=>({shot:{s:Object.values(s),start:s,img,shot_type:type,time:path?1500:1000,...(path?{path}: {})},zp:{GetPosAtTime:t=>k.positionAt(s,t)},GetPosAtTime:t=>path?k.positionAtPath(t,path,1500):k.positionAt(s,t)});
  h.renderer.camera_container.children=[object(start,parentBullet),object(walker,childBullet,[walker.x,walker.y,0,walker.x+30,walker.y,30])];h.context.setInterval=()=>0;h.context.clearInterval=()=>{};vm.runInContext(await readFile(new URL('collect-shots.js',app),'utf8'),h.context);
  const rows=h.context.__reaDragonCollector.samples,air=rows.find(r=>r.bullet===parentBullet),child=rows.find(r=>r.bullet===childBullet);assert.equal(air.isLocal,true);assert.equal(child.isLocal,true);assert.equal(child.mobile,21);assert.equal(child.frogParent.bullet,parentBullet);assert.equal(child.uiPower,air.uiPower);assert.ok(child.frogDescriptor);assert.ok(child.replayPoints.length>1);assert.equal(h.context.__reaDragonCollector.calibration.length,1);
 }
});
test('pending automatic Frog search does not also trace a duplicate manual preview',async()=>{const h=await scene();h.step(1000);assert.equal(h.aim.autoResult.pending,true);assert.equal(h.aim.last.preview,null);assert.equal(h.context.__reaFrogShot.stats().traces,0);});
