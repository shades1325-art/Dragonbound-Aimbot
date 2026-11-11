import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root=new URL('../app/',import.meta.url),nodes=new Map(),ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{})});
class Element {
 constructor(tag){this.tagName=tag;this.style={};this.children=[];this.listeners={};this.checked=false;}
 set id(id){this._id=id;nodes.set(id,this)}get id(){return this._id}
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=children}
 addEventListener(type,fn){this.listeners[type]=fn}
 remove(){}setAttribute(){}getContext(){return ctx}
 getBoundingClientRect(){return{left:0,top:0,right:1000,bottom:600,width:this.id==='powerMarkArea'?400:1000,height:600}}
 querySelector(selector){return nodes.get(selector.slice(1))}
}
const document={documentElement:new Element('html'),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),getElementById:id=>nodes.get(id),addEventListener(){},removeEventListener(){}};
for(const id of ['powerBar','powerMarkArea']){const e=new Element('div');e.id=id;e.style.width='200px';}
let nextFrame,clock=1000;const calls=[];
const p={mobile:2,selected_shot:1,n:0,is_alive:true,isAiming:true,x:300,y:100,look:0,ang:140,body:0,minang:110,maxang:170,truang_min:110,truang_max:170,mobile_data:{name:'Aduka',bullets:[7,8,9]},aim:[{ang:130,size:40},{ang:130,size:40},{ang:130,size:40}],Look(value){calls.push(['look',value]);this.look=value},ChangeAngleTo(value){calls.push(['angle',value]);this.ang=value},dn:{Shoot(){throw Error('test must never fire')}}};
const ground={w:3000,h:20000,position:{x:-1000,y:-10000},imageData:{data:[]}},target={n:1,name:'Target',is_alive:true,is_teammate:false,x:700,y:100};
const renderer={myPlayer:p,smoke_players:[p,target],ground,weathers:[],wind_power:0,wind_angle:242,renderer:{view:new Element('canvas'),width:1000,height:600},camera_container:{worldTransform:{a:1,b:0,c:0,d:1,tx:0,ty:0}}};
const record={session:123,isLocal:true,mobile:2,shotType:1,bullet:8,start:{x:325.71150438746156,y:69.35822227524088,ang:40,power:500,ax:0,ay:400,t:0},flightMs:1500,uiPower:200,wind:{power:0,angle:242},special:{wave:false,orbit:false,path:false},player:{...p}};
const collector={session:123,samples:[record],calibration:[record],scan(){}};
const context=vm.createContext({document,performance:{now:()=>clock},innerWidth:1000,innerHeight:600,devicePixelRatio:1,requestAnimationFrame:fn=>(nextFrame=fn,1),cancelAnimationFrame(){},getComputedStyle:e=>({width:e.style.width}),__reaDragonRenderer:renderer,__reaDragonCollector:collector,__reaDragonAim:{targetNumber:1,hidden:false,panel:{querySelector:()=>({checked:true})},destroy(){}}});
for(const file of ['ballistics-v2.js','aduka-bootstrap.js','wind-clock.js','aduka-autoaim.js','enable-aim-overlay.js'])vm.runInContext(await readFile(new URL(file,root),'utf8'),context);
const aim=context.__reaDragonAim,checks=[];
function step(time){clock=time;nextFrame(time)}function check(value,name){assert.ok(value,name);checks.push(name)}
step(1000);check(aim.autoResult.ready&&calls.length===2,'stationary own turn applies native aim');
const firstCalls=calls.length,oldOrigin=aim.last.origin.x;p.x+=25;p.body=-10;step(1085);
check(aim.last.moving&&aim.autoResult.ready&&aim.last.origin.x!==oldOrigin&&calls.length===firstCalls,'moving aim stays visible and updates origin without fighting movement');
step(1170);check(aim.last.moving&&calls.length===firstCalls,'automatic adjustment waits during brief movement settling');
step(1320);check(!aim.last.moving&&calls.length===firstCalls+2,'automatic adjustment resumes after movement settles');
p.x+=20;clock=1340;const applied=aim.applyAuto(true);check(applied.applied&&aim.autoScene.x===p.x,'manual apply refreshes scene after movement before next animation frame');
check(aim.modelComputes===1&&aim.modelCacheHits>=4,'movement and manual scene refresh reuse unchanged physics calibration');
const lowAngle=aim.autoResult.displayAngle,mode=nodes.get('rea-arc-mode');mode.value='high';mode.listeners.change();step(1400);check(aim.autoResult.ready&&aim.autoResult.displayAngle>lowAngle,'high arc control selects a higher legal trajectory');
const angleInput=nodes.get('rea-angle-input');angleInput.value='40';angleInput.listeners.change();step(1405);check(aim.autoResult.ready&&Math.abs(aim.autoResult.displayAngle-40)<1e-6,'manual display angle locks trajectory while solving force');
nodes.get('rea-angle-up').listeners.click();step(1406);check(aim.autoResult.ready&&Math.abs(aim.autoResult.displayAngle-41)<1e-6,'plus-one control refines native displayed angle');
mode.value='auto';mode.listeners.change();step(1410);
renderer.wind_power=12;renderer.wind_angle=237;step(1480);
check(aim.autoResult.ready&&aim.last.model.windFallback&&aim.last.model.provisional&&aim.last.model.ratio>2.5,'wind change keeps estimated autoaim with measured force');
renderer.wind_power=18;renderer.wind_angle=0;step(1485);check(aim.windClock.clock==='3:00'&&aim.last.wind.power===18&&aim.lastCompute===1485,'wind and prediction update immediately within an interval shorter than80ms');
ground.imageData.data=new Proxy({}, {get:(_,key)=>Number(key)%4===3?255:0});step(2080);
check(!aim.autoResult.ready,'unchanged position still rechecks terrain when cached solution ages');
check(aim.errors.length===0,'moving and wind update lifecycle has no overlay error');
const result={passed:true,checks,nativeAimingCalls:calls.length,shots:0};
console.log(JSON.stringify(result));
