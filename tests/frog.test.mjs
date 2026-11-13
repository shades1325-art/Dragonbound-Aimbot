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
 for(const type of [0,1,2]){const h=await scene(type),m=h.context.__reaFrogModel.seed(h.renderer,h.p),r=h.context.__reaFrogShot.find(h.aim.api,h.renderer,m,h.p,h.target,{cooperative:false,clearance:4});assert.ok(r.ready,r.reason);assert.equal(r.mobile,21);assert.equal(r.predictedHit,false);assert.equal(r.path.hit.type,'frog-estimate');assert.ok(r.path.frogTargetDistance<=24);assert.ok(r.path.frogTargetDwell>=.12);assert.ok(type===0?r.path.frogEndpoint.x<r.path.frogLanding.x:r.path.frogEndpoint.x>r.path.frogLanding.x);assert.equal(r.path.branches[1].frogSurface,true);assert.equal(r.model.provisional,true);}
});
test('estimated Frog walking stops at an unknown edge instead of inventing a jump',()=>{
 const api={terrain:(_d,x,y)=>x<10&&y>=0},r=shot.walk(api,{}, {x:0,y:0,t:1},{frogShot:1,frogDirection:1,frogSurfaceSeconds:1.5});assert.equal(r.blocked,'edge-or-wall');assert.ok(r.endpoint.x<10);assert.equal(r.estimated,true);
});
test('cooperative Frog search preserves a ready path across automatic angle changes and refreshes on movement',async()=>{
 const h=await scene(),m=h.context.__reaFrogModel.seed(h.renderer,h.p),api=h.context.__reaFrogShot;let r,calls=0;do{r=api.find(h.aim.api,h.renderer,m,h.p,h.target,{});calls++;}while(r.pending&&calls<100);assert.ok(r.ready,r.reason);assert.ok(calls<100);assert.ok(api.stats().traces<=api.constants.maxTraces);h.p.ang=r.angle;h.p.look=r.look;assert.equal(api.find(h.aim.api,h.renderer,m,h.p,h.target,{}).cacheHit,true);h.target.x+=50;assert.notEqual(api.find(h.aim.api,h.renderer,m,h.p,h.target,{}).cacheHit,true);
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
function angleScene(accept,min=25,max=60){const p={...player,x:0,y:0,body:0,look:1,ang:25,minang:min,maxang:max},d={ground:{},wind_power:0,wind_angle:0,weathers:[]},m=model.seed(d,p),target={n:1,x:200,y:0},tried=[];d.smoke_players=[target];const api={launch(q){return{x:0,y:-20,angle:q.look===0?180-q.ang:q.ang};},terrain(_d,_x,y){return y>=0;},trajectory(_d,_m,o,power){tried.push({angle:o.angle,power});const x=accept(o.angle,power)?target.x+75:-500,hit={type:'ground',x,y:0,t:1};return{points:[{x:o.x,y:o.y,t:0},hit],hit};}};return{p,d,m,target,api,tried};}
test('Frog widening checks isolated legal angles that were absent from the old 24-path shortlist',()=>{
 const h=angleScene(a=>Math.abs(a-59)<1e-8),r=shot.find(h.api,h.d,h.m,h.p,h.target,{cooperative:false});assert.ok(r.ready,r.reason);assert.equal(r.angle,59);assert.ok(h.tried.length>24);assert.ok(r.search.checkedAngles>=36);assert.ok(r.search.fullTraces<=shot.constants.maxTraces);
});
test('fractional native angle limits remain usable with an explicit angle lock',()=>{
 const h=angleScene(a=>Math.abs(a-60.5)<1e-8,60.2,60.8),r=shot.find(h.api,h.d,h.m,h.p,h.target,{cooperative:false,mode:'fixed',fixedLook:1,fixedDisplay:60.5});assert.ok(r.ready,r.reason);assert.equal(r.angle,60.5);assert.ok(h.tried.every(q=>Math.abs(q.angle-60.5)<1e-8));
});
test('Frog inverse retains both feasible flight roots instead of only the first',()=>{
 const m={ratio:2.4,ax:0,ay:Math.SQRT2*200,velocityBiasY:-Math.SQRT2*200},o={x:0,y:0,angle:45},goal={x:200,y:-300},roots=shot.airSolutions(m,o,goal,6.5);assert.equal(roots.length,2);for(const q of roots){const v=q.power*m.ratio,t=q.t,x=v*Math.cos(Math.PI/4)*t,y=(-v*Math.sin(Math.PI/4)+m.velocityBiasY)*t+m.ay*t*t/2;assert.ok(Math.hypot(x-goal.x,y-goal.y)<1e-7);}
});
test('high mode keeps a substantially higher usable Frog angle in final ranking',async()=>{
 const h=await scene(),api=h.context.__reaFrogShot,m=h.context.__reaFrogModel.seed(h.renderer,h.p),normal=api.find(h.aim.api,h.renderer,m,h.p,h.target,{cooperative:false}),high=api.find(h.aim.api,h.renderer,m,h.p,h.target,{cooperative:false,mode:'high'});assert.ok(normal.ready,normal.reason);assert.ok(high.ready,high.reason);assert.ok(high.displayAngle>=h.p.maxang-2);assert.ok(high.displayAngle>normal.displayAngle+10);
});
test('a fixed high Frog angle can use a longer bounded flight with extrapolation marked',async()=>{
 const h=await scene();Object.assign(h.p,{minang:80,maxang:80,ang:80});h.target.x=1100;const m={...h.context.__reaFrogModel.seed(h.renderer,h.p),ay:200},r=h.context.__reaFrogShot.find(h.aim.api,h.renderer,m,h.p,h.target,{cooperative:false,mode:'fixed',fixedDisplay:80,fixedLook:1});assert.ok(r.ready,r.reason);assert.ok(r.path.frogLanding.t>6.5);assert.equal(r.model.longArcExtrapolated,true);assert.ok(r.path.frogLanding.t<=10);assert.equal(r.angle,80);
});
test('an unreachable weather scene exhausts a bounded search without inventing a ready aim',()=>{
 const h=angleScene(()=>false);h.d.weathers=[{weather_type:7,x:100,size:20}];let r,calls=0;do{r=shot.find(h.api,h.d,h.m,h.p,h.target,{});calls++;}while(r.pending&&calls<180);assert.ok(calls<180);assert.equal(r.ready,false);assert.equal(r.pending,undefined);assert.ok(r.search.fullTraces<=shot.constants.maxTraces);assert.ok(r.search.checkedAngles>=36);
});
test('later native Frog match calibrates its own force ratio and rounded wind factor',async()=>{
 const data=JSON.parse(await readFile(new URL('./fixtures/frog-medium-force.json',import.meta.url),'utf8')),rows=data.launches.map(record);assert.ok(rows.length>=4);
 const fit=model.fit(rows,{wind_power:22,wind_angle:156},player,1);assert.ok(fit.windModel);assert.ok(fit.windFactor>3.27&&fit.windFactor<3.30);assert.ok(fit.ratio>2.44&&fit.ratio<2.46);
 for(let i=0;i<rows.length;i++){const training=rows.filter((_,j)=>i!==j),r=rows[i],m=model.fit(training,{wind_power:r.wind.power,wind_angle:r.wind.angle},player,1),pred=m.speedQuantization==='round'?Math.round(r.uiPower*m.ratio):Math.floor(r.uiPower*m.ratio);assert.ok(Math.abs(pred-r.start.power)<=1);assert.ok(Math.abs(m.ax-r.start.ax)<=1);assert.ok(Math.abs(m.ay-r.start.ay)<=1);}
});
test('recorded Frog damage paths can pass near a player while their final endpoint is far away',async()=>{
 const data=JSON.parse(await readFile(new URL('./fixtures/frog-surface-contact.json',import.meta.url),'utf8'));assert.ok(data.cases.length>=2);for(const row of data.cases){const q=shot.proximity(row.points,row.target);assert.equal(row.damageRecorded,true);assert.ok(q.distance<=24);assert.ok(q.dwell>.5);assert.ok(Math.hypot(row.impact.x-row.target.x,row.impact.y-row.target.y)>40);}
});
test('Frog slows near a living player and invalidates cached scene when another player moves',async()=>{
 const d={smoke_players:[{n:1,x:50,y:0,is_alive:true}]};assert.equal(shot.surfaceSpeed(d,50,0),30);assert.equal(shot.surfaceSpeed(d,0,0),85);d.smoke_players[0].is_alive=false;assert.equal(shot.surfaceSpeed(d,50,0),85);
 const h=await scene(),api=h.context.__reaFrogShot,m=h.context.__reaFrogModel.seed(h.renderer,h.p);let r;do{r=api.find(h.aim.api,h.renderer,m,h.p,h.target,{});}while(r.pending);assert.ok(r.ready);h.renderer.smoke_players.push({n:2,x:700,y:400,is_alive:true,is_teammate:true});assert.notEqual(api.find(h.aim.api,h.renderer,m,h.p,h.target,{}).cacheHit,true);
});
test('Frog surface qualification uses estimated target dwell and rejects self exposure',()=>{
 const h=angleScene(()=>true);h.p.selected_shot=2;h.m={...model.seed(h.d,h.p),frogShot:2,frogDirection:1,frogSurfaceSeconds:3};h.api.trajectory=()=>({points:[{x:190,y:0,t:1}],hit:{x:190,y:0,t:1,type:'ground'}});const path=shot.trace(h.api,h.d,h.m,{x:0,y:-20,angle:45},100,h.target);assert.ok(path.frogNearTarget);assert.ok(path.frogTargetDwell>.5);assert.ok(Math.abs(path.frogEndpoint.x-h.target.x)>40);
 const own={n:0,x:190,y:0,is_alive:true};h.d.myPlayer=own;h.d.smoke_players.push(own);const unsafe=shot.trace(h.api,h.d,h.m,{x:0,y:-20,angle:45},100,h.target);assert.equal(unsafe.frogUnsafeSurface,true);assert.equal(unsafe.frogNearTarget,false);
});
