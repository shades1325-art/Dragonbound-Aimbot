import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const app=new URL('../app/',import.meta.url),context=vm.createContext({});
for(const file of ['ballistics-v2.js','turtle-prior.js','turtle-model.js'])vm.runInContext(await readFile(new URL(file,app),'utf8'),context);
const model=context.__reaTurtleModel,player={mobile:14,mobile_data:{name:'Turtle',bullets:[45,46,47,48,49]},selected_shot:1};
const vector=w=>({x:Math.floor(w.power*Math.cos(w.angle*Math.PI/180)),y:Math.floor(-w.power*Math.sin(w.angle*Math.PI/180))});
function row({ui=230,speed=Math.round(ui*2.24),wind,ax,ay,time=1,session=1,angle=130}){
 const start={x:0,y:0,ang:angle,power:speed,ax,ay,t:0},radians=angle*Math.PI/180;
 return{session,time,isLocal:true,mobile:14,shotType:1,bullet:46,uiPower:ui,start,wind,special:{wave:true,path:false,orbit:false},physicsChecks:[0,100,500,1000].map(time=>{const t=time/1000;return{time,pos:{x:speed*Math.cos(radians)*t+ax*t*t/2,y:-speed*Math.sin(radians)*t+ay*t*t/2}};})};
}
// Anonymized numeric observations from turtle-s2-reported-miss.json: the first
// two winds are near-collinear; the next wind reverses into another quadrant.
const first=row({ui:230,speed:515,wind:{power:11,angle:85},ax:0,ay:358,time:1});
const second=row({ui:240,speed:538,wind:{power:13,angle:85},ax:3,ay:351,time:2});
const third=row({ui:263,speed:589,wind:{power:4,angle:229},ax:-12,ay:413,time:3,angle:124});
test('a single low-power sample retains its quantization interval at higher powers',()=>{
 const low=row({ui:22,speed:49,wind:{power:0,angle:0},ax:0,ay:390}),fit=model.fit([low],{wind_power:0,wind_angle:0},player,1);
 assert.ok(fit.valid);assert.ok(fit.ratioError>0.04);assert.ok(Math.abs(fit.ratioInterval[1]-fit.ratioInterval[0]-1.5/22)<1e-10);
 assert.ok(fit.positionAllowance(350,2.1)>fit.positionAllowance(22,2.1)+15);
 const high=row({ui:350,speed:780,wind:{power:0,angle:0},ax:0,ay:390,time:2}),refined=model.fit([low,high],{wind_power:0,wind_angle:0},player,1);
 assert.ok(refined.ratioError<fit.ratioError);assert.ok(refined.positionAllowance(350,2.1)<fit.positionAllowance(350,2.1));
});

test('two observed winds do not manufacture a global law in a new direction',()=>{
 const fit=model.fit([first,second],{wind_power:4,wind_angle:229},player,1);
 assert.ok(fit.valid);assert.equal(fit.windModel,null);assert.equal(fit.windCoverage.distinctVectors,2);
 assert.equal(fit.windCoverage.mode,'anchor-estimate');assert.equal(fit.windInferred,true);assert.equal(fit.provisional,true);
 assert.equal(fit.ax,-13);assert.equal(fit.ay,415);
 const native={ax:-12,ay:413},old={ax:-10.4,ay:405.5};
 assert.ok(Math.hypot(fit.ax-native.ax,fit.ay-native.ay)<Math.hypot(old.ax-native.ax,old.ay-native.ay));
 assert.ok(fit.positionAllowance(263,2.6)>50,'fallback must retain an explicit broad uncertainty allowance');
});

test('exact current-wind measurements override sparse coverage',()=>{
 const fit=model.fit([first,second,third],{wind_power:4,wind_angle:229},player,1);
 assert.equal(fit.ax,-12);assert.equal(fit.ay,413);assert.equal(fit.exactWindSamples,1);
 assert.equal(fit.windInferred,false);assert.equal(fit.windCoverage.mode,'exact');
});

test('narrow three-vector coverage remains conservative and latest anchor predicts the next observed wind',()=>{
 const fit=model.fit([first,second,third],{wind_power:3,wind_angle:229},player,1);
 assert.equal(fit.windModel,null);assert.equal(fit.windCoverage.reason,'narrow-direction-coverage');
 assert.equal(fit.windInferred,true);assert.equal(fit.ax,-8);assert.equal(fit.ay,409);
});

const broadWinds=[{power:0,angle:0},{power:10,angle:0},{power:10,angle:270}];
const broad=broadWinds.map((wind,i)=>{const v=vector(wind);return row({ui:200+i*10,wind,ax:2+4*v.x,ay:390+4*v.y,time:10+i});});
test('a measured two-dimensional region supports interpolation without forcing all winds to the prior',()=>{
 const fit=model.fit(broad,{wind_power:5,wind_angle:315},player,1),v=vector({power:5,angle:315});
 assert.ok(fit.windModel);assert.equal(fit.windCoverage.mode,'interpolated');assert.equal(fit.windCoverage.supported,true);
 assert.equal(fit.windInferred,false);assert.ok(Math.abs(fit.ax-(2+4*v.x))<1e-10);assert.ok(Math.abs(fit.ay-(390+4*v.y))<1e-10);
});

test('a fitted region is not silently extrapolated beyond its convex hull',()=>{
 const fit=model.fit(broad,{wind_power:20,wind_angle:315},player,1);
 assert.equal(fit.windModel,null);assert.equal(fit.windInferred,true);
 assert.equal(fit.windCoverage.reason,'outside-observed-wind-region');assert.equal(fit.windCoverage.mode,'anchor-estimate');
});

test('duplicate directions and other matches cannot create coverage',()=>{
 const duplicates=[first,second,...Array.from({length:8},(_,i)=>row({ui:250+i,wind:second.wind,ax:3,ay:351,time:20+i,angle:110+i}))];
 const foreign=broad.map(r=>({...r,session:2}));
 const fit=model.fit([...duplicates,...foreign],{wind_power:4,wind_angle:229},player,1);
 assert.equal(fit.windCoverage.distinctVectors,2);assert.equal(fit.windModel,null);assert.equal(fit.windInferred,true);
});

test('wind coverage changes preserve SS annotation and paired API',()=>{
 context.__reaDragonCollector={session:1,samples:[],calibration:[]};
 context.__reaTurtleSS={fuse:()=>({openingMs:2100,releaseMs:2600})};
 const ss=model.fit([first,second],{wind_power:4,wind_angle:229},{...player,selected_shot:2},1);
 assert.equal(ss.turtleSS,true);assert.equal(ss.turtlePair,false);assert.equal(ss.ssOpeningMs,2100);assert.equal(ss.ssReleaseMs,2600);assert.equal(ss.maxTime,2.1);
 const pair=model.fit([first,second],{wind_power:4,wind_angle:229},player,1);
 assert.equal(pair.turtlePair,true);assert.equal(pair.turtleSS,false);assert.equal(typeof model.tracePair,'function');
});
