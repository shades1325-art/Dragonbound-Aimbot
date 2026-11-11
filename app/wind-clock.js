(() => {
 function read(power,angle){
  if(!Number.isFinite(power)||power<0||!Number.isFinite(angle))return null;
  const degrees=((angle%360)+360)%360,theta=degrees*Math.PI/180,minutes=Math.round((((90-degrees)%360+360)%360)*2)%720,hour=Math.floor(minutes/60)||12,minute=minutes%60;
  return{power,degrees,hour,minute,clock:`${hour}:${String(minute).padStart(2,'0')}`,wx:power*Math.cos(theta),wy:-power*Math.sin(theta),calm:power===0,label:power===0?'KHÔNG GIÓ':`GIÓ ${power} · ${hour}:${String(minute).padStart(2,'0')} (${degrees}°)`};
 }
 const api={version:1,read};Object.defineProperty(globalThis,'__reaWindClock',{value:api,configurable:true});return{installed:true,version:1};
})()
