import assert from 'node:assert/strict';
export function apiFixture({wall=false,targetX=600}={}){
 const d={ground:{w:2000,h:1000,position:{x:0,y:-1000}},weathers:[],wind_power:0,wind_angle:0,wall},m={valid:true,ratio:2.3,ax:0,ay:390,speedQuantization:'round',turtleSS:true,turtlePair:false,maxTime:2.1,sampleCount:2,ssOpeningMs:2100,ssReleaseMs:2600},p={mobile:14,mobile_data:{name:'Turtle'},selected_shot:2,x:0,y:0,body:-30,ang:45,look:1,minang:25,maxang:60,Look(){throw Error('Unexpected native Look')},ChangeAngleTo(){throw Error('Unexpected native angle change')}},target={n:1,x:targetX,y:0,is_alive:true},calls=[];
 const api={
  launch(q){return{x:q.x,y:q.y-20,angle:(q.look===0?180-q.ang:q.ang)-q.body};},
  terrain(d,x,y){return y>=0||d.wall&&x>=200&&x<=250;},
  at(m,o,power,t){const v=m.speedQuantization==='round'?Math.round(power*m.ratio):m.speedQuantization==='floor'?Math.floor(power*m.ratio):power*m.ratio;return{x:o.x+(v*Math.cos(o.angle*Math.PI/180)+(m.velocityBiasX||0))*t+.5*m.ax*t*t,y:o.y+(-v*Math.sin(o.angle*Math.PI/180)+(m.velocityBiasY||0))*t+.5*m.ay*t*t};},
  trajectory(d,model,origin,power,target,duration,options={}){
   assert.equal(model.turtleSS,false);assert.equal(model.turtlePair,false);calls.push({duration,maxTime:model.maxTime,ratio:model.ratio,ignorePlayerContact:options.ignorePlayerContact,searchOnly:options.searchOnly});const points=[];let hit=null,previous=null;
   for(let t=0;t<=duration+1e-9;t+=.01){const q={...api.at(model,origin,power,t),t};points.push(q);if(t>.025&&!options.ignorePlayerContact&&Math.abs(q.x-target.x)<=22&&q.y>=target.y-36&&q.y<=target.y+3){hit={...q,type:'target'};break;}
    if(t>.035&&api.terrain(d,q.x,q.y)){let impact=q;if(previous&&previous.y<0&&q.y>=0&&!d.wall){const f=-previous.y/(q.y-previous.y);impact={x:previous.x+(q.x-previous.x)*f,y:0,t:previous.t+(q.t-previous.t)*f};}hit={...impact,type:'ground',clearanceOnly:false};points.push(hit);break;}previous=q;
   }return{points,hit,horizon:duration};
  }
 };return{api,d,m,p,target,calls};
}
