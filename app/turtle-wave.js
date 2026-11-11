// Native Turtle-style wave3/4 replay transform. Inputs use world pixels,
// pixels/second, pixels/second^2 and physics-parameter milliseconds.
// Installing this helper only exposes math; it does not observe, aim or fire.
(() => {
 const DEG=Math.PI/180;
 function amplitudeAt(timeMs){
  if(!Number.isFinite(timeMs))throw TypeError('Wave time must be finite milliseconds');
  return timeMs<400?timeMs/400*25:timeMs<2200?25*Math.cos((timeMs-400)/95):timeMs<2600?25-(timeMs-2200)/400*22:3;
 }
 function carrierAt(start,timeMs,jumps=[]){
  let segment=null;
  for(const jump of jumps)if(timeMs>=jump[0])segment=jump;
  let x=start.x,y=start.y,vx=Number.isFinite(start.vx)?start.vx:Math.cos(start.ang*DEG)*start.power,vy=Number.isFinite(start.vy)?start.vy:-Math.sin(start.ang*DEG)*start.power,ax=start.ax,ay=start.ay,z=0,t=timeMs/1000;
  if(segment){x=segment[1];y=segment[2];vx=segment[3];vy=segment[4];if(segment[5]!==undefined)ax=segment[5];if(segment[6]!==undefined)ay=segment[6];if(segment[7]!==undefined)z=segment[7];t=(timeMs-segment[0])/1000;}
  const px=x+vx*t+ax*t*t/2,py=y+vy*t+ay*t*t/2,back=t-.005;
  const a=Math.atan2(py-(y+vy*back+ay*back*back/2),px-(x+vx*back+ax*back*back/2))/DEG;
  return{x:px,y:py,a,z};
 }
 function positionAt(start,timeMs,wave=3,jumps=[]){
  if(wave!==3&&wave!==4)throw RangeError('Turtle wave helper accepts native wave3/4 only');
  const amplitude=amplitudeAt(timeMs),carrier=carrierAt(start,timeMs,jumps),angle=(-carrier.a+(wave===3?90:-90))*DEG;
  return{x:carrier.x+amplitude*Math.cos(angle),y:carrier.y-amplitude*Math.sin(angle),z:carrier.z};
 }
 const api=Object.freeze({version:1,amplitudeAt,carrierAt,positionAt});
 Object.defineProperty(globalThis,'__reaTurtleWave',{value:api,configurable:true});
 return{installed:true,version:1};
})()
