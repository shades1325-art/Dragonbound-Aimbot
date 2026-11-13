(() => {
 const DEG=Math.PI/180;
 function bulletsOf(player,shot=player.selected_shot){if(player?.mobile===21||player?.mobile_data?.name==='Frog')return[0,1,2].includes(shot)?[player.mobile_data?.bullets?.[shot===2?1:0]].filter(Number.isFinite):[];const list=player.mobile_data?.bullets;if(!list)return[];if(player.mobile===19||['Raon','Raon Launcher'].includes(player.mobile_data?.name))return(shot===0?[list[0]]:shot===1?[list[1],list[2]]:shot===2?[list[3],list[4]]:[]).filter(Number.isFinite);if(player.mobile===11||player.mobile_data?.name==='Nak')return(shot===0?[list[0]]:shot===1?[list[1],list[2]]:shot===2?[list[3]]:[]).filter(Number.isFinite);if(player.mobile===14||player.mobile_data?.name==='Turtle')return(shot===0?[list[0]]:shot===1?[list[1],list[2]]:shot===2?[list[3],list[4]]:[]).filter(Number.isFinite);return[(player.mobile===15||player.mobile_data?.name==='Boomer')?list[shot===2?1:0]:list[shot]].filter(Number.isFinite);}
 function bulletOf(player,shot=player.selected_shot){return bulletsOf(player,shot)[0];}
 function roots(a,b,c){const epsilon=1e-10;if(Math.abs(a)<epsilon)return Math.abs(b)<epsilon?[]:[-c/b];const discriminant=b*b-4*a*c;if(discriminant<0)return[];const sqrt=Math.sqrt(discriminant);if(sqrt<epsilon)return[-b/(2*a)];const q=-.5*(b+(b<0?-sqrt:sqrt));return[q/a,c/q].filter(Number.isFinite).sort((a,b)=>a-b);}
 function segment(start,timeMs,jumps=[]){let chosen=null;for(const jump of jumps)if(timeMs>=jump[0])chosen=jump;
  if(!chosen)return{x:start.x,y:start.y,vx:Math.cos(start.ang*DEG)*start.power,vy:-Math.sin(start.ang*DEG)*start.power,ax:start.ax,ay:start.ay,t:timeMs/1000,z:0};
  return{x:chosen[1],y:chosen[2],vx:chosen[3],vy:chosen[4],ax:chosen[5]===undefined?start.ax:chosen[5],ay:chosen[6]===undefined?start.ay:chosen[6],t:(timeMs-chosen[0])/1000,z:chosen[7]===undefined?0:chosen[7]};
 }
 function positionAt(start,timeMs,jumps=[]){const p=segment(start,timeMs,jumps);return{x:p.x+p.vx*p.t+p.ax*p.t*p.t/2,y:p.y+p.vy*p.t+p.ay*p.t*p.t/2,z:p.z};}
 function velocityAt(start,timeMs,jumps=[]){const p=segment(start,timeMs,jumps);return{x:p.vx+p.ax*p.t,y:p.vy+p.ay*p.t};}
 function positionAtPath(timeMs,path,durationMs){const count=Math.floor(path.length/3);if(!count)return{x:0,y:0,a:0};const step=durationMs/count||20;let lo=Math.floor(timeMs/step),hi=Math.ceil(timeMs/step);if(lo>=count)lo=count-1;if(hi>=count)hi=count-1;const fraction=(timeMs%step)/step;lo*=3;hi*=3;const angle0=path[lo+2];let angle1=path[hi+2];if(angle1-angle0>180)angle1-=360;else if(angle0-angle1>180)angle1+=360;return{x:path[lo]*(1-fraction)+path[hi]*fraction,y:path[lo+1]*(1-fraction)+path[hi+1]*fraction,a:(angle0*(1-fraction)+angle1*fraction+36000)%360};}
 function fitPathBallistics(record){const path=record.path,count=path?Math.floor(path.length/3):0;if(count<8||!(record.pathDuration>=400))return null;const dt=record.pathDuration/count/1000,x0=path[0],y0=path[1];let aa=0,ab=0,bb=0,xA=0,xB=0,yA=0,yB=0;
  for(let i=1;i<count;i++){const t=i*dt,h=t*t/2,dx=path[i*3]-x0,dy=path[i*3+1]-y0;aa+=t*t;ab+=t*h;bb+=h*h;xA+=t*dx;xB+=h*dx;yA+=t*dy;yB+=h*dy;}
  const determinant=aa*bb-ab*ab;if(Math.abs(determinant)<1e-10)return null;const vx=(xA*bb-xB*ab)/determinant,ax=(xB*aa-xA*ab)/determinant,vy=(yA*bb-yB*ab)/determinant,ay=(yB*aa-yA*ab)/determinant;
  let maxError=0,squared=0;for(let i=0;i<count;i++){const t=i*dt,error=Math.hypot(x0+vx*t+ax*t*t/2-path[i*3],y0+vy*t+ay*t*t/2-path[i*3+1]);maxError=Math.max(maxError,error);squared+=error*error;}
  const speed=Math.hypot(vx,vy),angle=(Math.atan2(-vy,vx)/DEG+360)%360;return{x:x0,y:y0,power:speed,ang:angle,ax,ay,maxError,rmse:Math.sqrt(squared/count),duration:record.pathDuration/1000};
 }
 function tornadoBands(weathers=[]){return weathers.filter(w=>w?.weather_type===8).map(w=>({x:w.x,size:w.size,left:w.x-w.size/2,right:w.x+w.size/2,type:8}));}
 function firstTornadoEntry(start,maxTime,bands){const vx=Math.cos(start.ang*DEG)*start.power;let result=null;
  for(const band of bands){let time=null;if(start.x>=band.left&&start.x<=band.right)time=0;else{const times=[...roots(.5*start.ax,vx,start.x-band.left),...roots(.5*start.ax,vx,start.x-band.right)].filter(t=>t>=0&&t<=maxTime).sort((a,b)=>a-b);for(const t of times){const after=positionAt(start,(t+.00001)*1000);if(after.x>=band.left-1e-6&&after.x<=band.right+1e-6){time=t;break;}}}
   if(time!==null&&(!result||time<result.t)){const p=positionAt(start,time*1000);result={...p,t:time,band};}
  }return result;
 }
 function turningPoint(start){const vx=Math.cos(start.ang*DEG)*start.power;if(Math.abs(start.ax)<1e-10)return null;const t=-vx/start.ax;return t>0?{...positionAt(start,t*1000),t}:null;}
 const api={version:6,bulletOf,bulletsOf,roots,segment,positionAt,velocityAt,positionAtPath,fitPathBallistics,tornadoBands,firstTornadoEntry,turningPoint};
 Object.defineProperty(globalThis,'__reaDragonBallistics',{value:api,configurable:true});return{installed:true,version:api.version};
})()
